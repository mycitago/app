// =========================================================
// appointments.js — Disponibilidad de horarios y creación de citas
// =========================================================

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DOW_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const SLOT_STEP_MINUTES = 15; // granularidad para ofrecer horarios

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function timeToMinutes(t) {
  // acepta 'HH:MM' o 'HH:MM:SS'
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Devuelve el horario de atención { open, close, closed } para una fecha, según opening_hours del negocio. */
function getDayHours(business, date) {
  const key = DOW_KEYS[date.getDay()];
  const hours = business.opening_hours?.[key];
  if (!hours || hours.closed || !hours.open || !hours.close) {
    return null;
  }
  return hours;
}

/** Genera los próximos `count` días con bandera de si están disponibles para elegir. */
function buildUpcomingDays(business, count = 21) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const hours = getDayHours(business, date);
    days.push({
      date,
      dateKey: toDateKey(date),
      dow: DOW_LABELS[date.getDay()],
      dayNum: date.getDate(),
      isClosed: !hours,
    });
  }
  return days;
}

/** Trae los rangos ocupados por citas (vía RPC, sin exponer datos de clientes) y por bloqueos manuales. */
async function fetchBusyRanges(businessId, dateKey) {
  const [{ data: busySlots, error: busyError }, { data: blocked, error: blockedError }] = await Promise.all([
    supabaseClient.rpc('get_busy_slots', { p_business_id: businessId, p_date: dateKey }),
    supabaseClient.from('blocked_times').select('start_time, end_time').eq('business_id', businessId).eq('date', dateKey),
  ]);

  if (busyError) console.error('Error obteniendo horarios ocupados:', busyError);
  if (blockedError) console.error('Error obteniendo bloqueos:', blockedError);

  const ranges = [];

  (busySlots || []).forEach((s) => {
    ranges.push([timeToMinutes(s.start_time), timeToMinutes(s.end_time)]);
  });

  (blocked || []).forEach((b) => {
    if (!b.start_time || !b.end_time) {
      // bloqueo de día completo: se maneja aparte (ver isDateFullyBlocked)
      return;
    }
    ranges.push([timeToMinutes(b.start_time), timeToMinutes(b.end_time)]);
  });

  return ranges;
}

async function isDateFullyBlocked(businessId, dateKey) {
  const { data, error } = await supabaseClient
    .from('blocked_times')
    .select('id')
    .eq('business_id', businessId)
    .eq('date', dateKey)
    .is('start_time', null)
    .is('end_time', null)
    .limit(1);

  if (error) {
    console.error('Error verificando bloqueo de día completo:', error);
    return false;
  }
  return (data || []).length > 0;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Calcula los horarios disponibles para un servicio en una fecha dada.
 * Devuelve una lista de { start, end, label, available }.
 */
async function getAvailableSlots(business, date, durationMinutes) {
  const dateKey = toDateKey(date);
  const dayHours = getDayHours(business, date);
  if (!dayHours) return [];

  const fullyBlocked = await isDateFullyBlocked(business.id, dateKey);
  if (fullyBlocked) return [];

  const busyRanges = await fetchBusyRanges(business.id, dateKey);

  const openMin = timeToMinutes(dayHours.open);
  const closeMin = timeToMinutes(dayHours.close);

  const now = new Date();
  const isToday = toDateKey(now) === dateKey;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots = [];
  for (let start = openMin; start + durationMinutes <= closeMin; start += SLOT_STEP_MINUTES) {
    const end = start + durationMinutes;

    if (isToday && start <= nowMinutes) continue; // no ofrecer horarios ya pasados

    const overlapsBusy = busyRanges.some(([bStart, bEnd]) => rangesOverlap(start, end, bStart, bEnd));

    slots.push({
      start: minutesToTime(start),
      end: minutesToTime(end),
      label: minutesToTime(start),
      available: !overlapsBusy,
    });
  }

  return slots;
}

/** Valida un número de WhatsApp mexicano (10 dígitos, se antepone 52 al guardar). */
function validateWhatsapp(raw) {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}

/**
 * Crea (o reutiliza) el cliente y registra la cita.
 * Devuelve { ok: true, appointment } o { ok: false, reason }.
 */
async function bookAppointment({ business, service, dateKey, startTime, endTime, name, whatsappDigits, notes }) {
  const bookingSource=(new URLSearchParams(location.search).get('src')||'').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32);
  const whatsappFull = `52${whatsappDigits}`;

  const { data, error } = await supabaseClient.rpc('create_appointment', {
    p_business_id: business.id,
    p_service_id: service.id,
    p_name: name,
    p_whatsapp: whatsappFull,
    p_date: dateKey,
    p_start: startTime,
    p_end: endTime,
    p_notes: notes || null,
  });

  if (error) {
    console.error('Error creando cita:', error);

    const msg = String(error.message || '');
    const code = String(error.code || '');

    if (code === '23P01' || msg.includes('slot_taken') || /exclu/i.test(msg)) {
      return { ok: false, reason: 'Ese horario acaba de ocuparse. Elige otro horario.' };
    }

    const known = {
      invalid_name: 'Revisa tu nombre.',
      invalid_whatsapp: 'Revisa tu número de WhatsApp.',
      invalid_service: 'Ese servicio ya no está disponible. Actualiza la página.',
      inactive_service: 'Ese servicio está temporalmente desactivado.',
      invalid_date: 'La fecha seleccionada ya no es válida.',
      invalid_time: 'El horario seleccionado no es válido.',
      invalid_duration: 'El servicio cambió de duración. Vuelve a elegir tu horario.',
      date_blocked: 'Ese día ya no está disponible.',
      time_blocked: 'Ese horario fue bloqueado por el negocio.'
    };

    for (const [key, reason] of Object.entries(known)) {
      if (msg.includes(key)) return { ok: false, reason };
    }

    return {
      ok: false,
      reason: 'No pudimos confirmar la cita. Actualiza la página y vuelve a intentarlo.'
    };
  }

  // Nota: create_appointment ahora regresa una tabla (appointment_id, access_token)
  // — ver sql/07_customer_portal.sql — por eso se lee la primera fila.
  const row = Array.isArray(data) ? data[0] : data;
  if(bookingSource&&row?.appointment_id&&row?.access_token){
    const tracked=await supabaseClient.rpc('track_booking_source',{p_appointment_id:row.appointment_id,p_access_token:row.access_token,p_source:bookingSource});
    if(tracked.error)console.warn('[MyCitaGo source]',tracked.error);
  }
  return { ok: true, appointmentId: row?.appointment_id, accessToken: row?.access_token };
}

function buildWhatsappConfirmationUrl(business, { serviceName, dateLabel, startTime, price }) {
  const message =
    `Hola, quiero confirmar mi cita en ${business.name}:\n` +
    `• Servicio: ${serviceName}\n` +
    `• Fecha: ${dateLabel}\n` +
    `• Hora: ${startTime}\n` +
    `• Precio: ${formatPrice(price)}`;

  return `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;
}

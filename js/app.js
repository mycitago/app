// =========================================================
// app.js — Controla el flujo de reserva en la página pública
// =========================================================

const state = {
  business: null,
  services: [],
  selectedService: null,
  activeCategory: null,
  serviceSearch: '',
  days: [],
  selectedDate: null, // objeto Date
  selectedSlot: null, // { start, end }
};

const el = {
  heroName: document.getElementById('hero-name'),
  heroAddress: document.getElementById('hero-address'),
  heroSchedule: document.getElementById('hero-schedule'),
  heroLogo: document.getElementById('hero-logo'),
  categoryTabs: document.getElementById('category-tabs'),
  servicesList: document.getElementById('services-list'),
  serviceSearch: document.getElementById('service-search'),
  selectedServiceMini: document.getElementById('selected-service-mini'),
  selectedServiceName: document.getElementById('selected-service-name'),
  selectedServiceMeta: document.getElementById('selected-service-meta'),
  bookingSection: document.getElementById('booking-section'),
  bookingStep: document.getElementById('booking-step'),
  dateScroller: document.getElementById('date-scroller'),
  slotGrid: document.getElementById('slot-grid'),
  formStep: document.getElementById('form-step'),
  confirmStep: document.getElementById('confirm-step'),
  successStep: document.getElementById('success-step'),
  btnAgendar: document.getElementById('btn-agendar'),
  btnGoToForm: document.getElementById('btn-go-to-form'),
  btnConfirmBooking: document.getElementById('btn-confirm-booking'),
  btnWhatsapp: document.getElementById('btn-whatsapp'),
  inputName: document.getElementById('input-name'),
  inputWhatsapp: document.getElementById('input-whatsapp'),
  inputNotes: document.getElementById('input-notes'),
  toast: document.getElementById('toast'),
};

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  setTimeout(() => el.toast.classList.add('hidden'), 3500);
}

function scrollTo(node) {
  node.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Mensajes para cuando la URL no trae un negocio válido.
// No son errores de configuración del sistema: son de la URL que
// visitó la persona, así que el mensaje debe ser claro para ella.
const BUSINESS_ERROR_MESSAGES = {
  missing_slug: 'Este enlace no incluye un negocio. Pide a tu estética el link correcto de reservación.',
  not_found: 'No encontramos ninguna estética con ese enlace. Verifica que sea el link correcto.',
  query_failed: 'No se pudo cargar la información del negocio. Intenta de nuevo en un momento.',
};

function renderBusinessError(errorCode) {
  const message = BUSINESS_ERROR_MESSAGES[errorCode] || BUSINESS_ERROR_MESSAGES.query_failed;
  document.getElementById('app').innerHTML =
    `<div class="container"><p class="empty-state">${message}</p></div>`;
}

function renderHero() {
  const b = state.business;
  el.heroName.textContent = b.name;
  el.heroAddress.textContent = b.address || '';
  if (b.logo_url) {
    el.heroLogo.src = b.logo_url;
    el.heroLogo.classList.remove('hidden');
  }
  if (b.cover_image_url) {
    document.getElementById('hero').style.backgroundImage =
      `linear-gradient(180deg, rgba(39,27,29,0) 40%, rgba(39,27,29,0.55) 100%), url('${b.cover_image_url}')`;
  }

  const todayHours = getDayHours(b, new Date());
  el.heroSchedule.textContent = todayHours
    ? `Hoy: ${todayHours.open} – ${todayHours.close}`
    : 'Hoy: cerrado';
}

function selectService(service) {
  state.selectedService = service;
  document.querySelectorAll('.service-card').forEach((c) => {
    c.classList.toggle('is-selected', c.dataset.serviceId === service.id);
  });
  el.btnAgendar.disabled = false;
  if (el.selectedServiceMini) {
    el.selectedServiceMini.classList.remove('hidden');
    el.selectedServiceName.textContent = service.name;
    el.selectedServiceMeta.textContent = `${formatDuration(service.duration_minutes)} · ${formatPrice(service.price)}`;
  }
}

function renderDateScroller() {
  state.days = buildUpcomingDays(state.business);
  el.dateScroller.innerHTML = '';

  state.days.forEach((day) => {
    const chip = document.createElement('div');
    chip.className = 'date-chip' + (day.isClosed ? ' is-disabled' : '');
    chip.innerHTML = `<div class="date-chip-dow">${day.dow}</div><div class="date-chip-num">${day.dayNum}</div>`;
    if (!day.isClosed) {
      chip.addEventListener('click', () => selectDate(day));
    }
    chip.dataset.dateKey = day.dateKey;
    el.dateScroller.appendChild(chip);
  });
}

async function selectDate(day) {
  state.selectedDate = day.date;
  state.selectedSlot = null;
  document.querySelectorAll('.date-chip').forEach((c) => {
    c.classList.toggle('is-selected', c.dataset.dateKey === day.dateKey);
  });

  el.slotGrid.innerHTML = '<p class="empty-state">Buscando horarios disponibles…</p>';
  el.btnGoToForm.disabled = true;

  const slots = await getAvailableSlots(state.business, day.date, state.selectedService.duration_minutes);
  renderSlots(slots);
}

function renderSlots(slots) {
  el.slotGrid.innerHTML = '';

  if (slots.length === 0) {
    el.slotGrid.innerHTML = '<p class="empty-state">No hay horarios disponibles este día. Elige otra fecha.</p>';
    return;
  }

  const anyAvailable = slots.some((s) => s.available);
  if (!anyAvailable) {
    el.slotGrid.innerHTML = '<p class="empty-state">Todos los horarios de este día ya están ocupados. Elige otra fecha.</p>';
    return;
  }

  slots.forEach((slot) => {
    const pill = document.createElement('div');
    pill.className = 'slot-pill' + (slot.available ? '' : ' is-disabled');
    pill.textContent = slot.label;
    if (slot.available) {
      pill.addEventListener('click', () => {
        state.selectedSlot = slot;
        document.querySelectorAll('.slot-pill').forEach((p) => p.classList.remove('is-selected'));
        pill.classList.add('is-selected');
        el.btnGoToForm.disabled = false;
      });
    }
    el.slotGrid.appendChild(pill);
  });
}

function goToStep(stepEl) {
  [el.bookingStep, el.formStep, el.confirmStep, el.successStep]
    .filter((s) => s !== null)
    .forEach((s) => s.classList.add('hidden'));
  stepEl.classList.remove('hidden');
  scrollTo(stepEl);
}

function clearFieldErrors() {
  document.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
}

function validateForm() {
  clearFieldErrors();
  let valid = true;

  if (!el.inputName.value.trim()) {
    el.inputName.closest('.field').classList.add('has-error');
    valid = false;
  }

  const digits = validateWhatsapp(el.inputWhatsapp.value);
  if (!digits) {
    el.inputWhatsapp.closest('.field').classList.add('has-error');
    valid = false;
  }

  return valid;
}

async function handleConfirmBooking() {
  if (!validateForm()) return;

  el.btnConfirmBooking.disabled = true;
  el.btnConfirmBooking.innerHTML = '<span class="spinner"></span> Guardando…';

  const digits = validateWhatsapp(el.inputWhatsapp.value);
  const result = await bookAppointment({
    business: state.business,
    service: state.selectedService,
    dateKey: toDateKey(state.selectedDate),
    startTime: state.selectedSlot.start,
    endTime: state.selectedSlot.end,
    name: el.inputName.value.trim(),
    whatsappDigits: digits,
    notes: el.inputNotes.value.trim(),
  });

  el.btnConfirmBooking.disabled = false;
  el.btnConfirmBooking.textContent = 'Confirmar cita';

  if (!result.ok) {
    showToast(result.reason);
    if (/horario/i.test(result.reason)) {
      // el horario ya no está disponible: refrescar la lista
      await selectDate(state.days.find((d) => d.dateKey === toDateKey(state.selectedDate)));
      goToStep(el.bookingStep);
    }
    return;
  }

  renderSuccess();
  goToStep(el.successStep);
}

function renderSuccess() {
  const dateLabel = state.selectedDate.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  document.getElementById('summary-service').textContent = state.selectedService.name;
  document.getElementById('summary-date').textContent = dateLabel;
  document.getElementById('summary-time').textContent = state.selectedSlot.start;
  document.getElementById('summary-duration').textContent = formatDuration(state.selectedService.duration_minutes);
  document.getElementById('summary-business').textContent = state.business.name;
  document.getElementById('summary-address').textContent = state.business.address || '';

  el.btnWhatsapp.href = buildWhatsappConfirmationUrl(state.business, {
    serviceName: state.selectedService.name,
    dateLabel,
    startTime: state.selectedSlot.start,
    price: state.selectedService.price,
  });
}

async function loadPublicReviews(businessId){const host=document.getElementById('public-reviews'),section=document.getElementById('public-reviews-section');if(!host||!section)return;const {data,error}=await supabaseClient.from('business_google_reviews_public').select('reviewer_name,star_rating,comment,create_time,reply_comment').eq('business_id',businessId).order('create_time',{ascending:false}).limit(5);if(error||!data?.length)return;host.replaceChildren();data.forEach(r=>{const c=document.createElement('article');c.className='public-review-card';const h=document.createElement('strong');h.textContent=`${'★'.repeat(Number(r.star_rating||0))} ${r.reviewer_name||'Cliente'}`;const p=document.createElement('p');p.textContent=r.comment||'';c.append(h,p);host.appendChild(c)});const avg=data.reduce((a,r)=>a+Number(r.star_rating||0),0)/data.length;document.getElementById('public-rating').textContent=`${avg.toFixed(1)} ★`;section.hidden=false}
async function init() {
  const result = await loadBusiness();

  if (!result.business) {
    renderBusinessError(result.error);
    return;
  }
  state.business = result.business;
  applyTheme(state.business.theme);
  if (typeof loadPublishedBranding === 'function') {
    const branding = await loadPublishedBranding(state.business.id);
    if (branding) { applyPublishedBranding(branding); renderPublicSections(branding); }
  }

  renderHero();
  state.services = await loadActiveServices(state.business.id);
  renderCategoryTabs(state.services, el.categoryTabs, (category) => {
    state.activeCategory = category;
    renderServices(state.services, el.servicesList, selectService, state.activeCategory, state.serviceSearch);
  });
  renderServices(state.services, el.servicesList, selectService, state.activeCategory, state.serviceSearch);

  if (el.serviceSearch) {
    el.serviceSearch.addEventListener('input', () => {
      state.serviceSearch = el.serviceSearch.value.trim();
      renderServices(state.services, el.servicesList, selectService, state.activeCategory, state.serviceSearch);
    });
  }
  renderDateScroller();
  loadPublicReviews(state.business.id);

  el.btnAgendar.addEventListener('click', () => {
    if (!state.selectedService) return;
    goToStep(el.bookingStep);
  });

  el.btnGoToForm.addEventListener('click', () => {
    if (!state.selectedSlot) return;
    goToStep(el.formStep);
  });

  el.btnConfirmBooking.addEventListener('click', handleConfirmBooking);

  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.back);
      goToStep(target);
    });
  });
}

document.addEventListener('DOMContentLoaded', init);

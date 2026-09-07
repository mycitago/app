// =========================================================
// appointments.js — disponibilidad y creación segura de citas
// P0 estable.
// =========================================================
const DOW_KEYS=['sun','mon','tue','wed','thu','fri','sat'];
const DOW_LABELS=['D','L','M','M','J','V','S'];
const SLOT_STEP_MINUTES=15;
function toDateKey(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`;}
function timeToMinutes(t){const [h,m]=String(t).split(':').map(Number);return h*60+m;}
function minutesToTime(mins){return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;}
function getDayHours(business,date){const h=business.opening_hours?.[DOW_KEYS[date.getDay()]];return (!h||h.closed||!h.open||!h.close)?null:h;}
function buildUpcomingDays(business,count=21){const days=[],today=new Date();today.setHours(0,0,0,0);for(let i=0;i<count;i++){const date=new Date(today);date.setDate(today.getDate()+i);days.push({date,dateKey:toDateKey(date),dow:DOW_LABELS[date.getDay()],dayNum:date.getDate(),isClosed:!getDayHours(business,date)});}return days;}
async function fetchBusyRanges(businessId,dateKey){
  const [{data:busySlots,error:busyError},{data:blocked,error:blockedError}]=await Promise.all([
    supabaseClient.rpc('get_busy_slots',{p_business_id:businessId,p_date:dateKey}),
    supabaseClient.rpc('get_public_blocked_times',{p_business_id:businessId,p_date:dateKey})
  ]);
  if(busyError)console.error('Error obteniendo horarios ocupados:',busyError);
  if(blockedError)console.error('Error obteniendo bloqueos:',blockedError);
  const ranges=[];
  (busySlots||[]).forEach(s=>ranges.push([timeToMinutes(s.start_time),timeToMinutes(s.end_time)]));
  (blocked||[]).forEach(b=>{if(b.start_time&&b.end_time)ranges.push([timeToMinutes(b.start_time),timeToMinutes(b.end_time)]);});
  return ranges;
}
async function isDateFullyBlocked(businessId,dateKey){
  const {data,error}=await supabaseClient.rpc('get_public_blocked_times',{p_business_id:businessId,p_date:dateKey});
  if(error){console.error('Error verificando bloqueo:',error);return false;}
  return (data||[]).some(row=>!row.start_time&&!row.end_time);
}
function rangesOverlap(aStart,aEnd,bStart,bEnd){return aStart<bEnd&&bStart<aEnd;}
async function getAvailableSlots(business,date,durationMinutes){
  const dateKey=toDateKey(date),dayHours=getDayHours(business,date); if(!dayHours)return[];
  if(await isDateFullyBlocked(business.id,dateKey))return[];
  const busyRanges=await fetchBusyRanges(business.id,dateKey),openMin=timeToMinutes(dayHours.open),closeMin=timeToMinutes(dayHours.close);
  const now=new Date(),isToday=toDateKey(now)===dateKey,nowMinutes=now.getHours()*60+now.getMinutes(),slots=[];
  for(let start=openMin;start+durationMinutes<=closeMin;start+=SLOT_STEP_MINUTES){
    const end=start+durationMinutes;if(isToday&&start<=nowMinutes)continue;
    slots.push({start:minutesToTime(start),end:minutesToTime(end),label:minutesToTime(start),available:!busyRanges.some(([bs,be])=>rangesOverlap(start,end,bs,be))});
  }
  return slots;
}
function validateWhatsapp(raw){const digits=String(raw||'').replace(/\D/g,'');return digits.length===10?digits:null;}
async function bookAppointment({business,service,dateKey,startTime,endTime,name,whatsappDigits,notes}){
  const bookingSource=(new URLSearchParams(location.search).get('src')||'').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32);
  const {data,error}=await supabaseClient.rpc('create_appointment',{p_business_id:business.id,p_service_id:service.id,p_name:name,p_whatsapp:`52${whatsappDigits}`,p_date:dateKey,p_start:startTime,p_end:endTime,p_notes:notes||null});
  if(error){
    console.error('Error creando cita:',error);
    const msg=String(error.message||''),code=String(error.code||'');
    if(code==='23P01'||msg.includes('slot_taken')||/exclu/i.test(msg))return{ok:false,reason:'Ese horario acaba de ocuparse. Elige otro horario.'};
    const known={invalid_name:'Revisa tu nombre.',invalid_whatsapp:'Revisa tu número de WhatsApp.',invalid_service:'Ese servicio ya no está disponible.',inactive_service:'Ese servicio está temporalmente desactivado.',invalid_date:'La fecha seleccionada ya no es válida.',invalid_time:'El horario seleccionado no es válido.',invalid_duration:'El servicio cambió de duración.',date_blocked:'Ese día ya no está disponible.',time_blocked:'Ese horario fue bloqueado por el negocio.'};
    for(const[k,v]of Object.entries(known))if(msg.includes(k))return{ok:false,reason:v};
    return{ok:false,reason:'No pudimos confirmar la cita. Actualiza la página y vuelve a intentarlo.'};
  }
  const row=Array.isArray(data)?data[0]:data;
  if(bookingSource&&row?.appointment_id&&row?.access_token){
    const tracked=await supabaseClient.rpc('track_booking_source',{p_appointment_id:row.appointment_id,p_access_token:row.access_token,p_source:bookingSource});
    if(tracked.error)console.warn('[MyCitaGo source]',tracked.error);
  }
  return{ok:true,appointmentId:row?.appointment_id,accessToken:row?.access_token};
}
function buildWhatsappConfirmationUrl(business,{serviceName,dateLabel,startTime,price}){
  const message=`Hola, quiero confirmar mi cita en ${business.name}:\n• Servicio: ${serviceName}\n• Fecha: ${dateLabel}\n• Hora: ${startTime}\n• Precio: ${formatPrice(price)}`;
  return `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;
}

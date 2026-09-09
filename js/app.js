// =========================================================
// app.js — MyCitaGo Adaptive Booking
// Flujo: Servicio → Fecha/Hora → Datos → Confirmación
// =========================================================
const state={business:null,services:[],selectedService:null,activeCategory:null,serviceSearch:'',days:[],selectedDate:null,selectedSlot:null,preset:null};
const $=id=>document.getElementById(id);
const el={
  heroName:$('hero-name'),heroAddress:$('hero-address'),heroSchedule:$('hero-schedule'),heroLogo:$('hero-logo'),
  categoryTabs:$('category-tabs'),servicesList:$('services-list'),serviceSearch:$('service-search'),
  selectedServiceMini:$('selected-service-mini'),selectedServiceName:$('selected-service-name'),selectedServiceMeta:$('selected-service-meta'),
  bookingStep:$('booking-step'),dateScroller:$('date-scroller'),slotGrid:$('slot-grid'),formStep:$('form-step'),successStep:$('success-step'),
  btnAgendar:$('btn-agendar'),btnGoToForm:$('btn-go-to-form'),btnConfirmBooking:$('btn-confirm-booking'),btnWhatsapp:$('btn-whatsapp'),
  inputName:$('input-name'),inputWhatsapp:$('input-whatsapp'),inputNotes:$('input-notes'),toast:$('toast'),availabilityLive:$('availability-live'),errorLive:$('error-live')
};
const BUSINESS_ERROR_MESSAGES={
  missing_slug:'Este enlace no incluye un negocio. Verifica que hayas abierto el enlace completo de reservación.',
  not_found:'No encontramos un negocio asociado a este enlace. Verifica que sea el enlace correcto.',
  query_failed:'No pudimos cargar la información en este momento. Intenta de nuevo en unos segundos.'
};
function announce(node,message){if(node)node.textContent=message;}
function showToast(message){el.toast.textContent=message;el.toast.classList.remove('hidden');announce(el.errorLive,message);setTimeout(()=>el.toast.classList.add('hidden'),3500);}
function scrollToNode(node){node?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
function renderBusinessError(code){$('app').innerHTML=`<main class="booking-error-shell"><div class="booking-error-card"><strong>No pudimos abrir esta reserva</strong><p>${BUSINESS_ERROR_MESSAGES[code]||BUSINESS_ERROR_MESSAGES.query_failed}</p></div></main>`;}
function renderHero(){
  const b=state.business;el.heroName.textContent=b.name;el.heroAddress.textContent=b.address||'';
  if(b.logo_url){el.heroLogo.src=b.logo_url;el.heroLogo.classList.remove('hidden');}
  const h=getDayHours(b,new Date());el.heroSchedule.textContent=h?`Hoy ${h.open} – ${h.close}`:'Hoy cerrado';
  const hero=$('hero');
  if(b.cover_image_url){hero.style.setProperty('--booking-cover',`url("${b.cover_image_url}")`);hero.classList.add('has-cover');}
}
function selectService(service){
  state.selectedService=service;
  document.querySelectorAll('.service-card').forEach(c=>{const selected=c.dataset.serviceId===service.id;c.classList.toggle('is-selected',selected);c.setAttribute('aria-pressed',selected?'true':'false');});
  el.btnAgendar.disabled=false;
  el.selectedServiceMini.classList.remove('hidden');el.selectedServiceName.textContent=service.name;el.selectedServiceMeta.textContent=`${formatDuration(service.duration_minutes)} · ${formatPrice(service.price)}`;
  $('booking-side-service').textContent=service.name;$('booking-side-meta').textContent=`${formatDuration(service.duration_minutes)} · ${formatPrice(service.price)}`;
}
function renderDateScroller(){
  state.days=buildUpcomingDays(state.business);el.dateScroller.replaceChildren();
  state.days.forEach(day=>{
    const chip=document.createElement('button');chip.type='button';chip.className='date-chip'+(day.isClosed?' is-disabled':'');chip.disabled=day.isClosed;
    chip.setAttribute('aria-pressed','false');chip.dataset.dateKey=day.dateKey;
    const label=day.date.toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'});
    chip.setAttribute('aria-label',day.isClosed?`${label}, cerrado`:label);
    chip.innerHTML=`<span class="date-chip-dow">${day.dow}</span><strong class="date-chip-num">${day.dayNum}</strong>`;
    if(!day.isClosed)chip.addEventListener('click',()=>selectDate(day));el.dateScroller.appendChild(chip);
  });
}
async function selectDate(day){
  state.selectedDate=day.date;state.selectedSlot=null;el.btnGoToForm.disabled=true;
  document.querySelectorAll('.date-chip').forEach(c=>{const selected=c.dataset.dateKey===day.dateKey;c.classList.toggle('is-selected',selected);c.setAttribute('aria-pressed',selected?'true':'false');});
  el.slotGrid.innerHTML='<div class="booking-skeleton" aria-hidden="true"><span></span><span></span><span></span><span></span></div>';
  announce(el.availabilityLive,'Buscando horarios disponibles.');
  const slots=await getAvailableSlots(state.business,day.date,state.selectedService.duration_minutes);renderSlots(slots);
}
function slotGroup(title,slots){if(!slots.length)return'';return `<section class="slot-period"><h3>${title}</h3><div class="slot-period-grid"></div></section>`;}
function renderSlots(slots){
  el.slotGrid.replaceChildren();
  const available=(slots||[]).filter(s=>s.available);
  if(!available.length){el.slotGrid.innerHTML='<p class="empty-state">No hay horarios disponibles este día. Prueba otra fecha.</p>';announce(el.availabilityLive,'No hay horarios disponibles para esta fecha.');return;}
  const groups=[['Mañana',available.filter(s=>timeToMinutes(s.start)<12*60)],['Tarde',available.filter(s=>timeToMinutes(s.start)>=12*60&&timeToMinutes(s.start)<18*60)],['Noche',available.filter(s=>timeToMinutes(s.start)>=18*60)]];
  groups.forEach(([title,list])=>{
    if(!list.length)return;
    const section=document.createElement('section');section.className='slot-period';
    const heading=document.createElement('h3');heading.textContent=title;
    const grid=document.createElement('div');grid.className='slot-period-grid';
    list.forEach(slot=>{
      const button=document.createElement('button');button.type='button';button.className='slot-pill';button.textContent=slot.label;button.setAttribute('aria-pressed','false');
      button.addEventListener('click',()=>{
        state.selectedSlot=slot;document.querySelectorAll('.slot-pill').forEach(p=>{p.classList.remove('is-selected');p.setAttribute('aria-pressed','false');});
        button.classList.add('is-selected');button.setAttribute('aria-pressed','true');el.btnGoToForm.disabled=false;
        $('booking-side-time').textContent=`${state.selectedDate.toLocaleDateString('es-MX',{day:'numeric',month:'short'})} · ${slot.start}`;
        announce(el.availabilityLive,`Horario ${slot.label} seleccionado.`);
      });
      grid.appendChild(button);
    });
    section.append(heading,grid);el.slotGrid.appendChild(section);
  });
  announce(el.availabilityLive,`${available.length} horarios disponibles.`);
}
function syncFlowChrome(stepEl){
  const onServices=stepEl?.id==='step-services';
  document.body.classList.toggle('booking-flow-active',!onServices);
  const hero=$('hero');
  if(hero)hero.hidden=!onServices;
}
function goToStep(stepEl){
  [$('step-services'),el.bookingStep,el.formStep,el.successStep].forEach(s=>s?.classList.add('hidden'));
  stepEl.classList.remove('hidden');
  syncFlowChrome(stepEl);
  scrollToNode(stepEl);stepEl.querySelector('h2')?.focus?.();
}
function setProgress(step){
  document.querySelectorAll('[data-progress-step]').forEach(node=>{
    const n=Number(node.dataset.progressStep);node.classList.toggle('is-active',n===step);node.classList.toggle('is-done',n<step);
  });
}
function validateForm(){
  let valid=true;document.querySelectorAll('.field').forEach(f=>f.classList.remove('has-error'));
  if(!el.inputName.value.trim()){el.inputName.closest('.field').classList.add('has-error');valid=false;}
  if(!validateWhatsapp(el.inputWhatsapp.value)){el.inputWhatsapp.closest('.field').classList.add('has-error');valid=false;}
  if(!valid)announce(el.errorLive,'Revisa los campos marcados antes de continuar.');return valid;
}
async function handleConfirmBooking(){
  if(!validateForm())return;
  el.btnConfirmBooking.disabled=true;el.btnConfirmBooking.textContent='Confirmando…';
  const result=await bookAppointment({business:state.business,service:state.selectedService,dateKey:toDateKey(state.selectedDate),startTime:state.selectedSlot.start,endTime:state.selectedSlot.end,name:el.inputName.value.trim(),whatsappDigits:validateWhatsapp(el.inputWhatsapp.value),notes:el.inputNotes.value.trim()});
  el.btnConfirmBooking.disabled=false;el.btnConfirmBooking.textContent='Confirmar cita';
  if(!result.ok){showToast(result.reason);if(/horario/i.test(result.reason)){await selectDate(state.days.find(d=>d.dateKey===toDateKey(state.selectedDate)));goToStep(el.bookingStep);}return;}
  renderSuccess();setProgress(4);goToStep(el.successStep);
}
function renderSuccess(){
  const dateLabel=state.selectedDate.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});
  $('summary-service').textContent=state.selectedService.name;$('summary-date').textContent=dateLabel;$('summary-time').textContent=state.selectedSlot.start;
  $('summary-duration').textContent=formatDuration(state.selectedService.duration_minutes);$('summary-business').textContent=state.business.name;$('summary-address').textContent=state.business.address||'';
  if(state.business.whatsapp){el.btnWhatsapp.href=buildWhatsappConfirmationUrl(state.business,{serviceName:state.selectedService.name,dateLabel,startTime:state.selectedSlot.start,price:state.selectedService.price});el.btnWhatsapp.hidden=false;}else{el.btnWhatsapp.hidden=true;}
}
async function loadPublicReviews(businessId){
  const host=$('public-reviews'),section=$('public-reviews-section');if(!host||!section)return;
  const {data,error}=await supabaseClient.from('business_google_reviews_public').select('reviewer_name,star_rating,comment,create_time').eq('business_id',businessId).order('create_time',{ascending:false}).limit(5);
  if(error||!data?.length)return;
  host.replaceChildren();data.forEach(r=>{const c=document.createElement('article');c.className='public-review-card';const h=document.createElement('strong');h.textContent=`${'★'.repeat(Number(r.star_rating||0))} ${r.reviewer_name||'Cliente'}`;const p=document.createElement('p');p.textContent=r.comment||'';c.append(h,p);host.appendChild(c);});
  const avg=data.reduce((a,r)=>a+Number(r.star_rating||0),0)/data.length;$('public-rating').textContent=`${avg.toFixed(1)} ★`;section.hidden=false;
}
async function init(){
  const result=await loadBusiness();if(!result.business){renderBusinessError(result.error);return;}
  state.business=result.business;state.preset=window.applyAdaptiveBookingPreset?.(state.business)||null;applyTheme?.(state.business.theme);renderHero();
  state.services=await loadActiveServices(state.business.id);
  renderCategoryTabs(state.services,el.categoryTabs,category=>{state.activeCategory=category;renderServices(state.services,el.servicesList,selectService,state.activeCategory,state.serviceSearch);});
  renderServices(state.services,el.servicesList,selectService,state.activeCategory,state.serviceSearch);
  $('services-count').textContent=state.services.length?`${state.services.length} opciones`:'';
  el.serviceSearch?.addEventListener('input',()=>{state.serviceSearch=el.serviceSearch.value.trim();renderServices(state.services,el.servicesList,selectService,state.activeCategory,state.serviceSearch);});
  renderDateScroller();loadPublicReviews(state.business.id);
  syncFlowChrome($('step-services'));
  el.btnAgendar.addEventListener('click',()=>{if(!state.selectedService)return;setProgress(2);goToStep(el.bookingStep);});
  el.btnGoToForm.addEventListener('click',()=>{if(!state.selectedSlot)return;setProgress(3);goToStep(el.formStep);});
  el.btnConfirmBooking.addEventListener('click',handleConfirmBooking);
  document.querySelectorAll('[data-back]').forEach(btn=>btn.addEventListener('click',()=>{const target=$(btn.dataset.back);setProgress(target.id==='booking-step'?2:1);goToStep(target);}));
}
document.addEventListener('DOMContentLoaded',init);

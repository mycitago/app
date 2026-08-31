
let biz = null;
let items = [];
let blockedItems = [];
let selectedPresetImage = '';
let staffItems = [];
let selectedStaffIds = new Set();
const $ = id => document.getElementById(id);


const assetUrl = file => new URL(`../assets/service-presets/${file}`, location.href).href;
const SERVICE_TEMPLATE_LIBRARY = {
  barber:[
    {name:'Corte clásico',category:'Barbería',duration:30,description:'Corte personalizado con acabado profesional.',image:'barber-cut.svg'},
    {name:'Corte + barba',category:'Barbería',duration:60,description:'Servicio completo de corte y arreglo de barba.',image:'barber-beard.svg'},
    {name:'Afeitado',category:'Barbería',duration:30,description:'Afeitado y perfilado con acabado limpio.',image:'barber-beard.svg'},
    {name:'Corte infantil',category:'Barbería',duration:30,description:'Corte para niñas y niños.',image:'barber-cut.svg'}],
  beauty:[
    {name:'Corte dama',category:'Belleza y cuidado',duration:60,description:'Corte, asesoría y acabado.',image:'beauty-hair.svg'},
    {name:'Peinado',category:'Belleza y cuidado',duration:60,description:'Peinado para ocasión o uso diario.',image:'beauty-hair.svg'},
    {name:'Tinte',category:'Belleza y cuidado',duration:120,description:'Coloración profesional según diagnóstico.',image:'beauty-hair.svg'}],
  nails:[
    {name:'Manicure',category:'Uñas',duration:45,description:'Cuidado de manos y acabado profesional.',image:'nails.svg'},
    {name:'Gel semipermanente',category:'Uñas',duration:60,description:'Aplicación de gel de larga duración.',image:'nails.svg'},
    {name:'Pedicure',category:'Uñas',duration:60,description:'Cuidado de pies y acabado profesional.',image:'nails.svg'}],
  spa:[{name:'Masaje relajante',category:'Spa',duration:60,description:'Sesión de relajación y bienestar.',image:'spa.svg'},{name:'Facial',category:'Spa',duration:60,description:'Cuidado facial personalizado.',image:'spa.svg'}],
  dental:[{name:'Valoración dental',category:'Consultas',duration:45,description:'Evaluación inicial y plan de tratamiento.',image:'dental.svg'},{name:'Limpieza dental',category:'Consultas',duration:60,description:'Limpieza profesional y recomendaciones.',image:'dental.svg'}],
  therapy:[{name:'Primera consulta',category:'Consultas',duration:60,description:'Sesión inicial de valoración.',image:'therapy.svg'},{name:'Sesión de seguimiento',category:'Consultas',duration:50,description:'Sesión de seguimiento terapéutico.',image:'therapy.svg'}],
  nutrition:[{name:'Valoración nutricional',category:'Consultas',duration:60,description:'Evaluación inicial y plan personalizado.',image:'nutrition.svg'},{name:'Seguimiento nutricional',category:'Consultas',duration:45,description:'Revisión de avances y ajustes.',image:'nutrition.svg'}],
  physio:[{name:'Valoración fisioterapia',category:'Salud y bienestar',duration:60,description:'Evaluación funcional inicial.',image:'physio.svg'},{name:'Sesión de rehabilitación',category:'Salud y bienestar',duration:60,description:'Sesión terapéutica de rehabilitación.',image:'physio.svg'}],
  veterinary:[{name:'Consulta veterinaria',category:'Consultas',duration:45,description:'Consulta general y valoración.',image:'veterinary.svg'},{name:'Vacunación',category:'Consultas',duration:30,description:'Aplicación y registro de vacuna.',image:'veterinary.svg'}],
  consulting:[{name:'Consulta inicial',category:'Servicios profesionales',duration:60,description:'Sesión inicial para entender necesidades y alcance.',image:'consulting.svg'},{name:'Sesión de seguimiento',category:'Servicios profesionales',duration:60,description:'Seguimiento y ejecución de acuerdos.',image:'consulting.svg'}],
  automotive:[{name:'Diagnóstico',category:'Mantenimiento',duration:60,description:'Revisión inicial para identificar la causa del problema.',image:'automotive.svg'},{name:'Mantenimiento preventivo',category:'Mantenimiento',duration:120,description:'Revisión y mantenimiento programado.',image:'automotive.svg'}],
  photo:[{name:'Sesión fotográfica',category:'Servicios profesionales',duration:90,description:'Sesión personalizada con preparación previa.',image:'photo.svg'}],
  classes:[{name:'Clase individual',category:'Clases',duration:60,description:'Sesión individual personalizada.',image:'class.svg'},{name:'Clase grupal',category:'Clases',duration:60,description:'Sesión grupal programada.',image:'class.svg'}],
  other:[{name:'Servicio personalizado',category:'Servicios',duration:60,description:'Personaliza este servicio según tu negocio.',image:'consulting.svg'}]
};
let currentTemplateCategory='barber';
let commercialSettings=null;
let autoSaveTimer=null;

const DAYS = [
  ['mon','Lunes'],['tue','Martes'],['wed','Miércoles'],['thu','Jueves'],
  ['fri','Viernes'],['sat','Sábado'],['sun','Domingo']
];

const HOUR_TEMPLATES = {
  office: {
    mon:{open:'09:00',close:'19:00'}, tue:{open:'09:00',close:'19:00'},
    wed:{open:'09:00',close:'19:00'}, thu:{open:'09:00',close:'19:00'},
    fri:{open:'09:00',close:'19:00'}, sat:null, sun:null
  },
  extended: {
    mon:{open:'09:00',close:'18:00'}, tue:{open:'09:00',close:'18:00'},
    wed:{open:'09:00',close:'18:00'}, thu:{open:'09:00',close:'18:00'},
    fri:{open:'09:00',close:'18:00'}, sat:{open:'09:00',close:'18:00'}, sun:null
  },
  daily: {
    mon:{open:'10:00',close:'20:00'}, tue:{open:'10:00',close:'20:00'},
    wed:{open:'10:00',close:'20:00'}, thu:{open:'10:00',close:'20:00'},
    fri:{open:'10:00',close:'20:00'}, sat:{open:'10:00',close:'20:00'},
    sun:{open:'10:00',close:'20:00'}
  }
};

function svgPreset(label, c1, c2, icon) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="640" height="480" rx="40" fill="url(#g)"/>
  <circle cx="520" cy="80" r="120" fill="white" opacity=".12"/><circle cx="100" cy="430" r="150" fill="white" opacity=".08"/>
  <text x="320" y="235" text-anchor="middle" font-size="120" font-family="Arial">${icon}</text>
  <text x="320" y="345" text-anchor="middle" font-size="34" font-family="Arial" font-weight="700" fill="white">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const PRESET_IMAGES = [
  {label:'Consulta', url:svgPreset('Consulta','#5946e8','#15a8ff','✦')},
  {label:'Bienestar', url:svgPreset('Bienestar','#12a86a','#42d6a4','◉')},
  {label:'Cuidado', url:svgPreset('Cuidado','#d936c9','#ff6da8','✿')},
  {label:'Entrenamiento', url:svgPreset('Entrenamiento','#ff7b22','#ffbf47','◆')},
  {label:'Mantenimiento', url:svgPreset('Mantenimiento','#273b7a','#5685e8','⚙')},
  {label:'Profesional', url:svgPreset('Profesional','#19294f','#7457e8','▣')}
];

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2400);
}

function money(n) {
  return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(n)||0);
}

function localDateLabel(s) {
  if (!s) return '';
  const [y,m,d] = s.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',year:'numeric'}).format(new Date(y,m-1,d));
}


function renderServiceTemplates(category=currentTemplateCategory){
  currentTemplateCategory=category;
  const root=$('service-template-library'); if(!root)return;
  const list=SERVICE_TEMPLATE_LIBRARY[category]||SERVICE_TEMPLATE_LIBRARY.other;
  root.replaceChildren();
  list.forEach(t=>{
    const btn=document.createElement('button');btn.type='button';btn.className='svc-template-card';
    const img=document.createElement('img');img.src=assetUrl(t.image);img.alt='';
    const b=document.createElement('b');b.textContent=t.name;const small=document.createElement('small');small.textContent=`${t.duration} min · precio por definir`;
    btn.append(img,b,small);btn.addEventListener('click',()=>applyServiceTemplate(t));root.appendChild(btn);
  });
}

function applyServiceTemplate(t){
  clearForm();
  $('sname').value=t.name;$('category').value=t.category;$('duration').value=t.duration;$('sdesc').value=t.description||'';
  selectedPresetImage=assetUrl(t.image);$('preset-image-url').value=selectedPresetImage;
  updateSummary();calculateServiceIntelligence();saveLocalDraft();
  $('price').focus();$('price').closest('.svc-field')?.classList.add('svc-price-guide');setTimeout(()=>$('price').closest('.svc-field')?.classList.remove('svc-price-guide'),900);
  toast(`${t.name}: sólo falta definir el precio`);
}

function weeklyBusinessMinutes(hours=biz?.opening_hours||{}){
  return DAYS.reduce((sum,[key])=>{const h=hours?.[key];if(!h||h.closed||!h.open||!h.close)return sum;const [oh,om]=String(h.open).slice(0,5).split(':').map(Number),[ch,cm]=String(h.close).slice(0,5).split(':').map(Number);return sum+Math.max(0,(ch*60+cm)-(oh*60+om))},0);
}
function calculateServiceIntelligence(){
  const price=Number($('price')?.value)||0,duration=Number($('duration')?.value)||0,prep=Number($('prep-minutes')?.value)||0,recovery=Number($('recovery-minutes')?.value)||0,cost=Number($('internal-cost')?.value)||0,tax=Number($('tax-rate')?.value)||0,util=Number($('expected-utilization')?.value)||70;
  const blocked=duration+prep+recovery;const weeklyMinutes=weeklyBusinessMinutes();const capacity=blocked>0?Math.floor(weeklyMinutes/blocked):0;const weekly=capacity*price;const monthly=weekly*4.33;const netPrice=price/(1+tax/100);const margin=price>0?Math.max(-999,((netPrice-cost)/price)*100):0;const expected=monthly*(util/100);
  if($('intel-blocked'))$('intel-blocked').textContent=blocked?`${blocked} min`:'—';if($('intel-capacity'))$('intel-capacity').textContent=capacity?`${capacity} citas`:'—';if($('intel-hours'))$('intel-hours').textContent=weeklyMinutes?`${(weeklyMinutes/60).toFixed(1)} h`:'—';if($('intel-daily'))$('intel-daily').textContent=money(weekly/Math.max(1,DAYS.filter(([k])=>biz?.opening_hours?.[k]).length||5));if($('intel-weekly'))$('intel-weekly').textContent=money(weekly);if($('intel-monthly'))$('intel-monthly').textContent=money(monthly);if($('intel-margin'))$('intel-margin').textContent=price?`${margin.toFixed(0)}%`:'—';if($('intel-expected'))$('intel-expected').textContent=money(expected);
  const alerts=[];let health='Completa precio y duración',healthClass='';
  if(price>0&&duration>=5){health='Listo para reservar';healthClass='ok'}
  if(price>0&&cost>0&&margin<10){alerts.push(['warn','El margen estimado es menor al 10%. Revisa el precio o el costo interno.']);health='Margen bajo';healthClass='warn'}
  if(!weeklyMinutes){alerts.push(['danger','Tu negocio no tiene horarios disponibles. Configura el horario general.']);health='Sin disponibilidad';healthClass='danger'}
  if(duration>240){alerts.push(['warn','La duración es mayor a 4 horas. Confirma que sea correcta.'])}
  if(selectedStaffIds.size===0&&staffItems.length){alerts.push(['warn','No hay personal asignado todavía. El servicio podría no ser reservable.'])}
  if(selectedScheduleMode()==='custom'){alerts.push(['','Horario especial activo. MyCitaGo recomienda heredar el horario general salvo que este servicio realmente necesite una excepción.'])}
  const h=$('service-health');if(h){h.textContent=health;h.className=`svc-health ${healthClass}`}const pa=$('price-assistant');if(pa){if(price>0&&duration>=5){pa.classList.remove('hidden');pa.innerHTML=`<div><b>Perfecto. MyCitaGo completó una base recomendada.</b><span>${duration} min · ${money(price)} · ${selectedScheduleMode()==='business'?'usa el horario general':'horario especial'} · ${capacity||0} citas máximas/semana</span></div><em>Configuración intuitiva activa</em>`}else pa.classList.add('hidden')}
  const root=$('service-alerts');if(root){root.replaceChildren(...alerts.map(([kind,text])=>{const d=document.createElement('div');d.className=`svc-intel-alert ${kind}`;d.textContent=(kind==='danger'?'✕ ':'⚠ ')+text;return d}))}
  return{blocked,weeklyMinutes,capacity,weekly,monthly,margin,expected};
}
function draftKey(){return biz?.id?`mycitago:service-draft:${biz.id}`:null}
function saveLocalDraft(){if(!biz||$('sid')?.value)return;clearTimeout(autoSaveTimer);autoSaveTimer=setTimeout(()=>{const key=draftKey();if(!key)return;const payload={name:$('sname').value,category:$('category').value,price:$('price').value,duration:$('duration').value,description:$('sdesc').value,internal_cost:$('internal-cost')?.value||0,prep:$('prep-minutes')?.value||0,recovery:$('recovery-minutes')?.value||0,image:selectedPresetImage||$('preset-image-url').value,ts:Date.now()};localStorage.setItem(key,JSON.stringify(payload));},350)}
function restoreLocalDraft(){try{const key=draftKey(),raw=key&&localStorage.getItem(key);if(!raw)return;const d=JSON.parse(raw);if(Date.now()-Number(d.ts||0)>7*86400000)return localStorage.removeItem(key);if(!$('sname').value){$('sname').value=d.name||'';$('category').value=d.category||'Servicios';$('price').value=d.price||'';$('duration').value=d.duration||'';$('sdesc').value=d.description||'';if($('internal-cost'))$('internal-cost').value=d.internal_cost||0;if($('prep-minutes'))$('prep-minutes').value=d.prep||0;if($('recovery-minutes'))$('recovery-minutes').value=d.recovery||0;selectedPresetImage=d.image||'';$('preset-image-url').value=d.image||'';updateSummary();calculateServiceIntelligence();toast('Recuperamos tu borrador automático')}}catch(e){console.warn('[service draft]',e)}}
function clearLocalDraft(){const key=draftKey();if(key)localStorage.removeItem(key)}
function selectedScheduleMode(){return document.querySelector('input[name="schedule-mode"]:checked')?.value||'business'}
function syncScheduleMode(){const mode=selectedScheduleMode(),panel=$('custom-hours-panel');panel?.classList.toggle('hidden',mode!=='custom');document.querySelectorAll('.svc-choice').forEach(x=>x.classList.toggle('active',x.querySelector('input')?.checked));calculateServiceIntelligence()}
function copyMondayToAll(){const monday=document.querySelector('.svc-hour-row[data-day="mon"]');if(!monday)return;const on=monday.querySelector('.hour-enabled').checked,open=monday.querySelector('.hour-open').value,close=monday.querySelector('.hour-close').value;document.querySelectorAll('.svc-hour-row').forEach(row=>{row.querySelector('.hour-enabled').checked=on;row.querySelector('.hour-open').value=open;row.querySelector('.hour-close').value=close;row.querySelector('.hour-enabled').dispatchEvent(new Event('change'))});toast('Horario del lunes copiado')}
async function loadCommercialSettings(serviceId){commercialSettings=null;if(!serviceId)return;const {data,error}=await supabaseClient.from('service_commercial_settings').select('*').eq('service_id',serviceId).maybeSingle();if(error){console.warn('[commercial settings]',error.message);return}commercialSettings=data||null;if(!data)return;const set=(id,v)=>{if($(id)&&v!==null&&v!==undefined)$(id).value=v};set('internal-cost',data.internal_cost);set('tax-rate',Number(data.tax_rate||0)*100);set('expected-utilization',data.expected_utilization);set('prep-minutes',data.prep_minutes);set('recovery-minutes',data.recovery_minutes);set('min-booking-hours',Math.round((data.min_booking_notice_minutes||0)/60));set('max-booking-days',data.max_booking_window_days);set('service-tags',Array.isArray(data.tags)?data.tags.join(', '):'');set('cancellation-policy',data.cancellation_policy||'');set('refund-policy',data.refund_policy||'');const radio=document.querySelector(`input[name="schedule-mode"][value="${data.schedule_mode||'business'}"]`);if(radio)radio.checked=true;syncScheduleMode();calculateServiceIntelligence()}
async function saveCommercialSettings(serviceId){const tags=($('service-tags')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);const payload={service_id:serviceId,business_id:biz.id,internal_cost:Number($('internal-cost')?.value)||0,tax_rate:(Number($('tax-rate')?.value)||0)/100,deposit_mode:Number($('deposit').value)>0?'fixed':'none',deposit_value:Number($('deposit').value)||0,cancellation_policy:$('cancellation-policy')?.value.trim()||null,refund_policy:$('refund-policy')?.value.trim()||null,min_booking_notice_minutes:(Number($('min-booking-hours')?.value)||0)*60,max_booking_window_days:Number($('max-booking-days')?.value)||60,prep_minutes:Number($('prep-minutes')?.value)||0,recovery_minutes:Number($('recovery-minutes')?.value)||0,expected_utilization:Number($('expected-utilization')?.value)||70,schedule_mode:selectedScheduleMode(),tags,updated_at:new Date().toISOString()};const {error}=await supabaseClient.from('service_commercial_settings').upsert(payload,{onConflict:'service_id'});if(error)console.warn('[service commercial settings]',error.message)}
async function saveServiceVersion(serviceId,payload){try{const session=await supabaseClient.auth.getSession();await supabaseClient.from('service_versions').insert({service_id:serviceId,business_id:biz.id,snapshot:{...payload,commercial:{internal_cost:Number($('internal-cost')?.value)||0,prep_minutes:Number($('prep-minutes')?.value)||0,recovery_minutes:Number($('recovery-minutes')?.value)||0}},changed_by:session.data.session?.user?.id||null,change_summary:'Servicio guardado desde MyCitaGo'})}catch(e){console.warn('[service version]',e)}}

async function loadServiceHistory(serviceId){const root=$('service-history');if(!root)return;if(!serviceId){root.innerHTML='<div class="svc-empty">Guarda el servicio para comenzar su historial.</div>';return}const {data,error}=await supabaseClient.from('service_versions').select('id,snapshot,change_summary,created_at').eq('service_id',serviceId).order('created_at',{ascending:false}).limit(10);if(error){root.innerHTML='<div class="svc-empty">Activa el historial ejecutando APLICAR_EN_SUPABASE.sql.</div>';return}if(!data?.length){root.innerHTML='<div class="svc-empty">Aún no hay versiones anteriores.</div>';return}root.replaceChildren(...data.map(v=>{const row=document.createElement('div');row.className='svc-history-row';const d=document.createElement('div');const b=document.createElement('b');b.textContent=v.change_summary||'Cambio guardado';const sm=document.createElement('small');sm.textContent=new Date(v.created_at).toLocaleString('es-MX');d.append(b,sm);const bt=document.createElement('button');bt.type='button';bt.textContent='Restaurar';bt.onclick=()=>restoreServiceVersion(v.snapshot);row.append(d,bt);return row}))}
function restoreServiceVersion(snapshot){if(!snapshot)return;const set=(id,v)=>{if($(id)&&v!==undefined&&v!==null)$(id).value=v};set('sname',snapshot.name);set('category',snapshot.category);set('price',snapshot.price);set('duration',snapshot.duration_minutes);set('buffer',snapshot.buffer_minutes||0);set('deposit',snapshot.deposit_amount||0);set('sdesc',snapshot.description||'');set('internal-cost',snapshot.commercial?.internal_cost||0);set('prep-minutes',snapshot.commercial?.prep_minutes||0);set('recovery-minutes',snapshot.commercial?.recovery_minutes||0);if(snapshot.image_url){selectedPresetImage=snapshot.image_url;$('preset-image-url').value=snapshot.image_url}updateSummary();calculateServiceIntelligence();toast('Versión restaurada en el editor. Guarda para confirmar el cambio.')}
async function bulkSetActive(active){if(!items.length)return toast('No hay servicios para actualizar');const {error}=await supabaseClient.from('services').update({active}).eq('business_id',biz.id);if(error)return toast(error.message);toast(active?'Servicios activados':'Servicios ocultos');await loadServices()}
async function bulkUseBusinessHours(){if(!items.length)return toast('No hay servicios');try{for(const s of items){await supabaseClient.from('service_commercial_settings').upsert({service_id:s.id,business_id:biz.id,schedule_mode:'business',updated_at:new Date().toISOString()},{onConflict:'service_id'})}toast('Todos los servicios usarán el horario general')}catch(e){toast('No se pudo aplicar: '+e.message)}}


function renderPresets() {
  const grid = $('preset-images');
  grid.replaceChildren();
  PRESET_IMAGES.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'svc-image-preset';
    btn.title = p.label;
    const img = document.createElement('img');
    img.src = p.url;
    img.alt = `Imagen predeterminada: ${p.label}`;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      selectedPresetImage = p.url;
      $('preset-image-url').value = p.url;
      grid.querySelectorAll('.svc-image-preset').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      updateSummary();
    });
    grid.appendChild(btn);
  });
}

function renderHours(hours = {}) {
  const root = $('weekly-hours');
  root.replaceChildren();

  DAYS.forEach(([key,label]) => {
    const row = document.createElement('div');
    row.className = 'svc-hour-row';
    row.dataset.day = key;

    const day = document.createElement('div');
    day.className = 'svc-hour-day';
    day.innerHTML = '<i></i>';
    const dayText = document.createElement('span');
    dayText.textContent = label;
    day.appendChild(dayText);

    const open = document.createElement('input');
    open.type = 'time';
    open.className = 'hour-open';

    const close = document.createElement('input');
    close.type = 'time';
    close.className = 'hour-close';

    const status = document.createElement('label');
    status.className = 'svc-hour-status';
    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.className = 'hour-enabled';
    const statusText = document.createElement('span');
    status.append(enabled,statusText);

    const v = hours?.[key];
    const active = Boolean(v && !v.closed && v.open && v.close);
    enabled.checked = active;
    open.value = active ? String(v.open).slice(0,5) : '09:00';
    close.value = active ? String(v.close).slice(0,5) : '18:00';

    function sync() {
      open.disabled = !enabled.checked;
      close.disabled = !enabled.checked;
      statusText.textContent = enabled.checked ? 'Abierto' : 'Cerrado';
    }
    enabled.addEventListener('change', sync);
    sync();

    row.append(day,open,close,status);
    root.appendChild(row);
  });
}

function collectHours() {
  const obj = {};
  document.querySelectorAll('.svc-hour-row').forEach(row => {
    const key = row.dataset.day;
    const enabled = row.querySelector('.hour-enabled').checked;
    const open = row.querySelector('.hour-open').value;
    const close = row.querySelector('.hour-close').value;
    if (enabled) {
      if (!open || !close || open >= close) throw new Error(`Revisa el horario de ${key}`);
      obj[key] = {open, close};
    } else {
      obj[key] = null;
    }
  });
  return obj;
}

function applyTemplate(name) {
  document.querySelectorAll('.svc-template').forEach(b => b.classList.toggle('active', b.dataset.template === name));
  if (name === 'custom') return;
  renderHours(HOUR_TEMPLATES[name]);
}

async function saveHours() {
  try {
    const opening_hours = collectHours();
    const {data,error} = await supabaseClient
      .from('businesses')
      .update({opening_hours})
      .eq('id',biz.id)
      .select('opening_hours')
      .single();
    if (error) throw error;
    biz.opening_hours = data.opening_hours;
    toast('Horarios guardados');
  } catch (e) {
    toast(e.message);
  }
}

async function upload(file) {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error('La imagen supera 5 MB');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${biz.id}/service-${Date.now()}.${ext}`;
  const {error} = await supabaseClient.storage
    .from('business-public-media')
    .upload(path,file,{upsert:false});
  if (error) throw error;
  return supabaseClient.storage.from('business-public-media').getPublicUrl(path).data.publicUrl;
}

function updateSummary() {
  const name = $('sname').value.trim() || 'Nuevo servicio';
  const cat = $('category').value.trim() || 'Servicios';
  const duration = Number($('duration').value) || 0;
  const price = Number($('price').value) || 0;
  const dep = Number($('deposit').value) || 0;

  $('name-count').textContent = String($('sname').value.length);
  $('desc-count').textContent = String($('sdesc').value.length);
  $('sum-name').textContent = name;
  $('sum-category').textContent = cat;
  $('sum-duration').textContent = duration ? `${duration} min` : '—';
  $('sum-price').textContent = money(price);
  $('sum-deposit').textContent = money(dep);
  $('sum-active').textContent = $('active').checked ? 'Activo' : 'Oculto';
  $('sum-active').className = $('active').checked ? 'svc-ok' : '';
  $('sum-detail').textContent = `${duration ? duration+' min · ' : ''}${money(price)}`;

  calculateServiceIntelligence();
  const image = selectedPresetImage || $('preset-image-url').value;
  const box = $('sum-image');
  box.replaceChildren();
  if (image) {
    const img = document.createElement('img');
    img.src = image;
    img.alt = '';
    box.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = '▣';
    box.appendChild(span);
  }
}

function clearForm() {
  $('sid').value = '';
  $('sname').value = '';
  $('category').value = 'Servicios';
  $('price').value = '';
  $('duration').value = '';
  $('buffer').value = '0';
  $('deposit').value = '0';
  $('sdesc').value = '';
  ['internal-cost','tax-rate','prep-minutes','recovery-minutes'].forEach(id=>{if($(id))$(id).value='0'});if($('expected-utilization'))$('expected-utilization').value='70';if($('min-booking-hours'))$('min-booking-hours').value='2';if($('max-booking-days'))$('max-booking-days').value='60';if($('service-tags'))$('service-tags').value='';if($('cancellation-policy'))$('cancellation-policy').value='';if($('refund-policy'))$('refund-policy').value='';const businessRadio=document.querySelector('input[name="schedule-mode"][value="business"]');if(businessRadio)businessRadio.checked=true;syncScheduleMode();
  $('simage').value = '';
  $('active').checked = true;
  $('featured').checked = false;
  selectedPresetImage = '';
  $('preset-image-url').value = '';
  document.querySelectorAll('.svc-image-preset').forEach(x => x.classList.remove('active'));
  selectedStaffIds.clear();
  loadStaff();
  updateSummary();
}

function catalogCard(service) {
  const card = document.createElement('article');
  card.className = 'svc-catalog-card';

  const thumb = document.createElement('div');
  thumb.className = 'svc-catalog-thumb';
  if (service.image_url) {
    const img = document.createElement('img');
    img.src = service.image_url;
    img.alt = '';
    thumb.appendChild(img);
  } else {
    thumb.textContent = '▣';
  }

  const body = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = service.name || 'Servicio';
  const meta = document.createElement('p');
  meta.textContent = `${money(service.price)} · ${service.duration_minutes || 0} min`;
  const small = document.createElement('small');
  small.textContent = `${service.category || 'Servicios'} · ${service.active ? 'Activo' : 'Oculto'}`;

  const actions = document.createElement('div');
  actions.className = 'svc-catalog-actions';

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.textContent = 'Editar';
  edit.addEventListener('click', () => editService(service.id));

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = service.active ? 'Ocultar' : 'Activar';
  toggle.addEventListener('click', () => toggleService(service.id,!service.active));

  actions.append(edit,toggle);
  body.append(title,meta,small,actions);
  card.append(thumb,body);
  return card;
}


async function loadStaff() {
  const {data,error} = await supabaseClient
    .from('staff')
    .select('id,name,active')
    .eq('business_id',biz.id)
    .eq('active',true)
    .order('name');

  const root = $('service-staff-list');
  root.replaceChildren();

  if (error) {
    const e = document.createElement('div');
    e.className='svc-empty';
    e.textContent='No se pudo cargar el personal.';
    root.appendChild(e);
    return;
  }

  staffItems = data || [];
  if (!staffItems.length) {
    const e = document.createElement('div');
    e.className='svc-empty';
    e.textContent='Aún no tienes personal activo. Puedes guardar el servicio y asignarlo después.';
    root.appendChild(e);
    return;
  }

  staffItems.forEach(s => {
    const label = document.createElement('label');
    label.className='svc-staff-option';
    const input = document.createElement('input');
    input.type='checkbox';
    input.checked=selectedStaffIds.has(s.id);
    input.addEventListener('change',()=>{
      if(input.checked) selectedStaffIds.add(s.id);
      else selectedStaffIds.delete(s.id);
    });
    const info=document.createElement('div');
    const b=document.createElement('b'); b.textContent=s.name;
    const small=document.createElement('small'); small.textContent='Puede realizar este servicio';
    info.append(b,small);
    label.append(input,info);
    root.appendChild(label);
  });
}

async function loadServiceStaff(serviceId) {
  selectedStaffIds.clear();
  if (!serviceId) {
    await loadStaff();
    return;
  }
  const {data,error}=await supabaseClient
    .from('service_staff')
    .select('staff_id')
    .eq('service_id',serviceId)
    .eq('business_id',biz.id);
  if(!error) (data||[]).forEach(r=>selectedStaffIds.add(r.staff_id));
  await loadStaff();
}

async function saveServiceStaff(serviceId) {
  const {error:delError}=await supabaseClient
    .from('service_staff')
    .delete()
    .eq('service_id',serviceId)
    .eq('business_id',biz.id);
  if(delError) throw delError;

  if(!selectedStaffIds.size) return;

  const rows=[...selectedStaffIds].map(staff_id=>({
    service_id:serviceId,
    staff_id,
    business_id:biz.id
  }));
  const {error}=await supabaseClient.from('service_staff').insert(rows);
  if(error) throw error;
}

async function loadServices() {
  const {data,error} = await supabaseClient
    .from('services')
    .select('*')
    .eq('business_id',biz.id)
    .order('created_at',{ascending:false});
  if (error) return toast(error.message);

  items = data || [];
  const root = $('service-list');
  root.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'svc-empty';
    empty.textContent = 'Aún no has agregado servicios.';
    root.appendChild(empty);
    return;
  }
  items.forEach(s => root.appendChild(catalogCard(s)));
}

function editService(id) {
  const s = items.find(x => x.id === id);
  if (!s) return;
  $('sid').value = s.id;
  $('sname').value = s.name || '';
  $('category').value = s.category || 'Servicios';
  $('price').value = s.price ?? '';
  $('duration').value = s.duration_minutes ?? '';
  $('buffer').value = s.buffer_minutes || 0;
  $('deposit').value = s.deposit_amount || 0;
  $('sdesc').value = s.description || '';
  $('active').checked = Boolean(s.active);
  $('featured').checked = Boolean(s.featured);
  selectedPresetImage = s.image_url || '';
  $('preset-image-url').value = s.image_url || '';
  updateSummary();
  loadServiceStaff(s.id);
  loadCommercialSettings(s.id);
  loadServiceHistory(s.id);
  window.scrollTo({top:0,behavior:'smooth'});
}

async function toggleService(id, active) {
  const {error} = await supabaseClient.from('services').update({active}).eq('id',id);
  if (error) return toast(error.message);
  await loadServices();
}

async function duplicateService() {
  const id = $('sid').value;
  if (!id) return toast('Selecciona primero un servicio para duplicar');
  const s = items.find(x => x.id === id);
  if (!s) return;
  const payload = {
    business_id: biz.id,
    name: `${s.name} (copia)`,
    category:s.category,
    price:s.price,
    duration_minutes:s.duration_minutes,
    buffer_minutes:s.buffer_minutes || 0,
    deposit_amount:s.deposit_amount || 0,
    description:s.description,
    active:false,
    featured:false,
    image_url:s.image_url
  };
  const {error} = await supabaseClient.from('services').insert(payload);
  if (error) return toast(error.message);
  toast('Servicio duplicado como oculto');
  await loadServices();
}

async function saveService() {
  try {
    const name = $('sname').value.trim();
    const price = Number($('price').value);
    const duration = Number($('duration').value);
    if (!name) throw new Error('Escribe el nombre del servicio');
    if (!Number.isFinite(price) || price < 0) throw new Error('Revisa el precio');
    if (!duration || duration < 5) throw new Error('La duración debe ser de al menos 5 minutos');

    const fileUrl = await upload($('simage').files[0]);
    const imageUrl = fileUrl || selectedPresetImage || $('preset-image-url').value || null;

    const payload = {
      business_id:biz.id,
      name,
      category:$('category').value.trim() || 'Servicios',
      price,
      duration_minutes:duration,
      buffer_minutes:Number($('buffer').value) || 0,
      deposit_amount:Number($('deposit').value) || 0,
      description:$('sdesc').value.trim() || null,
      active:$('active').checked,
      featured:$('featured').checked,
      image_url:imageUrl
    };

    const id = $('sid').value;
    const query = id
      ? supabaseClient.from('services').update(payload).eq('id',id).select('id').single()
      : supabaseClient.from('services').insert(payload).select('id').single();

    const {data:saved,error} = await query;
    if (error) throw error;
    if (!saved?.id) throw new Error('No se pudo confirmar el guardado del servicio');

    await saveServiceStaff(saved.id);
    await saveCommercialSettings(saved.id);
    await saveServiceVersion(saved.id,payload);
    clearLocalDraft();

    toast('Servicio guardado');
    clearForm();
    await loadServices();
  } catch (e) {
    toast(e.message);
  }
}

async function loadBlocks() {
  const {data,error} = await supabaseClient
    .from('blocked_times')
    .select('id,date,start_time,end_time,reason')
    .eq('business_id',biz.id)
    .order('date',{ascending:true});
  if (error) return toast(error.message);
  blockedItems = data || [];
  renderBlocks();
}

function renderBlocks() {
  const dates = $('blocked-dates');
  const times = $('blocked-times');
  dates.replaceChildren();
  times.replaceChildren();

  const full = blockedItems.filter(x => !x.start_time && !x.end_time);
  const partial = blockedItems.filter(x => x.start_time && x.end_time);

  const render = (root, list, isTime) => {
    if (!list.length) {
      const e = document.createElement('div');
      e.className = 'svc-empty';
      e.textContent = isTime ? 'No hay horarios bloqueados.' : 'No hay fechas bloqueadas.';
      root.appendChild(e);
      return;
    }
    list.slice(0,8).forEach(b => {
      const row = document.createElement('div');
      row.className = 'svc-block-item';
      const txt = document.createElement('div');
      const strong = document.createElement('b');
      strong.textContent = isTime
        ? `${localDateLabel(b.date)} · ${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)}`
        : localDateLabel(b.date);
      const small = document.createElement('small');
      small.textContent = b.reason || (isTime ? 'Horario bloqueado' : 'Día completo');
      txt.append(strong,small);

      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = '⌫';
      del.title = 'Eliminar bloqueo';
      del.addEventListener('click', () => deleteBlock(b.id));

      row.append(txt,del);
      root.appendChild(row);
    });
  };

  render(dates,full,false);
  render(times,partial,true);
}

async function addFullDayBlock() {
  const date = $('block-date').value;
  if (!date) return toast('Selecciona una fecha');
  const {error} = await supabaseClient.from('blocked_times').insert({
    business_id:biz.id,
    date,
    start_time:null,
    end_time:null,
    reason:$('block-date-reason').value.trim() || null
  });
  if (error) return toast(error.message);
  $('block-date-reason').value = '';
  toast('Fecha bloqueada');
  await loadBlocks();
}

async function addTimeBlock() {
  const date = $('block-time-date').value;
  const start = $('block-start').value;
  const end = $('block-end').value;
  if (!date || !start || !end) return toast('Completa fecha y horario');
  if (start >= end) return toast('La hora final debe ser posterior a la inicial');
  const {error} = await supabaseClient.from('blocked_times').insert({
    business_id:biz.id,
    date,
    start_time:start,
    end_time:end,
    reason:$('block-time-reason').value.trim() || null
  });
  if (error) return toast(error.message);
  $('block-time-reason').value = '';
  toast('Horario bloqueado');
  await loadBlocks();
}

async function deleteBlock(id) {
  const {error} = await supabaseClient.from('blocked_times').delete().eq('id',id);
  if (error) return toast(error.message);
  await loadBlocks();
}

function previewClient() {
  const url = buildPublicBookingUrl(biz);
  if (!url) return toast('Primero configura el enlace público de tu negocio');
  window.open(url,'_blank','noopener,noreferrer');
}

function bindUI() {
  ['sname','category','price','duration','deposit','buffer','sdesc','internal-cost','tax-rate','expected-utilization','prep-minutes','recovery-minutes','min-booking-hours','max-booking-days','service-tags','cancellation-policy','refund-policy'].forEach(id => $(id)?.addEventListener('input',()=>{updateSummary();saveLocalDraft()}));
  $('active').addEventListener('change',updateSummary);
  $('simage').addEventListener('change', () => {
    const file = $('simage').files[0];
    if (!file) return;
    selectedPresetImage = URL.createObjectURL(file);
    updateSummary();
  });

  document.querySelectorAll('.svc-template').forEach(btn => btn.addEventListener('click',() => applyTemplate(btn.dataset.template)));
  $('business-type')?.addEventListener('change',e=>renderServiceTemplates(e.target.value));
  document.querySelectorAll('input[name="schedule-mode"]').forEach(r=>r.addEventListener('change',syncScheduleMode));
  $('copy-monday')?.addEventListener('click',copyMondayToAll);
  $('bulk-activate')?.addEventListener('click',()=>bulkSetActive(true));
  $('bulk-hide')?.addEventListener('click',()=>bulkSetActive(false));
  $('bulk-copy-hours')?.addEventListener('click',bulkUseBusinessHours);
  $('save-hours').addEventListener('click',saveHours);
  $('save-service').addEventListener('click',saveService);
  $('duplicate-service').addEventListener('click',duplicateService);
  $('preview-client').addEventListener('click',previewClient);
  $('add-block-date').addEventListener('click',addFullDayBlock);
  $('add-block-time').addEventListener('click',addTimeBlock);

  const menu = $('svc-mobile-menu');
  if (menu) menu.addEventListener('click',() => $('svc-sidebar').classList.toggle('open'));

  const moreBtn=$('svc-more-btn');
  const moreMenu=$('svc-more-menu');
  if(moreBtn && moreMenu){
    moreBtn.addEventListener('click',()=>{
      const opening=moreMenu.classList.contains('hidden');
      moreMenu.classList.toggle('hidden');
      moreBtn.setAttribute('aria-expanded',String(opening));
    });
    document.addEventListener('click',(ev)=>{
      if(!moreBtn.contains(ev.target) && !moreMenu.contains(ev.target)){
        moreMenu.classList.add('hidden');
        moreBtn.setAttribute('aria-expanded','false');
      }
    });
  }
}

async function init() {
  const session = await requireAuth();
  if (!session) return;
  biz = await getMyBusiness(session.user);
  if (!biz) return;

  const category=biz.business_category_id||'barber';if($('business-type'))$('business-type').value=SERVICE_TEMPLATE_LIBRARY[category]?category:'barber';renderServiceTemplates($('business-type')?.value||'barber');
  renderPresets();
  renderHours(biz.opening_hours || HOUR_TEMPLATES.office);
  bindUI();
  updateSummary();

  const sub = biz.subscription;
  if (sub) {
    $('svc-plan-skeleton')?.remove();
    $('svc-plan-name').classList.remove('hidden');
    $('svc-plan-date').classList.remove('hidden');
    $('svc-plan-name').textContent = sub.plan_id || sub.plan || 'Plan activo';
    $('svc-plan-date').textContent = sub.current_period_end
      ? `Vigente hasta ${localDateLabel(sub.current_period_end)}`
      : 'Suscripción activa';
  }

  const today = new Date();
  const iso = today.toISOString().slice(0,10);
  $('block-date').min = iso;
  $('block-time-date').min = iso;

  await Promise.all([loadServices(),loadBlocks(),loadStaff()]);
  restoreLocalDraft();calculateServiceIntelligence();syncScheduleMode();
  window.lucide?.createIcons();
}
document.addEventListener('DOMContentLoaded',init);

// Unified Services workspace contracts
function renderServiceCatalog(services){ if(typeof renderCatalog==='function') return renderCatalog(services); return services||[]; }
function openServiceEditor(service){ if(typeof edit==='function') return edit(service?.id||service); return service; }
async function saveServiceEditor(){ if(typeof saveService==='function') return saveService(); if(typeof save==='function') return save(); return null; }

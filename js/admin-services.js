
let biz = null;
let items = [];
let blockedItems = [];
let selectedPresetImage = '';
let staffItems = [];
let selectedStaffIds = new Set();
const $ = id => document.getElementById(id);

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
  ['sname','category','price','duration','deposit','buffer','sdesc'].forEach(id => $(id).addEventListener('input',updateSummary));
  $('active').addEventListener('change',updateSummary);
  $('simage').addEventListener('change', () => {
    const file = $('simage').files[0];
    if (!file) return;
    selectedPresetImage = URL.createObjectURL(file);
    updateSummary();
  });

  document.querySelectorAll('.svc-template').forEach(btn => btn.addEventListener('click',() => applyTemplate(btn.dataset.template)));
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
  window.lucide?.createIcons();
}
document.addEventListener('DOMContentLoaded',init);

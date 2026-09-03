let onboardingBiz=null;
let onboardingCategory=null;
let onboardingCategories=[];
let onboardingTemplates=[];
let onboardingExistingServices=[];
let onboardingStaff=[];
let onboardingTeamMode='solo';
let selectedTemplateIds=new Set();
let onboardingHours={};

const ob=id=>document.getElementById(id);
const DAY_KEYS=['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABELS={mon:'Lunes',tue:'Martes',wed:'Miércoles',thu:'Jueves',fri:'Viernes',sat:'Sábado',sun:'Domingo'};

const fallbackCategories=[
  ['barber','Barbería','✂','Cortes, barba y grooming'],
  ['beauty','Salón / Estética','✦','Cabello, maquillaje y cuidado'],
  ['nails','Uñas','✧','Manicure, gel y pedicure'],
  ['spa','Spa / Masajes','◉','Bienestar y faciales'],
  ['dental','Dentista','◇','Consultas y tratamientos'],
  ['therapy','Psicología / Terapia','♡','Sesiones y seguimiento'],
  ['consulting','Consultoría','▣','Servicios profesionales'],
  ['other','Otro','+','Configura tu propio catálogo']
];

function obToast(text,type='info'){
  const el=ob('toast');
  if(!el)return alert(text);
  el.textContent=text;
  el.dataset.type=type;
  el.classList.remove('hidden');
  clearTimeout(window.__obToast);
  window.__obToast=setTimeout(()=>el.classList.add('hidden'),2800);
}

function normalizeName(value){
  return String(value||'').trim().toLocaleLowerCase('es-MX');
}

function hasOpeningHours(hours){
  return DAY_KEYS.some(key=>{
    const h=hours?.[key];
    return h && !h.closed && h.open && h.close;
  });
}

function defaultHours(){
  const result={};
  DAY_KEYS.forEach(key=>result[key]={open:'09:00',close:'18:00',closed:key==='sun'});
  return result;
}

function normalizeHours(hours){
  const source=hours && typeof hours==='object' ? hours : {};
  const result={};
  DAY_KEYS.forEach(key=>{
    const value=source[key]||{};
    result[key]={
      open:value.open||'09:00',
      close:value.close||'18:00',
      closed:value.closed===true || (!value.open && !value.close)
    };
  });
  return result;
}

function showStep(step){
  const ids=['step-business','step-hours','step-services','step-team','onboarding-success'];
  ids.forEach(id=>ob(id)?.classList.add('hidden'));

  const map={1:'step-business',2:'step-hours',3:'step-services',4:'step-team',5:'onboarding-success'};
  ob(map[step])?.classList.remove('hidden');

  const pct=step>=5?100:step*25;
  if(ob('onboarding-progress'))ob('onboarding-progress').style.width=`${pct}%`;

  document.querySelectorAll('[data-step-jump]').forEach(btn=>{
    const n=Number(btn.dataset.stepJump);
    btn.classList.toggle('active',n===step);
    btn.classList.toggle('done',n<step);
  });
  window.scrollTo({top:0,behavior:'smooth'});
}

async function loadCategories(){
  const {data,error}=await supabaseClient
    .from('business_categories')
    .select('id,name,icon,description')
    .eq('active',true)
    .order('sort_order');

  onboardingCategories=!error&&data?.length
    ? data
    : fallbackCategories.map(([id,name,icon,description])=>({id,name,icon,description}));

  renderCategories();
}

function renderCategories(){
  const root=ob('onboarding-categories');
  root.replaceChildren(...onboardingCategories.map(category=>{
    const button=document.createElement('button');
    button.className='category-choice';
    button.type='button';
    button.disabled=Boolean(onboardingBiz?.business_category_locked && onboardingBiz?.business_category_id!==category.id);
    if(category.id===onboardingCategory)button.classList.add('selected');

    const icon=document.createElement('i');
    icon.textContent=category.icon||'+';
    const name=document.createElement('b');
    name.textContent=category.name;
    const desc=document.createElement('small');
    desc.textContent=category.description||'';
    button.append(icon,name,desc);

    button.onclick=()=>{
      if(onboardingBiz?.business_category_locked && onboardingBiz?.business_category_id)return;
      onboardingCategory=category.id;
      renderCategories();
      renderCategoryConfirmation();
    };
    return button;
  }));
  renderCategoryConfirmation();
}

function renderCategoryConfirmation(){
  const box=ob('category-confirm-box');
  const category=onboardingCategories.find(x=>x.id===onboardingCategory);
  if(!category){
    box.classList.add('hidden');
    return;
  }
  ob('category-confirm-name').textContent=category.name+(onboardingBiz?.business_category_locked?' · Giro confirmado':'');
  box.classList.remove('hidden');
}

async function saveBusinessStep(){
  const name=ob('business-name').value.trim();
  const phone=ob('business-phone').value.trim()||null;
  const address=ob('business-address').value.trim()||null;
  if(!name)return obToast('Escribe el nombre de tu negocio.','error');
  if(!onboardingCategory)return obToast('Selecciona el tipo de negocio.','error');

  const payload={name,phone,address};
  if(!onboardingBiz.business_category_locked){
    payload.business_category_id=onboardingCategory;
    payload.business_category_locked=true;
  }

  const {data,error}=await supabaseClient
    .from('businesses')
    .update(payload)
    .eq('id',onboardingBiz.id)
    .select('*')
    .single();

  if(error)return obToast('No se pudo guardar el negocio: '+error.message,'error');
  onboardingBiz={...onboardingBiz,...data};
  onboardingCategory=onboardingBiz.business_category_id||onboardingCategory;
  await loadTemplates(onboardingCategory);
  showStep(2);
}

function applyHoursPreset(mode){
  const hours={};
  DAY_KEYS.forEach(key=>{
    let closed=false;
    if(mode==='weekdays')closed=['sat','sun'].includes(key);
    if(mode==='sixdays')closed=key==='sun';
    hours[key]={open:'09:00',close:'18:00',closed};
  });
  onboardingHours=hours;
  renderHoursEditor();
}

function renderHoursEditor(){
  const root=ob('hours-editor');
  root.replaceChildren(...DAY_KEYS.map(key=>{
    const hours=onboardingHours[key]||{open:'09:00',close:'18:00',closed:false};
    const row=document.createElement('div');
    row.className='hours-row';
    row.dataset.day=key;

    const day=document.createElement('strong');
    day.textContent=DAY_LABELS[key];

    const open=document.createElement('input');
    open.type='time';
    open.value=hours.open||'09:00';
    open.dataset.open='1';
    open.disabled=hours.closed===true;

    const close=document.createElement('input');
    close.type='time';
    close.value=hours.close||'18:00';
    close.dataset.close='1';
    close.disabled=hours.closed===true;

    const closedLabel=document.createElement('label');
    closedLabel.className='hours-closed';
    const checkbox=document.createElement('input');
    checkbox.type='checkbox';
    checkbox.checked=hours.closed===true;
    checkbox.dataset.closed='1';
    const closedText=document.createElement('span');
    closedText.textContent='Cerrado';
    closedLabel.append(checkbox,closedText);

    checkbox.onchange=()=>{
      open.disabled=checkbox.checked;
      close.disabled=checkbox.checked;
    };
    row.append(day,open,document.createTextNode('a'),close,closedLabel);
    return row;
  }));
}

function readHoursEditor(){
  const result={};
  document.querySelectorAll('.hours-row').forEach(row=>{
    const key=row.dataset.day;
    const closed=row.querySelector('[data-closed]').checked;
    const open=row.querySelector('[data-open]').value;
    const close=row.querySelector('[data-close]').value;
    if(!closed && (!open||!close))throw new Error(`Completa el horario de ${DAY_LABELS[key]}.`);
    if(!closed && open>=close)throw new Error(`La hora de cierre debe ser posterior a la apertura en ${DAY_LABELS[key]}.`);
    result[key]={open,close,closed};
  });
  return result;
}

async function syncPrimaryBranchHours(hours){
  const {data:branch,error:branchError}=await supabaseClient
    .from('business_branches')
    .select('id')
    .eq('business_id',onboardingBiz.id)
    .eq('is_primary',true)
    .maybeSingle();

  if(branchError){
    console.warn('[Onboarding] No se pudo consultar sucursal principal:',branchError);
    return;
  }
  if(!branch?.id)return;

  const {error}=await supabaseClient
    .from('business_branches')
    .update({opening_hours:hours,updated_at:new Date().toISOString()})
    .eq('id',branch.id)
    .eq('business_id',onboardingBiz.id);

  if(error)console.warn('[Onboarding] Horario guardado en negocio, pero no sincronizado en sucursal:',error);
}

async function saveHoursStep(){
  let hours;
  try{hours=readHoursEditor()}catch(error){return obToast(error.message,'error')}

  const {data,error}=await supabaseClient
    .from('businesses')
    .update({opening_hours:hours})
    .eq('id',onboardingBiz.id)
    .select('*')
    .single();

  if(error)return obToast('No se pudo guardar el horario: '+error.message,'error');

  onboardingHours=hours;
  onboardingBiz={...onboardingBiz,...data};
  await syncPrimaryBranchHours(hours);
  await loadTemplates(onboardingCategory);
  renderTemplates();
  renderPrices();
  showStep(3);
}

async function loadExistingServices(){
  const {data,error}=await supabaseClient
    .from('services')
    .select('*')
    .eq('business_id',onboardingBiz.id)
    .order('name');

  onboardingExistingServices=error?[]:(data||[]);
}

async function loadTemplates(category){
  if(!category){
    onboardingTemplates=[];
    return;
  }

  const {data,error}=await supabaseClient
    .from('service_templates')
    .select('*')
    .eq('business_category_id',category)
    .eq('active',true)
    .order('sort_order');

  onboardingTemplates=error?[]:(data||[]);
  if(!onboardingTemplates.length){
    onboardingTemplates=[{
      id:'custom',
      name:'Servicio personalizado',
      category:'Servicios',
      description:'Configura tu primer servicio.',
      duration_minutes:60,
      image_url:'../assets/service-presets/consulting.svg'
    }];
  }

  const existingNames=new Set(onboardingExistingServices.map(s=>normalizeName(s.name)));
  const preselected=onboardingTemplates.filter(t=>existingNames.has(normalizeName(t.name))).map(t=>t.id);
  selectedTemplateIds=new Set(preselected.length
    ? preselected
    : onboardingTemplates.slice(0,Math.min(4,onboardingTemplates.length)).map(x=>x.id));
}

function renderTemplates(){
  const root=ob('onboarding-services');
  root.replaceChildren(...onboardingTemplates.map(template=>{
    const article=document.createElement('article');
    article.className='service-choice '+(selectedTemplateIds.has(template.id)?'selected':'');
    article.dataset.template=template.id;

    const img=document.createElement('img');
    img.src=template.image_url?.startsWith('/app/')
      ? new URL(template.image_url,location.origin).href
      : (template.image_url||'../assets/service-presets/consulting.svg');

    const body=document.createElement('div');
    body.className='body';
    const name=document.createElement('b');
    name.textContent=template.name;
    const duration=document.createElement('small');
    duration.textContent=`${template.duration_minutes||60} min`;
    body.append(name,duration);

    const check=document.createElement('div');
    check.className='check';
    check.textContent='✓';
    article.append(img,body,check);

    article.onclick=()=>{
      selectedTemplateIds.has(template.id)
        ? selectedTemplateIds.delete(template.id)
        : selectedTemplateIds.add(template.id);
      renderTemplates();
      renderPrices();
    };
    return article;
  }));
}

function renderPrices(){
  const root=ob('onboarding-prices');
  const selected=onboardingTemplates.filter(t=>selectedTemplateIds.has(t.id));
  root.replaceChildren(...selected.map(template=>{
    const existing=onboardingExistingServices.find(s=>normalizeName(s.name)===normalizeName(template.name));
    const row=document.createElement('div');
    row.className='price-row';
    row.dataset.template=template.id;

    const copy=document.createElement('div');
    const name=document.createElement('b');
    name.textContent=template.name;
    const desc=document.createElement('small');
    desc.textContent=existing?'Ya existe: se actualizará sin duplicarlo.':(template.description||'');
    copy.append(name,desc);

    const price=document.createElement('input');
    price.type='number';
    price.min='0';
    price.step='0.01';
    price.placeholder='$ MXN';
    price.value=existing?.price ?? template.suggested_price ?? '';
    price.dataset.price='1';

    const duration=document.createElement('span');
    duration.textContent=`${template.duration_minutes||60} min`;

    row.append(copy,price,duration);
    return row;
  }));
}

async function saveServicesStep(){
  const rows=[...document.querySelectorAll('.price-row')];
  if(!rows.length)return obToast('Selecciona al menos un servicio.','error');

  const savedServices=[];
  for(const row of rows){
    const template=onboardingTemplates.find(x=>String(x.id)===row.dataset.template);
    if(!template)continue;
    const price=Number(row.querySelector('[data-price]').value);
    if(!Number.isFinite(price)||price<0)return obToast(`Define el precio de ${template.name}.`,'error');

    const existing=onboardingExistingServices.find(s=>normalizeName(s.name)===normalizeName(template.name));
    const payload={
      business_id:onboardingBiz.id,
      name:template.name,
      category:template.category||'Servicios',
      description:template.description||null,
      duration_minutes:template.duration_minutes||60,
      price,
      active:true,
      image_url:template.image_url?.startsWith('/app/')
        ? new URL(template.image_url,location.origin).href
        : template.image_url
    };

    let result;
    if(existing){
      result=await supabaseClient
        .from('services')
        .update(payload)
        .eq('id',existing.id)
        .eq('business_id',onboardingBiz.id)
        .select()
        .single();
    }else{
      result=await supabaseClient
        .from('services')
        .insert({...payload,featured:false})
        .select()
        .single();
    }

    if(result.error)return obToast(`No se pudo guardar ${template.name}: ${result.error.message}`,'error');
    savedServices.push(result.data);
  }

  await loadExistingServices();
  renderTeamServiceOptions();
  showStep(4);
}

function setTeamMode(mode){
  onboardingTeamMode=mode;
  document.querySelectorAll('[data-team-mode]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.teamMode===mode));
  ob('onboarding-team-form').classList.toggle('hidden',mode!=='add');
}

function renderTeamServiceOptions(){
  const root=ob('team-service-options');
  root.replaceChildren(...onboardingExistingServices.filter(s=>s.active!==false).map(service=>{
    const label=document.createElement('label');
    const input=document.createElement('input');
    input.type='checkbox';
    input.value=service.id;
    input.checked=true;
    const span=document.createElement('span');
    span.textContent=service.name;
    label.append(input,span);
    return label;
  }));
}

async function loadStaff(){
  const {data,error}=await supabaseClient
    .from('staff')
    .select('*')
    .eq('business_id',onboardingBiz.id)
    .order('name');
  onboardingStaff=error?[]:(data||[]);
}

async function saveOptionalTeam(){
  if(onboardingTeamMode!=='add')return true;

  const name=ob('team-name').value.trim();
  if(!name){
    obToast('Escribe el nombre del profesional.','error');
    return false;
  }

  const selectedServiceIds=[...ob('team-service-options').querySelectorAll('input:checked')].map(x=>x.value);
  let member=onboardingStaff.find(s=>normalizeName(s.name)===normalizeName(name));

  if(member){
    const {data,error}=await supabaseClient
      .from('staff')
      .update({name,active:true,role:member.role||'PROFESSIONAL',updated_at:new Date().toISOString()})
      .eq('id',member.id)
      .eq('business_id',onboardingBiz.id)
      .select()
      .single();
    if(error){obToast('No se pudo actualizar el profesional: '+error.message,'error');return false}
    member=data;
  }else{
    const {data,error}=await supabaseClient
      .from('staff')
      .insert({
        business_id:onboardingBiz.id,
        name,
        active:true,
        role:'PROFESSIONAL',
        updated_at:new Date().toISOString()
      })
      .select()
      .single();
    if(error){obToast('No se pudo agregar el profesional: '+error.message,'error');return false}
    member=data;
  }

  const del=await supabaseClient
    .from('service_staff')
    .delete()
    .eq('staff_id',member.id)
    .eq('business_id',onboardingBiz.id);
  if(del.error){obToast('No se pudieron actualizar sus servicios: '+del.error.message,'error');return false}

  if(selectedServiceIds.length){
    const {error}=await supabaseClient
      .from('service_staff')
      .insert(selectedServiceIds.map(service_id=>({
        business_id:onboardingBiz.id,
        staff_id:member.id,
        service_id
      })));
    if(error){obToast('No se pudieron asignar los servicios: '+error.message,'error');return false}
  }

  await loadStaff();
  return true;
}

function configureSuccess(){
  const url=buildPublicBookingUrl(onboardingBiz);
  ob('public-url-display').textContent=url||'Configura un enlace público en Mi negocio.';
  ob('copy-public-link').disabled=!url;
  ob('view-public-page').href=url||'#';

  const share=ob('share-whatsapp');
  if(url){
    const text=encodeURIComponent(`Reserva tu cita conmigo aquí: ${url}`);
    share.href=`https://wa.me/?text=${text}`;
  }else{
    share.href='#';
    share.setAttribute('aria-disabled','true');
  }

  ob('copy-public-link').onclick=async()=>{
    if(!url)return;
    try{
      await navigator.clipboard.writeText(url);
      obToast('Enlace copiado.','success');
    }catch{
      window.prompt('Copia tu enlace público:',url);
    }
  };
}

async function finishOnboarding(){
  const button=ob('finish-onboarding');
  button.disabled=true;
  button.textContent='Finalizando…';

  try{
    const teamOk=await saveOptionalTeam();
    if(!teamOk)return;

    const {data,error}=await supabaseClient
      .from('businesses')
      .update({setup_completed:true})
      .eq('id',onboardingBiz.id)
      .select('*')
      .single();
    if(error)throw error;

    onboardingBiz={...onboardingBiz,...data};
    configureSuccess();
    showStep(5);
  }catch(error){
    obToast('No se pudo finalizar: '+error.message,'error');
  }finally{
    button.disabled=false;
    button.textContent='Finalizar configuración';
  }
}

function chooseInitialStep(){
  if(onboardingBiz?.setup_completed)return 5;
  if(!onboardingBiz?.business_category_id)return 1;
  if(!hasOpeningHours(onboardingBiz?.opening_hours))return 2;
  if(!onboardingExistingServices.length)return 3;
  return 4;
}

function bindEvents(){
  ob('save-business-next').onclick=saveBusinessStep;
  ob('save-hours-next').onclick=saveHoursStep;
  ob('save-services-next').onclick=saveServicesStep;
  ob('finish-onboarding').onclick=finishOnboarding;

  ob('back-business').onclick=()=>showStep(1);
  ob('back-hours').onclick=()=>showStep(2);
  ob('back-services').onclick=()=>showStep(3);

  document.querySelectorAll('[data-hours-preset]').forEach(btn=>{
    btn.onclick=()=>applyHoursPreset(btn.dataset.hoursPreset);
  });
  document.querySelectorAll('[data-team-mode]').forEach(btn=>{
    btn.onclick=()=>setTeamMode(btn.dataset.teamMode);
  });
  document.querySelectorAll('[data-step-jump]').forEach(btn=>{
    btn.onclick=()=>{
      const target=Number(btn.dataset.stepJump);
      const initial=chooseInitialStep();
      if(target<=Math.max(initial,1))showStep(target);
    };
  });
}

async function initOnboarding(){
  const session=await requireAuth();
  if(!session)return;

  onboardingBiz=await getMyBusiness(session.user);
  if(!onboardingBiz)return;

  onboardingCategory=onboardingBiz.business_category_id||null;
  onboardingHours=normalizeHours(
    hasOpeningHours(onboardingBiz.opening_hours)
      ? onboardingBiz.opening_hours
      : defaultHours()
  );

  ob('business-name').value=onboardingBiz.name||'';
  ob('business-phone').value=onboardingBiz.phone||'';
  ob('business-address').value=onboardingBiz.address||'';

  await Promise.all([loadCategories(),loadExistingServices(),loadStaff()]);
  await loadTemplates(onboardingCategory);

  renderHoursEditor();
  renderTemplates();
  renderPrices();
  renderTeamServiceOptions();
  setTeamMode('solo');
  bindEvents();

  const initial=chooseInitialStep();
  if(initial===5)configureSuccess();
  showStep(initial);
}

document.addEventListener('DOMContentLoaded',initOnboarding);

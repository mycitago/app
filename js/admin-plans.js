let biz = null;
let currentEntitlements = null;

const $ = id => document.getElementById(id);

const FEATURE_MAP = {
  reports: 'Reportes e ingresos',
  internal_reviews: 'Reseñas internas',
  growth_links: 'Enlaces de crecimiento',
  advanced_audit: 'Auditoría avanzada',
  priority_support: 'Soporte prioritario',
  dedicated_onboarding: 'Onboarding dedicado',
  google_reviews: 'Integración con Google Business'
};

function humanizeKey(key){
  return String(key || '')
    .replace(/[_-]+/g,' ')
    .replace(/\b\w/g,c=>c.toUpperCase());
}

function formatMoney(value){
  const n = Number(value);
  if(!Number.isFinite(n)) return null;
  return new Intl.NumberFormat('es-MX',{
    style:'currency',
    currency:'MXN',
    maximumFractionDigits:0
  }).format(n);
}

function getCommercialFeatures(features){
  if(Array.isArray(features)){
    return features
      .map(item=>{
        if(typeof item !== 'string') return null;
        const raw=item.trim();
        const normalized=raw.toLowerCase().replace(/\s+/g,'_');

        if(!raw || normalized.startsWith('trial_days') || normalized.startsWith('trial_days:')) return null;

        const key=Object.keys(FEATURE_MAP).find(k=>normalized===k || normalized.startsWith(`${k}:`));
        return key ? FEATURE_MAP[key] : raw;
      })
      .filter(Boolean);
  }

  if(!features || typeof features !== 'object') return [];

  const items=[];

  if(features.max_staff !== undefined && features.max_staff !== null && features.max_staff !== ''){
    const n=Number(features.max_staff);
    if(Number.isFinite(n)){
      items.push(`Hasta ${n} profesional${n===1?'':'es'}`);
    }
  }

  if(features.max_branches !== undefined && features.max_branches !== null && features.max_branches !== ''){
    const n=Number(features.max_branches);
    if(Number.isFinite(n)){
      items.push(`Hasta ${n} sucursal${n===1?'':'es'}`);
    }
  }

  Object.entries(features).forEach(([key,value])=>{
    if(key==='max_staff' || key==='max_branches' || key==='trial_days') return;
    if(value===false || value===null || value===undefined || value==='') return;
    if(typeof value==='object' && !Array.isArray(value)) return;

    if(value===true){
      items.push(FEATURE_MAP[key] || humanizeKey(key));
      return;
    }

    if(typeof value==='string' && value.trim()){
      const label=FEATURE_MAP[key] || humanizeKey(key);
      items.push(`${label}: ${value.trim()}`);
      return;
    }

    if(typeof value==='number'){
      const label=FEATURE_MAP[key] || humanizeKey(key);
      items.push(`${label}: ${value}`);
    }
  });

  return items;
}

function planCode(plan){
  return plan?.plan_code ?? plan?.code ?? plan?.id ?? '';
}

function currentPlanCode(){
  return currentEntitlements?.plan?.code ?? currentEntitlements?.plan?.plan_code ?? null;
}

function renderCurrentPlanStrip(){
  const strip=$('current-plan-strip');
  const subscription=currentEntitlements?.subscription;
  const plan=currentEntitlements?.plan;

  if(!strip || !subscription || !plan){
    strip?.classList.add('hidden');
    return;
  }

  const status=subscription.status;
  const statusLabel=status==='trial'?'Prueba':status==='active'?'Activo':'Inactivo';
  let copy=`${plan.name || 'Plan actual'}`;

  if(status==='trial'){
    const days=Number(subscription.trial_days_remaining ?? 0);
    copy += ` · ${days===0?'termina hoy':`${days} día${days===1?'':'s'} restante${days===1?'':'s'}`}`;
  }else if(subscription.current_period_end){
    const date=new Date(String(subscription.current_period_end).includes('T')
      ? subscription.current_period_end
      : `${subscription.current_period_end}T12:00:00`);
    if(!Number.isNaN(date.getTime())){
      copy += ` · vigente hasta ${date.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}`;
    }
  }

  $('current-plan-copy').textContent=copy;
  $('current-plan-status').textContent=statusLabel;
  strip.classList.remove('hidden');
}

function annualPriceText(plan){
  const monthly=Number(plan.price_monthly);
  const annual=Number(plan.price_annual);

  if(!Number.isFinite(annual) || annual<=0) return '';
  const annualFormatted=formatMoney(annual);
  if(!Number.isFinite(monthly) || monthly<=0){
    return `${annualFormatted} MXN / año`;
  }

  const annualIfMonthly=monthly*12;
  const savings=annualIfMonthly-annual;

  if(savings<=0){
    return `${annualFormatted} MXN / año`;
  }

  const percent=Math.round((savings/annualIfMonthly)*100);
  return `${annualFormatted} MXN / año · ahorra ${percent}%`;
}

function createPlanCard(plan){
  const article=document.createElement('article');
  const code=String(planCode(plan));
  const isCurrent=Boolean(currentPlanCode() && code && currentPlanCode()===code);
  article.className=`price-card${isCurrent?' current':''}`;

  if(isCurrent){
    const label=document.createElement('span');
    label.className='plan-current-label';
    label.textContent='Plan actual';
    article.appendChild(label);
  }

  const title=document.createElement('h2');
  title.textContent=plan.name || 'Plan';
  article.appendChild(title);

  const price=document.createElement('div');
  price.className='plan-price';
  const monthly=formatMoney(plan.price_monthly);
  const priceValue=document.createElement('b');
  priceValue.textContent=monthly || 'Consultar';
  const period=document.createElement('span');
  period.textContent=monthly ? 'MXN / mes' : 'precio';
  price.append(priceValue,period);
  article.appendChild(price);

  const annual=document.createElement('div');
  annual.className='plan-annual';
  annual.textContent=annualPriceText(plan);
  article.appendChild(annual);

  const list=document.createElement('ul');
  list.className='plan-feature-list';
  const rows=getCommercialFeatures(plan.features);

  if(rows.length){
    rows.forEach(text=>{
      const li=document.createElement('li');
      li.textContent=text;
      list.appendChild(li);
    });
  }else{
    const li=document.createElement('li');
    li.className='plan-feature-empty';
    li.textContent='Características configuradas desde el catálogo.';
    list.appendChild(li);
  }
  article.appendChild(list);

  const footer=document.createElement('div');
  footer.className='plan-card-footer';

  const button=document.createElement('button');
  button.type='button';
  button.className=`btn ${isCurrent?'btn-ghost':'btn-primary'}`;
  button.disabled=true;
  button.textContent=isCurrent ? 'Plan activo' : 'Próximamente';
  button.title=isCurrent
    ? 'Este es el plan vigente del negocio.'
    : 'El cambio de plan todavía no está habilitado.';

  const note=document.createElement('small');
  note.className='plan-card-note';
  note.textContent=isCurrent
    ? 'Este es el plan vigente de tu negocio.'
    : 'No se realizará ningún cargo desde esta pantalla.';

  footer.append(button,note);
  article.appendChild(footer);
  return article;
}

async function loadEntitlements(){
  if(!biz?.id) return null;
  try{
    const {data,error}=await supabaseClient.rpc('get_business_entitlements',{
      p_business_id:biz.id
    });
    if(error) throw error;
    currentEntitlements=data || null;
  }catch(error){
    console.warn('No se pudo cargar el plan actual:',error);
    currentEntitlements=null;
  }
  return currentEntitlements;
}

async function loadPlans(){
  let result=await supabaseClient
    .from('active_plans')
    .select('*')
    .order('sort_order',{ascending:true});

  if(result.error){
    console.warn('active_plans no disponible; usando catálogo activo como respaldo:',result.error);
    result=await supabaseClient
      .from('saas_plans')
      .select('*')
      .eq('active',true)
      .order('sort_order',{ascending:true});
  }

  if(result.error) throw result.error;
  return result.data || [];
}

function renderPlans(plans){
  const container=$('plans');
  container.replaceChildren();

  if(!plans.length){
    const empty=document.createElement('div');
    empty.className='plans-error';
    const strong=document.createElement('strong');
    strong.textContent='No hay planes disponibles';
    const text=document.createTextNode('El catálogo activo está vacío. Contacta a soporte si esperabas ver opciones.');
    empty.append(strong,text);
    container.appendChild(empty);
    return;
  }

  plans.forEach(plan=>container.appendChild(createPlanCard(plan)));
}

async function init(){
  const session=await requireAuth();
  if(!session) return;

  biz=await getMyBusiness(session.user);
  if(!biz) return;

  $('biz-name').textContent=biz.name || 'MyCitaGo';

  try{
    await loadEntitlements();
    renderCurrentPlanStrip();

    const plans=await loadPlans();
    renderPlans(plans);
  }catch(error){
    console.error('Error cargando planes:',error);
    const container=$('plans');
    container.replaceChildren();

    const box=document.createElement('div');
    box.className='plans-error';
    const strong=document.createElement('strong');
    strong.textContent='No pudimos cargar los planes';
    const text=document.createTextNode('Recarga la página. Si el problema continúa, contacta a soporte.');
    box.append(strong,text);
    container.appendChild(box);
  }
}

document.addEventListener('DOMContentLoaded',init);

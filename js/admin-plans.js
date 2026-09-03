let biz = null;
let currentEntitlements = null;

const $ = id => document.getElementById(id);

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

function featureRows(features){
  if(Array.isArray(features)){
    return features
      .map(item=>{
        if(typeof item === 'string') return item.trim();
        if(item && typeof item === 'object'){
          if(typeof item.label === 'string') return item.label.trim();
          if(typeof item.name === 'string') return item.name.trim();
          return Object.entries(item)
            .filter(([,v])=>v!==false && v!==null && v!=='')
            .map(([k,v])=>v===true ? humanizeKey(k) : `${humanizeKey(k)}: ${v}`)
            .join(' · ');
        }
        return '';
      })
      .filter(Boolean);
  }

  if(features && typeof features === 'object'){
    const priority = ['max_staff','max_branches'];
    const entries = Object.entries(features);
    entries.sort(([a],[b])=>{
      const ai=priority.indexOf(a), bi=priority.indexOf(b);
      if(ai!==-1 || bi!==-1){
        if(ai===-1) return 1;
        if(bi===-1) return -1;
        return ai-bi;
      }
      return a.localeCompare(b);
    });

    return entries.flatMap(([key,value])=>{
      if(value===false || value===null || value===undefined || value==='') return [];
      if(key==='max_staff') return [`Hasta ${value} profesional${Number(value)===1?'':'es'}`];
      if(key==='max_branches') return [`Hasta ${value} sucursal${Number(value)===1?'':'es'}`];
      if(value===true) return [humanizeKey(key)];
      if(Array.isArray(value)) return value.length ? [`${humanizeKey(key)}: ${value.join(', ')}`] : [];
      if(typeof value === 'object') return [];
      return [`${humanizeKey(key)}: ${value}`];
    });
  }

  return [];
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

  if(code){
    const codeEl=document.createElement('div');
    codeEl.className='plan-code';
    codeEl.textContent=code;
    article.appendChild(codeEl);
  }

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
  const annualPrice=formatMoney(plan.price_annual);
  annual.textContent=annualPrice ? `${annualPrice} MXN / año` : '';
  article.appendChild(annual);

  const list=document.createElement('ul');
  list.className='plan-feature-list';
  const rows=featureRows(plan.features);

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
  button.textContent=isCurrent ? 'Tu plan actual' : 'Cambio de plan próximamente';
  button.title=isCurrent
    ? 'Este es el plan vigente del negocio.'
    : 'El cambio de plan se habilitará cuando el flujo de cobro y backend quede cerrado.';

  const note=document.createElement('small');
  note.className='plan-card-note';
  note.textContent=isCurrent
    ? 'Consulta tu vigencia desde el dashboard.'
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

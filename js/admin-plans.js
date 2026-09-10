let biz=null;
let currentEntitlements=null;
const $=id=>document.getElementById(id);
const FEATURE_MAP={reports:'Reportes e ingresos',internal_reviews:'Reseñas internas',growth_links:'Enlaces de crecimiento',advanced_audit:'Auditoría avanzada',priority_support:'Soporte prioritario',dedicated_onboarding:'Onboarding dedicado',google_reviews:'Integración con Google Business'};
function humanizeKey(key){return String(key||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function formatMoney(value){const n=Number(value);if(!Number.isFinite(n))return null;return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(n)}
function getCommercialFeatures(features){
  if(Array.isArray(features))return features.map(item=>typeof item==='string'?item.trim():null).filter(Boolean);
  if(!features||typeof features!=='object')return[];
  const items=[];
  if(features.max_staff!=null)items.push(`Hasta ${Number(features.max_staff)} profesionales`);
  if(features.max_branches!=null)items.push(`Hasta ${Number(features.max_branches)} sucursales`);
  Object.entries(features).forEach(([key,value])=>{if(['max_staff','max_branches','trial_days'].includes(key)||!value)return;if(value===true)items.push(FEATURE_MAP[key]||humanizeKey(key));else if(typeof value!=='object')items.push(`${FEATURE_MAP[key]||humanizeKey(key)}: ${value}`)});
  return items;
}
function planCode(plan){return plan?.plan_code??plan?.code??plan?.id??''}
function currentPlanCode(){return currentEntitlements?.plan?.code??currentEntitlements?.plan?.plan_code??currentEntitlements?.plan?.id??null}
function renderCurrentPlanStrip(){
  const strip=$('current-plan-strip'),subscription=currentEntitlements?.subscription,plan=currentEntitlements?.plan;
  if(!strip||!subscription||!plan){strip?.classList.add('hidden');return}
  const status=subscription.status,statusLabel=status==='trial'?'Prueba':status==='active'?'Activo':status||'Inactivo';
  let copy=plan.name||'Plan actual';
  if(status==='trial'){const days=Number(subscription.trial_days_remaining??0);copy+=` · ${days} día${days===1?'':'s'} restante${days===1?'':'s'}`}
  else if(subscription.current_period_end)copy+=` · vigente hasta ${new Date(subscription.current_period_end+'T12:00:00').toLocaleDateString('es-MX')}`;
  $('current-plan-copy').textContent=copy;$('current-plan-status').textContent=statusLabel;strip.classList.remove('hidden');
}
async function startPlanCheckout(plan,button){
  try{
    button.disabled=true;button.textContent='Abriendo pago seguro…';
    const {data,error}=await supabaseClient.functions.invoke('stripe-platform-checkout',{body:{business_id:biz.id,plan_id:String(planCode(plan))}});
    if(error)throw error;if(!data?.ok||!data?.url)throw new Error(data?.error||'Checkout no disponible');
    location.href=data.url;
  }catch(e){console.error('[MyCitaGo Billing]',e);button.disabled=false;button.textContent='Elegir plan';alert('No se pudo abrir el pago: '+(e?.message||'Error'))}
}
function createPlanCard(plan){
  const article=document.createElement('article'),code=String(planCode(plan)),isCurrent=Boolean(currentPlanCode()&&code&&String(currentPlanCode())===code);
  article.className=`price-card${isCurrent?' current':''}`;
  if(isCurrent){const label=document.createElement('span');label.className='plan-current-label';label.textContent='Plan actual';article.appendChild(label)}
  const title=document.createElement('h2');title.textContent=plan.name||'Plan';article.appendChild(title);
  const price=document.createElement('div');price.className='plan-price';const b=document.createElement('b');b.textContent=formatMoney(plan.price_monthly)||'Consultar';const period=document.createElement('span');period.textContent='MXN / mes';price.append(b,period);article.appendChild(price);
  const list=document.createElement('ul');list.className='plan-feature-list';const rows=getCommercialFeatures(plan.features);(rows.length?rows:['Características configuradas desde el catálogo.']).forEach(text=>{const li=document.createElement('li');li.textContent=text;list.appendChild(li)});article.appendChild(list);
  const footer=document.createElement('div');footer.className='plan-card-footer';const button=document.createElement('button');button.type='button';button.className=`btn ${isCurrent?'btn-ghost':'btn-primary'}`;button.textContent=isCurrent?'Plan activo':'Elegir plan';button.disabled=isCurrent;if(!isCurrent)button.onclick=()=>startPlanCheckout(plan,button);const note=document.createElement('small');note.className='plan-card-note';note.textContent=isCurrent?'Este es tu plan vigente.':'Continuarás al checkout seguro de Stripe en modo sandbox.';footer.append(button,note);article.appendChild(footer);return article;
}
async function loadEntitlements(){try{const {data,error}=await supabaseClient.rpc('get_business_entitlements',{p_business_id:biz.id});if(error)throw error;currentEntitlements=data||null}catch(e){console.warn(e);currentEntitlements=null}}
async function loadPlans(){let r=await supabaseClient.from('active_plans').select('*').order('sort_order');if(r.error)r=await supabaseClient.from('saas_plans').select('*').eq('active',true).order('sort_order');if(r.error)throw r.error;return r.data||[]}
function renderPlans(plans){const c=$('plans');c.replaceChildren();plans.forEach(p=>c.appendChild(createPlanCard(p)))}
async function init(){const s=await requireAuth();if(!s)return;biz=await getMyBusiness(s.user);if(!biz)return;$('biz-name').textContent=biz.name||'MyCitaGo';try{await loadEntitlements();renderCurrentPlanStrip();renderPlans(await loadPlans())}catch(e){console.error(e);$('plans').innerHTML='<div class="plans-error"><strong>No pudimos cargar los planes</strong></div>'}}
document.addEventListener('DOMContentLoaded',init);

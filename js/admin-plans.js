let biz=null,currentEntitlements=null;const $=id=>document.getElementById(id);
const FEATURE_MAP={reports:'Reportes e ingresos',internal_reviews:'Reseñas internas',growth_links:'Enlaces de crecimiento',advanced_audit:'Auditoría avanzada',priority_support:'Soporte prioritario',dedicated_onboarding:'Onboarding dedicado',google_reviews:'Integración con Google Business'};
function humanizeKey(k){return String(k||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function formatMoney(v){const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(n):null}
function features(f){if(Array.isArray(f))return f.filter(Boolean);if(!f||typeof f!=='object')return[];const a=[];if(f.max_staff!=null)a.push(`Hasta ${Number(f.max_staff)} profesionales`);if(f.max_branches!=null)a.push(`Hasta ${Number(f.max_branches)} sucursales`);Object.entries(f).forEach(([k,v])=>{if(['max_staff','max_branches','trial_days'].includes(k)||!v)return;if(v===true)a.push(FEATURE_MAP[k]||humanizeKey(k))});return a}
function code(p){return p?.plan_code??p?.code??p?.id??''}function current(){return currentEntitlements?.plan?.code??null}
function renderCurrent(){const s=currentEntitlements?.subscription,p=currentEntitlements?.plan,root=$('current-plan-strip');if(!root||!s||!p){root?.classList.add('hidden');return}let c=p.name||'Plan actual';if(s.status==='trial')c+=` · ${Number(s.trial_days_remaining||0)} días restantes`;$('current-plan-copy').textContent=c;$('current-plan-status').textContent=s.status==='trial'?'Prueba':'Activo';root.classList.remove('hidden')}
async function startPlanCheckout(p,button){
  try{
    button.disabled=true;button.textContent='Abriendo pago…';
    const {data,error}=await supabaseClient.functions.invoke('stripe-platform-checkout',{body:{business_id:biz.id,plan_id:code(p)}});
    if(error)throw error;if(!data?.ok||!data?.url)throw new Error(data?.error||'No se pudo iniciar el pago.');
    location.href=data.url;
  }catch(e){button.disabled=false;button.textContent='Elegir plan';alert('No se pudo abrir el pago: '+(e.message||e))}
}
function card(p){const a=document.createElement('article'),isCurrent=String(current()||'')===String(code(p));a.className='price-card'+(isCurrent?' current':'');if(isCurrent){const x=document.createElement('span');x.className='plan-current-label';x.textContent='Plan actual';a.appendChild(x)}const h=document.createElement('h2');h.textContent=p.name||'Plan';const pr=document.createElement('div');pr.className='plan-price';pr.innerHTML=`<b>${formatMoney(p.price_monthly)||'Consultar'}</b><span>MXN / mes</span>`;const ul=document.createElement('ul');ul.className='plan-feature-list';(features(p.features).length?features(p.features):['Características configuradas desde el catálogo.']).forEach(t=>{const li=document.createElement('li');li.textContent=t;ul.appendChild(li)});const foot=document.createElement('div');foot.className='plan-card-footer';const b=document.createElement('button');b.type='button';b.className=`btn ${isCurrent?'btn-ghost':'btn-primary'}`;b.textContent=isCurrent?'Plan activo':'Elegir plan';b.disabled=isCurrent;if(!isCurrent)b.onclick=()=>startPlanCheckout(p,b);const n=document.createElement('small');n.className='plan-card-note';n.textContent=isCurrent?'Este es tu plan vigente.':'Pago seguro de la suscripción MyCitaGo.';foot.append(b,n);a.append(h,pr,ul,foot);return a}
function showBillingResult(){
 const q=new URLSearchParams(location.search),state=q.get('billing');
 if(state==='success'){alert('Pago recibido. Estamos actualizando tu suscripción.');history.replaceState({},'',location.pathname)}
 else if(state==='cancel'){alert('Pago cancelado. Tu plan no cambió.');history.replaceState({},'',location.pathname)}
}
async function init(){showBillingResult();const s=await requireAuth();if(!s)return;biz=await getMyBusiness(s.user);if(!biz)return;$('biz-name').textContent=biz.name||'MyCitaGo';const e=await supabaseClient.rpc('get_business_entitlements',{p_business_id:biz.id});currentEntitlements=e.data||null;renderCurrent();let r=await supabaseClient.from('active_plans').select('*').order('sort_order');if(r.error)r=await supabaseClient.from('saas_plans').select('*').eq('active',true).order('sort_order');$('plans').replaceChildren(...(r.data||[]).map(card))}
document.addEventListener('DOMContentLoaded',init);
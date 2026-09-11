/* MyCitaGo E3 — promociones reales, sin simular precio */
(function(){
 const $=id=>document.getElementById(id); let biz=null,services=[],ent=null,promos=[];
 function toast(t){const x=$('toast');if(x){x.textContent=t;x.classList.remove('hidden');setTimeout(()=>x.classList.add('hidden'),2500)}else alert(t)}
 function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 async function load(){
  const s=await requireAuth();if(!s)return;biz=await getMyBusiness(s.user);if(!biz)return;
  const [sv,en,pr]=await Promise.all([
   supabaseClient.from('services').select('id,name,price,active').eq('business_id',biz.id).eq('active',true).order('name'),
   supabaseClient.rpc('get_business_entitlements',{p_business_id:biz.id}),
   supabaseClient.from('business_promotions').select('*').eq('business_id',biz.id).order('created_at',{ascending:false})
  ]);
  services=sv.data||[];ent=en.data||null;promos=pr.data||[];
  mount();
 }
 function enabled(){return ent?.features?.growth_links===true}
 function mount(){
  const main=document.querySelector('main');if(!main||$('real-promotions'))return;
  const box=document.createElement('section');box.id='real-promotions';box.className='ct-card growth-real-card';
  box.innerHTML=`<div class="growth-real-head"><div><span class="ct-eyebrow">PROMOCIONES REALES</span><h2>Promociones que sí cambian el precio de la reserva</h2><p>El descuento se valida en Supabase al crear la cita; no es solo una imagen.</p></div><span class="ct-badge">${enabled()?'Disponible en tu plan':'Requiere plan con Crecimiento'}</span></div>
  <div class="growth-real-form">
   <label>Servicio<select id="promo-service"><option value="">Selecciona…</option>${services.map(s=>`<option value="${s.id}">${esc(s.name)} · $${Number(s.price||0).toFixed(0)}</option>`).join('')}</select></label>
   <label>Código<input id="promo-code" maxlength="24" placeholder="VERANO20"></label>
   <label>Descuento<select id="promo-type"><option value="percent">Porcentaje</option><option value="fixed">Monto fijo</option></select></label>
   <label>Valor<input id="promo-value" type="number" min="1" step="1" placeholder="20"></label>
   <label>Vence<input id="promo-end" type="date"></label>
   <button id="promo-create" class="ct-btn ct-btn-primary" type="button" ${enabled()?'':'disabled'}>Crear promoción</button>
  </div><div id="promo-list" class="growth-real-list"></div>`;
  const head=main.querySelector('.ct-page-head');head?head.after(box):main.prepend(box);
  $('promo-create').onclick=create;render();
 }
 function render(){
  const host=$('promo-list');if(!host)return;
  host.innerHTML=promos.length?promos.map(p=>`<article><div><strong>${esc(p.title)}</strong><small>${esc(p.code)} · ${p.discount_type==='percent'?p.discount_value+'%':'$'+p.discount_value} · ${p.uses_count||0} usos</small></div><button data-promo-toggle="${p.id}" class="ct-btn ct-btn-secondary">${p.active?'Desactivar':'Activar'}</button></article>`).join(''):'<div class="ct-empty">Todavía no hay promociones.</div>';
  host.querySelectorAll('[data-promo-toggle]').forEach(b=>b.onclick=()=>toggle(b.dataset.promoToggle));
 }
 async function create(){
  if(!enabled())return toast('Tu plan actual no incluye Enlaces de crecimiento.');
  const service_id=$('promo-service').value,code=$('promo-code').value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,24),discount_type=$('promo-type').value,discount_value=Number($('promo-value').value),end=$('promo-end').value;
  if(!service_id||!code||discount_value<=0)return toast('Completa servicio, código y descuento.');
  const service=services.find(s=>s.id===service_id),ends_at=end?new Date(end+'T23:59:59').toISOString():null;
  const {error}=await supabaseClient.from('business_promotions').insert({business_id:biz.id,service_id,title:`${service?.name||'Servicio'} · ${code}`,code,discount_type,discount_value,ends_at,active:true});
  if(error)return toast('No se pudo crear: '+error.message);
  const r=await supabaseClient.from('business_promotions').select('*').eq('business_id',biz.id).order('created_at',{ascending:false});promos=r.data||[];render();toast('Promoción creada y protegida por servidor.');
 }
 async function toggle(id){const p=promos.find(x=>x.id===id);if(!p)return;const {error}=await supabaseClient.from('business_promotions').update({active:!p.active,updated_at:new Date().toISOString()}).eq('id',id).eq('business_id',biz.id);if(error)return toast(error.message);p.active=!p.active;render()}
 document.addEventListener('DOMContentLoaded',load);
})();
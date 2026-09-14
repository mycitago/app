const G=id=>document.getElementById(id);
const U=window.CitagoGrowthUtils;
let biz=null,shareImageUrl='',services=[],promos=[],customers=[],appointments=[],entitlements=null;

function toast(text){
  const t=G('toast');if(!t)return alert(text);
  t.textContent=text;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2600);
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function money(v){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(v||0))}
function appPath(){return location.pathname.split('/admin/')[0]}
function tagged(source,promoCode=''){
  return U.buildPromotionUrl({origin:location.origin,appPath:appPath(),slug:biz.slug,source,promoCode});
}
function growthEnabled(){return entitlements?.features?.growth_links===true}
function selectedService(){
  return services.find(s=>String(s.id)===String(G('promo-service')?.value||''));
}
function promoById(id){return promos.find(p=>String(p.id)===String(id))}
function promoBookings(id){return appointments.filter(a=>String(a.promotion_id||'')===String(id)).length}

async function loadShareImage(){
  const {data,error}=await supabaseClient.from('business_branding_public').select('cover_url,logo_url').eq('business_id',biz.id).maybeSingle();
  if(error)console.warn('[growth branding]',error);
  shareImageUrl=data?.cover_url||data?.logo_url||biz.cover_image_url||biz.logo_url||'';
  const img=G('growth-share-image');
  if(shareImageUrl){img.src=shareImageUrl;img.hidden=false}else{img.hidden=true;G('growth-share-preview')?.classList.add('no-image')}
  G('growth-share-business').textContent=biz.name||'Tu negocio';
}
async function imageBlob(promo=null){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#17151f';ctx.fillRect(0,0,canvas.width,canvas.height);
  if(shareImageUrl){
    const img=new Image();img.crossOrigin='anonymous';
    try{
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=shareImageUrl});
      const scale=Math.max(canvas.width/img.width,canvas.height/img.height),w=img.width*scale,h=img.height*scale;
      ctx.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    }catch(e){console.warn('[growth image]',e)}
  }
  const grad=ctx.createLinearGradient(0,220,0,630);grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(1,'rgba(0,0,0,.82)');ctx.fillStyle=grad;ctx.fillRect(0,0,1200,630);
  ctx.fillStyle='#fff';ctx.font='700 56px Arial';ctx.fillText(biz.name||'Reserva tu cita',64,470);
  ctx.font='700 34px Arial';
  if(promo){
    const s=services.find(x=>x.id===promo.service_id),calc=U.calculatePromotion({price:s?.price,type:promo.discount_type,value:promo.discount_value});
    ctx.fillText(`${s?.name||promo.title} · ${money(calc.final)}`,64,530);
    ctx.font='28px Arial';ctx.fillText(`Código ${promo.code} · Reserva en MyCitaGo`,64,580);
  }else{
    ctx.fillText('Reserva tu cita en línea con MyCitaGo',64,540);
  }
  return await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
}
async function buildShareFile(promo=null){
  const blob=await imageBlob(promo);return new File([blob],`${promo?'promo-'+promo.code.toLowerCase():'reserva-'+(biz.slug||'negocio')}.jpg`,{type:'image/jpeg'});
}
function downloadImage(file){const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}

async function shareNative(promo=null){
  const code=promo?.code||'',url=tagged('share',code),file=await buildShareFile(promo);
  const text=promo?`${promo.title}. Reserva aquí: ${url}`:`Reserva tu cita con ${biz.name}: ${url}`;
  if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:promo?.title||`Reserva con ${biz.name}`,text,files:[file]});return}
  await navigator.clipboard.writeText(text);downloadImage(file);toast('Imagen descargada y enlace copiado.');
}

function renderSummary(){
  const summary=U.summarizeSources(appointments);
  G('growth-bookings').textContent=summary.total;
  G('growth-top-source').textContent=summary.topSource;
  G('growth-promotions-total').textContent=promos.length;
  G('growth-promo-bookings').textContent=appointments.filter(a=>a.promotion_id).length;
}

function updatePromoPreview(){
  const s=selectedService(),type=G('promo-type').value,value=Number(G('promo-value').value||0);
  if(!s||!value){G('promo-preview').textContent='Selecciona servicio y descuento para ver el precio final.';return}
  const c=U.calculatePromotion({price:s.price,type,value});
  G('promo-preview').textContent=`${s.name}: ${money(c.original)} → ${money(c.final)} · ahorro ${money(c.discount)}`;
}

function renderPromos(){
  const host=G('promo-list');
  if(!promos.length){host.innerHTML='<div class="ct-empty">Todavía no hay promociones. Crea la primera arriba.</div>';return}
  host.innerHTML=promos.map(p=>{
    const s=services.find(x=>x.id===p.service_id),calc=U.calculatePromotion({price:s?.price,type:p.discount_type,value:p.discount_value});
    const link=tagged('promotion',p.code);
    return `<article class="promo-item">
      <div class="promo-item-main">
        <div><span class="promo-status ${p.active?'is-active':'is-off'}">${p.active?'Activa':'Pausada'}</span><strong>${esc(p.title)}</strong></div>
        <small>${esc(s?.name||'Servicio')} · ${esc(p.code)} · ${money(calc.original)} → <b>${money(calc.final)}</b></small>
        <small>${p.uses_count||0} usos · ${promoBookings(p.id)} reservas registradas${p.ends_at?' · vence '+new Date(p.ends_at).toLocaleDateString('es-MX'):''}</small>
        <input class="promo-link" readonly value="${esc(link)}" aria-label="Enlace de promoción">
      </div>
      <div class="promo-actions">
        <button class="ct-btn ct-btn-secondary" data-copy-promo="${p.id}">Copiar enlace</button>
        <button class="ct-btn ct-btn-secondary" data-wa-promo="${p.id}">WhatsApp</button>
        <button class="ct-btn ct-btn-secondary" data-img-promo="${p.id}">Imagen</button>
        <button class="ct-btn ct-btn-secondary" data-toggle-promo="${p.id}">${p.active?'Pausar':'Activar'}</button>
      </div>
    </article>`;
  }).join('');
  host.querySelectorAll('[data-copy-promo]').forEach(b=>b.onclick=async()=>{const p=promoById(b.dataset.copyPromo);await navigator.clipboard.writeText(tagged('copy',p.code));toast('Enlace promocional copiado.')});
  host.querySelectorAll('[data-wa-promo]').forEach(b=>b.onclick=()=>{const p=promoById(b.dataset.waPromo);window.open(`https://wa.me/?text=${encodeURIComponent(`${p.title}: ${tagged('whatsapp',p.code)}`)}`,'_blank','noopener')});
  host.querySelectorAll('[data-img-promo]').forEach(b=>b.onclick=async()=>downloadImage(await buildShareFile(promoById(b.dataset.imgPromo))));
  host.querySelectorAll('[data-toggle-promo]').forEach(b=>b.onclick=()=>togglePromo(b.dataset.togglePromo));
}

function availableSegments(){
  return [...new Set(customers.filter(c=>c.marketing_opt_in===true).map(c=>String(c.segment||'').trim()).filter(Boolean))].sort();
}
function renderSegments(){
  const select=G('campaign-segment'),segments=availableSegments();
  select.innerHTML='<option value="all">Todos con consentimiento</option>'+segments.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
  renderCampaignAudience();
}
function renderCampaignAudience(){
  const segment=G('campaign-segment').value||'all',aud=U.filterCustomersForCampaign(customers,{segment});
  G('campaign-audience-count').textContent=String(aud.length);
  G('campaign-audience-list').innerHTML=aud.length?aud.slice(0,12).map(c=>`<span>${esc(c.name)}${c.whatsapp?' · '+esc(c.whatsapp):''}</span>`).join(''):'<span>No hay clientes con consentimiento en este segmento.</span>';
}
function selectedCampaignPromo(){return promoById(G('campaign-promo').value)}
function renderCampaignPromos(){
  G('campaign-promo').innerHTML='<option value="">Selecciona promoción…</option>'+promos.filter(p=>p.active).map(p=>`<option value="${p.id}">${esc(p.title)} · ${esc(p.code)}</option>`).join('');
}
async function copyCampaign(){
  const p=selectedCampaignPromo();if(!p)return toast('Selecciona una promoción activa.');
  const segment=G('campaign-segment').value||'all',aud=U.filterCustomersForCampaign(customers,{segment});
  const url=tagged('crm',p.code),text=`${p.title}. Reserva aquí: ${url}`;
  await navigator.clipboard.writeText(text);
  toast(`Mensaje copiado para una audiencia de ${aud.length} cliente(s) con consentimiento.`);
}
async function openCampaignWhatsApp(){
  const p=selectedCampaignPromo();if(!p)return toast('Selecciona una promoción activa.');
  const segment=G('campaign-segment').value||'all',aud=U.filterCustomersForCampaign(customers,{segment});
  if(!aud.length)return toast('No hay clientes con consentimiento en este segmento.');
  const first=aud.find(c=>c.whatsapp);if(!first)return toast('La audiencia no tiene WhatsApp disponible.');
  const phone=String(first.whatsapp||'').replace(/\D/g,'');
  const text=`Hola ${first.name||''}, ${p.title}. Reserva aquí: ${tagged('crm_whatsapp',p.code)}`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank','noopener');
}

async function createPromo(){
  if(!growthEnabled())return toast('Tu plan actual no incluye Enlaces de crecimiento.');
  const s=selectedService(),code=U.sanitizePromoCode(G('promo-code').value),type=G('promo-type').value,value=Number(G('promo-value').value),end=G('promo-end').value;
  const valid=U.validatePromotionInput({serviceId:s?.id,code,type,value,servicePrice:s?.price});
  if(!valid.ok)return toast(valid.reason);
  const ends_at=end?new Date(end+'T23:59:59').toISOString():null;
  const title=`${s.name} · ${type==='percent'?value+'%':'$'+value+' MXN'} menos`;
  const {error}=await supabaseClient.from('business_promotions').insert({business_id:biz.id,service_id:s.id,title,code,discount_type:type,discount_value:value,ends_at,active:true});
  if(error)return toast('No se pudo crear: '+error.message);
  await refreshPromos();G('promo-code').value='';G('promo-value').value='';G('promo-end').value='';updatePromoPreview();toast('Promoción creada.');
}
async function togglePromo(id){
  const p=promoById(id);if(!p)return;
  const {error}=await supabaseClient.from('business_promotions').update({active:!p.active,updated_at:new Date().toISOString()}).eq('id',id).eq('business_id',biz.id);
  if(error)return toast('No se pudo actualizar: '+error.message);
  await refreshPromos();toast(p.active?'Promoción pausada.':'Promoción activada.');
}
async function refreshPromos(){
  const {data,error}=await supabaseClient.from('business_promotions').select('*').eq('business_id',biz.id).order('created_at',{ascending:false});
  if(error){console.error('[growth promotions]',error);return toast('No se pudieron cargar las promociones.')}
  promos=data||[];renderPromos();renderCampaignPromos();renderSummary();
}

async function init(){
  const session=await requireAuth();if(!session)return;
  biz=await getMyBusiness(session.user);if(!biz)return;

  const [sv,en,pr,cu,ap]=await Promise.all([
    supabaseClient.from('services').select('id,name,price,active').eq('business_id',biz.id).eq('active',true).order('name'),
    supabaseClient.rpc('get_business_entitlements',{p_business_id:biz.id}),
    supabaseClient.from('business_promotions').select('*').eq('business_id',biz.id).order('created_at',{ascending:false}),
    supabaseClient.from('customer_crm').select('id,name,whatsapp,email,marketing_opt_in,segment,completed_visits,cancelled_visits,last_visit').eq('business_id',biz.id).order('name'),
    supabaseClient.from('appointments').select('id,booking_source,promotion_id,status').eq('business_id',biz.id)
  ]);
  services=sv.data||[];entitlements=en.data||null;promos=pr.data||[];customers=cu.data||[];appointments=ap.data||[];
  [sv,en,pr,cu,ap].forEach((r,i)=>{if(r.error)console.warn('[growth load '+i+']',r.error)});

  const base=tagged('direct');
  G('growth-url').value=base;G('growth-copytext').value=`Reserva tu cita con ${biz.name} en MyCitaGo: ${base}`;
  G('growth-whatsapp').href=`https://wa.me/?text=${encodeURIComponent(`Reserva con ${biz.name}: ${tagged('whatsapp')}`)}`;
  G('growth-facebook').href=`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tagged('facebook'))}`;
  G('growth-email').href=`mailto:?subject=${encodeURIComponent(`Reserva con ${biz.name}`)}&body=${encodeURIComponent(`Agenda aquí: ${tagged('email')}`)}`;
  G('growth-copy').onclick=async()=>{await navigator.clipboard.writeText(base);toast('Enlace copiado.')};
  G('growth-instagram').onclick=async()=>{await navigator.clipboard.writeText(`Reserva con ${biz.name}: ${tagged('instagram')}`);toast('Texto y enlace copiados para Instagram.')};

  G('promo-service').innerHTML='<option value="">Selecciona…</option>'+services.map(s=>`<option value="${s.id}">${esc(s.name)} · ${money(s.price)}</option>`).join('');
  G('promo-create').disabled=!growthEnabled();
  if(!growthEnabled())G('promo-plan-note').textContent='Tu plan actual no incluye Enlaces de crecimiento.';
  ['promo-service','promo-type','promo-value'].forEach(id=>G(id).addEventListener('input',updatePromoPreview));
  G('promo-code').addEventListener('input',e=>e.target.value=U.sanitizePromoCode(e.target.value));
  G('promo-create').onclick=createPromo;

  G('campaign-segment').onchange=renderCampaignAudience;
  G('campaign-copy').onclick=copyCampaign;
  G('campaign-whatsapp').onclick=openCampaignWhatsApp;

  await loadShareImage();
  G('growth-share-native').onclick=()=>shareNative().catch(e=>{console.error(e);toast('No se pudo compartir. Usa Descargar imagen.')});
  G('growth-download-image').onclick=async()=>downloadImage(await buildShareFile());

  renderPromos();renderCampaignPromos();renderSegments();renderSummary();updatePromoPreview();
}
document.addEventListener('DOMContentLoaded',init);

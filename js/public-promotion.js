/* MyCitaGo E3 — aplica promoción real en el flujo público */
(function(){
 let promo=null,code='';
 const qs=new URLSearchParams(location.search);
 code=(qs.get('promo')||'').trim();
 async function resolvePromo(){
  if(!code||!window.currentBusiness?.id)return;
  const {data,error}=await supabaseClient.rpc('get_public_promotion',{p_business_id:window.currentBusiness.id,p_code:code});
  if(error)return console.warn('[promo]',error);
  promo=Array.isArray(data)?data[0]:data;if(!promo)return;
  document.body.dataset.promo='active';
  const note=document.createElement('div');note.id='public-promo-note';note.className='public-promo-note';
  note.textContent=`Promoción ${promo.code}: ${promo.title} · precio especial ${new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(promo.final_price)}`;
  document.querySelector('#booking-main')?.prepend(note);
 }
 window.MyCitaGoPromotion={
  code:()=>code,
  current:()=>promo,
  forService:id=>promo&&String(promo.service_id)===String(id)?promo:null
 };
 window.addEventListener('mycitago:business-ready',resolvePromo);
 document.addEventListener('DOMContentLoaded',()=>setTimeout(resolvePromo,700));
})();
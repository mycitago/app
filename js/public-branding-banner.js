/* E2 — render banner publicado */
(function(){
 async function show(){
  const business=window.currentBusiness;if(!business?.id)return;
  const {data}=await supabaseClient.from('business_branding_public').select('banner_enabled,banner_text,banner_url').eq('business_id',business.id).maybeSingle();
  if(!data?.banner_enabled||!data.banner_text)return;
  const el=data.banner_url?document.createElement('a'):document.createElement('div');el.className='public-brand-banner';el.textContent=data.banner_text;if(data.banner_url){el.href=data.banner_url;el.target='_blank';el.rel='noopener'}document.body.prepend(el);
 }
 window.addEventListener('mycitago:business-ready',show);document.addEventListener('DOMContentLoaded',()=>setTimeout(show,800));
})();
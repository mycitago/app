/* E2 — banner publicado */
(function(){
 async function run(){
  for(let i=0;i<40;i++){
   if(typeof state!=='undefined'&&state?.business?.id){
    const {data,error}=await supabaseClient.from('business_branding_public').select('banner_enabled,banner_text,banner_url').eq('business_id',state.business.id).maybeSingle();
    if(error)return console.warn('[public banner]',error);
    if(!data?.banner_enabled||!data.banner_text||document.querySelector('.public-brand-banner'))return;
    const e=data.banner_url?document.createElement('a'):document.createElement('div');e.className='public-brand-banner';e.textContent=data.banner_text;
    if(data.banner_url){e.href=data.banner_url;e.target='_blank';e.rel='noopener'}document.body.prepend(e);return;
   }
   await new Promise(r=>setTimeout(r,150));
  }
 }
 run();
})();
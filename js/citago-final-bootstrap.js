(function(){
  const path=location.pathname.toLowerCase();
  const admin=path.includes('/admin/');
  const base=admin?'../':'';
  function css(href){
    if(document.querySelector(`link[data-citago-final="${href}"]`))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href=base+href;l.dataset.citagoFinal=href;document.head.appendChild(l);
  }
  function script(src){
    return new Promise((resolve,reject)=>{
      if(document.querySelector(`script[data-citago-final="${src}"]`))return resolve();
      const s=document.createElement('script');s.src=base+src;s.dataset.citagoFinal=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s);
    });
  }
  css('css/citago-final.css?v=20260911');
  (async()=>{
    try{
      if(path.endsWith('/admin/crecimiento.html')) await script('js/admin-growth-real.js?v=20260911');
      if(path.endsWith('/admin/mi-pagina.html')) await script('js/admin-branding-banner.js?v=20260911');
      if(path.endsWith('/admin/servicios.html')) await script('js/admin-services-canonical.js?v=20260911');
      if(path.endsWith('/reservar.html')){
        await script('js/public-promotion.js?v=20260911');
        await script('js/public-branding-banner.js?v=20260911');
      }
      if(path.endsWith('/index.html')||path.endsWith('/app/')||path.endsWith('/admin/login.html')){
        await script('js/referral-tracking.js?v=20260911');
      }
    }catch(e){console.error('[CitagoFinalBootstrap]',e)}
  })();
})();

(function(){
  let channel=null;

  function reloadPublicCatalog(){
    // app.js exposes loadServices; if not, reload page conservatively.
    if(typeof window.loadServices === 'function'){
      window.loadServices();
    }else{
      location.reload();
    }
  }

  function startRealtime(){
    if(!window.supabaseClient || !window.state?.business?.id) return;
    if(channel) supabaseClient.removeChannel(channel);

    channel=supabaseClient
      .channel(`services-public-${state.business.id}`)
      .on(
        'postgres_changes',
        {
          event:'*',
          schema:'public',
          table:'services',
          filter:`business_id=eq.${state.business.id}`
        },
        ()=>reloadPublicCatalog()
      )
      .subscribe();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(window.state?.business?.id){
        clearInterval(timer);
        startRealtime();
      }else if(tries>20){
        clearInterval(timer);
      }
    },500);
  });
})();

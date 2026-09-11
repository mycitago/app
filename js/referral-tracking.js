/* F1 — referidos medibles */
(function(){
 const q=new URLSearchParams(location.search),ref=(q.get('ref')||'').trim().toLowerCase();
 if(!ref)return;try{localStorage.setItem('mycitago:ref',ref)}catch{}
 document.addEventListener('DOMContentLoaded',async()=>{try{await supabaseClient.rpc('track_referral_event',{p_ref_code:ref,p_event_type:'visit',p_business_id:null})}catch(e){console.warn('[referral]',e)}});
})();
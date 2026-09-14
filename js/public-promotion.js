/* MyCitaGo promociones reales: valida en servidor y aplica create_appointment_v3 */
(function(){
  const promoCode=(new URLSearchParams(location.search).get('promo')||'').trim();
  if(!promoCode)return;
  let promo=null;
  const originalBook=typeof bookAppointment==='function'?bookAppointment:null;
  function money(n){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n||0))}
  function showPromo(){
    if(!promo||document.getElementById('public-promo-note'))return;
    const n=document.createElement('div');n.id='public-promo-note';n.className='public-promo-note';
    n.innerHTML=`<strong>Promoción ${promo.code}</strong><span>${promo.title}</span><b>Precio especial ${money(promo.final_price)}</b>`;
    document.querySelector('#booking-main')?.prepend(n);
  }
  function refreshService(){
    if(typeof state==='undefined'||!promo)return;
    const s=(state.services||[]).find(x=>String(x.id)===String(promo.service_id));if(!s)return;
    s.original_price=Number(promo.price);s.price=Number(promo.final_price);s.promotion_code=promo.code;
    if(state.selectedService?.id===s.id)state.selectedService=s;
    if(typeof renderServices==='function'&&typeof selectService==='function')renderServices(state.services,document.getElementById('services-list'),selectService,state.activeCategory,state.serviceSearch);
  }
  async function resolve(){
    for(let i=0;i<40;i++){
      if(typeof state!=='undefined'&&state?.business?.id){
        const {data,error}=await supabaseClient.rpc('get_public_promotion',{p_business_id:state.business.id,p_code:promoCode});
        if(error){console.warn('[promo]',error);return}
        promo=Array.isArray(data)?data[0]:data;if(!promo)return;
        showPromo();refreshService();return;
      }
      await new Promise(r=>setTimeout(r,150));
    }
  }
  if(originalBook){
    bookAppointment=async function(args){
      if(!promo)return originalBook(args);
      if(String(args.service.id)!==String(promo.service_id))return originalBook(args);
      const bookingSource=(new URLSearchParams(location.search).get('src')||'promotion').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32);
      const {data,error}=await supabaseClient.rpc('create_appointment_v3',{
        p_business_id:args.business.id,p_service_id:args.service.id,p_branch_id:args.branchId,p_staff_id:args.staffId,
        p_name:args.name,p_whatsapp:`52${args.whatsappDigits}`,p_date:args.dateKey,p_start:args.startTime,p_end:args.endTime,
        p_notes:args.notes||null,p_promo_code:promo.code
      });
      if(error){
        const msg=String(error.message||''),code=String(error.code||'');
        if(code==='23P01'||msg.includes('slot_taken'))return{ok:false,reason:'Ese horario acaba de ocuparse. Elige otro horario.'};
        if(msg.includes('invalid_promotion')||msg.includes('promotion_exhausted'))return{ok:false,reason:'La promoción ya no está disponible. Actualiza la página.'};
        return{ok:false,reason:'No pudimos confirmar la cita promocional. Actualiza la página y vuelve a intentarlo.'};
      }
      const row=Array.isArray(data)?data[0]:data;
      if(row?.appointment_id&&row?.access_token){
        const tracked=await supabaseClient.rpc('track_booking_source',{p_appointment_id:row.appointment_id,p_access_token:row.access_token,p_source:bookingSource});
        if(tracked.error)console.warn('[MyCitaGo source]',tracked.error);
      }
      return{ok:true,appointmentId:row?.appointment_id,accessToken:row?.access_token};
    };
  }
  resolve();
})();
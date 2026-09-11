/* E3 — promociones reales: UI + creación de cita v3 */
(function(){
  const promoCode=(new URLSearchParams(location.search).get('promo')||'').trim();
  if(!promoCode)return;
  let promo=null;
  const originalBook=typeof bookAppointment==='function'?bookAppointment:null;

  function money(n){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n||0))}
  function showPromo(){
    if(!promo||document.getElementById('public-promo-note'))return;
    const n=document.createElement('div');n.id='public-promo-note';n.className='public-promo-note';
    n.textContent=`Promoción ${promo.code}: ${promo.title} · precio especial ${money(promo.final_price)}`;
    document.querySelector('#booking-main')?.prepend(n);
  }
  function refreshService(){
    if(typeof state==='undefined'||!promo)return;
    const s=(state.services||[]).find(x=>String(x.id)===String(promo.service_id));if(!s)return;
    s.original_price=Number(promo.original_price);s.price=Number(promo.final_price);s.promotion_code=promo.code;
    if(state.selectedService?.id===s.id)state.selectedService=s;
    if(typeof renderServices==='function'&&typeof selectService==='function'){
      renderServices(state.services,document.getElementById('services-list'),selectService,state.activeCategory,state.serviceSearch);
    }
    if(document.getElementById('services-count'))document.getElementById('services-count').textContent=`${state.services.length} opciones`;
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
      if(!promoCode)return originalBook(args);
      const bookingSource=(new URLSearchParams(location.search).get('src')||'').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32);
      const {data,error}=await supabaseClient.rpc('create_appointment_v3',{
        p_business_id:args.business.id,p_service_id:args.service.id,p_branch_id:args.branchId,p_staff_id:args.staffId,
        p_name:args.name,p_whatsapp:`52${args.whatsappDigits}`,p_date:args.dateKey,p_start:args.startTime,p_end:args.endTime,
        p_notes:args.notes||null,p_promo_code:promoCode
      });
      if(error){
        const msg=String(error.message||''),code=String(error.code||'');
        if(code==='23P01'||msg.includes('slot_taken'))return{ok:false,reason:'Ese horario acaba de ocuparse. Elige otro horario.'};
        if(msg.includes('invalid_promotion')||msg.includes('promotion_exhausted'))return{ok:false,reason:'La promoción ya no está disponible. Actualiza la página.'};
        const known={invalid_name:'Revisa tu nombre.',invalid_whatsapp:'Revisa tu número de WhatsApp.',invalid_service:'Ese servicio ya no está disponible.',inactive_service:'Ese servicio está temporalmente desactivado.',invalid_branch:'Esa sucursal ya no está disponible.',invalid_staff:'Ese profesional ya no está disponible.',staff_branch_mismatch:'El profesional ya no pertenece a esa sucursal.',staff_service_mismatch:'Ese profesional ya no presta el servicio seleccionado.',invalid_date:'La fecha seleccionada ya no es válida.',invalid_time:'El horario seleccionado no es válido.',invalid_duration:'El servicio cambió de duración.',time_blocked:'Ese horario fue bloqueado por el negocio.'};
        for(const[k,v]of Object.entries(known))if(msg.includes(k))return{ok:false,reason:v};
        return{ok:false,reason:'No pudimos confirmar la cita. Actualiza la página y vuelve a intentarlo.'};
      }
      const row=Array.isArray(data)?data[0]:data;
      if(bookingSource&&row?.appointment_id&&row?.access_token){
        const tracked=await supabaseClient.rpc('track_booking_source',{p_appointment_id:row.appointment_id,p_access_token:row.access_token,p_source:bookingSource});
        if(tracked.error)console.warn('[MyCitaGo source]',tracked.error);
      }
      return{ok:true,appointmentId:row?.appointment_id,accessToken:row?.access_token};
    };
  }
  resolve();
})();
(function(global){
  const $=id=>document.getElementById(id);
  let ctx=null;

  function money(n){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n||0))}
  function estimatedAmount(service,options){
    const price=Number(service?.price||0),mode=options?.collection_mode,value=Number(options?.deposit_value||0);
    if(mode==='full')return price;
    if(mode==='fixed')return Math.min(price,value);
    if(mode==='percentage')return Math.min(price,price*Math.min(100,value)/100);
    return 0;
  }
  async function loadOptions(businessId){
    const {data,error}=await supabaseClient.rpc('get_public_payment_options',{p_business_id:businessId});
    if(error)throw error;
    return data||{enabled:false,ready:false,collection_mode:'none'};
  }
  async function checkout(){
    const btn=$('btn-pay-online');if(!ctx||!btn)return;
    try{
      btn.disabled=true;btn.textContent='Abriendo pago seguro…';
      const {data,error}=await supabaseClient.functions.invoke('stripe-customer-checkout',{
        body:{appointment_id:ctx.appointmentId,access_token:ctx.accessToken}
      });
      if(error)throw error;
      if(!data?.ok||!data?.url)throw new Error(data?.error||'No se pudo iniciar el pago');
      location.href=data.url;
    }catch(e){
      console.error('[MyCitaGo public payment]',e);
      btn.disabled=false;btn.textContent=ctx.buttonLabel;
      if(typeof showToast==='function')showToast('La cita está confirmada, pero no pudimos abrir el pago. Puedes intentarlo de nuevo.');
    }
  }
  async function prepare(payload){
    ctx=payload;
    const card=$('online-payment-card'),btn=$('btn-pay-online'),copy=$('online-payment-copy');
    if(!card||!btn||!payload?.business?.id||!payload?.appointmentId||!payload?.accessToken)return;
    try{
      const options=await loadOptions(payload.business.id);
      if(!options.enabled||!options.ready||options.collection_mode==='none'){
        card.hidden=true;return;
      }
      const amount=estimatedAmount(payload.service,options);
      if(!(amount>0)){card.hidden=true;return;}
      const full=options.collection_mode==='full';
      ctx.buttonLabel=full?`Pagar ${money(amount)}`:`Pagar anticipo ${money(amount)}`;
      btn.textContent=ctx.buttonLabel;
      copy.textContent=full
        ? 'Este negocio ofrece pago completo en línea. Tu cita ya quedó registrada.'
        : 'Este negocio ofrece pago de anticipo en línea. Tu cita ya quedó registrada.';
      btn.onclick=checkout;
      card.hidden=false;
    }catch(e){
      console.warn('[MyCitaGo payment options]',e);
      card.hidden=true;
    }
  }
  global.CitagoPublicPayments={prepare};
})(window);

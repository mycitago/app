let paymentBiz=null;
const pay$=id=>document.getElementById(id);

function payToast(message,type='info'){
  const el=pay$('toast');if(!el)return;
  el.textContent=message;el.dataset.type=type;el.classList.remove('hidden');
  clearTimeout(window.__payToast);window.__payToast=setTimeout(()=>el.classList.add('hidden'),3600);
}
async function invokePaymentFunction(name,body){
  const {data,error}=await supabaseClient.functions.invoke(name,{body});
  if(error)throw new Error(error.message||`No se pudo ejecutar ${name}`);
  if(!data?.ok)throw new Error(data?.error||'Operación no disponible');
  return data;
}
function selectedMode(){
  return document.querySelector('input[name="collection-mode"]:checked')?.value||'none';
}
function syncModeUi(){
  const mode=selectedMode(),wrap=pay$('deposit-value-wrap');
  const show=mode==='fixed'||mode==='percentage';
  wrap?.classList.toggle('hidden',!show);
  if(mode==='fixed'){
    pay$('deposit-value-label').textContent='Anticipo fijo';
    pay$('deposit-prefix').textContent='$';
    pay$('deposit-suffix').textContent='MXN';
    pay$('deposit-value').max='';
  }else if(mode==='percentage'){
    pay$('deposit-value-label').textContent='Porcentaje de anticipo';
    pay$('deposit-prefix').textContent='';
    pay$('deposit-suffix').textContent='%';
    pay$('deposit-value').max='100';
  }
}
function setStripeStatus(row){
  const pill=pay$('stripe-account-status'),copy=pay$('stripe-account-copy'),connect=pay$('connect-stripe');
  const ready=Boolean(row?.charges_enabled);
  if(ready){
    pill.textContent='Conectado';pill.className='status-pill good';
    copy.textContent='Cuenta lista para recibir pagos de clientes.';
    connect.textContent='Administrar conexión';
  }else if(row?.stripe_account_id){
    pill.textContent='Configuración pendiente';pill.className='status-pill warn';
    copy.textContent='Completa o revisa el onboarding de Stripe.';
    connect.textContent='Continuar configuración';
  }else{
    pill.textContent='No conectado';pill.className='status-pill neutral';
    copy.textContent='Conecta tu propia cuenta antes de activar cobros.';
    connect.textContent='Conectar cuenta';
  }
  const enabled=Boolean(pay$('online-payments-enabled')?.checked);
  if(pay$('payment-rules'))pay$('payment-rules').disabled=!enabled||!ready;
}
async function loadPaymentSettings(){
  const [{data:settings,error:sErr},{data:account,error:aErr}]=await Promise.all([
    supabaseClient.from('business_payment_settings').select('*').eq('business_id',paymentBiz.id).maybeSingle(),
    supabaseClient.from('business_payment_accounts').select('*').eq('business_id',paymentBiz.id).maybeSingle()
  ]);
  if(sErr)throw sErr;if(aErr)throw aErr;
  const s=settings||{};
  pay$('online-payments-enabled').checked=Boolean(s.online_payments_enabled);
  const radio=document.querySelector(`input[name="collection-mode"][value="${s.collection_mode||'none'}"]`);
  if(radio)radio.checked=true;
  pay$('deposit-value').value=Number(s.deposit_value||0);
  pay$('prefer-card').checked=s.prefer_card!==false;
  pay$('prefer-spei').checked=Boolean(s.prefer_spei);
  pay$('prefer-oxxo').checked=Boolean(s.prefer_oxxo);
  syncModeUi();setStripeStatus(account);
}
async function loadSubscription(){
  try{
    const {data,error}=await supabaseClient.rpc('get_business_entitlements',{p_business_id:paymentBiz.id});
    if(error)throw error;
    pay$('subscription-plan').textContent=data?.plan?.name||'Sin plan';
    const st=data?.subscription?.status||'sin suscripción';
    pay$('subscription-status').textContent=st==='trial'?'Prueba':st==='active'?'Activo':st;
  }catch(e){
    console.warn('[MyCitaGo payments subscription]',e);
    pay$('subscription-plan').textContent='No disponible';
    pay$('subscription-status').textContent='—';
  }
}
async function refreshStripeStatus(showMessage=true){
  try{
    const data=await invokePaymentFunction('stripe-connect-status',{business_id:paymentBiz.id});
    setStripeStatus({
      stripe_account_id:data.status!=='not_started'?'exists':null,
      charges_enabled:data.charges_enabled
    });
    if(showMessage)payToast(data.charges_enabled?'Stripe está listo para cobrar.':'Stripe todavía requiere configuración.',data.charges_enabled?'success':'info');
  }catch(e){
    console.warn('[MyCitaGo Stripe status]',e);
    if(showMessage)payToast('No se pudo actualizar Stripe: '+e.message,'error');
  }
}
async function startStripe(){
  const btn=pay$('connect-stripe');
  try{
    btn.disabled=true;btn.textContent='Abriendo Stripe…';
    const data=await invokePaymentFunction('stripe-connect-start',{business_id:paymentBiz.id});
    location.href=data.url;
  }catch(e){
    payToast('No se pudo abrir Stripe: '+e.message,'error');
    btn.disabled=false;btn.textContent='Conectar cuenta';
  }
}
async function saveSettings(){
  const mode=selectedMode(),value=Number(pay$('deposit-value').value||0);
  if(mode==='percentage'&&(value<=0||value>100))return payToast('El porcentaje debe estar entre 1 y 100.','error');
  if(mode==='fixed'&&value<=0)return payToast('El anticipo fijo debe ser mayor a cero.','error');

  const payload={
    business_id:paymentBiz.id,
    online_payments_enabled:Boolean(pay$('online-payments-enabled').checked),
    collection_mode:mode,
    deposit_value:(mode==='fixed'||mode==='percentage')?value:0,
    prefer_card:Boolean(pay$('prefer-card').checked),
    prefer_spei:Boolean(pay$('prefer-spei').checked),
    prefer_oxxo:Boolean(pay$('prefer-oxxo').checked),
    currency:'mxn',
    updated_at:new Date().toISOString()
  };
  const {error}=await supabaseClient.from('business_payment_settings').upsert(payload);
  if(error)return payToast('No se pudo guardar: '+error.message,'error');
  payToast('Configuración de pagos guardada.','success');
}
async function initAdminPayments(){
  const session=await requireAuth();if(!session)return;
  paymentBiz=await getMyBusiness(session.user);if(!paymentBiz)return;

  document.querySelectorAll('input[name="collection-mode"]').forEach(x=>x.addEventListener('change',syncModeUi));
  pay$('online-payments-enabled').addEventListener('change',async()=>{
    if(pay$('online-payments-enabled').checked)await refreshStripeStatus(false);
    else if(pay$('payment-rules'))pay$('payment-rules').disabled=true;
  });
  pay$('connect-stripe').onclick=startStripe;
  pay$('refresh-stripe').onclick=()=>refreshStripeStatus(true);
  pay$('save-payment-settings').onclick=saveSettings;

  try{await Promise.all([loadPaymentSettings(),loadSubscription()]);}
  catch(e){console.error('[MyCitaGo payments]',e);payToast('No se pudo cargar la configuración de pagos: '+e.message,'error');}

  const qs=new URLSearchParams(location.search);
  if(qs.get('stripe')==='return'||qs.get('stripe')==='refresh'){
    await refreshStripeStatus(true);
    history.replaceState({},'',location.pathname);
  }
}
document.addEventListener('DOMContentLoaded',initAdminPayments);

(function(){
const urlBase=new URL('../',document.currentScript.src);
const fromBase=(path)=>new URL(path,urlBase).toString();
function decodeKey(base64){const str=atob(base64.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(str,c=>c.charCodeAt(0))}
async function enablePush({businessId,appointmentId,accessToken}={}){
 if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('Este navegador no admite notificaciones push.');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('No se concedió permiso para notificaciones.');
 const reg=await navigator.serviceWorker.register(fromBase('sw.js'));await navigator.serviceWorker.ready;
 let config;
 const base=String(window.CITAS_CONFIG?.supabaseUrl||'').replace(/\/$/,'');
 if(!base)throw Error('Falta la URL de Supabase en la configuración.');
 try{
   const response=await fetch(base+'/functions/v1/push-config',{method:'GET',mode:'cors',cache:'no-store'});
   const body=await response.json().catch(()=>null);
   if(!response.ok){
     if(response.status===503||body?.error==='push_not_configured')throw Error('Falta VAPID_PUBLIC_KEY en los secretos de Supabase.');
     throw Error('push-config respondió HTTP '+response.status+': '+(body?.message||body?.error||'error del servidor'));
   }
   config=body;
 }catch(error){throw Error(error?.message||'No se pudo consultar push-config.')}
 if(typeof config?.publicKey!=='string'||!config.publicKey.trim())throw Error('push-config no devolvió publicKey.');
 const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.publicKey)});
 const json=sub.toJSON(),keys=json.keys||{};
 if(appointmentId&&accessToken){
   const {data,error}=await supabaseClient.rpc('register_customer_push',{p_appointment_id:appointmentId,p_access_token:accessToken,p_endpoint:sub.endpoint,p_p256dh:keys.p256dh,p_auth_key:keys.auth});
   if(error||!data)throw Error('No se pudo asociar la notificación a tu cita.');
 }else{
   const {data:{user},error:userError}=await supabaseClient.auth.getUser();if(userError||!user)throw Error('Inicia sesión para activar las notificaciones del equipo.');
   const {error}=await supabaseClient.from('push_subscriptions').upsert({business_id:businessId,user_id:user.id,endpoint:sub.endpoint,p256dh:keys.p256dh,auth_key:keys.auth},{onConflict:'user_id,endpoint'});
   if(error)throw error;
 }
 return true;
}
window.MyCitaGoPush={enablePush};
})();
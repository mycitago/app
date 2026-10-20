(function(){
const urlBase=new URL('../',document.currentScript.src);
const fromBase=(path)=>new URL(path,urlBase).toString();
function decodeKey(base64){const str=atob(base64.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(str,c=>c.charCodeAt(0))}
async function enablePush({businessId,appointmentId,accessToken}={}){
 if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('Este navegador no admite notificaciones push.');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('No se concedió permiso para notificaciones.');
 const reg=await navigator.serviceWorker.register(fromBase('sw.js'));await navigator.serviceWorker.ready;
 const {data:config,error:configError}=await supabaseClient.functions.invoke('push-config');if(configError||!config?.publicKey)throw Error('El servicio de notificaciones todavía no está configurado.');
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
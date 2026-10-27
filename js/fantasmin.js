/* Fantasmin desactivado temporalmente.
 * El asistente flotante no consulta correctamente las citas y se oculta
 * para evitar confundir a los usuarios. No se modifican agenda, citas,
 * autenticación, clientes ni notificaciones.
 * Para reactivarlo, restaurar el contenido funcional de este archivo
 * después de corregir y probar la autenticación y las consultas a Supabase.
 */
(function(){
  if (window.__fantasminLoaded) return;
  window.__fantasminLoaded = true;
})();

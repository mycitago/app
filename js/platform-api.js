// MyCitaGo Platform API — adaptador de navegador, NO frontera de seguridad.
// Cada RPC invocado aquí vuelve a validar al Super Admin dentro de PostgreSQL.
(function(global){
  'use strict';

  function rpc(name){
    return supabaseClient.rpc(name);
  }

  global.PlatformAPI=Object.freeze({
    readSupport:()=>rpc('platform_read_support'),
    readServiceTemplates:()=>rpc('platform_read_service_templates'),
    readBusinessCategories:()=>rpc('platform_read_business_categories'),
    readBusinessInvites:()=>rpc('platform_read_business_invites'),
    readCategoryChangeRequests:()=>rpc('platform_read_category_change_requests'),
    readAuditLogs:()=>rpc('platform_read_audit_logs'),
    bulkSuspend:(ids)=>supabaseClient.rpc('platform_bulk_suspend',{p_business_ids:ids}),
    bulkReactivate:(ids,days=30)=>supabaseClient.rpc('platform_bulk_reactivate',{p_business_ids:ids,p_days:days})
  });
})(window);

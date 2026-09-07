(function(root,factory){
  const api=factory(
    typeof module==='object'&&module.exports
      ? require('./data-state.js')
      : root.MyCitaGoDataState
  );
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.DashboardDataLoader=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(dataState){
  async function loadBusinessDashboardSnapshot(client,businessId,{timeoutMs=12000}={}){
    if(!client?.rpc) throw new Error('Cliente Supabase no disponible');
    if(!businessId) throw new Error('business_id requerido');

    return dataState.withDataState(async()=>{
      const {data,error}=await client.rpc('business_dashboard_snapshot',{
        p_business_id:businessId
      });
      if(error) throw new Error(error.message||'No se pudo cargar el resumen del negocio');
      const snap=data||{};
      return {
        appointments:Array.isArray(snap.appointments)?snap.appointments:[],
        services:Array.isArray(snap.services)?snap.services:[],
        customers:Array.isArray(snap.customers)?snap.customers:[]
      };
    },{timeoutMs});
  }

  return { loadBusinessDashboardSnapshot };
});

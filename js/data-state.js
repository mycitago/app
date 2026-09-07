(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root){ root.MyCitaGoDataState=api; }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  class DataTimeoutError extends Error{
    constructor(message='La consulta tardó demasiado.'){
      super(message); this.name='DataTimeoutError'; this.code='DATA_TIMEOUT';
    }
  }

  async function withDataState(operation,{timeoutMs=12000}={}){
    if(typeof operation!=='function') throw new TypeError('operation debe ser una función');
    let timer;
    try{
      return await Promise.race([
        Promise.resolve().then(operation),
        new Promise((_,reject)=>{
          timer=setTimeout(()=>reject(new DataTimeoutError()),timeoutMs);
        })
      ]);
    } finally {
      if(timer) clearTimeout(timer);
    }
  }

  return { withDataState, DataTimeoutError };
});

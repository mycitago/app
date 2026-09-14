(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.CitagoGrowthUtils=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function sanitizePromoCode(value){
    return String(value||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,24);
  }
  function calculatePromotion({price,type,value}){
    const original=Math.max(0,Number(price)||0);
    const raw=Math.max(0,Number(value)||0);
    const discount=type==='percent'
      ? Math.min(original, Math.round(original*Math.min(raw,100))/100)
      : Math.min(original,raw);
    return {original,discount:Number(discount.toFixed(2)),final:Number(Math.max(0,original-discount).toFixed(2))};
  }
  function buildPromotionUrl({origin,appPath,slug,source,promoCode}){
    const base=String(appPath||'').replace(/\/$/,'');
    const url=new URL(`${base}/reservar.html`,origin);
    url.searchParams.set('n',slug);
    if(source)url.searchParams.set('src',source);
    if(promoCode)url.searchParams.set('promo',sanitizePromoCode(promoCode));
    return url.toString();
  }
  function filterCustomersForCampaign(customers,{segment='all'}={}){
    return (customers||[]).filter(c=>{
      if(c.marketing_opt_in!==true)return false;
      if(segment==='all')return true;
      return String(c.segment||'').toLowerCase()===String(segment).toLowerCase();
    });
  }
  function validatePromotionInput({serviceId,code,type,value,servicePrice}){
    const clean=sanitizePromoCode(code),v=Number(value),price=Number(servicePrice);
    if(!serviceId)return {ok:false,reason:'Selecciona un servicio.'};
    if(clean.length<3)return {ok:false,reason:'El código debe tener al menos 3 caracteres.'};
    if(!['percent','fixed'].includes(type))return {ok:false,reason:'Tipo de descuento inválido.'};
    if(!Number.isFinite(v)||v<=0)return {ok:false,reason:'Ingresa un descuento mayor a cero.'};
    if(type==='percent'&&v>100)return {ok:false,reason:'El porcentaje no puede superar 100%.'};
    if(type==='fixed'&&Number.isFinite(price)&&v>price)return {ok:false,reason:'El descuento fijo no puede superar el precio del servicio.'};
    return {ok:true};
  }
  function summarizeSources(rows){
    const counts={};
    (rows||[]).forEach(r=>{const s=String(r.booking_source||'').trim();if(s)counts[s]=(counts[s]||0)+1});
    const topSource=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
    return {total:Object.values(counts).reduce((a,b)=>a+b,0),topSource,counts};
  }
  return {sanitizePromoCode,calculatePromotion,buildPromotionUrl,filterCustomersForCampaign,validatePromotionInput,summarizeSources};
});

(function(){
  'use strict';

  async function rpcRows(name,args){
    try{
      const {data,error}=await supabaseClient.rpc(name,args);
      if(error){console.warn(`[reviews:${name}]`,error);return [];}
      return Array.isArray(data)?data:[];
    }catch(error){
      console.warn(`[reviews:${name}]`,error);
      return [];
    }
  }

  function dedupe(rows){
    const seen=new Set();
    return rows.filter(r=>{
      const key=r.id||`${r.source||''}|${r.reviewer_name||''}|${r.rating||0}|${r.comment||''}|${r.created_at||''}`;
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
  }

  async function fetchVerifiedPublicReviews(businessId, limit=8, slug=null){
    if(!businessId&&!slug)return [];

    const verified = businessId
      ? await rpcRows('public_business_reviews_verified',{p_business_id:businessId,p_limit:limit})
      : [];

    if(verified.length)return dedupe(verified).slice(0,limit);

    // Fallback: existing public review feed. Still real published data; never mock content.
    const publicRows = slug
      ? await rpcRows('public_business_reviews',{p_slug:slug,p_limit:limit})
      : [];

    return dedupe(publicRows).slice(0,limit);
  }

  window.fetchVerifiedPublicReviews=fetchVerifiedPublicReviews;
})();
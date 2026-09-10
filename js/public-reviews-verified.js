(function(){
  'use strict';
  async function fetchVerifiedPublicReviews(businessId, limit=8){
    if(!businessId)return [];
    const {data,error}=await supabaseClient.rpc('public_business_reviews_verified',{p_business_id:businessId,p_limit:limit});
    if(error){console.warn('[public reviews verified]',error);return [];}
    return Array.isArray(data)?data:[];
  }
  window.fetchVerifiedPublicReviews=fetchVerifiedPublicReviews;
})();
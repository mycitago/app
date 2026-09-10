import { cors,json,tenantContext,stripeV2 } from "../_shared/stripe.ts";

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const c=await tenantContext(req);
    const {data:local}=await c.admin
      .from("business_payment_accounts")
      .select("*")
      .eq("business_id",c.business_id)
      .maybeSingle();

    if(!local?.stripe_account_id){
      return json({ok:true,status:"not_started",charges_enabled:false,details_submitted:false});
    }

    const account=await stripeV2(
      `/v2/core/accounts/${encodeURIComponent(local.stripe_account_id)}?include[]=configuration.merchant&include[]=requirements`
    );

    const cardStatus=account?.configuration?.merchant?.capabilities?.card_payments?.status||"inactive";
    const due=account?.requirements?.currently_due||account?.requirements?.entries||[];
    const chargesEnabled=cardStatus==="active";
    const detailsSubmitted=Array.isArray(due)?due.length===0:chargesEnabled;
    const onboardingStatus=chargesEnabled?"complete":"incomplete";

    await c.admin.from("business_payment_accounts").update({
      charges_enabled:chargesEnabled,
      details_submitted:detailsSubmitted,
      onboarding_status:onboardingStatus,
      last_synced_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    }).eq("business_id",c.business_id);

    return json({
      ok:true,
      status:onboardingStatus,
      charges_enabled:chargesEnabled,
      details_submitted:detailsSubmitted,
      card_payments_status:cardStatus
    });
  }catch(e){
    const m=String(e?.message||e);
    return json({ok:false,error:m},/unauthorized|forbidden/.test(m)?403:400);
  }
});

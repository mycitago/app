import { cors,json,tenantContext,stripeV2,appUrl } from "../_shared/stripe.ts";

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const c=await tenantContext(req);
    const {data:business,error:bErr}=await c.admin
      .from("businesses")
      .select("id,name,email")
      .eq("id",c.business_id)
      .single();
    if(bErr||!business)throw new Error("business_not_found");

    let {data:local}=await c.admin
      .from("business_payment_accounts")
      .select("*")
      .eq("business_id",c.business_id)
      .maybeSingle();

    let accountId=local?.stripe_account_id||null;

    if(!accountId){
      const body:any={
        display_name:business.name||"Negocio MyCitaGo",
        dashboard:"full",
        configuration:{
          merchant:{
            capabilities:{
              card_payments:{requested:true}
            }
          }
        },
        defaults:{
          currency:"mxn",
          locales:["es-MX"],
          responsibilities:{
            fees_collector:"stripe",
            losses_collector:"stripe"
          }
        },
        include:["configuration.merchant","requirements"]
      };
      if(business.email)body.contact_email=business.email;

      const account=await stripeV2("/v2/core/accounts",{
        method:"POST",
        body:JSON.stringify(body)
      });
      accountId=account.id;

      const {error:saveErr}=await c.admin.from("business_payment_accounts").upsert({
        business_id:c.business_id,
        provider:"stripe",
        stripe_account_id:accountId,
        onboarding_status:"incomplete",
        livemode:false,
        updated_at:new Date().toISOString()
      });
      if(saveErr)throw saveErr;
    }

    const returnUrl=`${appUrl()}/admin/pagos.html?stripe=return`;
    const refreshUrl=`${appUrl()}/admin/pagos.html?stripe=refresh`;

    const link=await stripeV2("/v2/core/account_links",{
      method:"POST",
      body:JSON.stringify({
        account:accountId,
        use_case:{
          type:"account_onboarding",
          account_onboarding:{
            configurations:["merchant"],
            collection_options:{fields:"eventually_due"},
            return_url:returnUrl,
            refresh_url:refreshUrl
          }
        }
      })
    });

    return json({ok:true,url:link.url,account_id:accountId});
  }catch(e){
    const m=String(e?.message||e);
    return json({ok:false,error:m},/unauthorized|forbidden/.test(m)?403:400);
  }
});

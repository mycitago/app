import { cors,json,tenantContext,stripeV1Form,appUrl,cents } from "../_shared/stripe.ts";

function val(plan:any,...keys:string[]){
  for(const k of keys)if(plan?.[k]!==undefined&&plan?.[k]!==null)return plan[k];
  return null;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const c=await tenantContext(req);
    const planKey=String(c.body.plan_id||c.body.plan_code||"").trim();
    if(!planKey)throw new Error("plan required");

    // The plan ID type differs between historical MyCitaGo schemas.
    // Read the small active catalog and match in memory to avoid invalid UUID
    // casts when a plan code is sent to a UUID column.
    const {data:catalog,error:planErr}=await c.admin
      .from("saas_plans")
      .select("*")
      .eq("active",true);
    if(planErr)throw planErr;
    const plan=(catalog||[]).find((x:any)=>
      [x.id,x.plan_code,x.code].some(v=>v!==null&&v!==undefined&&String(v)===planKey)
    );
    if(!plan)throw new Error("plan_not_found");

    const monthly=Number(val(plan,"price_monthly","monthly_price"));
    if(!Number.isFinite(monthly)||monthly<=0)throw new Error("invalid_plan_price");

    const {data:business}=await c.admin.from("businesses")
      .select("id,name,email")
      .eq("id",c.business_id).single();

    let {data:billing}=await c.admin.from("platform_billing_accounts")
      .select("*").eq("business_id",c.business_id).maybeSingle();

    let customerId=billing?.stripe_customer_id||null;
    if(!customerId){
      const p=new URLSearchParams();
      if(business?.email)p.set("email",business.email);
      if(business?.name)p.set("name",business.name);
      p.set("metadata[business_id]",c.business_id);
      p.set("metadata[flow]","mycitago_subscription");
      const customer=await stripeV1Form("/v1/customers",p);
      customerId=customer.id;
      await c.admin.from("platform_billing_accounts").upsert({
        business_id:c.business_id,
        stripe_customer_id:customerId,
        plan_id:String(val(plan,"id","plan_code","code")||planKey),
        status:"checkout_pending",
        livemode:false,
        updated_at:new Date().toISOString()
      });
    }

    const success=`${appUrl()}/admin/planes.html?billing=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancel=`${appUrl()}/admin/planes.html?billing=cancel`;

    const p=new URLSearchParams();
    p.set("mode","subscription");
    p.set("customer",customerId);
    p.set("success_url",success);
    p.set("cancel_url",cancel);
    p.set("line_items[0][quantity]","1");
    p.set("line_items[0][price_data][currency]","mxn");
    p.set("line_items[0][price_data][unit_amount]",String(cents(monthly)));
    p.set("line_items[0][price_data][recurring][interval]","month");
    p.set("line_items[0][price_data][product_data][name]",`MyCitaGo · ${plan.name||"Plan"}`);
    p.set("metadata[flow]","platform_subscription");
    p.set("metadata[business_id]",c.business_id);
    p.set("metadata[plan_id]",String(val(plan,"id","plan_code","code")||planKey));
    p.set("subscription_data[metadata][flow]","platform_subscription");
    p.set("subscription_data[metadata][business_id]",c.business_id);
    p.set("subscription_data[metadata][plan_id]",String(val(plan,"id","plan_code","code")||planKey));
    p.set("allow_promotion_codes","true");

    const session=await stripeV1Form("/v1/checkout/sessions",p);
    return json({ok:true,url:session.url,session_id:session.id});
  }catch(e){
    const m=String(e?.message||e);
    return json({ok:false,error:m},/unauthorized|forbidden/.test(m)?403:400);
  }
});

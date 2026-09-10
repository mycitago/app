// MyCitaGo · stripe-platform-checkout
// Standalone Supabase Edge Function for Dashboard deployment.
// No shared-file dependency is required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS"
};

function json(data:any,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...cors,"Content-Type":"application/json"}
  });
}

function adminClient(){
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function tenantContext(req:Request){
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))throw new Error("unauthorized");

  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await userClient.auth.getUser();
  if(!user)throw new Error("unauthorized");

  const body=await req.json().catch(()=>({}));
  const business_id=body.business_id;
  if(!business_id)throw new Error("business_id required");

  const {data:member}=await userClient
    .from("business_members")
    .select("role,active")
    .eq("business_id",business_id)
    .eq("user_id",user.id)
    .maybeSingle();

  if(!member||member.active===false)throw new Error("forbidden");
  if(!["OWNER","MANAGER","ADMIN"].includes(String(member.role||"").toUpperCase())){
    throw new Error("forbidden");
  }
  return {user,member,business_id,body,admin:adminClient()};
}

function stripeSecret(){
  const value=Deno.env.get("STRIPE_SECRET_KEY");
  if(!value)throw new Error("STRIPE_SECRET_KEY missing");
  return value;
}

const STRIPE_V2_VERSION="2026-08-26.preview";

async function stripeV2(path:string,init:RequestInit={}){
  const headers=new Headers(init.headers||{});
  headers.set("Authorization",`Bearer ${stripeSecret()}`);
  headers.set("Stripe-Version",STRIPE_V2_VERSION);
  if(init.body)headers.set("Content-Type","application/json");
  const res=await fetch(`https://api.stripe.com${path}`,{...init,headers});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error?.message||`Stripe ${res.status}`);
  return data;
}

async function stripeV1Form(
  path:string,
  params:URLSearchParams,
  extraHeaders:Record<string,string>={}
){
  const headers=new Headers({
    "Authorization":`Bearer ${stripeSecret()}`,
    "Content-Type":"application/x-www-form-urlencoded",
    ...extraHeaders
  });
  const res=await fetch(`https://api.stripe.com${path}`,{
    method:"POST",headers,body:params.toString()
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error?.message||`Stripe ${res.status}`);
  return data;
}

async function stripeV1Get(path:string,extraHeaders:Record<string,string>={}){
  const headers=new Headers({
    "Authorization":`Bearer ${stripeSecret()}`,
    ...extraHeaders
  });
  const res=await fetch(`https://api.stripe.com${path}`,{headers});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error?.message||`Stripe ${res.status}`);
  return data;
}

function appUrl(){
  return (Deno.env.get("APP_PUBLIC_URL")||"https://mycitago.github.io/app").replace(/\/+$/,"");
}

function cents(value:number){
  return Math.round(Number(value)*100);
}

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

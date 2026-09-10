// MyCitaGo · stripe-connect-start
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

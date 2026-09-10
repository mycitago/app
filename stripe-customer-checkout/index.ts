// MyCitaGo · stripe-customer-checkout
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

function amountFor(servicePrice:number,mode:string,value:number){
  const price=Math.max(0,Number(servicePrice||0));
  if(mode==="full")return price;
  if(mode==="fixed")return Math.min(price,Math.max(0,value));
  if(mode==="percentage")return Math.min(price,price*Math.max(0,Math.min(100,value))/100);
  return 0;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const body=await req.json().catch(()=>({}));
    const appointmentId=String(body.appointment_id||"");
    const accessToken=String(body.access_token||"");
    if(!appointmentId||!accessToken)throw new Error("invalid_booking_reference");

    const admin=adminClient();

    const {data:appointment,error:aErr}=await admin.from("appointments")
      .select("id,business_id,service_id,access_token,status")
      .eq("id",appointmentId)
      .eq("access_token",accessToken)
      .maybeSingle();
    if(aErr||!appointment)throw new Error("appointment_not_found");

    const [{data:service},{data:settings},{data:account}]=await Promise.all([
      admin.from("services").select("id,name,price").eq("id",appointment.service_id).single(),
      admin.from("business_payment_settings").select("*").eq("business_id",appointment.business_id).maybeSingle(),
      admin.from("business_payment_accounts").select("*").eq("business_id",appointment.business_id).maybeSingle()
    ]);

    if(!service)throw new Error("service_not_found");
    if(!settings?.online_payments_enabled||settings.collection_mode==="none"){
      throw new Error("online_payments_disabled");
    }
    if(!account?.stripe_account_id||!account.charges_enabled){
      throw new Error("payment_account_not_ready");
    }

    const amount=amountFor(Number(service.price),settings.collection_mode,Number(settings.deposit_value||0));
    if(!Number.isFinite(amount)||amount<=0)throw new Error("invalid_payment_amount");

    const existing=await admin.from("customer_payments")
      .select("id,status")
      .eq("appointment_id",appointment.id)
      .eq("status","paid")
      .maybeSingle();
    if(existing.data?.id)throw new Error("appointment_already_paid");

    const slugResult=await admin.from("businesses").select("slug,name").eq("id",appointment.business_id).single();
    const slug=slugResult.data?.slug||"";
    const back=`${appUrl()}/reservar.html?n=${encodeURIComponent(slug)}`;
    const success=`${back}&payment=success&appointment=${encodeURIComponent(appointment.id)}`;
    const cancel=`${back}&payment=cancel&appointment=${encodeURIComponent(appointment.id)}`;

    const label=settings.collection_mode==="full"?"Pago de servicio":"Anticipo de servicio";
    const p=new URLSearchParams();
    p.set("mode","payment");
    p.set("success_url",success);
    p.set("cancel_url",cancel);
    p.set("line_items[0][quantity]","1");
    p.set("line_items[0][price_data][currency]","mxn");
    p.set("line_items[0][price_data][unit_amount]",String(cents(amount)));
    p.set("line_items[0][price_data][product_data][name]",`${label} · ${service.name}`);
    p.set("metadata[flow]","customer_payment");
    p.set("metadata[business_id]",appointment.business_id);
    p.set("metadata[appointment_id]",appointment.id);

    // Dynamic payment methods are controlled by Stripe/connected account.
    // Tenant preferences never claim that a capability is enabled.
    const session=await stripeV1Form(
      "/v1/checkout/sessions",
      p,
      {"Stripe-Account":account.stripe_account_id}
    );

    const {error:saveErr}=await admin.from("customer_payments").insert({
      business_id:appointment.business_id,
      appointment_id:appointment.id,
      provider:"stripe",
      provider_session_id:session.id,
      connected_account_id:account.stripe_account_id,
      amount,
      currency:"mxn",
      collection_mode:settings.collection_mode,
      status:"pending"
    });
    if(saveErr)throw saveErr;

    return json({ok:true,url:session.url,amount,currency:"mxn"});
  }catch(e){
    const m=String(e?.message||e);
    return json({ok:false,error:m},400);
  }
});

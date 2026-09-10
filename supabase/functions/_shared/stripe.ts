import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS"
};

export function json(data:any,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...cors,"Content-Type":"application/json"}
  });
}

export function adminClient(){
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export async function tenantContext(req:Request){
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

export function stripeSecret(){
  const value=Deno.env.get("STRIPE_SECRET_KEY");
  if(!value)throw new Error("STRIPE_SECRET_KEY missing");
  return value;
}

export const STRIPE_V2_VERSION="2026-08-26.preview";

export async function stripeV2(path:string,init:RequestInit={}){
  const headers=new Headers(init.headers||{});
  headers.set("Authorization",`Bearer ${stripeSecret()}`);
  headers.set("Stripe-Version",STRIPE_V2_VERSION);
  if(init.body)headers.set("Content-Type","application/json");
  const res=await fetch(`https://api.stripe.com${path}`,{...init,headers});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error?.message||`Stripe ${res.status}`);
  return data;
}

export async function stripeV1Form(
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

export async function stripeV1Get(path:string,extraHeaders:Record<string,string>={}){
  const headers=new Headers({
    "Authorization":`Bearer ${stripeSecret()}`,
    ...extraHeaders
  });
  const res=await fetch(`https://api.stripe.com${path}`,{headers});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error?.message||`Stripe ${res.status}`);
  return data;
}

export function appUrl(){
  return (Deno.env.get("APP_PUBLIC_URL")||"https://mycitago.github.io/app").replace(/\/+$/,"");
}

export function cents(value:number){
  return Math.round(Number(value)*100);
}

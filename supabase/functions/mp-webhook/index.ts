import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function env(name:string){const v=Deno.env.get(name);if(!v)throw new Error(`${name} missing`);return v.trim()}
function adminClient(){return createClient(env("SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}})}
function parseSignature(v:string){const out:Record<string,string>={};for(const p of String(v||"").split(",")){const[k,val]=p.split("=",2);if(k&&val)out[k.trim()]=val.trim()}return out}
function hex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function hmac(secret:string,message:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message))))}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
async function validWebhook(req:Request,dataId:string){const x=req.headers.get("x-signature")||"",rid=req.headers.get("x-request-id")||"",p=parseSignature(x),ts=p.ts||"",v1=p.v1||"";if(!ts||!v1)return false;const parts:string[]=[];if(dataId)parts.push(`id:${String(dataId).toLowerCase()};`);if(rid)parts.push(`request-id:${rid};`);parts.push(`ts:${ts};`);return safeEqual(await hmac(env("MP_WEBHOOK_SECRET"),parts.join("")),v1)}
function normalize(s:string){s=String(s||"").toLowerCase();if(s==="approved")return"paid";if(["pending","in_process","authorized"].includes(s))return"pending";if(["rejected","cancelled"].includes(s))return"rejected";if(s==="refunded")return"refunded";if(s==="charged_back")return"charged_back";return"pending"}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return new Response("ok",{status:200});
  try{
    const url=new URL(req.url),body=await req.json().catch(()=>({}));
    const type=String(body?.type||url.searchParams.get("type")||"");
    const dataId=String(url.searchParams.get("data.id")||url.searchParams.get("data_id")||body?.data?.id||"");
    if(!dataId)return new Response("missing_data_id",{status:400});
    if(!(await validWebhook(req,dataId)))return new Response("invalid_signature",{status:401});
    if(type&&type!=="payment")return new Response("ignored",{status:200});
    const sellerId=String(body?.user_id||"");if(!sellerId)return new Response("missing_user_id",{status:400});
    const admin=adminClient();
    const {data:secret,error:secretError}=await admin.from("business_payment_secrets").select("business_id,access_token,provider_user_id").eq("provider","mercadopago").eq("provider_user_id",sellerId).maybeSingle();
    if(secretError||!secret?.access_token)return new Response("seller_not_found",{status:404});
    const res=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,{headers:{Authorization:`Bearer ${secret.access_token}`,Accept:"application/json"}});
    const text=await res.text();let payment:any={};try{payment=text?JSON.parse(text):{}}catch{payment={raw:text}};
    if(!res.ok||!payment?.id)return new Response("payment_fetch_failed",{status:502});
    const appointmentId=String(payment?.external_reference||payment?.metadata?.appointment_id||"");if(!appointmentId)return new Response("missing_external_reference",{status:400});
    const {data:row,error:rowError}=await admin.from("customer_payments").select("*").eq("appointment_id",appointmentId).eq("provider","mercadopago").maybeSingle();
    if(rowError||!row)return new Response("payment_row_not_found",{status:404});
    if(String(row.business_id)!==String(secret.business_id))return new Response("business_mismatch",{status:409});
    const providerAmount=Number(payment?.transaction_amount||0),expected=Number(row.amount||0),currency=String(payment?.currency_id||"").toLowerCase();
    const amountOk=Math.abs(providerAmount-expected)<0.01,currencyOk=!currency||currency===String(row.currency||"mxn").toLowerCase();
    let status=normalize(String(payment?.status||"")),lastError:string|null=null;
    if(!amountOk||!currencyOk){status="review_required";lastError=!amountOk?"amount_mismatch":"currency_mismatch"}
    const {error:updateError}=await admin.from("customer_payments").update({provider_payment_id:String(payment.id),provider_status:String(payment.status||""),status,payment_method:payment?.payment_method_id||payment?.payment_type_id||null,paid_at:status==="paid"?(payment?.date_approved||new Date().toISOString()):null,last_error:lastError,updated_at:new Date().toISOString()}).eq("id",row.id);
    if(updateError)return new Response("update_failed",{status:500});
    console.log("[mp-webhook:ok]",{appointment_id:appointmentId,payment_id:payment.id,provider_status:payment.status,internal_status:status});
    return new Response("ok",{status:200});
  }catch(e){console.error("[mp-webhook:failed]",{message:String((e as any)?.message||e)});return new Response("error",{status:500})}
});

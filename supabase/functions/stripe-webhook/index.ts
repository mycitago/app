import { cors,json,adminClient } from "../_shared/stripe.ts";

const enc=new TextEncoder();

function hex(bytes:ArrayBuffer){
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function timingSafe(a:string,b:string){
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
async function verify(raw:string,header:string){
  const secret=Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if(!secret)throw new Error("STRIPE_WEBHOOK_SECRET missing");
  const parts=header.split(",").map(x=>x.split("="));
  const t=parts.find(x=>x[0]==="t")?.[1];
  const signatures=parts.filter(x=>x[0]==="v1").map(x=>x[1]);
  if(!t||!signatures.length)return false;
  const age=Math.abs(Date.now()/1000-Number(t));
  if(!Number.isFinite(age)||age>300)return false;
  const key=await crypto.subtle.importKey(
    "raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]
  );
  const digest=hex(await crypto.subtle.sign("HMAC",key,enc.encode(`${t}.${raw}`)));
  return signatures.some(s=>timingSafe(digest,s));
}
function isoFromUnix(v:any){
  const n=Number(v);
  return Number.isFinite(n)&&n>0?new Date(n*1000).toISOString():null;
}
function mapSubscriptionStatus(s:string){
  if(["active","trialing"].includes(s))return s==="trialing"?"trial":"active";
  if(["past_due","unpaid"].includes(s))return "past_due";
  if(["canceled","incomplete_expired"].includes(s))return "canceled";
  return s||"inactive";
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const raw=await req.text();
  const signature=req.headers.get("Stripe-Signature")||"";
  try{
    if(!(await verify(raw,signature)))return json({error:"invalid_signature"},400);
    const event=JSON.parse(raw);
    const admin=adminClient();

    const prior=await admin.from("payment_events")
      .select("id,processed")
      .eq("provider_event_id",event.id)
      .maybeSingle();
    if(prior.data?.processed)return json({received:true,duplicate:true});

    await admin.from("payment_events").upsert({
      provider:"stripe",
      provider_event_id:event.id,
      account_id:event.account||null,
      event_type:event.type,
      payload:event,
      processed:false,
      received_at:new Date().toISOString()
    },{onConflict:"provider_event_id"});

    const obj=event.data?.object||{};
    const metadata=obj.metadata||{};
    const flow=metadata.flow||null;

    if(event.type==="checkout.session.completed"){
      if(flow==="customer_payment"){
        await admin.from("customer_payments").update({
          status:obj.payment_status==="paid"?"paid":"pending",
          provider_payment_intent_id:obj.payment_intent||null,
          payment_method:obj.payment_method_types?.[0]||null,
          paid_at:obj.payment_status==="paid"?new Date().toISOString():null,
          updated_at:new Date().toISOString()
        }).eq("provider_session_id",obj.id);
      }

      if(flow==="platform_subscription"){
        const businessId=metadata.business_id;
        if(businessId){
          await admin.from("platform_billing_accounts").upsert({
            business_id:businessId,
            stripe_customer_id:typeof obj.customer==="string"?obj.customer:null,
            stripe_subscription_id:typeof obj.subscription==="string"?obj.subscription:null,
            plan_id:metadata.plan_id||null,
            status:"active",
            livemode:Boolean(event.livemode),
            updated_at:new Date().toISOString()
          });
        }
      }
    }

    if(event.type==="checkout.session.async_payment_succeeded"){
      if(flow==="customer_payment"){
        await admin.from("customer_payments").update({
          status:"paid",
          provider_payment_intent_id:obj.payment_intent||null,
          paid_at:new Date().toISOString(),
          updated_at:new Date().toISOString()
        }).eq("provider_session_id",obj.id);
      }
    }

    if(event.type==="checkout.session.async_payment_failed"){
      if(flow==="customer_payment"){
        await admin.from("customer_payments").update({
          status:"failed",updated_at:new Date().toISOString()
        }).eq("provider_session_id",obj.id);
      }
    }

    if(["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(event.type)){
      const businessId=metadata.business_id;
      if(businessId){
        const status=mapSubscriptionStatus(obj.status);
        const periodEnd=isoFromUnix(obj.current_period_end);
        await admin.from("platform_billing_accounts").upsert({
          business_id:businessId,
          stripe_customer_id:typeof obj.customer==="string"?obj.customer:null,
          stripe_subscription_id:obj.id,
          plan_id:metadata.plan_id||null,
          status,
          current_period_end:periodEnd,
          livemode:Boolean(event.livemode),
          updated_at:new Date().toISOString()
        });
        const patch:any={status,updated_at:new Date().toISOString()};
        if(periodEnd)patch.current_period_end=periodEnd.slice(0,10);
        if(metadata.plan_id)patch.plan_id=metadata.plan_id;
        await admin.from("subscriptions").update(patch).eq("business_id",businessId);
      }
    }

    if(event.type==="invoice.paid"||event.type==="invoice.payment_failed"){
      const subscriptionId=typeof obj.subscription==="string"?obj.subscription:null;
      if(subscriptionId){
        const {data:billing}=await admin.from("platform_billing_accounts")
          .select("business_id")
          .eq("stripe_subscription_id",subscriptionId)
          .maybeSingle();
        if(billing?.business_id){
          const good=event.type==="invoice.paid";
          await admin.from("platform_billing_accounts").update({
            status:good?"active":"past_due",
            updated_at:new Date().toISOString()
          }).eq("business_id",billing.business_id);
          await admin.from("subscriptions").update({
            status:good?"active":"past_due",
            updated_at:new Date().toISOString()
          }).eq("business_id",billing.business_id);
        }
      }
    }

    await admin.from("payment_events").update({
      processed:true,
      processed_at:new Date().toISOString(),
      error_message:null
    }).eq("provider_event_id",event.id);

    return json({received:true});
  }catch(e){
    const msg=String(e?.message||e);
    try{
      const event=JSON.parse(raw);
      const admin=adminClient();
      await admin.from("payment_events").upsert({
        provider:"stripe",
        provider_event_id:event.id||crypto.randomUUID(),
        account_id:event.account||null,
        event_type:event.type||"unknown",
        payload:event,
        processed:false,
        error_message:msg
      },{onConflict:"provider_event_id"});
    }catch(_){}
    console.error("[MyCitaGo Stripe webhook]",msg);
    return json({error:"webhook_processing_failed"},500);
  }
});

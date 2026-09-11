import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...CORS,"Content-Type":"application/json"}})}
function env(name:string){const v=Deno.env.get(name);if(!v)throw new Error(`${name} missing`);return v.trim()}
function adminClient(){return createClient(env("SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}})}
function appUrl(){return (Deno.env.get("APP_PUBLIC_URL")||"https://mycitago.github.io/app").trim().replace(/\/+$/,"")}
function money2(v:number){return Math.round((Number(v)+Number.EPSILON)*100)/100}
function paymentAmount(price:number,mode:string,deposit:number){const p=Number(price||0),v=Number(deposit||0);if(mode==="full")return money2(p);if(mode==="fixed")return money2(Math.min(p,v));if(mode==="percentage")return money2(Math.min(p,p*Math.min(100,Math.max(0,v))/100));return 0}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
  let stage="start";
  try{
    const body=await req.json().catch(()=>({}));
    const appointmentId=String(body?.appointment_id||"").trim();
    const accessToken=String(body?.access_token||"").trim();
    if(!appointmentId||!accessToken)throw new Error("appointment_id_and_access_token_required");
    const admin=adminClient();

    stage="appointment_lookup";
    const {data:appointment,error:appointmentError}=await admin.from("appointments").select("id,business_id,service_id,status,access_token,price_charged,customer_id").eq("id",appointmentId).eq("access_token",accessToken).maybeSingle();
    if(appointmentError)throw new Error(`appointment_lookup_failed: ${appointmentError.message}`);
    if(!appointment)throw new Error("appointment_not_found");
    if(["cancelada","cancelled"].includes(String(appointment.status||"").toLowerCase()))throw new Error("appointment_cancelled");

    stage="business_service_lookup";
    const [{data:business,error:businessError},{data:service,error:serviceError}]=await Promise.all([
      admin.from("businesses").select("id,name,slug").eq("id",appointment.business_id).single(),
      admin.from("services").select("id,name").eq("id",appointment.service_id).single()
    ]);
    if(businessError||!business)throw new Error("business_lookup_failed");
    if(serviceError||!service)throw new Error("service_lookup_failed");

    stage="payment_settings";
    const {data:settings,error:settingsError}=await admin.from("business_payment_settings").select("*").eq("business_id",appointment.business_id).maybeSingle();
    if(settingsError)throw new Error(`payment_settings_failed: ${settingsError.message}`);
    if(!settings?.online_payments_enabled||settings.collection_mode==="none")throw new Error("online_payments_disabled");
    const amount=paymentAmount(Number(appointment.price_charged),String(settings.collection_mode||"none"),Number(settings.deposit_value||0));
    if(!(amount>0))throw new Error("invalid_payment_amount");

    stage="connection_lookup";
    const [{data:account,error:accountError},{data:secret,error:secretError}]=await Promise.all([
      admin.from("business_payment_accounts").select("provider,provider_user_id,connection_status,livemode").eq("business_id",appointment.business_id).eq("provider","mercadopago").maybeSingle(),
      admin.from("business_payment_secrets").select("access_token,token_expires_at,provider_user_id,livemode").eq("business_id",appointment.business_id).eq("provider","mercadopago").maybeSingle()
    ]);
    if(accountError)throw new Error(`payment_account_failed: ${accountError.message}`);
    if(secretError)throw new Error(`payment_secret_failed: ${secretError.message}`);
    if(account?.connection_status!=="connected"||!secret?.access_token)throw new Error("mercadopago_not_connected");
    if(secret.token_expires_at&&new Date(secret.token_expires_at).getTime()<=Date.now())throw new Error("mercadopago_reauth_required");

    stage="existing_payment";
    const {data:existing,error:existingError}=await admin.from("customer_payments").select("*").eq("appointment_id",appointment.id).eq("provider","mercadopago").maybeSingle();
    if(existingError)throw new Error(`payment_lookup_failed: ${existingError.message}`);
    if(existing?.status==="paid")return json({ok:true,already_paid:true,status:"paid",amount:Number(existing.amount)});
    if(existing?.checkout_url&&existing?.status==="pending")return json({ok:true,url:existing.checkout_url,preference_id:existing.provider_preference_id,reused:true});

    stage="preference_create";
    const base=appUrl(),slug=encodeURIComponent(business.slug||""),returnBase=`${base}/reservar.html?n=${slug}`;
    const excluded:Array<{id:string}>=[];
    if(!settings.prefer_card)excluded.push({id:"credit_card"},{id:"debit_card"});
    if(!settings.prefer_oxxo)excluded.push({id:"ticket"});
    if(!settings.prefer_spei)excluded.push({id:"bank_transfer"});
    const pref:any={
      items:[{id:appointment.id,title:`${service.name} · ${business.name}`,quantity:1,currency_id:"MXN",unit_price:amount}],
      external_reference:appointment.id,
      metadata:{appointment_id:appointment.id,business_id:appointment.business_id},
      back_urls:{success:`${returnBase}&payment=approved`,pending:`${returnBase}&payment=pending`,failure:`${returnBase}&payment=failure`},
      auto_return:"approved",
      notification_url:`${env("SUPABASE_URL")}/functions/v1/mp-webhook`
    };
    if(excluded.length)pref.payment_methods={excluded_payment_types:excluded};

    const res=await fetch("https://api.mercadopago.com/checkout/preferences",{method:"POST",headers:{Authorization:`Bearer ${secret.access_token}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(pref)});
    const text=await res.text();let data:any={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}};
    if(!res.ok||!data?.id){console.error("[mp-customer-checkout:preference-error]",{status:res.status,error:data?.message||data?.error||data});throw new Error(data?.message||"mercadopago_preference_failed")}
    const checkoutUrl=(!secret.livemode&&data.sandbox_init_point)?data.sandbox_init_point:data.init_point;
    if(!checkoutUrl)throw new Error("mercadopago_checkout_url_missing");

    stage="payment_save";
    const {error:saveError}=await admin.from("customer_payments").upsert({business_id:appointment.business_id,appointment_id:appointment.id,provider:"mercadopago",provider_preference_id:String(data.id),external_reference:appointment.id,checkout_url:checkoutUrl,amount,currency:"mxn",collection_mode:settings.collection_mode,status:"pending",provider_status:"preference_created",payment_method:null,paid_at:null,last_error:null,updated_at:new Date().toISOString()},{onConflict:"appointment_id,provider"});
    if(saveError)throw new Error(`payment_save_failed: ${saveError.message}`);

    console.log("[mp-customer-checkout:ok]",{appointment_id:appointment.id,business_id:appointment.business_id,preference_id:data.id,amount});
    return json({ok:true,url:checkoutUrl,preference_id:data.id,amount,provider:"mercadopago"});
  }catch(e){const message=String((e as any)?.message||e);console.error("[mp-customer-checkout:failed]",{stage,message});return json({ok:false,stage,error:message},400)}
});

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
Deno.serve(async(req)=>{
 if(req.method!=="POST") return new Response("Method not allowed",{status:405});
 const expected=Deno.env.get("DISPATCHER_SECRET")??""; const supplied=req.headers.get("x-dispatcher-secret")??"";
 if(!expected||supplied!==expected) return Response.json({error:"forbidden"},{status:403});
 const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), webhook=Deno.env.get("NOTIFICATION_WEBHOOK_URL"), token=Deno.env.get("NOTIFICATION_WEBHOOK_TOKEN")??"";
 if(!url||!key) return Response.json({error:"supabase_env_missing"},{status:500});
 const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}); const collectors:Record<string,unknown>={};
 for(const [name,args] of [["platform_collect_operational_alerts",{}],["platform_queue_daily_alert_digest",{}],["platform_queue_billing_reminders",{}]] as const){const {data,error}=await sb.rpc(name,args); collectors[name]=error?{error:error.message}:data;}
 const {data:jobs,error:claimError}=await sb.rpc("platform_claim_notification_batch",{p_limit:25}); if(claimError) return Response.json({error:claimError.message,collectors},{status:500});
 let sent=0,failed=0; const results:unknown[]=[];
 for(const job of jobs??[]){let ok=false,errorText="",status:number|null=null; if(!webhook){errorText="notification_webhook_not_configured";}else{try{const res=await fetch(webhook,{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify({id:job.id,kind:job.kind,channel:job.channel,business_id:job.business_id,recipient:job.recipient,subject:job.subject,body:job.body,payload:job.payload})});status=res.status;ok=res.ok;if(!ok)errorText=`transport_http_${res.status}: ${await res.text()}`;}catch(e){errorText=e instanceof Error?e.message:String(e);}} const {error:completeError}=await sb.rpc("platform_complete_notification",{p_id:job.id,p_ok:ok,p_error:ok?null:errorText}); if(completeError){failed++;results.push({id:job.id,ok:false,completion_error:completeError.message});continue;} if(ok)sent++;else failed++;results.push({id:job.id,ok,status,error:ok?null:errorText});}
 return Response.json({collectors,claimed:jobs?.length??0,sent,failed,results},{status:failed?207:200});
});

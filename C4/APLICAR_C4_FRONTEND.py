from pathlib import Path
import shutil,datetime
ROOT=Path(__file__).resolve().parent
if not (ROOT/"js/platform-api.js").exists() and (ROOT.parent/"js/platform-api.js").exists(): ROOT=ROOT.parent
files=["js/platform-api.js","js/admin-platform.js"]
texts={p:(ROOT/p).read_text(encoding="utf-8") for p in files}
def repl(rel,old,new,label):
 c=texts[rel].count(old)
 if c!=1: raise RuntimeError(f"{label}: esperaba 1 coincidencia, encontré {c}. No se escribió nada.")
 texts[rel]=texts[rel].replace(old,new,1)
repl("js/platform-api.js","    readSupport:()=>rpc('platform_read_support'),","    readSupport:()=>rpc('platform_read_support_v2'),\n    updateSupportTicket:(id,{priority=null,assignedTo=null,clearAssignee=false,status=null}={})=>supabaseClient.rpc('platform_update_support_ticket',{p_ticket_id:id,p_priority:priority,p_assigned_to:assignedTo,p_clear_assignee:clearAssignee,p_status:status}),","api")
repl("js/admin-platform.js","async function updateTicketStatus(id,status){const payload={status,updated_at:new Date().toISOString(),resolved_at:status==='resolved'?new Date().toISOString():null};const {error}=await supabaseClient.from('support_tickets').update(payload).eq('id',id);if(error)return toast('No se pudo actualizar ticket: '+error.message);toast('Ticket actualizado');await loadOperationsModules()}","async function updateTicketStatus(id,status){const {error}=await PlatformAPI.updateSupportTicket(id,{status});if(error)return toast('No se pudo actualizar ticket: '+error.message);toast('Ticket actualizado');await loadOperationsModules()}\nasync function updateTicketPriority(id,priority){const {error}=await PlatformAPI.updateSupportTicket(id,{priority});if(error)return toast('No se pudo actualizar prioridad: '+error.message);toast('Prioridad actualizada');await loadOperationsModules()}\nasync function assignTicketToMe(id){const {data:{session}}=await supabaseClient.auth.getSession();const uid=session?.user?.id;if(!uid)return toast('Sesión no disponible');const {error}=await PlatformAPI.updateSupportTicket(id,{assignedTo:uid});if(error)return toast('No se pudo asignar: '+error.message);toast('Ticket asignado');await loadOperationsModules()}\nasync function clearTicketAssignee(id){const {error}=await PlatformAPI.updateSupportTicket(id,{clearAssignee:true});if(error)return toast('No se pudo liberar: '+error.message);toast('Ticket liberado');await loadOperationsModules()}","ticket actions")
old="const actions=document.createElement('div');actions.className='platform-ticket-actions';actions.appendChild(select);const reply=document.createElement('button');reply.type='button';reply.textContent='Responder';reply.onclick=()=>replyTicket(t);actions.appendChild(reply);"
new="const actions=document.createElement('div');actions.className='platform-ticket-actions';const priority=document.createElement('select');priority.setAttribute('aria-label','Prioridad del ticket');[['low','Baja'],['normal','Normal'],['high','Alta'],['urgent','Urgente']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;o.selected=(t.priority||'normal')===v;priority.appendChild(o)});priority.onchange=()=>updateTicketPriority(t.id,priority.value);actions.append(priority,select);const assign=document.createElement('button');assign.type='button';assign.textContent=t.assigned_to?'Liberar':'Asignarme';assign.onclick=()=>t.assigned_to?clearTicketAssignee(t.id):assignTicketToMe(t.id);actions.appendChild(assign);const reply=document.createElement('button');reply.type='button';reply.textContent='Responder';reply.onclick=()=>replyTicket(t);actions.appendChild(reply);"
repl("js/admin-platform.js",old,new,"support controls")
stamp=datetime.datetime.now().strftime("%Y%m%d_%H%M%S"); backup=ROOT/f"_backup_C4_{stamp}"
for rel in files:
 dst=backup/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/rel,dst)
for rel in files:(ROOT/rel).write_text(texts[rel],encoding="utf-8")
print("C4 frontend aplicado. Backup:",backup)

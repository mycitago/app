from pathlib import Path
import shutil, datetime

ROOT = Path(__file__).resolve().parent
if not (ROOT / "js" / "admin-agenda.js").exists():
    if (ROOT.parent / "js" / "admin-agenda.js").exists():
        ROOT = ROOT.parent

FILES = [
    "js/admin-agenda.js",
    "js/admin-customers.js",
    "js/admin-team.js",
    "js/admin-branches.js",
]
missing = [f for f in FILES if not (ROOT / f).exists()]
if missing:
    raise SystemExit("Faltan archivos:\n- " + "\n- ".join(missing))

texts = {f:(ROOT/f).read_text(encoding="utf-8") for f in FILES}
changes = {f:[] for f in FILES}

def plan(rel, old, new, label):
    count = texts[rel].count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: esperaba 1 coincidencia exacta en {rel} y encontré {count}. "
            "NO se escribió ningún archivo."
        )
    texts[rel] = texts[rel].replace(old, new, 1)
    changes[rel].append(label)

# AGENDA — metadata: no convertir errores en listas vacías.
plan("js/admin-agenda.js",
"""async function loadMeta(){const [br,st,sv]=await Promise.all([supabaseClient.from('business_branches').select('id,name,is_primary,active').eq('business_id',agendaBiz.id).eq('active',true).order('is_primary',{ascending:false}),supabaseClient.from('staff').select('id,name,branch_id,active').eq('business_id',agendaBiz.id).eq('active',true).order('name'),supabaseClient.from('services').select('id,name,active').eq('business_id',agendaBiz.id).eq('active',true).order('name')]);agendaBranches=br.data||[];agendaStaff=st.data||[];agendaServices=sv.data||[];fill(A('agenda-branch-filter'),agendaBranches,'Todas las sucursales');fill(A('agenda-staff-filter'),agendaStaff,'Todos los profesionales');fill(A('agenda-service-filter'),agendaServices,'Todos los servicios')}""",
"""async function loadMeta(){const [br,st,sv]=await Promise.all([supabaseClient.from('business_branches').select('id,name,is_primary,active').eq('business_id',agendaBiz.id).eq('active',true).order('is_primary',{ascending:false}),supabaseClient.from('staff').select('id,name,branch_id,active').eq('business_id',agendaBiz.id).eq('active',true).order('name'),supabaseClient.from('services').select('id,name,active').eq('business_id',agendaBiz.id).eq('active',true).order('name')]);if(br.error||st.error||sv.error)throw(br.error||st.error||sv.error);agendaBranches=br.data||[];agendaStaff=st.data||[];agendaServices=sv.data||[];fill(A('agenda-branch-filter'),agendaBranches,'Todas las sucursales');fill(A('agenda-staff-filter'),agendaStaff,'Todos los profesionales');fill(A('agenda-service-filter'),agendaServices,'Todos los servicios')}""",
"A2-AGENDA-META")

# AGENDA — error técnico explícito, sin 0 falso.
plan("js/admin-agenda.js",
"""async function loadAgenda(){const [from,to]=rangeForView().map(dateKey);let q=supabaseClient.from('appointments').select('id,business_id,branch_id,staff_id,service_id,appointment_date,start_time,end_time,status,duration_charged,customers(name,whatsapp),services(name,duration_minutes)').eq('business_id',agendaBiz.id).gte('appointment_date',from).lte('appointment_date',to).order('appointment_date').order('start_time');const {data,error}=await q;if(error){console.error(error);agendaItems=[]}else agendaItems=data||[];renderAgenda()}""",
"""async function loadAgenda(){const [from,to]=rangeForView().map(dateKey);let q=supabaseClient.from('appointments').select('id,business_id,branch_id,staff_id,service_id,appointment_date,start_time,end_time,status,duration_charged,customers(name,whatsapp),services(name,duration_minutes)').eq('business_id',agendaBiz.id).gte('appointment_date',from).lte('appointment_date',to).order('appointment_date').order('start_time');const {data,error}=await q;if(error){console.error(error);agendaItems=[];if(A('agenda-count'))A('agenda-count').textContent='—';if(A('agenda-confirmed'))A('agenda-confirmed').textContent='—';if(A('agenda-utilization'))A('agenda-utilization').textContent='—';if(A('agenda-list')){A('agenda-list').innerHTML='<div class="agenda-empty"><b>No pudimos cargar la agenda.</b><br><button type="button" id="agenda-retry">Reintentar</button></div>';A('agenda-retry')?.addEventListener('click',loadAgenda)}return}agendaItems=data||[];renderAgenda()}""",
"A2-AGENDA-DATA")

plan("js/admin-agenda.js",
"""async function initAgenda(){const s=await requireAuth();if(!s)return;agendaBiz=await getMyBusiness(s.user);if(!agendaBiz)return;anchorDate=new Date();await loadMeta();document.querySelectorAll('[data-agenda-view]').forEach(b=>b.onclick=()=>{agendaView=b.dataset.agendaView;localStorage.setItem('mycitago:agenda:view',agendaView);loadAgenda()});""",
"""async function initAgenda(){const s=await requireAuth();if(!s)return;agendaBiz=await getMyBusiness(s.user);if(!agendaBiz)return;anchorDate=new Date();try{await loadMeta()}catch(error){console.error(error);if(A('agenda-count'))A('agenda-count').textContent='—';if(A('agenda-confirmed'))A('agenda-confirmed').textContent='—';if(A('agenda-utilization'))A('agenda-utilization').textContent='—';if(A('agenda-list'))A('agenda-list').innerHTML='<div class="agenda-empty"><b>No pudimos cargar sucursales, personal o servicios.</b><br>Revisa tu conexión y vuelve a intentarlo.</div>';return}document.querySelectorAll('[data-agenda-view]').forEach(b=>b.onclick=()=>{agendaView=b.dataset.agendaView;localStorage.setItem('mycitago:agenda:view',agendaView);loadAgenda()});""",
"A2-AGENDA-INIT")

# CLIENTES — no dejar pantalla vieja/placeholder cuando falla customer_crm.
plan("js/admin-customers.js",
"""if(error){console.error(error);return}rows=data||[];""",
"""if(error){console.error(error);['k-total','k-freq','k-inactive','k-value'].forEach(id=>{const el=$(id);if(el)el.textContent='—'});const body=$('customer-list');const empty=$('customer-empty');if(empty)empty.hidden=true;if(body){body.innerHTML='<tr><td colspan="7"><div class="ct-empty"><b>No pudimos cargar tus clientes.</b><br><button type="button" class="ct-btn ct-btn-secondary" id="customer-retry">Reintentar</button></div></td></tr>';document.getElementById('customer-retry')?.addEventListener('click',()=>location.reload())}return}rows=data||[];""",
"A2-CLIENTES")

# EQUIPO — error real, no diagnóstico falso de migración.
plan("js/admin-team.js",
"""try{await loadTeamData()}catch(e){T('members').innerHTML='<div class="team-empty"><b>Activa el nuevo módulo de Equipo</b><span>Ejecuta SUPABASE_V6_MASTER.sql y vuelve a cargar.</span></div>';console.error(e)}}""",
"""try{await loadTeamData()}catch(e){T('members').innerHTML='<div class="team-empty"><b>No pudimos cargar el equipo.</b><span>Revisa tu conexión o permisos y vuelve a intentarlo.</span><button class="ct-btn ct-btn-secondary" id="team-retry">Reintentar</button></div>';T('team-retry')?.addEventListener('click',()=>location.reload());console.error(e)}}""",
"A2-EQUIPO")

# SUCURSALES — distinguir vacío real de error técnico.
plan("js/admin-branches.js",
"""||'<div class="team-empty">No hay sucursales. Ejecuta la migración para crear la principal.</div>'""",
"""||'<div class="team-empty"><b>Aún no hay sucursales.</b><span>Crea la primera sucursal para configurar dirección, horario y zona horaria.</span></div>'""",
"A2-SUCURSALES-VACIO")

plan("js/admin-branches.js",
"""try{await loadBranches()}catch(e){R('branches').innerHTML='<div class="team-empty"><b>Activa Sucursales</b><span>Ejecuta SUPABASE_V6_MASTER.sql y recarga.</span></div>'}}""",
"""try{await loadBranches()}catch(e){console.error(e);R('branches').innerHTML='<div class="team-empty"><b>No pudimos cargar las sucursales.</b><span>Revisa tu conexión o permisos y vuelve a intentarlo.</span><button class="ct-btn ct-btn-secondary" id="branches-retry">Reintentar</button></div>';R('branches-retry')?.addEventListener('click',()=>location.reload())}}""",
"A2-SUCURSALES-ERROR")

# Todas las validaciones pasaron. AHORA y solo ahora se crea backup y se escribe.
stamp=datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
backup=ROOT/f"_backup_A2_{stamp}"
for rel in FILES:
    dst=backup/rel
    dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(ROOT/rel,dst)

for rel in FILES:
    (ROOT/rel).write_text(texts[rel],encoding="utf-8")
    print("OK",rel,"=>",", ".join(changes[rel]))

print("\nA2 aplicado completo.")
print("Backup:",backup)
print("No se modificó admin-auth.js, CSS, SQL ni RLS.")

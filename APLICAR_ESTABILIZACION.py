from pathlib import Path
import shutil, re, sys, datetime

ROOT = Path(__file__).resolve().parent
# El script puede estar en la raíz del repo o dentro de un paquete extraído.
if not (ROOT / "js" / "admin-auth.js").exists():
    candidate = ROOT.parent
    if (candidate / "js" / "admin-auth.js").exists():
        ROOT = candidate

required = [
    "js/admin-auth.js","js/admin-agenda.js","js/admin-customers.js",
    "js/admin-team.js","js/admin-branches.js","js/admin-services.js",
    "css/citago-admin.css","css/admin-reports.css"
]
missing=[p for p in required if not (ROOT/p).exists()]
if missing:
    raise SystemExit("Faltan archivos del repo actual:\n- " + "\n- ".join(missing))

stamp=datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
backup=ROOT/f"_backup_pre_estabilizacion_{stamp}"
backup.mkdir()

def backup_file(rel):
    src=ROOT/rel; dst=backup/rel; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)

def replace_once(rel, old, new, label):
    p=ROOT/rel; txt=p.read_text(encoding="utf-8")
    if old not in txt:
        raise RuntimeError(f"{label}: no encontré el bloque esperado en {rel}. No se modificó ese archivo.")
    backup_file(rel)
    p.write_text(txt.replace(old,new,1),encoding="utf-8")
    print("OK",label,rel)

# A1 / ROOT-01 — jamás convertir error técnico en paywall.
replace_once("js/admin-auth.js",
"""async function getMySubscription(businessId) {
  const { data } = await supabaseClient
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();
  return data || null;
}""",
"""async function getMySubscription(businessId) {
  const { data, error } = await supabaseClient
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error) {
    const wrapped = new Error('No se pudo verificar la suscripción. Revisa tu conexión e inténtalo de nuevo.');
    wrapped.code = 'subscription_lookup_failed';
    wrapped.cause = error;
    throw wrapped;
  }
  return data || null;
}""","A1-getMySubscription")

replace_once("js/admin-auth.js",
"""  const sub = await getMySubscription(business.id);
  if (subscriptionExpired(sub)) {
    showPaywall(sub);
    return null;
  }""",
"""  let sub;
  try {
    sub = await getMySubscription(business.id);
  } catch (subscriptionError) {
    console.error('Error verificando suscripción:', subscriptionError?.cause || subscriptionError);
    showAccessLoadError(
      'No pudimos verificar tu suscripción',
      'Tu acceso no fue bloqueado. Hubo un problema al consultar el estado de tu plan. Revisa tu conexión y vuelve a intentarlo.'
    );
    return null;
  }

  if (subscriptionExpired(sub)) {
    showPaywall(sub);
    return null;
  }""","A1-getMyBusiness")

# Inserta estado técnico explícito antes de showPaywall.
p=ROOT/"js/admin-auth.js"; txt=p.read_text(encoding="utf-8")
marker="function showPaywall(sub) {"
if "function showAccessLoadError(" not in txt:
    backup_file("js/admin-auth.js")
    helper="""function showAccessLoadError(title, message) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f5f9;padding:20px;">
      <div style="width:min(92vw,460px);background:#fff;border:1px solid #e7e4ed;border-radius:18px;padding:28px 24px;text-align:center;box-shadow:0 12px 36px rgba(30,27,46,.09);font-family:Manrope,Inter,system-ui,sans-serif;">
        <div style="font-size:36px;">↻</div>
        <h1 style="margin:10px 0 8px;font-size:22px;">${title}</h1>
        <p style="color:#737080;line-height:1.55;margin:0 0 18px;">${message}</p>
        <button style="border:0;border-radius:10px;padding:11px 16px;background:#7c3aed;color:#fff;font-weight:700;cursor:pointer" onclick="location.reload()">Reintentar</button>
      </div>
    </div>`;
}

"""
    txt=txt.replace(marker,helper+marker,1)
    p.write_text(txt,encoding="utf-8")
    print("OK A1-access-error-helper js/admin-auth.js")

# A2 / ROOT-04 Agenda: errores de metadatos y citas visibles, no 0 falso.
p=ROOT/"js/admin-agenda.js"; txt=p.read_text(encoding="utf-8"); backup_file("js/admin-agenda.js")
txt=txt.replace(
"agendaBranches=br.data||[];agendaStaff=st.data||[];agendaServices=sv.data||[];",
"if(br.error||st.error||sv.error)throw (br.error||st.error||sv.error);agendaBranches=br.data||[];agendaStaff=st.data||[];agendaServices=sv.data||[];"
)
txt=txt.replace(
"if(error){console.error(error);agendaItems=[]}else agendaItems=data||[];renderAgenda()",
"if(error){console.error(error);const root=A('agenda-list');if(root)root.innerHTML='<div class=\"agenda-empty\"><b>No pudimos cargar la agenda.</b><br><button type=\"button\" id=\"agenda-retry\">Reintentar</button></div>';A('agenda-count').textContent='—';A('agenda-confirmed').textContent='—';A('agenda-utilization').textContent='—';A('agenda-retry')?.addEventListener('click',loadAgenda);return}else agendaItems=data||[];renderAgenda()"
)
txt=txt.replace(
"anchorDate=new Date();await loadMeta();",
"anchorDate=new Date();try{await loadMeta()}catch(error){console.error(error);const root=A('agenda-list');if(root)root.innerHTML='<div class=\"agenda-empty\"><b>No pudimos cargar sucursales, personal o servicios.</b><br>Revisa tu conexión y vuelve a intentarlo.</div>';return;}"
)
p.write_text(txt,encoding="utf-8"); print("OK A2 agenda")

# A2 Clientes
p=ROOT/"js/admin-customers.js"; txt=p.read_text(encoding="utf-8"); backup_file("js/admin-customers.js")
txt=txt.replace(
"if(error){console.error(error);return}rows=data||[];",
"""if(error){console.error(error);['k-total','k-freq','k-inactive','k-value'].forEach(id=>{const el=$(id);if(el)el.textContent='—'});const body=$('customer-list');if(body){body.innerHTML='<tr><td colspan="7"><div class="ct-empty"><b>No pudimos cargar tus clientes.</b><br><button type="button" class="ct-btn ct-btn-secondary" id="customer-retry">Reintentar</button></div></td></tr>';document.getElementById('customer-retry')?.addEventListener('click',()=>location.reload())}return}rows=data||[];"""
)
p.write_text(txt,encoding="utf-8"); print("OK A2 clientes")

# A2 Equipo / Sucursales: no diagnosticar migración ante cualquier excepción.
p=ROOT/"js/admin-team.js"; txt=p.read_text(encoding="utf-8"); backup_file("js/admin-team.js")
txt=txt.replace(
"""T('members').innerHTML='<div class="team-empty"><b>Activa el nuevo módulo de Equipo</b><span>Ejecuta SUPABASE_V6_MASTER.sql y vuelve a cargar.</span></div>';console.error(e)""",
"""T('members').innerHTML='<div class="team-empty"><b>No pudimos cargar el equipo.</b><span>Revisa tu conexión o permisos y vuelve a intentarlo.</span><button class="ct-btn ct-btn-secondary" id="team-retry">Reintentar</button></div>';T('team-retry')?.addEventListener('click',()=>location.reload());console.error(e)"""
)
p.write_text(txt,encoding="utf-8"); print("OK A2 equipo")

p=ROOT/"js/admin-branches.js"; txt=p.read_text(encoding="utf-8"); backup_file("js/admin-branches.js")
txt=txt.replace(
"""R('branches').innerHTML='<div class="team-empty"><b>Activa Sucursales</b><span>Ejecuta SUPABASE_V6_MASTER.sql y recarga.</span></div>'""",
"""R('branches').innerHTML='<div class="team-empty"><b>No pudimos cargar las sucursales.</b><span>Revisa tu conexión o permisos y vuelve a intentarlo.</span><button class="ct-btn ct-btn-secondary" id="branches-retry">Reintentar</button></div>';R('branches-retry')?.addEventListener('click',()=>location.reload())"""
)
# Estado vacío honesto
txt=txt.replace(
"""||'<div class="team-empty">No hay sucursales. Ejecuta la migración para crear la principal.</div>'""",
"""||'<div class="team-empty"><b>Aún no hay sucursales.</b><span>Crea la primera sucursal para configurar dirección, horario y zona horaria.</span></div>'"""
)
p.write_text(txt,encoding="utf-8"); print("OK A2 sucursales")

# A3 / ROOT-08 — scoping de mutaciones por business_id.
p=ROOT/"js/admin-services.js"; txt=p.read_text(encoding="utf-8"); backup_file("js/admin-services.js")
txt=txt.replace(
"supabaseClient.from('services').update({active}).eq('id',id)",
"supabaseClient.from('services').update({active}).eq('id',id).eq('business_id',biz.id)"
)
txt=txt.replace(
"? supabaseClient.from('services').update(payload).eq('id',id).select('id').single()",
"? supabaseClient.from('services').update(payload).eq('id',id).eq('business_id',biz.id).select('id').single()"
)
txt=txt.replace(
"supabaseClient.from('blocked_times').delete().eq('id',id)",
"supabaseClient.from('blocked_times').delete().eq('id',id).eq('business_id',biz.id)"
)

# D / ROOT-09 — no presentar precios inventados como recomendación.
txt=re.sub(r",suggestedPrice:\d+", "", txt)
txt=txt.replace("template.suggestedPrice", "null")
txt=txt.replace("t.suggestedPrice", "null")
p.write_text(txt,encoding="utf-8"); print("OK A3/D servicios")

# G / ROOT-11 — escala mínima legible en reportes.
p=ROOT/"css/admin-reports.css"; txt=p.read_text(encoding="utf-8"); backup_file("css/admin-reports.css")
txt=re.sub(r"font-size:\s*8px", "font-size:11px", txt)
txt=re.sub(r"font-size:\s*9px", "font-size:11px", txt)
p.write_text(txt,encoding="utf-8"); print("OK G reportes")

# C1 parcial seguro: mejorar tipografía del shell base sin crear V4.
p=ROOT/"css/citago-admin.css"; txt=p.read_text(encoding="utf-8"); backup_file("css/citago-admin.css")
txt=txt.replace(".ct-search{flex:1;max-width:420px;border:1px solid var(--ct-border);background:#f8f7fa;border-radius:10px;padding:9px 12px;color:var(--ct-muted);font-size:12px}",
                ".ct-search{flex:1;max-width:420px;border:1px solid var(--ct-border);background:#f8f7fa;border-radius:10px;padding:9px 12px;color:var(--ct-muted);font-size:13px}")
txt=txt.replace(".ct-user strong{display:block;font-size:11px}",".ct-user strong{display:block;font-size:13px}")
txt=txt.replace(".ct-user small{display:block;color:var(--ct-muted);font-size:9px}",".ct-user small{display:block;color:var(--ct-muted);font-size:11px}")
p.write_text(txt,encoding="utf-8"); print("OK C1 tipografía shell")

print("\nAplicación terminada.")
print("Backup:", backup)
print("IMPORTANTE: este paquete NO toca RLS, SQL, cobros ni Supabase.")
print("Ejecuta las pruebas descritas en VERIFICACION.md antes de publicar.")

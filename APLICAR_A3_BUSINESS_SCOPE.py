from pathlib import Path
import shutil, datetime
ROOT=Path(__file__).resolve().parent
if not (ROOT/"js/admin-services.js").exists() and (ROOT.parent/"js/admin-services.js").exists(): ROOT=ROOT.parent
target=ROOT/"js/admin-services.js"
if not target.exists(): raise SystemExit("No encontré js/admin-services.js. Coloca este script en la raíz del repo.")
text=target.read_text(encoding="utf-8")
patches=[
("toggleService","const {error} = await supabaseClient.from('services').update({active}).eq('id',id);","const {error} = await supabaseClient.from('services').update({active}).eq('id',id).eq('business_id',biz.id);"),
("saveService update","? supabaseClient.from('services').update(payload).eq('id',id).select('id').single()","? supabaseClient.from('services').update(payload).eq('id',id).eq('business_id',biz.id).select('id').single()"),
("deleteBlock","const {error} = await supabaseClient.from('blocked_times').delete().eq('id',id);","const {error} = await supabaseClient.from('blocked_times').delete().eq('id',id).eq('business_id',biz.id);")
]
for label,old,new in patches:
    c=text.count(old)
    if c!=1: raise RuntimeError(f"{label}: esperaba 1 coincidencia exacta y encontré {c}. No se modificó ningún archivo.")
    text=text.replace(old,new,1)
stamp=datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
backup=ROOT/f"_backup_A3_{stamp}"/"js"/"admin-services.js"; backup.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(target,backup)
target.write_text(text,encoding="utf-8")
print("A3 aplicado correctamente.")
print("Archivo modificado: js/admin-services.js")
print("Backup:",backup.parent.parent)
print("No se modificó SQL, RLS, CSS ni otros módulos.")

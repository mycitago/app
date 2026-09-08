from pathlib import Path
import shutil, datetime

ROOT=Path(__file__).resolve().parent
if not (ROOT/"js/admin-platform.js").exists() and (ROOT.parent/"js/admin-platform.js").exists():
    ROOT=ROOT.parent

target=ROOT/"js/admin-platform.js"
if not target.exists():
    raise SystemExit("No encontré js/admin-platform.js. Coloca este script en la raíz del repo.")

old="async function runBulkAction(kind){const ids=[...platformState.selectedBusinesses];if(!ids.length)return;const action=kind==='suspend'?'suspender':'reactivar';if(!confirm(`¿${action[0].toUpperCase()+action.slice(1)} ${ids.length} negocio(s)? Cada negocio quedará registrado por separado en Auditoría.`))return;const btn=$(kind==='suspend'?'bulk-suspend':'bulk-reactivate');if(btn){btn.disabled=true;btn.textContent='Procesando…'}try{const {data,error}=kind==='suspend'?await PlatformAPI.bulkSuspend(ids):await PlatformAPI.bulkReactivate(ids,30);if(error)throw error;platformState.selectedBusinesses.clear();toast(`${data?.processed??ids.length} negocio(s) procesados`);await loadData()}catch(e){console.error(e);toast('No se pudo completar la acción en lote: '+e.message)}finally{if(btn){btn.textContent=kind==='suspend'?'Suspender seleccionados':'Reactivar seleccionados';updateBulkBar()}}}"
new="async function runBulkAction(kind){\n  const ids=[...platformState.selectedBusinesses];\n  if(!ids.length)return;\n\n  const action=kind==='suspend'?'suspender':'reactivar';\n  if(!confirm(`¿${action[0].toUpperCase()+action.slice(1)} ${ids.length} negocio(s)? Cada negocio quedará registrado por separado en Auditoría.`))return;\n\n  const btn=$(kind==='suspend'?'bulk-suspend':'bulk-reactivate');\n  if(btn){btn.disabled=true;btn.textContent='Procesando…'}\n\n  try{\n    const {data,error}=kind==='suspend'\n      ? await PlatformAPI.bulkSuspend(ids)\n      : await PlatformAPI.bulkReactivate(ids,30);\n\n    if(error)throw error;\n\n    const processed=Number(data?.processed||0);\n    const failed=Number(data?.failed||0);\n    const results=Array.isArray(data?.results)?data.results:[];\n    const failedIds=results.filter(r=>r?.ok===false&&r?.business_id).map(r=>r.business_id);\n\n    platformState.selectedBusinesses.clear();\n    failedIds.forEach(id=>platformState.selectedBusinesses.add(id));\n\n    if(failed>0){\n      const firstError=results.find(r=>r?.ok===false)?.error;\n      toast(`${processed} correctos · ${failed} con error${firstError?`: ${firstError}`:''}`);\n    }else{\n      toast(`${processed} negocio${processed===1?'':'s'} procesado${processed===1?'':'s'} correctamente`);\n    }\n\n    await loadData();\n  }catch(e){\n    console.error(e);\n    toast('No se pudo completar la acción en lote: '+e.message);\n  }finally{\n    if(btn){\n      btn.textContent=kind==='suspend'?'Suspender seleccionados':'Reactivar seleccionados';\n      updateBulkBar();\n    }\n  }\n}"

text=target.read_text(encoding="utf-8")
count=text.count(old)
if count!=1:
    raise RuntimeError(f"C2-frontend: esperaba exactamente 1 bloque runBulkAction y encontré {count}. NO se modificó ningún archivo.")

updated=text.replace(old,new,1)

required=[
    "const failed=Number(data?.failed||0);",
    "failedIds.forEach(id=>platformState.selectedBusinesses.add(id));",
    "correctos · ${failed} con error"
]
for token in required:
    if token not in updated:
        raise RuntimeError("Validación C2 frontend falló: "+token)

stamp=datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
backup=ROOT/f"_backup_C2_FRONTEND_{stamp}"/"js"/"admin-platform.js"
backup.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(target,backup)
target.write_text(updated,encoding="utf-8")

print("C2 frontend aplicado correctamente.")
print("Archivo modificado: js/admin-platform.js")
print("Backup:",backup.parent.parent)
print("No se modificó SQL, RLS ni ningún otro archivo.")

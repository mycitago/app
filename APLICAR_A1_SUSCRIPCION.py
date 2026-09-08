from pathlib import Path
import shutil, datetime

ROOT = Path(__file__).resolve().parent
if not (ROOT / "js" / "admin-auth.js").exists():
    candidate = ROOT.parent
    if (candidate / "js" / "admin-auth.js").exists():
        ROOT = candidate

target = ROOT / "js" / "admin-auth.js"
if not target.exists():
    raise SystemExit("No encontré js/admin-auth.js. Coloca este script en la raíz del repo MyCitaGo/app.")

stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
backup_dir = ROOT / f"_backup_A1_ROOT01_{stamp}"
backup_dir.mkdir(parents=True, exist_ok=True)
backup_file = backup_dir / "js" / "admin-auth.js"
backup_file.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(target, backup_file)

text = target.read_text(encoding="utf-8")
original = text

def replace_exact(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: esperaba exactamente 1 coincidencia y encontré {count}. "
            "Se cancela para evitar aplicar el parche sobre una versión distinta."
        )
    text = text.replace(old, new, 1)

old_get = """async function getMySubscription(businessId) {
  const { data } = await supabaseClient
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();
  return data || null;
}"""

new_get = """async function getMySubscription(businessId) {
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
}"""

replace_exact(old_get, new_get, "A1-1 getMySubscription")

old_call = """  const sub = await getMySubscription(business.id);
  if (subscriptionExpired(sub)) {
    showPaywall(sub);
    return null;
  }"""

new_call = """  let sub;
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
  }"""

replace_exact(old_call, new_call, "A1-2 getMyBusiness")

marker = "function showPaywall(sub) {"
if text.count(marker) != 1:
    raise RuntimeError(
        f"A1-3 showAccessLoadError: esperaba exactamente 1 marcador showPaywall y encontré {text.count(marker)}."
    )

helper = """function showAccessLoadError(title, message) {
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

if "function showAccessLoadError(" in text:
    raise RuntimeError("A1-3: showAccessLoadError ya existe. Revisa si A1 ya fue aplicado antes de volver a ejecutar.")
text = text.replace(marker, helper + marker, 1)

if text == original:
    raise RuntimeError("El archivo no cambió. Se cancela.")

target.write_text(text, encoding="utf-8")

print("A1 / ROOT-01 aplicado correctamente.")
print("Archivo modificado: js/admin-auth.js")
print("Backup aislado:", backup_dir)
print("No se modificó ningún otro archivo.")

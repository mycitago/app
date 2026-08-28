let biz; const API = (window.CITAS_CONFIG?.apiUrl || '').replace(/\/$/, ''); const $ = x => document.getElementById(x);

async function authHeader() {
  const { data } = await supabaseClient.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('No hay sesión activa');
  return { Authorization: `Bearer ${token}` };
}

async function save(kind, provider, payload, status) {
  if (!API) { status.textContent = 'Backend no configurado para producción'; return; }
  status.textContent = 'Guardando…';
  try {
    const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
    const r = await fetch(`${API}/api/integrations/configure`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ business_id: biz.id, kind, provider, secrets: payload }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || 'Error');
    status.textContent = '✓ Conectado';
  } catch (e) {
    status.textContent = 'Backend no disponible: ' + e.message;
  }
}

async function init() {
  const s = await requireAuth();
  if (!s) return;
  biz = await getMyBusiness(s.user);
  if (!biz) return;
  $('biz-name').textContent = biz.name;
  $('save-wa').onclick = () => save('whatsapp', 'meta_cloud', { phone_number_id: $('wa-phone').value, access_token: $('wa-token').value }, $('wa-status'));
  $('save-pay').onclick = () => save('customer_payments', $('pay-provider').value, { access_token: $('pay-token').value }, $('pay-status'));
}
document.addEventListener('DOMContentLoaded', init);

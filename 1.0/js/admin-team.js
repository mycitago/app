let biz, myRole;
const $ = id => document.getElementById(id);
const API = (window.CITAS_CONFIG?.apiUrl || '').replace(/\/$/, '');
const ROLE_LABEL = { OWNER: 'Dueño', MANAGER: 'Manager', RECEPTIONIST: 'Recepcionista', PROFESSIONAL: 'Profesional', ACCOUNTING: 'Contabilidad' };

function toast(t) { $('toast').textContent = t; $('toast').classList.remove('hidden'); setTimeout(() => $('toast').classList.add('hidden'), 2600); }
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

async function authHeader() {
  const { data } = await supabaseClient.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('No hay sesión activa');
  return { Authorization: `Bearer ${token}` };
}

async function api(path, opts = {}) {
  if (!API) throw new Error('Backend no configurado para producción');
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const r = await fetch(`${API}${path}`, { ...opts, headers });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || `Error ${r.status}`);
  return j;
}

function renderMembers(members) {
  $('members').innerHTML = members.map(m => `
    <article class="customer-row">
      <div class="customer-avatar">${esc((m.email || '?').slice(0, 1).toUpperCase())}</div>
      <div class="customer-main">
        <b>${esc(m.email || m.user_id)}</b>
        <span>${ROLE_LABEL[m.role] || m.role}${m.status === 'suspended' ? ' · suspendido' : ''}</span>
      </div>
      ${myRole === 'OWNER' && m.role !== 'OWNER' ? `
        <select class="input role-select" data-id="${m.id}">
          ${Object.keys(ROLE_LABEL).filter(r => r !== 'OWNER').map(r => `<option value="${r}" ${r === m.role ? 'selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}
        </select>
        <button class="btn btn-ghost" data-remove="${m.id}">Quitar</button>
      ` : ''}
    </article>
  `).join('') || '<p class="empty-state">Solo estás tú por ahora.</p>';

  $('members').querySelectorAll('.role-select').forEach(sel => {
    sel.onchange = async () => {
      try {
        await api(`/api/business/${biz.id}/members/${sel.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ role: sel.value }) });
        toast('Rol actualizado');
        load();
      } catch (e) { toast('No se pudo actualizar: ' + e.message); load(); }
    };
  });
  $('members').querySelectorAll('[data-remove]').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('¿Quitar a esta persona del negocio?')) return;
      try {
        await api(`/api/business/${biz.id}/members/${btn.dataset.remove}`, { method: 'DELETE' });
        toast('Miembro eliminado');
        load();
      } catch (e) { toast('No se pudo quitar: ' + e.message); }
    };
  });
}

async function load() {
  try {
    const { members } = await api(`/api/business/${biz.id}/members`);
    myRole = (members.find(m => m.user_id === window.__currentUserId))?.role || myRole;
    $('invite-card').classList.toggle('hidden', myRole !== 'OWNER');
    $('not-owner-notice').classList.toggle('hidden', myRole === 'OWNER' || myRole === 'MANAGER');
    renderMembers(members);
  } catch (e) {
    $('members').innerHTML = `<p class="empty-state">No se pudo cargar el equipo (¿el backend está corriendo?). ${esc(e.message)}</p>`;
  }
}

async function init() {
  const s = await requireAuth();
  if (!s) return;
  window.__currentUserId = s.user.id;
  biz = await getMyBusiness(s.user);
  if (!biz) return;
  $('biz-name').textContent = biz.name;

  $('btn-invite').onclick = async () => {
    const email = $('inv-email').value.trim();
    const role = $('inv-role').value;
    if (!email) { $('invite-status').textContent = 'Escribe un correo'; return; }
    $('invite-status').textContent = 'Guardando…';
    try {
      await api(`/api/business/${biz.id}/members`, { method: 'POST', body: JSON.stringify({ business_id: biz.id, email, role }) });
      $('invite-status').textContent = '✓ Agregado';
      $('inv-email').value = '';
      load();
    } catch (e) {
      $('invite-status').textContent = 'Error: ' + e.message;
    }
  };

  await load();
}
document.addEventListener('DOMContentLoaded', init);

// =========================================================
// admin-dashboard.js — KPIs y citas del panel
// =========================================================

const state = { session: null, business: null, appointments: [] };

const el = {
  bizName: document.getElementById('biz-name'),
  todayLabel: document.getElementById('today-label'),
  kpiToday: document.getElementById('kpi-today'),
  kpiUpcoming: document.getElementById('kpi-upcoming'),
  kpiPending: document.getElementById('kpi-pending'),
  kpiRevenue: document.getElementById('kpi-revenue'),
  listToday: document.getElementById('list-today'),
  listUpcoming: document.getElementById('list-upcoming'),
  toast: document.getElementById('toast'),
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.remove('hidden');
  setTimeout(() => el.toast.classList.add('hidden'), 3000);
}

function pad(n) { return String(n).padStart(2, '0'); }
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function monthStartKey() { return todayKey().slice(0, 7) + '-01'; }

function formatMoney(n) {
  return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatHour(t) { return (t || '').slice(0, 5); }

function isActive(a) { return a.status === 'pendiente' || a.status === 'confirmada'; }

async function init() {
  const session = await requireAuth();
  if (!session) return;
  state.session = session;

  const business = await getMyBusiness(session.user);
  if (!business) {
    el.bizName.textContent = 'No tienes un negocio asignado.';
    return;
  }
  state.business = business;
  el.bizName.textContent = business.name;
  el.todayLabel.textContent = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  document.getElementById('btn-logout').addEventListener('click', logout);
  await refresh();
}

async function refresh() {
  const { data, error } = await supabaseClient
    .from('appointments')
    .select('id, appointment_date, start_time, end_time, status, notes, customers(name, whatsapp), services(name, price, duration_minutes)')
    .eq('business_id', state.business.id)
    .gte('appointment_date', monthStartKey())
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error cargando citas:', error);
    showToast('No se pudieron cargar las citas.');
    return;
  }

  state.appointments = data || [];
  renderKpis();
  renderLists();
}

function renderKpis() {
  const tKey = todayKey();
  const mKey = todayKey().slice(0, 7);

  const today = state.appointments.filter((a) => a.appointment_date === tKey && a.status !== 'cancelada');
  const upcoming = state.appointments.filter((a) => a.appointment_date > tKey && isActive(a));
  const pending = state.appointments.filter((a) => a.status === 'pendiente');
  const revenue = state.appointments
    .filter((a) => a.appointment_date.startsWith(mKey) && (a.status === 'confirmada' || a.status === 'completada'))
    .reduce((sum, a) => sum + Number(a.services?.price || 0), 0);

  el.kpiToday.textContent = today.length;
  el.kpiUpcoming.textContent = upcoming.length;
  el.kpiPending.textContent = pending.length;
  el.kpiRevenue.textContent = formatMoney(revenue);
}

function statusBadge(status) {
  const map = {
    pendiente: 'adm-badge-pending',
    confirmada: 'adm-badge-confirmed',
    completada: 'adm-badge-done',
    cancelada: 'adm-badge-cancel',
    no_asistio: 'adm-badge-cancel',
  };
  return `<span class="adm-badge ${map[status] || ''}">${esc(status.replace('_', ' '))}</span>`;
}

function appointmentRow(a) {
  const customer = esc(a.customers?.name || 'Cliente');
  const whatsapp = a.customers?.whatsapp || '';
  const service = esc(a.services?.name || 'Servicio');
  const waLink = whatsapp ? `https://wa.me/${whatsapp}` : null;

  const actions = [];
  if (a.status === 'pendiente') actions.push({ s: 'confirmada', label: 'Confirmar' });
  if (a.status === 'confirmada') actions.push({ s: 'completada', label: 'Completar' });
  if (isActive(a)) actions.push({ s: 'cancelada', label: 'Cancelar' });

  const actionButtons = actions.map((act) =>
    `<button class="adm-action" data-id="${a.id}" data-status="${act.s}">${act.label}</button>`
  ).join('');

  return `
    <div class="adm-row">
      <div class="adm-row-time">${formatHour(a.start_time)}–${formatHour(a.end_time)}</div>
      <div class="adm-row-info">
        <div class="adm-row-name">${customer}</div>
        <div class="adm-row-sub">${service} · ${esc(a.appointment_date)}</div>
      </div>
      ${waLink ? `<a class="adm-wa" href="${waLink}" target="_blank" rel="noopener">WA</a>` : ''}
      ${statusBadge(a.status)}
      <div class="adm-row-actions">${actionButtons}</div>
    </div>`;
}

function renderLists() {
  const tKey = todayKey();
  const today = state.appointments.filter((a) => a.appointment_date === tKey);
  const upcoming = state.appointments.filter((a) => a.appointment_date > tKey);

  el.listToday.innerHTML = today.length
    ? today.map(appointmentRow).join('')
    : '<p class="empty-state">No hay citas para hoy.</p>';

  el.listUpcoming.innerHTML = upcoming.length
    ? upcoming.map(appointmentRow).join('')
    : '<p class="empty-state">No hay citas próximas.</p>';

  document.querySelectorAll('.adm-action').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const status = btn.dataset.status;
      btn.disabled = true;

      const { error } = await supabaseClient
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('Error actualizando cita:', error);
        showToast('No se pudo actualizar la cita.');
        btn.disabled = false;
        return;
      }

      showToast('Cita actualizada.');
      await refresh();
    });
  });
}

document.addEventListener('DOMContentLoaded', init);

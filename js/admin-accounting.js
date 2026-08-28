// =========================================================
// admin-accounting.js — Contabilidad: ingresos, gastos y ganancia
// =========================================================

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const state = { business: null, month: currentMonthKey(), appointments: [], expenses: [] };
let financeChart = null;

const el = {
  bizName: document.getElementById('biz-name'),
  monthPicker: document.getElementById('month-picker'),
  kpiIncome: document.getElementById('kpi-income'),
  kpiExpenses: document.getElementById('kpi-expenses'),
  kpiProfit: document.getElementById('kpi-profit'),
  kpiNote: document.getElementById('kpi-note'),
  listExpenses: document.getElementById('list-expenses'),
  summary6m: document.getElementById('summary-6m'),
  toast: document.getElementById('toast'),
};

const CATEGORY_LABELS = {
  insumos: 'Insumos', renta: 'Renta', sueldos: 'Sueldos',
  servicios: 'Servicios', marketing: 'Marketing',
  mantenimiento: 'Mantenimiento', otros: 'Otros',
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

function formatMoney(n) {
  return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function lastMonthKeys(count = 6) {
  const keys = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < count; i++) {
    keys.unshift(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    d.setMonth(d.getMonth() - 1);
  }
  return keys;
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  const business = await getMyBusiness(session.user);
  if (!business) {
    el.bizName.textContent = 'No tienes un negocio asignado.';
    return;
  }
  state.business = business;
  el.bizName.textContent = business.name;

  el.monthPicker.value = state.month;
  el.monthPicker.addEventListener('change', () => {
    if (el.monthPicker.value) {
      state.month = el.monthPicker.value;
      renderAll();
    }
  });

  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-add-expense').addEventListener('click', addExpense);
  document.getElementById('exp-date').value = todayKey();

  await loadData();
}

async function loadData() {
  const from = `${lastMonthKeys(6)[0]}-01`;

  const [apptsRes, expRes] = await Promise.all([
    supabaseClient
      .from('appointments')
      .select('appointment_date, status, services(price)')
      .eq('business_id', state.business.id)
      .gte('appointment_date', from),
    supabaseClient
      .from('expenses')
      .select('*')
      .eq('business_id', state.business.id)
      .gte('expense_date', from)
      .order('expense_date', { ascending: false }),
  ]);

  if (apptsRes.error || expRes.error) {
    console.error('Error cargando contabilidad:', apptsRes.error || expRes.error);
    showToast('No se pudo cargar la contabilidad.');
    return;
  }

  state.appointments = apptsRes.data || [];
  state.expenses = expRes.data || [];
  renderAll();
}

async function addExpense() {
  const concept = document.getElementById('exp-concept').value.trim();
  const category = document.getElementById('exp-category').value;
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const date = document.getElementById('exp-date').value || todayKey();

  if (!concept || !amount || amount <= 0) {
    showToast('Escribe un concepto y un monto mayor a 0.');
    return;
  }

  const { error } = await supabaseClient.from('expenses').insert({
    business_id: state.business.id,
    concept, category, amount, expense_date: date,
  });

  if (error) {
    console.error('Error guardando gasto:', error);
    showToast('No se pudo guardar el gasto.');
    return;
  }

  document.getElementById('exp-concept').value = '';
  document.getElementById('exp-amount').value = '';
  showToast('Gasto guardado.');
  await loadData();
}

function expenseRow(x) {
  return `
    <div class="adm-row">
      <div class="adm-row-time">${formatMoney(x.amount)}</div>
      <div class="adm-row-info">
        <div class="adm-row-name">${esc(x.concept)}</div>
        <div class="adm-row-sub">${CATEGORY_LABELS[x.category] || esc(x.category)} · ${esc(x.expense_date)}</div>
      </div>
      <button class="adm-exp-del" data-id="${x.id}">Eliminar</button>
    </div>`;
}

function renderAll() {
  const months = lastMonthKeys(6);

  const perMonth = months.map((key) => {
    const appts = state.appointments.filter((a) => (a.appointment_date || '').startsWith(key));
    const income = appts.filter((a) => a.status === 'completada')
      .reduce((s, a) => s + Number(a.services?.price || 0), 0);
    const projected = appts.filter((a) => a.status === 'confirmada')
      .reduce((s, a) => s + Number(a.services?.price || 0), 0);
    const doneCount = appts.filter((a) => a.status === 'completada').length;
    const activeCount = appts.filter((a) => a.status === 'confirmada' || a.status === 'pendiente').length;
    const expenses = state.expenses.filter((x) => (x.expense_date || '').startsWith(key))
      .reduce((s, x) => s + Number(x.amount || 0), 0);
    return { key, income, projected, expenses, profit: income - expenses, doneCount, activeCount };
  });

  const current = perMonth.find((m) => m.key === state.month) || perMonth[perMonth.length - 1];

  el.kpiIncome.textContent = formatMoney(current.income);
  el.kpiExpenses.textContent = formatMoney(current.expenses);
  el.kpiProfit.textContent = formatMoney(current.profit);
  el.kpiProfit.className = 'adm-kpi-num ' + (current.profit >= 0 ? 'adm-green' : 'adm-red');
  el.kpiNote.textContent =
    `${current.doneCount} citas completadas · ${current.activeCount} agendadas/pendientes. ` +
    `Ingreso proyectado (confirmadas): ${formatMoney(current.projected)}.`;

  const monthExpenses = state.expenses.filter((x) => (x.expense_date || '').startsWith(state.month));
  el.listExpenses.innerHTML = monthExpenses.length
    ? monthExpenses.map(expenseRow).join('')
    : '<p class="empty-state">Sin gastos registrados en este mes.</p>';

  document.querySelectorAll('.adm-exp-del').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const { error } = await supabaseClient.from('expenses').delete().eq('id', btn.dataset.id);
      if (error) {
        console.error('Error eliminando gasto:', error);
        showToast('No se pudo eliminar el gasto.');
        btn.disabled = false;
        return;
      }
      showToast('Gasto eliminado.');
      await loadData();
    });
  });

  renderFinanceChart(perMonth);

  const max = Math.max(1, ...perMonth.map((m) => Math.max(m.income, m.expenses)));
  el.summary6m.innerHTML = perMonth.map((m) => `
    <div class="adm-6m-row">
      <div class="adm-6m-label">${monthLabel(m.key)}</div>
      <div class="adm-6m-bars">
        <div class="adm-bar adm-bar-income" style="width:${Math.round((m.income / max) * 100)}%"></div>
        <div class="adm-bar adm-bar-expense" style="width:${Math.round((m.expenses / max) * 100)}%"></div>
      </div>
      <div class="adm-6m-profit ${m.profit >= 0 ? 'adm-green' : 'adm-red'}">${formatMoney(m.profit)}</div>
    </div>`).join('');
}

function renderFinanceChart(perMonth) {
  const canvas = document.getElementById('finance-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (financeChart) financeChart.destroy();
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(124,58,237,.24)');
  gradient.addColorStop(1, 'rgba(124,58,237,.015)');
  financeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: perMonth.map(m => monthLabel(m.key)),
      datasets: [
        { label: 'Ingresos', data: perMonth.map(m => m.income), borderColor: '#7c3aed', backgroundColor: gradient, borderWidth: 2.4, pointRadius: 3, pointHoverRadius: 5, tension: .38, fill: true },
        { label: 'Gastos', data: perMonth.map(m => m.expenses), borderColor: '#17181c', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 2.5, pointHoverRadius: 5, tension: .38 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#17181c', padding: 12, displayColors: true, callbacks: { label: c => `${c.dataset.label}: ${formatMoney(c.raw)}` } } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#858b96', font: { size: 10, family: 'Manrope' } } },
        y: { beginAtZero: true, border: { display: false }, grid: { color: '#eef0f4' }, ticks: { color: '#858b96', font: { size: 10, family: 'Manrope' }, callback: v => '$' + Number(v).toLocaleString('es-MX', { notation: 'compact' }) } }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

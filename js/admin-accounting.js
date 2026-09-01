// =========================================================
// admin-accounting.js — Contabilidad: ingresos, gastos y ganancia
// =========================================================

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const state = { business: null, month: currentMonthKey(), appointments: [], expenses: [], reviews: [] };
let financeChart = null;

const el = {
  monthPicker: document.getElementById('month-picker'),
  kpiIncome: document.getElementById('kpi-income'),
  kpiExpenses: document.getElementById('kpi-expenses'),
  kpiDone: document.getElementById('kpi-done'),
  kpiProjected: document.getElementById('kpi-projected'),
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
    showToast('No tienes un negocio asignado.');
    return;
  }
  state.business = business;

  el.monthPicker.value = state.month;
  el.monthPicker.addEventListener('change', () => {
    if (el.monthPicker.value) {
      state.month = el.monthPicker.value;
      renderAll();
    }
  });

  document.getElementById('btn-add-expense').addEventListener('click', addExpense);
  document.getElementById('open-expense')?.addEventListener('click',()=>document.getElementById('expense-panel').classList.remove('hidden'));
  document.querySelectorAll('[data-close-expense]').forEach(x=>x.addEventListener('click',()=>document.getElementById('expense-panel').classList.add('hidden')));
  document.getElementById('exp-date').value = todayKey();

  await loadData();
}

async function loadData() {
  const from = `${lastMonthKeys(6)[0]}-01`;

  const [apptsRes, expRes, reviewsRes] = await Promise.all([
    supabaseClient
      .from('appointments')
      .select('appointment_date, status, price_charged, booking_source, services(id,name)')
      .eq('business_id', state.business.id)
      .gte('appointment_date', from),
    supabaseClient
      .from('expenses')
      .select('*')
      .eq('business_id', state.business.id)
      .gte('expense_date', from)
      .order('expense_date', { ascending: false }),
    supabaseClient.from('reviews').select('rating,created_at,status').eq('business_id', state.business.id).eq('status','published').gte('created_at', from),
  ]);

  if (apptsRes.error || expRes.error || reviewsRes.error) {
    console.error('Error cargando contabilidad:', apptsRes.error || expRes.error);
    showToast('No se pudo cargar la contabilidad.');
    return;
  }

  state.appointments = apptsRes.data || [];
  state.expenses = expRes.data || [];
  state.reviews = reviewsRes.data || [];
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
  document.getElementById('expense-panel')?.classList.add('hidden');
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
      .reduce((s, a) => s + Number(a.price_charged || 0), 0);
    const projected = appts.filter((a) => a.status === 'confirmada')
      .reduce((s, a) => s + Number(a.price_charged || 0), 0);
    const doneCount = appts.filter((a) => a.status === 'completada').length;
    const activeCount = appts.filter((a) => a.status === 'confirmada' || a.status === 'pendiente').length;
    const expenses = state.expenses.filter((x) => (x.expense_date || '').startsWith(key))
      .reduce((s, x) => s + Number(x.amount || 0), 0);
    return { key, income, projected, expenses, profit: income - expenses, doneCount, activeCount };
  });

  const current = perMonth.find((m) => m.key === state.month) || perMonth[perMonth.length - 1];

  el.kpiIncome.textContent = formatMoney(current.income);
  el.kpiExpenses.textContent = formatMoney(current.expenses);
  if(el.kpiDone)el.kpiDone.textContent=current.doneCount;
  if(el.kpiProjected)el.kpiProjected.textContent=formatMoney(current.projected);
  const monthReviews=state.reviews.filter(r=>String(r.created_at||'').startsWith(state.month));
  const shared=state.appointments.filter(a=>(a.appointment_date||'').startsWith(state.month)&&a.booking_source).length;
  const avg=monthReviews.length?monthReviews.reduce((a,r)=>a+Number(r.rating||0),0)/monthReviews.length:0;
  const nr=document.getElementById('kpi-new-reviews'), rr=document.getElementById('kpi-review-rating'), sb=document.getElementById('kpi-shared-bookings');
  if(nr)nr.textContent=monthReviews.length;if(rr)rr.textContent=monthReviews.length?avg.toFixed(1)+' ★':'—';if(sb)sb.textContent=shared;
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
  renderPopularServices();

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


function renderPopularServices(){const root=document.getElementById('popular-services');if(!root)return;const counts=new Map();state.appointments.filter(a=>a.status==='completada'&&(a.appointment_date||'').startsWith(state.month)).forEach(a=>{const name=a.services?.name||'Servicio';counts.set(name,(counts.get(name)||0)+1)});const rows=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);if(!rows.length){root.innerHTML='<div class="ct-empty">Aún no hay servicios completados en este periodo.</div>';return}const max=Math.max(...rows.map(x=>x[1]),1);root.replaceChildren(...rows.map(([name,n])=>{const r=document.createElement('div');r.className='popular-row';const d=document.createElement('div');const b=document.createElement('b');b.textContent=name;const sm=document.createElement('small');sm.textContent=`${n} cita${n===1?'':'s'} completada${n===1?'':'s'}`;const track=document.createElement('div');track.className='popular-track';const i=document.createElement('i');i.style.width=`${n/max*100}%`;track.appendChild(i);d.append(b,sm,track);const st=document.createElement('strong');st.textContent=n;r.append(d,st);return r}))}

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

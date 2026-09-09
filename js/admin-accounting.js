// admin-accounting.js — Reportes, ventas, control fiscal e indicadores
function currentMonthKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
const state={business:null,month:currentMonthKey(),appointments:[],expenses:[],reviews:[],fiscal:[]};let financeChart=null;
const el={monthPicker:document.getElementById('month-picker'),kpiIncome:document.getElementById('kpi-income'),kpiExpenses:document.getElementById('kpi-expenses'),kpiDone:document.getElementById('kpi-done'),kpiProjected:document.getElementById('kpi-projected'),kpiProfit:document.getElementById('kpi-profit'),kpiNote:document.getElementById('kpi-note'),listExpenses:document.getElementById('list-expenses'),summary6m:document.getElementById('summary-6m'),toast:document.getElementById('toast')};
const CATEGORY_LABELS={insumos:'Insumos',renta:'Renta',sueldos:'Sueldos',servicios:'Servicios',marketing:'Marketing',mantenimiento:'Mantenimiento',otros:'Otros'};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function showToast(msg){el.toast.textContent=msg;el.toast.classList.remove('hidden');setTimeout(()=>el.toast.classList.add('hidden'),3000)}
function pad(n){return String(n).padStart(2,'0')} function todayKey(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function formatMoney(n){return '$'+Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}
function lastMonthKeys(count=6){const keys=[],d=new Date();d.setDate(1);for(let i=0;i<count;i++){keys.unshift(`${d.getFullYear()}-${pad(d.getMonth()+1)}`);d.setMonth(d.getMonth()-1)}return keys}
function monthLabel(key){const[y,m]=key.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('es-MX',{month:'short',year:'2-digit'})}
function fiscalByAppointment(id){return state.fiscal.find(x=>x.appointment_id===id)||null}
async function init(){
 const session=await requireAuth();if(!session)return;const business=await getMyBusiness(session.user);if(!business){showToast('No tienes un negocio asignado.');return}state.business=business;
 el.monthPicker.value=state.month;el.monthPicker.addEventListener('change',()=>{if(el.monthPicker.value){state.month=el.monthPicker.value;renderAll()}});
 document.getElementById('btn-add-expense').addEventListener('click',addExpense);
 document.getElementById('open-expense')?.addEventListener('click',()=>document.getElementById('expense-panel').classList.remove('hidden'));
 document.querySelectorAll('[data-close-expense]').forEach(x=>x.addEventListener('click',()=>document.getElementById('expense-panel').classList.add('hidden')));
 document.querySelectorAll('[data-close-sale]').forEach(x=>x.addEventListener('click',()=>document.getElementById('sale-panel').classList.add('hidden')));
 document.getElementById('save-sale-fiscal')?.addEventListener('click',saveSaleFiscal);
 document.getElementById('export-sales')?.addEventListener('click',exportSalesCSV);
 document.getElementById('exp-date').value=todayKey();await loadData();
}
async function loadData(){
 const from=`${lastMonthKeys(6)[0]}-01`;
 const [apptsRes,expRes,reviewsRes,fiscalRes]=await Promise.all([
  supabaseClient.from('appointments').select('id,appointment_date,status,price_charged,booking_source,customer_id,services(id,name)').eq('business_id',state.business.id).gte('appointment_date',from),
  supabaseClient.from('expenses').select('*').eq('business_id',state.business.id).gte('expense_date',from).order('expense_date',{ascending:false}),
  supabaseClient.from('reviews').select('rating,created_at,status').eq('business_id',state.business.id).eq('status','published').gte('created_at',from),
  supabaseClient.from('sale_fiscal_records').select('*').eq('business_id',state.business.id)
 ]);
 if(apptsRes.error||expRes.error||reviewsRes.error){
  console.error('[reportes] appointments:',apptsRes.error);
  console.error('[reportes] expenses:',expRes.error);
  console.error('[reportes] reviews:',reviewsRes.error);
  const source=apptsRes.error?'citas':expRes.error?'gastos':'reseñas';
  showToast(`No se pudieron cargar los reportes (${source}).`);
  return
}
 if(fiscalRes.error){console.warn('Control fiscal no disponible. Ejecuta SQL_SALES_FISCAL.sql',fiscalRes.error)}
 state.appointments=apptsRes.data||[];state.expenses=expRes.data||[];state.reviews=reviewsRes.data||[];state.fiscal=fiscalRes.error?[]:(fiscalRes.data||[]);renderAll();
}
async function addExpense(){
 const concept=document.getElementById('exp-concept').value.trim(),category=document.getElementById('exp-category').value,amount=parseFloat(document.getElementById('exp-amount').value),date=document.getElementById('exp-date').value||todayKey();
 if(!concept||!amount||amount<=0){showToast('Escribe un concepto y un monto mayor a 0.');return}
 const{error}=await supabaseClient.from('expenses').insert({business_id:state.business.id,concept,category,amount,expense_date:date});if(error){showToast('No se pudo guardar el gasto.');return}
 document.getElementById('exp-concept').value='';document.getElementById('exp-amount').value='';document.getElementById('expense-panel').classList.add('hidden');showToast('Gasto guardado.');await loadData();
}
function expenseRow(x){return `<div class="adm-row"><div class="adm-row-time">${formatMoney(x.amount)}</div><div class="adm-row-info"><div class="adm-row-name">${esc(x.concept)}</div><div class="adm-row-sub">${CATEGORY_LABELS[x.category]||esc(x.category)} · ${esc(x.expense_date)}</div></div><button class="adm-exp-del" data-id="${x.id}">Eliminar</button></div>`}
function customerName(a){return 'Cliente'}
function renderSales(){
 const rows=state.appointments.filter(a=>a.status==='completada'&&(a.appointment_date||'').startsWith(state.month));
 let total=0,invoiced=0,pending=0,vat=0;
 rows.forEach(a=>{const amount=Number(a.price_charged||0),f=fiscalByAppointment(a.id);total+=amount;if(f?.cfdi_status==='invoiced')invoiced+=amount;else pending+=amount;vat+=Number(f?.vat_amount||0)});
 document.getElementById('fiscal-sales').textContent=formatMoney(total);document.getElementById('fiscal-invoiced').textContent=formatMoney(invoiced);document.getElementById('fiscal-pending').textContent=formatMoney(pending);document.getElementById('fiscal-vat').textContent=formatMoney(vat);
 const root=document.getElementById('sales-list');if(!rows.length){root.innerHTML='<tr><td colspan="7" class="ct-empty">No hay servicios completados en este periodo.</td></tr>';return}
 root.innerHTML=rows.sort((a,b)=>String(b.appointment_date).localeCompare(String(a.appointment_date))).map(a=>{const f=fiscalByAppointment(a.id),cfdi=f?.cfdi_status||'not_required',pay=f?.payment_status||'paid';return `<tr><td>${esc(a.appointment_date)}</td><td><b>${esc(customerName(a))}</b><small>${esc(a.services?.name||'Servicio')}</small></td><td><b>${formatMoney(a.price_charged)}</b></td><td><span class="fiscal-badge ${pay==='paid'?'ok':'warn'}">${pay==='paid'?'Pagado':'Pendiente'}</span></td><td><span class="fiscal-badge ${cfdi==='invoiced'?'ok':cfdi==='pending'?'warn':''}">${cfdi==='invoiced'?'Facturada':cfdi==='pending'?'Pendiente':cfdi==='cancelled'?'Cancelada':'Sin factura'}</span></td><td>${esc(f?.cfdi_uuid||'—')}</td><td><button class="sale-edit" data-sale-id="${a.id}">Detalle</button></td></tr>`}).join('');
 root.querySelectorAll('.sale-edit').forEach(b=>b.addEventListener('click',()=>openSale(b.dataset.saleId)));
}
function openSale(id){
 const a=state.appointments.find(x=>x.id===id),f=fiscalByAppointment(id)||{};if(!a)return;
 document.getElementById('sale-appointment-id').value=id;document.getElementById('sale-payment-status').value=f.payment_status||'paid';document.getElementById('sale-cfdi-status').value=f.cfdi_status||'not_required';
 const total=Number(a.price_charged||0);document.getElementById('sale-subtotal').value=f.subtotal??total;document.getElementById('sale-vat').value=f.vat_amount??0;document.getElementById('sale-uuid').value=f.cfdi_uuid||'';document.getElementById('sale-payment-form').value=f.payment_form||'';document.getElementById('sale-payment-method').value=f.payment_method||'';document.getElementById('sale-rfc').value=f.receiver_rfc||'';document.getElementById('sale-fiscal-name').value=f.receiver_fiscal_name||'';document.getElementById('sale-tax-regime').value=f.receiver_tax_regime||'';document.getElementById('sale-zip').value=f.receiver_zip||'';document.getElementById('sale-cfdi-use').value=f.cfdi_use||'';document.getElementById('sale-stamped-at').value=f.stamped_at?String(f.stamped_at).slice(0,16):'';document.getElementById('sale-panel').classList.remove('hidden');
}
async function saveSaleFiscal(){
 const appointment_id=document.getElementById('sale-appointment-id').value;if(!appointment_id)return;
 const payload={business_id:state.business.id,appointment_id,payment_status:document.getElementById('sale-payment-status').value,cfdi_status:document.getElementById('sale-cfdi-status').value,subtotal:Number(document.getElementById('sale-subtotal').value||0),vat_amount:Number(document.getElementById('sale-vat').value||0),cfdi_uuid:document.getElementById('sale-uuid').value.trim()||null,payment_form:document.getElementById('sale-payment-form').value.trim()||null,payment_method:document.getElementById('sale-payment-method').value||null,receiver_rfc:document.getElementById('sale-rfc').value.trim().toUpperCase()||null,receiver_fiscal_name:document.getElementById('sale-fiscal-name').value.trim()||null,receiver_tax_regime:document.getElementById('sale-tax-regime').value.trim()||null,receiver_zip:document.getElementById('sale-zip').value.trim()||null,cfdi_use:document.getElementById('sale-cfdi-use').value.trim().toUpperCase()||null,stamped_at:document.getElementById('sale-stamped-at').value||null,updated_at:new Date().toISOString()};
 if(payload.cfdi_status==='invoiced'&&!payload.cfdi_uuid){showToast('Para marcar como facturada captura el UUID.');return}
 const{error}=await supabaseClient.from('sale_fiscal_records').upsert(payload,{onConflict:'business_id,appointment_id'});if(error){console.error(error);showToast('No se pudo guardar el control fiscal.');return}
 document.getElementById('sale-panel').classList.add('hidden');showToast('Control fiscal guardado.');await loadData();
}
function csvCell(v){return '"'+String(v??'').replaceAll('"','""')+'"'}
function exportSalesCSV(){
 const rows=state.appointments.filter(a=>a.status==='completada'&&(a.appointment_date||'').startsWith(state.month));const head=['Fecha','Cliente','Servicio','Total','Estado cobro','Estado CFDI','Subtotal','IVA','RFC','Razon social','Regimen fiscal','CP fiscal','Uso CFDI','Forma pago','Metodo pago','UUID','Timbrado'];
 const body=rows.map(a=>{const f=fiscalByAppointment(a.id)||{};return [a.appointment_date,customerName(a),a.services?.name||'',Number(a.price_charged||0).toFixed(2),f.payment_status||'paid',f.cfdi_status||'not_required',Number(f.subtotal??a.price_charged??0).toFixed(2),Number(f.vat_amount||0).toFixed(2),f.receiver_rfc||'',f.receiver_fiscal_name||'',f.receiver_tax_regime||'',f.receiver_zip||'',f.cfdi_use||'',f.payment_form||'',f.payment_method||'',f.cfdi_uuid||'',f.stamped_at||'']});
 const csv='\ufeff'+[head,...body].map(r=>r.map(csvCell).join(',')).join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ventas-${state.month}.csv`;a.click();URL.revokeObjectURL(url);
}
function renderAll(){
 const months=lastMonthKeys(6),perMonth=months.map(key=>{const appts=state.appointments.filter(a=>(a.appointment_date||'').startsWith(key)),income=appts.filter(a=>a.status==='completada').reduce((s,a)=>s+Number(a.price_charged||0),0),projected=appts.filter(a=>a.status==='confirmada').reduce((s,a)=>s+Number(a.price_charged||0),0),doneCount=appts.filter(a=>a.status==='completada').length,activeCount=appts.filter(a=>a.status==='confirmada'||a.status==='pendiente').length,expenses=state.expenses.filter(x=>(x.expense_date||'').startsWith(key)).reduce((s,x)=>s+Number(x.amount||0),0);return{key,income,projected,expenses,profit:income-expenses,doneCount,activeCount}});
 const current=perMonth.find(m=>m.key===state.month)||perMonth[perMonth.length-1];el.kpiIncome.textContent=formatMoney(current.income);el.kpiExpenses.textContent=formatMoney(current.expenses);el.kpiDone.textContent=current.doneCount;el.kpiProjected.textContent=formatMoney(current.projected);
 const monthReviews=state.reviews.filter(r=>String(r.created_at||'').startsWith(state.month)),shared=state.appointments.filter(a=>(a.appointment_date||'').startsWith(state.month)&&a.booking_source).length,avg=monthReviews.length?monthReviews.reduce((a,r)=>a+Number(r.rating||0),0)/monthReviews.length:0;
 document.getElementById('kpi-new-reviews').textContent=monthReviews.length;document.getElementById('kpi-review-rating').textContent=monthReviews.length?avg.toFixed(1)+' ★':'—';document.getElementById('kpi-shared-bookings').textContent=shared;el.kpiProfit.textContent=formatMoney(current.profit);el.kpiNote.textContent=`${current.doneCount} citas completadas · ${current.activeCount} agendadas/pendientes. Ingreso proyectado: ${formatMoney(current.projected)}.`;
 const monthExpenses=state.expenses.filter(x=>(x.expense_date||'').startsWith(state.month));el.listExpenses.innerHTML=monthExpenses.length?monthExpenses.map(expenseRow).join(''):'<p class="empty-state">Sin gastos registrados en este mes.</p>';
 document.querySelectorAll('.adm-exp-del').forEach(btn=>btn.addEventListener('click',async()=>{const{error}=await supabaseClient.from('expenses').delete().eq('id',btn.dataset.id);if(error){showToast('No se pudo eliminar el gasto.');return}await loadData()}));
 renderSales();renderFinanceChart(perMonth);renderPopularServices();const max=Math.max(1,...perMonth.map(m=>Math.max(m.income,m.expenses)));el.summary6m.innerHTML=perMonth.map(m=>`<div class="adm-6m-row"><div class="adm-6m-label">${monthLabel(m.key)}</div><div class="adm-6m-bars"><div class="adm-bar adm-bar-income" style="width:${Math.round(m.income/max*100)}%"></div><div class="adm-bar adm-bar-expense" style="width:${Math.round(m.expenses/max*100)}%"></div></div><div class="adm-6m-profit">${formatMoney(m.profit)}</div></div>`).join('');
}
function renderPopularServices(){const root=document.getElementById('popular-services');if(!root)return;const counts=new Map();state.appointments.filter(a=>a.status==='completada'&&(a.appointment_date||'').startsWith(state.month)).forEach(a=>{const name=a.services?.name||'Servicio';counts.set(name,(counts.get(name)||0)+1)});const rows=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);if(!rows.length){root.innerHTML='<div class="ct-empty">Aún no hay servicios completados en este periodo.</div>';return}const max=Math.max(...rows.map(x=>x[1]),1);root.innerHTML=rows.map(([name,n])=>`<div class="popular-row"><div><b>${esc(name)}</b><small>${n} cita${n===1?'':'s'} completada${n===1?'':'s'}</small><div class="popular-track"><i style="width:${n/max*100}%"></i></div></div><strong>${n}</strong></div>`).join('')}
function renderFinanceChart(perMonth){const canvas=document.getElementById('finance-chart');if(!canvas||typeof Chart==='undefined')return;if(financeChart)financeChart.destroy();const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,240);gradient.addColorStop(0,'rgba(124,58,237,.24)');gradient.addColorStop(1,'rgba(124,58,237,.015)');financeChart=new Chart(ctx,{type:'line',data:{labels:perMonth.map(m=>monthLabel(m.key)),datasets:[{label:'Ingresos',data:perMonth.map(m=>m.income),borderColor:'#7c3aed',backgroundColor:gradient,borderWidth:2.4,tension:.38,fill:true},{label:'Gastos',data:perMonth.map(m=>m.expenses),borderColor:'#17181c',backgroundColor:'transparent',borderWidth:2,tension:.38}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{callback:v=>'$'+Number(v).toLocaleString('es-MX',{notation:'compact'})}}}}})}
document.addEventListener('DOMContentLoaded',init);

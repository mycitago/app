function monthKeyNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
const state={business:null,month:monthKeyNow(),appointments:[],expenses:[],reviews:[],fiscal:[],services:new Map()};
let financeChart=null;
const $=id=>document.getElementById(id);
const money=n=>'$'+Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
const pad=n=>String(n).padStart(2,'0');
const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
function lastMonths(n=6){const a=[],d=new Date();d.setDate(1);for(let i=0;i<n;i++){a.unshift(`${d.getFullYear()}-${pad(d.getMonth()+1)}`);d.setMonth(d.getMonth()-1)}return a}
function monthLabel(k){const[y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('es-MX',{month:'short',year:'2-digit'})}
function toast(m){const e=$('toast');if(!e)return;e.textContent=m;e.classList.remove('hidden');setTimeout(()=>e.classList.add('hidden'),3200)}
function setLoadStatus(text,type='ok'){const e=$('report-load-status');if(!e)return;e.textContent=text;e.dataset.type=type}
function fiscal(id){return state.fiscal.find(x=>x.appointment_id===id)||null}
function svcName(a){return state.services.get(a.service_id)||'Servicio'}
function computeVatFromTotal(total,applies=false,rate=0.16){total=Number(total||0);if(!applies)return{subtotal:total,vat:0};const subtotal=total/(1+rate);return{subtotal:Number(subtotal.toFixed(2)),vat:Number((total-subtotal).toFixed(2))}}

async function init(){
 const session=await requireAuth();if(!session)return;
 state.business=await getMyBusiness(session.user);if(!state.business){toast('No tienes un negocio asignado.');return}
 $('month-picker').value=state.month;$('month-picker').onchange=()=>{state.month=$('month-picker').value||state.month;renderAll()};
 $('open-expense').onclick=()=>$('expense-panel').classList.remove('hidden');
 document.querySelectorAll('[data-close-expense]').forEach(x=>x.onclick=()=>$('expense-panel').classList.add('hidden'));
 document.querySelectorAll('[data-close-sale]').forEach(x=>x.onclick=()=>$('sale-panel').classList.add('hidden'));
 $('btn-add-expense').onclick=addExpense;$('save-sale-fiscal').onclick=saveFiscal;$('export-sales').onclick=exportCSV;
 $('exp-date').value=todayKey();
 $('sale-vat-applies').onchange=recalcOpenSaleVat;
 await loadData();
}
async function loadData(){
 setLoadStatus('Cargando información…','loading');
 const from=`${lastMonths(6)[0]}-01`;
 const tasks={
  appointments:supabaseClient.from('appointments').select('id,appointment_date,status,price_charged,booking_source,customer_id,service_id').eq('business_id',state.business.id).gte('appointment_date',from),
  expenses:supabaseClient.from('expenses').select('*').eq('business_id',state.business.id).gte('expense_date',from),
  reviews:supabaseClient.from('reviews').select('rating,created_at,status').eq('business_id',state.business.id).eq('status','published').gte('created_at',from),
  fiscal:supabaseClient.from('sale_fiscal_records').select('*').eq('business_id',state.business.id),
  services:supabaseClient.from('services').select('id,name').eq('business_id',state.business.id)
 };
 const keys=Object.keys(tasks),results=await Promise.allSettled(Object.values(tasks));const errors=[];
 results.forEach((r,i)=>{const key=keys[i];if(r.status==='rejected'||r.value?.error){errors.push(key);console.error(`[reportes:${key}]`,r.reason||r.value?.error);return}const data=r.value?.data||[];if(key==='appointments')state.appointments=data;if(key==='expenses')state.expenses=data;if(key==='reviews')state.reviews=data;if(key==='fiscal')state.fiscal=data;if(key==='services')state.services=new Map(data.map(s=>[s.id,s.name]))});
 renderAll();if(errors.length)setLoadStatus(`Datos cargados parcialmente. Sin acceso a: ${errors.join(', ')}.`,'warn');else setLoadStatus('Datos actualizados.','ok');
}
async function addExpense(){const concept=$('exp-concept').value.trim(),amount=Number($('exp-amount').value||0);if(!concept||amount<=0)return toast('Captura concepto y monto mayor a 0.');const{error}=await supabaseClient.from('expenses').insert({business_id:state.business.id,concept,category:$('exp-category').value,amount,expense_date:$('exp-date').value||todayKey()});if(error){console.error(error);return toast('No se pudo guardar el gasto.')}$('expense-panel').classList.add('hidden');toast('Gasto guardado.');await loadData()}
function openSale(id){
 const a=state.appointments.find(x=>x.id===id);if(!a)return;
 const f=fiscal(id),total=Number(a.price_charged||0),applies=f?f.vat_applies===true:false,rate=Number(f?.vat_rate??0.16),calc=computeVatFromTotal(total,applies,rate);
 $('sale-appointment-id').value=id;$('sale-vat-applies').checked=applies;
 $('sale-payment-status').value=f?.payment_status||'paid';$('sale-cfdi-status').value=f?.cfdi_status||'not_required';
 $('sale-subtotal').value=Number(f?.subtotal??calc.subtotal).toFixed(2);$('sale-vat').value=Number(f?.vat_amount??calc.vat).toFixed(2);
 $('sale-uuid').value=f?.cfdi_uuid||'';$('sale-payment-form').value=f?.payment_form||'';$('sale-payment-method').value=f?.payment_method||'';
 $('sale-rfc').value=f?.receiver_rfc||'';$('sale-fiscal-name').value=f?.receiver_fiscal_name||'';$('sale-tax-regime').value=f?.receiver_tax_regime||'';$('sale-zip').value=f?.receiver_zip||'';$('sale-cfdi-use').value=f?.cfdi_use||'';$('sale-stamped-at').value=f?.stamped_at?String(f.stamped_at).slice(0,16):'';
 $('sale-panel').dataset.total=String(total);$('sale-panel').classList.remove('hidden');
}
function recalcOpenSaleVat(){const total=Number($('sale-panel').dataset.total||0),applies=$('sale-vat-applies').checked,calc=computeVatFromTotal(total,applies,0.16);$('sale-subtotal').value=calc.subtotal.toFixed(2);$('sale-vat').value=calc.vat.toFixed(2)}
async function saveFiscal(){
 const id=$('sale-appointment-id').value;if(!id)return;
 const payload={business_id:state.business.id,appointment_id:id,payment_status:$('sale-payment-status').value,cfdi_status:$('sale-cfdi-status').value,vat_applies:$('sale-vat-applies').checked,vat_rate:$('sale-vat-applies').checked?0.16:0,subtotal:Number($('sale-subtotal').value||0),vat_amount:Number($('sale-vat').value||0),cfdi_uuid:$('sale-uuid').value.trim()||null,payment_form:$('sale-payment-form').value.trim()||null,payment_method:$('sale-payment-method').value||null,receiver_rfc:$('sale-rfc').value.trim().toUpperCase()||null,receiver_fiscal_name:$('sale-fiscal-name').value.trim()||null,receiver_tax_regime:$('sale-tax-regime').value.trim()||null,receiver_zip:$('sale-zip').value.trim()||null,cfdi_use:$('sale-cfdi-use').value.trim().toUpperCase()||null,stamped_at:$('sale-stamped-at').value||null,updated_at:new Date().toISOString()};
 if(payload.cfdi_status==='invoiced'&&!payload.cfdi_uuid)return toast('Para marcar como facturada captura el UUID.');
 const{error}=await supabaseClient.from('sale_fiscal_records').upsert(payload,{onConflict:'business_id,appointment_id'});if(error){console.error(error);return toast('No se pudo guardar el control fiscal.')}
 $('sale-panel').classList.add('hidden');toast('Control fiscal guardado.');await loadData();
}
function renderAll(){
 const ms=lastMonths(6),per=ms.map(key=>{const a=state.appointments.filter(x=>(x.appointment_date||'').startsWith(key)),income=a.filter(x=>x.status==='completada').reduce((s,x)=>s+Number(x.price_charged||0),0),projected=a.filter(x=>x.status==='confirmada').reduce((s,x)=>s+Number(x.price_charged||0),0),expenses=state.expenses.filter(x=>(x.expense_date||'').startsWith(key)).reduce((s,x)=>s+Number(x.amount||0),0);return{key,income,projected,expenses,profit:income-expenses,done:a.filter(x=>x.status==='completada').length}});
 const cur=per.find(x=>x.key===state.month)||{income:0,projected:0,expenses:0,profit:0,done:0};
 $('kpi-income').textContent=money(cur.income);$('kpi-done').textContent=cur.done;$('kpi-projected').textContent=money(cur.projected);$('kpi-expenses').textContent=money(cur.expenses);$('kpi-profit').textContent=money(cur.profit);$('kpi-note').textContent=`${cur.done} citas completadas.`;
 const rev=state.reviews.filter(r=>String(r.created_at||'').startsWith(state.month));$('kpi-new-reviews').textContent=rev.length;$('kpi-review-rating').textContent=rev.length?(rev.reduce((s,r)=>s+Number(r.rating||0),0)/rev.length).toFixed(1)+' ★':'—';$('kpi-shared-bookings').textContent=state.appointments.filter(a=>(a.appointment_date||'').startsWith(state.month)&&a.booking_source).length;
 renderSales();renderExpenses();renderPopular();renderHistory(per);renderChart(per);
}
function renderSales(){
 const rows=state.appointments.filter(a=>a.status==='completada'&&(a.appointment_date||'').startsWith(state.month));let total=0,inv=0,pend=0,vat=0;
 rows.forEach(a=>{const amount=Number(a.price_charged||0),f=fiscal(a.id),calc=computeVatFromTotal(amount,f?f.vat_applies===true:false,Number(f?.vat_rate??0.16));total+=amount;vat+=Number(f?.vat_amount??calc.vat);if(f?.cfdi_status==='invoiced')inv+=amount;else pend+=amount});
 $('fiscal-sales').textContent=money(total);$('fiscal-invoiced').textContent=money(inv);$('fiscal-pending').textContent=money(pend);$('fiscal-vat').textContent=money(vat);
 $('sales-list').innerHTML=rows.length?rows.map(a=>{const f=fiscal(a.id),calc=computeVatFromTotal(Number(a.price_charged||0),f?f.vat_applies===true:false,Number(f?.vat_rate??0.16));return `<tr><td>${a.appointment_date||''}</td><td><b>${svcName(a)}</b></td><td>${money(a.price_charged)}</td><td>${money(f?.vat_amount??calc.vat)}</td><td>${f?.payment_status==='pending'?'Pendiente':'Pagado'}</td><td>${f?.cfdi_status==='invoiced'?'Facturada':f?.cfdi_status==='pending'?'Pendiente':'Sin factura'}</td><td>${f?.cfdi_uuid||'—'}</td><td><button class="sale-edit" data-id="${a.id}">Detalle</button></td></tr>`}).join(''):'<tr><td colspan="8">No hay servicios completados en este periodo.</td></tr>';
 document.querySelectorAll('.sale-edit').forEach(b=>b.onclick=()=>openSale(b.dataset.id));
}
function renderExpenses(){$('list-expenses').innerHTML=state.expenses.filter(x=>(x.expense_date||'').startsWith(state.month)).map(x=>`<div class="adm-row"><div>${money(x.amount)}</div><div>${x.concept||'Gasto'}<small>${x.expense_date||''}</small></div></div>`).join('')||'<p>Sin gastos registrados.</p>'}
function renderPopular(){const c=new Map();state.appointments.filter(a=>a.status==='completada'&&(a.appointment_date||'').startsWith(state.month)).forEach(a=>c.set(svcName(a),(c.get(svcName(a))||0)+1));$('popular-services').innerHTML=[...c.entries()].sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="popular-row"><div><b>${n}</b><small>${v} citas</small></div><strong>${v}</strong></div>`).join('')||'<div>Sin datos.</div>'}
function renderHistory(per){$('summary-6m').innerHTML=per.map(m=>`<div class="adm-6m-row"><div>${monthLabel(m.key)}</div><div>Ingresos ${money(m.income)} · Gastos ${money(m.expenses)}</div><div>${money(m.profit)}</div></div>`).join('')}
function renderChart(per){const c=$('finance-chart');if(!c||typeof Chart==='undefined')return;if(financeChart)financeChart.destroy();financeChart=new Chart(c,{type:'line',data:{labels:per.map(x=>monthLabel(x.key)),datasets:[{label:'Ingresos',data:per.map(x=>x.income)},{label:'Gastos',data:per.map(x=>x.expenses)}]},options:{responsive:true,maintainAspectRatio:false}})}
function csv(v){return '"'+String(v??'').replaceAll('"','""')+'"'}
function exportCSV(){const rows=state.appointments.filter(a=>a.status==='completada'&&(a.appointment_date||'').startsWith(state.month)),body=rows.map(a=>{const f=fiscal(a.id),calc=computeVatFromTotal(Number(a.price_charged||0),f?f.vat_applies===true:false,Number(f?.vat_rate??0.16));return[a.appointment_date,svcName(a),Number(a.price_charged||0).toFixed(2),Number(f?.subtotal??calc.subtotal).toFixed(2),Number(f?.vat_amount??calc.vat).toFixed(2),f?.vat_applies===true?'Sí':'No',f?.cfdi_status||'not_required',f?.cfdi_uuid||'']});const head=['Fecha','Servicio','Total','Subtotal','IVA','Aplica IVA','CFDI','UUID'],blob=new Blob(['\ufeff'+[head,...body].map(r=>r.map(csv).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`ventas-${state.month}.csv`;a.click();URL.revokeObjectURL(u)}
document.addEventListener('DOMContentLoaded',init);
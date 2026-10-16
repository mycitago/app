(function(global){
function money(n){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n||0))}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmtDate(v){if(!v)return '—';return new Date(v+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}
async function openCustomerDetail(c){
 const d=document.getElementById('customer-drawer'),h=document.getElementById('customer-detail-name'),b=document.getElementById('customer-detail-content');
 if(!d||!b)return;h.textContent=c.name||'Cliente';b.replaceChildren();
 const grid=document.createElement('div');grid.className='customer-detail-grid';
 [['WhatsApp',c.whatsapp||'—'],['Email',c.email||'—'],['Visitas',c.total_visits||0],['Completadas',c.completed_visits||0],['Última visita',c.last_visit||'—'],['Próxima visita',c.next_visit||'—'],['Valor histórico',money(c.lifetime_value)],['Segmento',c.segment||'Nuevo']].forEach(([k,v])=>{const x=document.createElement('div'),s=document.createElement('span'),st=document.createElement('strong');s.textContent=k;st.textContent=String(v);x.append(s,st);grid.appendChild(x)});
 b.appendChild(grid);
 if(c.notes){const n=document.createElement('div');n.className='customer-note';n.textContent=c.notes;b.appendChild(n)}
 const title=document.createElement('h3');title.textContent='Historial de citas';title.className='customer-history-title';b.appendChild(title);
 const hist=document.createElement('div');hist.className='customer-history';hist.textContent='Cargando historial…';b.appendChild(hist);
 const businessId=(global.biz&&global.biz.id)||c.business_id;
 const {data,error}=await supabaseClient.from('appointments').select('id,appointment_date,start_time,end_time,status,price_charged,services(name)').eq('business_id',businessId).eq('customer_id',c.id).order('appointment_date',{ascending:false}).order('start_time',{ascending:false}).limit(100);
 if(error){console.error('Error cargando historial del cliente:',error);hist.textContent='No pudimos cargar el historial.'}
 else if(!data?.length){hist.textContent='Este cliente todavía no tiene citas registradas.'}
 else{hist.innerHTML=data.map(a=>`<article class="customer-history-item"><div><strong>${esc(a.services?.name||'Servicio')}</strong><span>${fmtDate(a.appointment_date)} · ${esc(String(a.start_time||'').slice(0,5))}</span></div><div><span class="ct-badge">${esc(a.status||'pendiente')}</span><strong>${money(a.price_charged)}</strong></div></article>`).join('')}
 const a=document.createElement('a');a.className='ct-btn ct-btn-primary';a.target='_blank';a.rel='noopener';a.textContent='Abrir WhatsApp';a.href=`https://wa.me/${String(c.whatsapp||'').replace(/\D/g,'')}`;b.appendChild(a);
 d.classList.add('open');d.setAttribute('aria-hidden','false')
}
function close(){const d=document.getElementById('customer-drawer');if(d){d.classList.remove('open');d.setAttribute('aria-hidden','true')}}
document.addEventListener('click',e=>{if(e.target.closest('[data-close-customer]'))close()});
global.openCustomerDetail=openCustomerDetail
})(window);

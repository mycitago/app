(function(global){
  const $=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let ctx={business:null,user:null,services:[]};

  function toast(message,type='info'){
    let node=$('ct-global-toast');
    if(!node){node=document.createElement('div');node.id='ct-global-toast';node.className='ct-global-toast';document.body.appendChild(node)}
    node.dataset.type=type;node.textContent=message;node.classList.add('show');clearTimeout(node._timer);node._timer=setTimeout(()=>node.classList.remove('show'),3200);
  }
  function closeDialog(id){$(id)?.classList.remove('open');document.body.classList.remove('ct-dialog-open')}
  function openDialog(id){$(id)?.classList.add('open');document.body.classList.add('ct-dialog-open')}
  function bookingUrl(){
    const slug=ctx.business?.slug;
    if(!slug)return '';
    return `${location.origin}${location.pathname.split('/admin/')[0]}/reservar.html?n=${encodeURIComponent(slug)}`;
  }
  async function ensureContext(){
    if(ctx.business)return ctx;
    if(typeof requireAuth!=='function'||typeof getMyBusiness!=='function')throw new Error('No se pudo cargar tu sesión.');
    const session=await requireAuth();if(!session)throw new Error('Sesión no disponible.');
    const business=await getMyBusiness(session.user);if(!business)throw new Error('No encontramos tu negocio.');
    ctx.user=session.user;ctx.business=business;return ctx;
  }
  async function copyText(text){
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return}
    const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();
  }
  async function openShare(){
    try{await ensureContext();const url=bookingUrl();if(!url)throw new Error('Configura primero el enlace público de tu negocio.');$('ct-share-url').value=url;$('ct-share-business').textContent=ctx.business.name||'Tu negocio';const message=`Reserva tu cita en ${ctx.business.name||'nuestro negocio'}: ${url}`;$('ct-share-whatsapp').href=`https://wa.me/?text=${encodeURIComponent(message)}`;if($('ct-share-email'))$('ct-share-email').href=`mailto:?subject=${encodeURIComponent('Reserva tu cita en '+(ctx.business.name||'nuestro negocio'))}&body=${encodeURIComponent(message)}`;if($('ct-share-open'))$('ct-share-open').href=url;renderShareQr(url);openDialog('ct-share-dialog')}catch(e){toast(e.message,'error')}
  }
  function renderShareQr(url){const root=$('ct-share-qr');if(!root)return;root.innerHTML='';const img=document.createElement('img');img.alt='Código QR del enlace de reservas';img.width=140;img.height=140;img.src=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;root.appendChild(img)}
  async function loadServices(){
    await ensureContext();
    const {data,error}=await supabaseClient.from('services').select('id,name,duration_minutes,price,active').eq('business_id',ctx.business.id).eq('active',true).order('name');
    if(error)throw error;ctx.services=data||[];const sel=$('ct-appt-service');sel.innerHTML='<option value="">Selecciona un servicio</option>'+ctx.services.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${Number(s.duration_minutes||60)} min</option>`).join('');
  }
  function minToTime(total){const h=Math.floor(total/60)%24,m=total%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}
  function endTime(start,duration){const [h,m]=String(start).split(':').map(Number);return minToTime(h*60+m+Number(duration||60))}
  async function openAppointment(){
    try{await ensureContext();await loadServices();const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());$('ct-appt-date').value=d.toISOString().slice(0,10);$('ct-appt-time').value='09:00';openDialog('ct-appointment-dialog');setTimeout(()=>$('ct-appt-name')?.focus(),80)}catch(e){toast(e.message,'error')}
  }
  async function createAppointment(ev){
    ev.preventDefault();const btn=$('ct-appt-submit');btn.disabled=true;const old=btn.textContent;btn.textContent='Guardando…';
    try{
      await ensureContext();const service=ctx.services.find(s=>s.id===$('ct-appt-service').value);if(!service)throw new Error('Selecciona un servicio.');
      const name=$('ct-appt-name').value.trim(),digits=$('ct-appt-phone').value.replace(/\D/g,'');if(!name)throw new Error('Escribe el nombre del cliente.');if(digits.length<8)throw new Error('Escribe un teléfono válido.');
      const phone=digits.startsWith('52')?digits:`52${digits}`;const date=$('ct-appt-date').value,start=$('ct-appt-time').value,end=endTime(start,service.duration_minutes);
      const {data,error}=await supabaseClient.rpc('create_appointment',{p_business_id:ctx.business.id,p_service_id:service.id,p_name:name,p_whatsapp:phone,p_date:date,p_start:start,p_end:end,p_notes:$('ct-appt-notes').value.trim()||null});
      if(error)throw error;closeDialog('ct-appointment-dialog');$('ct-appt-form').reset();toast('Cita creada correctamente','success');global.dispatchEvent(new CustomEvent('mycitago:appointment-created',{detail:{data}}));
    }catch(e){const raw=String(e?.message||e);const friendly=/slot_taken|23P01|exclu/i.test(raw)?'Ese horario ya está ocupado. Elige otro.':raw;toast(friendly,'error')}finally{btn.disabled=false;btn.textContent=old}
  }
  function userMenu(){const m=$('ct-user-menu');m?.classList.toggle('open')}
  async function logout(){try{await supabaseClient.auth.signOut()}finally{location.replace('login.html')}}
  function bind(){
    document.querySelectorAll('.ct-share-trigger').forEach(b=>b.addEventListener('click',openShare));
    document.querySelectorAll('.ct-new-appointment-trigger').forEach(b=>b.addEventListener('click',openAppointment));
    document.querySelectorAll('[data-ct-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.dataset.ctClose)));
    $('ct-share-copy')?.addEventListener('click',async()=>{await copyText($('ct-share-url').value);toast('Link copiado','success')});
    $('ct-appt-form')?.addEventListener('submit',createAppointment);$('ct-user-trigger')?.addEventListener('click',userMenu);$('ct-logout')?.addEventListener('click',logout);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDialog('ct-share-dialog');closeDialog('ct-appointment-dialog')}});
    document.addEventListener('click',e=>{if(!e.target.closest('.ct-user-wrap'))$('ct-user-menu')?.classList.remove('open')});
  }
  function mount(){bind();ensureContext().then(()=>{const name=$('ct-user-menu-business');if(name)name.textContent=ctx.business?.name||'Mi negocio'}).catch(()=>{})}
  global.CitagoAdminActions={mount,openShare,openAppointment,bookingUrl};
})(window);

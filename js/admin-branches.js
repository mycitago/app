let branchBiz=null,branches=[];
const R=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function rToast(m){
  const e=R('toast');
  if(!e)return;
  e.textContent=m;
  e.classList.remove('hidden');
  setTimeout(()=>e.classList.add('hidden'),2500);
}

function queryOptions(){
  const q=new URLSearchParams(location.search);
  return {
    focus:q.get('focus')||'',
    returnTo:q.get('return')||''
  };
}

async function loadBranches(){
  const {data,error}=await supabaseClient
    .from('business_branches')
    .select('*')
    .eq('business_id',branchBiz.id)
    .order('is_primary',{ascending:false})
    .order('name');

  if(error)throw error;
  branches=data||[];
  renderBranches();
}

function renderBranches(){
  R('branches').innerHTML=branches.map(b=>`
    <article class="branch-card">
      <div>
        <span class="branch-icon">⌂</span>
        <div>
          <strong>${esc(b.name)}</strong>
          <small>${b.is_primary?'Sucursal principal · ':''}${b.active?'Activa':'Inactiva'}</small>
        </div>
      </div>
      <p>${esc(b.address||'Sin dirección capturada')}</p>
      <p>${esc(b.phone||'Sin teléfono')}</p>
      <p><b>Zona horaria:</b> ${esc(b.timezone||'Sin configurar')}</p>
      <button data-edit-branch="${b.id}">Editar</button>
    </article>
  `).join('')||'<div class="team-empty">No hay sucursales. Crea la principal para configurar la zona horaria.</div>';

  R('branches').querySelectorAll('[data-edit-branch]')
    .forEach(x=>x.onclick=()=>openBranch(x.dataset.editBranch));
}

function openBranch(id=null,{focusTimezone=false}={}){
  const b=branches.find(x=>x.id===id);

  R('branch-id').value=b?.id||'';
  R('branch-name').value=b?.name||'';
  R('branch-phone').value=b?.phone||'';
  R('branch-address').value=b?.address||'';
  R('branch-timezone').value=b?.timezone||'America/Mexico_City';
  R('branch-active').checked=b?.active!==false;
  R('branch-title').textContent=b?'Editar sucursal':'Nueva sucursal';
  R('branch-dialog').classList.remove('hidden');

  const field=R('branch-timezone-field');
  field?.classList.toggle('timezone-focus',focusTimezone);

  if(focusTimezone){
    setTimeout(()=>R('branch-timezone')?.focus(),100);
  }
}

function closeBranch(){
  R('branch-dialog').classList.add('hidden');
  R('branch-timezone-field')?.classList.remove('timezone-focus');
}

async function saveBranch(e){
  e.preventDefault();

  const id=R('branch-id').value;
  const timezone=R('branch-timezone').value;

  try{
    new Intl.DateTimeFormat('es-MX',{timeZone:timezone}).format(new Date());
  }catch{
    return rToast('Selecciona una zona horaria válida.');
  }

  const payload={
    business_id:branchBiz.id,
    name:R('branch-name').value.trim(),
    phone:R('branch-phone').value.trim()||null,
    address:R('branch-address').value.trim()||null,
    timezone,
    active:R('branch-active').checked,
    updated_at:new Date().toISOString()
  };

  if(!payload.name)return rToast('Escribe el nombre.');

  if(id){
    const {error}=await supabaseClient
      .from('business_branches')
      .update(payload)
      .eq('id',id)
      .eq('business_id',branchBiz.id);
    if(error)throw error;
  }else{
    const {error}=await supabaseClient
      .from('business_branches')
      .insert({...payload,is_primary:branches.length===0});
    if(error)throw error;
  }

  closeBranch();
  rToast('Sucursal y zona horaria guardadas');
  await loadBranches();

  const opts=queryOptions();
  if(opts.returnTo){
    setTimeout(()=>{ location.href=opts.returnTo; },650);
  }
}

function focusTimezoneFromDashboard(){
  const opts=queryOptions();
  if(opts.focus!=='timezone')return;

  R('timezone-return-note')?.classList.remove('hidden');

  const primary=branches.find(x=>x.is_primary) || branches[0];
  if(primary){
    openBranch(primary.id,{focusTimezone:true});
  }else{
    openBranch(null,{focusTimezone:true});
  }
}

async function initBranches(){
  const s=await requireAuth();
  if(!s)return;

  branchBiz=await getMyBusiness(s.user);
  if(!branchBiz)return;

  R('new-branch').onclick=()=>openBranch();
  R('branch-form').onsubmit=e=>saveBranch(e).catch(err=>rToast(err.message));
  document.querySelectorAll('[data-branch-close]').forEach(x=>x.onclick=closeBranch);

  try{
    await loadBranches();
    focusTimezoneFromDashboard();
  }catch(e){
    console.error('[branches]',e);
    R('branches').innerHTML='<div class="team-empty"><b>No pudimos cargar las sucursales</b><span>Revisa la migración y los permisos de business_branches.</span></div>';
  }
}

document.addEventListener('DOMContentLoaded',initBranches);

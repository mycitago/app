let biz;
let selectedTheme;
const $=id=>document.getElementById(id);
function toast(t){$('toast').textContent=t;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),2500)}
async function upload(file,kind){if(!file)return null;const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${biz.id}/${kind}-${Date.now()}.${ext}`;const {error}=await supabaseClient.storage.from('business-public-media').upload(path,file,{upsert:true});if(error)throw error;return supabaseClient.storage.from('business-public-media').getPublicUrl(path).data.publicUrl}
function progress(){const ids=['name','description','whatsapp','address','instagram','slug'];let n=ids.filter(x=>($(x).value||'').trim()).length;n+=biz?.logo_url?1:0;n+=biz?.cover_image_url?1:0;const p=Math.round(n/8*100);$('setup-bar').style.width=p+'%';$('setup-label').textContent=p+'% completo';return p}

function renderThemePicker(){
  const grid=$('theme-grid');
  if(!grid)return;
  grid.innerHTML=Object.entries(THEMES).map(([id,t])=>
    `<button type="button" class="theme-swatch${id===selectedTheme?' active':''}" data-theme="${id}" style="background:${t.swatch}" title="${t.label}"></button>`
  ).join('');
  $('theme-name').textContent=(THEMES[selectedTheme]||THEMES[DEFAULT_THEME]).label;
  grid.querySelectorAll('.theme-swatch').forEach(btn=>{
    btn.addEventListener('click',()=>{
      selectedTheme=btn.dataset.theme;
      applyTheme(selectedTheme);
      grid.querySelectorAll('.theme-swatch').forEach(b=>b.classList.toggle('active',b.dataset.theme===selectedTheme));
      $('theme-name').textContent=THEMES[selectedTheme].label;
    });
  });
}

async function init(){
  const s=await requireAuth();if(!s)return;
  biz=await getMyBusiness(s.user);if(!biz)return;
  ['name','description','whatsapp','phone','email','address','instagram','slug','booking_notice','cancellation_policy'].forEach(k=>{if($(k))$(k).value=biz[k]||''});
  if(biz.logo_url)$('logo-preview').innerHTML=`<img src="${biz.logo_url}" alt="Logo">`;
  if(biz.cover_image_url)$('cover-preview').innerHTML=`<img src="${biz.cover_image_url}" alt="Portada">`;
  selectedTheme=biz.theme||DEFAULT_THEME;
  applyTheme(selectedTheme);
  renderThemePicker();
  document.querySelectorAll('input,textarea').forEach(x=>x.addEventListener('input',progress));
  progress();
  $('save').onclick=save;
  $('btn-logout').onclick=logout;
}

async function save(){
  try{
    $('save').disabled=true;$('save').textContent='Guardando…';
    const logo=await upload($('logo-file').files[0],'logo');
    const cover=await upload($('cover-file').files[0],'cover');
    const payload={};
    ['name','description','whatsapp','phone','email','address','instagram','booking_notice','cancellation_policy'].forEach(k=>payload[k]=$(k).value.trim()||null);
    payload.slug=slugify($('slug').value||$('name').value);
    payload.theme=selectedTheme||DEFAULT_THEME;
    if(logo)payload.logo_url=logo;
    if(cover)payload.cover_image_url=cover;
    payload.setup_completed=progress()===100;
    const {data,error}=await supabaseClient.from('businesses').update(payload).eq('id',biz.id).select().single();
    if(error)throw error;
    biz={...biz,...data};
    toast('Negocio actualizado');
    setTimeout(()=>location.reload(),700);
  }catch(e){
    console.error(e);
    toast('No se pudo guardar: '+e.message);
  }finally{
    $('save').disabled=false;$('save').textContent='Guardar cambios';
  }
}
document.addEventListener('DOMContentLoaded',init);

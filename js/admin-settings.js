let biz;
let selectedTheme;
const $=id=>document.getElementById(id);

function toast(t,type='info'){
  const el=$('toast');
  if(!el)return;
  el.textContent=t;el.dataset.type=type;el.classList.remove('hidden');
  clearTimeout(window.__ctToast);window.__ctToast=setTimeout(()=>el.classList.add('hidden'),3200);
}

function progress(){
  const ids=['name','description','whatsapp','address','instagram','slug'];
  let n=ids.filter(x=>(($(x)?.value)||'').trim()).length;
  n+=biz?.logo_url?1:0;n+=biz?.cover_image_url?1:0;
  const p=Math.round(n/8*100);
  if($('setup-bar'))$('setup-bar').style.width=p+'%';
  if($('setup-label'))$('setup-label').textContent=p+'% completo';
  return p;
}

function renderThemePicker(){
  const grid=$('theme-grid');if(!grid||typeof THEMES==='undefined')return;
  grid.innerHTML=Object.entries(THEMES).map(([id,t])=>
    `<button type="button" class="theme-swatch${id===selectedTheme?' active':''}" data-theme="${id}" style="background:${t.swatch}" title="${t.label}"></button>`
  ).join('');
  if($('theme-name'))$('theme-name').textContent=(THEMES[selectedTheme]||THEMES[DEFAULT_THEME]).label;
  grid.querySelectorAll('.theme-swatch').forEach(btn=>btn.addEventListener('click',()=>{
    selectedTheme=btn.dataset.theme;applyTheme(selectedTheme);
    grid.querySelectorAll('.theme-swatch').forEach(b=>b.classList.toggle('active',b.dataset.theme===selectedTheme));
    if($('theme-name'))$('theme-name').textContent=THEMES[selectedTheme].label;
  }));
}

function preview(inputId,targetId,fileNameId){
  const input=$(inputId),target=$(targetId),fileName=$(fileNameId);if(!input||!target)return;
  input.accept='image/jpeg,image/png,image/webp';
  input.addEventListener('change',()=>{
    const f=input.files?.[0];if(!f)return;if(fileName)fileName.textContent=f.name;
    if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024){
      input.value='';toast('Usa JPG, PNG o WEBP de máximo 5 MB.','error');return;
    }
    const u=URL.createObjectURL(f);
    target.innerHTML=`<img src="${u}" alt="Vista previa">`;
    setTimeout(()=>URL.revokeObjectURL(u),60000);
  });
}

async function init(){
  const s=await requireAuth();if(!s)return;
  biz=await getMyBusiness(s.user);if(!biz)return;
  ['name','description','whatsapp','phone','email','address','instagram','slug','booking_notice','cancellation_policy']
    .forEach(k=>{if($(k))$(k).value=biz[k]||''});
  if(biz.logo_url&&$('logo-preview'))$('logo-preview').innerHTML=`<img src="${biz.logo_url}" alt="Logo">`;
  if(biz.cover_image_url&&$('cover-preview'))$('cover-preview').innerHTML=`<img src="${biz.cover_image_url}" alt="Portada">`;
  selectedTheme=biz.theme||DEFAULT_THEME;applyTheme(selectedTheme);renderThemePicker();
  document.querySelectorAll('input,textarea').forEach(x=>x.addEventListener('input',progress));
  preview('logo-file','logo-preview','logo-file-name');preview('cover-file','cover-preview','cover-file-name');
  progress();if($('save'))$('save').onclick=save;if($('btn-logout'))$('btn-logout').onclick=logout;
}

async function save(){
  const btn=$('save');
  try{
    btn.disabled=true;btn.textContent='Guardando…';
    const logoFile=$('logo-file')?.files?.[0];
    const coverFile=$('cover-file')?.files?.[0];
    let logo=null,cover=null;

    if(logoFile) logo=(await CitagoMedia.uploadPublicImage(logoFile,{businessId:biz.id,kind:'logo'})).url;
    if(coverFile) cover=(await CitagoMedia.uploadPublicImage(coverFile,{businessId:biz.id,kind:'cover'})).url;

    const payload={};
    ['name','description','whatsapp','phone','email','address','instagram','booking_notice','cancellation_policy']
      .forEach(k=>payload[k]=($(k)?.value||'').trim()||null);
    payload.slug=slugify(($('slug')?.value||$('name')?.value||''));
    payload.theme=selectedTheme||DEFAULT_THEME;
    if(logo)payload.logo_url=logo;if(cover)payload.cover_image_url=cover;

    const {data,error}=await supabaseClient.from('businesses').update(payload).eq('id',biz.id)
      .select('id,name,slug,logo_url,cover_image_url,theme').single();
    if(error)throw error;if(!data?.id)throw new Error('Supabase no confirmó el guardado.');

    biz={...biz,...data};
    if(logo&&$('logo-preview'))$('logo-preview').innerHTML=`<img src="${logo}" alt="Logo">`;
    if(cover&&$('cover-preview'))$('cover-preview').innerHTML=`<img src="${cover}" alt="Portada">`;
    if($('logo-file'))$('logo-file').value='';if($('cover-file'))$('cover-file').value='';
    if($('logo-file-name'))$('logo-file-name').textContent='Guardado';if($('cover-file-name'))$('cover-file-name').textContent='Guardado';
    await supabaseClient.from('businesses').update({setup_completed:progress()===100}).eq('id',biz.id);
    toast('Cambios guardados correctamente','success');
  }catch(e){
    console.error('[CITAGO settings]',e);toast('No se pudo guardar: '+(e?.message||'Error desconocido'),'error');
  }finally{
    btn.disabled=false;btn.textContent='Guardar cambios';
  }
}
document.addEventListener('DOMContentLoaded',init);
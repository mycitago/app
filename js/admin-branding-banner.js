/* E2 — banner sobre el sistema de branding existente */
(function(){
 const B=id=>document.getElementById(id);
 function mountFields(){
  const form=B('branding-form');if(!form||B('banner_enabled'))return;
  const s=document.createElement('section');s.className='ct-card brand-section';s.innerHTML=`<div class="brand-section-head"><div><span class="ct-eyebrow">ANUNCIO</span><h2>Banner de tu página</h2><p>Publica un aviso breve sin crear otro sistema de temas.</p></div></div><label class="brand-banner-toggle"><input id="banner_enabled" type="checkbox"> Mostrar banner</label><label>Texto del banner<input id="banner_text" maxlength="120" placeholder="Ej. Agenda abierta esta semana"></label><label>Enlace opcional<input id="banner_url" type="url" placeholder="https://…"></label>`;form.appendChild(s);
 }
 async function hydrate(){
  mountFields();if(!window.brandingBiz?.id)return;
  const {data}=await supabaseClient.from('business_branding').select('banner_enabled,banner_text,banner_url').eq('business_id',window.brandingBiz.id).maybeSingle();
  if(data){B('banner_enabled').checked=!!data.banner_enabled;B('banner_text').value=data.banner_text||'';B('banner_url').value=data.banner_url||''}
 }
 async function save(){
  if(!window.brandingBiz?.id||!B('banner_enabled'))return;
  await supabaseClient.from('business_branding').update({banner_enabled:B('banner_enabled').checked,banner_text:B('banner_text').value.trim()||null,banner_url:B('banner_url').value.trim()||null}).eq('business_id',window.brandingBiz.id);
 }
 document.addEventListener('DOMContentLoaded',()=>setTimeout(hydrate,700));
 document.addEventListener('click',e=>{if(e.target?.id==='save-branding'||e.target?.id==='publish-branding')setTimeout(save,50)});
})();
/* D3/F3 — service_templates es la fuente canónica */
(function(){
  if(typeof renderServiceTemplates!=='function')return;
  let canonical=[];
  const fallbackImage=()=>typeof assetUrl==='function'?assetUrl('consulting.svg'):'';

  currentBusinessCategoryKey=function(){
    const key=String(biz?.business_category_id||'').trim();
    return key||'other';
  };
  templateBelongsToBusiness=function(t){
    return String(t?.business_category_id||currentBusinessCategoryKey())===currentBusinessCategoryKey();
  };
  applyServiceTemplate=function(t){
    if(!templateBelongsToBusiness(t)){toast('Esta plantilla no pertenece al giro de tu negocio');return}
    clearForm();$('sname').value=t.name;$('category').value=t.category||'Servicios';$('duration').value=t.duration;
    $('sdesc').value=t.description||'';$('price').value=Number(t.suggestedPrice||0)||'';
    selectedPresetImage=t.image_url||platformAssetForTemplate(t)||fallbackImage();$('preset-image-url').value=selectedPresetImage;
    updateSummary();calculateServiceIntelligence();saveLocalDraft();$('price').focus();toast(`${t.name}: revisa y confirma el precio sugerido`);
  };
  async function createCanonicalBatch(list,box){
    const btn=$('confirm-batch-services');btn.disabled=true;
    try{
      for(let i=0;i<list.length;i++){
        const t=list[i],price=Number(box.querySelector(`[data-batch-price="${i}"]`).value)||0;
        const image_url=t.image_url||platformAssetForTemplate(t)||fallbackImage();
        const {error}=await supabaseClient.from('services').insert({business_id:biz.id,name:t.name,category:t.category||'Servicios',price,duration_minutes:t.duration,description:t.description||'',image_url,active:true});
        if(error)throw error;
      }
      toast(`${list.length} servicios creados`);box.remove();await loadServices();
    }catch(e){toast('No se pudieron crear: '+e.message)}finally{btn.disabled=false}
  }
  openBatchTemplateReview=function(){
    const list=canonical.filter(t=>selectedTemplateNames.has(t.name));if(!list.length)return toast('Selecciona al menos una plantilla');
    let box=$('template-batch-review');if(!box){box=document.createElement('section');box.id='template-batch-review';box.className='svc-card svc-batch-review';$('service-template-library').after(box)}
    box.innerHTML=`<div class="svc-card-title svc-batch-head"><div><h2>Revisa antes de crear</h2><p class="svc-batch-helper">Las plantillas provienen del catálogo oficial de MyCitaGo.</p></div></div><div class="svc-batch-review-list">${list.map((t,i)=>`<label class="svc-batch-review-row"><span class="svc-batch-service-name">${t.name}</span><span class="svc-batch-duration">${t.duration} min</span><input data-batch-price="${i}" type="number" min="0" step="0.01" value="${Number(t.suggestedPrice||0)}"></label>`).join('')}</div><button id="confirm-batch-services" class="svc-btn svc-btn-primary" type="button">Confirmar y crear ${list.length} servicios</button>`;
    $('confirm-batch-services').onclick=()=>createCanonicalBatch(list,box);
  };
  renderServiceTemplates=async function(){
    const businessCategory=currentBusinessCategoryKey();currentTemplateCategory=businessCategory;selectedTemplateNames.clear();
    const root=$('service-template-library');if(!root)return;
    root.innerHTML='<div class="svc-empty">Cargando catálogo oficial…</div>';
    const {data,error}=await supabaseClient.from('service_templates').select('id,business_category_id,name,category,description,duration_minutes,suggested_price,image_url,sort_order,active').eq('business_category_id',businessCategory).eq('active',true).order('sort_order').order('name');
    if(error){root.innerHTML='<div class="svc-empty">No se pudo cargar el catálogo oficial.</div>';return console.error('[service_templates]',error)}
    canonical=(data||[]).map(t=>({...t,duration:Number(t.duration_minutes||60),suggestedPrice:Number(t.suggested_price||0)}));
    root.replaceChildren();
    const tools=document.createElement('div');tools.className='svc-template-batch-tools';tools.innerHTML='<div class="svc-template-step-copy"><b><span class="svc-template-step-number">2</span> Elige servicios para agregar</b><span>Catálogo oficial de MyCitaGo para tu giro.</span></div><button id="add-selected-templates" type="button">Agregar seleccionados</button>';root.appendChild(tools);
    canonical.forEach(t=>{
      const card=document.createElement('label');card.className='svc-template-card svc-template-select';
      const check=document.createElement('input');check.type='checkbox';check.onchange=()=>check.checked?selectedTemplateNames.add(t.name):selectedTemplateNames.delete(t.name);
      const img=document.createElement('img');img.src=t.image_url||platformAssetForTemplate(t)||fallbackImage();img.alt='';
      const body=document.createElement('span'),b=document.createElement('b'),small=document.createElement('small');b.textContent=t.name;small.textContent=`${t.duration} min · ${t.suggestedPrice?money(t.suggestedPrice)+' sugerido':'precio por definir'}`;body.append(b,small);
      const use=document.createElement('button');use.type='button';use.textContent='Usar';use.onclick=e=>{e.preventDefault();applyServiceTemplate(t)};
      card.append(check,img,body,use);root.appendChild(card);
    });
    root.querySelector('#add-selected-templates')?.addEventListener('click',openBatchTemplateReview);
  };
  const wait=setInterval(()=>{if(typeof biz!=='undefined'&&biz?.id){clearInterval(wait);renderServiceTemplates()}},120);
  setTimeout(()=>clearInterval(wait),7000);
})();
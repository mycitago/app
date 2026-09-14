/* CITAGO D3/R2 — canonical service templates for Services.
Load AFTER admin-services.js and BEFORE DOMContentLoaded.
Requires the one-line listener patch documented in PATCH_INTEGRACION.md. */
(() => {
  let canonicalServiceTemplates=[];

  async function loadCanonicalServiceTemplates(){
    if(!biz?.id){canonicalServiceTemplates=[];return [];}
    const {data,error}=await supabaseClient.rpc(
      'get_business_service_templates',
      {p_business_id:biz.id}
    );
    if(error){
      console.error('[D3 Services] canonical templates:',error);
      canonicalServiceTemplates=[];
      toast('No se pudieron cargar las plantillas de tu giro.');
      return [];
    }
    canonicalServiceTemplates=(data||[]).map(row=>({
      id:row.id,
      name:row.name,
      category:row.category||'Servicios',
      description:row.description||'',
      duration:Number(row.duration_minutes||60),
      suggestedPrice:row.suggested_price==null?0:Number(row.suggested_price),
      imageUrl:row.image_url||'',
      tags:Array.isArray(row.tags)?row.tags:[]
    }));
    return canonicalServiceTemplates;
  }

  currentBusinessCategoryKey=function(){
    return String(biz?.business_category_id||'').trim();
  };

  allowedServiceCategories=function(){
    return [...new Set(canonicalServiceTemplates.map(t=>String(t.category||'').trim()).filter(Boolean))];
  };

  isAllowedServiceCategory=function(category){
    const allowed=allowedServiceCategories();
    if(!allowed.length)return true;
    const value=String(category||'').trim().toLocaleLowerCase('es-MX');
    return allowed.some(x=>x.toLocaleLowerCase('es-MX')===value);
  };

  templateBelongsToBusiness=function(t){
    return canonicalServiceTemplates.some(x=>String(x.id)===String(t?.id));
  };

  templateAssetKey=function(t){
    const category=currentBusinessCategoryKey()||'other';
    const slug=String(t?.name||'').toLowerCase().normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return `${category}:${slug}`;
  };

  renderServiceTemplates=function(){
    selectedTemplateNames.clear();
    const root=$('service-template-library');
    if(!root)return;
    root.replaceChildren();
    const tools=document.createElement('div');
    tools.className='svc-template-batch-tools';
    tools.innerHTML='<div class="svc-template-step-copy"><b><span class="svc-template-step-number">2</span> Elige servicios para agregar</b><span>Selecciona una o varias plantillas compatibles con tu giro.</span></div><button id="add-selected-templates" type="button">Agregar seleccionados</button>';
    root.appendChild(tools);

    if(!canonicalServiceTemplates.length){
      const empty=document.createElement('div');
      empty.className='svc-empty';
      empty.textContent='Aún no hay plantillas recomendadas para este giro. Puedes crear un servicio manualmente.';
      root.appendChild(empty);
      root.querySelector('#add-selected-templates')?.setAttribute('disabled','disabled');
      return;
    }

    canonicalServiceTemplates.forEach(t=>{
      const card=document.createElement('label');
      card.className='svc-template-card svc-template-select';
      const check=document.createElement('input');
      check.type='checkbox';
      check.onchange=()=>check.checked
        ? selectedTemplateNames.add(String(t.id))
        : selectedTemplateNames.delete(String(t.id));
      const img=document.createElement('img');
      img.src=platformAssetForTemplate(t)||t.imageUrl||assetUrl('consulting.svg');
      img.alt='';
      const body=document.createElement('span');
      const name=document.createElement('b');
      const small=document.createElement('small');
      name.textContent=t.name;
      const price=suggestedPriceForTemplate(t);
      small.textContent=`${t.duration} min · ${price?money(price)+' sugerido':'precio por definir'}`;
      body.append(name,small);
      const use=document.createElement('button');
      use.type='button';
      use.textContent='Usar';
      use.onclick=e=>{e.preventDefault();applyServiceTemplate(t)};
      card.append(check,img,body,use);
      root.appendChild(card);
    });
    root.querySelector('#add-selected-templates')?.addEventListener('click',openBatchTemplateReview);
  };

  applyServiceTemplate=function(t){
    if(!templateBelongsToBusiness(t)){toast('Esta plantilla no pertenece al giro de tu negocio');return;}
    clearForm();
    $('sname').value=t.name||'';
    $('category').value=t.category||'Servicios';
    $('duration').value=t.duration||60;
    $('sdesc').value=t.description||'';
    const price=suggestedPriceForTemplate(t);
    $('price').value=price||'';
    selectedPresetImage=platformAssetForTemplate(t)||t.imageUrl||assetUrl('consulting.svg');
    $('preset-image-url').value=selectedPresetImage;
    updateSummary();calculateServiceIntelligence();saveLocalDraft();$('price').focus();
    toast(`${t.name}: revisa y confirma el precio sugerido`);
  };

  openBatchTemplateReview=function(){
    const list=canonicalServiceTemplates.filter(t=>selectedTemplateNames.has(String(t.id)));
    if(!list.length)return toast('Selecciona al menos una plantilla');
    let box=$('template-batch-review');
    if(!box){
      box=document.createElement('section');
      box.id='template-batch-review';
      box.className='svc-card svc-batch-review';
      $('service-template-library').after(box);
    }
    box.innerHTML=`
      <div class="svc-card-title svc-batch-head"><div>
        <h2>Revisa antes de crear</h2>
        <p class="svc-batch-helper">Los precios son sugerencias y no se guardan hasta confirmar.</p>
      </div></div>
      <div class="svc-batch-review-list">
        ${list.map((t,i)=>`
          <label class="svc-batch-review-row">
            <span class="svc-batch-service-name">${t.name}</span>
            <span class="svc-batch-duration">${t.duration} min</span>
            <input data-batch-price="${i}" type="number" min="0" step="0.01"
              value="${suggestedPriceForTemplate(t)}" aria-label="Precio sugerido de ${t.name}">
          </label>`).join('')}
      </div>
      <button id="confirm-batch-services" class="svc-btn svc-btn-primary" type="button">
        Confirmar y crear ${list.length} servicios
      </button>`;
    $('confirm-batch-services').onclick=()=>createBatchServices(list,box);
  };

  createBatchServices=async function(list,box){
    const btn=$('confirm-batch-services');btn.disabled=true;
    try{
      if(list.some(t=>!templateBelongsToBusiness(t)))throw new Error('Hay plantillas que no pertenecen al giro de tu negocio');
      for(let i=0;i<list.length;i++){
        const t=list[i];
        const price=Number(box.querySelector(`[data-batch-price="${i}"]`).value)||0;
        const generic=platformAssetForTemplate(t)||t.imageUrl||assetUrl('consulting.svg');
        let image_url=generic;
        if(platformAssetForTemplate(t)&&window.CitagoMedia){
          image_url=(await CitagoMedia.adoptPublicImage(generic,{businessId:biz.id,kind:'services'})).url;
        }
        const existing=items.find(s=>
          String(s.name||'').trim().toLocaleLowerCase('es-MX')===
          String(t.name||'').trim().toLocaleLowerCase('es-MX')
        );
        const payload={
          business_id:biz.id,name:t.name,category:t.category,price,
          duration_minutes:t.duration,description:t.description||'',image_url,active:true
        };
        const result=existing
          ? await supabaseClient.from('services').update(payload).eq('id',existing.id).eq('business_id',biz.id)
          : await supabaseClient.from('services').insert(payload);
        if(result.error)throw result.error;
      }
      toast(`${list.length} servicios guardados`);box.remove();await loadServices();
    }catch(e){toast('No se pudieron crear: '+e.message)}
    finally{btn.disabled=false}
  };

  init=async function(){
    const session=await requireAuth();if(!session)return;
    biz=await getMyBusiness(session.user);if(!biz)return;
    lockBusinessTypeSelector();
    await loadPlatformDefaultAssets();
    await loadCanonicalServiceTemplates();
    renderServiceTemplates();
    renderPresets();
    renderHours(biz.opening_hours||HOUR_TEMPLATES.office);
    bindUI();updateSummary();

    const sub=biz.subscription;
    if(sub){
      $('svc-plan-skeleton')?.remove();
      $('svc-plan-name')?.classList.remove('hidden');
      $('svc-plan-date')?.classList.remove('hidden');
      if($('svc-plan-name'))$('svc-plan-name').textContent=sub.plan_id||sub.plan||'Plan activo';
      if($('svc-plan-date'))$('svc-plan-date').textContent=sub.current_period_end
        ? `Vigente hasta ${localDateLabel(sub.current_period_end)}`:'Suscripción activa';
    }

    const iso=new Date().toISOString().slice(0,10);
    if($('block-date'))$('block-date').min=iso;
    if($('block-time-date'))$('block-time-date').min=iso;
    await Promise.all([loadServices(),loadBlocks(),loadStaff()]);
    restoreLocalDraft();calculateServiceIntelligence();syncScheduleMode();
    window.lucide?.createIcons();
  };

  document.addEventListener('DOMContentLoaded',async ()=>{
    if(window.__citagoD3ServicesStarted)return;
    window.__citagoD3ServicesStarted=true;
    await init();
  },{once:true});
})();

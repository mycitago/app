/* CITAGO D3/R2 — canonical service templates for Onboarding.
Load AFTER admin-onboarding.js and BEFORE DOMContentLoaded. */
(() => {
  async function loadCanonicalOnboardingTemplates(){
    if(!onboardingBiz?.id){
      onboardingTemplates=[];
      selectedTemplateIds=new Set();
      return;
    }
    const {data,error}=await supabaseClient.rpc(
      'get_business_service_templates',
      {p_business_id:onboardingBiz.id}
    );
    if(error){
      console.error('[D3 Onboarding] canonical templates:',error);
      onboardingTemplates=[];
      selectedTemplateIds=new Set();
      obToast('No se pudieron cargar las recomendaciones de servicios. Intenta de nuevo.','error');
      return;
    }
    onboardingTemplates=data||[];
    const existingNames=new Set(onboardingExistingServices.map(s=>normalizeName(s.name)));
    const preselected=onboardingTemplates
      .filter(t=>existingNames.has(normalizeName(t.name)))
      .map(t=>t.id);
    selectedTemplateIds=new Set(
      preselected.length
        ? preselected
        : onboardingTemplates.slice(0,Math.min(4,onboardingTemplates.length)).map(x=>x.id)
    );
  }

  loadTemplates=async function(){
    return loadCanonicalOnboardingTemplates();
  };

  const originalRenderTemplates=renderTemplates;
  renderTemplates=function(){
    const root=ob('onboarding-services');
    if(!onboardingTemplates.length){
      selectedTemplateIds=new Set();
      const empty=document.createElement('div');
      empty.className='onboarding-empty';
      empty.textContent='Aún no hay plantillas recomendadas para este giro. Puedes continuar y crear tus servicios después desde Servicios.';
      root?.replaceChildren(empty);
      return;
    }
    return originalRenderTemplates();
  };

  const originalSaveServicesStep=saveServicesStep;
  saveServicesStep=async function(){
    if(!onboardingTemplates.length){
      renderTeamServiceOptions();
      showStep(4);
      return;
    }
    return originalSaveServicesStep();
  };
})();

// MyCitaGo · Servicios Hotfix V2
// Bloquea plantillas al giro real del negocio cuando business_category_locked = true.
// Debe cargarse DESPUÉS de admin-services.js.

(function () {
  'use strict';

  const $id = id => document.getElementById(id);

  function norm(v) {
    return String(v || '')
      .trim()
      .toLocaleLowerCase('es-MX')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function categoryKey(value) {
    const raw = norm(value);
    const rules = [
      ['dental','dental'],['dent','dental'],
      ['barber','barber'],['barberia','barber'],
      ['beauty','beauty'],['estet','beauty'],['salon','beauty'],['belleza','beauty'],
      ['nails','nails'],['nail','nails'],['una','nails'],
      ['spa','spa'],['masaj','spa'],
      ['therapy','therapy'],['psic','therapy'],['terap','therapy'],
      ['nutrition','nutrition'],['nutri','nutrition'],
      ['physio','physio'],['fisio','physio'],
      ['veterinary','veterinary'],['veter','veterinary'],
      ['consulting','consulting'],['consult','consulting'],
      ['automotive','automotive'],['autom','automotive'],
      ['photo','photo'],['foto','photo'],
      ['classes','classes'],['clase','classes'],
      ['other','other']
    ];
    const hit = rules.find(([needle]) => raw.includes(needle));
    return hit ? hit[1] : 'other';
  }

  function serviceByTemplate(template) {
    if (typeof items === 'undefined') return null;
    const target = norm(template?.name);
    return (items || []).find(s => norm(s?.name) === target) || null;
  }

  function stateOf(template) {
    const service = serviceByTemplate(template);
    if (!service) return { state:'new', service:null };
    return { state: service.active === false ? 'inactive' : 'active', service };
  }

  function lockedKey() {
    if (typeof biz === 'undefined' || !biz?.business_category_locked) return null;

    // IMPORTANTE: en la base actual business_category_id puede contener el código "dental",
    // no necesariamente un UUID. Por eso este campo se evalúa primero.
    const candidates = [
      biz.business_category_id,
      biz.business_category_code,
      biz.business_type,
      biz.category,
      biz.business_category_name
    ].filter(Boolean);

    for (const candidate of candidates) {
      const key = categoryKey(candidate);
      if (key !== 'other' || norm(candidate) === 'other') return key;
    }
    return null;
  }

  function templateAllowed(template, key) {
    if (!key) return true;
    const library = (typeof SERVICE_TEMPLATE_LIBRARY !== 'undefined')
      ? SERVICE_TEMPLATE_LIBRARY[key] || []
      : [];
    return library.some(t => norm(t.name) === norm(template?.name));
  }

  function lockBusinessTypeUI() {
    const select = $id('business-type');
    const key = lockedKey();
    if (!select || !key) return;

    if ([...select.options].some(o => o.value === key)) select.value = key;
    select.disabled = true;
    select.setAttribute('aria-disabled','true');
    select.title = 'El giro fue confirmado durante la configuración del negocio.';

    const label = select.closest('label');
    if (label && !label.querySelector('.svc-locked-note')) {
      const note = document.createElement('small');
      note.className = 'svc-locked-note';
      note.textContent = 'Giro confirmado · las plantillas están limitadas a tu negocio.';
      note.style.display = 'block';
      note.style.marginTop = '6px';
      note.style.opacity = '.72';
      label.appendChild(note);
    }
  }

  const originalRender =
    typeof renderServiceTemplates === 'function' ? renderServiceTemplates : null;
  const originalApply =
    typeof applyServiceTemplate === 'function' ? applyServiceTemplate : null;

  if (originalRender) {
    renderServiceTemplates = function(category = currentTemplateCategory) {
      const key = lockedKey();
      if (key) category = key;

      currentTemplateCategory = category;
      selectedTemplateNames.clear();

      const root = $id('service-template-library');
      if (!root) return;

      const list = SERVICE_TEMPLATE_LIBRARY[category] || SERVICE_TEMPLATE_LIBRARY.other;
      root.replaceChildren();

      const tools = document.createElement('div');
      tools.className = 'svc-template-batch-tools';
      tools.innerHTML =
        '<b>Plantillas recomendadas</b>' +
        '<span>Usa las de tu giro. Los servicios existentes se editan o reactivan.</span>' +
        '<button id="add-selected-templates" type="button">Agregar seleccionados</button>';
      root.appendChild(tools);

      list.forEach(template => {
        const {state, service} = stateOf(template);

        const card = document.createElement('label');
        card.className = 'svc-template-card svc-template-select';

        const check = document.createElement('input');
        check.type = 'checkbox';

        if (state === 'active') {
          check.disabled = true;
        } else {
          check.onchange = () => check.checked
            ? selectedTemplateNames.add(template.name)
            : selectedTemplateNames.delete(template.name);
        }

        const img = document.createElement('img');
        img.src = platformAssetForTemplate(template) || assetUrl(template.image);
        img.alt = '';

        const body = document.createElement('span');
        const b = document.createElement('b');
        const small = document.createElement('small');
        b.textContent = template.name;

        if (state === 'active') {
          small.textContent = `${service.duration_minutes || template.duration} min · ya está activo`;
        } else if (state === 'inactive') {
          small.textContent = `${service.duration_minutes || template.duration} min · actualmente oculto`;
        } else {
          const price = suggestedPriceForTemplate(template);
          small.textContent =
            `${template.duration} min · ${price ? money(price) + ' sugerido' : 'precio por definir'}`;
        }

        body.append(b, small);

        const action = document.createElement('button');
        action.type = 'button';

        if (state === 'active') {
          action.textContent = 'Editar';
          action.onclick = e => {
            e.preventDefault();
            if (typeof editService === 'function') editService(service.id);
          };
        } else if (state === 'inactive') {
          action.textContent = 'Reactivar';
          action.onclick = async e => {
            e.preventDefault();
            action.disabled = true;
            try {
              const {error} = await supabaseClient
                .from('services')
                .update({active:true})
                .eq('id', service.id)
                .eq('business_id', biz.id);
              if (error) throw error;
              toast(`${template.name} reactivado`);
              await loadServices();
              renderServiceTemplates(lockedKey() || currentTemplateCategory);
            } catch (err) {
              toast('No se pudo reactivar: ' + err.message);
            } finally {
              action.disabled = false;
            }
          };
        } else {
          action.textContent = 'Usar';
          action.onclick = e => {
            e.preventDefault();
            const key = lockedKey();
            if (key && !templateAllowed(template, key)) {
              return toast('Esta plantilla no corresponde al giro confirmado del negocio.');
            }
            originalApply(template);
          };
        }

        card.append(check, img, body, action);
        root.appendChild(card);
      });

      root.querySelector('#add-selected-templates')
        ?.addEventListener('click', openBatchTemplateReview);

      lockBusinessTypeUI();
    };
  }

  if (originalApply) {
    applyServiceTemplate = function(template) {
      const key = lockedKey();
      if (key && !templateAllowed(template, key)) {
        return toast('Esta plantilla no corresponde al giro confirmado del negocio.');
      }

      const {state, service} = stateOf(template);
      if (state === 'active') {
        if (typeof editService === 'function') editService(service.id);
        return toast(`${template.name} ya existe. Abrimos el servicio para editarlo.`);
      }
      if (state === 'inactive') {
        return (async () => {
          const {error} = await supabaseClient
            .from('services')
            .update({active:true})
            .eq('id', service.id)
            .eq('business_id', biz.id);
          if (error) return toast('No se pudo reactivar: ' + error.message);
          toast(`${template.name} reactivado`);
          await loadServices();
          renderServiceTemplates(lockedKey() || currentTemplateCategory);
        })();
      }
      return originalApply(template);
    };
  }

  if (typeof createBatchServices === 'function') {
    createBatchServices = async function(list, box) {
      const btn = $id('confirm-batch-services');
      if (btn) btn.disabled = true;

      const key = lockedKey();
      let created = 0, reactivated = 0, skipped = 0;

      try {
        for (let i = 0; i < list.length; i++) {
          const template = list[i];

          if (key && !templateAllowed(template, key)) {
            throw new Error(`"${template.name}" no corresponde al giro confirmado.`);
          }

          const price = Number(
            box?.querySelector(`[data-batch-price="${i}"]`)?.value
          ) || 0;

          const current = stateOf(template);

          if (current.state === 'active') {
            skipped++;
            continue;
          }

          if (current.state === 'inactive') {
            const {error} = await supabaseClient
              .from('services')
              .update({active:true, price})
              .eq('id', current.service.id)
              .eq('business_id', biz.id);
            if (error) throw error;
            reactivated++;
            continue;
          }

          // Consulta final a DB antes de INSERT para evitar duplicados aunque
          // la pantalla tuviera datos desactualizados.
          const {data: existing, error: findError} = await supabaseClient
            .from('services')
            .select('id,name,active')
            .eq('business_id', biz.id)
            .ilike('name', template.name)
            .limit(1);

          if (findError) throw findError;

          if (existing?.length) {
            const row = existing[0];
            if (row.active === false) {
              const {error} = await supabaseClient
                .from('services')
                .update({active:true, price})
                .eq('id', row.id)
                .eq('business_id', biz.id);
              if (error) throw error;
              reactivated++;
            } else {
              skipped++;
            }
            continue;
          }

          const generic = platformAssetForTemplate(template) || assetUrl(template.image);
          let image_url = generic;

          if (platformAssetForTemplate(template) && window.CitagoMedia) {
            image_url = (
              await CitagoMedia.adoptPublicImage(generic, {
                businessId: biz.id,
                kind: 'services'
              })
            ).url;
          }

          const {error} = await supabaseClient
            .from('services')
            .insert({
              business_id: biz.id,
              name: template.name,
              category: template.category,
              price,
              duration_minutes: template.duration,
              description: template.description || '',
              image_url,
              active: true
            });

          if (error) throw error;
          created++;
        }

        const summary = [];
        if (created) summary.push(`${created} creado${created === 1 ? '' : 's'}`);
        if (reactivated) summary.push(`${reactivated} reactivado${reactivated === 1 ? '' : 's'}`);
        if (skipped) summary.push(`${skipped} ya existía${skipped === 1 ? '' : 'n'}`);
        toast(summary.join(' · ') || 'Sin cambios');

        box?.remove();
        await loadServices();
        renderServiceTemplates(lockedKey() || currentTemplateCategory);
      } catch (err) {
        toast('No se pudieron guardar: ' + err.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    };
  }

  async function boot() {
    for (let i = 0; i < 50; i++) {
      if (typeof biz !== 'undefined' && biz?.id && typeof items !== 'undefined') break;
      await new Promise(r => setTimeout(r, 120));
    }

    lockBusinessTypeUI();

    const key = lockedKey();
    if (key && typeof renderServiceTemplates === 'function') {
      currentTemplateCategory = key;
      renderServiceTemplates(key);
    }

    const select = $id('business-type');
    if (select && key) {
      // Captura cualquier intento de cambio por listeners antiguos.
      select.addEventListener('change', e => {
        e.stopImmediatePropagation();
        select.value = key;
        currentTemplateCategory = key;
        renderServiceTemplates(key);
        toast('El giro del negocio ya está confirmado.');
      }, true);
    }

    console.info('[MyCitaGo] Servicios Hotfix V2 activo.', {lockedCategory:key});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0));
  } else {
    setTimeout(boot, 0);
  }
})();

// MyCitaGo · Hotfix de plantillas de servicios
// Objetivo:
// 1) Evitar duplicados de plantillas ya existentes.
// 2) Reactivar el mismo servicio si estaba desactivado.
// 3) Mostrar "Editar" si el servicio ya existe activo.
// 4) Respetar el giro bloqueado del negocio y evitar mezclar plantillas.
// Este archivo debe cargarse DESPUÉS de admin-services.js.

(function () {
  'use strict';

  const normalizeSvcName = value =>
    String(value || '')
      .trim()
      .toLocaleLowerCase('es-MX')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  function findExistingTemplateService(template) {
    if (typeof items === 'undefined') return null;
    const target = normalizeSvcName(template?.name);
    return (items || []).find(s => normalizeSvcName(s?.name) === target) || null;
  }

  function templateState(template) {
    const service = findExistingTemplateService(template);
    if (!service) return { state: 'new', service: null };
    return {
      state: service.active === false ? 'inactive' : 'active',
      service
    };
  }

  function categoryToTemplateKey(value) {
    const raw = normalizeSvcName(value);
    const rules = [
      ['barber', 'barber'],
      ['barberia', 'barber'],
      ['dent', 'dental'],
      ['estet', 'beauty'],
      ['salon', 'beauty'],
      ['belleza', 'beauty'],
      ['una', 'nails'],
      ['nail', 'nails'],
      ['spa', 'spa'],
      ['masaj', 'spa'],
      ['psic', 'therapy'],
      ['terap', 'therapy'],
      ['nutri', 'nutrition'],
      ['fisio', 'physio'],
      ['veter', 'veterinary'],
      ['consult', 'consulting'],
      ['autom', 'automotive'],
      ['foto', 'photo'],
      ['clase', 'classes']
    ];
    const match = rules.find(([needle]) => raw.includes(needle));
    return match ? match[1] : 'other';
  }

  async function reactivateTemplate(template, service, priceOverride = null) {
    if (!service?.id || typeof supabaseClient === 'undefined' || typeof biz === 'undefined' || !biz?.id) {
      throw new Error('No se pudo identificar el servicio o negocio.');
    }

    const payload = { active: true };
    if (Number.isFinite(priceOverride)) payload.price = priceOverride;

    const { error } = await supabaseClient
      .from('services')
      .update(payload)
      .eq('id', service.id)
      .eq('business_id', biz.id);

    if (error) throw error;
    return service.id;
  }

  async function syncTemplateCategoryWithBusiness() {
    try {
      if (typeof biz === 'undefined' || !biz?.id) return false;

      const select = document.getElementById('business-type');
      if (!select) return false;

      let templateKey = null;

      // Si el negocio guarda un identificador de giro legible, úsalo.
      const directCandidates = [
        biz.business_category_code,
        biz.business_type,
        biz.category,
        biz.business_category_name
      ].filter(Boolean);

      for (const candidate of directCandidates) {
        const key = categoryToTemplateKey(candidate);
        if (key !== 'other') {
          templateKey = key;
          break;
        }
      }

      // Si sólo tenemos UUID de business_category_id, buscamos el nombre real.
      if (!templateKey && biz.business_category_id && typeof supabaseClient !== 'undefined') {
        const { data, error } = await supabaseClient
          .from('business_categories')
          .select('id,name')
          .eq('id', biz.business_category_id)
          .maybeSingle();

        if (!error && data?.name) templateKey = categoryToTemplateKey(data.name);
      }

      if (!templateKey) return false;

      if ([...select.options].some(o => o.value === templateKey)) {
        select.value = templateKey;
        if (typeof renderServiceTemplates === 'function') {
          renderServiceTemplates(templateKey);
        }
      }

      // Si el giro ya quedó confirmado en onboarding, no permitir cambiarlo
      // desde Servicios y mezclar catálogos de otro giro.
      if (biz.business_category_locked) {
        select.disabled = true;
        select.title = 'El giro del negocio ya fue confirmado. Para cambiarlo, usa soporte/configuración autorizada.';
        const label = select.closest('label');
        if (label && !label.querySelector('.svc-locked-note')) {
          const note = document.createElement('small');
          note.className = 'svc-locked-note';
          note.textContent = 'Giro confirmado · las plantillas corresponden a tu negocio.';
          note.style.display = 'block';
          note.style.marginTop = '6px';
          note.style.opacity = '.72';
          label.appendChild(note);
        }
      }

      return true;
    } catch (error) {
      console.warn('[Servicios] No se pudo sincronizar el giro:', error);
      return false;
    }
  }

  // Reemplaza sólo la representación/acción de plantillas.
  // No cambia el editor ni el guardado normal de servicios.
  if (typeof renderServiceTemplates === 'function') {
    renderServiceTemplates = function (category = currentTemplateCategory) {
      currentTemplateCategory = category;
      selectedTemplateNames.clear();

      const root = document.getElementById('service-template-library');
      if (!root) return;

      const list = SERVICE_TEMPLATE_LIBRARY[category] || SERVICE_TEMPLATE_LIBRARY.other;
      root.replaceChildren();

      const tools = document.createElement('div');
      tools.className = 'svc-template-batch-tools';
      tools.innerHTML =
        '<b>Plantillas recomendadas</b>' +
        '<span>Agrega nuevas o reactiva las que ya habías usado.</span>' +
        '<button id="add-selected-templates" type="button">Agregar seleccionados</button>';
      root.appendChild(tools);

      list.forEach(template => {
        const { state, service } = templateState(template);

        const card = document.createElement('label');
        card.className = 'svc-template-card svc-template-select';
        if (state === 'active') card.classList.add('svc-template-existing');

        const check = document.createElement('input');
        check.type = 'checkbox';

        // Un servicio activo ya existe: no debe volver a crearse por lote.
        if (state === 'active') {
          check.disabled = true;
          check.checked = false;
        } else {
          check.onchange = () =>
            check.checked
              ? selectedTemplateNames.add(template.name)
              : selectedTemplateNames.delete(template.name);
        }

        const img = document.createElement('img');
        img.src = platformAssetForTemplate(template) || assetUrl(template.image);
        img.alt = '';

        const body = document.createElement('span');
        const name = document.createElement('b');
        const detail = document.createElement('small');
        name.textContent = template.name;

        if (state === 'active') {
          detail.textContent = `${service.duration_minutes || template.duration} min · ya está activo`;
        } else if (state === 'inactive') {
          detail.textContent = `${service.duration_minutes || template.duration} min · oculto actualmente`;
        } else {
          const price = suggestedPriceForTemplate(template);
          detail.textContent = `${template.duration} min · ${price ? money(price) + ' sugerido' : 'precio por definir'}`;
        }

        body.append(name, detail);

        const action = document.createElement('button');
        action.type = 'button';

        if (state === 'active') {
          action.textContent = 'Editar';
          action.onclick = event => {
            event.preventDefault();
            if (typeof editService === 'function') editService(service.id);
          };
        } else if (state === 'inactive') {
          action.textContent = 'Reactivar';
          action.onclick = async event => {
            event.preventDefault();
            action.disabled = true;
            try {
              await reactivateTemplate(template, service);
              if (typeof toast === 'function') toast(`${template.name} reactivado`);
              if (typeof loadServices === 'function') await loadServices();
              renderServiceTemplates(currentTemplateCategory);
            } catch (error) {
              if (typeof toast === 'function') toast('No se pudo reactivar: ' + error.message);
            } finally {
              action.disabled = false;
            }
          };
        } else {
          action.textContent = 'Usar';
          action.onclick = event => {
            event.preventDefault();
            applyServiceTemplate(template);
          };
        }

        card.append(check, img, body, action);
        root.appendChild(card);
      });

      root
        .querySelector('#add-selected-templates')
        ?.addEventListener('click', openBatchTemplateReview);
    };
  }

  // Revisión por lote: excluye servicios que ya están activos.
  if (typeof openBatchTemplateReview === 'function') {
    openBatchTemplateReview = function () {
      const list = (SERVICE_TEMPLATE_LIBRARY[currentTemplateCategory] || [])
        .filter(t => selectedTemplateNames.has(t.name))
        .filter(t => templateState(t).state !== 'active');

      if (!list.length) {
        return typeof toast === 'function'
          ? toast('Selecciona una plantilla nueva o desactivada')
          : undefined;
      }

      let box = document.getElementById('template-batch-review');
      if (!box) {
        box = document.createElement('section');
        box.id = 'template-batch-review';
        box.className = 'svc-card svc-batch-review';
        document.getElementById('service-template-library')?.after(box);
      }

      box.innerHTML =
        `<div class="svc-card-title"><div><h2>Revisa antes de guardar</h2>` +
        `<p>Los servicios existentes se reutilizarán; no se crearán duplicados.</p></div></div>` +
        list.map((t, i) => {
          const { state, service } = templateState(t);
          const value = state === 'inactive'
            ? Number(service?.price || suggestedPriceForTemplate(t) || 0)
            : Number(suggestedPriceForTemplate(t) || 0);
          const label = state === 'inactive' ? 'Reactivar' : 'Crear';
          return `<label>${t.name}<span>${label} · ${t.duration} min</span>` +
            `<input data-batch-price="${i}" type="number" min="0" step="0.01" value="${value}"></label>`;
        }).join('') +
        `<button id="confirm-batch-services" class="svc-btn svc-btn-primary" type="button">` +
        `Confirmar ${list.length} servicio${list.length === 1 ? '' : 's'}</button>`;

      document.getElementById('confirm-batch-services').onclick =
        () => createBatchServices(list, box);
    };
  }

  // Creación por lote idempotente respecto al nombre dentro del negocio.
  if (typeof createBatchServices === 'function') {
    createBatchServices = async function (list, box) {
      const btn = document.getElementById('confirm-batch-services');
      if (btn) btn.disabled = true;

      let created = 0;
      let reactivated = 0;
      let skipped = 0;

      try {
        for (let i = 0; i < list.length; i++) {
          const template = list[i];
          const priceInput = box?.querySelector(`[data-batch-price="${i}"]`);
          const price = Number(priceInput?.value) || 0;
          const { state, service } = templateState(template);

          if (state === 'active') {
            skipped++;
            continue;
          }

          if (state === 'inactive') {
            await reactivateTemplate(template, service, price);
            reactivated++;
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

          // Segunda comprobación justo antes de insertar, por seguridad.
          const { data: existingRows, error: lookupError } = await supabaseClient
            .from('services')
            .select('id,name,active')
            .eq('business_id', biz.id)
            .ilike('name', template.name)
            .limit(1);

          if (lookupError) throw lookupError;

          const existing = existingRows?.[0];
          if (existing) {
            if (existing.active === false) {
              const { error } = await supabaseClient
                .from('services')
                .update({ active: true, price })
                .eq('id', existing.id)
                .eq('business_id', biz.id);
              if (error) throw error;
              reactivated++;
            } else {
              skipped++;
            }
            continue;
          }

          const { error } = await supabaseClient
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

        if (typeof toast === 'function') {
          const parts = [];
          if (created) parts.push(`${created} creado${created === 1 ? '' : 's'}`);
          if (reactivated) parts.push(`${reactivated} reactivado${reactivated === 1 ? '' : 's'}`);
          if (skipped) parts.push(`${skipped} ya existía${skipped === 1 ? '' : 'n'}`);
          toast(parts.join(' · ') || 'Sin cambios');
        }

        box?.remove();
        if (typeof loadServices === 'function') await loadServices();
        renderServiceTemplates(currentTemplateCategory);
      } catch (error) {
        if (typeof toast === 'function') toast('No se pudieron guardar: ' + error.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    };
  }

  async function initializeGuard() {
    // Espera a que admin-services.js termine de cargar negocio/servicios.
    for (let attempt = 0; attempt < 40; attempt++) {
      if (typeof biz !== 'undefined' && biz?.id && typeof items !== 'undefined') break;
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    await syncTemplateCategoryWithBusiness();

    if (typeof renderServiceTemplates === 'function') {
      renderServiceTemplates(currentTemplateCategory);
    }

    console.info('[MyCitaGo] Protección de plantillas de servicios activa.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initializeGuard, 0));
  } else {
    setTimeout(initializeGuard, 0);
  }
})();

// =========================================================
// services.js — Carga de negocio (por slug) y servicios activos
// =========================================================

/**
 * Carga el negocio a partir del slug presente en la URL (?n=slug).
 * Devuelve:
 *   - el negocio si se encontró
 *   - null si no hay slug en la URL, o no existe un negocio con ese slug
 * En ambos casos de null, el llamador debe mostrar un mensaje adecuado
 * (ver app.js) en vez de asumir que hubo un error de configuración.
 */
async function loadBusiness() {
  const slug = getBusinessSlugFromUrl();

  if (!slug) {
    if (typeof LOCAL_NO_LOGIN !== 'undefined' && LOCAL_NO_LOGIN) {
      const { data, error } = await supabaseClient
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) return { error: 'query_failed' };
      if (!data) return { error: 'not_found' };
      return { business: data };
    }
    return { error: 'missing_slug' };
  }

  const { data, error } = await supabaseClient
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error cargando negocio:', error);
    return { error: 'query_failed' };
  }

  if (!data) {
    return { error: 'not_found' };
  }

  return { business: data };
}

async function loadActiveServices(businessId) {
  const { data, error } = await supabaseClient
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error cargando servicios:', error);
    return [];
  }
  return data;
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// Categoría por defecto usada cuando un servicio no trae una asignada
// (debe coincidir con el default de la columna en sql/09_saas_pro.sql
// y con el placeholder del admin en admin-services.js).
const DEFAULT_CATEGORY = 'Servicios';

function serviceFallbackImage(service){
  const text=`${service?.name||''} ${service?.category||''}`.toLocaleLowerCase('es-MX');
  let file='consulting.svg';
  if(/corte|barba|barber/.test(text))file='barber-cut.svg';
  else if(/uña|manicure|pedicure|gel|acrí/.test(text))file='nails.svg';
  else if(/cabello|peinado|tinte|salón|estética/.test(text))file='beauty-hair.svg';
  else if(/masaje|spa|facial/.test(text))file='spa.svg';
  else if(/dental|dent|limpieza/.test(text))file='dental.svg';
  else if(/psic|terapia/.test(text))file='therapy.svg';
  else if(/nutri/.test(text))file='nutrition.svg';
  else if(/fisio|rehab/.test(text))file='physio.svg';
  else if(/veter|mascota/.test(text))file='veterinary.svg';
  else if(/auto|mecán|manten|diagnóstico/.test(text))file='automotive.svg';
  else if(/foto/.test(text))file='photo.svg';
  else if(/clase|curso/.test(text))file='class.svg';
  return new URL(`assets/service-presets/${file}`,location.href).href;
}

/**
 * Devuelve las categorías presentes en `services`, en el orden en que
 * aparece cada una por primera vez (no alfabético, para respetar el
 * orden en que el negocio los fue cargando).
 */
function getServiceCategories(services) {
  const seen = [];
  services.forEach((s) => {
    const cat = (s.category || DEFAULT_CATEGORY).trim() || DEFAULT_CATEGORY;
    if (!seen.includes(cat)) seen.push(cat);
  });
  return seen;
}

/**
 * Renderiza los chips de categoría ("Todos" + una por categoría).
 * onSelectCategory(categoryOrNull) se llama con null para "Todos".
 */
function renderCategoryTabs(services, container, onSelectCategory) {
  const categories = getServiceCategories(services);
  container.innerHTML = '';

  // Con una sola categoría (o ninguna) no aporta nada mostrar tabs.
  if (categories.length < 2) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  const makeChip = (label, categoryValue, isActive) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (isActive ? ' is-selected' : '');
    chip.textContent = label;
    chip.addEventListener('click', () => {
      container.querySelectorAll('.category-chip').forEach((c) => c.classList.remove('is-selected'));
      chip.classList.add('is-selected');
      onSelectCategory(categoryValue);
    });
    return chip;
  };

  container.appendChild(makeChip('Todos', null, true));
  categories.forEach((cat) => container.appendChild(makeChip(cat, cat, false)));
}

function renderServices(services, container, onSelect, activeCategory, searchTerm = '') {
  container.innerHTML = '';

  if (services.length === 0) {
    container.innerHTML = '<p class="empty-state">Todavía no hay servicios disponibles.</p>';
    return;
  }

  const query = (searchTerm || '').toLocaleLowerCase('es-MX');
  const visible = services.filter((s) => {
    const categoryOk = !activeCategory || (s.category || DEFAULT_CATEGORY) === activeCategory;
    const haystack = `${s.name || ''} ${s.description || ''} ${s.category || ''}`.toLocaleLowerCase('es-MX');
    const searchOk = !query || haystack.includes(query);
    return categoryOk && searchOk;
  });

  if (visible.length === 0) {
    container.innerHTML = '<div class="empty-state premium-empty"><strong>No encontramos coincidencias.</strong><span>Prueba otra categoría o escribe un término diferente.</span></div>';
    return;
  }

  // Destacados primero dentro del grupo visible, sin alterar el resto del orden.
  const sorted = [...visible].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  sorted.forEach((service) => {
    const el = document.createElement('div');
    el.className = 'card service-card';
    el.dataset.serviceId = service.id;
    el.innerHTML = `
      <img class="service-card-img" src="${service.image_url || serviceFallbackImage(service)}" alt="">
      <div class="service-card-body">
        <div class="service-card-topline">
          <span class="service-category-label">${escapeHtml(service.category || DEFAULT_CATEGORY)}</span>
          ${service.featured ? '<span class="featured-badge">★ Más reservado</span>' : ''}
        </div>
        <div class="service-card-main">
          <div class="service-card-info">
            <h3>${escapeHtml(service.name)}</h3>
            ${service.description ? `<p class="service-card-desc">${escapeHtml(service.description)}</p>` : '<p class="service-card-desc muted-placeholder">Reserva este servicio en línea.</p>'}
          </div>
          <div class="service-card-price">
            <span class="price">${formatPrice(service.price)}</span>
            <span class="duration-tag">${formatDuration(service.duration_minutes)}</span>
          </div>
        </div>
        <div class="service-card-bottom">
          ${service.deposit_amount > 0 ? `<span class="deposit-tag">Anticipo ${formatPrice(service.deposit_amount)}</span>` : '<span class="deposit-tag deposit-free">Reserva sin anticipo</span>'}
          <span class="choose-service">Seleccionar →</span>
        </div>
      </div>
    `;
    el.addEventListener('click', () => onSelect(service));
    container.appendChild(el);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

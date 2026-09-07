// =========================================================
// services.js — Carga pública segura de negocio y servicios
// P0 estable: negocio y servicios sólo por RPC públicas limitadas.
// =========================================================

async function loadBusiness() {
  const slug = getBusinessSlugFromUrl();
  if (!slug && !(typeof LOCAL_NO_LOGIN !== 'undefined' && LOCAL_NO_LOGIN)) return { error: 'missing_slug' };

  const { data, error } = await supabaseClient.rpc('get_public_business', { p_slug: slug || null });
  if (error) {
    console.error('Error cargando negocio:', error);
    return { error: 'query_failed' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row ? { business: row } : { error: 'not_found' };
}

async function loadActiveServices(businessId) {
  const { data, error } = await supabaseClient.rpc('get_public_services', { p_business_id: businessId });
  if (error) {
    console.error('Error cargando servicios:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price || 0);
}
function formatDuration(minutes) {
  const value = Number(minutes || 0);
  if (value < 60) return `${value} min`;
  const h = Math.floor(value / 60), m = value % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
const DEFAULT_CATEGORY = 'Servicios';
function serviceFallbackImage(service) {
  const text = `${service?.name||''} ${service?.category||''}`.toLocaleLowerCase('es-MX');
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
  return new URL(`assets/service-presets/${file}`, location.href).href;
}
function getServiceCategories(services) {
  return [...new Set((services || []).map(s => (s.category || DEFAULT_CATEGORY).trim() || DEFAULT_CATEGORY))];
}
function renderCategoryTabs(services, container, onSelectCategory) {
  const categories = getServiceCategories(services);
  container.replaceChildren();
  if (categories.length < 2) { container.classList.add('hidden'); return; }
  container.classList.remove('hidden');

  const makeChip = (label, value, active) => {
    const chip = document.createElement('button');
    chip.type='button';
    chip.className='category-chip' + (active ? ' is-selected' : '');
    chip.textContent=label;
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    chip.addEventListener('click', () => {
      container.querySelectorAll('.category-chip').forEach(c => {
        c.classList.remove('is-selected'); c.setAttribute('aria-pressed','false');
      });
      chip.classList.add('is-selected'); chip.setAttribute('aria-pressed','true');
      onSelectCategory(value);
    });
    return chip;
  };
  container.appendChild(makeChip('Todos', null, true));
  categories.forEach(cat => container.appendChild(makeChip(cat, cat, false)));
}
function renderServices(services, container, onSelect, activeCategory, searchTerm='') {
  container.replaceChildren();
  if (!services?.length) {
    container.innerHTML='<p class="empty-state">Todavía no hay servicios disponibles.</p>'; return;
  }
  const query=(searchTerm||'').toLocaleLowerCase('es-MX');
  const visible=services.filter(s=>{
    const categoryOk=!activeCategory||(s.category||DEFAULT_CATEGORY)===activeCategory;
    const haystack=`${s.name||''} ${s.description||''} ${s.category||''}`.toLocaleLowerCase('es-MX');
    return categoryOk && (!query || haystack.includes(query));
  });
  if(!visible.length){
    container.innerHTML='<div class="empty-state premium-empty"><strong>No encontramos coincidencias.</strong><span>Prueba otra búsqueda.</span></div>'; return;
  }
  [...visible].sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)).forEach(service=>{
    const card=document.createElement('button');
    card.type='button';
    card.className='service-card';
    card.dataset.serviceId=service.id;
    card.setAttribute('aria-pressed','false');

    const image=service.image_url || serviceFallbackImage(service);
    card.innerHTML=`
      <img class="service-card-img" src="${image}" alt="" loading="lazy" decoding="async">
      <span class="service-card-body">
        <span class="service-card-topline">
          <span class="service-category-label">${escapeHtml(service.category || DEFAULT_CATEGORY)}</span>
          ${service.featured ? '<span class="featured-badge">★ Destacado</span>' : ''}
        </span>
        <span class="service-card-main">
          <span class="service-card-info">
            <strong class="service-card-title">${escapeHtml(service.name)}</strong>
            <span class="service-card-desc">${escapeHtml(service.description || 'Reserva este servicio en línea.')}</span>
          </span>
          <span class="service-card-price">
            <strong class="price">${formatPrice(service.price)}</strong>
            <span class="duration-tag">${formatDuration(service.duration_minutes)}</span>
          </span>
        </span>
        <span class="service-card-bottom">
          <span>${service.deposit_amount > 0 ? `Anticipo ${formatPrice(service.deposit_amount)}` : 'Reserva sin anticipo'}</span>
          <span class="choose-service">Seleccionar →</span>
        </span>
      </span>`;
    card.addEventListener('click',()=>onSelect(service));
    container.appendChild(card);
  });
}
function escapeHtml(str) {
  const div=document.createElement('div'); div.textContent=str??''; return div.innerHTML;
}

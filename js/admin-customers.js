let biz, rows = [];

const $ = x => document.getElementById(x);
const money = n => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0
}).format(n || 0);

function wa(r) {
  const name = String(r?.name || '');
  const phone = String(r?.whatsapp || '').replace(/[^\d]/g, '');
  if (!phone) return;

  const msg = `Hola ${name}, tenemos novedades y promociones para ti. ¿Te gustaría reservar una cita?`;
  window.open(
    `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(msg)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = String(text);
  return el;
}

function customerRow(r) {
  const article = make('article', 'customer-row');

  const avatar = make(
    'div',
    'customer-avatar',
    String(r?.name || '').slice(0, 1).toUpperCase()
  );

  const main = make('div', 'customer-main');
  main.appendChild(make('b', '', r?.name || ''));

  const visits = Number(r?.completed_visits || 0);
  const detail = `${r?.whatsapp || ''} · ${visits} visitas · ${money(r?.lifetime_value)}`;
  main.appendChild(make('span', '', detail));

  const segment = String(r?.segment || 'Nuevo');
  const safeSegmentClass = segment.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const badge = make('span', `segment-badge seg-${safeSegmentClass}`, segment);

  const last = make(
    'div',
    'customer-last',
    r?.last_visit ? `Última: ${r.last_visit}` : 'Sin visita completada'
  );

  const button = make('button', 'btn btn-ghost wa-btn', 'WhatsApp');
  button.type = 'button';
  button.addEventListener('click', () => wa(r));

  article.append(avatar, main, badge, last, button);
  return article;
}

function render() {
  const q = String($('q')?.value || '').toLowerCase();
  const seg = String($('segment')?.value || '');

  const filtered = rows.filter(r =>
    (!seg || r.segment === seg) &&
    `${r?.name || ''} ${r?.whatsapp || ''}`.toLowerCase().includes(q)
  );

  const container = $('customers');
  container.replaceChildren();

  if (!filtered.length) {
    container.appendChild(make('p', 'empty-state', 'No hay clientes en este filtro.'));
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach(r => fragment.appendChild(customerRow(r)));
  container.appendChild(fragment);
}

async function init() {
  const s = await requireAuth();
  if (!s) return;

  biz = await getMyBusiness(s.user);
  if (!biz) return;

  $('biz-name').textContent = biz.name || '';

  const { data, error } = await supabaseClient
    .from('customer_crm')
    .select('*')
    .eq('business_id', biz.id)
    .order('created_at', { ascending: false });

  if (error) {
    const container = $('customers');
    container.replaceChildren();
    container.appendChild(
      make(
        'p',
        'empty-state',
        `No se pudieron cargar los clientes. ${error.message || ''}`
      )
    );
    return;
  }

  rows = Array.isArray(data) ? data : [];

  $('k-total').textContent = String(rows.length);
  $('k-freq').textContent = String(
    rows.filter(x => ['Frecuente', 'VIP'].includes(x.segment)).length
  );
  $('k-inactive').textContent = String(
    rows.filter(x => x.segment === 'Inactivo').length
  );
  $('k-value').textContent = money(
    rows.reduce((s, x) => s + Number(x.lifetime_value || 0), 0)
  );

  $('q').addEventListener('input', render);
  $('segment').addEventListener('change', render);
  render();
}

document.addEventListener('DOMContentLoaded', init);

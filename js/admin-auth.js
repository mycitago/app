// =========================================================
// admin-auth.js — Sesión, suscripción y acceso de plataforma
// =========================================================

async function requireAuth() {
  // El modo sin login solo existe en localhost/127.0.0.1.
  if (typeof LOCAL_NO_LOGIN !== 'undefined' && LOCAL_NO_LOGIN) {
    return { user: { id: 'LOCAL_DEMO', email: 'local@demo' }, localMode: true };
  }

  // getUser() valida el JWT contra Supabase Auth; no confiamos solo
  // en una sesión guardada en localStorage.
  const { data, error } = await supabaseClient.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    await supabaseClient.auth.signOut();
    window.location.replace('login.html');
    return null;
  }

  return { user };
}

async function getMySubscription(businessId) {
  const { data } = await supabaseClient
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();
  return data || null;
}

function subscriptionExpired(sub) {
  // Un negocio sin suscripción NO tiene acceso al panel.
  if (!sub) return true;
  if (!['trial', 'active'].includes(sub.status)) return true;
  if (!sub.current_period_end) return true;
  const end = new Date(sub.current_period_end + 'T23:59:59');
  return Number.isNaN(end.getTime()) || end < new Date();
}

function showPaywall(sub) {
  const fin = sub ? sub.current_period_end : '';
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4efec;">
      <div style="width:min(92vw,420px);background:#fff;border-radius:16px;padding:28px 24px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.08);">
        <div style="font-size:40px;">🔒</div>
        <h1 style="margin:8px 0;">Suscripción vencida</h1>
        <p style="color:#6b5a5e;">Tu periodo terminó el ${fin}. Contacta al proveedor de la plataforma para renovar y seguir usando el panel.</p>
        <button class="btn btn-primary" onclick="location.href='login.html'">Salir</button>
      </div>
    </div>`;
}

async function getMyBusiness(user) {
  if (typeof LOCAL_NO_LOGIN !== 'undefined' && LOCAL_NO_LOGIN) {
    const { data } = await supabaseClient.from('businesses').select('*').order('created_at').limit(1);
    const business = data?.[0] || null;
    if (!business) return null;
    business.subscription = null;
    injectPlatformLink();
    injectPublicLinkButton(business);
    return business;
  }

  // La pertenencia al negocio se obtiene de business_members.
  const { data: memberships, error: membershipError } = await supabaseClient
    .from('business_members')
    .select('business_id, role, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1);

  if (membershipError) {
    console.error('Error validando membresía:', membershipError);
    return null;
  }

  const membership = memberships?.[0];
  if (!membership) {
    // Cuenta válida, pero todavía no tiene negocio.
    window.location.replace('login.html?view=register&complete=1');
    return null;
  }

  const { data: business, error } = await supabaseClient
    .from('businesses')
    .select('*')
    .eq('id', membership.business_id)
    .maybeSingle();

  if (error || !business) {
    console.error('Error cargando negocio:', error);
    return null;
  }

  const sub = await getMySubscription(business.id);
  if (subscriptionExpired(sub)) {
    showPaywall(sub);
    return null;
  }

  business.subscription = sub;
  business.memberRole = membership.role;
  injectPlatformLink();
  injectPublicLinkButton(business);
  return business;
}

async function injectPlatformLink() {
  const actions = document.querySelector('.adm-topbar-actions');
  if (!actions || document.getElementById('platform-link')) return;
  if (typeof LOCAL_NO_LOGIN !== 'undefined' && LOCAL_NO_LOGIN) {
    const a = document.createElement('a');
    a.href = 'plataforma.html';
    a.id = 'platform-link';
    a.className = 'btn btn-ghost';
    a.textContent = 'Super Admin';
    actions.prepend(a);
    return;
  }
  const { data: authData } = await supabaseClient.auth.getUser();
  const user = authData?.user;
  if (!user) return;
  const { data } = await supabaseClient
    .from('platform_admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (!data) return;

  if (!document.getElementById('platform-link')) {
    const a = document.createElement('a');
    a.href = 'plataforma.html';
    a.id = 'platform-link';
    a.className = 'btn btn-ghost';
    a.textContent = 'Plataforma';
    actions.prepend(a);
  }
}

/**
 * Agrega un botón "Mi link" en la barra superior que copia al portapapeles
 * la URL pública de reservación del negocio (basada en su slug).
 * Si el negocio todavía no tiene slug (dato viejo antes de esta migración),
 * no se muestra nada — ver sql/08_business_slug_backfill.sql.
 */
function injectPublicLinkButton(business) {
  const url = buildPublicBookingUrl(business);
  if (!url) return;

  const actions = document.querySelector('.adm-topbar-actions');
  if (!actions || document.getElementById('public-link-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'public-link-btn';
  btn.className = 'btn btn-ghost';
  btn.textContent = 'Mi link';
  btn.title = url;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      btn.textContent = '¡Copiado!';
    } catch {
      window.prompt('Copia tu link público:', url);
    }
    setTimeout(() => { btn.textContent = 'Mi link'; }, 2000);
  });
  actions.prepend(btn);
}

async function logout() {
  if (typeof LOCAL_NO_LOGIN !== 'undefined' && LOCAL_NO_LOGIN) {
    window.location.replace('index.html');
    return;
  }
  await supabaseClient.auth.signOut();
  window.location.replace('login.html');
}

function injectCommercialNav(){
 if((location.pathname.split('/').pop()||'').toLowerCase()==='plataforma.html') return;
 const actions=document.querySelector('.adm-topbar-actions'); if(!actions)return;
 const links=[['clientes.html','Clientes'],['integraciones.html','Integraciones'],['planes.html','Planes']];
 links.reverse().forEach(([href,label])=>{if(!actions.querySelector(`a[href="${href}"]`)){const a=document.createElement('a');a.href=href;a.className='btn btn-ghost';a.textContent=label;actions.prepend(a)}});
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(injectCommercialNav,50));


// Responsive V1: navegación inferior única para el Panel de Negocio.
function injectMobileBusinessNav(){
  if((location.pathname.split('/').pop()||'').toLowerCase()==='plataforma.html') return;
  if(document.querySelector('.mobile-bottom-nav')) return;
  const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const active = file==='clientes.html'?'clientes':file==='servicios.html'?'servicios':file==='index.html'?'inicio':'';
  const nav=document.createElement('nav');
  nav.className='mobile-bottom-nav';
  nav.setAttribute('aria-label','Navegación móvil');
  nav.innerHTML=`
    <a href="index.html" class="${active==='inicio'?'active':''}"><span class="nav-ico">⌂</span><span>Inicio</span></a>
    <a href="index.html#agenda"><span class="nav-ico">▦</span><span>Agenda</span></a>
    <a href="clientes.html" class="${active==='clientes'?'active':''}"><span class="nav-ico">♙</span><span>Clientes</span></a>
    <a href="servicios.html" class="${active==='servicios'?'active':''}"><span class="nav-ico">✦</span><span>Servicios</span></a>
    <button type="button" id="mobile-more-btn"><span class="nav-ico">•••</span><span>Más</span></button>`;
  document.body.appendChild(nav);
  const sheet=document.createElement('div');
  sheet.className='mobile-more-sheet';
  sheet.innerHTML=`<div class="mobile-more-panel"><div class="mobile-more-handle"></div><h3>Más herramientas</h3><div class="mobile-more-grid">
    <a href="contabilidad.html">▥ Finanzas</a><a href="integraciones.html">⌁ Integraciones</a><a href="planes.html">◇ Plan</a><a href="configuracion.html">⚙ Mi negocio</a>
  </div><button type="button" class="mobile-more-close">Cerrar</button></div>`;
  document.body.appendChild(sheet);
  const close=()=>sheet.classList.remove('open');
  nav.querySelector('#mobile-more-btn').addEventListener('click',()=>sheet.classList.add('open'));
  sheet.querySelector('.mobile-more-close').addEventListener('click',close);
  sheet.addEventListener('click',e=>{if(e.target===sheet)close()});
}
document.addEventListener('DOMContentLoaded',injectMobileBusinessNav);

// Aviso visual para evitar confundir la demo local con la version de produccion.
function injectLocalDemoBanner(){
  if(typeof LOCAL_NO_LOGIN==='undefined'||!LOCAL_NO_LOGIN)return;
  if(document.getElementById('local-demo-banner'))return;
  const b=document.createElement('div');
  b.id='local-demo-banner';
  b.textContent='MODO DEMO LOCAL · acceso sin contraseña · no publicar así';
  b.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:10px;z-index:99999;background:#231f20;color:#fff;padding:8px 14px;border-radius:999px;font:600 12px system-ui;box-shadow:0 6px 20px rgba(0,0,0,.18);opacity:.9';
  document.body.appendChild(b);
}
document.addEventListener('DOMContentLoaded',injectLocalDemoBanner);

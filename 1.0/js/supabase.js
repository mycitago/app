// =========================================================
// Configuración del cliente Supabase
// =========================================================

const CITAS_CONFIG = window.CITAS_CONFIG || {};
const SUPABASE_URL = CITAS_CONFIG.supabaseUrl || '';
const SUPABASE_ANON_KEY = CITAS_CONFIG.supabaseAnonKey || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('CITAS: falta configurar supabaseUrl/supabaseAnonKey en js/config.js');
}

// El SDK de Supabase se carga vía CDN en index.html (window.supabase)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================
// MODO LOCAL DE DESARROLLO (sin contraseña)
//
// ANTES esto era "const LOCAL_NO_LOGIN = true;" fijo en el código —
// eso significaba que CUALQUIER copia de este archivo (incluida la
// que se sube al hosting real) abría el panel completo, incluida la
// plataforma Super Admin, sin pedir login.
//
// AHORA: LOCAL_NO_LOGIN ya no vive en el código fuente. Se activa
// SOLO a mano, por navegador, corriendo esto una vez en la consola
// del navegador (F12) mientras pruebas en tu máquina:
//
//     localStorage.setItem('ESTETICA_LOCAL_NO_LOGIN', 'true')
//
// y se desactiva con:
//
//     localStorage.removeItem('ESTETICA_LOCAL_NO_LOGIN')
//
// Como es localStorage del navegador (no un archivo), es imposible
// que se publique por accidente al subir el ZIP. Además, como
// segunda barrera, el modo local queda BLOQUEADO por completo si el
// sitio no corre en localhost/127.0.0.1 — aunque alguien lograra
// poner el flag en producción, esta línea lo ignora.
// =========================================================
const LOCAL_NO_LOGIN = (
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
  && window.localStorage
  && window.localStorage.getItem('ESTETICA_LOCAL_NO_LOGIN') === 'true'
);

// =========================================================
// Resolución de negocio por URL (multi-tenant en el frontend público)
//
// Ya NO hay un BUSINESS_ID fijo. La página pública recibe el negocio
// por la URL, de dos formas posibles:
//
//   1) ?n=slug-del-negocio               → funciona en cualquier hosting
//   2) /n/slug-del-negocio/  (bonito)    → requiere un rewrite del hosting
//      hacia /index.html (ver README de despliegue)
//
// Esto permite que UNA sola copia de index.html sirva a todos los
// negocios de la plataforma, cada uno con su propio link.
// =========================================================
function getBusinessSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('n');
  if (fromQuery) return fromQuery.trim().toLowerCase();

  const match = window.location.pathname.match(/\/n\/([^/]+)/);
  if (match) return decodeURIComponent(match[1]).trim().toLowerCase();

  return null;
}

/** Genera un slug (url amigable) a partir de un nombre de negocio. */
function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Devuelve la URL pública completa de reserva para un negocio. */
function getAppBaseUrl() {
  const url = new URL(window.location.href);
  let path = url.pathname;
  const adminPos = path.indexOf('/admin/');
  if (adminPos >= 0) path = path.slice(0, adminPos + 1);
  else path = path.replace(/[^/]*$/, '');
  return `${url.origin}${path}`;
}

function buildPublicBookingUrl(business) {
  if (!business?.slug) return null;
  return `${getAppBaseUrl()}?n=${encodeURIComponent(business.slug)}`;
}

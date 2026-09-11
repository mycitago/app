// =========================================================
// CITAS · CONFIGURACIÓN DE PRODUCCIÓN
// =========================================================
// La Publishable/anon key de Supabase es pública para frontend.
// NUNCA coloques aquí la service_role key.
// =========================================================

window.CITAS_CONFIG = Object.freeze({
  supabaseUrl: 'https://rienqmmrxzuseiaweugz.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InJpZW5xbW1yeHp1c2VpYXdldWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MzE1OTUsImV4cCI6MjEwMzUwNzU5NX0.DYcuR-LBlb_nay9aU-99N88PdbPeRFJZsU_J9gaocbE',
  apiUrl: ''
});

// Cargador final. Se ejecuta después de que los scripts normales de cada
// página hayan terminado, evitando duplicar shells o reescribir HTML.
window.addEventListener('load', () => {
  if (window.CitagoFinalBootstrapLoaded) return;
  window.CitagoFinalBootstrapLoaded = true;
  const src = document.createElement('script');
  const isAdmin = location.pathname.includes('/admin/');
  src.src = isAdmin ? '../js/citago-final-bootstrap.js?v=20260911' : 'js/citago-final-bootstrap.js?v=20260911';
  src.defer = false;
  document.body.appendChild(src);
});

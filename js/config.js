// =========================================================
// CITAS · CONFIGURACIÓN DE PRODUCCIÓN
// =========================================================
// SOLO CAMBIA LOS DOS VALORES MARCADOS ABAJO.
//
// La Publishable/anon key de Supabase es una clave pública de frontend.
// NUNCA coloques aquí la service_role key.
// =========================================================

window.CITAS_CONFIG = Object.freeze({

  // 1) Supabase > Project Settings > API > Project URL
  supabaseUrl: 'https://rienqmmrxzuseiaweugz.supabase.co',

  // 2) Supabase > Project Settings > API > Publishable key / anon key
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpZW5xbW1yeHp1c2VpYXdldWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MzE1OTUsImV4cCI6MjEwMzUwNzU5NX0.DYcuR-LBlb_nay9aU-99N88PdbPeRFJZsU_J9gaocbE',

  // Déjalo vacío por ahora.
  // Cuando publiquemos FastAPI, aquí irá la URL HTTPS del backend.
  apiUrl: ''

});

// =========================================================
// starter-kit.js — Contenido de ejemplo para que una estética
// nueva no empiece con el panel completamente vacío.
//
// Se llama UNA VEZ, justo después de crear el negocio en el
// registro (ver admin/login.html > handleRegister). Inserta:
//   - servicios de ejemplo típicos de una estética, con imagen
//     placeholder generada en el color del tema elegido
//   - logo y portada placeholder con la inicial del negocio
//
// Usa placeholders generados (placehold.co), no fotos reales de
// bancos de imágenes: así no hay riesgo de derechos de autor ni
// de enlaces rotos, y el dueño ve de inmediato dónde va cada foto
// cuando suba las suyas.
//
// Todo queda marcado como "Ejemplo — edítalo o bórralo" en la
// descripción para que quede claro que no es contenido real.
// =========================================================

const STARTER_SERVICES = [
  { name: 'Corte de cabello', category: 'Cabello', price: 150, duration_minutes: 30 },
  { name: 'Tinte', category: 'Cabello', price: 450, duration_minutes: 90 },
  { name: 'Manicure clásica', category: 'Uñas', price: 120, duration_minutes: 40 },
  { name: 'Uñas acrílicas', category: 'Uñas', price: 350, duration_minutes: 120 },
  { name: 'Tratamiento capilar', category: 'Cabello', price: 300, duration_minutes: 60 },
  { name: 'Maquillaje para evento', category: 'Maquillaje', price: 400, duration_minutes: 60 },
];

function hexNoHash(hex) {
  return (hex || '#9C3049').replace('#', '');
}

/** Imagen placeholder cuadrada/rectangular en el color del tema, con el nombre del servicio. */
function placeholderImageUrl(text, bgHex, fgHex, size = '600x400') {
  const bg = hexNoHash(bgHex);
  const fg = hexNoHash(fgHex);
  return `https://placehold.co/${size}/${bg}/${fg}?text=${encodeURIComponent(text)}&font=roboto`;
}

/**
 * Crea servicios de ejemplo + logo/portada placeholder para un negocio
 * recién registrado. No falla el registro si algo aquí truena: solo
 * se registra en consola, porque el negocio ya existe y puede seguir
 * usándose sin esto.
 */
async function seedStarterContent(business, themeId) {
  try {
    const theme = (typeof THEMES !== 'undefined' && THEMES[themeId]) || (typeof THEMES !== 'undefined' && THEMES[DEFAULT_THEME]);
    const primary = theme?.vars?.['--color-primary'] || '#9C3049';
    const onPrimary = 'FFFFFF';

    const servicesPayload = STARTER_SERVICES.map((s) => ({
      business_id: business.id,
      name: s.name,
      category: s.category,
      description: 'Ejemplo — edítalo o bórralo desde Servicios.',
      price: s.price,
      duration_minutes: s.duration_minutes,
      active: true,
      image_url: placeholderImageUrl(s.name, primary, onPrimary),
    }));

    const { error: servicesError } = await supabaseClient.from('services').insert(servicesPayload);
    if (servicesError) console.error('No se pudieron crear los servicios de ejemplo:', servicesError);

    const initial = (business.name || '?').trim().slice(0, 1).toUpperCase();
    const logoUrl = placeholderImageUrl(initial, primary, onPrimary, '300x300');
    const coverUrl = placeholderImageUrl(business.name || 'Tu estética', primary, onPrimary, '1200x400');

    const { error: bizError } = await supabaseClient
      .from('businesses')
      .update({ logo_url: logoUrl, cover_image_url: coverUrl })
      .eq('id', business.id);
    if (bizError) console.error('No se pudo guardar el logo/portada de ejemplo:', bizError);
  } catch (e) {
    console.error('No se pudo cargar el kit de bienvenida:', e);
  }
}

MyCitaGo · R2 Reserva conectada con “Mi página”

QUÉ CORRIGE
1. reservar.html ahora consume el branding PUBLICADO desde business_branding_public.
2. Logo, portada, colores, tipografía, botones, título y texto de bienvenida publicados pasan a la página real.
3. La portada usa un solo mecanismo (--booking-cover + has-cover), evitando competencia de estilos.
4. Las reseñas intentan primero public_business_reviews_verified y, si no devuelve filas, usan el feed público real public_business_reviews.
5. La columna derecha ya no queda permanentemente vacía: muestra una galería SOLO con service.image_url reales.
   Nunca usa ilustraciones fallback para la galería.
6. En móvil, reseñas y galería aparecen después del flujo de servicios.
7. No hay reseñas ni fotos inventadas.

ARCHIVOS A REEMPLAZAR
- reservar.html
- js/app.js
- js/public-branding.js
- js/public-reviews-verified.js
- css/booking-public-fix.css

NO ES NECESARIO REEMPLAZAR
- js/services.js (se incluye solo como referencia del paquete R1 y no cambia)
- css/booking-adaptive.css (se incluye como base R1 y no cambia)

PRUEBA
https://mycitago.github.io/app/reservar.html?n=clinica&v=20260910-r2

VERIFICAR
A) Cambia un color o título en admin/mi-pagina.html.
B) Pulsa “Publicar cambios”.
C) Recarga la URL pública con ?v=20260910-r2.
D) Debe cambiar la página pública.
E) Si existen reseñas públicas reales, aparece el rail izquierdo.
F) Si algún servicio tiene image_url real, aparece el rail/galería de la derecha.

IMPORTANTE
Este paquete no modifica Supabase, RLS, Reportes ni Super Admin.

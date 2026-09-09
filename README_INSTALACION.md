
# MyCitaGo · Reseñas verificadas R1–R5

## Qué ya existía
El proyecto ya tenía `reviews`, `review_requests`, `resena.html`, botón "Solicitar reseña" en Agenda y RPCs iniciales. Este paquete los endurece y conecta correctamente con la página pública.

## Orden de instalación
1. Ejecuta `sql/R1_R5_VERIFIED_REVIEWS.sql` COMPLETO en Supabase SQL Editor.
2. Ejecuta `sql/VERIFY_R1_R5_REVIEWS.sql`.
3. Sube/reemplaza:
   - `resena.html`
   - `reservar.html`
   - `js/public-review.js`
   - `js/public-reviews-verified.js`
   - `js/admin-reviews.js`
   - `css/public-review.css`
   - `css/public-reviews.css`
   - `css/admin-reviews-verified.css`
   - `admin/resenas.html`
4. No reemplaces `js/app.js`: el módulo `public-reviews-verified.js` sustituye únicamente la función pública de reseñas.
5. En Agenda, una cita con estado completada ya debe mostrar "Solicitar reseña". Ese botón genera un enlace `resena.html?t=...` y lo abre por WhatsApp o lo copia.

## Qué queda protegido
- Cita completada obligatoria.
- Un token hash; nunca se guarda el token plano.
- Una reseña MyCitaGo por cita.
- El envío vuelve a comprobar que la cita siga completada.
- Rating solo 1–5.
- Comentario máximo 1200 caracteres.
- No hay INSERT anónimo directo a `reviews`.
- Solo reseñas MyCitaGo verificadas se muestran públicamente.
- Google permanece como fuente separada.

## Prueba funcional
1. Marca una cita como completada.
2. Agenda → vista lista → "Solicitar reseña".
3. Abre el enlace y publica 5 estrellas.
4. Reabrir el mismo enlace debe fallar.
5. `admin/resenas.html` debe mostrar "Cliente verificado".
6. `reservar.html?n=<slug>` debe mostrarla en "Opiniones de clientes".

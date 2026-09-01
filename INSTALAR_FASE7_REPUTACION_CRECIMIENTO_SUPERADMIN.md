# MyCitaGo · Fase 7

## Orden de instalación
1. En Supabase > SQL Editor, ejecuta completo `sql/phase7_reputation_growth_superadmin.sql`.
2. Confirma que finaliza sin error.
3. Sube el contenido completo de este ZIP a la raíz del repositorio `mycitago/app`, reemplazando archivos del mismo nombre.
4. Mantén GitHub Pages en `main` + `/(root)`.
5. Prueba `admin/plataforma.html`, `admin/resenas.html`, `admin/crecimiento.html`, `admin/contabilidad.html`, `reservar.html` y `resena.html`.

## Qué añade
- Super Admin: cargas aisladas; estados error/vacío/carga; pagos, incidencias, integraciones y auditoría visibles con datos reales.
- Crea solo los recursos de plataforma confirmados como faltantes: `business_invites` y `business_category_change_requests`.
- Reseñas internas por cita completada con token de un solo uso.
- Si Google tiene conexión activa y `review_url`, el cliente puede elegir MyCitaGo o Google.
- Nueva página Crecimiento con enlaces por canal (`src`).
- Atribución de reservas mediante `booking_source`, validada con `appointment_id + access_token`.
- Reportes: nuevas reseñas, calificación y reservas compartidas.
- Página pública: muestra reseñas publicadas de MyCitaGo y futuras reseñas Google unificadas.

## Seguridad
- No se usa `service_role` en navegador.
- El Super Admin conserva `platform_admins` + `is_platform_admin()`.
- El cliente no inserta directamente en `reviews`; usa RPC con token seguro.
- La atribución de reserva no puede modificar una cita sin su `access_token`.
- Google continúa bloqueado por el feature gate mientras no esté configurado/aprobado.

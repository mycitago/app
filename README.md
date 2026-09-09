# Corrección de Solicitar reseña

El error de la captura proviene de Supabase, no de Agenda.

La Agenda ya llama correctamente:
`create_review_request({p_appointment_id:id})`

Instalación:
1. Supabase → SQL Editor.
2. Ejecutar completo `sql/FIX_SOLICITAR_RESENA.sql`.
3. Ejecutar `sql/VERIFY_SOLICITAR_RESENA.sql`.
4. Volver a Agenda y pulsar Solicitar reseña en una cita completada.

No subas nada a GitHub para este error.
No modifica Google Reviews.
Mantiene:
- `internal` = MyCitaGo / cliente verificado.
- `google` = Google Business Profile.

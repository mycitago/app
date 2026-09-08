# Verificación C2 frontend

1. Abre `admin/plataforma.html` con sesión Super Admin.
2. Busca PERIQUITO BARBER.
3. Marca solo ese negocio.
4. Pulsa `Suspender seleccionados`.
5. Debe aparecer confirmación del navegador.
6. Si backend devuelve éxito total: mensaje tipo `1 negocio procesado correctamente`.
7. Si hay éxito parcial: mensaje tipo `1 correctos · 1 con error: ...`.
8. Los negocios fallidos deben permanecer seleccionados.
9. Los correctos deben quedar deseleccionados.
10. Después de suspender, confirma que PERIQUITO queda `canceled` y conserva `plan_id=reserva` y `current_period_end=2026-10-31`.
11. Verifica una nueva fila de auditoría `business_suspended`.
12. Reactiva desde la misma pantalla y confirma `active`.

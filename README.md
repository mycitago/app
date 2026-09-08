# C2 — Acciones en lote
Instala exclusivamente las RPC bulk del Super Admin. Corrige la firma que produjo el error de schema cache: `platform_bulk_suspend(p_business_ids uuid[])`.
Incluye suspensión/reactivación, autorización `is_platform_admin()`, auditoría por negocio, deduplicación de UUID y resultado por fila con éxito parcial. No cambia planes en lote, frontend, C1 ni RLS tenant.

Ejecuta primero `01_C2_ACCIONES_LOTE.sql` en Supabase SQL Editor y después usa `02_VERIFICACION_C2.sql` con negocios de prueba.

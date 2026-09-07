-- ============================================================
-- MyCitaGo · FASE 5 SEGURIDAD / HARDENING
-- Objetivo: reducir exposición anónima sin romper reservar.html
-- Ejecutar en Supabase SQL Editor DESPUÉS de subir los dos JS del paquete.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Vista pública limitada de NEGOCIOS
-- ------------------------------------------------------------
-- Intencionalmente es una vista de exposición pública con columnas explícitas.
-- No incluye: owner_id, email, setup_completed, business_category_locked.
CREATE OR REPLACE VIEW public.businesses_public
WITH (security_barrier = true)
AS
SELECT
  id,
  name,
  logo_url,
  cover_image_url,
  whatsapp,
  address,
  opening_hours,
  created_at,
  slug,
  description,
  instagram,
  theme,
  booking_notice,
  cancellation_policy,
  business_type,
  business_category_id
FROM public.businesses;

REVOKE ALL ON public.businesses_public FROM PUBLIC;
GRANT SELECT ON public.businesses_public TO anon, authenticated;

-- La tabla base deja de ser legible por anon.
DROP POLICY IF EXISTS businesses_public_read ON public.businesses;
DROP POLICY IF EXISTS businesses_member_read ON public.businesses;

CREATE POLICY businesses_member_read
ON public.businesses
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR public.is_member_of(id)
  OR public.is_platform_admin()
);

REVOKE SELECT ON public.businesses FROM anon;
GRANT SELECT ON public.businesses TO authenticated;

-- ------------------------------------------------------------
-- 2) STAFF: no exponer email / teléfono / comisión al público
-- ------------------------------------------------------------
DROP POLICY IF EXISTS staff_public_read ON public.staff;
DROP POLICY IF EXISTS staff_member_read ON public.staff;

CREATE POLICY staff_member_read
ON public.staff
FOR SELECT
TO authenticated
USING (
  public.is_member_of(business_id)
  OR public.is_platform_admin()
);

REVOKE SELECT ON public.staff FROM anon;
GRANT SELECT ON public.staff TO authenticated;

-- ------------------------------------------------------------
-- 3) Vista pública limitada de BLOQUEOS
-- ------------------------------------------------------------
-- La página pública sólo necesita negocio, fecha y rango de horas.
CREATE OR REPLACE VIEW public.blocked_times_public
WITH (security_barrier = true)
AS
SELECT
  business_id,
  date,
  start_time,
  end_time
FROM public.blocked_times;

REVOKE ALL ON public.blocked_times_public FROM PUBLIC;
GRANT SELECT ON public.blocked_times_public TO anon, authenticated;

DROP POLICY IF EXISTS blocked_times_public_read ON public.blocked_times;
DROP POLICY IF EXISTS blocked_times_member_read ON public.blocked_times;

CREATE POLICY blocked_times_member_read
ON public.blocked_times
FOR SELECT
TO authenticated
USING (
  public.is_member_of(business_id)
  OR public.is_platform_admin()
);

REVOKE SELECT ON public.blocked_times FROM anon;
GRANT SELECT ON public.blocked_times TO authenticated;

-- ------------------------------------------------------------
-- 4) SUCURSALES: eliminar política ALL demasiado amplia
-- ------------------------------------------------------------
-- Las políticas específicas INSERT/UPDATE/DELETE ya restringen a OWNER/MANAGER.
DROP POLICY IF EXISTS business_branches_member_all ON public.business_branches;

-- ------------------------------------------------------------
-- 5) Comentarios de auditoría
-- ------------------------------------------------------------
COMMENT ON VIEW public.businesses_public IS
'Vista pública limitada para reservar.html. No exponer columnas internas de businesses.';

COMMENT ON VIEW public.blocked_times_public IS
'Vista pública mínima para disponibilidad. No exponer columnas internas de blocked_times.';

COMMIT;

-- ------------------------------------------------------------
-- VERIFICACIÓN RÁPIDA
-- ------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('businesses','staff','blocked_times','business_branches')
ORDER BY tablename, cmd, policyname;

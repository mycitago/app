-- ============================================================
-- MyCitaGo · ROLLBACK FASE 5 SEGURIDAD
-- Úsalo sólo si la reserva pública deja de funcionar y necesitas volver atrás.
-- Después investiga la causa; no lo dejes como estado final.
-- ============================================================

BEGIN;

DROP VIEW IF EXISTS public.businesses_public;
DROP VIEW IF EXISTS public.blocked_times_public;

DROP POLICY IF EXISTS businesses_member_read ON public.businesses;
CREATE POLICY businesses_public_read
ON public.businesses
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.businesses TO anon, authenticated;

DROP POLICY IF EXISTS staff_member_read ON public.staff;
CREATE POLICY staff_public_read
ON public.staff
FOR SELECT
TO anon, authenticated
USING (
  active = true
  OR public.is_member_of(business_id)
  OR public.is_platform_admin()
);

GRANT SELECT ON public.staff TO anon, authenticated;

DROP POLICY IF EXISTS blocked_times_member_read ON public.blocked_times;
CREATE POLICY blocked_times_public_read
ON public.blocked_times
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.blocked_times TO anon, authenticated;

CREATE POLICY business_branches_member_all
ON public.business_branches
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = business_branches.business_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = business_branches.business_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
  )
);

COMMIT;

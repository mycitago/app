-- ============================================================
-- MyCitaGo · FASE 5 SEGURIDAD HARDENING V2
-- Corrige el 404 de reservar.html sin volver a abrir tablas privadas.
-- Ejecutar en Supabase SQL Editor DESPUÉS de subir los JS de este paquete.
-- ============================================================

BEGIN;

-- 1) RPC pública y mínima para negocio por slug.
-- SECURITY DEFINER permite leer la tabla base sin abrir SELECT a anon,
-- pero sólo devuelve las columnas explícitamente listadas.
CREATE OR REPLACE FUNCTION public.get_public_business(p_slug text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  cover_image_url text,
  whatsapp text,
  address text,
  opening_hours jsonb,
  created_at timestamptz,
  slug text,
  description text,
  instagram text,
  theme text,
  booking_notice text,
  cancellation_policy text,
  business_type text,
  business_category_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT
    b.id,
    b.name,
    b.logo_url,
    b.cover_image_url,
    b.whatsapp,
    b.address,
    b.opening_hours,
    b.created_at,
    b.slug,
    b.description,
    b.instagram,
    b.theme,
    b.booking_notice,
    b.cancellation_policy,
    b.business_type,
    b.business_category_id
  FROM public.businesses b
  WHERE
    (p_slug IS NOT NULL AND b.slug = p_slug)
    OR
    (p_slug IS NULL AND b.id = (
      SELECT b2.id
      FROM public.businesses b2
      ORDER BY b2.created_at ASC
      LIMIT 1
    ))
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_public_business(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_business(text) TO anon, authenticated;

-- 2) RPC pública y mínima para bloqueos de disponibilidad.
CREATE OR REPLACE FUNCTION public.get_public_blocked_times(
  p_business_id uuid,
  p_date date
)
RETURNS TABLE (
  start_time time,
  end_time time
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT bt.start_time, bt.end_time
  FROM public.blocked_times bt
  WHERE bt.business_id = p_business_id
    AND bt.date = p_date;
$function$;

REVOKE ALL ON FUNCTION public.get_public_blocked_times(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_blocked_times(uuid, date) TO anon, authenticated;

-- 3) Mantener las tablas base cerradas al público.
REVOKE SELECT ON public.businesses FROM anon;
REVOKE SELECT ON public.staff FROM anon;
REVOKE SELECT ON public.blocked_times FROM anon;

-- 4) Las vistas anteriores ya no son necesarias para reservar.html.
-- Se pueden conservar temporalmente, pero anon no necesita acceso.
REVOKE SELECT ON public.businesses_public FROM anon;
REVOKE SELECT ON public.blocked_times_public FROM anon;

COMMIT;

-- Forzar recarga del schema cache de PostgREST.
NOTIFY pgrst, 'reload schema';

-- Verificación.
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_public_business', 'get_public_blocked_times')
ORDER BY p.proname;

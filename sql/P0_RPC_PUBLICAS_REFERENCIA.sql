-- ============================================================
-- MyCitaGo · P0 RPC públicas mínimas (referencia idempotente)
-- Ejecutar SOLO si alguna RPC no existe. En tu proyecto ya fueron creadas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_business(p_slug text)
RETURNS TABLE (
  id uuid,name text,logo_url text,cover_image_url text,whatsapp text,address text,
  opening_hours jsonb,created_at timestamptz,slug text,description text,instagram text,
  theme text,booking_notice text,cancellation_policy text,business_type text,business_category_id text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp
AS $function$
  SELECT b.id,b.name,b.logo_url,b.cover_image_url,b.whatsapp,b.address,b.opening_hours,b.created_at,b.slug,b.description,b.instagram,b.theme,b.booking_notice,b.cancellation_policy,b.business_type,b.business_category_id
  FROM public.businesses b WHERE b.slug=p_slug LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.get_public_business(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_business(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_public_services(p_business_id uuid)
RETURNS TABLE (
  id uuid,business_id uuid,name text,description text,price numeric,duration_minutes integer,
  category text,image_url text,featured boolean,deposit_amount numeric,active boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp
AS $function$
  SELECT s.id,s.business_id,s.name,s.description,s.price,s.duration_minutes,s.category,s.image_url,s.featured,s.deposit_amount,s.active
  FROM public.services s WHERE s.business_id=p_business_id AND s.active=true ORDER BY s.name;
$function$;
REVOKE ALL ON FUNCTION public.get_public_services(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_services(uuid) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_public_blocked_times(p_business_id uuid,p_date date)
RETURNS TABLE(start_time time,end_time time)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp
AS $function$
  SELECT bt.start_time,bt.end_time FROM public.blocked_times bt WHERE bt.business_id=p_business_id AND bt.date=p_date;
$function$;
REVOKE ALL ON FUNCTION public.get_public_blocked_times(uuid,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_blocked_times(uuid,date) TO anon,authenticated;

NOTIFY pgrst,'reload schema';

-- ============================================================
-- MyCitaGo · Dashboard estable + zona horaria de sucursal principal
-- Reemplaza business_dashboard_snapshot con metadata de reloj.
-- NO usa zona por defecto: si no hay timezone configurada devuelve NULL.
-- ============================================================

CREATE OR REPLACE FUNCTION public.business_dashboard_snapshot(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_appointments jsonb := '[]'::jsonb;
  v_services jsonb := '[]'::jsonb;
  v_customers jsonb := '[]'::jsonb;
  v_timezone text := NULL;
  v_primary_branch_id uuid := NULL;
  v_primary_branch_name text := NULL;
  v_branch_count integer := 0;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business_id_required' USING ERRCODE='22023';
  END IF;

  IF NOT (
    public.is_member_of(p_business_id)
    OR public.is_platform_admin()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_branch_count
  FROM public.business_branches bb
  WHERE bb.business_id=p_business_id
    AND COALESCE(bb.active,true)=true;

  SELECT bb.id, bb.name, NULLIF(BTRIM(bb.timezone),'')
  INTO v_primary_branch_id, v_primary_branch_name, v_timezone
  FROM public.business_branches bb
  WHERE bb.business_id=p_business_id
    AND COALESCE(bb.active,true)=true
  ORDER BY COALESCE(bb.is_primary,false) DESC, bb.created_at ASC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(q.payload ORDER BY q.appointment_date,q.start_time),'[]'::jsonb)
  INTO v_appointments
  FROM (
    SELECT
      a.appointment_date,
      a.start_time,
      jsonb_build_object(
        'id', a.id,
        'appointment_date', a.appointment_date,
        'start_time', a.start_time,
        'end_time', a.end_time,
        'status', a.status,
        'notes', a.notes,
        'created_at', a.created_at,
        'service_id', a.service_id,
        'branch_id', NULLIF(to_jsonb(a)->>'branch_id',''),
        'staff_id', to_jsonb(a)->'staff_id',
        'price_charged', to_jsonb(a)->'price_charged',
        'duration_charged', to_jsonb(a)->'duration_charged',
        'customers', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
          'name', c.name,
          'whatsapp', c.whatsapp
        ) END,
        'services', CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
          'name', s.name,
          'price', s.price,
          'duration_minutes', s.duration_minutes,
          'image_url', s.image_url
        ) END
      ) AS payload
    FROM public.appointments a
    LEFT JOIN public.customers c
      ON c.id=a.customer_id
     AND c.business_id=p_business_id
    LEFT JOIN public.services s
      ON s.id=a.service_id
     AND s.business_id=p_business_id
    WHERE a.business_id=p_business_id
      AND a.appointment_date >= date_trunc('month',current_date)::date
  ) q;

  SELECT COALESCE(jsonb_agg(q.payload ORDER BY q.created_at DESC),'[]'::jsonb)
  INTO v_services
  FROM (
    SELECT s.created_at,
      jsonb_build_object(
        'id',s.id,'name',s.name,'price',s.price,
        'duration_minutes',s.duration_minutes,'image_url',s.image_url,
        'active',s.active,'created_at',s.created_at
      ) AS payload
    FROM public.services s
    WHERE s.business_id=p_business_id
  ) q;

  SELECT COALESCE(jsonb_agg(q.payload ORDER BY q.created_at DESC),'[]'::jsonb)
  INTO v_customers
  FROM (
    SELECT c.created_at,
      jsonb_build_object(
        'id',c.id,'name',c.name,'whatsapp',c.whatsapp,'created_at',c.created_at
      ) AS payload
    FROM public.customers c
    WHERE c.business_id=p_business_id
    ORDER BY c.created_at DESC
    LIMIT 80
  ) q;

  RETURN jsonb_build_object(
    'appointments',v_appointments,
    'services',v_services,
    'customers',v_customers,
    'dashboard_timezone',v_timezone,
    'primary_branch_id',v_primary_branch_id,
    'primary_branch_name',v_primary_branch_name,
    'branch_count',v_branch_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.business_dashboard_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_dashboard_snapshot(uuid) TO authenticated;

NOTIFY pgrst,'reload schema';

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname='business_dashboard_snapshot';

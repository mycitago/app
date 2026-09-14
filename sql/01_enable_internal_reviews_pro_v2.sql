-- MyCitaGo · fix reseñas internas para plan Pro V2
-- Idempotente. En producción ya fue aplicado el 2026-09-14.

update public.saas_plans
set features = jsonb_set(
  coalesce(features, '{}'::jsonb),
  '{internal_reviews}',
  'true'::jsonb,
  true
)
where plan_code = 'pro_v2'
  and active = true;

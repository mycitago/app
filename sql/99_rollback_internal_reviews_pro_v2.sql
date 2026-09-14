-- ROLLBACK opcional del fix de reseñas internas para Pro V2
update public.saas_plans
set features = jsonb_set(
  coalesce(features, '{}'::jsonb),
  '{internal_reviews}',
  'false'::jsonb,
  true
)
where plan_code = 'pro_v2'
  and active = true;

-- Diagnóstico opcional del 404 que encontramos.
SELECT
  table_schema,
  table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('businesses_public', 'blocked_times_public')
ORDER BY table_name;

SELECT
  has_table_privilege('anon', 'public.businesses_public', 'SELECT') AS anon_businesses_public_select,
  has_table_privilege('anon', 'public.blocked_times_public', 'SELECT') AS anon_blocked_times_public_select;

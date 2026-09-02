# MyCitaGo Super Admin Backend Centralization Design

## Goal
Eliminate the Super Admin's six sensitive direct browser reads and replace them with six explicit, allow-listed Supabase RPCs while keeping existing V6 and Blocks 1-3 behavior intact.

## Security boundary
`js/platform-api.js` is only an organization boundary in the browser. It is not trusted for authorization. Every new RPC is `security definer`, fixes `search_path` to `public, pg_temp`, and checks `public.is_platform_admin(auth.uid())` before reading any platform data. Direct invocation from the browser console by a non-admin must fail with `forbidden`.

## RPC surface
Exactly six new read RPCs are added; there is no generic table-name or dynamic-SQL reader:

- `platform_read_support()`
- `platform_read_service_templates()`
- `platform_read_business_categories()`
- `platform_read_business_invites()`
- `platform_read_category_change_requests()`
- `platform_read_audit_logs()`

Each function returns only the data needed by `admin/plataforma.html`, as JSONB arrays. Existing mutation RPCs and the existing `platform_dashboard_snapshot()` remain unchanged.

## Frontend
Create `js/platform-api.js` as a thin adapter over the six RPCs. `js/admin-platform.js` consumes that adapter and no longer performs direct `.from(...).select(...)` reads against the six sensitive tables. Per-module error handling remains independent using `Promise.allSettled`.

## Migration
Create a new additive migration `sql/platform_read_api.sql`. Do not modify `SUPABASE_V6_MASTER.sql`. The migration adds the UUID overload `public.is_platform_admin(uuid)` only to make authorization explicit at every RPC boundary, then defines/replaces the six named read RPCs. It revokes public execution and grants execute only to `authenticated`.

## Verification
Automated contracts must prove:

1. Six and only six named read RPCs exist in the new migration.
2. Each RPC is `security definer`, has a fixed `search_path`, and calls `public.is_platform_admin(auth.uid())`.
3. No generic table-name parameter/dynamic SQL reader exists.
4. `admin-platform.js` contains no direct select reads for the six sensitive tables.
5. `platform-api.js` calls each named RPC.
6. `SUPABASE_V6_MASTER.sql` remains byte-for-byte unchanged during this change.
7. Full existing tests, V6 verifier, JS syntax checks, and ZIP integrity pass.

Live Supabase verification remains required after deployment: legitimate Super Admin loads all nine sections with no app-generated 403; a non-admin calling any of the six RPCs directly receives `forbidden`.

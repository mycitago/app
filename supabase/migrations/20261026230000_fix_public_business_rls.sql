-- MyCitaGo pre-launch security hardening
-- Restrict direct tenant-table reads to authenticated members only.
-- Public booking must use the existing, narrowly-scoped public RPCs (for example
-- get_public_business/get_public_blocked_times), not unrestricted table SELECT.
-- Review the public booking flow end-to-end before merging/deploying.

begin;

drop policy if exists businesses_public_read on public.businesses;
drop policy if exists businesses_tenant_select on public.businesses;

create policy businesses_tenant_select
on public.businesses
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or public.is_member_of(id)
  or public.is_platform_admin()
);

drop policy if exists blocked_times_public_read on public.blocked_times;
drop policy if exists blocked_times_tenant_select on public.blocked_times;

create policy blocked_times_tenant_select
on public.blocked_times
for select
to authenticated
using (
  public.my_role(business_id) = any (array['OWNER','MANAGER','RECEPTIONIST']::text[])
  or public.is_platform_admin()
);

commit;

-- Verification after deployment:
-- 1) anon cannot SELECT from businesses or blocked_times directly.
-- 2) authenticated owner/member can SELECT only their own business rows.
-- 3) authenticated user from business A cannot SELECT business B or B's blocked times.
-- 4) public booking page still works through approved public RPCs.
-- 5) platform admin dashboard and onboarding continue to work.

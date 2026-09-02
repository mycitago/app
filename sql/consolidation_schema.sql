-- MyCitaGo consolidation schema — 2026-09-01
create extension if not exists pgcrypto;

create table if not exists public.business_branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  timezone text not null default 'America/Mexico_City',
  opening_hours jsonb not null default '{}'::jsonb,
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.business_branches
  add column if not exists opening_hours jsonb not null default '{}'::jsonb;
create unique index if not exists business_branches_one_primary on public.business_branches(business_id) where is_primary;
create index if not exists business_branches_business_idx on public.business_branches(business_id,active);
alter table public.business_branches enable row level security;
drop policy if exists business_branches_member_all on public.business_branches;
create policy business_branches_member_all on public.business_branches for all to authenticated
using(exists(select 1 from public.business_members bm where bm.business_id=business_branches.business_id and bm.user_id=auth.uid() and bm.status='active'))
with check(exists(select 1 from public.business_members bm where bm.business_id=business_branches.business_id and bm.user_id=auth.uid() and bm.status='active'));
grant select,insert,update,delete on public.business_branches to authenticated;

create table if not exists public.business_staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  branch_id uuid references public.business_branches(id) on delete set null,
  name text not null,
  email text,
  phone text,
  role text not null default 'PROFESSIONAL',
  photo_url text,
  commission_rate numeric(5,2),
  schedule jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists business_staff_business_idx on public.business_staff(business_id,active);
alter table public.business_staff enable row level security;
drop policy if exists business_staff_member_all on public.business_staff;
create policy business_staff_member_all on public.business_staff for all to authenticated
using(exists(select 1 from public.business_members bm where bm.business_id=business_staff.business_id and bm.user_id=auth.uid() and bm.status='active'))
with check(exists(select 1 from public.business_members bm where bm.business_id=business_staff.business_id and bm.user_id=auth.uid() and bm.status='active'));
grant select,insert,update,delete on public.business_staff to authenticated;

create table if not exists public.staff_services (
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.business_staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key(staff_id,service_id)
);
alter table public.staff_services enable row level security;
drop policy if exists staff_services_member_all on public.staff_services;
create policy staff_services_member_all on public.staff_services for all to authenticated
using(exists(select 1 from public.business_members bm where bm.business_id=staff_services.business_id and bm.user_id=auth.uid() and bm.status='active'))
with check(exists(select 1 from public.business_members bm where bm.business_id=staff_services.business_id and bm.user_id=auth.uid() and bm.status='active'));
grant select,insert,update,delete on public.staff_services to authenticated;

create table if not exists public.branch_services (
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null references public.business_branches(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key(branch_id,service_id)
);
alter table public.branch_services enable row level security;
drop policy if exists branch_services_member_all on public.branch_services;
create policy branch_services_member_all on public.branch_services for all to authenticated
using(exists(select 1 from public.business_members bm where bm.business_id=branch_services.business_id and bm.user_id=auth.uid() and bm.status='active'))
with check(exists(select 1 from public.business_members bm where bm.business_id=branch_services.business_id and bm.user_id=auth.uid() and bm.status='active'));
grant select,insert,update,delete on public.branch_services to authenticated;

create table if not exists public.business_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(24),'hex'),
  business_name text,
  email text,
  phone text,
  status text not null default 'pending' check(status in ('pending','accepted','expired','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_business_id uuid references public.businesses(id) on delete set null,
  expires_at timestamptz not null default (now()+interval '14 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
alter table public.business_invites enable row level security;
drop policy if exists business_invites_platform_select on public.business_invites;
create policy business_invites_platform_select on public.business_invites for select to authenticated using(exists(select 1 from public.platform_admins pa where pa.id=auth.uid()));
grant select on public.business_invites to authenticated;

create table if not exists public.business_category_change_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  current_category_id text references public.business_categories(id),
  requested_category_id text not null references public.business_categories(id),
  reason text,
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.business_category_change_requests enable row level security;
drop policy if exists category_requests_member_select on public.business_category_change_requests;
create policy category_requests_member_select on public.business_category_change_requests for select to authenticated using(
  exists(select 1 from public.business_members bm where bm.business_id=business_category_change_requests.business_id and bm.user_id=auth.uid() and bm.status='active')
  or exists(select 1 from public.platform_admins pa where pa.id=auth.uid())
);
drop policy if exists category_requests_member_insert on public.business_category_change_requests;
create policy category_requests_member_insert on public.business_category_change_requests for insert to authenticated with check(
  requested_by=auth.uid() and exists(select 1 from public.business_members bm where bm.business_id=business_category_change_requests.business_id and bm.user_id=auth.uid() and bm.status='active')
);
grant select,insert on public.business_category_change_requests to authenticated;

create table if not exists public.platform_incidents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  title text not null,
  description text,
  severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
  status text not null default 'open' check(status in ('open','investigating','monitoring','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.platform_incidents enable row level security;
drop policy if exists platform_incidents_admin_all on public.platform_incidents;
create policy platform_incidents_admin_all on public.platform_incidents for all to authenticated
using(exists(select 1 from public.platform_admins pa where pa.id=auth.uid()))
with check(exists(select 1 from public.platform_admins pa where pa.id=auth.uid()));
grant select,insert,update,delete on public.platform_incidents to authenticated;

create table if not exists public.platform_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  subscription_id uuid,
  amount numeric(12,2) not null default 0,
  currency text not null default 'MXN',
  status text not null default 'pending',
  provider text,
  provider_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.platform_subscription_payments enable row level security;
drop policy if exists platform_subscription_payments_admin_all on public.platform_subscription_payments;
create policy platform_subscription_payments_admin_all on public.platform_subscription_payments for all to authenticated
using(exists(select 1 from public.platform_admins pa where pa.id=auth.uid()))
with check(exists(select 1 from public.platform_admins pa where pa.id=auth.uid()));
grant select,insert,update,delete on public.platform_subscription_payments to authenticated;

alter table public.businesses add column if not exists business_category_locked boolean not null default false;
alter table public.appointments add column if not exists branch_id uuid references public.business_branches(id) on delete set null;
alter table public.appointments add column if not exists staff_id uuid references public.business_staff(id) on delete set null;

create or replace function public.create_business_invite(p_business_name text default null,p_email text default null,p_phone text default null)
returns public.business_invites language plpgsql security definer set search_path=public as $$
declare r public.business_invites;
begin
  if auth.uid() is null or not exists(select 1 from public.platform_admins pa where pa.id=auth.uid()) then raise exception 'forbidden'; end if;
  insert into public.business_invites(business_name,email,phone,created_by) values(nullif(trim(p_business_name),''),nullif(lower(trim(p_email)),''),nullif(trim(p_phone),''),auth.uid()) returning * into r;
  return r;
end $$;
revoke all on function public.create_business_invite(text,text,text) from public;
grant execute on function public.create_business_invite(text,text,text) to authenticated;

create or replace function public.claim_business_invite(p_token text,p_business_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not exists(select 1 from public.business_members bm where bm.business_id=p_business_id and bm.user_id=auth.uid() and bm.status='active') then raise exception 'forbidden'; end if;
  update public.business_invites set status='accepted',accepted_by=auth.uid(),accepted_business_id=p_business_id,accepted_at=now() where token=p_token and status='pending' and expires_at>now();
  return found;
end $$;
revoke all on function public.claim_business_invite(text,uuid) from public;
grant execute on function public.claim_business_invite(text,uuid) to authenticated;

create or replace function public.approve_business_category_change(p_request_id uuid,p_approve boolean,p_note text default null)
returns public.business_category_change_requests language plpgsql security definer set search_path=public as $$
declare r public.business_category_change_requests;
begin
  if auth.uid() is null or not exists(select 1 from public.platform_admins pa where pa.id=auth.uid()) then raise exception 'forbidden'; end if;
  select * into r from public.business_category_change_requests where id=p_request_id for update;
  if r.id is null then raise exception 'request_not_found'; end if;
  if r.status<>'pending' then raise exception 'request_already_reviewed'; end if;
  if p_approve then
    update public.businesses set business_category_id=r.requested_category_id,business_category_locked=true where id=r.business_id;
    update public.business_category_change_requests set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),reason=coalesce(reason,'')||case when nullif(trim(p_note),'') is null then '' else E'\nAdmin: '||trim(p_note) end where id=r.id returning * into r;
  else
    update public.business_category_change_requests set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),reason=coalesce(reason,'')||case when nullif(trim(p_note),'') is null then '' else E'\nAdmin: '||trim(p_note) end where id=r.id returning * into r;
  end if;
  return r;
end $$;
revoke all on function public.approve_business_category_change(uuid,boolean,text) from public;
grant execute on function public.approve_business_category_change(uuid,boolean,text) to authenticated;

-- Ensure every existing business can start with one branch without forcing branch selection in the UX.
insert into public.business_branches(business_id,name,address,phone,opening_hours,is_primary)
select b.id,coalesce(nullif(b.name,''),'Sucursal principal'),b.address,b.phone,coalesce(b.opening_hours,'{}'::jsonb),true
from public.businesses b
where not exists(select 1 from public.business_branches br where br.business_id=b.id);

notify pgrst, 'reload schema';

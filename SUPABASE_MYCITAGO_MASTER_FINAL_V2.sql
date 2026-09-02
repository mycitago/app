-- MYCITAGO MASTER FINAL V2 - opening_hours legacy-safe bootstrap
-- ============================================================
-- MyCitaGo - SUPABASE MASTER FINAL - 2026-09-02
-- Paquete acumulado V6 + Fase 7 + UX + Super Admin A/B
-- Diseñado para ejecutarse en Supabase SQL Editor sobre el proyecto actual.
-- Conserva datos existentes; los bloques fuente usan CREATE IF NOT EXISTS / CREATE OR REPLACE / políticas controladas.
-- ============================================================


-- ============================================================
-- BLOQUE: V6 CORE
-- FUENTE: SUPABASE_V6_MASTER.sql
-- ============================================================

-- =========================================================
-- MyCitaGo V6
-- SUPABASE_V6_MASTER.sql
-- Migración de estabilización / consolidación
--
-- Objetivo:
--   - Consolidar Equipo sobre public.staff
--   - Consolidar relación Servicio ↔ Personal sobre public.service_staff
--   - Añadir Sucursales sin duplicar modelos existentes
--   - Añadir appointments.branch_id
--   - Mantener la migración idempotente
--
-- IMPORTANTE:
--   1) Ejecutar el archivo COMPLETO en Supabase > SQL Editor.
--   2) No ejecutar fragmentos aislados de USING / WITH CHECK.
--   3) Puede ejecutarse más de una vez.
-- =========================================================

begin;

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. SUCURSALES
-- =========================================================

create table if not exists public.business_branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  timezone text not null default 'America/Mexico_City',
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Si la tabla fue creada parcialmente antes, completar columnas sin destruir datos.
alter table public.business_branches
  add column if not exists business_id uuid,
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists opening_hours jsonb not null default '{}'::jsonb,
  add column if not exists timezone text default 'America/Mexico_City',
  add column if not exists is_primary boolean default false,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.business_branches
set timezone = 'America/Mexico_City'
where timezone is null;

update public.business_branches
set is_primary = false
where is_primary is null;

update public.business_branches
set active = true
where active is null;

update public.business_branches
set created_at = now()
where created_at is null;

update public.business_branches
set updated_at = now()
where updated_at is null;

create index if not exists idx_business_branches_business
  on public.business_branches(business_id);

create index if not exists idx_business_branches_business_active
  on public.business_branches(business_id, active);

-- Una sola sucursal principal por negocio.
-- Antes del índice, corregir posibles duplicados conservando la más antigua.
with ranked as (
  select
    id,
    row_number() over (
      partition by business_id
      order by created_at nulls last, id
    ) as rn
  from public.business_branches
  where is_primary = true
)
update public.business_branches b
set is_primary = false
from ranked r
where b.id = r.id
  and r.rn > 1;

create unique index if not exists uq_business_branches_one_primary
  on public.business_branches(business_id)
  where is_primary = true;

-- FK business_id
-- NO se vuelve a crear aquí.
-- La tabla business_branches ya fue creada con la FK business_id -> businesses(id),
-- y el esquema real confirmó que la constraint business_branches_business_id_fkey existe.
-- Evitamos tocarla para mantener la migración V6 conservadora e idempotente.

-- =========================================================
-- 2. SUCURSAL PRINCIPAL PARA NEGOCIOS EXISTENTES
-- =========================================================

insert into public.business_branches (
  business_id,
  name,
  is_primary,
  active
)
select
  b.id,
  'Sucursal principal',
  true,
  true
from public.businesses b
where not exists (
  select 1
  from public.business_branches br
  where br.business_id = b.id
);

-- Si un negocio ya tenía sucursales pero ninguna marcada como principal,
-- marcar una de forma determinista.
with first_branch as (
  select distinct on (business_id)
    id,
    business_id
  from public.business_branches
  where business_id is not null
  order by business_id, created_at nulls last, id
)
update public.business_branches b
set is_primary = true
from first_branch f
where b.id = f.id
  and not exists (
    select 1
    from public.business_branches x
    where x.business_id = f.business_id
      and x.is_primary = true
  );

-- =========================================================
-- 3. EQUIPO: CONSERVAR public.staff COMO MODELO OFICIAL
-- =========================================================

-- public.staff ya existe en el modelo actual.
-- Solo añadimos los campos que el frontend V6 necesita.
alter table public.staff
  add column if not exists email text,
  add column if not exists role text default 'PROFESSIONAL',
  add column if not exists branch_id uuid,
  add column if not exists commission_rate numeric(5,2),
  add column if not exists updated_at timestamptz default now();

update public.staff
set role = 'PROFESSIONAL'
where role is null or btrim(role) = '';

update public.staff
set updated_at = now()
where updated_at is null;

-- Validación de comisión sin romper datos existentes.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'staff_commission_rate_check'
      and conrelid = 'public.staff'::regclass
  ) then
    begin
      alter table public.staff
        add constraint staff_commission_rate_check
        check (
          commission_rate is null
          or (commission_rate >= 0 and commission_rate <= 100)
        ) not valid;

      alter table public.staff
        validate constraint staff_commission_rate_check;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

-- FK staff.branch_id -> business_branches.id
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'staff_branch_id_fkey'
      and conrelid = 'public.staff'::regclass
  ) then
    begin
      alter table public.staff
        add constraint staff_branch_id_fkey
        foreign key (branch_id)
        references public.business_branches(id)
        on delete set null;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

create index if not exists idx_staff_branch
  on public.staff(branch_id);

-- Asignar personal existente sin sucursal a la principal de su mismo negocio.
update public.staff s
set branch_id = br.id,
    updated_at = now()
from public.business_branches br
where s.branch_id is null
  and br.business_id = s.business_id
  and br.is_primary = true;

-- =========================================================
-- 4. CITAS: AÑADIR branch_id; CONSERVAR staff_id EXISTENTE
-- =========================================================

alter table public.appointments
  add column if not exists branch_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_branch_id_fkey'
      and conrelid = 'public.appointments'::regclass
  ) then
    begin
      alter table public.appointments
        add constraint appointments_branch_id_fkey
        foreign key (branch_id)
        references public.business_branches(id)
        on delete set null;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

create index if not exists idx_appointments_branch_date
  on public.appointments(branch_id, appointment_date);

create index if not exists idx_appointments_staff_date
  on public.appointments(staff_id, appointment_date);

-- No rellenamos appointments.branch_id históricas:
-- no hay evidencia segura de qué sucursal atendió cada cita anterior.

-- =========================================================
-- 5. RELACIÓN SERVICIO ↔ PERSONAL
-- =========================================================
-- V6 CONSERVA public.service_staff.
-- NO se crean public.staff_services ni public.business_staff.

create table if not exists public.service_staff (
  service_id uuid not null references public.services(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (service_id, staff_id)
);

create index if not exists idx_service_staff_business
  on public.service_staff(business_id);

alter table public.service_staff enable row level security;

drop policy if exists "service_staff_member_read" on public.service_staff;
drop policy if exists "service_staff_owner_manager_write" on public.service_staff;

create policy "service_staff_member_read"
on public.service_staff
for select
to authenticated
using (
  public.is_member_of(business_id)
  or public.is_platform_admin()
);

create policy "service_staff_owner_manager_write"
on public.service_staff
for all
to authenticated
using (
  public.my_role(business_id) in ('OWNER','MANAGER')
  or public.is_platform_admin()
)
with check (
  public.my_role(business_id) in ('OWNER','MANAGER')
  or public.is_platform_admin()
);

-- Mantener business_id consistente con servicio y personal.
create or replace function public.trg_service_staff_validate()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_service_business uuid;
  v_staff_business uuid;
begin
  select business_id
    into v_service_business
  from public.services
  where id = new.service_id;

  select business_id
    into v_staff_business
  from public.staff
  where id = new.staff_id;

  if v_service_business is null or v_staff_business is null then
    raise exception 'service_or_staff_not_found';
  end if;

  if v_service_business <> v_staff_business then
    raise exception 'service_staff_business_mismatch';
  end if;

  new.business_id := v_service_business;
  return new;
end;
$$;

drop trigger if exists service_staff_validate on public.service_staff;

create trigger service_staff_validate
before insert or update on public.service_staff
for each row
execute function public.trg_service_staff_validate();

-- =========================================================
-- 6. INTEGRIDAD SUCURSAL ↔ NEGOCIO
-- =========================================================

create or replace function public.trg_validate_staff_branch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_branch_business uuid;
begin
  if new.branch_id is null then
    return new;
  end if;

  select business_id
    into v_branch_business
  from public.business_branches
  where id = new.branch_id;

  if v_branch_business is null then
    raise exception 'branch_not_found';
  end if;

  if v_branch_business <> new.business_id then
    raise exception 'staff_branch_business_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_staff_branch on public.staff;

create trigger validate_staff_branch
before insert or update of business_id, branch_id
on public.staff
for each row
execute function public.trg_validate_staff_branch();

create or replace function public.trg_validate_appointment_branch_staff()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_branch_business uuid;
  v_staff_business uuid;
begin
  if new.branch_id is not null then
    select business_id
      into v_branch_business
    from public.business_branches
    where id = new.branch_id;

    if v_branch_business is null then
      raise exception 'branch_not_found';
    end if;

    if v_branch_business <> new.business_id then
      raise exception 'appointment_branch_business_mismatch';
    end if;
  end if;

  if new.staff_id is not null then
    select business_id
      into v_staff_business
    from public.staff
    where id = new.staff_id;

    if v_staff_business is null then
      raise exception 'staff_not_found';
    end if;

    if v_staff_business <> new.business_id then
      raise exception 'appointment_staff_business_mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_appointment_branch_staff on public.appointments;

create trigger validate_appointment_branch_staff
before insert or update of business_id, branch_id, staff_id
on public.appointments
for each row
execute function public.trg_validate_appointment_branch_staff();

-- =========================================================
-- 7. RLS: SUCURSALES
-- =========================================================

alter table public.business_branches enable row level security;

drop policy if exists "business_branches_read" on public.business_branches;
drop policy if exists "business_branches_insert" on public.business_branches;
drop policy if exists "business_branches_update" on public.business_branches;
drop policy if exists "business_branches_delete" on public.business_branches;

create policy "business_branches_read"
on public.business_branches
for select
to authenticated
using (
  public.is_member_of(business_id)
  or public.is_platform_admin()
);

create policy "business_branches_insert"
on public.business_branches
for insert
to authenticated
with check (
  public.my_role(business_id) in ('OWNER','MANAGER')
  or public.is_platform_admin()
);

create policy "business_branches_update"
on public.business_branches
for update
to authenticated
using (
  public.my_role(business_id) in ('OWNER','MANAGER')
  or public.is_platform_admin()
)
with check (
  public.my_role(business_id) in ('OWNER','MANAGER')
  or public.is_platform_admin()
);

create policy "business_branches_delete"
on public.business_branches
for delete
to authenticated
using (
  public.my_role(business_id) in ('OWNER','MANAGER')
  or public.is_platform_admin()
);

-- =========================================================
-- 8. RLS: EQUIPO
-- =========================================================

alter table public.staff enable row level security;

-- Conservar lectura pública de personal activo porque el modelo existente
-- ya la utiliza en superficies públicas.
drop policy if exists "staff_public_read" on public.staff;

create policy "staff_public_read"
on public.staff
for select
to anon, authenticated
using (
  active = true
  or public.is_member_of(business_id)
  or public.is_platform_admin()
);

-- Sustituir escritura antigua basada solo en businesses.owner_id
-- por el modelo de membresías V6.
drop policy if exists "staff_owner_all" on public.staff;

create policy "staff_owner_all"
on public.staff
for all
to authenticated
using (
  public.my_role(business_id) in ('OWNER','MANAGER')
  or public.is_platform_admin()
)
with check (
  public.my_role(business_id) in ('OWNER','MANAGER')
  or public.is_platform_admin()
);

-- =========================================================
-- 9. VERIFICACIÓN V6
-- =========================================================

commit;

-- Esta consulta debe devolver:
-- branches_table_ok = true
-- staff_model_ok = true
-- service_staff_ok = true
-- appointment_branch_ok = true
-- appointment_staff_ok = true
-- duplicate_business_staff_absent = true
-- duplicate_staff_services_absent = true

select
  to_regclass('public.business_branches') is not null
    as branches_table_ok,

  to_regclass('public.staff') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema='public'
        and table_name='staff'
        and column_name='branch_id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema='public'
        and table_name='staff'
        and column_name='commission_rate'
    )
    as staff_model_ok,

  to_regclass('public.service_staff') is not null
    as service_staff_ok,

  exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='appointments'
      and column_name='branch_id'
  )
    as appointment_branch_ok,

  exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='appointments'
      and column_name='staff_id'
  )
    as appointment_staff_ok,

  to_regclass('public.business_staff') is null
    as duplicate_business_staff_absent,

  to_regclass('public.staff_services') is null
    as duplicate_staff_services_absent;



-- ============================================================
-- BLOQUE: CONSOLIDACION MULTISUCURSAL
-- FUENTE: sql/consolidation_schema.sql
-- ============================================================

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
-- Kept in one DO block so legacy installations are upgraded before the bootstrap INSERT is planned.
do $$
begin
  alter table public.business_branches
    add column if not exists opening_hours jsonb not null default '{}'::jsonb;

  insert into public.business_branches(
    business_id, name, address, phone, opening_hours, is_primary
  )
  select
    b.id,
    coalesce(nullif(b.name,''),'Sucursal principal'),
    b.address,
    b.phone,
    coalesce(b.opening_hours,'{}'::jsonb),
    true
  from public.businesses b
  where not exists (
    select 1
    from public.business_branches br
    where br.business_id = b.id
  );
end
$$;

notify pgrst, 'reload schema';



-- ============================================================
-- BLOQUE: PRODUCTO Y PLANTILLAS
-- FUENTE: sql/product_upgrade_schema.sql
-- ============================================================

-- =============================================================
-- MyCitaGo product upgrade: templates, service intelligence,
-- support center, version history and onboarding categories.
-- Safe to run multiple times.
-- =============================================================

create table if not exists public.business_categories (
  id text primary key,
  name text not null,
  icon text,
  description text,
  sort_order integer not null default 100,
  active boolean not null default true
);

grant select on public.business_categories to anon, authenticated;

create table if not exists public.service_templates (
  id uuid primary key default gen_random_uuid(),
  business_category_id text not null references public.business_categories(id) on delete cascade,
  name text not null,
  category text not null default 'Servicios',
  description text,
  duration_minutes integer not null default 60 check(duration_minutes >= 5),
  suggested_price numeric(12,2),
  image_url text,
  tags jsonb not null default '[]'::jsonb,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_category_id,name)
);
alter table public.service_templates enable row level security;
drop policy if exists service_templates_read on public.service_templates;
create policy service_templates_read on public.service_templates for select to anon,authenticated using(active=true or exists(select 1 from public.platform_admins pa where pa.id=auth.uid()));
drop policy if exists service_templates_platform_write on public.service_templates;
create policy service_templates_platform_write on public.service_templates for all to authenticated using(exists(select 1 from public.platform_admins pa where pa.id=auth.uid())) with check(exists(select 1 from public.platform_admins pa where pa.id=auth.uid()));

grant select on public.service_templates to anon,authenticated;
grant insert,update,delete on public.service_templates to authenticated;

create table if not exists public.service_commercial_settings (
  service_id uuid primary key references public.services(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  internal_cost numeric(12,2) not null default 0,
  tax_rate numeric(7,4) not null default 0,
  deposit_mode text not null default 'none' check(deposit_mode in ('none','fixed','percentage')),
  deposit_value numeric(12,2) not null default 0,
  cancellation_policy text,
  refund_policy text,
  min_booking_notice_minutes integer not null default 120,
  max_booking_window_days integer not null default 60,
  prep_minutes integer not null default 0,
  recovery_minutes integer not null default 0,
  expected_utilization numeric(5,2) not null default 70 check(expected_utilization between 0 and 100),
  schedule_mode text not null default 'business' check(schedule_mode in ('business','custom')),
  tags jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.service_commercial_settings enable row level security;
drop policy if exists service_commercial_member_all on public.service_commercial_settings;
create policy service_commercial_member_all on public.service_commercial_settings for all to authenticated using(exists(select 1 from public.business_members bm where bm.business_id=service_commercial_settings.business_id and bm.user_id=auth.uid())) with check(exists(select 1 from public.business_members bm where bm.business_id=service_commercial_settings.business_id and bm.user_id=auth.uid()));

grant select,insert,update,delete on public.service_commercial_settings to authenticated;

create table if not exists public.service_exceptions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  exception_date date not null,
  kind text not null check(kind in ('closed','custom_hours','blocked')),
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.service_exceptions enable row level security;
drop policy if exists service_exceptions_member_all on public.service_exceptions;
create policy service_exceptions_member_all on public.service_exceptions for all to authenticated using(exists(select 1 from public.business_members bm where bm.business_id=service_exceptions.business_id and bm.user_id=auth.uid())) with check(exists(select 1 from public.business_members bm where bm.business_id=service_exceptions.business_id and bm.user_id=auth.uid()));
grant select,insert,update,delete on public.service_exceptions to authenticated;

create table if not exists public.service_versions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  snapshot jsonb not null,
  changed_by uuid,
  change_summary text,
  created_at timestamptz not null default now()
);
alter table public.service_versions enable row level security;
drop policy if exists service_versions_member_select on public.service_versions;
create policy service_versions_member_select on public.service_versions for select to authenticated using(exists(select 1 from public.business_members bm where bm.business_id=service_versions.business_id and bm.user_id=auth.uid()));
drop policy if exists service_versions_member_insert on public.service_versions;
create policy service_versions_member_insert on public.service_versions for insert to authenticated with check(exists(select 1 from public.business_members bm where bm.business_id=service_versions.business_id and bm.user_id=auth.uid()));
grant select,insert on public.service_versions to authenticated;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  category text not null default 'general',
  subject text not null,
  description text,
  priority text not null default 'normal' check(priority in ('normal','high','urgent')),
  status text not null default 'new' check(status in ('new','in_review','waiting_customer','resolved','closed')),
  source_page text,
  browser_info text,
  assigned_to uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.support_tickets enable row level security;
drop policy if exists support_tickets_member_select on public.support_tickets;
create policy support_tickets_member_select on public.support_tickets for select to authenticated using(
  exists(select 1 from public.business_members bm where bm.business_id=support_tickets.business_id and bm.user_id=auth.uid())
  or exists(select 1 from public.platform_admins pa where pa.id=auth.uid())
);
drop policy if exists support_tickets_member_insert on public.support_tickets;
create policy support_tickets_member_insert on public.support_tickets for insert to authenticated with check(exists(select 1 from public.business_members bm where bm.business_id=support_tickets.business_id and bm.user_id=auth.uid()));
drop policy if exists support_tickets_platform_update on public.support_tickets;
create policy support_tickets_platform_update on public.support_tickets for update to authenticated using(exists(select 1 from public.platform_admins pa where pa.id=auth.uid())) with check(exists(select 1 from public.platform_admins pa where pa.id=auth.uid()));
grant select,insert,update on public.support_tickets to authenticated;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  sender_id uuid not null default auth.uid(),
  sender_type text not null default 'business' check(sender_type in ('business','platform')),
  message text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);
alter table public.support_messages enable row level security;
drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages for select to authenticated using(
  exists(select 1 from public.business_members bm where bm.business_id=support_messages.business_id and bm.user_id=auth.uid())
  or exists(select 1 from public.platform_admins pa where pa.id=auth.uid())
);
drop policy if exists support_messages_insert on public.support_messages;
create policy support_messages_insert on public.support_messages for insert to authenticated with check(
  (sender_type='business' and exists(select 1 from public.business_members bm where bm.business_id=support_messages.business_id and bm.user_id=auth.uid()))
  or (sender_type='platform' and exists(select 1 from public.platform_admins pa where pa.id=auth.uid()))
);
grant select,insert on public.support_messages to authenticated;

-- Add optional business category without forcing existing rows.
alter table public.businesses add column if not exists business_category_id text references public.business_categories(id);

insert into public.business_categories(id,name,icon,description,sort_order) values
('barber','Barbería','✂','Cortes, barba y grooming',10),
('beauty','Salón / Estética','✦','Cabello, maquillaje y cuidado',20),
('nails','Uñas','✧','Manicure, gel, acrílico y pedicure',30),
('spa','Spa / Masajes','◉','Masajes, faciales y bienestar',40),
('dental','Dentista','◇','Valoraciones, limpiezas y tratamientos',50),
('clinic','Clínica estética','✚','Valoraciones y procedimientos estéticos',60),
('veterinary','Veterinaria','✚','Consultas, vacunas y estética',70),
('therapy','Psicología / Terapia','♡','Primera consulta y sesiones',80),
('nutrition','Nutrición','◍','Valoraciones y seguimiento',90),
('physio','Fisioterapia','⌁','Valoración, sesión y rehabilitación',100),
('fitness','Entrenamiento','◆','Evaluación y entrenamiento personal',110),
('consulting','Consultoría','▣','Consultas y sesiones profesionales',120),
('automotive','Automotriz','⚙','Diagnóstico, revisión y mantenimiento',130),
('photo','Fotografía','◫','Sesiones y producción visual',140),
('classes','Clases','⌁','Sesiones individuales o grupales',150),
('other','Otro','+','Servicio personalizado',999)
on conflict(id) do update set name=excluded.name,icon=excluded.icon,description=excluded.description,sort_order=excluded.sort_order;

insert into public.service_templates(business_category_id,name,category,description,duration_minutes,suggested_price,image_url,tags,sort_order) values
('barber','Corte clásico','Barbería','Corte personalizado con acabado profesional.',30,null,'/app/assets/service-presets/barber-cut.svg','["corte","caballero"]',10),
('barber','Corte + barba','Barbería','Servicio completo de corte y arreglo de barba.',60,null,'/app/assets/service-presets/barber-beard.svg','["corte","barba"]',20),
('barber','Afeitado','Barbería','Afeitado y perfilado con acabado limpio.',30,null,'/app/assets/service-presets/barber-beard.svg','["barba"]',30),
('barber','Corte infantil','Barbería','Corte para niñas y niños.',30,null,'/app/assets/service-presets/barber-cut.svg','["infantil"]',40),
('beauty','Corte dama','Belleza y cuidado','Corte, asesoría y acabado.',60,null,'/app/assets/service-presets/beauty-hair.svg','["cabello"]',10),
('beauty','Peinado','Belleza y cuidado','Peinado para ocasión o uso diario.',60,null,'/app/assets/service-presets/beauty-hair.svg','["cabello"]',20),
('beauty','Tinte','Belleza y cuidado','Coloración profesional según diagnóstico.',120,null,'/app/assets/service-presets/beauty-hair.svg','["color"]',30),
('nails','Manicure','Uñas','Cuidado de manos y acabado profesional.',45,null,'/app/assets/service-presets/nails.svg','["manicure"]',10),
('nails','Gel semipermanente','Uñas','Aplicación de gel de larga duración.',60,null,'/app/assets/service-presets/nails.svg','["gel"]',20),
('nails','Pedicure','Uñas','Cuidado de pies y acabado profesional.',60,null,'/app/assets/service-presets/nails.svg','["pedicure"]',30),
('spa','Masaje relajante','Spa','Sesión de relajación y bienestar.',60,null,'/app/assets/service-presets/spa.svg','["masaje"]',10),
('spa','Facial','Spa','Cuidado facial personalizado.',60,null,'/app/assets/service-presets/spa.svg','["facial"]',20),
('dental','Valoración dental','Consultas','Evaluación inicial y plan de tratamiento.',45,null,'/app/assets/service-presets/dental.svg','["valoracion"]',10),
('dental','Limpieza dental','Consultas','Limpieza profesional y recomendaciones.',60,null,'/app/assets/service-presets/dental.svg','["limpieza"]',20),
('therapy','Primera consulta','Consultas','Sesión inicial de valoración.',60,null,'/app/assets/service-presets/therapy.svg','["valoracion"]',10),
('therapy','Sesión de seguimiento','Consultas','Sesión de seguimiento terapéutico.',50,null,'/app/assets/service-presets/therapy.svg','["seguimiento"]',20),
('nutrition','Valoración nutricional','Consultas','Evaluación inicial y plan personalizado.',60,null,'/app/assets/service-presets/nutrition.svg','["valoracion"]',10),
('physio','Valoración fisioterapia','Salud y bienestar','Evaluación funcional inicial.',60,null,'/app/assets/service-presets/physio.svg','["valoracion"]',10),
('veterinary','Consulta veterinaria','Consultas','Consulta general y valoración.',45,null,'/app/assets/service-presets/veterinary.svg','["consulta"]',10),
('consulting','Consulta inicial','Servicios profesionales','Sesión inicial para entender necesidades y alcance.',60,null,'/app/assets/service-presets/consulting.svg','["consulta"]',10),
('automotive','Diagnóstico','Mantenimiento','Revisión inicial para identificar la causa del problema.',60,null,'/app/assets/service-presets/automotive.svg','["diagnostico"]',10),
('photo','Sesión fotográfica','Servicios profesionales','Sesión personalizada con preparación previa.',90,null,'/app/assets/service-presets/photo.svg','["sesion"]',10),
('classes','Clase individual','Clases','Sesión individual personalizada.',60,null,'/app/assets/service-presets/class.svg','["clase"]',10)
on conflict(business_category_id,name) do update set category=excluded.category,description=excluded.description,duration_minutes=excluded.duration_minutes,image_url=excluded.image_url,tags=excluded.tags,sort_order=excluded.sort_order,active=true;

notify pgrst, 'reload schema';



-- ============================================================
-- BLOQUE: BRANDING / MI PAGINA
-- FUENTE: sql/branding_schema.sql
-- ============================================================


create table if not exists public.business_branding (
 business_id uuid primary key references public.businesses(id) on delete cascade,
 primary_color text not null default '#7c3aed', secondary_color text not null default '#17151f', background_color text not null default '#ffffff', text_color text not null default '#191724',
 font_family text not null default 'Manrope', button_style text not null default 'rounded', card_style text not null default 'soft', logo_url text, cover_url text, hero_title text, hero_subtitle text,
 section_order jsonb not null default '["hero","services","about","team","reviews","hours","location","contact"]'::jsonb,
 section_visibility jsonb not null default '{"hero":true,"services":true,"about":true,"team":true,"reviews":true,"hours":true,"location":true,"contact":true}'::jsonb,
 draft_config jsonb not null default '{}'::jsonb, published_config jsonb not null default '{}'::jsonb, published_at timestamptz, updated_at timestamptz not null default now()
);
alter table public.business_branding enable row level security;
drop policy if exists branding_member_select on public.business_branding;create policy branding_member_select on public.business_branding for select to authenticated using (exists(select 1 from public.business_members bm where bm.business_id=business_branding.business_id and bm.user_id=auth.uid()));
drop policy if exists branding_member_insert on public.business_branding;create policy branding_member_insert on public.business_branding for insert to authenticated with check (exists(select 1 from public.business_members bm where bm.business_id=business_branding.business_id and bm.user_id=auth.uid()));
drop policy if exists branding_member_update on public.business_branding;create policy branding_member_update on public.business_branding for update to authenticated using (exists(select 1 from public.business_members bm where bm.business_id=business_branding.business_id and bm.user_id=auth.uid())) with check (exists(select 1 from public.business_members bm where bm.business_id=business_branding.business_id and bm.user_id=auth.uid()));
create or replace function public.publish_business_branding(p_business_id uuid) returns public.business_branding language plpgsql security invoker as $$ declare r public.business_branding; begin if not exists(select 1 from public.business_members bm where bm.business_id=p_business_id and bm.user_id=auth.uid()) then raise exception 'forbidden'; end if; update public.business_branding set published_config=draft_config,published_at=now(),updated_at=now() where business_id=p_business_id returning * into r; return r; end $$;
drop view if exists public.business_branding_public;
create or replace view public.business_branding_public as
select
  business_id,
  published_config->>'primary_color' as primary_color,
  published_config->>'secondary_color' as secondary_color,
  published_config->>'background_color' as background_color,
  published_config->>'text_color' as text_color,
  published_config->>'font_family' as font_family,
  published_config->>'button_style' as button_style,
  published_config->>'card_style' as card_style,
  published_config->>'logo_url' as logo_url,
  published_config->>'cover_url' as cover_url,
  published_config->>'hero_title' as hero_title,
  published_config->>'hero_subtitle' as hero_subtitle,
  coalesce(published_config->'section_order', section_order) as section_order,
  coalesce(published_config->'section_visibility', section_visibility) as section_visibility,
  published_config,
  published_at
from public.business_branding
where published_at is not null;
grant select on public.business_branding_public to anon, authenticated;



-- ============================================================
-- BLOQUE: STORAGE PUBLICO DE NEGOCIOS
-- FUENTE: sql/STORAGE_PUBLIC_MEDIA_CHECK.sql
-- ============================================================


-- CITAGO: validar bucket público para imágenes de negocio.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-public-media','business-public-media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
 public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- IMPORTANTE:
-- Las políticas INSERT/UPDATE/DELETE deben validar que la primera carpeta
-- del objeto coincida con business_members.business_id del usuario autenticado.
-- No conviertas business-media (privado) en público.



-- ============================================================
-- BLOQUE: GOOGLE REVIEWS - ESQUEMA OPCIONAL PREPARADO
-- FUENTE: sql/google_reviews_schema.sql
-- ============================================================


create table if not exists public.business_google_connections(id uuid primary key default gen_random_uuid(),business_id uuid not null unique references public.businesses(id) on delete cascade,google_account_id text,location_id text,place_id text,display_name text,status text not null default 'disconnected',connected_at timestamptz,updated_at timestamptz not null default now());alter table public.business_google_connections enable row level security;drop policy if exists google_conn_member_select on public.business_google_connections;create policy google_conn_member_select on public.business_google_connections for select to authenticated using(exists(select 1 from public.business_members bm where bm.business_id=business_google_connections.business_id and bm.user_id=auth.uid()));

create table if not exists public.business_google_tokens(
 business_id uuid primary key references public.businesses(id) on delete cascade,
 access_token text not null,
 refresh_token text,
 expires_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.business_google_tokens enable row level security;
revoke all on public.business_google_tokens from anon, authenticated;
grant all on public.business_google_tokens to service_role;

create table if not exists public.business_google_reviews(business_id uuid not null references public.businesses(id) on delete cascade,review_id text not null,reviewer_name text,star_rating integer,comment text,create_time timestamptz,update_time timestamptz,reply_comment text,reply_update_time timestamptz,primary key(business_id,review_id));alter table public.business_google_reviews enable row level security;drop policy if exists google_reviews_member_select on public.business_google_reviews;create policy google_reviews_member_select on public.business_google_reviews for select to authenticated using(exists(select 1 from public.business_members bm where bm.business_id=business_google_reviews.business_id and bm.user_id=auth.uid()));
create or replace view public.business_google_reviews_public as select business_id,review_id,reviewer_name,star_rating,comment,create_time,reply_comment from public.business_google_reviews where star_rating>=4;

grant select on public.business_google_reviews_public to anon, authenticated;



-- ============================================================
-- BLOQUE: FASE 7 REPUTACION Y CRECIMIENTO
-- FUENTE: sql/phase7_reputation_growth_superadmin.sql
-- ============================================================

-- ============================================================
-- MyCitaGo Phase 7 - Reputation, Growth, Super Admin stability
-- Additive / idempotent migration for V6
-- ============================================================
begin;
create extension if not exists pgcrypto;
alter table public.businesses add column if not exists business_category_locked boolean not null default false;

-- Missing Super Admin resources confirmed by introspection.
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
create policy business_invites_platform_select on public.business_invites for select to authenticated using(public.is_platform_admin());
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
  public.is_member_of(business_id) or public.is_platform_admin()
);
drop policy if exists category_requests_member_insert on public.business_category_change_requests;
create policy category_requests_member_insert on public.business_category_change_requests for insert to authenticated with check(
  requested_by=auth.uid() and public.is_member_of(business_id)
);
grant select,insert on public.business_category_change_requests to authenticated;

create or replace function public.create_business_invite(p_business_name text default null,p_email text default null,p_phone text default null)
returns public.business_invites language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.business_invites;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'forbidden'; end if;
  insert into public.business_invites(business_name,email,phone,created_by)
  values(nullif(trim(p_business_name),''),nullif(lower(trim(p_email)),''),nullif(trim(p_phone),''),auth.uid()) returning * into r;
  return r;
end $$;
revoke all on function public.create_business_invite(text,text,text) from public;
grant execute on function public.create_business_invite(text,text,text) to authenticated;

create or replace function public.claim_business_invite(p_token text,p_business_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or not public.is_member_of(p_business_id) then raise exception 'forbidden'; end if;
  update public.business_invites set status='accepted',accepted_by=auth.uid(),accepted_business_id=p_business_id,accepted_at=now()
   where token=p_token and status='pending' and expires_at>now();
  return found;
end $$;
revoke all on function public.claim_business_invite(text,uuid) from public;
grant execute on function public.claim_business_invite(text,uuid) to authenticated;

create or replace function public.approve_business_category_change(p_request_id uuid,p_approve boolean,p_note text default null)
returns public.business_category_change_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.business_category_change_requests;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'forbidden'; end if;
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

-- Reputation schema (safe if the user already created these tables).
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  source text not null default 'internal' check(source in ('internal','google')),
  rating smallint not null check(rating between 1 and 5),
  comment text,
  reviewer_name text,
  status text not null default 'published' check(status in ('pending','published','hidden')),
  reply_text text,
  replied_at timestamptz,
  replied_by uuid,
  external_review_id text,
  external_location_id text,
  external_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists reviews_internal_appointment_unique on public.reviews(appointment_id) where source='internal' and appointment_id is not null;
create unique index if not exists reviews_external_unique_idx on public.reviews(business_id,source,external_review_id) where external_review_id is not null;
create index if not exists reviews_business_created_idx on public.reviews(business_id,created_at desc);
alter table public.reviews enable row level security;
drop policy if exists reviews_member_select on public.reviews;
create policy reviews_member_select on public.reviews for select to authenticated using(public.is_member_of(business_id) or public.is_platform_admin());
drop policy if exists reviews_member_update on public.reviews;
create policy reviews_member_update on public.reviews for update to authenticated using(public.is_member_of(business_id) or public.is_platform_admin()) with check(public.is_member_of(business_id) or public.is_platform_admin());
grant select,update on public.reviews to authenticated;

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  token_hash text not null unique,
  status text not null default 'pending' check(status in ('pending','completed','expired','revoked')),
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists review_requests_appointment_unique on public.review_requests(appointment_id);
alter table public.review_requests enable row level security;
drop policy if exists review_requests_member_select on public.review_requests;
create policy review_requests_member_select on public.review_requests for select to authenticated using(public.is_member_of(business_id) or public.is_platform_admin());
grant select on public.review_requests to authenticated;

alter table public.appointments add column if not exists booking_source text;

create table if not exists public.growth_link_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source text not null,
  event_type text not null check(event_type in ('click','booking_started','booking_completed')),
  appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.growth_link_events enable row level security;
drop policy if exists growth_events_member_select on public.growth_link_events;
create policy growth_events_member_select on public.growth_link_events for select to authenticated using(public.is_member_of(business_id) or public.is_platform_admin());
grant select on public.growth_link_events to authenticated;

-- Optional Google review destination. It stays null until GBP is actually configured.
do $$ begin
  if to_regclass('public.business_google_connections') is not null then
    alter table public.business_google_connections add column if not exists review_url text;
  end if;
end $$;

create or replace function public.create_review_request(p_appointment_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.appointments; r public.review_requests; raw_token text;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  select * into a from public.appointments where id=p_appointment_id;
  if a.id is null then raise exception 'appointment_not_found'; end if;
  if not public.is_member_of(a.business_id) and not public.is_platform_admin() then raise exception 'forbidden'; end if;
  if lower(coalesce(a.status,'')) not in ('completada','completado','completed','done') then raise exception 'appointment_not_completed'; end if;
  if exists(select 1 from public.reviews rv where rv.appointment_id=a.id and rv.source='internal') then raise exception 'review_already_submitted'; end if;
  raw_token:=encode(gen_random_bytes(24),'hex');
  insert into public.review_requests(business_id,appointment_id,customer_id,token_hash,status,expires_at)
  values(a.business_id,a.id,a.customer_id,encode(digest(raw_token,'sha256'),'hex'),'pending',now()+interval '30 days')
  on conflict (appointment_id) do update set token_hash=excluded.token_hash,status='pending',expires_at=excluded.expires_at,completed_at=null
  returning * into r;
  return jsonb_build_object('token',raw_token,'request_id',r.id,'expires_at',r.expires_at);
end $$;
revoke all on function public.create_review_request(uuid) from public;
grant execute on function public.create_review_request(uuid) to authenticated;

create or replace function public.get_review_request_public(p_token text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.review_requests; b record; google_url text:=null;
begin
  select * into r from public.review_requests where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex');
  if r.id is null or r.status<>'pending' or (r.expires_at is not null and r.expires_at<now()) then return jsonb_build_object('valid',false); end if;
  select id,name into b from public.businesses where id=r.business_id;
  if to_regclass('public.business_google_connections') is not null then
    execute 'select review_url from public.business_google_connections where business_id=$1 and status=''connected'' and review_url is not null' into google_url using r.business_id;
  end if;
  return jsonb_build_object('valid',true,'business_name',b.name,'google_available',google_url is not null,'google_review_url',google_url);
end $$;
revoke all on function public.get_review_request_public(text) from public;
grant execute on function public.get_review_request_public(text) to anon,authenticated;

create or replace function public.submit_internal_review(p_token text,p_rating integer,p_comment text default null,p_reviewer_name text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.review_requests; rv public.reviews;
begin
  if p_rating<1 or p_rating>5 then raise exception 'invalid_rating'; end if;
  select * into r from public.review_requests where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex') for update;
  if r.id is null then raise exception 'invalid_token'; end if;
  if r.status<>'pending' then raise exception 'request_already_used'; end if;
  if r.expires_at is not null and r.expires_at<now() then update public.review_requests set status='expired' where id=r.id; raise exception 'request_expired'; end if;
  insert into public.reviews(business_id,appointment_id,customer_id,source,rating,comment,reviewer_name,status)
  values(r.business_id,r.appointment_id,r.customer_id,'internal',p_rating,nullif(trim(p_comment),''),coalesce(nullif(trim(p_reviewer_name),''),'Cliente'),'published') returning * into rv;
  update public.review_requests set status='completed',completed_at=now() where id=r.id;
  return jsonb_build_object('ok',true,'review_id',rv.id);
end $$;
revoke all on function public.submit_internal_review(text,integer,text,text) from public;
grant execute on function public.submit_internal_review(text,integer,text,text) to anon,authenticated;

create or replace function public.track_booking_source(p_appointment_id uuid,p_access_token text,p_source text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.appointments; cleaned text;
begin
  cleaned:=lower(regexp_replace(coalesce(p_source,''),'[^a-z0-9_-]','','g'));
  if cleaned='' or length(cleaned)>32 then return false; end if;
  select * into a from public.appointments where id=p_appointment_id and access_token=p_access_token;
  if a.id is null then return false; end if;
  update public.appointments set booking_source=cleaned where id=a.id;
  insert into public.growth_link_events(business_id,source,event_type,appointment_id) values(a.business_id,cleaned,'booking_completed',a.id);
  return true;
end $$;
revoke all on function public.track_booking_source(uuid,text,text) from public;
grant execute on function public.track_booking_source(uuid,text,text) to anon,authenticated;

create or replace function public.reply_internal_review(p_review_id uuid,p_reply text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.reviews;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  select * into r from public.reviews where id=p_review_id and source='internal';
  if r.id is null then raise exception 'review_not_found'; end if;
  if not public.is_member_of(r.business_id) and not public.is_platform_admin() then raise exception 'forbidden'; end if;
  update public.reviews set reply_text=nullif(trim(p_reply),''),replied_at=case when nullif(trim(p_reply),'') is null then null else now() end,replied_by=case when nullif(trim(p_reply),'') is null then null else auth.uid() end,updated_at=now() where id=r.id;
  return true;
end $$;
revoke all on function public.reply_internal_review(uuid,text) from public;
grant execute on function public.reply_internal_review(uuid,text) to authenticated;

-- Safe public projection of published reviews.
create or replace function public.public_business_reviews(p_slug text,p_limit integer default 12)
returns table(reviewer_name text,rating smallint,comment text,source text,reply_text text,created_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
  select coalesce(nullif(r.reviewer_name,''),'Cliente'),r.rating,r.comment,r.source,r.reply_text,r.created_at
  from public.reviews r join public.businesses b on b.id=r.business_id
  where b.slug=p_slug and r.status='published'
  order by r.created_at desc limit least(greatest(coalesce(p_limit,12),1),50)
$$;
revoke all on function public.public_business_reviews(text,integer) from public;
grant execute on function public.public_business_reviews(text,integer) to anon,authenticated;

commit;
notify pgrst, 'reload schema';



-- ============================================================
-- BLOQUE: SNAPSHOT SUPER ADMIN
-- FUENTE: sql/platform_dashboard_rpc.sql
-- ============================================================

create or replace function public.platform_dashboard_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  payments_json jsonb := '[]'::jsonb;
  incidents_json jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.platform_admins pa where pa.id=auth.uid()) then raise exception 'forbidden'; end if;

  if to_regclass('public.platform_subscription_payments') is not null then
    execute 'select coalesce(jsonb_agg(jsonb_build_object(''business_id'',p.business_id,''amount'',p.amount,''status'',p.status,''paid_at'',p.paid_at,''created_at'',p.created_at)),''[]''::jsonb) from public.platform_subscription_payments p' into payments_json;
  end if;
  if to_regclass('public.platform_incidents') is not null then
    execute 'select coalesce(jsonb_agg(jsonb_build_object(''id'',i.id,''business_id'',i.business_id,''title'',i.title,''description'',i.description,''severity'',i.severity,''status'',i.status,''created_at'',i.created_at)),''[]''::jsonb) from public.platform_incidents i' into incidents_json;
  end if;

  select jsonb_build_object(
    'businesses', coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'slug',b.slug,'email',b.email,'phone',b.phone,'whatsapp',b.whatsapp,'business_category_id',b.business_category_id,'created_at',b.created_at) order by b.created_at desc) from public.businesses b),'[]'::jsonb),
    'subs', coalesce((select jsonb_agg(jsonb_build_object('business_id',s.business_id,'status',s.status,'plan_id',s.plan_id,'price_monthly',s.price_monthly,'trial_end',s.trial_end,'current_period_end',s.current_period_end,'updated_at',s.updated_at)) from public.subscriptions s),'[]'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'price_monthly',p.price_monthly,'active',p.active,'sort_order',p.sort_order,'features',p.features) order by p.sort_order) from public.saas_plans p),'[]'::jsonb),
    'appointments', coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'business_id',a.business_id,'appointment_date',a.appointment_date,'status',a.status,'created_at',a.created_at)) from public.appointments a),'[]'::jsonb),
    'customers', coalesce((select jsonb_agg(jsonb_build_object('business_id',c.business_id,'id',c.id,'lifetime_value',c.lifetime_value,'segment',c.segment,'last_visit',c.last_visit)) from public.customer_crm c),'[]'::jsonb),
    'integrations', coalesce((select jsonb_agg(jsonb_build_object('business_id',i.business_id,'kind',i.kind,'provider',i.provider,'enabled',i.enabled,'status',i.status,'updated_at',i.updated_at)) from public.business_integrations i),'[]'::jsonb),
    'payments', payments_json,
    'incidents', incidents_json
  ) into result;
  return result;
end;
$$;
revoke all on function public.platform_dashboard_snapshot() from public;
grant execute on function public.platform_dashboard_snapshot() to authenticated;



-- ============================================================
-- BLOQUE: SUPER ADMIN + MEDIA GENERICA
-- FUENTE: SUPABASE_PLATFORM_MASTER.sql
-- ============================================================

-- MyCitaGo Platform Master — consolidación segura e idempotente.
-- Basado en diagnóstico real: conserva tablas/RPC existentes y completa mutaciones faltantes.

-- Activos genéricos de plataforma y Storage. No enlaza negocios en vivo.
create table if not exists public.platform_default_assets(
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('logo','banner','service')),
 asset_key text not null, category text, image_url text not null, active boolean not null default true,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id), unique(kind,asset_key)
);
alter table public.platform_default_assets enable row level security;
drop policy if exists platform_default_assets_read on public.platform_default_assets;
create policy platform_default_assets_read on public.platform_default_assets for select to anon,authenticated using(active=true or public.is_platform_admin());
drop policy if exists platform_default_assets_admin_write on public.platform_default_assets;
create policy platform_default_assets_admin_write on public.platform_default_assets for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('platform-default-media','platform-default-media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists platform_default_media_public_read on storage.objects;
create policy platform_default_media_public_read on storage.objects for select to public using(bucket_id='platform-default-media');
drop policy if exists platform_default_media_admin_insert on storage.objects;
create policy platform_default_media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='platform-default-media' and public.is_platform_admin());
drop policy if exists platform_default_media_admin_update on storage.objects;
create policy platform_default_media_admin_update on storage.objects for update to authenticated using(bucket_id='platform-default-media' and public.is_platform_admin()) with check(bucket_id='platform-default-media' and public.is_platform_admin());
drop policy if exists platform_default_media_admin_delete on storage.objects;
create policy platform_default_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='platform-default-media' and public.is_platform_admin());

create or replace function public.suspend_business(p_business_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_platform_admin() then raise exception 'forbidden'; end if;
 if not exists(select 1 from public.businesses where id=p_business_id) then raise exception 'business_not_found'; end if;
 update public.subscriptions set status='canceled',updated_at=now() where business_id=p_business_id;
 insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata)
 values(auth.uid(),p_business_id,'business_suspended','business',p_business_id,jsonb_build_object('source','super_admin'));
end $$;
revoke all on function public.suspend_business(uuid) from public;
grant execute on function public.suspend_business(uuid) to authenticated;

create or replace function public.reactivate_business(p_business_id uuid,p_days integer default 30)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_days integer:=greatest(1,least(coalesce(p_days,30),365)); v_end date:=current_date+greatest(1,least(coalesce(p_days,30),365));
begin
 if auth.uid() is null or not public.is_platform_admin() then raise exception 'forbidden'; end if;
 if not exists(select 1 from public.businesses where id=p_business_id) then raise exception 'business_not_found'; end if;
 update public.subscriptions set status='active',current_period_end=v_end,updated_at=now() where business_id=p_business_id;
 if not found then raise exception 'subscription_not_found'; end if;
 insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata)
 values(auth.uid(),p_business_id,'business_reactivated','business',p_business_id,jsonb_build_object('days',v_days,'period_end',v_end,'source','super_admin'));
end $$;
revoke all on function public.reactivate_business(uuid,integer) from public;
grant execute on function public.reactivate_business(uuid,integer) to authenticated;

-- Firma real consumida por admin-platform.js. Reemplaza de forma compatible para añadir auditoría.
create or replace function public.approve_business_category_change(p_request_id uuid,p_approve boolean,p_note text default null)
returns public.business_category_change_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.business_category_change_requests;
begin
 if auth.uid() is null or not public.is_platform_admin() then raise exception 'forbidden'; end if;
 select * into r from public.business_category_change_requests where id=p_request_id for update;
 if r.id is null then raise exception 'request_not_found'; end if;
 if r.status<>'pending' then raise exception 'request_already_reviewed'; end if;
 if p_approve then
  update public.businesses set business_category_id=r.requested_category_id,business_category_locked=true where id=r.business_id;
  update public.business_category_change_requests set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),reason=coalesce(reason,'')||case when nullif(trim(p_note),'') is null then '' else E'\nAdmin: '||trim(p_note) end where id=r.id returning * into r;
 else
  update public.business_category_change_requests set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),reason=coalesce(reason,'')||case when nullif(trim(p_note),'') is null then '' else E'\nAdmin: '||trim(p_note) end where id=r.id returning * into r;
 end if;
 insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata)
 values(auth.uid(),r.business_id,case when p_approve then 'category_change_approved' else 'category_change_rejected' end,'business_category_change_request',r.id,jsonb_build_object('requested_category_id',r.requested_category_id,'note',p_note));
 return r;
end $$;
revoke all on function public.approve_business_category_change(uuid,boolean,text) from public;
grant execute on function public.approve_business_category_change(uuid,boolean,text) to authenticated;

-- Verificación final: debe devolver las tres firmas.
select to_regprocedure('public.suspend_business(uuid)') suspend_fn,
       to_regprocedure('public.reactivate_business(uuid,integer)') reactivate_fn,
       to_regprocedure('public.approve_business_category_change(uuid,boolean,text)') approve_category_fn;



-- VERIFICACION FINAL DE RPC SUPER ADMIN
select to_regprocedure('public.platform_dashboard_snapshot()') as snapshot_fn,
       to_regprocedure('public.suspend_business(uuid)') as suspend_fn,
       to_regprocedure('public.reactivate_business(uuid,integer)') as reactivate_fn,
       to_regprocedure('public.approve_business_category_change(uuid,boolean,text)') as approve_category_fn;

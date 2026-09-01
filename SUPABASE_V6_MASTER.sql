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

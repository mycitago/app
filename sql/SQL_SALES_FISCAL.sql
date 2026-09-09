-- MyCitaGo · Control de ventas y datos fiscales
-- Ejecutar una sola vez en Supabase SQL Editor.
-- No timbra CFDI ni valida información ante SAT: almacena control administrativo/fiscal.

create table if not exists public.sale_fiscal_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  appointment_id uuid not null,
  payment_status text not null default 'paid'
    check (payment_status in ('paid','pending','partial','refunded')),
  cfdi_status text not null default 'not_required'
    check (cfdi_status in ('not_required','pending','invoiced','cancelled')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  vat_amount numeric(14,2) not null default 0 check (vat_amount >= 0),
  other_taxes numeric(14,2) not null default 0 check (other_taxes >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  payment_form text,
  payment_method text check (payment_method is null or payment_method in ('PUE','PPD')),
  receiver_rfc text,
  receiver_fiscal_name text,
  receiver_tax_regime text,
  receiver_zip text,
  cfdi_use text,
  cfdi_uuid text,
  stamped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sale_fiscal_records_business_appointment_key unique (business_id, appointment_id)
);

create index if not exists sale_fiscal_records_business_idx
  on public.sale_fiscal_records (business_id);
create index if not exists sale_fiscal_records_appointment_idx
  on public.sale_fiscal_records (appointment_id);

alter table public.sale_fiscal_records enable row level security;

drop policy if exists sale_fiscal_records_select on public.sale_fiscal_records;
create policy sale_fiscal_records_select on public.sale_fiscal_records
for select to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = sale_fiscal_records.business_id
      and bm.user_id = auth.uid()
  )
);

drop policy if exists sale_fiscal_records_insert on public.sale_fiscal_records;
create policy sale_fiscal_records_insert on public.sale_fiscal_records
for insert to authenticated
with check (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = sale_fiscal_records.business_id
      and bm.user_id = auth.uid()
  )
);

drop policy if exists sale_fiscal_records_update on public.sale_fiscal_records;
create policy sale_fiscal_records_update on public.sale_fiscal_records
for update to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = sale_fiscal_records.business_id
      and bm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = sale_fiscal_records.business_id
      and bm.user_id = auth.uid()
  )
);

comment on table public.sale_fiscal_records is
'Control administrativo de cobro y datos asociados a CFDI. No representa timbrado ni validación SAT.';

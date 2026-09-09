/* MyCitaGo · IVA por venta */
alter table public.sale_fiscal_records
  add column if not exists vat_applies boolean not null default true,
  add column if not exists vat_rate numeric(6,4) not null default 0.16;

update public.sale_fiscal_records
set vat_applies = true,
    vat_rate = 0.16
where vat_applies is null or vat_rate is null;

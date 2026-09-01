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

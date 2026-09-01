
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

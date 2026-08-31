
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


create or replace function public.platform_dashboard_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.platform_admins pa where pa.id=auth.uid()) then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'businesses', coalesce((select jsonb_agg(jsonb_build_object(
      'id',b.id,'name',b.name,'slug',b.slug,'email',b.email,'phone',b.phone,'whatsapp',b.whatsapp,'created_at',b.created_at
    ) order by b.created_at desc) from public.businesses b),'[]'::jsonb),
    'subs', coalesce((select jsonb_agg(jsonb_build_object(
      'business_id',s.business_id,'status',s.status,'plan_id',s.plan_id,'price_monthly',s.price_monthly,'trial_end',s.trial_end,'current_period_end',s.current_period_end,'updated_at',s.updated_at
    )) from public.subscriptions s),'[]'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'name',p.name,'price_monthly',p.price_monthly,'active',p.active,'sort_order',p.sort_order,'features',p.features
    ) order by p.sort_order) from public.saas_plans p),'[]'::jsonb),
    'appointments', coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'business_id',a.business_id,'appointment_date',a.appointment_date,'status',a.status,'created_at',a.created_at
    )) from public.appointments a),'[]'::jsonb),
    'customers', coalesce((select jsonb_agg(jsonb_build_object(
      'business_id',c.business_id,'id',c.id,'lifetime_value',c.lifetime_value,'segment',c.segment,'last_visit',c.last_visit
    )) from public.customer_crm c),'[]'::jsonb),
    'integrations', coalesce((select jsonb_agg(jsonb_build_object(
      'business_id',i.business_id,'kind',i.kind,'provider',i.provider,'enabled',i.enabled,'status',i.status,'updated_at',i.updated_at
    )) from public.business_integrations i),'[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object(
      'business_id',p.business_id,'amount',p.amount,'status',p.status,'paid_at',p.paid_at,'created_at',p.created_at
    )) from public.platform_subscription_payments p),'[]'::jsonb),
    'incidents', coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'business_id',i.business_id,'title',i.title,'description',i.description,'severity',i.severity,'status',i.status,'created_at',i.created_at
    )) from public.platform_incidents i),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.platform_dashboard_snapshot() from public;
grant execute on function public.platform_dashboard_snapshot() to authenticated;

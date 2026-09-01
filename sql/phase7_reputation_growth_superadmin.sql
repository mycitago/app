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

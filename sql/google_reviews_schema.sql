
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

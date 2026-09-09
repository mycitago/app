-- ============================================================
-- MyCitaGo · FIX guardar reseña verificada
-- Ejecutar después del fix de "Solicitar reseña".
-- ============================================================

begin;

alter table public.reviews
  add column if not exists appointment_id uuid,
  add column if not exists customer_id uuid,
  add column if not exists reviewer_name text,
  add column if not exists verified boolean not null default false,
  add column if not exists verified_at timestamptz;

create unique index if not exists reviews_internal_appointment_unique
  on public.reviews(appointment_id)
  where source='internal' and appointment_id is not null;

create or replace function public.submit_internal_review(
  p_token text,
  p_rating integer,
  p_comment text default null,
  p_reviewer_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.review_requests;
  a public.appointments;
  v_review_id uuid;
begin
  if p_rating is null or p_rating<1 or p_rating>5 then
    raise exception 'invalid_rating';
  end if;

  if length(trim(coalesce(p_comment,'')))>1200 then
    raise exception 'comment_too_long';
  end if;

  if length(trim(coalesce(p_reviewer_name,'')))>80 then
    raise exception 'reviewer_name_too_long';
  end if;

  select *
  into r
  from public.review_requests
  where token_hash=md5(coalesce(p_token,''))
  for update;

  if r.id is null then
    raise exception 'invalid_token';
  end if;

  if r.status<>'pending' then
    raise exception 'request_already_used';
  end if;

  if r.expires_at is not null and r.expires_at<now() then
    update public.review_requests
       set status='expired'
     where id=r.id;
    raise exception 'request_expired';
  end if;

  select *
  into a
  from public.appointments
  where id=r.appointment_id
    and business_id=r.business_id
  for update;

  if a.id is null then
    raise exception 'appointment_not_found';
  end if;

  if lower(coalesce(a.status,'')) not in
     ('completada','completado','completed','done') then
    raise exception 'appointment_not_completed';
  end if;

  if exists(
    select 1
    from public.reviews x
    where x.appointment_id=a.id
      and x.source='internal'
  ) then
    raise exception 'review_already_submitted';
  end if;

  insert into public.reviews(
    business_id,
    appointment_id,
    customer_id,
    source,
    rating,
    comment,
    reviewer_name,
    status,
    verified,
    verified_at
  )
  values(
    r.business_id,
    r.appointment_id,
    r.customer_id,
    'internal',
    p_rating,
    nullif(trim(p_comment),''),
    coalesce(nullif(trim(p_reviewer_name),''),'Cliente'),
    'published',
    true,
    now()
  )
  returning id into v_review_id;

  update public.review_requests
     set status='completed',
         completed_at=now()
   where id=r.id;

  return jsonb_build_object(
    'ok',true,
    'review_id',v_review_id,
    'verified',true
  );
end
$$;

revoke all on function public.submit_internal_review(text,integer,text,text) from public;
grant execute on function public.submit_internal_review(text,integer,text,text)
to anon,authenticated;

commit;

notify pgrst,'reload schema';

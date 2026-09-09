-- ============================================================
-- MyCitaGo · FIX DEFINITIVO Solicitar reseña SIN dependencia pgcrypto
-- Corrige el error mostrado en Agenda al generar el enlace.
-- ============================================================

begin;

create or replace function public.create_review_request(p_appointment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  a public.appointments;
  r public.review_requests;
  raw_token text;
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;

  select * into a
  from public.appointments
  where id=p_appointment_id;

  if a.id is null then
    raise exception 'appointment_not_found';
  end if;

  if not public.is_member_of(a.business_id)
     and not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  if lower(coalesce(a.status,'')) not in
     ('completada','completado','completed','done') then
    raise exception 'appointment_not_completed';
  end if;

  if exists(
    select 1
    from public.reviews rv
    where rv.appointment_id=a.id
      and rv.source='internal'
  ) then
    raise exception 'review_already_submitted';
  end if;

  raw_token :=
    replace(gen_random_uuid()::text,'-','') ||
    replace(gen_random_uuid()::text,'-','');

  insert into public.review_requests(
    business_id,
    appointment_id,
    customer_id,
    token_hash,
    status,
    expires_at
  )
  values(
    a.business_id,
    a.id,
    a.customer_id,
    md5(raw_token),
    'pending',
    now()+interval '30 days'
  )
  on conflict (appointment_id) do update
    set token_hash=excluded.token_hash,
        status='pending',
        expires_at=excluded.expires_at,
        completed_at=null
  returning * into r;

  return jsonb_build_object(
    'token',raw_token,
    'request_id',r.id,
    'expires_at',r.expires_at
  );
end
$$;

revoke all on function public.create_review_request(uuid) from public;
grant execute on function public.create_review_request(uuid) to authenticated;

create or replace function public.get_review_request_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r public.review_requests;
  a public.appointments;
  b record;
  s record;
begin
  select * into r
  from public.review_requests
  where token_hash=md5(coalesce(p_token,''));

  if r.id is null then
    return jsonb_build_object('valid',false,'reason','invalid_token');
  end if;

  if r.status<>'pending' then
    return jsonb_build_object('valid',false,'reason','already_used');
  end if;

  if r.expires_at is not null and r.expires_at<now() then
    update public.review_requests
    set status='expired'
    where id=r.id;

    return jsonb_build_object('valid',false,'reason','expired');
  end if;

  select * into a
  from public.appointments
  where id=r.appointment_id
    and business_id=r.business_id;

  if a.id is null then
    return jsonb_build_object('valid',false,'reason','appointment_not_found');
  end if;

  if lower(coalesce(a.status,'')) not in
     ('completada','completado','completed','done') then
    return jsonb_build_object('valid',false,'reason','appointment_not_completed');
  end if;

  if exists(
    select 1
    from public.reviews rv
    where rv.appointment_id=a.id
      and rv.source='internal'
  ) then
    return jsonb_build_object('valid',false,'reason','already_reviewed');
  end if;

  select id,name into b
  from public.businesses
  where id=r.business_id;

  select id,name into s
  from public.services
  where id=a.service_id;

  return jsonb_build_object(
    'valid',true,
    'business_name',coalesce(b.name,'Negocio'),
    'service_name',coalesce(s.name,'Servicio'),
    'appointment_date',a.appointment_date,
    'expires_at',r.expires_at
  );
end
$$;

revoke all on function public.get_review_request_public(text) from public;
grant execute on function public.get_review_request_public(text) to anon,authenticated;

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
  rv public.reviews;
begin
  if p_rating<1 or p_rating>5 then
    raise exception 'invalid_rating';
  end if;

  if length(trim(coalesce(p_comment,'')))>1200 then
    raise exception 'comment_too_long';
  end if;

  if length(trim(coalesce(p_reviewer_name,'')))>80 then
    raise exception 'reviewer_name_too_long';
  end if;

  select * into r
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

  select * into a
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
  returning * into rv;

  update public.review_requests
  set status='completed',
      completed_at=now()
  where id=r.id;

  return jsonb_build_object(
    'ok',true,
    'review_id',rv.id,
    'verified',true
  );
end
$$;

revoke all on function public.submit_internal_review(text,integer,text,text) from public;
grant execute on function public.submit_internal_review(text,integer,text,text)
to anon,authenticated;

commit;

notify pgrst,'reload schema';

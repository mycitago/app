-- MyCitaGo Platform Master — consolidación segura e idempotente.
-- Basado en diagnóstico real: conserva tablas/RPC existentes y completa mutaciones faltantes.

-- Activos genéricos de plataforma y Storage. No enlaza negocios en vivo.
create table if not exists public.platform_default_assets(
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('logo','banner','service')),
 asset_key text not null, category text, image_url text not null, active boolean not null default true,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id), unique(kind,asset_key)
);
alter table public.platform_default_assets enable row level security;
drop policy if exists platform_default_assets_read on public.platform_default_assets;
create policy platform_default_assets_read on public.platform_default_assets for select to anon,authenticated using(active=true or public.is_platform_admin());
drop policy if exists platform_default_assets_admin_write on public.platform_default_assets;
create policy platform_default_assets_admin_write on public.platform_default_assets for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('platform-default-media','platform-default-media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists platform_default_media_public_read on storage.objects;
create policy platform_default_media_public_read on storage.objects for select to public using(bucket_id='platform-default-media');
drop policy if exists platform_default_media_admin_insert on storage.objects;
create policy platform_default_media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='platform-default-media' and public.is_platform_admin());
drop policy if exists platform_default_media_admin_update on storage.objects;
create policy platform_default_media_admin_update on storage.objects for update to authenticated using(bucket_id='platform-default-media' and public.is_platform_admin()) with check(bucket_id='platform-default-media' and public.is_platform_admin());
drop policy if exists platform_default_media_admin_delete on storage.objects;
create policy platform_default_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='platform-default-media' and public.is_platform_admin());

create or replace function public.suspend_business(p_business_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_platform_admin() then raise exception 'forbidden'; end if;
 if not exists(select 1 from public.businesses where id=p_business_id) then raise exception 'business_not_found'; end if;
 update public.subscriptions set status='canceled',updated_at=now() where business_id=p_business_id;
 insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata)
 values(auth.uid(),p_business_id,'business_suspended','business',p_business_id,jsonb_build_object('source','super_admin'));
end $$;
revoke all on function public.suspend_business(uuid) from public;
grant execute on function public.suspend_business(uuid) to authenticated;

create or replace function public.reactivate_business(p_business_id uuid,p_days integer default 30)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_days integer:=greatest(1,least(coalesce(p_days,30),365)); v_end date:=current_date+greatest(1,least(coalesce(p_days,30),365));
begin
 if auth.uid() is null or not public.is_platform_admin() then raise exception 'forbidden'; end if;
 if not exists(select 1 from public.businesses where id=p_business_id) then raise exception 'business_not_found'; end if;
 update public.subscriptions set status='active',current_period_end=v_end,updated_at=now() where business_id=p_business_id;
 if not found then raise exception 'subscription_not_found'; end if;
 insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata)
 values(auth.uid(),p_business_id,'business_reactivated','business',p_business_id,jsonb_build_object('days',v_days,'period_end',v_end,'source','super_admin'));
end $$;
revoke all on function public.reactivate_business(uuid,integer) from public;
grant execute on function public.reactivate_business(uuid,integer) to authenticated;

-- Firma real consumida por admin-platform.js. Reemplaza de forma compatible para añadir auditoría.
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
 insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata)
 values(auth.uid(),r.business_id,case when p_approve then 'category_change_approved' else 'category_change_rejected' end,'business_category_change_request',r.id,jsonb_build_object('requested_category_id',r.requested_category_id,'note',p_note));
 return r;
end $$;
revoke all on function public.approve_business_category_change(uuid,boolean,text) from public;
grant execute on function public.approve_business_category_change(uuid,boolean,text) to authenticated;

-- Verificación final: debe devolver las tres firmas.
select to_regprocedure('public.suspend_business(uuid)') suspend_fn,
       to_regprocedure('public.reactivate_business(uuid,integer)') reactivate_fn,
       to_regprocedure('public.approve_business_category_change(uuid,boolean,text)') approve_category_fn;

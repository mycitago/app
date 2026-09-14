create or replace function public.get_business_service_templates(
  p_business_id uuid
)
returns table (
  id uuid, business_category_id text, name text, category text,
  description text, duration_minutes integer, suggested_price numeric,
  image_url text, tags jsonb, sort_order integer, active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_category text;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode='42501'; end if;
  if not (public.is_member_of(p_business_id) or public.is_platform_admin()) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  select b.business_category_id into v_category from public.businesses b where b.id=p_business_id;
  if v_category is null then return; end if;
  return query
  select st.id,st.business_category_id,st.name,st.category,st.description,
         st.duration_minutes,st.suggested_price,st.image_url,st.tags,st.sort_order,st.active
  from public.service_templates st
  where st.business_category_id=v_category and st.active=true
  order by st.sort_order,st.name;
end;
$$;
revoke all on function public.get_business_service_templates(uuid) from public;
revoke all on function public.get_business_service_templates(uuid) from anon;
grant execute on function public.get_business_service_templates(uuid) to authenticated;

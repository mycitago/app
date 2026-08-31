
-- CITAGO: validar bucket público para imágenes de negocio.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-public-media','business-public-media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
 public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- IMPORTANTE:
-- Las políticas INSERT/UPDATE/DELETE deben validar que la primera carpeta
-- del objeto coincida con business_members.business_id del usuario autenticado.
-- No conviertas business-media (privado) en público.

(function(){
  const BUCKET='business-public-media';
  const ALLOWED=new Set(['image/jpeg','image/png','image/webp']);
  const MAX=5*1024*1024;

  function safePart(v){
    return String(v||'media').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9_-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'media';
  }
  function ext(file){return ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type]||'jpg'}

  async function uploadPublicImage(file,{businessId,kind='media'}={}){
    if(!file) return {url:null,path:null};
    if(!businessId) throw new Error('No se pudo identificar el negocio.');
    if(!ALLOWED.has(file.type)) throw new Error('Usa una imagen JPG, PNG o WEBP.');
    if(file.size>MAX) throw new Error('La imagen supera el máximo de 5 MB.');

    const uid=(crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const path=`${safePart(businessId)}/${safePart(kind)}/${uid}.${ext(file)}`;
    const {data,error}=await supabaseClient.storage.from(BUCKET).upload(path,file,{
      upsert:false,contentType:file.type,cacheControl:'3600'
    });
    if(error) throw new Error('Storage: '+error.message);

    const stored=data?.path||path;
    const {data:publicData}=supabaseClient.storage.from(BUCKET).getPublicUrl(stored);
    const url=publicData?.publicUrl;
    if(!url || !/^https:\/\//i.test(url)){
      try{await supabaseClient.storage.from(BUCKET).remove([stored])}catch(_){}
      throw new Error('No se generó una URL pública válida.');
    }
    return {url,path:stored};
  }

  async function adoptPublicImage(sourceUrl,{businessId,kind='media'}={}){if(!sourceUrl)return {url:null,path:null};if(!businessId)throw new Error('No se pudo identificar el negocio.');const response=await fetch(sourceUrl,{cache:'no-store'});if(!response.ok)throw new Error('No se pudo copiar la imagen de ejemplo.');const blob=await response.blob();const type=ALLOWED.has(blob.type)?blob.type:'image/jpeg';const file=new File([blob],`example.${ext({type})}`,{type});return uploadPublicImage(file,{businessId,kind})}
  window.CitagoMedia={BUCKET,MAX,uploadPublicImage,adoptPublicImage};
})();
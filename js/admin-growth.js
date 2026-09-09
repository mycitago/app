const G=id=>document.getElementById(id);let biz,shareImageUrl='';
function tagged(src){return `${location.origin}${location.pathname.split('/admin/')[0]}/reservar.html?n=${encodeURIComponent(biz.slug)}&src=${encodeURIComponent(src)}`}
async function loadShareImage(){
  const {data,error}=await supabaseClient.from('business_branding_public').select('cover_url,logo_url').eq('business_id',biz.id).maybeSingle();
  if(error)console.warn('[growth branding]',error);
  shareImageUrl=data?.cover_url||data?.logo_url||biz.cover_image_url||biz.logo_url||'';
  const img=G('growth-share-image');
  if(shareImageUrl){img.src=shareImageUrl;img.hidden=false}else{img.hidden=true;G('growth-share-preview').classList.add('no-image')}
  G('growth-share-business').textContent=biz.name||'Tu negocio';
}
async function imageBlob(){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#17151f';ctx.fillRect(0,0,canvas.width,canvas.height);
  if(shareImageUrl){
    const img=new Image();img.crossOrigin='anonymous';
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=shareImageUrl});
    const scale=Math.max(canvas.width/img.width,canvas.height/img.height),w=img.width*scale,h=img.height*scale;
    ctx.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
  }
  const grad=ctx.createLinearGradient(0,250,0,630);grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(1,'rgba(0,0,0,.78)');ctx.fillStyle=grad;ctx.fillRect(0,0,1200,630);
  ctx.fillStyle='#fff';ctx.font='700 58px Arial';ctx.fillText(biz.name||'Reserva tu cita',64,515);ctx.font='32px Arial';ctx.fillText('Reserva tu cita en línea con MyCitaGo',64,570);
  return await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
}
async function buildShareFile(){
  const blob=await imageBlob();return new File([blob],`reserva-${biz.slug||'negocio'}.jpg`,{type:'image/jpeg'});
}
async function shareNative(){
  const file=await buildShareFile(),url=tagged('share'),text=`Reserva tu cita con ${biz.name}: ${url}`;
  if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:`Reserva con ${biz.name}`,text,files:[file]});return}
  await navigator.clipboard.writeText(text);downloadImage(file);alert('Tu navegador no permite adjuntar la imagen automáticamente. Descargamos la imagen y copiamos el enlace.');
}
function downloadImage(file){const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
async function init(){
  const s=await requireAuth();if(!s)return;biz=await getMyBusiness(s.user);if(!biz)return;
  const base=tagged('direct');G('growth-url').value=base;
  const text=`Reserva tu cita con ${biz.name} en MyCitaGo: ${base}`;G('growth-copytext').value=text;
  G('growth-whatsapp').href=`https://wa.me/?text=${encodeURIComponent(`Reserva con ${biz.name}: ${tagged('whatsapp')}`)}`;
  G('growth-facebook').href=`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tagged('facebook'))}`;
  G('growth-email').href=`mailto:?subject=${encodeURIComponent(`Reserva con ${biz.name}`)}&body=${encodeURIComponent(`Agenda aquí: ${tagged('email')}`)}`;
  G('growth-copy').onclick=()=>navigator.clipboard.writeText(base);
  G('growth-instagram').onclick=async()=>{await navigator.clipboard.writeText(`Reserva con ${biz.name}: ${tagged('instagram')}`);alert('Texto y enlace copiados. Pégalos en Instagram.')};
  await loadShareImage();
  G('growth-share-native').onclick=()=>shareNative().catch(e=>{console.error(e);alert('No se pudo abrir el menú para compartir. Usa Descargar imagen.')});
  G('growth-download-image').onclick=async()=>downloadImage(await buildShareFile());
  const {data}=await supabaseClient.from('appointments').select('booking_source').eq('business_id',biz.id).not('booking_source','is',null);
  const rows=data||[];G('growth-bookings').textContent=rows.length;const counts={};rows.forEach(r=>counts[r.booking_source]=(counts[r.booking_source]||0)+1);G('growth-top-source').textContent=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
}
document.addEventListener('DOMContentLoaded',init);

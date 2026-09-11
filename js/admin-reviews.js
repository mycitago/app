let reviewBiz,reviewRows=[];
const GOOGLE_REVIEWS_CONFIGURED=window.MYCITAGO_GOOGLE_REVIEWS_ENABLED===true;
const R=id=>document.getElementById(id);
const safe=v=>String(v??'').replace(/[<>]/g,'');
function functionError(error,name){const raw=String(error?.message||error||''),code=String(error?.name||error?.constructor?.name||'');if(/FunctionsFetchError|Failed to send a request|fetch failed|NetworkError/i.test(code+' '+raw))return `No se pudo contactar la función ${name}.`;return raw||'No se pudo completar la operación con Google.'}
async function syncReviews(){if(!GOOGLE_REVIEWS_CONFIGURED)return msg('Integración de Google no configurada.');const {data,error}=await supabaseClient.functions.invoke('google-reviews-sync',{body:{business_id:reviewBiz.id}});if(error)return msg(functionError(error,'google-reviews-sync'));await loadReviews();return data}
async function connectGoogle(){if(!GOOGLE_REVIEWS_CONFIGURED)return msg('Integración de Google no configurada.');const {data,error}=await supabaseClient.functions.invoke('google-oauth-start',{body:{business_id:reviewBiz.id}});if(error)return msg(functionError(error,'google-oauth-start'));if(data?.authorization_url)location.href=data.authorization_url}
function msg(m){const t=R('toast');if(!t)return;t.textContent=m;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2600)}
function sourceLabel(x){return x.source==='google'?'Google':x.verified?'MyCitaGo · Cliente verificado':'MyCitaGo'}
function normalizeInternal(x){return {...x,star_rating:x.rating,reply_comment:x.reply_text,review_id:x.id,source:x.source||'internal',create_time:x.external_created_at||x.created_at}}
function renderReviews(){
  const f=R('review-filter')?.value||'';
  let list=reviewRows;
  if(f==='hidden')list=list.filter(x=>x.status==='hidden');
  else{
    list=list.filter(x=>x.status==='published');
    if(f==='verified')list=list.filter(x=>x.source==='internal'&&x.verified);
    else if(f==='google')list=list.filter(x=>x.source==='google');
    else if(f==='internal')list=list.filter(x=>x.source==='internal');
    else if(f==='unanswered')list=list.filter(x=>!x.reply_comment);
    else if(f==='low')list=list.filter(x=>Number(x.star_rating)<=3);
    else if(f)list=list.filter(x=>String(x.star_rating)===f);
  }
  const host=R('reviews-list');host.replaceChildren();
  if(!list.length){host.innerHTML='<div class="ct-empty reviews-empty"><strong>No hay reseñas con este filtro</strong><span>Las reseñas verificadas de MyCitaGo aparecerán aquí.</span></div>';return}
  list.forEach(x=>{
    const a=document.createElement('article');a.className='review-card';
    const verified=x.source==='internal'&&x.verified?'<span class="verified-review-badge">✓ Cliente verificado</span>':'';
    const hidden=x.status==='hidden'?'<span class="verified-review-badge">Oculta</span>':'';
    a.innerHTML=`<div class="review-head"><div><strong>${safe(x.reviewer_name||'Cliente')}</strong><span class="source-label">${safe(sourceLabel(x))}</span>${verified}${hidden}</div><span class="review-stars">${'★'.repeat(Number(x.star_rating||0))}${'☆'.repeat(Math.max(0,5-Number(x.star_rating||0)))}</span></div>${x.comment?`<p>${safe(x.comment)}</p>`:''}${x.reply_comment?`<div class="review-reply">Tu respuesta: ${safe(x.reply_comment)}</div>`:''}<div class="review-actions"></div>`;
    const actions=a.querySelector('.review-actions');
    const replyBtn=document.createElement('button');replyBtn.className='ct-btn ct-btn-secondary';replyBtn.type='button';replyBtn.textContent=x.reply_comment?'Editar respuesta':'Responder';replyBtn.onclick=()=>reply(x);actions.appendChild(replyBtn);
    if(x.source!=='google'){
      const visibility=document.createElement('button');visibility.className='ct-btn ct-btn-secondary';visibility.type='button';visibility.textContent=x.status==='hidden'?'Publicar':'Ocultar';visibility.onclick=()=>moderate(x,x.status==='hidden'?'publish':'hide');actions.appendChild(visibility);
      const del=document.createElement('button');del.className='ct-btn ct-btn-secondary';del.type='button';del.textContent='Eliminar';del.onclick=()=>moderate(x,'delete');actions.appendChild(del);
    }
    host.appendChild(a);
  });
}
async function moderate(x,action){
  const label={hide:'ocultar',publish:'publicar',delete:'eliminar'}[action]||action;
  if(!confirm(`¿Seguro que deseas ${label} esta reseña?`))return;
  const {error}=await supabaseClient.rpc('moderate_internal_review',{p_review_id:x.review_id,p_action:action});
  if(error)return msg('No se pudo actualizar la reseña: '+error.message);
  await loadReviews();msg('Reseña actualizada');
}
async function reply(x){
  const text=prompt('Respuesta pública:',x.reply_comment||'');if(text===null)return;
  if(x.source==='google'){
    if(!GOOGLE_REVIEWS_CONFIGURED)return msg('Integración de Google no configurada.');
    const {error}=await supabaseClient.functions.invoke('google-review-reply',{body:{business_id:reviewBiz.id,review_id:x.review_id,comment:text.trim()}});
    if(error)return msg('No se pudo responder en Google.');
  }else{
    const {error}=await supabaseClient.rpc('reply_internal_review',{p_review_id:x.review_id,p_reply:text.trim()||null});
    if(error)return msg('No se pudo guardar la respuesta.');
  }
  await loadReviews();msg('Respuesta guardada');
}
async function loadReviews(){
  const {data,error}=await supabaseClient.from('reviews')
    .select('id,appointment_id,verified,source,status,rating,comment,reviewer_name,reply_text,external_review_id,external_created_at,created_at')
    .eq('business_id',reviewBiz.id).neq('status','deleted').order('created_at',{ascending:false});
  if(error){console.error(error);reviewRows=[]}else reviewRows=(data||[]).map(normalizeInternal);
  const published=reviewRows.filter(x=>x.status==='published'),total=published.length;
  R('review-total').textContent=total;
  R('review-rating').textContent=total?(published.reduce((a,x)=>a+Number(x.star_rating||0),0)/total).toFixed(1)+' ★':'–';
  const verifiedCount=published.filter(x=>x.source==='internal'&&x.verified).length;
  if(R('verified-total'))R('verified-total').textContent=verifiedCount;
  renderReviews();
}
function setupGoogle(){
  const connect=R('google-connect'),sync=R('google-sync'),save=R('google-location-save');
  if(!GOOGLE_REVIEWS_CONFIGURED){
    [connect,sync,save].forEach(x=>{if(x)x.disabled=true});
    R('google-status').textContent='Integración no configurada';
    R('google-status-help').textContent='Las reseñas verificadas de MyCitaGo siguen funcionando sin Google.';
    R('google-config-alert')?.classList.remove('hidden');
    if(R('google-config-message'))R('google-config-message').textContent='Google Business Profile se habilitará cuando el entorno tenga aprobación y funciones desplegadas.';
    return;
  }
  if(connect)connect.onclick=connectGoogle;if(sync)sync.onclick=syncReviews;
}
async function init(){
  const s=await requireAuth();if(!s)return;
  reviewBiz=await getMyBusiness(s.user);if(!reviewBiz)return;
  R('review-filter').onchange=renderReviews;
  setupGoogle();
  await loadReviews();
}
document.addEventListener('DOMContentLoaded',init);
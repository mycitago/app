
(function(){
  'use strict';
  const $=id=>document.getElementById(id);

  function escapeText(value){ return String(value??''); }

  async function loadPublicReviewsVerified(businessId){
    const host=$('public-reviews'),section=$('public-reviews-section'),ratingNode=$('public-rating');
    if(!host||!section||!businessId)return;

    const {data,error}=await supabaseClient.rpc('public_business_reviews_verified',{
      p_business_id:businessId,
      p_limit:6
    });
    if(error||!data?.length){
      section.hidden=true;
      return;
    }

    host.replaceChildren();
    data.forEach(r=>{
      const card=document.createElement('article');
      card.className='public-review-card';

      const top=document.createElement('div');
      top.className='public-review-top';

      const who=document.createElement('strong');
      who.textContent=escapeText(r.reviewer_name||'Cliente');

      const badge=document.createElement('span');
      badge.className='public-review-source';
      if(r.source==='internal'&&r.verified){
        badge.classList.add('verified');
        badge.textContent='✓ Cliente verificado';
      }else{
        badge.textContent='Google';
      }

      const stars=document.createElement('span');
      stars.className='public-review-stars';
      stars.textContent='★'.repeat(Number(r.rating||0))+'☆'.repeat(Math.max(0,5-Number(r.rating||0)));

      top.append(who,badge);
      card.append(top,stars);

      if(r.comment){
        const p=document.createElement('p');
        p.textContent=escapeText(r.comment);
        card.appendChild(p);
      }
      if(r.reply_text){
        const reply=document.createElement('div');
        reply.className='public-review-reply';
        reply.textContent=`Respuesta del negocio: ${escapeText(r.reply_text)}`;
        card.appendChild(reply);
      }
      host.appendChild(card);
    });

    const avg=data.reduce((sum,r)=>sum+Number(r.rating||0),0)/data.length;
    ratingNode.textContent=`${avg.toFixed(1)} ★ · ${data.length} ${data.length===1?'reseña':'reseñas'}`;
    section.hidden=false;
  }

  // app.js llama a loadPublicReviews(businessId). Sustituimos su implementación
  // sin modificar el resto del flujo de reservas.
  window.loadPublicReviews=loadPublicReviewsVerified;
})();

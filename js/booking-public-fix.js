(function(){
  'use strict';

  const $=id=>document.getElementById(id);

  function slugFromUrl(){
    return new URLSearchParams(location.search).get('n')||'';
  }

  function safe(v){ return String(v??''); }

  function moveReviewsBeforeServices(){
    const section=$('public-reviews-section');
    const stepServices=$('step-services');
    if(section&&stepServices&&section.parentNode===stepServices.parentNode){
      section.parentNode.insertBefore(section, stepServices);
    }
  }

  function reviewCard(r){
    const card=document.createElement('article');
    card.className='public-review-card';

    const top=document.createElement('div');
    top.className='public-review-top';

    const who=document.createElement('strong');
    who.textContent=safe(r.reviewer_name||'Cliente');

    const badge=document.createElement('span');
    badge.className='public-review-source';

    if(r.source==='internal' && r.verified){
      badge.classList.add('verified');
      badge.textContent='✓ Cliente verificado';
    }else if(r.source==='google'){
      badge.classList.add('google');
      badge.textContent='Google';
    }else{
      badge.textContent='MyCitaGo';
    }

    const stars=document.createElement('div');
    stars.className='public-review-stars';
    const rating=Math.max(0,Math.min(5,Number(r.rating||r.star_rating||0)));
    stars.textContent='★'.repeat(rating)+'☆'.repeat(5-rating);

    top.append(who,badge);
    card.append(top,stars);

    if(r.comment){
      const p=document.createElement('p');
      p.textContent=safe(r.comment);
      card.appendChild(p);
    }

    if(r.reply_text){
      const reply=document.createElement('div');
      reply.className='public-review-reply';
      reply.textContent=`Respuesta del negocio: ${safe(r.reply_text)}`;
      card.appendChild(reply);
    }

    return card;
  }

  async function fetchReviews(){
    const businessId=window.state?.business?.id || (typeof state!=='undefined' ? state?.business?.id : null);
    let rows=[];

    if(businessId){
      const verified=await supabaseClient.rpc('public_business_reviews_verified',{
        p_business_id:businessId,
        p_limit:6
      });

      if(!verified.error && Array.isArray(verified.data)){
        rows=verified.data;
      }
    }

    if(!rows.length){
      const slug=slugFromUrl();
      if(slug){
        const fallback=await supabaseClient.rpc('public_business_reviews',{
          p_slug:slug,
          p_limit:6
        });

        if(!fallback.error && Array.isArray(fallback.data)){
          rows=fallback.data;
        }
      }
    }

    return rows;
  }

  async function renderVerifiedReviews(){
    const section=$('public-reviews-section');
    const host=$('public-reviews');
    const ratingNode=$('public-rating');

    if(!section||!host)return;

    moveReviewsBeforeServices();

    const rows=await fetchReviews();
    if(!rows.length){
      section.hidden=true;
      return;
    }

    host.replaceChildren();
    rows.forEach(r=>host.appendChild(reviewCard(r)));

    const avg=rows.reduce((s,r)=>s+Number(r.rating||r.star_rating||0),0)/rows.length;
    if(ratingNode){
      ratingNode.textContent=`${avg.toFixed(1)} ★ · ${rows.length} ${rows.length===1?'reseña':'reseñas'}`;
    }

    section.hidden=false;
  }

  document.addEventListener('DOMContentLoaded',()=>{
    moveReviewsBeforeServices();
    setTimeout(renderVerifiedReviews,250);
  });

  window.MyCitaGoPublicReviews={refresh:renderVerifiedReviews};
})();
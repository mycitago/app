
const q=id=>document.getElementById(id);
let token='',rating=0,context=null;

function showError(message){
  q('review-error').textContent=message;
  q('review-error').classList.remove('hidden');
  q('review-form').classList.add('hidden');
}
function paint(){
  document.querySelectorAll('[data-rating]').forEach(b=>{
    const active=Number(b.dataset.rating)<=rating;
    b.classList.toggle('active',active);
    b.setAttribute('aria-pressed',active?'true':'false');
  });
  q('rating-help').textContent=rating?`${rating} de 5 estrellas`:'Selecciona de 1 a 5 estrellas.';
}
function dateLabel(value){
  if(!value)return'';
  const [y,m,d]=String(value).slice(0,10).split('-').map(Number);
  return new Date(y,m-1,d,12).toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
}
async function init(){
  token=new URLSearchParams(location.search).get('t')||'';
  if(!token)return showError('Este enlace de reseña no es válido.');

  const {data,error}=await supabaseClient.rpc('get_review_request_public',{p_token:token});
  if(error||!data?.valid){
    const reason=data?.reason;
    const message=reason==='already_used'||reason==='already_reviewed'
      ?'Esta cita ya tiene una reseña.'
      :reason==='appointment_not_completed'
        ?'La cita todavía no está marcada como completada.'
        :'Este enlace ya fue utilizado, venció o no es válido.';
    return showError(message);
  }

  context=data;
  q('review-business').textContent=`Tu experiencia en ${data.business_name}`;
  q('review-appointment').textContent=[data.service_name,dateLabel(data.appointment_date)].filter(Boolean).join(' · ');
  q('review-form').classList.remove('hidden');

  document.querySelectorAll('[data-rating]').forEach(b=>{
    b.setAttribute('aria-pressed','false');
    b.onclick=()=>{rating=Number(b.dataset.rating);paint();};
  });
  q('review-comment').addEventListener('input',()=>q('review-count').textContent=q('review-comment').value.length);
  q('review-form').onsubmit=submit;
}
async function submit(e){
  e.preventDefault();
  q('review-error').classList.add('hidden');
  if(!rating)return showError('Selecciona de 1 a 5 estrellas.');

  const btn=q('review-submit');
  btn.disabled=true;
  btn.textContent='Publicando…';

  const {data,error}=await supabaseClient.rpc('submit_internal_review',{
    p_token:token,
    p_rating:rating,
    p_comment:q('review-comment').value.trim()||null,
    p_reviewer_name:q('review-name').value.trim()||null
  });

  if(error||!data?.ok){
    btn.disabled=false;
    btn.textContent='Publicar mi reseña';
    return showError('No se pudo guardar la reseña. El enlace puede haber sido utilizado o la cita ya no es elegible.');
  }

  q('review-form').classList.add('hidden');
  q('review-error').classList.add('hidden');
  q('review-success').classList.remove('hidden');
}
document.addEventListener('DOMContentLoaded',init);

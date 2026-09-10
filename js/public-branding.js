async function loadPublishedBranding(businessId){const {data,error}=await supabaseClient.from('business_branding_public').select('business_id,primary_color,secondary_color,background_color,text_color,font_family,button_style,card_style,logo_url,cover_url,hero_title,hero_subtitle,section_order,section_visibility,published_config,published_at').eq('business_id',businessId).maybeSingle();if(error){console.warn('[branding]',error);return null}return data}
function safeColor(v,f){return /^#[0-9a-f]{6}$/i.test(String(v||''))?v:f}
function applyPublishedBranding(b){
  if(!b)return;
  const cfg=b.published_config||{};
  const value=(key,fallback)=>cfg[key]??b[key]??fallback;
  const theme_mode=value('theme_mode','light');
  document.body.dataset.publicTheme=theme_mode;
  const light={primary:'#7c3aed',secondary:'#a855f7',bg:'#ffffff',text:'#191724'};
  const dark={primary:'#8b5cf6',secondary:'#c084fc',bg:'#0e0b17',text:'#ffffff'};
  const p=theme_mode==='dark'?dark:light;
  const r=document.documentElement;
  r.style.setProperty('--color-primary',safeColor(value('primary_color'),p.primary));
  r.style.setProperty('--color-primary-dark',safeColor(value('secondary_color'),p.secondary));
  r.style.setProperty('--booking-accent',safeColor(value('primary_color'),p.primary));
  r.style.setProperty('--page-bg',safeColor(value('background_color'),p.bg));
  r.style.setProperty('--page-text',safeColor(value('text_color'),p.text));
  document.body.style.background='var(--page-bg)';
  document.body.style.color='var(--page-text)';
  document.body.style.fontFamily=['Manrope','Inter','Georgia','Arial'].includes(value('font_family'))?value('font_family'):'Manrope';
  document.body.dataset.buttonStyle=value('button_style','rounded');
  document.body.dataset.cardStyle=value('card_style','soft');
  document.body.dataset.scheduleStyle=value('schedule_style','modern');
  document.body.dataset.bookingDensity=value('booking_density','comfortable');

  const heroTitle=value('hero_title');
  if(heroTitle&&document.getElementById('hero-name'))document.getElementById('hero-name').textContent=heroTitle;
  const sub=document.getElementById('brand-hero-subtitle');
  const heroSubtitle=value('hero_subtitle');
  if(sub){sub.textContent=heroSubtitle||'';sub.hidden=!heroSubtitle;}

  const cover=value('cover_url');
  const hero=document.getElementById('hero');
  if(hero&&cover){
    hero.style.setProperty('--booking-cover',`url("${cover}")`);
    hero.classList.add('has-cover');
    hero.style.removeProperty('background-image');
  }
  const logo=value('logo_url');
  if(logo){
    const i=document.getElementById('hero-logo');
    if(i){i.src=logo;i.classList.remove('hidden');}
  }
}
function renderPublicSections(b){if(!b)return;const visibility=b.section_visibility||{};document.querySelectorAll('[data-brand-section]').forEach(el=>{el.hidden=visibility[el.dataset.brandSection]===false})}
window.loadPublishedBranding=loadPublishedBranding;window.applyPublishedBranding=applyPublishedBranding;window.renderPublicSections=renderPublicSections;
async function loadPublicBusinessReviews(slug){if(!slug)return;const {data,error}=await supabaseClient.rpc('public_business_reviews',{p_slug:slug,p_limit:12});if(error){console.warn('[public reviews]',error);return}const rows=data||[],section=document.getElementById('public-reviews-section'),host=document.getElementById('public-reviews'),rating=document.getElementById('public-rating');if(!section||!host)return;if(!rows.length){section.hidden=true;return}section.hidden=false;const avg=rows.reduce((a,r)=>a+Number(r.rating||0),0)/rows.length;if(rating)rating.textContent=`${avg.toFixed(1)} ★ · ${rows.length} reseña${rows.length===1?'':'s'}`;host.innerHTML=rows.map(r=>`<article class="public-review-card"><div><strong>${String(r.reviewer_name||'Cliente').replace(/[<>]/g,'')}</strong><span>${r.source==='google'?'Google':'MyCitaGo'}</span></div><b>${'★'.repeat(Number(r.rating||0))}${'☆'.repeat(Math.max(0,5-Number(r.rating||0)))}</b>${r.comment?`<p>${String(r.comment).replace(/[<>]/g,'')}</p>`:''}${r.reply_text?`<small>Respuesta del negocio: ${String(r.reply_text).replace(/[<>]/g,'')}</small>`:''}</article>`).join('')}
window.loadPublicBusinessReviews=loadPublicBusinessReviews;

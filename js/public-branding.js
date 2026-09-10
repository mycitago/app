async function loadPublishedBranding(businessId){
const{data,error}=await supabaseClient.from('business_branding_public').select('business_id,primary_color,secondary_color,background_color,text_color,font_family,button_style,card_style,logo_url,cover_url,hero_title,hero_subtitle,section_order,section_visibility,published_config,published_at').eq('business_id',businessId).maybeSingle();
if(error){console.warn('[branding]',error);return null}return data}
function isHex(v){return /^#[0-9a-f]{6}$/i.test(String(v||''))}
function safeColor(v,f){return isHex(v)?String(v):f}
function hexToRgb(hex){const h=safeColor(hex,'#000000').slice(1);return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16))}
function rgbToHex(rgb){return'#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
function mixHex(a,b,w){const x=hexToRgb(a),y=hexToRgb(b),q=Math.max(0,Math.min(1,Number(w)));return rgbToHex(x.map((v,i)=>v+(y[i]-v)*q))}
function relativeLuminance(hex){const c=hexToRgb(hex).map(v=>{const x=v/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function contrastRatio(a,b){const x=relativeLuminance(a),y=relativeLuminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function bestTextColor(bg){const light='#ffffff',dark='#000000';return contrastRatio(bg,light)>=contrastRatio(bg,dark)?light:dark}
function deriveThemeTokens(config={}){
const mode=config.theme_mode||'light';
const defaults=mode==='dark'?{page:'#0e0b17',brand:'#8b5cf6'}:{page:'#f7f7fb',brand:'#7c3aed'};
const pageBg=safeColor(config.background_color,defaults.page),brand=safeColor(config.primary_color,defaults.brand);
const text=bestTextColor(pageBg),darkPage=relativeLuminance(pageBg)<.32;
const surface=darkPage?mixHex(pageBg,'#ffffff',.075):mixHex(pageBg,'#ffffff',.72);
const surfaceSoft=darkPage?mixHex(pageBg,'#ffffff',.12):mixHex(pageBg,'#000000',.035);
const textMuted=mixHex(text,pageBg,darkPage?.38:.46);
const border=darkPage?mixHex(pageBg,'#ffffff',.18):mixHex(pageBg,'#000000',.105);
const brandContrast=bestTextColor(brand);
const heroBase=mixHex(brand,'#000000',.72),heroText=bestTextColor(heroBase);
return{pageBg,surface,surfaceSoft,text,textMuted,border,brand,
brandSoft:darkPage?mixHex(brand,pageBg,.72):mixHex(brand,'#ffffff',.88),
brandContrast,heroBase,heroText,heroMuted:mixHex(heroText,heroBase,.22),
heroOverlayStrong:`rgba(${hexToRgb(heroBase).join(',')},.82)`,
heroOverlaySoft:`rgba(${hexToRgb(heroBase).join(',')},.34)`,
shadow:darkPage?'0 18px 55px rgba(0,0,0,.28)':'0 18px 55px rgba(31,24,43,.10)',
shadowSoft:darkPage?'0 8px 28px rgba(0,0,0,.20)':'0 8px 28px rgba(31,24,43,.07)'}}
function applyTokens(t){const r=document.documentElement;const m={'--page-bg':t.pageBg,'--surface':t.surface,'--surface-soft':t.surfaceSoft,'--text':t.text,'--text-muted':t.textMuted,'--border':t.border,'--brand':t.brand,'--brand-soft':t.brandSoft,'--brand-contrast':t.brandContrast,'--hero-text':t.heroText,'--hero-muted':t.heroMuted,'--hero-overlay-strong':t.heroOverlayStrong,'--hero-overlay-soft':t.heroOverlaySoft,'--shadow':t.shadow,'--shadow-soft':t.shadowSoft};Object.entries(m).forEach(([k,v])=>r.style.setProperty(k,v))}
function applyPublishedBranding(row){if(!row)return;const cfg=row.published_config||{},v=(k,f)=>cfg[k]??row[k]??f,merged={...row,...cfg};applyTokens(deriveThemeTokens(merged));document.body.dataset.publicTheme=v('theme_mode','light');document.body.dataset.buttonStyle=v('button_style','rounded');document.body.dataset.cardStyle=v('card_style','soft');document.body.dataset.scheduleStyle=v('schedule_style','modern');document.body.dataset.bookingDensity=v('booking_density','comfortable');document.body.style.fontFamily=['Manrope','Inter','Georgia','Arial'].includes(v('font_family'))?v('font_family'):'Manrope';const title=v('hero_title');if(title&&document.getElementById('hero-name'))document.getElementById('hero-name').textContent=title;const sub=document.getElementById('brand-hero-subtitle'),st=v('hero_subtitle');if(sub){sub.textContent=st||'';sub.hidden=!st}const hero=document.getElementById('hero'),cover=v('cover_url');if(hero&&cover){hero.style.setProperty('--booking-cover',`url("${cover}")`);hero.classList.add('has-cover')}const logo=v('logo_url');if(logo){const i=document.getElementById('hero-logo');if(i){i.src=logo;i.classList.remove('hidden')}}}
function renderPublicSections(row){if(!row)return;const vis=(row.published_config||{}).section_visibility||row.section_visibility||{};document.querySelectorAll('[data-brand-section]').forEach(n=>n.hidden=vis[n.dataset.brandSection]===false)}
window.loadPublishedBranding=loadPublishedBranding;window.applyPublishedBranding=applyPublishedBranding;window.renderPublicSections=renderPublicSections;window.deriveThemeTokens=deriveThemeTokens;window.brandContrastRatio=contrastRatio;window.bestTextColor=bestTextColor;
window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(!new URLSearchParams(location.search).has('preview'))return;if(e.data?.type!=='MYCITAGO_PREVIEW_THEME')return;applyPublishedBranding(e.data.config||{});renderPublicSections({published_config:e.data.config||{}})});
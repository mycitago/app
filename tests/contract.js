
const fs=require('fs');
const path=require('path');
const root=process.argv[2];
const jsPath=path.join(root,'js','booking-public-fix.js');
const cssPath=path.join(root,'css','booking-public-fix.css');
const htmlPath=path.join(root,'reservar.html');
const js=fs.existsSync(jsPath)?fs.readFileSync(jsPath,'utf8'):'';
const css=fs.existsSync(cssPath)?fs.readFileSync(cssPath,'utf8'):'';
const html=fs.existsSync(htmlPath)?fs.readFileSync(htmlPath,'utf8'):'';
let bad=false;
function ok(c,m){if(!c){console.error('FAIL:',m);bad=true}}
ok(js.includes('public_business_reviews_verified'),'falta carga de reseñas verificadas');
ok(js.includes('public_business_reviews'),'falta fallback de reseñas públicas');
ok(js.includes('insertBefore(section, stepServices)'),'reseñas no se colocan antes de servicios');
ok(js.includes("section.hidden=false"),'sección de reseñas no se muestra');
ok(css.includes('.adaptive-hero-inner'),'falta compactar hero');
ok(css.includes('min-height:120px!important'),'hero sigue demasiado alto');
ok(css.includes('.public-reviews-section'),'falta estilo visible de reseñas');
ok(html.includes('booking-public-fix.css?v=20260909-publicfix1'),'reservar no carga css nuevo');
ok(html.includes('booking-public-fix.js?v=20260909-publicfix1'),'reservar no carga js nuevo');
process.exit(bad?1:0);

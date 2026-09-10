
const fs=require('fs'),p=require('path');
const f=p.join(process.argv[2],'css','booking-public-fix.css');
const c=fs.existsSync(f)?fs.readFileSync(f,'utf8'):'';
let bad=false;const ok=(x,m)=>{if(!x){console.error('FAIL',m);bad=true}};
ok(c.includes('#hero.adaptive-hero'),'falta selector fuerte');
ok(c.includes('max-height:260px!important'),'falta max desktop');
ok(c.includes('height:clamp(190px,22vw,260px)!important'),'falta altura desktop');
ok(c.includes('height:180px!important'),'falta mobile');
ok(c.includes('overflow:hidden!important'),'falta recorte');
ok(c.includes('.public-reviews-section'),'se perdieron estilos reseñas');
process.exit(bad?1:0);


const fs=require('fs'),p=require('path'),root=process.argv[2];
const H=fs.existsSync(p.join(root,'admin','crecimiento.html'))?fs.readFileSync(p.join(root,'admin','crecimiento.html'),'utf8'):'';
const J=fs.existsSync(p.join(root,'js','admin-growth.js'))?fs.readFileSync(p.join(root,'js','admin-growth.js'),'utf8'):'';
const C=fs.existsSync(p.join(root,'css','growth.css'))?fs.readFileSync(p.join(root,'css','growth.css'),'utf8'):'';
let bad=false;function ok(x,m){if(!x){console.error('FAIL:',m);bad=true}}
ok(H.includes('growth-share-preview'),'falta vista previa');
ok(H.includes('growth-share-native'),'falta botón compartir imagen');
ok(J.includes("from('business_branding_public')"),'no reutiliza branding publicado');
ok(J.includes('cover_url'),'no usa portada');
ok(J.includes('logo_url'),'no tiene fallback a logo');
ok(J.includes('navigator.share'),'no comparte archivo por Web Share');
ok(J.includes('navigator.canShare'),'no valida soporte de archivos');
ok(J.includes('canvas.toBlob'),'no genera tarjeta de imagen');
ok(C.includes('.growth-share-card'),'falta diseño de tarjeta');
process.exit(bad?1:0);

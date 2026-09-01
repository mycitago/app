import fs from 'node:fs';
const h=fs.readFileSync('admin/mi-pagina.html','utf8'), j=fs.readFileSync('js/admin-branding.js','utf8'), p=fs.readFileSync('js/public-branding.js','utf8');
for(const v of ['light','dark','custom']) if(!h.includes(`data-public-theme="${v}"`)) throw new Error(`missing public theme ${v}`);
for(const id of ['brand-share-copy','brand-share-whatsapp','brand-share-email','brand-share-open','brand-share-qr']) if(!h.includes(`id="${id}"`)) throw new Error(`missing ${id}`);
if(h.includes('Imágenes precargadas MyCitaGo')) throw new Error('preset gallery still visible');
if(!j.includes("from('services')")) throw new Error('designer does not load real services');
if(!j.includes('theme_mode')) throw new Error('theme mode missing from draft');
if(!p.includes('theme_mode')) throw new Error('public theme mode not applied');
console.log('public page designer contract OK');

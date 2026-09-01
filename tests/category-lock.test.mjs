import fs from 'node:fs';
const h=fs.readFileSync('admin/configuracion.html','utf8'), j=fs.readFileSync('js/admin-settings.js','utf8'), o=fs.readFileSync('js/admin-onboarding.js','utf8');
if(!h.includes('business-category-locked')||!h.includes('request-category-change')) throw new Error('locked category UI missing');
if(!j.includes('business_category_change_requests')) throw new Error('category request flow missing');
if(!o.includes('confirm-category')) throw new Error('onboarding confirmation missing');
console.log('category lock contract OK');

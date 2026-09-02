import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');

test('platform uses control tower typography and semantic palette',()=>{
 const h=read('admin/plataforma.html'), c=read('css/admin-platform.css');
 assert.match(h,/Space\+Grotesk/); assert.match(h,/IBM\+Plex\+Mono/); assert.match(h,/Inter/);
 for(const hex of ['#0F1417','#171E22','#28333A','#E7EEEC','#8FA0A3','#3DDC97','#F5B841','#EF5D5D','#5AA9E6']) assert.match(c,new RegExp(hex,'i'));
});

test('platform shell exposes all nine operational destinations',()=>{
 const h=read('admin/plataforma.html');
 for(const id of ['resumen','negocios','suscripciones','soporte','plantillas','pagos','incidencias','integraciones','auditoria']) assert.match(h,new RegExp(`href="#${id}"`));
});

test('platform removes decorative hero gradient and large card radii',()=>{
 const c=read('css/admin-platform.css');
 assert.match(c,/body\.creator-body/);
 assert.match(c,/border-radius:6px/);
 assert.match(c,/font-family:var\(--platform-mono\)/);
 assert.match(c,/background:#0F1417/i);
});

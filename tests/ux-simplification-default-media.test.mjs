import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');

test('tenant shell groups navigation and removes duplicate Finanzas entry',()=>{
  const s=read('js/citago-shell.js');
  assert.match(s,/Operación diaria/);
  assert.match(s,/Mi negocio/);
  assert.match(s,/Administración/);
  assert.doesNotMatch(s,/\['finanzas','Finanzas'/);
});

test('service templates expose suggested prices and batch workflow',()=>{
  const s=read('js/admin-services.js');
  assert.match(s,/suggestedPrice/);
  assert.match(s,/Agregar seleccionados/);
  assert.match(s,/Ajustar precios por lote/);
});

test('dashboard removes decorative mini charts and simplifies health strip',()=>{
  const h=read('admin/index.html');
  assert.doesNotMatch(h,/class="mini-chart"/);
  assert.doesNotMatch(h,/health-actions/);
  assert.match(h,/SIGUIENTE PASO/);
});

test('platform default media schema is isolated and super-admin protected',()=>{
  const sql=read('sql/platform_default_media.sql');
  assert.match(sql,/platform_default_assets/);
  assert.match(sql,/platform-default-media/);
  assert.match(sql,/is_platform_admin\(\)/);
  assert.match(sql,/business-public-media/);
});

test('media manager can adopt a platform image into business media',()=>{
  const s=read('js/media-manager.js');
  assert.match(s,/adoptPublicImage/);
  assert.match(s,/business-public-media/);
});

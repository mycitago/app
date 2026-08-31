import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('admin/configuracion.html','utf8');
assert.ok(html.includes('../js/media-manager.js'),'configuracion must load media-manager.js');
assert.ok(html.indexOf('media-manager.js') < html.indexOf('admin-settings.js'),'media manager must load before admin-settings');
for(const token of ['settings-page','settings-section','settings-grid','settings-media-card','settings-savebar']){
  assert.ok(html.includes(token),`missing professional settings token ${token}`);
}
const css=fs.readFileSync('css/admin-settings.css','utf8');
for(const token of ['.settings-page','.settings-section','.settings-grid','.settings-media-card','.settings-savebar']){
  assert.ok(css.includes(token),`missing ${token}`);
}
const branding=fs.readFileSync('admin/mi-pagina.html','utf8');
assert.ok(branding.includes('brand-upload-card'),'branding must use visual upload cards');
console.log('settings premium contract OK');

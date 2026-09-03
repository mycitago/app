import assert from 'node:assert/strict';
import fs from 'node:fs';
const h=fs.readFileSync('admin/plataforma.html','utf8');
const j=fs.readFileSync('js/admin-platform.js','utf8');
const c=fs.readFileSync('css/admin-platform.css','utf8');
for(const id of ['business-search','business-filter','business-sort','business-select-visible','business-bulk-bar','bulk-suspend','bulk-reactivate']){
  assert.ok(h.includes(`id="${id}"`),`missing business control ${id}`);
}
assert.match(j,/selectedBusinesses\s*:\s*new Set\(/,'selection state missing');
assert.ok(j.includes('sortBusinesses('),'business sorting helper missing');
assert.ok(j.includes('business-created'),'created-at sort missing');
assert.ok(j.includes('business-expiry'),'expiry sort missing');
assert.ok(j.includes('PlatformAPI.bulkSuspend'),'bulk suspend adapter not used');
assert.ok(j.includes('PlatformAPI.bulkReactivate'),'bulk reactivate adapter not used');
assert.ok(j.includes('data-business-select'),'row checkbox contract missing');
assert.ok(j.includes('business-select-visible'),'visible selection contract missing');
assert.match(c,/platform-bulk-bar/,'bulk action styles missing');
console.log('platform business operations contract OK');

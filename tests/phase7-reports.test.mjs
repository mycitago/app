import assert from 'node:assert/strict';
import fs from 'node:fs';
const h=fs.readFileSync('admin/contabilidad.html','utf8');
const j=fs.readFileSync('js/admin-accounting.js','utf8');
for(const id of ['kpi-new-reviews','kpi-review-rating','kpi-shared-bookings']) assert.ok(h.includes(`id="${id}"`),`missing ${id}`);
assert.ok(j.includes("from('reviews')"),'reports must load reviews');
assert.ok(j.includes('booking_source'),'reports must measure shared bookings');
console.log('phase7 reports contract OK');

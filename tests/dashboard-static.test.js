
const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync('../js/admin-dashboard-pro.js','utf8');
assert.ok(src.includes('loadBusinessDashboardSnapshot'));
assert.ok(src.includes('renderDashboardLoadError'));
assert.ok(!src.includes('Promise.all([fetchAppointments(),fetchServices(),fetchCustomers()])'));
console.log('PASS dashboard static regression');

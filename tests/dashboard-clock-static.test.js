
const fs=require('fs'),assert=require('assert');
const dash=fs.readFileSync('../js/admin-dashboard-pro.js','utf8');
const html=fs.readFileSync('../admin/index.html','utf8');
assert.ok(dash.includes('DashboardDataLoader.loadBusinessDashboardSnapshot'));
assert.ok(dash.includes('startBusinessClock'));
assert.ok(dash.includes('refreshPunctualityUi'));
assert.ok(dash.includes('Configura') || html.includes('Configura la zona horaria'));
assert.ok(html.includes('business-live-clock'));
assert.ok(html.includes('agenda-punctuality-summary'));
assert.ok(!dash.includes('Promise.all([fetchAppointments(),fetchServices(),fetchCustomers()])'));
console.log('PASS dashboard clock static');


const fs=require('fs'), assert=require('assert');
const js=fs.readFileSync('../js/citago-shell.js','utf8');
const css=fs.readFileSync('../css/citago-admin.css','utf8');

assert.ok(js.includes('id="ct-user-role"'), 'tenant role needs a target element');
assert.ok(js.includes('memberRole'), 'role must come from existing business context');
assert.ok(js.includes("OWNER:'Dueño'"), 'OWNER mapping');
assert.ok(js.includes("MANAGER:'Gerente'"), 'MANAGER mapping');
assert.ok(js.includes("RECEPTIONIST:'Recepción'"), 'RECEPTIONIST mapping');
assert.ok(js.includes("PROFESSIONAL:'Profesional'"), 'PROFESSIONAL mapping');
assert.ok(js.includes("aria-haspopup=\"menu\""), 'user trigger must expose menu semantics');
assert.ok(js.includes("aria-expanded=\"false\""), 'user trigger must expose closed state initially');
assert.ok(js.includes("e.key==='Escape'"), 'Escape must close user menu');
assert.ok(js.includes("setAttribute('aria-expanded'"), 'aria-expanded must be synchronized');
assert.ok(js.includes("isPlatform?'MyCitaGo Platform':'Cargando rol…'"), 'platform subtitle remains MyCitaGo Platform');
assert.ok(/\.ct-search\{[^}]*font-size:13px/.test(css), 'search font must be 13px');
assert.ok(/\.ct-user strong\{[^}]*font-size:13px/.test(css), 'user name must be 13px');
assert.ok(/\.ct-user small\{[^}]*font-size:11px/.test(css), 'user role must be 11px');
console.log('PASS ct topbar');

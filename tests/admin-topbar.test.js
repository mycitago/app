
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('../admin/index.html','utf8');
const js = fs.readFileSync('../js/admin-dashboard-pro.js','utf8');
const css = fs.existsSync('../css/admin-topbar.css')
  ? fs.readFileSync('../css/admin-topbar.css','utf8')
  : '';

assert.ok(html.includes('id="user-role"'), 'Debe existir user-role');
assert.ok(html.includes('aria-haspopup="menu"'), 'El botón de usuario debe declarar menú');
assert.ok(html.includes('aria-expanded="false"'), 'El botón de usuario debe iniciar cerrado');
assert.ok(html.includes('id="user-menu"'), 'Debe existir el dropdown real');
assert.ok(html.includes('configuracion.html'), 'Debe incluir Configuración');
assert.ok(!html.includes('<small>Administrador</small>'), 'No debe repetir Administrador');

assert.ok(js.includes('memberRole'), 'Debe usar business.memberRole ya disponible');
assert.ok(js.includes('ROLE_LABELS'), 'Debe mapear roles reales');
assert.ok(js.includes("Escape"), 'Debe cerrar con Escape');
assert.ok(js.includes("aria-expanded"), 'Debe mantener aria-expanded');
assert.ok(js.includes("document.addEventListener('click'"), 'Debe cerrar al hacer click fuera');

assert.ok(/dash-search-wrap input[\s\S]*font-size:\s*14px/.test(css), 'Buscador a 14px');
assert.ok(/dash-user-name[\s\S]*font-size:\s*13px/.test(css), 'Nombre a 13px');
assert.ok(/dash-user-role[\s\S]*font-size:\s*(11|12)px/.test(css), 'Rol legible');
assert.ok(/btn-new[\s\S]*font-size:\s*13px/.test(css), 'Nueva cita a 13px');
assert.ok(!css.includes('.dash-user:hover'), 'Dropdown no debe depender de hover');

console.log('PASS admin topbar');

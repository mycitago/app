
const fs=require('fs'),assert=require('assert');
const shell=fs.readFileSync('../js/citago-shell.js','utf8');
const shellV3=fs.readFileSync('../js/citago-shell-v3.js','utf8');
const dashV3=fs.readFileSync('../js/dashboard-v3.js','utf8');
const css=fs.readFileSync('../css/citago-v3.css','utf8');

assert.ok(shell.includes('loadV3Assets(activePage,isPlatform)'), 'shell must load V3 assets');
assert.ok(shell.includes("d.src='../js/dashboard-v3.js'"), 'Inicio must load dashboard V3');
assert.ok(shell.includes("link.href='../css/citago-v3.css'"), 'shell must load V3 css');

assert.ok(shellV3.includes("THEME_KEY='mycitago:tenant-theme'"));
assert.ok(shellV3.includes("SIDEBAR_KEY='mycitago:sidebar-collapsed'"));
assert.ok(shellV3.includes('ct-theme-switcher'));
assert.ok(shellV3.includes('ct-sidebar-toggle'));
assert.ok(shellV3.includes('rebuildDesktopNav'));
assert.ok(shellV3.includes("matchMedia?.('(prefers-color-scheme: dark)')"));

assert.ok(dashV3.includes('ensureLateKpi'));
assert.ok(dashV3.includes('Requiere tu atención'));
assert.ok(dashV3.includes('renderAttention'));
assert.ok(dashV3.includes('dashboardTimezone'));
assert.ok(dashV3.includes('punctualityFor'));

assert.ok(css.includes('[data-ct-theme="dark"]'));
assert.ok(css.includes('.ct-app.sidebar-collapsed .ct-sidebar'));
assert.ok(css.includes('.dashboard-v3 .dash-kpis'));
assert.ok(css.includes('.v3-attention-card'));
assert.ok(css.includes('grid-template-columns:repeat(4'));

console.log('PASS MyCitaGo Dashboard V3 package');

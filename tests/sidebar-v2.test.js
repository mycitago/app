
const fs=require('fs'),assert=require('assert');
const js=fs.readFileSync('../fixtures/citago-shell.js','utf8');
const css=fs.readFileSync('../fixtures/citago-admin.css','utf8');

assert.ok(js.includes('NAV_ICON_MAP'), 'Debe existir mapa Lucide para sidebar desktop');
assert.ok(js.includes('mobile=false'), 'nav debe distinguir desktop/mobile');
assert.ok(js.includes('ct-nav-icon'), 'desktop debe usar contenedor de icono estable');
assert.ok(js.includes('nav(items,activePage,false)'), 'sidebar desktop debe usar modo desktop');
assert.ok(js.includes('activePage,true'), 'mobile debe conservar su rama propia');

assert.ok(css.includes('@media(min-width:901px)'), 'los cambios visuales deben limitarse a desktop');
assert.ok(/\.ct-nav a\{[^}]*min-height:44px/.test(css), 'cada fila desktop debe medir 44px');
assert.ok(/\.ct-nav a\{[^}]*font-size:13px/.test(css), 'texto sidebar desktop a 13px');
assert.ok(/\.ct-nav-group\{[^}]*margin:18px 12px 8px/.test(css), 'grupos con ritmo uniforme');
assert.ok(css.includes('.ct-nav a:focus-visible'), 'debe existir foco visible');
assert.ok(css.includes('.ct-nav-icon'), 'iconos deben tener caja fija');
console.log('PASS Sidebar V2');

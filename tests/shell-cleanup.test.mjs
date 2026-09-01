import fs from 'node:fs';
const shell=fs.readFileSync('js/citago-shell.js','utf8'), auth=fs.readFileSync('js/admin-auth.js','utf8'), actions=fs.readFileSync('js/admin-actions.js','utf8');
if(!shell.includes('ct-share-email')||!shell.includes('ct-share-open')||!shell.includes('ct-share-qr')) throw new Error('share channels incomplete');
if(!shell.includes('ct-platform-theme')||!shell.includes('mycitago:platform-theme')) throw new Error('platform theme missing');
if(!auth.includes("function injectMobileBusinessNav(){\n  if(document.getElementById('citago-shell')) return;")) throw new Error('legacy mobile nav not disabled under shell');
if(!actions.includes('renderShareQr')) throw new Error('QR share not wired');
console.log('shell cleanup contract OK');

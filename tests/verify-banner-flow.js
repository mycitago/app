
const fs=require('fs');
const app=fs.readFileSync(process.argv[2],'utf8');
const html=fs.readFileSync(process.argv[3],'utf8');
const checks=[
 ['syncFlowChrome exists', app.includes('function syncFlowChrome(stepEl)')],
 ['hero hidden outside services', app.includes("hero.hidden=!onServices")],
 ['goToStep synchronizes hero', app.includes('syncFlowChrome(stepEl);')],
 ['initial state synchronized', app.includes("syncFlowChrome($('step-services'));")],
 ['hidden hero forced off', html.includes('#hero[hidden]{display:none!important}')],
 ['new app cache version', html.includes('js/app.js?v=20260909-banner-fix1')]
];
let fail=false;
for(const [name,ok] of checks){console.log((ok?'PASS ':'FAIL ')+name); if(!ok)fail=true;}
process.exit(fail?1:0);

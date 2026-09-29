// MyCitaGo — controlador único de apariencia
(function(global){
  const STORAGE_KEY='mycitago:tenant-theme', LEGACY_KEY='mycitago-ui-theme';
  const allowed=['light','dark','system'];
  function preference(){let p=null;try{p=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(LEGACY_KEY)}catch{}return allowed.includes(p)?p:'system'}
  function resolve(p){return p==='light'||p==='dark'?p:(global.matchMedia?.('(prefers-color-scheme: dark)')?.matches?'dark':'light')}
  function apply(pref=preference()){const selected=allowed.includes(pref)?pref:'system',resolved=resolve(selected),root=document.documentElement;root.dataset.theme=resolved;root.dataset.ctTheme=resolved;root.style.colorScheme=resolved;try{localStorage.setItem(STORAGE_KEY,selected);localStorage.removeItem(LEGACY_KEY)}catch{};document.querySelectorAll('.ct-theme-option').forEach(b=>{const a=b.dataset.theme===selected;b.classList.toggle('active',a);b.setAttribute('aria-pressed',a?'true':'false')});return resolved}
  function set(p){return apply(p)} function current(){return preference()} function toggle(){return apply(resolve(preference())==='dark'?'light':'dark')}
  apply(); global.MyCitaGoTheme={STORAGE_KEY,apply,current,set,toggle,bind:()=>apply()};
})(window);

// MyCitaGo admin/marketing theme controller — light mode is the single supported UI theme.
(function(global){
  const STORAGE_KEY='mycitago-ui-theme';
  function apply(){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';try{localStorage.setItem(STORAGE_KEY,'light')}catch{}return'light'}
  function current(){return'light'}
  function toggle(){return apply()}
  function bind(){apply()}
  apply();
  global.MyCitaGoTheme={STORAGE_KEY,apply,current,toggle,bind};
})(window);

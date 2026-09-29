/* MYCitaGo V2 — Fase 2 / Bloque 4: accesibilidad y viewport de diálogos.
   Cargar DESPUÉS de admin-actions.js. No altera creación ni persistencia. */
(function(){
  let previousFocus=null;
  function openDialogs(){return [...document.querySelectorAll('.ct-dialog.open')]}
  function setup(dialog){
    if(dialog.dataset.block4Ready) return;
    dialog.dataset.block4Ready='1';
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-hidden',dialog.classList.contains('open')?'false':'true');

    const observer=new MutationObserver(()=>{
      const isOpen=dialog.classList.contains('open');
      dialog.setAttribute('aria-hidden',isOpen?'false':'true');
      if(isOpen){
        previousFocus=document.activeElement;
        requestAnimationFrame(()=>{
          const first=dialog.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),a[href]');
          first?.focus({preventScroll:true});
        });
      }else if(previousFocus && document.contains(previousFocus)){
        previousFocus.focus?.({preventScroll:true});
      }
    });
    observer.observe(dialog,{attributes:true,attributeFilter:['class']});

    dialog.querySelector('.ct-dialog-backdrop')?.addEventListener('click',()=>{
      const close=dialog.querySelector('[data-ct-close]');
      close?.click();
    });
  }

  function keepFocusedFieldVisible(){
    if(!openDialogs().length) return;
    const el=document.activeElement;
    if(el && el.closest('.ct-dialog-panel') && /INPUT|SELECT|TEXTAREA/.test(el.tagName)){
      setTimeout(()=>el.scrollIntoView({block:'center',behavior:'smooth'}),120);
    }
  }

  function init(){
    document.querySelectorAll('.ct-dialog').forEach(setup);
    if(global.visualViewport && !global.__ctBlock4Viewport){
      visualViewport.addEventListener('resize',keepFocusedFieldVisible);
      global.__ctBlock4Viewport=true;
    }
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
  setTimeout(init,700);
})();

/* Device-local appearance preference, independent of workspace backups. */
(function () {
  'use strict';
  const KEY='daylight.theme.v1', root=document.documentElement;
  const valid=value=>['system','light','dark'].includes(value);
  let preference='system';
  try {const saved=localStorage.getItem(KEY);if(valid(saved))preference=saved;} catch {}
  function apply(){root.setAttribute('data-theme',preference);}
  window.DaylightTheme={
    get:()=>preference,
    set(value){
      if(!valid(value))return false;
      try {localStorage.setItem(KEY,value);} catch {return false;}
      preference=value;apply();return true;
    }
  };
  window.addEventListener('storage',event=>{
    if(event.key===KEY||event.key===null){preference=valid(event.newValue)?event.newValue:'system';apply();}
  });
  apply();
})();

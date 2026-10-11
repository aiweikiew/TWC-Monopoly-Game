"use strict";

(function(){
  function init(){
    if(document.documentElement.dataset.digitalV19Compat === "true") return true;
    if(typeof gameState === "undefined") return false;
    document.documentElement.dataset.digitalV19Compat = "true";

    // The legacy Digital revaluation repair is useful before teams act, but it must not
    // overwrite the new post-transformation boom values once v19 has applied growth.
    if(typeof repairLegacyDigitalRevaluation === "function"){
      const previousRepair = repairLegacyDigitalRevaluation;
      repairLegacyDigitalRevaluation = function(...args){
        if(gameState.events?.digitalBoomV19) return false;
        return previousRepair.apply(this,args);
      };
    }
    return true;
  }

  if(!init()){
    let attempts=0;
    const timer=window.setInterval(()=>{ attempts+=1; if(init() || attempts>200) window.clearInterval(timer); },50);
  }
})();

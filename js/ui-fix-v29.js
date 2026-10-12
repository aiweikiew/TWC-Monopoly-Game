"use strict";

// v29: surgical UI cleanup for the classroom build.
(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/ui-fix-v29.css"]')) return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="css/ui-fix-v29.css";
    document.head.appendChild(link);
  }

  function removeDuplicatePressureRows(){
    document.querySelectorAll(".future-response-card").forEach(card=>{
      const primary=card.querySelector(".pressure-projection");
      if(!primary) return;

      const duplicates=new Set();
      card.querySelectorAll("div,section,aside,p,span").forEach(node=>{
        if(node===primary || node.closest(".pressure-projection")) return;
        const text=(node.textContent||"").trim().replace(/\s+/g," ").toUpperCase();
        if(!text.startsWith("DESTINATION PRESSURE")) return;

        let block=node;
        while(block.parentElement && block.parentElement!==card) block=block.parentElement;
        if(block!==primary && block.parentElement===card) duplicates.add(block);
      });
      duplicates.forEach(node=>node.remove());
    });
  }

  function cleanNarrativeRevaluation(){
    document.querySelectorAll(".industrial-summary-screen > .narrative-cause-link").forEach(flow=>{
      flow.setAttribute("aria-label","Technology changes traveller behaviour, which changes business value");
    });
  }

  function applyFixes(){
    removeDuplicatePressureRows();
    cleanNarrativeRevaluation();
  }

  function init(){
    if(document.documentElement.dataset.uiFixV29==="true") return true;
    const target=document.getElementById("phaseContent");
    if(!target) return false;
    document.documentElement.dataset.uiFixV29="true";
    loadStyles();

    const observer=new MutationObserver(()=>applyFixes());
    observer.observe(target,{childList:true,subtree:true});
    applyFixes();
    return true;
  }

  if(!init()){
    let attempts=0;
    const timer=window.setInterval(()=>{
      attempts+=1;
      if(init()||attempts>200) window.clearInterval(timer);
    },50);
  }
})();

"use strict";

// v15 now acts only as the deterministic second-stage loader for Digital/Future.
// strategy-layout-v14 loads this file after the shared strategy UI is ready.
(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.digitalTurnLoaderV25 === "true") return;
  document.documentElement.dataset.digitalTurnLoaderV25 = "true";

  const queue = [
    // Load the Future rules/UI first so v19 sees it already present and does not inject it itself.
    "js/future-crisis-v18.js",
    "js/digital-freeform-v19.js",
    "js/digital-v19-compat.js",
    "js/digital-builder-polish-v20.js",
    "js/future-streamline-v22.js",
    "js/winner-podium-v22.js",
    "js/presentation-type-v23.js",
    "js/late-flow-polish-v24.js"
  ];

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[src="${src}"]`);
      if(existing){
        // If it is already in the document, let the current task finish before continuing.
        window.setTimeout(resolve,0);
        return;
      }
      const script=document.createElement("script");
      script.src=src;
      script.async=false;
      script.addEventListener("load",resolve,{once:true});
      script.addEventListener("error",()=>reject(new Error(`Failed to load ${src}`)),{once:true});
      document.head.appendChild(script);
    });
  }

  (async()=>{
    for(const src of queue){
      try { await loadScript(src); }
      catch(error){ console.error("Tourismopoly Digital/Future loader:",error); break; }
    }
    document.documentElement.dataset.digitalFutureReadyV25="true";
    if(typeof renderGame === "function") renderGame();
  })();
})();

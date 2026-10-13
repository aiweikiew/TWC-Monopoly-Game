"use strict";

(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.extensionsBootstrapV26 === "true") return;
  document.documentElement.dataset.extensionsBootstrapV26 = "true";

  const orderedExtensions = [
    "js/game-brand-v26.js",
    "js/board-review-v3.js",
    "js/chance-sum-v5.js",
    "js/debt-settlement-v4.js",
    "js/shock-polish-v6.js",
    "js/go-passive-v8.js",
    "js/industrial-summary-v10.js",
    "js/revaluation-back-v9.js",
    "js/industrial-decisions-v11.js",
    "js/industrial-review-v12.js",
    "js/flow-back-v13.js",
    "js/strategy-layout-v14.js",
    "js/narrative-cycle-v27.js",
    "js/narrative-decisions-v28.js",
    "js/ui-fix-v29.js",
    "js/game-audio-v30.js",
    "js/game-audio-direct-v30.js",
    "js/game-audio-boost-v31.js",
    "js/game-audio-reliable-v32.js",
    "js/decision-timer-v35.js?v=1"
  ];

  function baseReady(){
    return typeof renderGame === "function" &&
      typeof renderActions === "function" &&
      typeof renderDecisionReview === "function" &&
      typeof gameState !== "undefined";
  }

  function waitForBase(){
    return new Promise(resolve => {
      if(baseReady()) return resolve();
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        if(baseReady() || attempts > 300){
          window.clearInterval(timer);
          resolve();
        }
      },20);
    });
  }

  function loadScript(src){
    return new Promise((resolve,reject) => {
      const existing = Array.from(document.scripts).find(script => script.src.endsWith(src));
      if(existing){
        if(existing.dataset.loaded === "true" || existing.readyState === "complete") return resolve();
        existing.addEventListener("load",resolve,{once:true});
        existing.addEventListener("error",()=>reject(new Error(`Failed to load ${src}`)),{once:true});
        window.setTimeout(resolve,0);
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.addEventListener("load",()=>{ script.dataset.loaded = "true"; resolve(); },{once:true});
      script.addEventListener("error",()=>reject(new Error(`Failed to load ${src}`)),{once:true});
      document.head.appendChild(script);
    });
  }

  async function boot(){
    await waitForBase();
    for(const src of orderedExtensions){
      try { await loadScript(src); }
      catch(error){ console.error("Time to Travel extension bootstrap:",error); break; }
    }
    document.documentElement.dataset.extensionsReadyV26 = "true";
    if(typeof renderGame === "function") renderGame();
  }

  boot();
})();

"use strict";

(function(){
  const localBackSelectors = [
    "#shockBackBtn",
    "#revaluationShockBackBtn",
    "#industrialDecisionBackBtn",
    "#industrialReviewBackBtn",
    "#industrialLockedBackBtn"
  ];

  function visibleLocalBack(){
    return localBackSelectors.some(selector => {
      const element = document.querySelector(selector);
      if(!element || element.hidden) return false;
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }

  function syncGlobalBack(){
    const back = document.getElementById("backBtn");
    if(!back || typeof canNavigateBack !== "function") return;

    // Setup uses its own Back-to-Landing control. Screens with an inline Back keep that
    // control; all other gameplay screens receive the global top-left Back button.
    const setup = gameState.phase === "setup";
    const show = !setup && !visibleLocalBack() && canNavigateBack();
    back.hidden = !show;
    back.disabled = !show;
    back.textContent = "← Back";
    document.body.classList.toggle("has-back",show);
  }

  function init(){
    if(document.documentElement.dataset.flowBackV13 === "true") return true;
    if(typeof renderGame !== "function" || typeof gameState === "undefined") return false;

    document.documentElement.dataset.flowBackV13 = "true";
    const originalRenderGame = renderGame;
    renderGame = function(){
      originalRenderGame();
      syncGlobalBack();
    };

    // Re-check after dynamically decorated screens add their own inline Back control.
    document.addEventListener("click",() => window.setTimeout(syncGlobalBack,0),true);
    window.setTimeout(syncGlobalBack,0);
    return true;
  }

  if(!init()){
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if(init() || attempts > 120) window.clearInterval(timer);
    },50);
  }
})();

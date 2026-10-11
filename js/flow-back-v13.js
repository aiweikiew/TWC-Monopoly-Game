"use strict";

// v25 cleanup: Back now follows exact flow snapshots. This layer only exposes the
// global/local Back buttons and records the Grand Tour Tech Shock transition.
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
      if(!element || element.hidden || element.disabled) return false;
      const style = window.getComputedStyle(element);
      if(style.display === "none" || style.visibility === "hidden") return false;
      return element.getClientRects().length > 0;
    });
  }

  function syncGlobalBack(){
    const back = document.getElementById("backBtn");
    if(!back || typeof canNavigateBack !== "function") return;
    const show = gameState.phase !== "setup" && !visibleLocalBack() && canNavigateBack();
    back.hidden = !show;
    back.disabled = !show;
    back.textContent = "← Back";
    document.body.classList.toggle("has-back",show);
  }

  function init(){
    if(document.documentElement.dataset.flowBackUniversalV25 === "true") return true;
    if(typeof renderGame !== "function" || typeof gameState === "undefined" ||
       typeof canNavigateBack !== "function" || typeof navigateBack !== "function") return false;

    document.documentElement.dataset.flowBackUniversalV25 = "true";

    // triggerTechShock is a Monopoly-layer transition, so record it here just like
    // navigation.js records the strategy-layer transitions.
    if(typeof triggerTechShock === "function" && !triggerTechShock.__flowHistoryWrapped){
      const originalTrigger = triggerTechShock;
      triggerTechShock = function(...args){
        const before = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;
        const result = originalTrigger.apply(this,args);
        if(before && typeof commitFlowSnapshot === "function") commitFlowSnapshot(before);
        return result;
      };
      triggerTechShock.__flowHistoryWrapped = true;
    }

    const originalRenderGame = renderGame;
    renderGame = function(){
      originalRenderGame();
      syncGlobalBack();
      window.setTimeout(syncGlobalBack,0);
    };

    // Local Back buttons use the same exact history as the global Back button.
    document.addEventListener("click",event => {
      const button = event.target.closest(localBackSelectors.join(","));
      if(!button || button.disabled) return;
      if(typeof canNavigateBack !== "function" || !canNavigateBack()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(navigateBack()) renderGame();
    },true);

    window.setTimeout(() => renderGame(),0);
    return true;
  }

  if(!init()){
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if(init() || attempts > 200) window.clearInterval(timer);
    },20);
  }
})();

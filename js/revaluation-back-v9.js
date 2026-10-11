"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/revaluation-back-v9.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/revaluation-back-v9.css";
    document.head.appendChild(link);
  }

  function isRevaluationScreen(){
    return gameState.mode === "strategy" && gameState.uiStage === "revaluation" &&
      ["steam","jet","digital"].includes(gameState.phase);
  }

  function ensureBackButton(){
    if(!isRevaluationScreen()) return;
    // Full-width Market Shift screens already render their own button with this id.
    if(document.getElementById("revaluationShockBackBtn")) return;
    const host = document.querySelector("#phaseContent .revaluation-screen");
    if(!host) return;

    const button = document.createElement("button");
    button.id = "revaluationShockBackBtn";
    button.type = "button";
    button.className = "revaluation-shock-back";
    button.textContent = "← Back";
    button.title = "Back to previous game screen";
    button.setAttribute("aria-label","Back to previous game screen");
    host.prepend(button);
  }

  function goBack(){
    if(!isRevaluationScreen()) return;
    if(typeof navigateBack !== "function" || !navigateBack()) return;
    if(typeof renderGame === "function") renderGame();
  }

  function init(){
    if(document.documentElement.dataset.revaluationBackV9 === "true") return true;
    if(typeof renderGame !== "function" || typeof phaseContent === "undefined") return false;

    document.documentElement.dataset.revaluationBackV9 = "true";
    loadStyles();

    const originalRenderGame = renderGame;
    renderGame = function(){
      originalRenderGame();
      ensureBackButton();
    };

    document.addEventListener("click",event => {
      const back = event.target.closest("#revaluationShockBackBtn");
      if(!back) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      goBack();
    },true);

    ensureBackButton();
    return true;
  }

  if(!init()){
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if(init() || attempts > 100) window.clearInterval(timer);
    },50);
  }
})();

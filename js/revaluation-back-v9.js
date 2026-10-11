"use strict";

(function(){
  let revisitActive = false;

  function loadStyles(){
    if(document.querySelector('link[href="css/revaluation-back-v9.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/revaluation-back-v9.css";
    document.head.appendChild(link);
  }

  function shockTitleForPhase(){
    if(gameState.phase === "steam") return "INDUSTRIAL REVOLUTION";
    if(gameState.phase === "jet") return "JET AGE";
    if(gameState.phase === "digital") return "DIGITAL TRANSFORMATION";
    return null;
  }

  function isRevaluationScreen(){
    return gameState.mode === "strategy" && gameState.uiStage === "revaluation" && Boolean(shockTitleForPhase());
  }

  function ensureBackButton(){
    if(!isRevaluationScreen()) return;
    const host = document.querySelector("#phaseContent .revaluation-screen");
    if(!host || host.querySelector("#revaluationShockBackBtn")) return;

    const button = document.createElement("button");
    button.id = "revaluationShockBackBtn";
    button.type = "button";
    button.className = "revaluation-shock-back";
    button.textContent = "← Back";
    button.title = "Back to Tech Shock";
    button.setAttribute("aria-label","Back to Tech Shock reveal");
    host.prepend(button);
  }

  function showPreviousShock(){
    if(!isRevaluationScreen()) return;
    const title = shockTitleForPhase();
    const shockScreen = document.getElementById("industrialShockScreen");
    const gameScreenEl = document.getElementById("gameScreen");
    const setupScreenEl = document.getElementById("setupScreen");
    const monopolyScreenEl = document.getElementById("monopolyScreen");
    if(!title || !shockScreen || !gameScreenEl) return;

    revisitActive = true;
    if(typeof configureShockScreen === "function") configureShockScreen(title);

    gameScreenEl.hidden = true;
    if(setupScreenEl) setupScreenEl.classList.add("hidden");
    if(monopolyScreenEl) monopolyScreenEl.hidden = true;
    shockScreen.hidden = false;
    shockScreen.dataset.revisit = "true";
  }

  function returnToRevaluation(){
    if(!revisitActive) return;
    revisitActive = false;
    const shockScreen = document.getElementById("industrialShockScreen");
    if(shockScreen){
      shockScreen.hidden = true;
      delete shockScreen.dataset.revisit;
    }
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
      if(!revisitActive) ensureBackButton();
    };

    document.addEventListener("click", event => {
      const backToShock = event.target.closest("#revaluationShockBackBtn");
      if(backToShock){
        event.preventDefault();
        event.stopImmediatePropagation();
        showPreviousShock();
        return;
      }

      if(!revisitActive) return;
      const shockContinue = event.target.closest("#applyIndustrialBtn");
      const shockBack = event.target.closest("#shockBackBtn");
      if(shockContinue || shockBack){
        event.preventDefault();
        event.stopImmediatePropagation();
        returnToRevaluation();
      }
    }, true);

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

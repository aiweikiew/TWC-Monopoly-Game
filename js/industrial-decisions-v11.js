"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/industrial-decisions-v11.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/industrial-decisions-v11.css";
    document.head.appendChild(link);
  }

  function isIndustrialDecisionScreen(){
    return gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "decisions";
  }

  function committedDecisionCount(){
    return Object.keys(gameState.decisions || {}).length;
  }

  function decorateIndustrialDecisionScreen(){
    if(!isIndustrialDecisionScreen()) return;
    const screen = document.querySelector("#phaseContent .decision-screen");
    if(!screen) return;

    let controls = screen.querySelector(".industrial-decision-controls");
    if(!controls){
      controls = document.createElement("div");
      controls.className = "industrial-decision-controls";
      controls.innerHTML = `
        <button type="button" class="game-btn secondary decision-back-btn" id="industrialDecisionBackBtn">← BACK</button>
        <button type="button" class="game-btn secondary decision-undo-btn" id="industrialUndoActionBtn">UNDO LAST ACTION</button>`;
      screen.appendChild(controls);
    }

    const back = controls.querySelector("#industrialDecisionBackBtn");
    const undo = controls.querySelector("#industrialUndoActionBtn");
    const hasCommitted = committedDecisionCount() > 0;

    // Revaluation is the screen immediately before Team A begins making decisions.
    // Once an action is committed, undo it first so the summary remains historically accurate.
    back.disabled = hasCommitted;
    back.title = hasCommitted ? "Undo the latest committed action before returning to revaluation." : "Back to Industrial Revolution revaluation";

    undo.disabled = !gameState.lastDecision;
    undo.title = gameState.lastDecision ? "Reverse the most recently committed team action" : "No committed action to undo";
  }

  function backToRevaluation(){
    if(!isIndustrialDecisionScreen() || committedDecisionCount() > 0) return;
    gameState.currentTeam = 0;
    gameState.uiStage = "revaluation";
    gameState.phaseComplete = false;
    gameState.message = "";
    navigationState.selection = null;
    navigationState.previousViews = [];
    if(typeof saveGameState === "function") saveGameState();
    renderGame();
  }

  function undoLatestIndustrialAction(){
    if(!isIndustrialDecisionScreen() || !gameState.lastDecision) return;
    const checkpoint = gameState.lastDecision;
    if(checkpoint.phase !== "steam") return;

    Object.assign(gameState, checkpoint, {lastDecision:null});
    navigationState.selection = null;
    navigationState.previousViews = [];
    if(typeof saveGameState === "function") saveGameState();
    renderGame();
  }

  function init(){
    if(document.documentElement.dataset.industrialDecisionsV11 === "true") return true;
    if(typeof renderGame !== "function" || typeof gameState === "undefined") return false;

    document.documentElement.dataset.industrialDecisionsV11 = "true";
    loadStyles();

    const originalRenderGame = renderGame;
    renderGame = function(){
      originalRenderGame();
      decorateIndustrialDecisionScreen();
    };

    document.addEventListener("click", event => {
      const back = event.target.closest("#industrialDecisionBackBtn");
      if(back){
        event.preventDefault();
        event.stopImmediatePropagation();
        backToRevaluation();
        return;
      }

      const undo = event.target.closest("#industrialUndoActionBtn");
      if(undo){
        event.preventDefault();
        event.stopImmediatePropagation();
        undoLatestIndustrialAction();
      }
    }, true);

    renderGame();
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

"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/debt-v4.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/debt-v4.css";
    document.head.appendChild(link);
  }

  function decorateDebtPlayers(target){
    const host = target || (typeof playerPanel !== "undefined" ? playerPanel : null);
    if(!host) return;
    const cards = [...host.querySelectorAll(".player-card")];
    cards.forEach((card,index) => {
      const team = gameState.teams[index];
      if(!team || team.cash >= 0) return;
      card.classList.add("in-debt");
      const cashMetric = card.querySelector(".player-metrics > span:nth-child(2)");
      if(cashMetric){
        cashMetric.classList.add("cash-debt");
        cashMetric.innerHTML = `DEBT <strong>${money(Math.abs(team.cash))}</strong>`;
      }
    });
  }

  function migrateOldDebtScreen(){
    // Earlier builds forced debt settlement before revaluation. New classroom flow keeps
    // the debt visible through revaluation and resolves it as that team's portfolio move.
    if(gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "debt"){
      delete gameState.debtSettlement;
      gameState.currentTeam = 0;
      gameState.revaluationLog = [];
      revalueAssets("steam");
      gameState.uiStage = "revaluation";
      gameState.message = "Industrial revaluation applied. Teams in debt must sell a business during their decision turn.";
      if(typeof saveGameState === "function") saveGameState();
    }
  }

  function init(){
    if(document.documentElement.dataset.debtSettlementV4 === "true") return true;
    if(typeof renderPlayers !== "function" || typeof renderGame !== "function" ||
       typeof revalueAssets !== "function" || typeof gameState === "undefined") return false;

    document.documentElement.dataset.debtSettlementV4 = "true";
    loadStyles();
    migrateOldDebtScreen();

    const originalRenderPlayers = renderPlayers;
    renderPlayers = function(target){
      originalRenderPlayers(target);
      decorateDebtPlayers(target);
    };

    // Debt is deliberately NOT intercepted before Industrial Revolution anymore.
    // Negative cash carries into the revaluation summary and the team must clear it
    // by selling a business on its Industrial decision turn.

    renderGame();
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

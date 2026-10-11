"use strict";

(function(){
  function initPassiveGo(){
    if(document.documentElement.dataset.passiveGoV8 === "true") return true;
    if(typeof resolveLanding !== "function" || typeof requireMonopoly !== "function") return false;

    document.documentElement.dataset.passiveGoV8 = "true";
    const originalResolveLanding = resolveLanding;

    resolveLanding = function(){
      const board = requireMonopoly("moving");
      requireRule(board.stepsRemaining === 0, "Finish token movement before resolving the landing.");

      const team = gameState.teams[gameState.currentTeam];
      const tile = board.positions[gameState.currentTeam];

      // GO is a passive payday tile. The +$1 has already been awarded during movement
      // when the token crossed/reached tile 0, so landing exactly on GO needs no popup.
      if(tile === 0){
        board.pendingLanding = null;
        gameState.totalTurnCount += 1;
        gameState.roundNumber = Math.floor(gameState.totalTurnCount / gameState.teams.length) + 1;
        board.status = "resolved";
        gameState.message = `${team.name}'s turn is complete. +$1 was added automatically at GO.`;
        return;
      }

      return originalResolveLanding();
    };

    // The old GO modal can stay in the DOM for backwards compatibility, but is never shown.
    const startModal = document.getElementById("startModal");
    if(startModal){
      startModal.hidden = true;
      startModal.classList.remove("show");
    }

    return true;
  }

  if(!initPassiveGo()){
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if(initPassiveGo() || attempts > 100) window.clearInterval(timer);
    },50);
  }
})();

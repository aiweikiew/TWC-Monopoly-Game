"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/debt-v4.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/debt-v4.css";
    document.head.appendChild(link);
  }

  function sellableDebtAssets(team){
    const tourism = team.assets.filter(asset => asset.tourism !== false);
    return tourism.length ? tourism : team.assets;
  }

  function nextDebtorIndex(startIndex = -1){
    for(let i=startIndex+1;i<gameState.teams.length;i++){
      if(gameState.teams[i].cash < 0) return i;
    }
    for(let i=0;i<=startIndex && i<gameState.teams.length;i++){
      if(gameState.teams[i].cash < 0) return i;
    }
    return -1;
  }

  function beginDebtSettlement(){
    const firstDebtor = nextDebtorIndex(-1);
    if(firstDebtor < 0) return false;

    gameState.phase = "steam";
    gameState.mode = "strategy";
    gameState.uiStage = "debt";
    gameState.phaseComplete = false;
    gameState.lastDecision = null;
    gameState.decisions = {};
    gameState.revaluationLog = [];
    gameState.currentTeam = firstDebtor;
    gameState.debtSettlement = {active:true};
    gameState.message = `${gameState.teams[firstDebtor].name} must settle debt before the Industrial Revolution revaluation.`;
    return true;
  }

  function finishDebtSettlement(){
    delete gameState.debtSettlement;
    gameState.currentTeam = 0;
    gameState.revaluationLog = [];
    revalueAssets("steam");
    gameState.uiStage = "revaluation";
    gameState.message = "All Grand Tour debt is settled. Industrial Revolution market revaluation now applies.";
  }

  function sellDebtAsset(assetId){
    requireRule(gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "debt",
      "Debt settlement is not active.");

    const team = gameState.teams[gameState.currentTeam];
    requireRule(team && team.cash < 0, "This team no longer has debt to settle.");

    const allowed = sellableDebtAssets(team);
    const asset = allowed.find(item => item.id === assetId);
    requireRule(asset, "Choose an available business or asset to sell.");

    team.cash += asset.currentValue;
    team.assets = team.assets.filter(item => item.id !== asset.id);
    if(asset.boardTile !== undefined) delete gameState.board.owners[asset.boardTile];

    if(team.cash < 0){
      gameState.message = `${team.name} sold ${asset.name} for ${money(asset.currentValue)} but still has ${money(team.cash)} cash. Sell another asset.`;
      return;
    }

    const next = nextDebtorIndex(gameState.currentTeam);
    if(next >= 0){
      gameState.currentTeam = next;
      gameState.message = `${team.name} cleared its debt. ${gameState.teams[next].name} must settle debt next.`;
    } else {
      finishDebtSettlement();
    }
  }

  function renderDebtSettlement(){
    const team = gameState.teams[gameState.currentTeam];
    const debt = Math.abs(Math.min(0,team.cash));
    const assets = sellableDebtAssets(team);
    const fallbackOnly = assets.length && assets.every(asset => asset.tourism === false);

    const cards = assets.length ? assets.map(asset => `
      <article class="debt-asset-card">
        <div>
          <span>${asset.tourism === false ? "FALLBACK ASSET" : "OWNED BUSINESS"}</span>
          <strong>${escapeHTML(asset.name)}</strong>
          <small>Current value ${money(asset.currentValue)}</small>
        </div>
        <button class="game-btn" type="button" data-debt-sell="${asset.id}">SELL · ${money(asset.currentValue)}</button>
      </article>`).join("") : `<div class="debt-no-assets">No assets are available to sell. Reset or undo the earlier turn to continue.</div>`;

    return `<section class="flow-screen debt-screen">
      <div class="screen-kicker">LIQUIDITY CHECK · END OF GRAND TOUR</div>
      <h2>${team.name} must clear its debt</h2>
      <p class="screen-lede">Service fees and Situation Cards can push cash below zero during the Grand Tour. Before the next era begins, sell owned businesses at their current value until cash returns to $0 or above.</p>
      <div class="debt-summary">
        <div><span>CURRENT CASH</span><strong class="debt-negative">-${money(debt).replace("$", "$")}</strong></div>
        <div><span>NET WORTH</span><strong>${money(calculateNetWorth(team))}</strong></div>
      </div>
      ${fallbackOnly ? `<div class="debt-fallback-note">No tourism business is available, so the Estate is offered as a fallback asset to prevent the game from getting stuck.</div>` : ""}
      <div class="debt-asset-grid">${cards}</div>
      <div class="debt-rule">Selling converts an asset into cash at the same current value, so Net Worth does not change from the sale itself.</div>
    </section>`;
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

  function init(){
    if(document.documentElement.dataset.debtSettlementV4 === "true") return true;
    if(typeof renderPlayers !== "function" || typeof renderCurrentStage !== "function" ||
       typeof applyIndustrialRevolution !== "function" || typeof renderGame !== "function" ||
       typeof revalueAssets !== "function" || typeof phaseContent === "undefined") return false;

    document.documentElement.dataset.debtSettlementV4 = "true";
    loadStyles();

    const originalRenderPlayers = renderPlayers;
    renderPlayers = function(target){
      originalRenderPlayers(target);
      decorateDebtPlayers(target);
    };

    const originalApplyIndustrialRevolution = applyIndustrialRevolution;
    applyIndustrialRevolution = function(){
      requireRule(gameState.phase === "industrialShockRevealed" && gameState.board.status === "shock",
        "Reveal the Tech Shock before applying Industrial Revolution.");
      if(gameState.teams.some(team => team.cash < 0)){
        beginDebtSettlement();
        return;
      }
      originalApplyIndustrialRevolution();
    };

    const originalRenderCurrentStage = renderCurrentStage;
    renderCurrentStage = function(){
      if(gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "debt"){
        return renderDebtSettlement();
      }
      return originalRenderCurrentStage();
    };

    const originalRenderGame = renderGame;
    renderGame = function(){
      originalRenderGame();
      if(gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "debt"){
        const team = gameState.teams[gameState.currentTeam];
        const badge = document.getElementById("turnBadge");
        const status = document.getElementById("statusText");
        if(badge) badge.textContent = `${team.name.toUpperCase()} · SETTLE DEBT`;
        if(status) status.textContent = `${team.name} has ${money(team.cash)} cash and must sell assets until cash is at least $0.`;
      }
    };

    phaseContent.addEventListener("click", event => {
      const button = event.target.closest("button[data-debt-sell]");
      if(!button) return;
      event.preventDefault();
      try {
        sellDebtAsset(button.dataset.debtSell);
        renderGame();
      } catch(error){
        const target = document.getElementById("actionError");
        if(target) target.textContent = error.message;
      }
    });

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

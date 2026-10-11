"use strict";

(function(){
  let industrialDraft = null;

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

  function currentTeam(){ return gameState.teams[gameState.currentTeam]; }

  function ensureDraft(){
    const team = currentTeam();
    if(!team) return null;
    if(!industrialDraft || industrialDraft.teamId !== team.id){
      industrialDraft = {
        teamId:team.id,
        investment:null,
        portfolioAction:team.cash < 0 ? "sell" : "hold",
        assetId:null
      };
    }
    if(team.cash < 0){
      industrialDraft.investment = null;
      industrialDraft.portfolioAction = "sell";
    }
    return industrialDraft;
  }

  function resetDraft(){ industrialDraft = null; }

  function selectedPortfolioAsset(team,draft){
    return draft.assetId ? team.assets.find(asset => asset.id === draft.assetId) || null : null;
  }

  function projectedCash(team,draft){
    let cash = team.cash;
    const asset = selectedPortfolioAsset(team,draft);
    if(draft.portfolioAction === "sell" && asset) cash += asset.currentValue;
    if(draft.portfolioAction === "adapt" && asset) cash -= 1;
    if(draft.investment){
      const marketAsset = assetTypes[draft.investment];
      cash -= marketAsset?.price || 0;
    }
    return cash;
  }

  function projectedNetWorth(team,draft){
    return calculateNetWorth(team) - (draft.portfolioAction === "adapt" ? 1 : 0);
  }

  function draftIsValid(team,draft){
    if(!team || !draft) return false;
    const startedInDebt = team.cash < 0;

    if(startedInDebt){
      if(draft.investment !== null || draft.portfolioAction !== "sell") return false;
      const asset = selectedPortfolioAsset(team,draft);
      return Boolean(asset) && projectedCash(team,draft) >= 0;
    }

    if(draft.investment && !markets.steam.includes(draft.investment)) return false;
    if(["sell","adapt"].includes(draft.portfolioAction)){
      const asset = selectedPortfolioAsset(team,draft);
      if(!asset) return false;
      if(draft.portfolioAction === "adapt" && !Object.hasOwn(adaptations,asset.type)) return false;
    }
    return projectedCash(team,draft) >= 0;
  }

  function investmentLabel(draft){
    if(!draft.investment) return "No new investment";
    const asset = assetTypes[draft.investment];
    return `${asset.name} · ${money(asset.price)}`;
  }

  function portfolioLabel(team,draft){
    const asset = selectedPortfolioAsset(team,draft);
    if(draft.portfolioAction === "hold") return "Hold current businesses";
    if(!asset) return draft.portfolioAction === "sell" ? "Choose a business to sell" : "Choose a business to adapt";
    if(draft.portfolioAction === "sell") return `Sell ${asset.name} · +${money(asset.currentValue)}`;
    const next = assetTypes[adaptations[asset.type]];
    return `Adapt ${asset.name} → ${next?.name || "New format"} · $1`;
  }

  function marketCard(draft,type,locked){
    const asset = assetTypes[type];
    const selected = !locked && draft.investment === type;
    return `<button type="button" class="industrial-market-card ${selected ? "selected" : ""}" data-industrial-invest="${type}" ${locked ? "disabled" : ""}>
      <span class="market-card-tag">NEW BUSINESS</span>
      <strong>${escapeHTML(asset.name)}</strong>
      <span class="market-card-price">${money(asset.price)}</span>
      <span class="market-card-cta">${locked ? "Debt must be cleared first" : selected ? "✓ Selected" : "Choose investment"}</span>
    </button>`;
  }

  function portfolioAssetCards(team,draft){
    if(draft.portfolioAction === "hold"){
      return `<div class="industrial-hold-message"><strong>Keep the current portfolio unchanged.</strong><span>You may still make one new market investment above.</span></div>`;
    }

    const eligible = draft.portfolioAction === "adapt"
      ? team.assets.filter(asset => Object.hasOwn(adaptations,asset.type))
      : team.assets;

    if(!eligible.length){
      return `<div class="industrial-empty-choice">No eligible businesses for this move.</div>`;
    }

    return `<div class="industrial-owned-choice-grid">${eligible.map(asset => {
      const selected = draft.assetId === asset.id;
      if(draft.portfolioAction === "sell"){
        const clearsDebt = team.cash >= 0 || team.cash + asset.currentValue >= 0;
        return `<button type="button" class="industrial-owned-card sell-card ${selected ? "selected" : ""} ${team.cash < 0 && clearsDebt ? "clears-debt" : ""}" data-industrial-asset="${asset.id}">
          <span>${team.cash < 0 && clearsDebt ? "✓ CLEARS DEBT" : "SELL"}</span><strong>${escapeHTML(asset.name)}</strong><b>Receive ${money(asset.currentValue)}</b>
        </button>`;
      }
      const next = assetTypes[adaptations[asset.type]];
      return `<button type="button" class="industrial-owned-card adapt-card ${selected ? "selected" : ""}" data-industrial-asset="${asset.id}">
        <span>ADAPT · $1</span><strong>${escapeHTML(asset.name)}</strong><b>→ ${escapeHTML(next?.name || "New format")}</b>
      </button>`;
    }).join("")}</div>`;
  }

  function renderIndustrialActions(){
    const team = currentTeam();
    const inDebt = team.cash < 0;
    const draft = ensureDraft();
    const cashAfter = projectedCash(team,draft);
    const worthAfter = projectedNetWorth(team,draft);
    const valid = draftIsValid(team,draft);
    const sellDisabled = team.assets.length === 0;
    const adaptDisabled = inDebt || !team.assets.some(asset => Object.hasOwn(adaptations,asset.type));

    return `<section class="industrial-turn-screen decision-screen ${inDebt ? "debt-turn" : ""}">
      <div class="industrial-turn-heading">
        <div>
          <div class="screen-kicker">TEAM DECISION · INDUSTRIAL REVOLUTION</div>
          <h2>${escapeHTML(team.name)}, ${inDebt ? "clear your debt" : "build your Industrial strategy"}</h2>
          <p>${inDebt ? "Your cash is below $0. Sell a business before you can invest or adapt." : "Choose up to one new investment, then sell, adapt, or hold one current business."}</p>
        </div>
        <div class="industrial-wallet ${inDebt ? "in-debt" : ""}">
          <span>${inDebt ? "DEBT" : "CASH"}</span><strong>${inDebt ? money(Math.abs(team.cash)) : money(team.cash)}</strong><small>Net Worth ${money(calculateNetWorth(team))}</small>
        </div>
      </div>

      ${inDebt ? `<div class="industrial-decision-debt-alert">
        <div><span>⚠ DEBT CLEARANCE REQUIRED</span><strong>YOU'RE IN DEBT · ${money(team.cash)} CASH</strong></div>
        <p>Select <b>SELL</b> and choose a business that brings projected cash back to $0 or above. New investments are locked for this turn.</p>
      </div>` : ""}

      <section class="industrial-step invest-step ${inDebt ? "debt-locked" : ""}">
        <div class="industrial-step-title"><span>1</span><div><strong>${inDebt ? "Market Investment Locked" : "Market Investment"}</strong><small>${inDebt ? "Clear debt first — no new purchase this turn." : "Buy one new business, or skip."}</small></div></div>
        <div class="industrial-market-grid">
          ${markets.steam.map(type => marketCard(draft,type,inDebt)).join("")}
          <button type="button" class="industrial-market-card skip-card selected" data-industrial-invest="" ${inDebt ? "disabled" : ""}>
            <span class="market-card-tag">${inDebt ? "REQUIRED" : "OPTIONAL"}</span><strong>Skip New Investment</strong><span class="market-card-price">$0</span><span class="market-card-cta">✓ Selected</span>
          </button>
        </div>
      </section>

      <section class="industrial-step portfolio-step ${inDebt ? "debt-clearance-step" : ""}">
        <div class="industrial-step-title"><span>2</span><div><strong>${inDebt ? "Debt Clearance" : "Portfolio Move"}</strong><small>${inDebt ? "Sell a business until projected cash is at least $0." : "Choose one: Sell, Adapt, or Hold."}</small></div></div>
        <div class="industrial-action-tabs">
          <button type="button" class="industrial-action-tab sell ${draft.portfolioAction === "sell" ? "selected" : ""}" data-industrial-portfolio="sell" ${sellDisabled ? "disabled" : ""}>SELL</button>
          <button type="button" class="industrial-action-tab adapt ${draft.portfolioAction === "adapt" ? "selected" : ""}" data-industrial-portfolio="adapt" ${adaptDisabled ? "disabled" : ""}>ADAPT · $1</button>
          <button type="button" class="industrial-action-tab hold ${draft.portfolioAction === "hold" ? "selected" : ""}" data-industrial-portfolio="hold" ${inDebt ? "disabled" : ""}>HOLD</button>
        </div>
        ${portfolioAssetCards(team,draft)}
      </section>

      <div class="industrial-turn-summary ${valid ? "valid" : "invalid"}">
        <div class="turn-summary-choice"><span>MARKET MOVE</span><strong>${escapeHTML(investmentLabel(draft))}</strong></div>
        <div class="turn-summary-plus">+</div>
        <div class="turn-summary-choice"><span>${inDebt ? "DEBT MOVE" : "PORTFOLIO MOVE"}</span><strong>${escapeHTML(portfolioLabel(team,draft))}</strong></div>
        <div class="turn-summary-finance">
          <span>PROJECTED CASH</span><strong>${money(cashAfter)}</strong><small>Net Worth ${money(worthAfter)}</small>
        </div>
        <button type="button" class="industrial-confirm-turn" id="industrialConfirmTurnBtn" ${valid ? "" : "disabled"}>${inDebt ? "CLEAR DEBT & CONFIRM" : "CONFIRM TEAM TURN"}</button>
      </div>
      ${!valid && cashAfter < 0 ? `<div class="industrial-turn-warning">Still in debt by ${money(Math.abs(cashAfter))}. Choose a higher-value business to sell.</div>` : ""}

      <div class="industrial-decision-controls">
        <button type="button" class="game-btn secondary decision-back-btn" id="industrialDecisionBackBtn">← BACK</button>
        <button type="button" class="game-btn secondary decision-undo-btn" id="industrialUndoActionBtn" ${gameState.lastDecision ? "" : "disabled"}>UNDO LAST ACTION</button>
      </div>
    </section>`;
  }

  function commitIndustrialTurn(){
    if(!isIndustrialDecisionScreen()) return;
    const team = currentTeam();
    const startedInDebt = team.cash < 0;
    const draft = ensureDraft();
    requireRule(draftIsValid(team,draft),startedInDebt ? "Sell a business that clears the debt first." : "Finish choosing a valid Industrial turn first.");
    const flowBefore = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;

    const checkpoint = JSON.parse(JSON.stringify({
      phase:gameState.phase,uiStage:gameState.uiStage,teams:gameState.teams,currentTeam:gameState.currentTeam,
      decisions:gameState.decisions,phaseComplete:gameState.phaseComplete,
      destinationPressure:gameState.destinationPressure,events:gameState.events,
      nextAssetId:gameState.nextAssetId,message:gameState.message
    }));

    const descriptions = [];
    const selectedAsset = selectedPortfolioAsset(team,draft);

    if(draft.portfolioAction === "sell"){
      requireRule(selectedAsset,"Choose a business to sell.");
      team.cash += selectedAsset.currentValue;
      team.assets = team.assets.filter(asset => asset.id !== selectedAsset.id);
      descriptions.push(`SELL: ${selectedAsset.name}`);
    } else if(draft.portfolioAction === "adapt"){
      requireRule(!startedInDebt,"Clear debt before adapting a business.");
      requireRule(selectedAsset && Object.hasOwn(adaptations,selectedAsset.type),"Choose an eligible business to adapt.");
      requireRule(team.cash >= 1,"Adaptation requires $1 cash.");
      const oldName = selectedAsset.name;
      team.cash -= 1;
      selectedAsset.type = adaptations[selectedAsset.type];
      selectedAsset.name = assetTypes[selectedAsset.type].name;
      selectedAsset.form = selectedAsset.name;
      selectedAsset.era = "steam";
      descriptions.push(`ADAPT: ${oldName} → ${selectedAsset.name}`);
    } else {
      requireRule(!startedInDebt,"Clear debt before holding the portfolio.");
      descriptions.push("HOLD CURRENT BUSINESSES");
    }

    if(startedInDebt){
      requireRule(team.cash >= 0,"The selected sale does not fully clear the debt.");
      requireRule(!draft.investment,"Teams starting the turn in debt cannot make a new investment this turn.");
      descriptions.unshift("DEBT CLEARED");
    } else if(draft.investment){
      requireRule(markets.steam.includes(draft.investment),"Choose a valid Industrial market investment.");
      const marketAsset = assetTypes[draft.investment];
      requireRule(team.cash >= marketAsset.price,"Insufficient cash for the selected investment.");
      team.cash -= marketAsset.price;
      team.assets.push(createAsset(draft.investment));
      descriptions.unshift(`BUY: ${marketAsset.name}`);
    } else descriptions.unshift("NO NEW INVESTMENT");

    const description = descriptions.join(" · ");
    gameState.decisions[team.id] = description;
    gameState.lastDecision = checkpoint;
    gameState.message = `${team.name}: ${description}.`;

    const nextTeam = gameState.teams.findIndex(candidate => !gameState.decisions[candidate.id]);
    if(nextTeam === -1){
      gameState.phaseComplete = true;
      gameState.uiStage = "review";
    } else gameState.currentTeam = nextTeam;

    if(flowBefore && typeof commitFlowSnapshot === "function") commitFlowSnapshot(flowBefore);
    resetDraft();
    navigationState.selection = null;
    navigationState.previousViews = [];
    if(typeof saveGameState === "function") saveGameState();
    renderGame();
  }

  function backToRevaluation(){
    if(!isIndustrialDecisionScreen() || committedDecisionCount() > 0) return;
    resetDraft();
    gameState.currentTeam = 0;
    gameState.uiStage = "revaluation";
    gameState.phaseComplete = false;
    gameState.message = "";
    navigationState.selection = null;
    navigationState.previousViews = [];
    if(typeof saveGameState === "function") saveGameState();
    renderGame();
  }

  function goBackInIndustrialFlow(){
    resetDraft();
    if(typeof navigateBack === "function" && navigateBack()){
      renderGame();
      return;
    }
    backToRevaluation();
  }

  function undoLatestIndustrialAction(){
    if(!isIndustrialDecisionScreen() || !gameState.lastDecision) return;
    const checkpoint = gameState.lastDecision;
    if(checkpoint.phase !== "steam") return;
    if(Array.isArray(gameState.flowHistory) && gameState.flowHistory.length) gameState.flowHistory.pop();
    Object.assign(gameState,checkpoint,{lastDecision:null});
    resetDraft();
    navigationState.selection = null;
    navigationState.previousViews = [];
    if(typeof saveGameState === "function") saveGameState();
    renderGame();
  }

  function init(){
    if(document.documentElement.dataset.industrialDecisionsV11 === "true") return true;
    if(typeof renderGame !== "function" || typeof renderActions !== "function" || typeof gameState === "undefined") return false;

    document.documentElement.dataset.industrialDecisionsV11 = "true";
    loadStyles();

    const originalRenderActions = renderActions;
    renderActions = function(){
      if(isIndustrialDecisionScreen()) return renderIndustrialActions();
      return originalRenderActions();
    };

    const originalRenderGame = renderGame;
    renderGame = function(){
      originalRenderGame();
      if(!isIndustrialDecisionScreen()) resetDraft();
    };

    document.addEventListener("click",event => {
      if(!isIndustrialDecisionScreen()) return;

      const invest = event.target.closest("[data-industrial-invest]");
      if(invest){
        event.preventDefault();
        event.stopImmediatePropagation();
        if(currentTeam().cash < 0 || invest.disabled) return;
        const draft = ensureDraft();
        draft.investment = invest.dataset.industrialInvest || null;
        renderGame();
        return;
      }

      const portfolio = event.target.closest("[data-industrial-portfolio]");
      if(portfolio && !portfolio.disabled){
        event.preventDefault();
        event.stopImmediatePropagation();
        if(currentTeam().cash < 0 && portfolio.dataset.industrialPortfolio !== "sell") return;
        const draft = ensureDraft();
        draft.portfolioAction = portfolio.dataset.industrialPortfolio;
        draft.assetId = null;
        renderGame();
        return;
      }

      const asset = event.target.closest("[data-industrial-asset]");
      if(asset){
        event.preventDefault();
        event.stopImmediatePropagation();
        ensureDraft().assetId = asset.dataset.industrialAsset;
        renderGame();
        return;
      }

      if(event.target.closest("#industrialConfirmTurnBtn")){
        event.preventDefault();
        event.stopImmediatePropagation();
        try{ commitIndustrialTurn(); }
        catch(error){ if(actionError) actionError.textContent = error.message; }
        return;
      }

      if(event.target.closest("#industrialDecisionBackBtn")){
        event.preventDefault();
        event.stopImmediatePropagation();
        goBackInIndustrialFlow();
        return;
      }

      if(event.target.closest("#industrialUndoActionBtn")){
        event.preventDefault();
        event.stopImmediatePropagation();
        undoLatestIndustrialAction();
      }
    },true);

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

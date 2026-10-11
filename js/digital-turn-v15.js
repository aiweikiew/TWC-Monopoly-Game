"use strict";

(function(){
  let digitalDraft = null;

  function loadStyles(){
    if(document.querySelector('link[href="css/digital-turn-v15.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/digital-turn-v15.css";
    document.head.appendChild(link);
  }

  function isDigitalTurn(){
    return typeof gameState !== "undefined" && gameState.mode === "strategy" &&
      gameState.phase === "digital" && gameState.uiStage === "decisions";
  }

  function team(){ return gameState.teams[gameState.currentTeam]; }

  function ensureDraft(){
    const current = team();
    if(!current) return null;
    if(!digitalDraft || digitalDraft.teamId !== current.id){
      digitalDraft = {
        teamId:current.id,
        saleAction:"skip",
        saleAssetId:null,
        digitalAction:"hold",
        digitalSelection:null
      };
    }
    return digitalDraft;
  }

  function resetDraft(){ digitalDraft = null; }

  function sellableAssets(current){
    return (current.assets || []).filter(asset => asset.tourism !== false);
  }

  function saleAsset(current,draft){
    if(draft.saleAction !== "sell" || !draft.saleAssetId) return null;
    return current.assets.find(asset => asset.id === draft.saleAssetId) || null;
  }

  function cashAfterSale(current,draft){
    const sold = saleAsset(current,draft);
    return current.cash + (sold ? sold.currentValue : 0);
  }

  function availableAfterSale(current,draft){
    const sold = saleAsset(current,draft);
    return current.assets.filter(asset => !sold || asset.id !== sold.id);
  }

  function digitiseCandidates(current,draft){
    return availableAfterSale(current,draft).filter(asset => asset.tourism && !asset.digital);
  }

  function projectedCash(current,draft){
    let cash = cashAfterSale(current,draft);
    if(draft.digitalAction === "invest" && draft.digitalSelection){
      cash -= assetTypes[draft.digitalSelection]?.price || 0;
    } else if(draft.digitalAction === "digitise" && draft.digitalSelection){
      cash -= 2;
    }
    return cash;
  }

  function projectedDigitalReady(current,draft){
    const remaining = availableAfterSale(current,draft);
    if(remaining.some(asset => asset.digital)) return true;
    return draft.digitalAction === "invest" || draft.digitalAction === "digitise";
  }

  function validDraft(current,draft){
    if(!current || !draft) return false;
    if(draft.saleAction === "sell"){
      const sold = saleAsset(current,draft);
      if(!sold || sold.tourism === false) return false;
    }
    if(draft.digitalAction === "invest"){
      if(!markets.digital.includes(draft.digitalSelection)) return false;
    } else if(draft.digitalAction === "digitise"){
      const candidate = digitiseCandidates(current,draft).find(asset => asset.id === draft.digitalSelection);
      if(!candidate) return false;
    } else if(draft.digitalAction !== "hold") return false;
    return projectedCash(current,draft) >= 0;
  }

  function saleDescription(current,draft){
    const sold = saleAsset(current,draft);
    return sold ? `Sell ${sold.name} · +${money(sold.currentValue)}` : "Keep all current businesses";
  }

  function digitalDescription(current,draft){
    if(draft.digitalAction === "invest"){
      const asset = assetTypes[draft.digitalSelection];
      return asset ? `Invest in ${asset.name} · ${money(asset.price)}` : "Choose a digital investment";
    }
    if(draft.digitalAction === "digitise"){
      const asset = digitiseCandidates(current,draft).find(item => item.id === draft.digitalSelection);
      return asset ? `Digitise ${asset.name} · $2` : "Choose a business to digitise";
    }
    return "Hold · no digital spend";
  }

  function statusCard(item,index,current){
    const done = Boolean(gameState.decisions?.[item.id]);
    const active = item.id === current.id;
    return `<article class="strategy-team-status ${active ? "active" : ""} ${done ? "done" : ""}">
      <div class="strategy-team-head">
        <div class="strategy-team-icon">${item.identity.icon}</div>
        <div><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.identity.name)}</span></div>
        <b>${item.id}</b>
      </div>
      <div class="strategy-team-money"><span>NET WORTH <strong>${money(calculateNetWorth(item))}</strong></span><span>${item.cash < 0 ? "DEBT" : "CASH"} <strong>${money(item.cash)}</strong></span></div>
      <div class="strategy-team-flags"><span>DIGITAL READY <b>${item.digitalReady ? "YES" : "NO"}</b></span><span>PRESSURE <b>${item.destinationPressure}</b></span></div>
      <div class="strategy-team-state">${done ? `✓ ${escapeHTML(gameState.decisions[item.id])}` : active ? "YOUR MOVE" : "WAITING"}</div>
    </article>`;
  }

  function renderSaleCards(current,draft){
    const assets = sellableAssets(current);
    return `<div class="digital-sale-grid">
      <button type="button" class="digital-sale-card keep ${draft.saleAction === "skip" ? "selected" : ""}" data-digital-sale="skip">
        <span>OPTIONAL</span><strong>Skip Sale</strong><small>Keep every current business.</small><b>$0</b>
      </button>
      ${assets.map(asset => `<button type="button" class="digital-sale-card ${draft.saleAction === "sell" && draft.saleAssetId === asset.id ? "selected" : ""}" data-digital-sale="sell" data-digital-sale-asset="${asset.id}">
        <span>SELL</span><strong>${escapeHTML(asset.name)}</strong><small>Release capital for the Digital move.</small><b>+${money(asset.currentValue)}</b>
      </button>`).join("")}
    </div>`;
  }

  function renderDigitiseOptions(current,draft,candidates,spendable){
    if(!candidates.length) return '<div class="digital-digitise-empty">No eligible non-digital tourism business remains.</div>';
    if(spendable < 2) return '<div class="digital-digitise-empty">Need $2 cash to digitise a business.</div>';
    return `<div class="digital-digitise-options">${candidates.map(asset => {
      const selected = draft.digitalAction === "digitise" && draft.digitalSelection === asset.id;
      return `<button type="button" class="digital-digitise-option ${selected ? "selected" : ""}" data-digital-move="digitise" data-digital-selection="${asset.id}">
        <span>${selected ? "✓ SELECTED" : "DIGITISE"}</span>
        <strong>${escapeHTML(asset.name)}</strong>
        <b>${money(asset.currentValue)}</b>
      </button>`;
    }).join("")}</div>`;
  }

  function renderDigitalChoices(current,draft){
    const spendable = cashAfterSale(current,draft);
    const candidates = digitiseCandidates(current,draft);
    return `<div class="digital-move-grid">
      ${markets.digital.map(type => {
        const asset = assetTypes[type];
        const disabled = spendable < asset.price;
        const selected = draft.digitalAction === "invest" && draft.digitalSelection === type;
        return `<button type="button" class="digital-move-card investment ${selected ? "selected" : ""}" data-digital-move="invest" data-digital-selection="${type}" ${disabled ? "disabled" : ""}>
          <span>NEW DIGITAL BUSINESS</span><strong>${escapeHTML(asset.name)}</strong><b>${money(asset.price)}</b><small>${disabled ? `Need ${money(asset.price - spendable)} more cash` : selected ? "✓ Selected" : "Use available cash to invest"}</small>
        </button>`;
      }).join("")}
      <article class="digital-move-card digitise ${draft.digitalAction === "digitise" ? "selected" : ""}">
        <span>TRANSFORM EXISTING BUSINESS</span><strong>Digitise one business</strong><b>$2</b>
        ${renderDigitiseOptions(current,draft,candidates,spendable)}
      </article>
      <button type="button" class="digital-move-card hold ${draft.digitalAction === "hold" ? "selected" : ""}" data-digital-move="hold">
        <span>NO DIGITAL SPEND</span><strong>Hold</strong><b>$0</b><small>${draft.digitalAction === "hold" ? "✓ Selected" : "Keep remaining cash"}</small>
      </button>
    </div>`;
  }

  function renderDigitalTurn(){
    const current = team();
    const draft = ensureDraft();
    const afterSale = cashAfterSale(current,draft);
    const finalCash = projectedCash(current,draft);
    const valid = validDraft(current,draft);
    const ready = projectedDigitalReady(current,draft);

    return `<section class="strategy-modern-screen digital-era digital-two-step-screen">
      <header class="strategy-modern-header">
        <div class="screen-kicker">TEAM DECISION · DIGITAL TRANSFORMATION</div>
        <h2>${escapeHTML(current.name)}, reallocate and transform</h2>
        <p>You may sell one tourism business for cash, then make one Digital move.</p>
      </header>

      <div class="strategy-team-status-grid">${gameState.teams.map((item,index) => statusCard(item,index,current)).join("")}</div>

      <section class="digital-turn-step">
        <div class="digital-step-heading"><span>1</span><div><strong>Portfolio Move · Optional</strong><small>Sell ONE tourism business to release cash, or skip.</small></div><div class="digital-cash-preview"><small>CASH AFTER SALE</small><strong>${money(afterSale)}</strong></div></div>
        ${renderSaleCards(current,draft)}
      </section>

      <section class="digital-turn-step digital-step-two">
        <div class="digital-step-heading"><span>2</span><div><strong>Digital Move · Choose ONE</strong><small>Invest, digitise an existing business, or hold.</small></div></div>
        ${renderDigitalChoices(current,draft)}
      </section>

      <div class="digital-turn-summary ${valid ? "valid" : "invalid"}">
        <div><span>PORTFOLIO MOVE</span><strong>${escapeHTML(saleDescription(current,draft))}</strong></div>
        <div class="digital-summary-plus">+</div>
        <div><span>DIGITAL MOVE</span><strong>${escapeHTML(digitalDescription(current,draft))}</strong></div>
        <div class="digital-summary-finance"><span>PROJECTED CASH</span><strong>${money(finalCash)}</strong><small>Digital Ready · ${ready ? "YES" : "NO"}</small></div>
        <button type="button" class="game-btn digital-confirm-turn" id="digitalConfirmTurnBtn" ${valid ? "" : "disabled"}>CONFIRM TEAM TURN</button>
      </div>

      <div class="strategy-footer">
        <button class="game-btn secondary strategy-back-btn" id="digitalTurnBackBtn" type="button">← Back</button>
        <button class="game-btn secondary" id="digitalTurnResetBtn" type="button">Reset Game</button>
      </div>
    </section>`;
  }

  function checkpoint(){
    return JSON.parse(JSON.stringify({
      phase:gameState.phase,uiStage:gameState.uiStage,teams:gameState.teams,currentTeam:gameState.currentTeam,
      decisions:gameState.decisions,phaseComplete:gameState.phaseComplete,
      destinationPressure:gameState.destinationPressure,events:gameState.events,
      nextAssetId:gameState.nextAssetId,message:gameState.message
    }));
  }

  function commitTurn(){
    if(!isDigitalTurn()) return;
    const current = team();
    const draft = ensureDraft();
    requireRule(validDraft(current,draft),"Finish a valid Digital turn first.");

    const flowBefore = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;
    const undoCheckpoint = checkpoint();
    const descriptions = [];

    const sold = saleAsset(current,draft);
    if(sold){
      current.cash += sold.currentValue;
      current.assets = current.assets.filter(asset => asset.id !== sold.id);
      descriptions.push(`SELL: ${sold.name}`);
    } else descriptions.push("NO SALE");

    if(draft.digitalAction === "invest"){
      const definition = assetTypes[draft.digitalSelection];
      requireRule(definition && markets.digital.includes(draft.digitalSelection),"Choose a valid Digital investment.");
      requireRule(current.cash >= definition.price,"Insufficient cash for this investment.");
      current.cash -= definition.price;
      current.assets.push(createAsset(draft.digitalSelection));
      descriptions.push(`INVEST: ${definition.name}`);
    } else if(draft.digitalAction === "digitise"){
      const asset = current.assets.find(item => item.id === draft.digitalSelection);
      requireRule(asset && asset.tourism && !asset.digital,"Choose a valid business to digitise.");
      requireRule(current.cash >= 2,"Digitisation requires $2 cash.");
      current.cash -= 2;
      asset.digital = true;
      descriptions.push(`DIGITISE: ${asset.name}`);
    } else descriptions.push("HOLD DIGITAL MOVE");

    current.digitalReady = current.assets.some(asset => asset.digital);
    const description = descriptions.join(" · ");
    gameState.decisions[current.id] = description;
    gameState.lastDecision = undoCheckpoint;
    gameState.message = `${current.name}: ${description}.`;

    const nextTeam = gameState.teams.findIndex(item => !gameState.decisions[item.id]);
    if(nextTeam === -1){
      gameState.phaseComplete = true;
      gameState.uiStage = "review";
    } else gameState.currentTeam = nextTeam;

    if(flowBefore && typeof commitFlowSnapshot === "function") commitFlowSnapshot(flowBefore);
    resetDraft();
    if(typeof navigationState !== "undefined"){
      navigationState.selection = null;
      navigationState.previousViews = [];
    }
    if(typeof saveGameState === "function") saveGameState();
    renderGame();
  }

  function rerender(){
    if(typeof renderGame === "function") renderGame();
  }

  function init(){
    if(document.documentElement.dataset.digitalTurnV15 === "true") return true;
    if(typeof renderActions !== "function" || typeof renderGame !== "function" ||
       typeof calculateNetWorth !== "function" || typeof createAsset !== "function") return false;

    document.documentElement.dataset.digitalTurnV15 = "true";
    loadStyles();

    const previousRenderActions = renderActions;
    renderActions = function(){
      if(isDigitalTurn()) return renderDigitalTurn();
      resetDraft();
      return previousRenderActions();
    };

    document.addEventListener("click",event => {
      if(!isDigitalTurn()) return;

      const sale = event.target.closest("[data-digital-sale]");
      if(sale){
        event.preventDefault();
        event.stopImmediatePropagation();
        const draft = ensureDraft();
        draft.saleAction = sale.dataset.digitalSale;
        draft.saleAssetId = sale.dataset.digitalSale === "sell" ? sale.dataset.digitalSaleAsset : null;
        if(draft.digitalAction === "digitise" && !digitiseCandidates(team(),draft).some(asset => asset.id === draft.digitalSelection)){
          draft.digitalAction = "hold";
          draft.digitalSelection = null;
        }
        rerender();
        return;
      }

      const move = event.target.closest("[data-digital-move]");
      if(move){
        event.preventDefault();
        event.stopImmediatePropagation();
        if(move.disabled) return;
        const draft = ensureDraft();
        draft.digitalAction = move.dataset.digitalMove;
        if(draft.digitalAction === "invest" || draft.digitalAction === "digitise") draft.digitalSelection = move.dataset.digitalSelection || null;
        else draft.digitalSelection = null;
        rerender();
        return;
      }

      const confirm = event.target.closest("#digitalConfirmTurnBtn");
      if(confirm){
        event.preventDefault();
        event.stopImmediatePropagation();
        if(!confirm.disabled) commitTurn();
        return;
      }

      const back = event.target.closest("#digitalTurnBackBtn");
      if(back){
        event.preventDefault();
        event.stopImmediatePropagation();
        resetDraft();
        if(typeof navigateBack === "function" && navigateBack()) rerender();
        return;
      }

      const reset = event.target.closest("#digitalTurnResetBtn");
      if(reset){
        event.preventDefault();
        event.stopImmediatePropagation();
        resetDraft();
        resetGame();
        rerender();
      }
    },true);

    rerender();
    return true;
  }

  if(!init()){
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if(init() || attempts > 200) window.clearInterval(timer);
    },50);
  }
})();

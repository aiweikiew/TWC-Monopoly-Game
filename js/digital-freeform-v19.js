"use strict";

(function(){
  const DIGITAL_NATIVE_GROWTH = 2;
  const DIGITISED_GROWTH = 1;
  const DIGITAL_NATIVE_TYPES = new Set(["ota","booking","marketplace"]);
  let draft = null;

  const digitalForms = {
    legacyShipping:"Digital Passenger Shipping Service",
    legacyCoach:"App-Based Ground Transport Service",
    legacyInn:"Online-Bookable Inn",
    legacyPublishing:"Digital Travel Publishing",
    horse:"App-Based Local Mobility Service",
    inn:"Online-Bookable Accommodation",
    shipping:"Digital Passenger Shipping Service",
    guide:"Digital Travel Information Service",
    rail:"Digital Rail Travel Service",
    tour:"Online Tour Operator",
    hotel:"Online-Bookable Hotel",
    steamShipping:"Digital Passenger Shipping Service",
    transfer:"App-Based Transfer Service",
    guidebook:"Digital Travel Content Platform"
  };

  function loadStyles(){
    if(document.querySelector('link[href="css/digital-freeform-v19.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/digital-freeform-v19.css";
    document.head.appendChild(link);
  }

  function loadFutureLayer(){
    if(document.querySelector('script[src="js/future-crisis-v18.js"]')) return;
    const script = document.createElement("script");
    script.src = "js/future-crisis-v18.js";
    script.async = false;
    document.head.appendChild(script);
  }

  function currentTeam(){ return gameState.teams[gameState.currentTeam]; }
  function isDigitalDecision(){ return gameState?.mode === "strategy" && gameState.phase === "digital" && gameState.uiStage === "decisions"; }
  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function has(set,id){ return set.includes(id); }
  function toggle(list,value){
    const index = list.indexOf(value);
    if(index >= 0) list.splice(index,1); else list.push(value);
  }
  function digitalFormName(asset){ return digitalForms[asset.type] || `Digital ${asset.name}`; }

  function ensureDraft(){
    const team = currentTeam();
    if(!team) return null;
    if(!draft || draft.teamId !== team.id){
      draft = {teamId:team.id,sold:[],digitised:[],buys:[]};
    }
    return draft;
  }
  function resetDraft(){ draft = null; }

  function viableToDigitise(asset){
    return asset && asset.tourism !== false && !asset.digital && asset.currentValue > 0 && Object.hasOwn(digitalForms,asset.type);
  }
  function projectedAssets(team,d){
    return team.assets.filter(asset => !has(d.sold,asset.id));
  }
  function saleProceeds(team,d){
    return team.assets.filter(asset => has(d.sold,asset.id)).reduce((sum,asset)=>sum + asset.currentValue,0);
  }
  function digitalSpend(d){
    const transformCost = d.digitised.length * 2;
    const buyCost = d.buys.reduce((sum,type)=>sum + Number(assetTypes[type]?.price || 0),0);
    return transformCost + buyCost;
  }
  function projectedCash(team,d){ return team.cash + saleProceeds(team,d) - digitalSpend(d); }
  function projectedWorth(team,d){ return calculateNetWorth(team) - (d.digitised.length * 2); }
  function projectedReady(team,d){
    return projectedAssets(team,d).some(asset => asset.digital || has(d.digitised,asset.id)) || d.buys.length > 0;
  }
  function validDraft(team,d){
    if(!team || !d) return false;
    if(d.sold.some(id => !team.assets.some(asset => asset.id === id && asset.tourism !== false))) return false;
    if(d.digitised.some(id => has(d.sold,id) || !viableToDigitise(team.assets.find(asset=>asset.id===id)))) return false;
    if(d.buys.some(type => !markets.digital.includes(type))) return false;
    if(new Set(d.buys).size !== d.buys.length) return false;
    if(d.buys.some(type => team.assets.some(asset => asset.type === type))) return false;
    return projectedCash(team,d) >= 0;
  }

  function statusCard(team,active){
    const done = Boolean(gameState.decisions?.[team.id]);
    const digitalCount = (team.assets || []).filter(asset => asset.digital).length;
    return `<article class="v19-status ${active ? "active" : ""} ${done ? "done" : ""}">
      <div class="v19-status-head"><div class="strategy-team-icon">${team.identity.icon}</div><div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div></div>
      <div class="v19-status-metrics"><span>NET WORTH <b>${money(calculateNetWorth(team))}</b></span><span>CASH <b>${money(team.cash)}</b></span><span>DIGITAL ASSETS <b>${digitalCount}</b></span></div>
      <div class="v19-status-state">${done ? `✓ ${escapeHTML(gameState.decisions[team.id])}` : active ? "YOUR PORTFOLIO" : "WAITING"}</div>
    </article>`;
  }

  function renderSellSection(team,d){
    const assets = (team.assets || []).filter(asset => asset.tourism !== false);
    if(!assets.length) return '<div class="v19-empty">No tourism businesses available to sell.</div>';
    return `<div class="v19-option-grid">${assets.map(asset => {
      const selected = has(d.sold,asset.id);
      return `<button type="button" class="v19-option sell ${selected ? "selected" : ""}" data-v19-sell="${asset.id}">
        <span>${selected ? "✓ SELLING" : "SELL"}</span><strong>${escapeHTML(asset.name)}</strong><b>+${money(asset.currentValue)}</b><small>${selected ? "Cash released when portfolio is locked." : "Click to add/remove from sale list."}</small>
      </button>`;
    }).join("")}</div>`;
  }

  function renderDigitiseSection(team,d){
    const assets = (team.assets || []).filter(asset => viableToDigitise(asset));
    if(!assets.length) return '<div class="v19-empty">No viable non-digital businesses remain to transform.</div>';
    return `<div class="v19-option-grid">${assets.map(asset => {
      const sold = has(d.sold,asset.id);
      const selected = has(d.digitised,asset.id);
      return `<button type="button" class="v19-option digitise ${selected ? "selected" : ""}" data-v19-digitise="${asset.id}" ${sold ? "disabled" : ""}>
        <span>${sold ? "MARKED FOR SALE" : selected ? "✓ DIGITISING · $2" : "DIGITISE · $2"}</span>
        <strong>${escapeHTML(asset.name)}</strong><div class="v19-path">→ ${escapeHTML(digitalFormName(asset))}</div><b>${money(asset.currentValue)}</b>
      </button>`;
    }).join("")}</div>`;
  }

  function renderBuySection(team,d){
    return `<div class="v19-option-grid buy-grid">${markets.digital.map(type => {
      const def = assetTypes[type];
      const owned = team.assets.some(asset => asset.type === type);
      const selected = has(d.buys,type);
      return `<button type="button" class="v19-option buy ${selected ? "selected" : ""}" data-v19-buy="${type}" ${owned ? "disabled" : ""}>
        <span>${owned ? "ALREADY OWNED" : selected ? "✓ BUYING" : "NEW DIGITAL BUSINESS"}</span><strong>${escapeHTML(def.name)}</strong><b>${money(def.price)}</b><small>${owned ? "No duplicate purchases." : "Toggle this investment on or off."}</small>
      </button>`;
    }).join("")}</div>`;
  }

  function renderBuilder(){
    const team = currentTeam();
    const d = ensureDraft();
    const cash = projectedCash(team,d);
    const worth = projectedWorth(team,d);
    const ready = projectedReady(team,d);
    const valid = validDraft(team,d);
    return `<section class="strategy-modern-screen digital-era v19-builder">
      <header class="strategy-modern-header v19-builder-head">
        <div class="screen-kicker">DIGITAL TRANSFORMATION · PORTFOLIO BUILDER</div>
        <h2>${escapeHTML(team.name)}, rebuild your business</h2>
        <p>Sell as many tourism businesses as you want, digitise multiple viable businesses, and buy as many different digital businesses as your cash allows.</p>
      </header>
      <div class="v19-status-grid">${gameState.teams.map(t=>statusCard(t,t.id===team.id)).join("")}</div>
      <div class="v19-builder-body">
        <section class="v19-builder-section"><div class="v19-section-head"><div><span>1</span><strong>Sell assets</strong><small>Optional · select any number to release cash.</small></div><b>+${money(saleProceeds(team,d))}</b></div>${renderSellSection(team,d)}</section>
        <section class="v19-builder-section"><div class="v19-section-head"><div><span>2</span><strong>Digitise existing businesses</strong><small>$2 each · select any number · market value is preserved for now.</small></div><b>−${money(d.digitised.length*2)}</b></div>${renderDigitiseSection(team,d)}</section>
        <section class="v19-builder-section"><div class="v19-section-head"><div><span>3</span><strong>Buy digital businesses</strong><small>Buy as many different businesses as you can afford.</small></div><b>−${money(d.buys.reduce((s,t)=>s+(assetTypes[t]?.price||0),0))}</b></div>${renderBuySection(team,d)}</section>
      </div>
      <div class="v19-builder-summary ${cash < 0 ? "invalid" : ""}">
        <div><span>SELLING</span><strong>${d.sold.length} asset${d.sold.length===1?"":"s"}</strong></div>
        <div><span>DIGITISING</span><strong>${d.digitised.length} business${d.digitised.length===1?"":"es"}</strong></div>
        <div><span>BUYING</span><strong>${d.buys.length} business${d.buys.length===1?"":"es"}</strong></div>
        <div class="money"><span>PROJECTED CASH</span><strong>${money(cash)}</strong></div>
        <div class="money"><span>PROJECTED NET WORTH</span><strong>${money(worth)}</strong><small>Digital Ready · ${ready?"YES":"NO"}</small></div>
        <button class="game-btn v19-lock-team" id="v19LockTeamBtn" type="button" ${valid?"":"disabled"}>LOCK DIGITAL PORTFOLIO</button>
      </div>
      <div class="strategy-footer v19-top-controls"><button class="game-btn secondary" id="v19BuilderBackBtn" type="button">← Back</button><button class="game-btn secondary" id="v19BuilderResetBtn" type="button">Reset Game</button></div>
    </section>`;
  }

  function snapshotForUndo(){
    return clone({phase:gameState.phase,uiStage:gameState.uiStage,teams:gameState.teams,currentTeam:gameState.currentTeam,decisions:gameState.decisions,phaseComplete:gameState.phaseComplete,destinationPressure:gameState.destinationPressure,events:gameState.events,nextAssetId:gameState.nextAssetId,message:gameState.message,revaluationLog:gameState.revaluationLog});
  }

  function lockTeamPortfolio(){
    if(!isDigitalDecision()) return;
    const team = currentTeam();
    const d = ensureDraft();
    requireRule(validDraft(team,d),"Projected cash cannot be negative.");
    const beforeFlow = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;
    const undo = snapshotForUndo();
    const soldNames = [], digitisedPaths = [], boughtNames = [];

    for(const id of d.sold){
      const asset = team.assets.find(a=>a.id===id);
      if(!asset) continue;
      team.cash += asset.currentValue;
      soldNames.push(asset.name);
    }
    team.assets = team.assets.filter(asset => !has(d.sold,asset.id));

    for(const id of d.digitised){
      const asset = team.assets.find(a=>a.id===id);
      if(!viableToDigitise(asset)) continue;
      requireRule(team.cash >= 2,"Digitisation requires $2 cash.");
      const oldName = asset.name;
      const newName = digitalFormName(asset);
      team.cash -= 2;
      asset.digital = true;
      asset.name = newName;
      asset.form = newName;
      asset.era = "digital";
      digitisedPaths.push(`${oldName} → ${newName}`);
    }

    for(const type of d.buys){
      const def = assetTypes[type];
      requireRule(def && markets.digital.includes(type),"Choose a valid digital business.");
      requireRule(!team.assets.some(asset=>asset.type===type),"Duplicate digital businesses are not allowed.");
      requireRule(team.cash >= def.price,"Insufficient cash for selected digital investments.");
      team.cash -= def.price;
      team.assets.push(createAsset(type));
      boughtNames.push(def.name);
    }

    team.digitalReady = team.assets.some(asset => asset.digital);
    if(!gameState.events.digitalPlansV19) gameState.events.digitalPlansV19 = {};
    gameState.events.digitalPlansV19[team.id] = {sold:soldNames,digitised:digitisedPaths,bought:boughtNames};
    const parts = [];
    if(soldNames.length) parts.push(`Sold ${soldNames.length}`);
    if(digitisedPaths.length) parts.push(`Digitised ${digitisedPaths.length}`);
    if(boughtNames.length) parts.push(`Bought ${boughtNames.length}`);
    if(!parts.length) parts.push("Kept portfolio");
    gameState.decisions[team.id] = parts.join(" · ");
    gameState.lastDecision = undo;
    gameState.message = `${team.name}: ${gameState.decisions[team.id]}.`;

    const next = gameState.teams.findIndex(t => !gameState.decisions[t.id]);
    if(next < 0){ gameState.phaseComplete = true; gameState.uiStage = "review"; }
    else gameState.currentTeam = next;

    if(beforeFlow && typeof commitFlowSnapshot === "function") commitFlowSnapshot(beforeFlow);
    resetDraft();
    if(typeof saveGameState === "function") saveGameState();
    renderGame();
  }

  function planLine(team){
    const plan = gameState.events.digitalPlansV19?.[team.id];
    if(!plan) return gameState.decisions?.[team.id] || "Portfolio locked";
    const parts=[];
    if(plan.sold.length) parts.push(`Sold ${plan.sold.length}`);
    if(plan.digitised.length) parts.push(`Digitised ${plan.digitised.length}`);
    if(plan.bought.length) parts.push(`Bought ${plan.bought.length}`);
    return parts.length ? parts.join(" · ") : "Kept current portfolio";
  }

  function reviewCard(team){
    const plan = gameState.events.digitalPlansV19?.[team.id] || {sold:[],digitised:[],bought:[]};
    return `<article class="v19-review-card">
      <header><div class="strategy-team-icon">${team.identity.icon}</div><div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div></header>
      <div class="v19-review-money"><span>NET WORTH <b>${money(calculateNetWorth(team))}</b></span><span>CASH <b>${money(team.cash)}</b></span></div>
      <div class="v19-review-portfolio">${team.assets.length ? team.assets.map(asset=>`<div><span>${escapeHTML(asset.name)}${asset.digital?'<small>DIGITAL</small>':''}</span><b>${money(asset.currentValue)}</b></div>`).join("") : '<em>No assets</em>'}</div>
      <div class="v19-review-actions"><span>${escapeHTML(planLine(team))}</span>${plan.sold.length?`<small>Sold: ${escapeHTML(plan.sold.join(", "))}</small>`:""}${plan.bought.length?`<small>Bought: ${escapeHTML(plan.bought.join(", "))}</small>`:""}</div>
    </article>`;
  }

  function renderReview(){
    return `<section class="strategy-modern-screen digital-era v19-review">
      <header class="strategy-modern-header"><div class="screen-kicker">FINAL CHECK · DIGITAL TRANSFORMATION</div><h2>Digital portfolios ready</h2><p>Teams have full control over what they sold, transformed and bought. Lock the portfolios to see whether the Digital era pays off.</p></header>
      <div class="v19-review-grid">${gameState.teams.map(reviewCard).join("")}</div>
      <div class="strategy-footer"><button class="game-btn secondary" id="v19ReviewBackBtn" type="button">← Back</button><button class="game-btn secondary" id="v19ReviewResetBtn" type="button">Reset Game</button><button class="game-btn secondary" data-flow-action="undo" type="button" ${!gameState.lastDecision?"disabled":""}>UNDO LAST TEAM</button><button class="game-btn" data-flow-action="lock" type="button">LOCK &amp; REVEAL DIGITAL BOOM</button></div>
    </section>`;
  }

  function pressureForGrowth(growth){
    if(growth >= 5) return 3;
    if(growth >= 3) return 2;
    return 1;
  }

  function reverseOldFITIfNeeded(){
    if(!gameState.events?.fitBoom || gameState.events.digitalBoomV19) return;
    for(const team of gameState.teams){
      if(team.digitalReady) team.cash -= 2;
      const oldPressure = gameState.events.fitPressureV18 && team.digitalReady ? 2 : 1;
      team.destinationPressure = Math.max(0,Number(team.destinationPressure||0)-oldPressure);
    }
    gameState.destinationPressure = Math.max(0,...gameState.teams.map(t=>Number(t.destinationPressure||0)));
    gameState.events.fitBoom = false;
    gameState.events.fitPressureV18 = false;
  }

  function applyDigitalBoom(){
    reverseOldFITIfNeeded();
    const beforeFlow = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;
    const records = {};
    for(const team of gameState.teams){
      const beforeWorth = calculateNetWorth(team);
      const rows = [];
      let growth = 0;
      for(const asset of team.assets){
        const before = asset.currentValue;
        let delta = 0;
        if(DIGITAL_NATIVE_TYPES.has(asset.type)) delta = DIGITAL_NATIVE_GROWTH;
        else if(asset.digital) delta = DIGITISED_GROWTH;
        asset.currentValue += delta;
        growth += delta;
        rows.push({name:asset.name,before,after:asset.currentValue,delta,digital:asset.digital});
      }
      records[team.id] = {beforeWorth,afterWorth:calculateNetWorth(team),growth,pendingPressure:pressureForGrowth(growth),rows};
    }
    gameState.events.digitalBoomV19 = {stage:"boom",teams:records};
    gameState.events.fitBoom = false;
    gameState.phaseComplete = true;
    gameState.uiStage = "event";
    gameState.lastDecision = null;
    gameState.message = "Digital tourism is flourishing.";
    if(beforeFlow && typeof commitFlowSnapshot === "function") commitFlowSnapshot(beforeFlow);
    if(typeof saveGameState === "function") saveGameState();
  }

  function boomCard(team){
    const record = gameState.events.digitalBoomV19?.teams?.[team.id];
    if(!record) return "";
    return `<article class="v19-boom-card">
      <header><div class="strategy-team-icon">${team.identity.icon}</div><div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div><b>+${money(record.growth)}</b></header>
      <div class="v19-boom-worth"><span>NET WORTH</span><strong>${money(record.beforeWorth)} <em>→</em> ${money(record.afterWorth)}</strong><b>▲ +${money(record.growth)}</b></div>
      <div class="v19-boom-assets">${record.rows.map(row=>`<div class="${row.delta>0?"grew":"flat"}"><span>${escapeHTML(row.name)}</span><strong>${money(row.before)} → ${money(row.after)}</strong><b>${row.delta>0?`+${money(row.delta)}`:"—"}</b></div>`).join("")}</div>
      <div class="v19-growth-total"><span>PORTFOLIO GROWTH</span><strong>+${money(record.growth)}</strong></div>
    </article>`;
  }

  function renderBoom(){
    return `<section class="strategy-modern-screen digital-era v19-boom">
      <header class="strategy-modern-header"><div class="screen-kicker">DIGITAL TOURISM BOOM</div><h2>Tourism is flourishing</h2><p>Independent travellers can search, compare and book more easily. Digital channels expand reach, reduce friction and unlock new demand.</p></header>
      <div class="v19-boom-grid">${gameState.teams.map(boomCard).join("")}</div>
      <div class="v19-boom-note">Digital-native businesses gain <strong>+$2</strong> · Digitised existing businesses gain <strong>+$1</strong> · Traditional non-digital assets stay unchanged.</div>
      <div class="strategy-footer"><button class="game-btn secondary" id="v19EventBackBtn" type="button">← Back</button><button class="game-btn secondary" id="v19EventResetBtn" type="button">Reset Game</button><button class="game-btn v19-siren-btn" id="v19RevealPressureBtn" type="button" aria-label="Reveal the downside of growth" title="Reveal the downside of growth">🚨</button></div>
    </section>`;
  }

  function revealPressure(){
    const boom = gameState.events.digitalBoomV19;
    if(!boom || boom.stage !== "boom") return;
    const before = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;
    for(const team of gameState.teams){
      const pressure = Number(boom.teams?.[team.id]?.pendingPressure || 1);
      team.destinationPressure = pressure;
    }
    gameState.destinationPressure = Math.max(...gameState.teams.map(t=>Number(t.destinationPressure||0)));
    boom.stage = "pressure";
    gameState.message = "Digital growth created destination pressure.";
    if(before && typeof commitFlowSnapshot === "function") commitFlowSnapshot(before);
    if(typeof saveGameState === "function") saveGameState();
    renderGame();
  }

  function renderPressureReveal(){
    const boom = gameState.events.digitalBoomV19;
    return `<section class="v19-pressure-screen">
      <div class="v19-pressure-card">
        <div class="v19-pressure-icon">🚨</div><div class="v19-pressure-kicker">PLOT TWIST · TECHNOLOGY DOWNSIDE</div>
        <h2>The downside of growth</h2>
        <p>Digital technology made tourism easier to access, search and book. But the same scalability pushed demand into destinations faster than they could absorb it.</p>
        <div class="v19-pressure-causes"><span>OVERCROWDING</span><span>TRANSPORT STRAIN</span><span>RESIDENT FRICTION</span><span>ENVIRONMENTAL STRESS</span></div>
        <div class="v19-pressure-rule"><strong>PRESSURE RULE</strong><span>Growth $0–2 → +1</span><span>Growth $3–4 → +2</span><span>Growth $5+ → +3</span></div>
        <div class="v19-pressure-teams">${gameState.teams.map(team=>{const r=boom.teams[team.id];return `<article><div>${team.identity.icon}</div><strong>${escapeHTML(team.name)}</strong><span>Digital Growth <b>+${money(r.growth)}</b></span><em>→</em><span>Destination Pressure <b>+${r.pendingPressure}</b></span></article>`;}).join("")}</div>
        <div class="v19-pressure-footer"><button class="game-btn secondary" id="v19PressureBackBtn" type="button">← Back</button><button class="game-btn secondary" id="v19PressureResetBtn" type="button">Reset Game</button><button class="game-btn" id="v19PressureContinueBtn" type="button">CONTINUE</button></div>
      </div>
    </section>`;
  }

  function moveToFuture(){
    const before = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;
    gameState.phase = "future";
    gameState.mode = "strategy";
    gameState.uiStage = "crisis";
    gameState.phaseComplete = false;
    gameState.decisions = {};
    gameState.currentTeam = 0;
    gameState.lastDecision = null;
    gameState.revaluationLog = [];
    gameState.message = "";
    gameState.events.fitBoom = false;
    gameState.events.crisis = false;
    gameState.events.crisisRevealSeenV18 = true;
    applyFutureCrisis();
    if(before && typeof commitFlowSnapshot === "function") commitFlowSnapshot(before);
    if(typeof saveGameState === "function") saveGameState();
    renderGame();
  }

  function eventRenderer(){
    const boom = gameState.events.digitalBoomV19;
    return boom?.stage === "pressure" ? renderPressureReveal() : renderBoom();
  }

  function compatibilityEvent(){
    if(gameState.phase !== "digital" || gameState.uiStage !== "event" || gameState.events.digitalBoomV19) return false;
    // Convert a saved session that had already reached the old FIT screen into the new Digital boom.
    reverseOldFITIfNeeded();
    applyDigitalBoom();
    return true;
  }

  function doBack(){
    if(typeof navigateBack === "function" && navigateBack()){
      resetDraft();
      renderGame();
    }
  }
  function doReset(){
    resetDraft();
    resetGame();
    if(typeof renderGame === "function") renderGame();
    if(typeof renderSetupCards === "function") renderSetupCards();
    if(typeof renderSetupSelection === "function") renderSetupSelection();
  }

  function bindEvents(){
    document.addEventListener("click",event=>{
      const sell = event.target.closest("[data-v19-sell]");
      if(sell && isDigitalDecision()){
        event.preventDefault(); event.stopImmediatePropagation();
        const d=ensureDraft(); const id=sell.dataset.v19Sell;
        toggle(d.sold,id);
        const ix=d.digitised.indexOf(id); if(ix>=0) d.digitised.splice(ix,1);
        renderGame(); return;
      }
      const digitise = event.target.closest("[data-v19-digitise]");
      if(digitise && isDigitalDecision()){
        event.preventDefault(); event.stopImmediatePropagation();
        const d=ensureDraft(); const id=digitise.dataset.v19Digitise;
        if(has(d.sold,id)) return;
        toggle(d.digitised,id); renderGame(); return;
      }
      const buy = event.target.closest("[data-v19-buy]");
      if(buy && isDigitalDecision()){
        event.preventDefault(); event.stopImmediatePropagation();
        toggle(ensureDraft().buys,buy.dataset.v19Buy); renderGame(); return;
      }
      if(event.target.closest("#v19LockTeamBtn")){ event.preventDefault(); event.stopImmediatePropagation(); lockTeamPortfolio(); return; }
      if(event.target.closest("#v19RevealPressureBtn")){ event.preventDefault(); event.stopImmediatePropagation(); revealPressure(); return; }
      if(event.target.closest("#v19PressureContinueBtn")){ event.preventDefault(); event.stopImmediatePropagation(); moveToFuture(); return; }
      if(event.target.closest("#v19BuilderBackBtn,#v19ReviewBackBtn,#v19EventBackBtn,#v19PressureBackBtn")){ event.preventDefault(); event.stopImmediatePropagation(); doBack(); return; }
      if(event.target.closest("#v19BuilderResetBtn,#v19ReviewResetBtn,#v19EventResetBtn,#v19PressureResetBtn")){ event.preventDefault(); event.stopImmediatePropagation(); doReset(); return; }
    },true);
  }

  function init(){
    if(document.documentElement.dataset.digitalFreeformV19 === "true") return true;
    if(typeof gameState === "undefined" || typeof renderGame !== "function" || typeof renderActions !== "function" || typeof renderDecisionReview !== "function" || typeof confirmPhaseReview !== "function" || typeof renderDigitalEvent !== "function" || typeof calculateNetWorth !== "function" || typeof createAsset !== "function") return false;

    document.documentElement.dataset.digitalFreeformV19 = "true";
    // Prevent the retired FIT-event renderer from taking over the new Digital event stage.
    document.documentElement.dataset.fitEventV17 = "true";
    loadStyles();
    loadFutureLayer();

    const previousActions = renderActions;
    renderActions = function(){ return isDigitalDecision() ? renderBuilder() : previousActions(); };

    const previousReview = renderDecisionReview;
    renderDecisionReview = function(){ return gameState.phase === "digital" && gameState.uiStage === "review" ? renderReview() : previousReview(); };

    const previousEvent = renderDigitalEvent;
    renderDigitalEvent = function(){ return gameState.phase === "digital" && gameState.uiStage === "event" && gameState.events.digitalBoomV19 ? eventRenderer() : previousEvent(); };

    const previousConfirmReview = confirmPhaseReview;
    confirmPhaseReview = function(...args){
      if(gameState.phase === "digital" && gameState.uiStage === "review"){
        requireRule(gameState.phaseComplete && gameState.teams.every(t=>gameState.decisions[t.id]),"Finish all Digital portfolios first.");
        applyDigitalBoom();
        return;
      }
      return previousConfirmReview.apply(this,args);
    };

    const previousRenderGame = renderGame;
    renderGame = function(){
      compatibilityEvent();
      previousRenderGame();
    };

    bindEvents();
    window.setTimeout(()=>renderGame(),0);
    return true;
  }

  if(!init()){
    let attempts=0;
    const timer=window.setInterval(()=>{ attempts+=1; if(init() || attempts>240) window.clearInterval(timer); },50);
  }
})();

"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/future-crisis-v18.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/future-crisis-v18.css";
    document.head.appendChild(link);
  }

  function clampPressure(value){ return Math.max(0, Number(value || 0)); }

  function configureFutureStrategies(){
    if(typeof futureStrategies === "undefined") return;
    Object.assign(futureStrategies.agenticAI,{
      pressureReduction:1,
      purpose:"Use AI to route demand, personalise journeys and reduce congestion while protecting growth."
    });
    Object.assign(futureStrategies.regenerative,{
      pressureReduction:2,
      purpose:"Actively restore destination capacity, community wellbeing and environmental health."
    });
  }

  // FIT demand is not neutral: teams that successfully capture the digital boom attract more demand,
  // creating a real growth-versus-pressure trade-off for the Future round.
  function applyPressureRebalance(){
    if(typeof gameState === "undefined" || !gameState.events?.fitBoom || gameState.events.fitPressureV18) return false;
    for(const team of gameState.teams || []){
      if(team.digitalReady) team.destinationPressure = clampPressure(team.destinationPressure) + 1;
    }
    gameState.destinationPressure = Math.max(0,...(gameState.teams || []).map(t => clampPressure(t.destinationPressure)));
    gameState.events.fitPressureV18 = true;

    // Repair a saved test run that is already on the Crisis page but has not begun Future decisions.
    if(gameState.phase === "future" && gameState.events.crisis && gameState.uiStage === "crisis" &&
       Object.keys(gameState.decisions || {}).length === 0){
      for(const team of gameState.teams || []){
        team.visitorExperience = 1;
        team.residentWellbeing = Math.max(0,2 - clampPressure(team.destinationPressure));
        team.environmentalHealth = Math.max(0,2 - clampPressure(team.destinationPressure));
      }
    }
    if(typeof saveGameState === "function") saveGameState();
    return true;
  }

  function wrapRules(){
    if(document.documentElement.dataset.futureRulesV18 === "true") return;
    document.documentElement.dataset.futureRulesV18 = "true";

    configureFutureStrategies();

    if(typeof applyFITBoom === "function"){
      const previousApplyFITBoom = applyFITBoom;
      applyFITBoom = function(...args){
        const result = previousApplyFITBoom.apply(this,args);
        applyPressureRebalance();
        return result;
      };
    }

    if(typeof takeAction === "function"){
      const previousTakeAction = takeAction;
      takeAction = function(teamId,action,selection,expectedPhase){
        const futureMove = expectedPhase === "future" && action === "strategy" && futureStrategies?.[selection];
        const team = futureMove ? gameState.teams.find(t => t.id === teamId) : null;
        const beforePressure = team ? clampPressure(team.destinationPressure) : 0;
        const result = previousTakeAction.apply(this,arguments);
        if(team && futureMove){
          team.destinationPressure = Math.max(0,beforePressure - Number(futureStrategies[selection].pressureReduction || 0));
          gameState.message = `${team.name}: ${futureStrategies[selection].name}. Pressure ${beforePressure} → ${team.destinationPressure}.`;
          if(typeof saveGameState === "function") saveGameState();
        }
        return result;
      };
    }
  }

  function footer(primary="",secondary=""){
    return `<div class="strategy-footer future-v18-footer">
      <button class="game-btn secondary strategy-back-btn" id="strategyFlowBackBtn" type="button">← Back</button>
      <button class="game-btn secondary" id="strategyResetBtn" type="button">Reset Game</button>
      ${secondary}${primary}
    </div>`;
  }

  function teamMini(team,active=false){
    return `<article class="future-team-mini ${active ? "active" : ""}">
      <div class="future-team-mini-head"><div class="strategy-team-icon">${team.identity.icon}</div><div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div></div>
      <div class="future-mini-metrics">
        <span>NET WORTH <b>${money(calculateNetWorth(team))}</b></span>
        <span class="pressure">PRESSURE <b>${clampPressure(team.destinationPressure)}</b></span>
        <span>RESIDENT <b>${team.residentWellbeing ?? "—"}/5</b></span>
        <span>ENVIRONMENT <b>${team.environmentalHealth ?? "—"}/5</b></span>
      </div>
      <div class="future-mini-state">${gameState.decisions?.[team.id] ? `✓ ${escapeHTML(gameState.decisions[team.id])}` : active ? "YOUR MOVE" : "WAITING"}</div>
    </article>`;
  }

  function renderFutureActionsV18(){
    const team = gameState.teams[gameState.currentTeam];
    const cards = Object.entries(futureStrategies).map(([key,strategy]) => {
      const reduction = Number(strategy.pressureReduction || 0);
      const projected = Math.max(0,clampPressure(team.destinationPressure) - reduction);
      return `<article class="future-response-card ${key === "regenerative" ? "regenerative" : "agentic"}">
        <div class="future-response-kicker">2035 RESPONSE</div>
        <h3>${escapeHTML(strategy.name)}</h3>
        <p>${escapeHTML(strategy.purpose)}</p>
        <div class="pressure-projection"><span>DESTINATION PRESSURE</span><strong>${clampPressure(team.destinationPressure)} <em>→</em> ${projected}</strong><b>−${reduction}</b></div>
        <div class="future-response-impacts">
          <span>Cash <b>+$${strategy.cash}</b></span>
          <span>Visitor <b>+${strategy.visitorExperience}</b></span>
          <span>Resident <b>+${strategy.residentWellbeing}</b></span>
          <span>Environment <b>+${strategy.environmentalHealth}</b></span>
        </div>
        <button type="button" class="game-btn strategy-action-btn" data-action="strategy" data-team="${team.id}" data-phase="future" data-selection="${key}">CHOOSE ${escapeHTML(strategy.name.toUpperCase())}</button>
      </article>`;
    }).join("");

    return `<section class="strategy-modern-screen future-era future-v18-screen future-decision-v18">
      <header class="strategy-modern-header">
        <div class="screen-kicker">ADAPTATION · FUTURE ROUND</div>
        <h2>${escapeHTML(team.name)}, balance growth and pressure</h2>
        <p>Your goal is to reduce Destination Pressure toward 0 while protecting Net Worth.</p>
      </header>
      <div class="future-objective-bar"><strong>ROUND GOAL</strong><span>LOWER PRESSURE</span><i>+</i><span>KEEP NET WORTH HIGH</span></div>
      <div class="future-team-mini-grid">${gameState.teams.map((t,i)=>teamMini(t,i===gameState.currentTeam)).join("")}</div>
      <div class="future-response-grid">${cards}</div>
      ${footer()}
    </section>`;
  }

  function renderFutureSelectionV18(){
    const draft = navigationState?.selection;
    if(!draft || draft.action !== "strategy") return "";
    const team = gameState.teams.find(t => t.id === draft.teamId);
    const strategy = futureStrategies[draft.selection];
    const projected = Math.max(0,clampPressure(team.destinationPressure) - Number(strategy.pressureReduction || 0));
    return `<section class="strategy-modern-screen future-era future-v18-screen future-confirm-v18">
      <div class="future-confirm-card">
        <div class="screen-kicker">CONFIRM FUTURE RESPONSE</div>
        <div class="strategy-team-icon">${team.identity.icon}</div>
        <h2>${escapeHTML(team.name)}</h2>
        <h3>${escapeHTML(strategy.name)}</h3>
        <div class="future-confirm-pressure"><span>PRESSURE</span><strong>${clampPressure(team.destinationPressure)} → ${projected}</strong></div>
        <div class="future-response-impacts">
          <span>Cash <b>+$${strategy.cash}</b></span><span>Visitor <b>+${strategy.visitorExperience}</b></span>
          <span>Resident <b>+${strategy.residentWellbeing}</b></span><span>Environment <b>+${strategy.environmentalHealth}</b></span>
        </div>
        <p>Nothing is committed until you confirm.</p>
        <button class="game-btn" type="button" id="confirmDecisionBtn">CONFIRM ${escapeHTML(strategy.name.toUpperCase())}</button>
      </div>
      ${footer()}
    </section>`;
  }

  function futureResultCard(team,review=false){
    const strategy = team.futureStrategy ? futureStrategies[team.futureStrategy] : null;
    return `<article class="future-result-card">
      <header><div class="strategy-team-icon">${team.identity.icon}</div><div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div></header>
      <div class="future-result-core"><div><span>NET WORTH</span><strong>${money(calculateNetWorth(team))}</strong></div><div class="pressure"><span>PRESSURE</span><strong>${clampPressure(team.destinationPressure)}</strong></div></div>
      <div class="future-result-scores"><span>Visitor <b>${team.visitorExperience}/5</b></span><span>Resident <b>${team.residentWellbeing}/5</b></span><span>Environment <b>${team.environmentalHealth}/5</b></span></div>
      ${strategy ? `<div class="future-result-strategy"><span>${escapeHTML(strategy.name)}</span><b>Pressure −${strategy.pressureReduction}</b></div>` : ""}
      ${review ? `<div class="future-review-move">${escapeHTML(gameState.decisions?.[team.id] || "Pending")}</div>` : ""}
    </article>`;
  }

  function renderFutureReviewV18(){
    return `<section class="strategy-modern-screen future-era future-v18-screen future-review-v18">
      <header class="strategy-modern-header"><div class="screen-kicker">FINAL CHECK · ADAPTATION</div><h2>Did each team relieve the pressure?</h2><p>Review the trade-off between Destination Pressure and Net Worth before locking the Future round.</p></header>
      <div class="future-objective-bar"><strong>BEST POSITION</strong><span>PRESSURE → 0</span><i>+</i><span>HIGH NET WORTH</span></div>
      <div class="future-result-grid">${gameState.teams.map(team=>futureResultCard(team,true)).join("")}</div>
      ${footer('<button class="game-btn" data-flow-action="lock" type="button">LOCK FINAL STRATEGIES</button>',`<button class="game-btn secondary" data-flow-action="undo" type="button" ${!gameState.lastDecision ? "disabled" : ""}>UNDO LAST DECISION</button>`)}
    </section>`;
  }

  function renderFutureResultsV18(){
    const ranked = [...gameState.teams].sort((a,b) => {
      const pressureDiff = clampPressure(a.destinationPressure) - clampPressure(b.destinationPressure);
      return pressureDiff || calculateNetWorth(b) - calculateNetWorth(a);
    });
    return `<section class="strategy-modern-screen future-era future-v18-screen future-results-v18">
      <header class="strategy-modern-header"><div class="screen-kicker">ADAPTATION RESULTS</div><h2>Who adapted without sacrificing value?</h2><p>Lower pressure is better; Net Worth remains the economic constraint.</p></header>
      <div class="future-objective-bar"><strong>ADAPTATION LENS</strong><span>LOW PRESSURE</span><i>×</i><span>ECONOMIC RESILIENCE</span></div>
      <div class="future-result-grid">${ranked.map(team=>futureResultCard(team,false)).join("")}</div>
      ${footer('<button class="game-btn" data-flow-action="continue" type="button">CONTINUE</button>')}
    </section>`;
  }

  function renderCrisisV18(){
    const reveal = !gameState.events?.crisisRevealSeenV18;
    const teamCards = gameState.teams.map(team => `<article class="crisis-team-v18">
      <header><div class="strategy-team-icon">${team.identity.icon}</div><div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div></header>
      <div class="crisis-team-metrics"><span>NET WORTH <b>${money(calculateNetWorth(team))}</b></span><span class="pressure">PRESSURE <b>${clampPressure(team.destinationPressure)}</b></span></div>
      <div class="crisis-team-scores"><span>Visitor <b>${team.visitorExperience}/5</b></span><span>Resident <b>${team.residentWellbeing}/5</b></span><span>Environment <b>${team.environmentalHealth}/5</b></span></div>
      <small>Pressure already reduced Resident &amp; Environment before this crisis hit.</small>
    </article>`).join("");

    return `<section class="strategy-modern-screen future-era future-v18-screen crisis-v18-screen">
      <header class="strategy-modern-header"><div class="screen-kicker">2035 TOURISM CRISIS</div><h2>The destination is under pressure</h2><p>Years of tourism growth now collide with capacity, climate and resident limits.</p></header>
      <div class="crisis-v18-events"><span>👥 Demand surge</span><span>🏙️ Overcrowding</span><span>🌡️ Extreme weather</span><span>🚆 Transport strain</span><span>🏠 Resident frustration</span></div>
      <div class="crisis-v18-rule"><strong>CRISIS HIT</strong><span>Cash −$2</span><span>Visitor −2</span><span>Resident −1</span><span>Environment −1</span></div>
      <div class="future-objective-bar danger"><strong>NEXT ROUND GOAL</strong><span>REDUCE PRESSURE</span><i>+</i><span>PROTECT NET WORTH</span></div>
      <div class="crisis-team-grid-v18">${teamCards}</div>
      ${footer('<button class="game-btn" data-flow-action="continue" type="button">CHOOSE A FUTURE RESPONSE</button>')}
      ${reveal ? `<div class="crisis-reveal-overlay" role="dialog" aria-modal="true" aria-label="2035 Tourism Crisis reveal">
        <div class="crisis-reveal-card"><div class="crisis-reveal-icon">🚨</div><div class="crisis-reveal-kicker">CRISIS SHOCK</div><h2>2035 TOURISM CRISIS</h2><p>Tourism growth has outpaced the destination's ability to absorb it.</p><div class="crisis-reveal-rule">Your accumulated <strong>Destination Pressure</strong> now matters.</div><button class="game-btn" id="dismissCrisisRevealBtn" type="button">CONTINUE</button></div>
      </div>` : ""}
    </section>`;
  }

  function wrapUI(){
    if(document.documentElement.dataset.futureUiV18 === "true") return;
    document.documentElement.dataset.futureUiV18 = "true";

    if(typeof renderActions === "function"){
      const previous = renderActions;
      renderActions = function(){ return gameState.phase === "future" ? renderFutureActionsV18() : previous(); };
    }
    if(typeof renderSelection === "function"){
      const previous = renderSelection;
      renderSelection = function(){ return gameState.phase === "future" && navigationState?.selection?.action === "strategy" ? renderFutureSelectionV18() : previous(); };
    }
    if(typeof renderDecisionReview === "function"){
      const previous = renderDecisionReview;
      renderDecisionReview = function(){ return gameState.phase === "future" ? renderFutureReviewV18() : previous(); };
    }
    if(typeof renderCrisis === "function"){
      const previous = renderCrisis;
      renderCrisis = function(){ return gameState.phase === "future" ? renderCrisisV18() : previous(); };
    }
    if(typeof renderResults === "function"){
      const previous = renderResults;
      renderResults = function(){ return gameState.phase === "future" ? renderFutureResultsV18() : previous(); };
    }

    document.addEventListener("click",event => {
      const button = event.target.closest("#dismissCrisisRevealBtn");
      if(!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(!gameState.events) gameState.events = {};
      gameState.events.crisisRevealSeenV18 = true;
      if(typeof saveGameState === "function") saveGameState();
      if(typeof renderGame === "function") renderGame();
    },true);
  }

  function init(){
    if(typeof gameState === "undefined" || typeof futureStrategies === "undefined" ||
       typeof renderGame !== "function" || typeof renderActions !== "function") return false;
    loadStyles();
    wrapRules();
    applyPressureRebalance();
    wrapUI();

    const previousRenderGame = renderGame;
    if(document.documentElement.dataset.futureRenderV18 !== "true"){
      document.documentElement.dataset.futureRenderV18 = "true";
      renderGame = function(){
        applyPressureRebalance();
        previousRenderGame();
      };
    }
    window.setTimeout(() => renderGame(),0);
    return true;
  }

  if(!init()){
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if(init() || attempts > 240) window.clearInterval(timer);
    },50);
  }
})();

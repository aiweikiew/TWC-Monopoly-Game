"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/fit-event-v17.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/fit-event-v17.css";
    document.head.appendChild(link);
  }

  function isFITEvent(){
    return typeof gameState !== "undefined" && gameState.mode === "strategy" &&
      gameState.phase === "digital" && gameState.uiStage === "event";
  }

  function teamCard(team){
    const pressure = Number(team.destinationPressure || 0);
    const previousPressure = Math.max(0, pressure - 1);
    const status = team.digitalReady ? "DIGITAL READY" : "NOT DIGITAL READY";
    const outcomeClass = team.digitalReady ? "positive" : "neutral";
    const outcome = team.digitalReady ? "+$2 CASH" : "NO CASH BONUS";
    const explanation = team.digitalReady
      ? "Your digital channel captures the surge in independent demand."
      : "Demand grows, but your business is not positioned to capture the digital upside.";

    return `<article class="fit-team-card ${outcomeClass}">
      <header class="fit-team-head">
        <div class="fit-team-icon">${team.identity.icon}</div>
        <div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div>
      </header>

      <div class="fit-readiness ${team.digitalReady ? "ready" : "not-ready"}">${status}</div>

      <div class="fit-primary-result ${outcomeClass}">
        <span>MARKET OUTCOME</span>
        <strong>${outcome}</strong>
        <p>${escapeHTML(explanation)}</p>
      </div>

      <div class="fit-pressure-change">
        <div><span>DESTINATION PRESSURE</span><strong>${previousPressure} <em>→</em> ${pressure}</strong></div>
        <div class="fit-pressure-up">+1</div>
      </div>

      <div class="fit-strain-list">
        <span>👥 More visitors</span>
        <span>🚆 More transport load</span>
        <span>🏙️ More crowding</span>
      </div>

      <div class="fit-team-metrics">
        <div><span>NET WORTH</span><strong>${money(calculateNetWorth(team))}</strong></div>
        <div><span>CASH AFTER EVENT</span><strong>${money(team.cash)}</strong></div>
      </div>
    </article>`;
  }

  function renderFITEvent(){
    return `<section class="strategy-modern-screen digital-era event-modern-screen fit-event-screen">
      <header class="strategy-modern-header fit-event-header">
        <h2>FIT Boom</h2>
        <p><strong>Free Independent Travellers</strong> plan and book their own trips instead of relying on traditional package tours. Search, OTAs, online booking and navigation give travellers more autonomy.</p>
      </header>

      <aside class="fit-pressure-explainer">
        <div class="fit-pressure-icon">⚠</div>
        <div class="fit-pressure-copy">
          <span>WHAT DOES DESTINATION PRESSURE MEAN?</span>
          <strong>Growth creates strain the destination must absorb.</strong>
          <p>Crowding · transport load · resident friction · environmental stress</p>
        </div>
        <div class="fit-pressure-consequence">
          <span>CARRIES INTO 2035</span>
          <strong>Each Pressure point = −1 Resident &amp; −1 Environment</strong>
          <small>applied before the 2035 crisis penalties</small>
        </div>
      </aside>

      <div class="fit-team-grid">${gameState.teams.map(team => teamCard(team)).join("")}</div>

      <div class="strategy-footer fit-event-footer">
        <button class="game-btn secondary strategy-back-btn" id="strategyFlowBackBtn" type="button">← Back</button>
        <button class="game-btn secondary" id="strategyResetBtn" type="button">Reset Game</button>
        <button class="game-btn" data-flow-action="continue" type="button">CONTINUE → 2035 CRISIS</button>
      </div>
    </section>`;
  }

  function moveDigitalToFuture(){
    gameState.phase = "future";
    gameState.mode = "strategy";
    gameState.lastDecision = null;
    gameState.phaseComplete = false;
    gameState.decisions = {};
    gameState.currentTeam = 0;
    gameState.revaluationLog = [];
    gameState.message = "";
    gameState.uiStage = "crisis";
    applyFutureCrisis();
  }

  function enhance(){
    if(!isFITEvent()) return;
    const content = document.getElementById("phaseContent");
    if(!content || content.querySelector(".fit-event-screen")) return;
    content.innerHTML = renderFITEvent();
  }

  function init(){
    if(document.documentElement.dataset.fitEventV17 === "true") return true;
    if(typeof renderGame !== "function" || typeof continuePhaseStage !== "function" ||
       typeof applyFutureCrisis !== "function" || typeof gameState === "undefined" ||
       typeof calculateNetWorth !== "function" || typeof money !== "function") return false;
    if(document.documentElement.dataset.strategyLayoutV14 !== "true") return false;

    document.documentElement.dataset.fitEventV17 = "true";
    loadStyles();

    // FIT Boom is the final Digital-era result. Move directly into the Future crisis.
    // Store the FIT event itself so Back from 2035 returns to the exact previous game screen.
    const previousContinuePhaseStage = continuePhaseStage;
    continuePhaseStage = function(...args){
      if(gameState.phase === "digital" && gameState.uiStage === "event"){
        const before = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;
        moveDigitalToFuture();
        if(before && typeof commitFlowSnapshot === "function") commitFlowSnapshot(before);
        if(typeof saveGameState === "function") saveGameState();
        return;
      }
      return previousContinuePhaseStage.apply(this,args);
    };

    const previousRenderGame = renderGame;
    renderGame = function(){
      // Compatibility for test saves already sitting on the removed Digital results/handoff screens.
      // Their existing flow history still points back to the FIT event, so Back remains meaningful.
      if(gameState.phase === "digital" && ["results","pause"].includes(gameState.uiStage) && gameState.events?.fitBoom){
        moveDigitalToFuture();
        if(typeof saveGameState === "function") saveGameState();
      }
      previousRenderGame();
      enhance();
    };

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

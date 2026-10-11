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
        <div class="strategy-event-icon">📱</div>
        <div class="screen-kicker">SHARED MARKET EVENT · FIT = FREE INDEPENDENT TRAVELLER</div>
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
        <button class="game-btn" data-flow-action="continue" type="button">CONTINUE TO FUTURE SLIDES</button>
      </div>
    </section>`;
  }

  function renderDigitalHandoff(){
    return `<section class="strategy-modern-screen digital-era digital-handoff-screen">
      <div class="digital-handoff-wrap">
        <div class="digital-handoff-icon">↗</div>
        <div class="screen-kicker">PRESENTATION HANDOFF</div>
        <h2>Switch to Canva</h2>
        <p>The Digital era is complete. Continue the presentation before triggering the 2035 crisis.</p>
        <div class="digital-handoff-card">
          <span>SLIDES 13–15</span>
          <strong>The Future</strong>
          <p>Return to Tourismopoly after Regenerative Tourism.</p>
        </div>
      </div>
      <div class="strategy-footer digital-handoff-footer">
        <button class="game-btn secondary strategy-back-btn" id="strategyFlowBackBtn" type="button">← Back</button>
        <button class="game-btn secondary" id="strategyResetBtn" type="button">Reset Game</button>
        <button class="game-btn" data-next-phase="digital" type="button">RETURN TO GAME → 2035 CRISIS</button>
      </div>
    </section>`;
  }

  function enhance(){
    if(!isFITEvent()) return;
    const content = document.getElementById("phaseContent");
    if(!content || content.querySelector(".fit-event-screen")) return;
    content.innerHTML = renderFITEvent();
  }

  function init(){
    if(document.documentElement.dataset.fitEventV17 === "true") return true;
    if(typeof renderGame !== "function" || typeof renderPause !== "function" ||
       typeof continuePhaseStage !== "function" || typeof gameState === "undefined" ||
       typeof calculateNetWorth !== "function" || typeof money !== "function") return false;
    if(document.documentElement.dataset.strategyLayoutV14 !== "true") return false;

    document.documentElement.dataset.fitEventV17 = "true";
    loadStyles();

    // The FIT event is already the Digital-era result. Skip the redundant Digital results page.
    // Capture the event as history so Back from the presentation handoff returns here exactly.
    const previousContinuePhaseStage = continuePhaseStage;
    continuePhaseStage = function(...args){
      if(gameState.phase === "digital" && gameState.uiStage === "event"){
        const before = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;
        gameState.uiStage = "pause";
        gameState.message = "";
        if(before && typeof commitFlowSnapshot === "function") commitFlowSnapshot(before);
        if(typeof saveGameState === "function") saveGameState();
        return;
      }
      return previousContinuePhaseStage.apply(this,args);
    };

    // Replace the repetitive Digital checkpoint with a pure presentation handoff.
    const previousRenderPause = renderPause;
    renderPause = function(){
      if(gameState.phase === "digital" && gameState.uiStage === "pause") return renderDigitalHandoff();
      return previousRenderPause();
    };

    const previousRenderGame = renderGame;
    renderGame = function(){
      // Compatibility: saved test sessions already sitting on the removed results screen
      // are advanced to the new handoff without requiring a restart.
      if(gameState.phase === "digital" && gameState.uiStage === "results"){
        gameState.uiStage = "pause";
        gameState.message = "";
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

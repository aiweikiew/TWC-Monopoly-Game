"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/industrial-review-v12.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/industrial-review-v12.css";
    document.head.appendChild(link);
  }

  function isIndustrialReview(){
    return gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "review";
  }

  function isIndustrialLockedSummary(){
    return gameState.mode === "strategy" && gameState.phase === "steam" &&
      gameState.phaseComplete && gameState.uiStage === "pause";
  }

  function isIndustrialSummaryScreen(){
    return isIndustrialReview() || isIndustrialLockedSummary();
  }

  function actionClass(text){
    const value = String(text || "").toUpperCase();
    if(value.startsWith("BUY:")) return "buy";
    if(value.startsWith("SELL:")) return "sell";
    if(value.startsWith("ADAPT:")) return "adapt";
    if(value.includes("HOLD")) return "hold";
    if(value.includes("NO NEW INVESTMENT")) return "skip";
    return "neutral";
  }

  function decisionPieces(team){
    const raw = gameState.decisions?.[team.id] || "No decision recorded";
    return String(raw).split(" · ").filter(Boolean);
  }

  function renderDecisionCard(team,index){
    const pieces = decisionPieces(team);
    return `<article class="industrial-review-action-card team-${String.fromCharCode(97+index)}">
      <div class="industrial-review-action-head">
        <div class="industrial-review-team-icon">${team.identity.icon}</div>
        <div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div>
      </div>
      <div class="industrial-review-action-pills">
        ${pieces.map(piece => `<span class="industrial-review-action-pill ${actionClass(piece)}">${escapeHTML(piece)}</span>`).join("")}
      </div>
    </article>`;
  }

  function renderPortfolioCard(team,index){
    const debt = team.cash < 0;
    return `<article class="industrial-review-portfolio-card team-${String.fromCharCode(97+index)} ${debt ? "in-debt" : ""}">
      <header class="industrial-review-portfolio-head">
        <div class="industrial-review-team-id">
          <div class="industrial-review-team-icon">${team.identity.icon}</div>
          <div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div>
        </div>
        ${debt ? `<span class="industrial-review-debt-chip">IN DEBT</span>` : ""}
      </header>
      <div class="industrial-review-metrics">
        <div><span>NET WORTH</span><strong>${money(calculateNetWorth(team))}</strong></div>
        <div class="${debt ? "debt" : ""}"><span>${debt ? "DEBT" : "CASH"}</span><strong>${debt ? money(Math.abs(team.cash)) : money(team.cash)}</strong></div>
      </div>
      <div class="industrial-review-assets-title">NEW PORTFOLIO</div>
      <div class="industrial-review-assets">
        ${team.assets.length ? team.assets.map(asset => `<div class="industrial-review-asset-row"><span>${escapeHTML(asset.name)}</span><strong>${money(asset.currentValue)}</strong></div>`).join("") : '<div class="industrial-review-no-assets">No assets</div>'}
      </div>
    </article>`;
  }

  function renderIndustrialReview(locked = false){
    return `<section class="industrial-review-screen ${locked ? "locked" : ""}">
      <div class="industrial-review-header">
        <div class="screen-kicker">${locked ? "PORTFOLIOS LOCKED · INDUSTRIAL REVOLUTION" : "FINAL CHECK · INDUSTRIAL REVOLUTION"}</div>
        <h2>${locked ? "Industrial portfolios locked" : "Industrial decisions complete"}</h2>
        <p>${locked ? "The new portfolios are locked. Trigger the Jet Age when you are ready to continue." : "Review what each team changed, then compare the new portfolios before locking the era."}</p>
      </div>

      <section class="industrial-review-section industrial-review-actions-section">
        <div class="industrial-review-section-title"><span>1</span><div><strong>What each team just did</strong><small>Investment + portfolio move</small></div></div>
        <div class="industrial-review-action-grid">
          ${gameState.teams.map(renderDecisionCard).join("")}
        </div>
      </section>

      <section class="industrial-review-section industrial-review-portfolios-section">
        <div class="industrial-review-section-title"><span>2</span><div><strong>${locked ? "Locked team portfolios" : "New team portfolios"}</strong><small>Cash, net worth and businesses after the Industrial decisions</small></div></div>
        <div class="industrial-review-portfolio-grid">
          ${gameState.teams.map(renderPortfolioCard).join("")}
        </div>
      </section>

      <div class="industrial-review-controls">
        ${locked ? `
          <button class="game-btn secondary" id="industrialLockedBackBtn" type="button">← BACK</button>
          <button class="game-btn secondary" id="industrialReviewResetBtn" type="button">RESET GAME</button>
          <button class="game-btn industrial-shock-icon-btn" data-phase-shock="jet" type="button" aria-label="Trigger Jet Age Tech Shock" title="Trigger Jet Age Tech Shock">⚡</button>
        ` : `
          <button class="game-btn secondary" data-flow-action="undo" ${!gameState.lastDecision ? "disabled" : ""}>← BACK</button>
          <button class="game-btn secondary" id="industrialReviewResetBtn" type="button">RESET GAME</button>
          <button class="game-btn" data-flow-action="lock" type="button">LOCK INDUSTRIAL PORTFOLIOS</button>
        `}
      </div>
    </section>`;
  }

  function setReviewMode(active){
    const game = document.getElementById("gameScreen");
    if(game) game.classList.toggle("industrial-review-mode",active);
  }

  function backToUnlockedIndustrialReview(){
    if(!isIndustrialLockedSummary()) return;
    gameState.uiStage = "review";
    gameState.phaseComplete = true;
    gameState.message = "";
    if(typeof navigationState !== "undefined"){
      navigationState.selection = null;
      navigationState.previousViews = [];
    }
    if(typeof saveGameState === "function") saveGameState();
    renderGame();
  }

  function init(){
    if(document.documentElement.dataset.industrialReviewV12 === "true") return true;
    if(typeof renderDecisionReview !== "function" || typeof renderPause !== "function" ||
       typeof renderGame !== "function" || typeof calculateNetWorth !== "function") return false;

    document.documentElement.dataset.industrialReviewV12 = "true";
    loadStyles();

    const originalRenderDecisionReview = renderDecisionReview;
    renderDecisionReview = function(){
      if(isIndustrialReview()) return renderIndustrialReview(false);
      return originalRenderDecisionReview();
    };

    const originalRenderPause = renderPause;
    renderPause = function(){
      if(isIndustrialLockedSummary()) return renderIndustrialReview(true);
      return originalRenderPause();
    };

    const originalRenderGame = renderGame;
    renderGame = function(){
      originalRenderGame();
      setReviewMode(isIndustrialSummaryScreen());
    };

    document.addEventListener("click",event => {
      const back = event.target.closest("#industrialLockedBackBtn");
      if(back){
        event.preventDefault();
        event.stopImmediatePropagation();
        backToUnlockedIndustrialReview();
        return;
      }

      const reset = event.target.closest("#industrialReviewResetBtn");
      if(!reset) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      resetGame();
      renderGame();
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

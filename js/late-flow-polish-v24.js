"use strict";

(function(){
  function loadStyles(){
    const href="css/late-flow-polish-v24.css";
    if(document.querySelector(`link[href="${href}"]`)) return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=href;
    document.head.appendChild(link);
  }

  function futureStrategyName(team){
    const strategy=team?.futureStrategy && typeof futureStrategies!=="undefined" ? futureStrategies[team.futureStrategy] : null;
    return strategy?.name || "No strategy recorded";
  }

  function clampPressure(value){ return Math.max(0,Number(value || 0)); }

  function pauseTeamCard(team){
    return `<article class="future-pause-team">
      <div class="future-pause-team-head">
        <div class="strategy-team-icon">${team.identity.icon}</div>
        <div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div>
      </div>
      <div class="future-pause-metrics">
        <div><span>NET WORTH</span><strong>${money(calculateNetWorth(team))}</strong></div>
        <div class="pressure"><span>PRESSURE</span><strong>${clampPressure(team.destinationPressure)}</strong></div>
      </div>
      <div class="future-pause-strategy">${escapeHTML(futureStrategyName(team))}</div>
    </article>`;
  }

  function renderFuturePauseV24(){
    return `<section class="future-pause-v24">
      <header class="strategy-modern-header">
        <div class="screen-kicker">FUTURE ROUND COMPLETE</div>
        <h2>Adaptation choices locked</h2>
        <p>The teams have responded to destination pressure. Their final economic positions are now set.</p>
      </header>
      <div class="future-pause-cue">
        <div class="future-pause-cue-icon">✓</div>
        <div><span>PRESENTER CUE</span><strong>Slide 16 · Tourism Timeline Recap</strong><p>When you return to the game, reveal the money winner.</p></div>
      </div>
      <div class="future-pause-team-grid">${gameState.teams.map(pauseTeamCard).join("")}</div>
      <div class="future-pause-footer">
        <button class="game-btn secondary" id="strategyFlowBackBtn" type="button">← Back</button>
        <button class="game-btn secondary" id="strategyResetBtn" type="button">Reset Game</button>
        <button class="game-btn primary" data-next-phase="future" type="button">🏆 SHOW MONEY WINNER</button>
      </div>
    </section>`;
  }

  function repairRedundantFutureReview(){
    if(typeof gameState==="undefined" || gameState.phase!=="future" || gameState.uiStage!=="review") return false;
    const ready=(gameState.teams || []).length>0 && gameState.teams.every(team=>Boolean(team.futureStrategy));
    if(!ready) return false;
    gameState.phaseComplete=true;
    gameState.uiStage="results";
    gameState.lastDecision=null;
    gameState.message="Final strategies locked.";
    if(typeof saveGameState==="function") saveGameState();
    return true;
  }

  function install(){
    if(document.documentElement.dataset.lateFlowV24==="true") return true;
    if(typeof renderPause!=="function" || typeof renderGame!=="function" || typeof gameState==="undefined") return false;
    document.documentElement.dataset.lateFlowV24="true";
    loadStyles();

    const previousRenderPause=renderPause;
    renderPause=function(){
      if(gameState.phase==="future" && gameState.uiStage==="pause") return renderFuturePauseV24();
      return previousRenderPause();
    };

    const previousRenderGame=renderGame;
    renderGame=function(){
      repairRedundantFutureReview();
      return previousRenderGame();
    };

    repairRedundantFutureReview();
    window.setTimeout(()=>renderGame(),0);
    return true;
  }

  if(!install()){
    let attempts=0;
    const timer=window.setInterval(()=>{
      attempts+=1;
      if(install() || attempts>200) window.clearInterval(timer);
    },50);
  }
})();

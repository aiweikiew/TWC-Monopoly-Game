"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/industrial-summary-v10.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/industrial-summary-v10.css";
    document.head.appendChild(link);
  }

  function deltaLabel(delta){
    if(delta > 0) return `+$${delta}`;
    if(delta < 0) return `−$${Math.abs(delta)}`;
    return "$0";
  }

  function deltaClass(delta){
    return delta > 0 ? "gain" : delta < 0 ? "loss" : "flat";
  }

  function assetRowsForTeam(team){
    const remaining = gameState.revaluationLog
      .filter(row => row.team === team.name)
      .map(row => ({...row,used:false}));

    return team.assets.map(asset => {
      const row = remaining.find(item => !item.used && item.name === asset.name);
      if(row) row.used = true;
      const oldValue = row ? row.oldValue : asset.currentValue;
      const newValue = row ? row.newValue : asset.currentValue;
      return {name:asset.name,oldValue,newValue,delta:newValue-oldValue,digital:Boolean(asset.digital)};
    });
  }

  function teamSummary(team){
    const assets = assetRowsForTeam(team);
    const assetDelta = assets.reduce((sum,asset) => sum + asset.delta,0);
    const afterWorth = calculateNetWorth(team);
    const beforeWorth = afterWorth - assetDelta;
    return {team,assets,assetDelta,beforeWorth,afterWorth};
  }

  function assetRow(asset){
    const cls = deltaClass(asset.delta);
    const arrow = asset.delta > 0 ? "↑" : asset.delta < 0 ? "↓" : "→";
    return `<div class="industrial-asset-row ${cls}">
      <div class="industrial-asset-name">${escapeHTML(asset.name)}${asset.digital ? '<span class="industrial-digital-tag">DIGITAL</span>' : ""}</div>
      <div class="industrial-value-flow">
        <span class="industrial-old">${money(asset.oldValue)}</span>
        <span class="industrial-arrow">→</span>
        <strong class="industrial-new">${money(asset.newValue)}</strong>
      </div>
      <div class="industrial-asset-delta ${cls}"><span>${arrow}</span>${deltaLabel(asset.delta)}</div>
    </div>`;
  }

  function teamBlock(summary,index){
    const {team,assets,assetDelta,beforeWorth,afterWorth} = summary;
    const cls = deltaClass(assetDelta);
    const direction = assetDelta > 0 ? "GAIN" : assetDelta < 0 ? "LOSS" : "UNCHANGED";
    return `<article class="industrial-team-block team-${String.fromCharCode(97+index)} ${cls}">
      <header class="industrial-team-head">
        <div class="industrial-team-id">
          <div class="industrial-team-icon">${team.identity.icon}</div>
          <div>
            <div class="industrial-team-name">${escapeHTML(team.name)}</div>
            <div class="industrial-team-identity">${escapeHTML(team.identity.name)}</div>
          </div>
        </div>
        <div class="industrial-total-chip ${cls}"><span>${direction}</span><strong>${deltaLabel(assetDelta)}</strong></div>
      </header>

      <div class="industrial-worth-panel ${cls}">
        <div class="industrial-worth-label">NET WORTH</div>
        <div class="industrial-worth-flow">
          <span>${money(beforeWorth)}</span>
          <b>→</b>
          <strong>${money(afterWorth)}</strong>
        </div>
        <div class="industrial-worth-change ${cls}">${assetDelta > 0 ? "▲" : assetDelta < 0 ? "▼" : "—"} ${deltaLabel(assetDelta)}</div>
      </div>

      <div class="industrial-assets-label">OWNED BUSINESSES</div>
      <div class="industrial-assets-list">
        ${assets.length ? assets.map(assetRow).join("") : '<div class="industrial-no-assets">No owned assets</div>'}
      </div>
    </article>`;
  }

  function renderIndustrialSummary(){
    const summaries = gameState.teams.map(teamSummary);
    const strongest = summaries.reduce((best,item) => item.assetDelta > best.assetDelta ? item : best,summaries[0]);
    const weakest = summaries.reduce((worst,item) => item.assetDelta < worst.assetDelta ? item : worst,summaries[0]);

    return `<section class="industrial-summary-screen">
      <div class="industrial-summary-topline">
        <div>
          <div class="screen-kicker">TECHNOLOGY IMPACT · MARKET REVALUATION</div>
          <h2>The Industrial Revolution reshapes the market</h2>
          <p>Steam power and rail connectivity redistribute value across existing tourism businesses.</p>
        </div>
        <div class="industrial-market-callout">
          <span>MARKET SHIFT</span>
          <strong>${escapeHTML(strongest.team.name)} ${deltaLabel(strongest.assetDelta)}</strong>
          ${weakest !== strongest ? `<small>${escapeHTML(weakest.team.name)} ${deltaLabel(weakest.assetDelta)}</small>` : ""}
        </div>
      </div>

      <div class="industrial-team-grid">
        ${summaries.map(teamBlock).join("")}
      </div>

      <div class="industrial-summary-actions">
        <button class="game-btn secondary" id="revaluationShockBackBtn" type="button">← Back</button>
        <button class="game-btn" data-flow-action="continue" type="button">CONTINUE TO TEAM DECISIONS</button>
      </div>
    </section>`;
  }

  function setSummaryMode(active){
    const game = document.getElementById("gameScreen");
    if(!game) return;
    game.classList.toggle("industrial-summary-mode",active);
  }

  function init(){
    if(document.documentElement.dataset.industrialSummaryV10 === "true") return true;
    if(typeof renderRevaluation !== "function" || typeof renderGame !== "function" || typeof calculateNetWorth !== "function") return false;

    document.documentElement.dataset.industrialSummaryV10 = "true";
    loadStyles();

    const originalRenderRevaluation = renderRevaluation;
    renderRevaluation = function(){
      if(gameState.phase === "steam" && gameState.uiStage === "revaluation") return renderIndustrialSummary();
      return originalRenderRevaluation();
    };

    const originalRenderGame = renderGame;
    renderGame = function(){
      originalRenderGame();
      setSummaryMode(gameState.phase === "steam" && gameState.uiStage === "revaluation" && gameState.mode === "strategy");
    };

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

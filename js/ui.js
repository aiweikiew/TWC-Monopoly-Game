"use strict";

const setupScreen = document.getElementById("setupScreen");
const setupCards = document.getElementById("setupCards");
const setupSelectedEl = document.getElementById("setupSelected");
const setupDrawBtn = document.getElementById("setupDrawBtn");
const setupUndoBtn = document.getElementById("setupUndoBtn");
const setupResetBtn = document.getElementById("setupResetBtn");
const setupConfirmBtn = document.getElementById("setupConfirmBtn");
const setupPickStatus = document.getElementById("setupPickStatus");
const setupBanner = document.getElementById("setupBanner");
const setupStatus = document.getElementById("setupStatus");
const gameScreen = document.getElementById("gameScreen");
const industrialShockScreen = document.getElementById("industrialShockScreen");
const phaseContent = document.getElementById("phaseContent");
const playerPanel = document.getElementById("dynamicPlayers");
const moderatorControls = document.getElementById("moderatorControls");
const actionError = document.getElementById("actionError");
const backBtn = document.getElementById("backBtn");

function money(value){ return value < 0 ? `-$${Math.abs(value)}` : `$${value}`; }
function escapeHTML(value){
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function renderSetupCards(){
  setupCards.innerHTML = identityPool.map((x,idx)=>{
    const teamIdx = gameState.setupSelected.findIndex(s=>s.index===idx);
    const chosen = teamIdx >= 0;
    return `<article class="setup-card ${chosen?"selected":""}">
      <div class="setup-tag">${chosen?String.fromCharCode(65+teamIdx):""}</div>
      <div class="setup-icon">${x.icon}</div>
      <div class="setup-role">${x.name}</div>
      <div class="setup-desc">${x.desc}</div>
      <div class="setup-stats">
        <div class="setup-stat"><label>CASH</label><strong>$${x.cash}</strong></div>
        <div class="setup-stat"><label>NET WORTH</label><strong>$10</strong></div>
        <div class="setup-legacy">${assetTypes[x.legacyType].name} · $${assetTypes[x.legacyType].price}</div>
      </div>
    </article>`;
  }).join("");
}
function renderSetupSelection(){
  setupSelectedEl.innerHTML = setupTeams.map((team,i)=>{
    const entry = gameState.setupSelected[i];
    if(!entry){
      return `<div class="setup-slot empty"><div class="setup-slot-icon">${String.fromCharCode(65+i)}</div><div><div class="setup-slot-name">${team}</div><div class="setup-slot-role">${i===gameState.setupSelected.length?"Draws next...":"Waiting..."}</div></div><div class="setup-slot-worth"><label>NET WORTH</label><strong>—</strong></div></div>`;
    }
    const x = identityPool[entry.index];
    return `<div class="setup-slot"><div class="setup-slot-icon">${x.icon}</div><div><div class="setup-slot-name">${team}</div><div class="setup-slot-role">${x.name}<br>Cash $${x.cash} · ${assetTypes[x.legacyType].name} · $${assetTypes[x.legacyType].price}</div></div><div class="setup-slot-worth"><label>NET WORTH</label><strong>$10</strong></div></div>`;
  }).join("");
  const ready = gameState.setupSelected.length===3;
  setupDrawBtn.disabled = ready;
  setupUndoBtn.disabled = gameState.setupSelected.length===0;
  setupConfirmBtn.disabled = !ready;
  setupPickStatus.textContent = ready ? "3/3 drawn" : `${gameState.setupSelected.length}/3 drawn`;
  setupBanner.textContent = ready ? "All teams have drawn. Review identities, then confirm to start." : `${setupTeams[gameState.setupSelected.length]}, draw your identity.`;
  setupDrawBtn.textContent = ready ? "✓ All Teams Drawn" : `${setupTeams[gameState.setupSelected.length]} · Draw Identity`;
}
function renderPlayers(target = playerPanel){
  const showDigital = ["digital","future","winner"].includes(gameState.phase);
  const showFuture = ["future","winner"].includes(gameState.phase);
  target.innerHTML = gameState.teams.map((team,i) => {
    const active = gameState.uiStage === "decisions" && i === gameState.currentTeam;
    const done = Boolean(gameState.decisions[team.id]);
    return `<article class="player-card ${active ? "active" : ""}">
      <div class="player-head"><div class="avatar">${team.identity.icon}</div><div class="player-info"><div class="team">${team.name}</div><div class="identity">${escapeHTML(team.identity.name)}</div></div><div class="pawn">${team.id}</div></div>
      <div class="player-metrics"><span>NET WORTH <strong>${money(calculateNetWorth(team))}</strong></span><span>CASH <strong>${money(team.cash)}</strong></span></div>
      <ul class="portfolio-assets">${team.assets.map(asset => `<li>${escapeHTML(asset.name)} <strong>${money(asset.currentValue)}</strong>${asset.digital ? " · Digital" : ""}</li>`).join("") || "<li>No assets</li>"}</ul>
      ${showDigital ? `<div class="player-flags"><span>Digital Ready <strong>${team.digitalReady ? "YES" : "NO"}</strong></span><span>Pressure <strong>${team.destinationPressure}</strong></span></div>` : ""}
      ${showFuture ? `<div class="future-mini"><span>Visitor <strong>${team.visitorExperience}/5</strong></span><span>Resident <strong>${team.residentWellbeing}/5</strong></span><span>Environment <strong>${team.environmentalHealth}/5</strong></span></div><div class="strategy-mini">${team.futureStrategy ? futureStrategies[team.futureStrategy].name : "Strategy pending"}</div>` : ""}
      ${done ? `<div class="decision-record">✓ ${escapeHTML(gameState.decisions[team.id])}</div>` : active ? '<div class="player-status">YOUR MOVE</div>' : ""}
    </article>`;
  }).join("");
}
function actionButton(team, action, label, selection="", disabled=false){
  return `<button type="button" class="game-btn" data-action="${action}" data-team="${team.id}" data-phase="${gameState.phase}" data-selection="${selection}" ${disabled ? "disabled" : ""}>${label}</button>`;
}
function selectionAction(team, action, label, assets, cost){
  const selectId = `select-${action}`;
  const canAfford = team.cash >= cost;
  return `<div class="action-option secondary-action"><div class="action-label">${label}</div><select id="${selectId}" ${!assets.length || !canAfford ? "disabled" : ""}>${assets.length ? assets.map(asset => `<option value="${asset.id}">${escapeHTML(asset.name)} · ${money(asset.currentValue)}</option>`).join("") : '<option value="">No eligible assets</option>'}</select><button type="button" class="game-btn" data-action="${action}" data-team="${team.id}" data-phase="${gameState.phase}" data-select-id="${selectId}" ${!assets.length || !canAfford ? "disabled" : ""}>${action.toUpperCase()}${cost ? ` · $${cost}` : ""}</button>${!canAfford ? `<small>Requires $${cost} cash.</small>` : ""}</div>`;
}
function renderActions(){
  const team = gameState.teams[gameState.currentTeam];
  let html = `<section class="decision-panel flow-screen decision-screen"><div class="screen-kicker">TEAM DECISION · ${gameState.phase.toUpperCase()}</div><div class="decision-heading"><div><h2>${team.name}, choose one move</h2><p>Your choice is locked only after confirmation.</p></div><div class="decision-wallet"><span>Cash</span><strong>${money(team.cash)}</strong><small>Net Worth ${money(calculateNetWorth(team))}</small></div></div>`;
  if(gameState.phase === "future"){
    html += '<div class="quest-chip">1 FUTURE INNOVATION CREDIT · NO CASH COST</div><div class="action-grid future-actions">';
    for(const [key,strategy] of Object.entries(futureStrategies)) html += `<article class="action-option strategy-card"><div class="strategy-name">${strategy.name}</div><p>${strategy.purpose}</p><div class="impact-row"><span>Cash +$${strategy.cash}</span><span>Visitor +${strategy.visitorExperience}</span><span>Resident +${strategy.residentWellbeing}</span><span>Environment +${strategy.environmentalHealth}</span></div>${actionButton(team,"strategy",`CHOOSE ${strategy.name.toUpperCase()}`,key)}</article>`;
    return html + '</div></section>';
  }
  if(gameState.phase === "digital") html += '<div class="quest-chip">QUEST · BECOME DIGITALLY READY</div>';
  html += '<div class="action-grid investment-grid">';
  for(const type of markets[gameState.phase]){
    const asset = assetTypes[type];
    html += `<article class="action-option investment-card"><span class="action-tag">NEW INVESTMENT</span><strong>${escapeHTML(asset.name)}</strong><div class="action-price">${money(asset.price)}</div>${actionButton(team,"invest",`INVEST · ${money(asset.price)}`,type,team.cash < asset.price)}${team.cash < asset.price ? "<small>Insufficient cash</small>" : ""}</article>`;
  }
  html += '</div>';
  if(gameState.phase === "steam"){
    html += '<div class="secondary-actions">';
    html += selectionAction(team,"sell","Sell one asset at its current value",team.assets,0);
    html += selectionAction(team,"adapt","Adapt an eligible business; preserve its market value",team.assets.filter(asset => Object.hasOwn(adaptations,asset.type)),1);
    html += '</div><p class="action-help">Coach → Station Transfer · Inn → Railway-Era Hotel · Shipping → Steam Passenger Shipping · Publishing → Guidebook Publishing</p>';
  }
  if(gameState.phase === "digital") html += `<div class="secondary-actions">${selectionAction(team,"digitise","Digitise one tourism business; preserve its market value",team.assets.filter(asset => asset.tourism && !asset.digital),2)}</div>`;
  html += `<div class="hold-action">${actionButton(team,"hold","HOLD · KEEP CURRENT PORTFOLIO")}</div></section>`;
  return html;
}
function renderSelection(){
  const draft = navigationState.selection;
  const team = gameState.teams.find(t => t.id === draft.teamId);
  const asset = team.assets.find(a => a.id === draft.selection);
  const name = draft.action === "strategy" ? futureStrategies[draft.selection].name : draft.action === "invest" ? assetTypes[draft.selection].name : asset?.name || "No change";
  const explanations = {
    invest:"Cash is exchanged for a new asset of the same value.",sell:"The selected asset is sold at its current market value.",adapt:"Pay $1 to change the business form while preserving its current market value.",digitise:"Pay $2 to make this tourism business digitally ready while preserving its current value.",hold:"Keep the current portfolio unchanged.",strategy:"Use the team’s Future Innovation Credit."
  };
  return `<section class="flow-screen confirm-screen"><div class="confirm-card"><div class="screen-kicker">CONFIRM DECISION</div><h2>${team.name}</h2><div class="confirm-action">${escapeHTML(draft.action.toUpperCase())}</div><strong>${escapeHTML(name)}</strong><p>${explanations[draft.action]}</p><div class="confirm-note">Nothing is committed yet. Back abandons this choice.</div><button class="game-btn" type="button" id="confirmDecisionBtn">CONFIRM DECISION</button></div></section>`;
}
function renderRevaluation(){
  const rows = gameState.revaluationLog;
  const title = gameState.phase === "steam" ? "The Industrial Revolution reshapes the market" : gameState.phase === "jet" ? "The Jet Age rewrites long-distance travel" : "Digital platforms reshape intermediation";
  return `<section class="flow-screen revaluation-screen"><div class="screen-kicker">TECHNOLOGY IMPACT · MARKET REVALUATION</div><h2>${title}</h2><p class="screen-lede">Existing businesses are automatically revalued before teams make their next move.</p>${rows.length ? `<div class="revaluation-grid">${rows.map(row => {const delta=row.newValue-row.oldValue;return `<article class="value-card ${delta>0?"value-up":delta<0?"value-down":"value-flat"}"><span>${escapeHTML(row.team)}</span><strong>${escapeHTML(row.name)}</strong><div class="value-change"><em>${money(row.oldValue)}</em><b>→</b><em>${money(row.newValue)}</em></div><small>${delta>0?`▲ +$${delta}`:delta<0?`▼ -$${Math.abs(delta)}`:"No change"}</small></article>`;}).join("")}</div>` : '<div class="empty-impact">No owned assets were directly revalued.</div>'}${gameState.phase === "jet" ? '<div class="trajectory-card"><div><small>TEACHING EXAMPLE</small><strong>Passenger Shipping</strong></div><span>Pre-Industrial $4 → Steam $6 → Jet $3</span></div>' : ''}<button class="game-btn flow-continue" data-flow-action="continue">${gameState.phase === "jet" ? "LOCK JET VALUES & COMPLETE PAST ERA" : "CONTINUE TO TEAM DECISIONS"}</button></section>`;
}
function renderDecisionReview(){
  const title = gameState.phase === "steam" ? "Industrial decisions complete" : gameState.phase === "digital" ? "Digital decisions complete" : "Future strategies chosen";
  const lock = gameState.phase === "steam" ? "LOCK INDUSTRIAL PORTFOLIOS" : gameState.phase === "digital" ? "LOCK & REVEAL FIT BOOM" : "LOCK FINAL STRATEGIES";
  return `<section class="flow-screen review-screen"><div class="screen-kicker">FINAL CHECK</div><h2>${title}</h2><p class="screen-lede">Check the final move from each team before the game locks this era.</p><div class="decision-summary">${gameState.teams.map(team => `<div><strong>${team.name}</strong><span>${escapeHTML(gameState.decisions[team.id] || "Pending")}</span></div>`).join("")}</div><div class="review-actions"><button class="game-btn secondary" data-flow-action="undo" ${!gameState.lastDecision ? "disabled" : ""}>UNDO LAST DECISION</button><button class="game-btn" data-flow-action="lock">${lock}</button></div></section>`;
}
function renderDigitalEvent(){
  return `<section class="flow-screen event-screen"><div class="event-icon">📱</div><div class="screen-kicker">SHARED MARKET EVENT</div><h2>FREE INDEPENDENT TRAVEL BOOM</h2><p class="screen-lede">Travellers can now search, compare, book and navigate independently.</p><div class="event-effects"><div><strong>ALL TEAMS</strong><span>Destination Pressure +1</span></div><div><strong>DIGITAL READY</strong><span>Cash +$2</span></div><div><strong>NOT READY</strong><span>No economic bonus</span></div></div><button class="game-btn flow-continue" data-flow-action="continue">VIEW PRESENT ERA RESULTS</button></section>`;
}
function renderCrisis(){
  return `<section class="flow-screen crisis-screen"><div class="event-icon">🚨</div><div class="screen-kicker">2035 TOURISM CRISIS</div><h2>THE DESTINATION IS UNDER PRESSURE</h2><p class="screen-lede">Growth created value — but it also created pressure the destination now has to absorb.</p><div class="crisis-list"><span>Visitor demand surges</span><span>Major attraction overcrowded</span><span>Extreme weather disruption</span><span>Transport strained</span><span>Resident frustration rising</span></div><div class="crisis-impact"><strong>CRISIS IMPACT</strong><span>Cash −$2 · Visitor −2 · Resident −1 · Environment −1</span></div><button class="game-btn flow-continue" data-flow-action="continue">CHOOSE A FUTURE STRATEGY</button></section>`;
}
function renderResults(){
  const future = gameState.phase === "future";
  return `<section class="flow-screen results-screen"><div class="screen-kicker">${future ? "FINAL OUTCOMES" : "PRESENT ERA COMPLETE"}</div><h2>${future ? "How did each tourism system perform?" : "Digital transformation results"}</h2><div class="result-grid">${gameState.teams.map(team => `<article class="result-card"><div class="result-team">${team.name}</div><strong>${money(calculateNetWorth(team))}</strong><span>NET WORTH</span>${future ? `<div class="result-metrics"><span>Visitor <b>${team.visitorExperience}/5</b></span><span>Resident <b>${team.residentWellbeing}/5</b></span><span>Environment <b>${team.environmentalHealth}/5</b></span></div>` : `<div class="result-metrics"><span>Digital Ready <b>${team.digitalReady ? "YES" : "NO"}</b></span><span>Pressure <b>${team.destinationPressure}</b></span></div>`}</article>`).join("")}</div><button class="game-btn flow-continue" data-flow-action="continue">RETURN TO PRESENTATION CHECKPOINT</button></section>`;
}
function renderPause(){
  const info = phaseInfo[gameState.phase];
  if(gameState.phase === "steam"){
    return `<section class="flow-screen pause-screen"><div class="checkpoint-card"><div class="pause-mark">✓</div><div class="screen-kicker">PRESENTATION CHECKPOINT</div><h2>${info.complete}</h2><div class="handoff-steps"><span><b>1</b> Switch to Canva</span><strong>Slide 7 · Automobiles &amp; Highways</strong><span><b>2</b> Come back after Slide 7</span><span><b>3</b> Trigger the next disruption</span></div><button class="game-btn shock-action" data-phase-shock="jet">⚡ TRIGGER JET AGE TECH SHOCK</button></div></section>`;
  }
  if(gameState.phase === "jet"){
    return `<section class="flow-screen pause-screen"><div class="checkpoint-card"><div class="pause-mark">✓</div><div class="screen-kicker">PAST ERA COMPLETE</div><h2>Ready for the Digital Transformation?</h2><p>The next technology shock should appear before the class sees the digital slides.</p><button class="game-btn shock-action" data-phase-shock="digital">⚡ TRIGGER DIGITAL TECH SHOCK</button><small>After the reveal, switch to Canva Slides 11–12.</small></div></section>`;
  }
  if(gameState.phase === "digital"){
    return `<section class="flow-screen pause-screen"><div class="checkpoint-card"><div class="pause-mark">✓</div><div class="screen-kicker">PRESENTATION CHECKPOINT</div><h2>${info.complete}</h2><div class="handoff-steps"><span><b>1</b> Switch to Canva</span><strong>Slides 13–15 · The Future</strong><span><b>2</b> Return after Regenerative Tourism</span></div><button class="game-btn checkpoint-action" data-next-phase="digital">CONTINUE AFTER SLIDES → 2035 CRISIS</button></div></section>`;
  }
  if(gameState.phase === "future"){
    return `<section class="flow-screen pause-screen"><div class="checkpoint-card"><div class="pause-mark">✓</div><div class="screen-kicker">FINAL PRESENTATION CHECKPOINT</div><h2>${info.complete}</h2><div class="handoff-steps"><span><b>1</b> Switch to Canva</span><strong>Slide 16 · Tourism Timeline Recap</strong><span><b>2</b> Return to reveal the money winner</span></div><button class="game-btn checkpoint-action" data-next-phase="future">CONTINUE AFTER SLIDE 16 → SHOW WINNER</button></div></section>`;
  }
  return `<section class="flow-screen pause-screen"><div class="checkpoint-card"><div class="pause-mark">✓</div><div class="screen-kicker">GAME PAUSED</div><h2>${info.complete || "ERA COMPLETE"}</h2><strong>${info.returnTo}</strong></div></section>`;
}
function renderWinner(){
  const winners = getMoneyWinners();
  return `<section class="flow-screen winner-screen"><div class="winner-trophy">🏆</div><div class="screen-kicker">TOURISMOPOLY MONEY WINNER</div><h2>${winners.length > 1 ? "JOINT WINNERS" : winners[0].name}</h2><div class="winner-worth">${money(calculateNetWorth(winners[0]))}</div>${winners.length > 1 ? `<p>${winners.map(t => t.name).join(" · ")}</p>` : ""}<p>Highest calculated Net Worth wins the money game.</p><div class="winner-handoff">Return to Canva → <strong>But Did You Actually Win?</strong></div></section>`;
}
function renderHistoricalView(){
  const view = navigationState.currentView;
  setupScreen.classList.add("hidden");
  monopolyScreen.hidden = true;
  hideBoardOverlays();
  industrialShockScreen.hidden = true;
  gameScreen.hidden = false;
  document.getElementById("phaseTitle").textContent = view.phase === "setup" ? "IDENTITY DRAW" : phaseInfo[view.phase]?.title || "TOURISMOPOLY";
  document.getElementById("phaseEyebrow").textContent = view.label;
  document.getElementById("turnBadge").textContent = "PREVIOUS SCREEN";
  document.getElementById("statusText").textContent = "Confirmed gameplay remains unchanged.";
  phaseContent.innerHTML = `<section class="flow-screen historical-screen"><h2>${escapeHTML(view.label)}</h2><p>${escapeHTML(view.message || "Previous screen")}</p><button type="button" class="game-btn secondary" data-navigation="resume">RETURN TO CURRENT GAME</button></section>`;
  moderatorControls.innerHTML = "";
  renderPlayers();
}
function renderCurrentStage(){
  if(navigationState.currentView.type === "selection") return renderSelection();
  switch(gameState.uiStage){
    case "revaluation": return renderRevaluation();
    case "decisions": return renderActions();
    case "review": return renderDecisionReview();
    case "event": return renderDigitalEvent();
    case "crisis": return renderCrisis();
    case "results": return renderResults();
    case "pause": return renderPause();
    case "winner": return renderWinner();
    default: return '<section class="flow-screen"><h2>Ready</h2></section>';
  }
}
function configureShockScreen(title, buttonLabel, subtitle){
  document.getElementById("industrialShockTitle").textContent = title;
  document.getElementById("applyIndustrialBtn").textContent = buttonLabel;
  const subtitleEl = industrialShockScreen.querySelector("p:not(.shock-kicker)");
  if(subtitleEl) subtitleEl.textContent = subtitle || "Return to presentation";
  industrialShockScreen.dataset.shock = title.toLowerCase().replace(/\s+/g,"-");
  document.getElementById("shockError").textContent = "";
}
function pauseStatusText(){
  if(gameState.phase === "steam") return "Canva Slide 7 first. Then return and trigger the Jet Age shock.";
  if(gameState.phase === "jet") return "Trigger the Digital Tech Shock before Canva Slides 11–12.";
  if(gameState.phase === "digital") return "Return after Canva Slides 13–15 to start the 2035 Crisis.";
  if(gameState.phase === "future") return "Return after Canva Slide 16 to reveal the money winner.";
  return phaseInfo[gameState.phase]?.returnTo || "Presentation checkpoint";
}
function renderGame(){
  syncNavigation();
  saveGameState();
  backBtn.hidden = navigationState.currentView.type === "identity" || !navigationState.previousViews.length;
  backBtn.disabled = !canNavigateBack();
  document.body.classList.toggle("has-back", !backBtn.hidden);
  actionError.textContent = "";
  document.getElementById("undoDecisionBtn").hidden = true;
  industrialShockScreen.hidden = true;
  if(!isCurrentView()){ renderHistoricalView(); return; }
  if(gameState.phase === "industrialShockRevealed"){
    setupScreen.classList.add("hidden"); gameScreen.hidden = true; monopolyScreen.hidden = true;
    hideBoardOverlays(); rollBtn.disabled = true; nextBtn.disabled = true;
    configureShockScreen("INDUSTRIAL REVOLUTION","APPLY INDUSTRIAL REVOLUTION","Switch to Canva Slides 5–6. Apply the shock when you return.");
    industrialShockScreen.hidden = false;
    return;
  }
  if(gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "jetShock"){
    setupScreen.classList.add("hidden"); gameScreen.hidden = true; monopolyScreen.hidden = true;
    hideBoardOverlays();
    configureShockScreen("JET AGE","APPLY JET AGE","Switch to Canva Slides 8–10. Apply the Jet Age when you return.");
    industrialShockScreen.hidden = false;
    return;
  }
  if(gameState.mode === "strategy" && gameState.phase === "jet" && gameState.uiStage === "digitalShock"){
    setupScreen.classList.add("hidden"); gameScreen.hidden = true; monopolyScreen.hidden = true;
    hideBoardOverlays();
    configureShockScreen("DIGITAL TRANSFORMATION","APPLY DIGITAL TRANSFORMATION","Switch to Canva Slides 11–12. Apply the transformation when you return.");
    industrialShockScreen.hidden = false;
    return;
  }
  const setup = gameState.phase === "setup";
  const monopoly = gameState.mode === "monopoly";
  setupScreen.classList.toggle("hidden", !setup);
  gameScreen.hidden = setup || monopoly;
  monopolyScreen.hidden = !monopoly;
  if(!monopoly) hideBoardOverlays();
  if(setup){
    renderSetupCards(); renderSetupSelection(); setupStatus.textContent = gameState.message;
    phaseContent.innerHTML = ""; moderatorControls.innerHTML = ""; playerPanel.innerHTML = ""; return;
  }
  if(monopoly){ renderBoard(); return; }
  const info = phaseInfo[gameState.phase];
  gameScreen.dataset.era = gameState.phase;
  gameScreen.dataset.stage = gameState.uiStage;
  document.getElementById("phaseTitle").textContent = info.title;
  document.getElementById("phaseEyebrow").textContent = info.slides || "Tourismopoly";
  const statusLabels = {revaluation:"MARKET SHIFT",decisions:`${gameState.teams[gameState.currentTeam]?.name.toUpperCase()}'S DECISION`,review:"REVIEW BEFORE LOCKING",event:"SHARED EVENT",crisis:"CRISIS REVEAL",results:"ERA RESULTS",pause:"PRESENTATION CHECKPOINT",winner:"MONEY RESULT"};
  document.getElementById("turnBadge").textContent = statusLabels[gameState.uiStage] || "TOURISMOPOLY";
  document.getElementById("statusText").textContent = gameState.uiStage === "pause" ? pauseStatusText() : gameState.message;
  phaseContent.innerHTML = renderCurrentStage();
  moderatorControls.innerHTML = "";
  renderPlayers();
}
function runAndRender(callback){
  try { callback(); renderGame(); }
  catch(error){ actionError.textContent = error.message; }
}
setupDrawBtn.addEventListener("click", () => runAndRender(setupDraw));
setupUndoBtn.addEventListener("click", () => runAndRender(setupUndo));
setupResetBtn.addEventListener("click", () => runAndRender(setupReset));
setupConfirmBtn.addEventListener("click", () => runAndRender(applySetupFromDraw));
document.getElementById("resetGameBtn").addEventListener("click", () => runAndRender(resetGame));
backBtn.addEventListener("click", () => runAndRender(navigateBack));
document.getElementById("applyIndustrialBtn").addEventListener("click", () => {
  try {
    if(gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "jetShock") applyJetAge();
    else if(gameState.mode === "strategy" && gameState.phase === "jet" && gameState.uiStage === "digitalShock") applyDigitalTransformation();
    else applyIndustrialRevolution();
    renderGame();
  } catch(error){ document.getElementById("shockError").textContent = error.message; }
});
document.getElementById("undoDecisionBtn").addEventListener("click", () => runAndRender(undoLastDecision));
phaseContent.addEventListener("click", event => {
  const navigationButton = event.target.closest("button[data-navigation]");
  if(navigationButton){ runAndRender(resumeCurrentGame); return; }
  const shockButton = event.target.closest("button[data-phase-shock]");
  if(shockButton){
    runAndRender(shockButton.dataset.phaseShock === "jet" ? revealJetTechShock : revealDigitalTechShock);
    return;
  }
  const nextPhaseButton = event.target.closest("button[data-next-phase]");
  if(nextPhaseButton){ runAndRender(() => startNextPhase(nextPhaseButton.dataset.nextPhase)); return; }
  const flowButton = event.target.closest("button[data-flow-action]");
  if(flowButton){
    if(flowButton.dataset.flowAction === "continue") runAndRender(continuePhaseStage);
    else if(flowButton.dataset.flowAction === "lock") runAndRender(confirmPhaseReview);
    else if(flowButton.dataset.flowAction === "undo") runAndRender(undoLastDecision);
    return;
  }
  if(event.target.closest("#confirmDecisionBtn")){
    runAndRender(() => {
      const draft = navigationState.selection;
      requireRule(isCurrentView() && navigationState.currentView.type === "selection" && draft, "Select a current decision first.");
      takeAction(draft.teamId,draft.action,draft.selection,draft.phase);
    });
    return;
  }
  const button = event.target.closest("button[data-action]");
  if(!button || button.disabled) return;
  const {team,action,selection,selectId,phase} = button.dataset;
  runAndRender(() => openStrategySelection(team,action,selectId ? document.getElementById(selectId).value : selection,phase));
});
moderatorControls.addEventListener("click", event => {
  const button = event.target.closest("button[data-next-phase]");
  if(button && !button.disabled) runAndRender(() => startNextPhase(button.dataset.nextPhase));
});
renderGame();

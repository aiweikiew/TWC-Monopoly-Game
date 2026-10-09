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
  target.innerHTML = gameState.teams.map((team,i) => `
    <article class="player-card ${gameState.uiStage === "decisions" && i === gameState.currentTeam ? "active" : ""}">
      <div class="player-head"><div class="avatar">${team.identity.icon}</div><div class="player-info"><div class="team">${team.name}</div><div class="identity">${escapeHTML(team.identity.name)}</div></div><div class="pawn">${team.id}</div></div>
      <div class="portfolio-total">Net Worth <strong>${money(calculateNetWorth(team))}</strong> · Cash ${money(team.cash)}</div>
      <ul class="portfolio-assets">${team.assets.map(asset => `<li>${escapeHTML(asset.name)}: ${money(asset.currentValue)}${asset.digital ? " · Digital" : ""}</li>`).join("") || "<li>No assets</li>"}</ul>
      ${showDigital ? `<div>Digital Ready: <strong>${team.digitalReady ? "YES" : "NO"}</strong> · Pressure: ${team.destinationPressure}</div>` : ""}
      ${showFuture ? `<div>Visitor Experience: ${team.visitorExperience}/5<br>Resident Wellbeing: ${team.residentWellbeing}/5 · Environmental Health: ${team.environmentalHealth}/5</div><div>Strategy: ${team.futureStrategy ? futureStrategies[team.futureStrategy].name : "Pending"}</div>` : ""}
      ${gameState.decisions[team.id] ? `<div class="decision-record">✓ ${escapeHTML(gameState.decisions[team.id])}</div>` : ""}
    </article>`).join("");
}
function actionButton(team, action, label, selection="", disabled=false){
  return `<button type="button" class="game-btn" data-action="${action}" data-team="${team.id}" data-phase="${gameState.phase}" data-selection="${selection}" ${disabled ? "disabled" : ""}>${label}</button>`;
}
function selectionAction(team, action, label, assets, cost){
  const selectId = `select-${action}`;
  const canAfford = team.cash >= cost;
  return `<div class="action-option"><label for="${selectId}">${label}</label><select id="${selectId}" ${!assets.length || !canAfford ? "disabled" : ""}>${assets.length ? assets.map(asset => `<option value="${asset.id}">${escapeHTML(asset.name)} · ${money(asset.currentValue)}</option>`).join("") : '<option value="">No eligible assets</option>'}</select><button type="button" class="game-btn" data-action="${action}" data-team="${team.id}" data-phase="${gameState.phase}" data-select-id="${selectId}" ${!assets.length || !canAfford ? "disabled" : ""}>${action.toUpperCase()}${cost ? ` · $${cost}` : ""}</button>${!canAfford ? `<small>Requires $${cost} cash.</small>` : ""}</div>`;
}
function renderActions(){
  const team = gameState.teams[gameState.currentTeam];
  let html = `<section class="decision-panel"><div class="screen-kicker">TEAM DECISION</div><h2>${team.name} · Choose exactly ONE move</h2>`;
  if(gameState.phase === "future"){
    html += '<p>One Future Innovation Credit · No cash cost</p><div class="action-grid">';
    for(const [key,strategy] of Object.entries(futureStrategies)) html += `<article class="action-option"><strong>${strategy.name}</strong><p>${strategy.purpose}</p><p>Cash +$${strategy.cash} · Visitor +${strategy.visitorExperience}<br>Resident +${strategy.residentWellbeing} · Environment +${strategy.environmentalHealth}</p>${actionButton(team,"strategy",strategy.name,key)}</article>`;
    return html + '</div></section>';
  }
  if(gameState.phase === "digital") html += '<p><strong>QUEST: BECOME DIGITALLY READY</strong></p>';
  html += '<div class="action-grid">';
  for(const type of markets[gameState.phase]){
    const asset = assetTypes[type];
    html += `<div class="action-option"><strong>${escapeHTML(asset.name)} · $${asset.price}</strong>${actionButton(team,"invest",`INVEST · $${asset.price}`,type,team.cash < asset.price)}${team.cash < asset.price ? "<small>Insufficient cash</small>" : ""}</div>`;
  }
  if(gameState.phase === "steam"){
    html += selectionAction(team,"sell","Sell one asset at its current value",team.assets,0);
    html += selectionAction(team,"adapt","Adapt one eligible asset",team.assets.filter(asset => Object.hasOwn(adaptations,asset.type)),1);
    html += '<p class="action-help">Coach → Station Transfer · Inn → Railway-Era Hotel · Shipping → Steam Passenger Shipping · Publishing → Guidebook Publishing</p>';
  }
  if(gameState.phase === "digital") html += selectionAction(team,"digitise","Digitise one tourism business",team.assets.filter(asset => asset.tourism && !asset.digital),2);
  html += `</div><div class="hold-action">${actionButton(team,"hold","HOLD · No change")}</div></section>`;
  return html;
}
function renderSelection(){
  const draft = navigationState.selection;
  const team = gameState.teams.find(t => t.id === draft.teamId);
  const asset = team.assets.find(a => a.id === draft.selection);
  const name = draft.action === "strategy" ? futureStrategies[draft.selection].name : draft.action === "invest" ? assetTypes[draft.selection].name : asset?.name || "No change";
  return `<section class="decision-panel focus-card"><div class="screen-kicker">CONFIRM DECISION</div><h2>${team.name} · ${escapeHTML(draft.action.toUpperCase())}</h2><p><strong>${escapeHTML(name)}</strong></p><p>Nothing is committed until you confirm. Back abandons this choice.</p><button class="game-btn" type="button" id="confirmDecisionBtn">Confirm Decision</button></section>`;
}
function renderRevaluation(){
  const rows = gameState.revaluationLog;
  return `<section class="flow-screen revaluation-screen"><div class="screen-kicker">MARKET REVALUATION</div><h2>${phaseInfo[gameState.phase].title}</h2><p>Technology has changed what existing tourism businesses are worth.</p>${rows.length ? `<div class="revaluation-grid">${rows.map(row => `<article class="value-card"><span>${escapeHTML(row.team)}</span><strong>${escapeHTML(row.name)}</strong><div>${money(row.oldValue)} <b>→</b> ${money(row.newValue)}</div></article>`).join("")}</div>` : '<p>No owned assets were directly revalued.</p>'}${gameState.phase === "jet" ? '<div class="trajectory-card"><strong>Passenger Shipping</strong><span>Pre-Industrial $4 → Steam $6 → Jet $3</span></div>' : ''}<button class="game-btn flow-continue" data-flow-action="continue">${gameState.phase === "jet" ? "Complete Past Era" : "Continue to Team Decisions"}</button></section>`;
}
function renderDecisionReview(){
  const title = gameState.phase === "steam" ? "ALL TEAMS HAVE DECIDED" : gameState.phase === "digital" ? "DIGITAL DECISIONS COMPLETE" : "FUTURE STRATEGIES CHOSEN";
  const lock = gameState.phase === "steam" ? "CONFIRM & LOCK INDUSTRIAL PORTFOLIOS" : gameState.phase === "digital" ? "CONTINUE TO FIT BOOM" : "LOCK FINAL STRATEGIES";
  return `<section class="flow-screen review-screen"><div class="screen-kicker">REVIEW BEFORE LOCKING</div><h2>${title}</h2><div class="decision-summary">${gameState.teams.map(team => `<div><strong>${team.name}</strong><span>${escapeHTML(gameState.decisions[team.id] || "Pending")}</span></div>`).join("")}</div><p>Use Undo only if the most recent team needs to change its decision.</p><div class="review-actions"><button class="game-btn secondary" data-flow-action="undo" ${!gameState.lastDecision ? "disabled" : ""}>Undo Last Decision</button><button class="game-btn" data-flow-action="lock">${lock}</button></div></section>`;
}
function renderDigitalEvent(){
  return `<section class="flow-screen event-screen"><div class="event-icon">📱</div><div class="screen-kicker">SHARED MARKET EVENT</div><h2>FREE INDEPENDENT TRAVEL BOOM</h2><div class="event-effects"><div><strong>ALL TEAMS</strong><span>Destination Pressure +1</span></div><div><strong>DIGITAL READY</strong><span>Cash +$2</span></div><div><strong>NOT READY</strong><span>No economic bonus</span></div></div><button class="game-btn flow-continue" data-flow-action="continue">View Present Era Results</button></section>`;
}
function renderCrisis(){
  return `<section class="flow-screen crisis-screen"><div class="event-icon">🚨</div><div class="screen-kicker">2035 TOURISM CRISIS</div><h2>THE DESTINATION IS UNDER PRESSURE</h2><div class="crisis-list"><span>Visitor demand surges</span><span>Major attraction overcrowded</span><span>Extreme weather disruption</span><span>Transport strained</span><span>Resident frustration rising</span></div><div class="crisis-impact"><strong>CRISIS IMPACT</strong><span>Cash −$2 · Visitor −2 · Resident −1 · Environment −1</span></div><button class="game-btn flow-continue" data-flow-action="continue">Choose a Future Strategy</button></section>`;
}
function renderResults(){
  const future = gameState.phase === "future";
  return `<section class="flow-screen results-screen"><div class="screen-kicker">${future ? "FINAL OUTCOMES" : "PRESENT ERA COMPLETE"}</div><h2>${future ? "HOW DID EACH TOURISM SYSTEM PERFORM?" : "DIGITAL TRANSFORMATION RESULTS"}</h2><div class="result-grid">${gameState.teams.map(team => `<article class="result-card"><h3>${team.name}</h3><strong>${money(calculateNetWorth(team))}</strong><span>Net Worth</span>${future ? `<p>Visitor ${team.visitorExperience}/5<br>Resident ${team.residentWellbeing}/5<br>Environment ${team.environmentalHealth}/5</p>` : `<p>Digital Ready: ${team.digitalReady ? "YES" : "NO"}<br>Pressure: ${team.destinationPressure}</p>`}</article>`).join("")}</div><button class="game-btn flow-continue" data-flow-action="continue">Return to Presentation</button></section>`;
}
function renderPause(){
  const info = phaseInfo[gameState.phase];
  if(gameState.phase === "steam"){
    return `<section class="flow-screen pause-screen"><div class="pause-mark">✓</div><div class="screen-kicker">GAME PAUSED</div><h2>${info.complete}</h2><p>Return to presentation</p><strong>Automobiles &amp; Highways</strong><p class="compact-note">After Slide 7, come back here and trigger the Jet Age Tech Shock.</p></section>`;
  }
  return `<section class="flow-screen pause-screen"><div class="pause-mark">✓</div><div class="screen-kicker">GAME PAUSED</div><h2>${info.complete || "ERA COMPLETE"}</h2><p>Return to presentation</p><strong>${info.returnTo}</strong>${info.next ? `<p class="compact-note">Come back to Tourismopoly after the slides.</p>` : ""}</section>`;
}
function renderWinner(){
  const winners = getMoneyWinners();
  return `<section class="flow-screen winner-screen"><div class="winner-trophy">🏆</div><div class="screen-kicker">TOURISMOPOLY WINNER</div><h2>${winners.length > 1 ? "JOINT MONEY WINNERS" : winners[0].name}</h2><div class="winner-worth">${money(calculateNetWorth(winners[0]))}</div>${winners.length > 1 ? `<p>${winners.map(t => t.name).join(" · ")}</p>` : ""}<p>Highest calculated Net Worth wins the money game.</p><div class="winner-handoff">Return to presentation → <strong>But Did You Actually Win?</strong></div></section>`;
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
  document.getElementById("turnBadge").textContent = "VIEWING A PREVIOUS SCREEN";
  document.getElementById("statusText").textContent = "Navigation only. Confirmed gameplay remains unchanged.";
  phaseContent.innerHTML = `<section class="flow-screen historical-screen"><h2>${escapeHTML(view.label)}</h2><p>${escapeHTML(view.message || "Previous screen")}</p><p>This view is read-only.</p><button type="button" class="game-btn secondary" data-navigation="resume">Return to current game</button></section>`;
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
function configureShockScreen(title, buttonLabel){
  document.getElementById("industrialShockTitle").textContent = title;
  document.getElementById("applyIndustrialBtn").textContent = buttonLabel;
  document.getElementById("shockError").textContent = "";
}
function renderGame(){
  syncNavigation();
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
    document.getElementById("triggerShockBtn").disabled = true;
    configureShockScreen("INDUSTRIAL REVOLUTION","APPLY INDUSTRIAL REVOLUTION");
    industrialShockScreen.hidden = false;
    return;
  }
  if(gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "jetShock"){
    setupScreen.classList.add("hidden"); gameScreen.hidden = true; monopolyScreen.hidden = true;
    hideBoardOverlays();
    configureShockScreen("JET AGE","APPLY JET AGE");
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
  document.getElementById("phaseTitle").textContent = info.title;
  document.getElementById("phaseEyebrow").textContent = info.slides || "Tourismopoly";
  const statusLabels = {revaluation:"MARKET SHIFT",decisions:`${gameState.teams[gameState.currentTeam]?.name.toUpperCase()}'S DECISION`,review:"REVIEW BEFORE LOCKING",event:"SHARED EVENT",crisis:"CRISIS REVEAL",results:"ERA RESULTS",pause:"WAITING FOR PRESENTER",winner:"MONEY RESULT"};
  document.getElementById("turnBadge").textContent = statusLabels[gameState.uiStage] || "TOURISMOPOLY";
  document.getElementById("statusText").textContent = gameState.uiStage === "pause" ? `Return to presentation: ${gameState.phase === "steam" ? "Automobiles & Highways" : info.returnTo}` : gameState.message;
  phaseContent.innerHTML = renderCurrentStage();
  if(gameState.uiStage === "pause" && gameState.phase === "steam"){
    moderatorControls.innerHTML = '<button type="button" class="game-btn" data-jet-shock>⚡ TECH SHOCK</button>';
  } else {
    moderatorControls.innerHTML = gameState.uiStage === "pause" && info.next ? `<button type="button" class="game-btn" data-next-phase="${gameState.phase}">${info.next}</button>` : "";
  }
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
    else applyIndustrialRevolution();
    renderGame();
  } catch(error){ document.getElementById("shockError").textContent = error.message; }
});
document.getElementById("undoDecisionBtn").addEventListener("click", () => runAndRender(undoLastDecision));
phaseContent.addEventListener("click", event => {
  const navigationButton = event.target.closest("button[data-navigation]");
  if(navigationButton){ runAndRender(resumeCurrentGame); return; }
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
  const jetShockButton = event.target.closest("button[data-jet-shock]");
  if(jetShockButton && !jetShockButton.disabled){
    runAndRender(revealJetTechShock);
    return;
  }
  const button = event.target.closest("button[data-next-phase]");
  if(button && !button.disabled) runAndRender(() => startNextPhase(button.dataset.nextPhase));
});
renderGame();

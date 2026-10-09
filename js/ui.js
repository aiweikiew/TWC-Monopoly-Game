"use strict";

// Reused identity cards; all gameplay rendering reads the central state.

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
        <div class="setup-stat"><label>NET WORTH</label><strong>$${calculateNetWorth({cash:x.cash,assets:[{currentValue:assetTypes[x.legacyType].price}]})}</strong></div>
        <div class="setup-legacy">${assetTypes[x.legacyType].name} · $${assetTypes[x.legacyType].price}</div>
      </div>
    </article>`;
  }).join("");
}

function renderSetupSelection(){
  setupSelectedEl.innerHTML = setupTeams.map((team,i)=>{
    const entry = gameState.setupSelected[i];
    if(!entry){
      return `<div class="setup-slot empty">
        <div class="setup-slot-icon">${String.fromCharCode(65+i)}</div>
        <div><div class="setup-slot-name">${team}</div><div class="setup-slot-role">${i===gameState.setupSelected.length?"Draws next...":"Waiting..."}</div></div>
        <div class="setup-slot-worth"><label>NET WORTH</label><strong>—</strong></div>
      </div>`;
    }
    const x = identityPool[entry.index];
    return `<div class="setup-slot">
      <div class="setup-slot-icon">${x.icon}</div>
      <div><div class="setup-slot-name">${team}</div><div class="setup-slot-role">${x.name}<br>Cash $${x.cash} · ${assetTypes[x.legacyType].name} · $${assetTypes[x.legacyType].price}</div></div>
      <div class="setup-slot-worth"><label>NET WORTH</label><strong>$${calculateNetWorth({cash:x.cash,assets:[{currentValue:assetTypes[x.legacyType].price}]})}</strong></div>
    </div>`;
  }).join("");

  const ready = gameState.setupSelected.length===3;
  setupDrawBtn.disabled = ready;
  setupUndoBtn.disabled = gameState.setupSelected.length===0;
  setupConfirmBtn.disabled = !ready;


  if(ready){
    setupPickStatus.textContent = "3/3 drawn";
    setupBanner.textContent = "All teams have drawn. Review identities, then confirm to start.";
    setupDrawBtn.textContent = "✓ All Teams Drawn";
  } else {
    setupPickStatus.textContent = `${gameState.setupSelected.length}/3 drawn`;
    setupBanner.textContent = `${setupTeams[gameState.setupSelected.length]}, draw your identity.`;
    setupDrawBtn.textContent = `${setupTeams[gameState.setupSelected.length]} · Draw Identity`;
  }
}

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
function renderPlayers(target = playerPanel){
  const showDigital = ["digital","future","winner"].includes(gameState.phase);
  const showFuture = ["future","winner"].includes(gameState.phase);
  target.innerHTML = gameState.teams.map((team,i) => `
    <article class="player-card ${!gameState.phaseComplete && i === gameState.currentTeam ? "active" : ""}">
      <div class="player-head">
        <div class="avatar">${team.identity.icon}</div>
        <div class="player-info"><div class="team">${team.name}</div><div class="identity">${escapeHTML(team.identity.name)}</div></div>
        <div class="pawn">${team.id}</div>
      </div>
      <div class="portfolio-total">Net Worth <strong>${money(calculateNetWorth(team))}</strong> · Cash ${money(team.cash)}</div>
      <ul class="portfolio-assets">${team.assets.map(asset => `<li>${escapeHTML(asset.name)}: ${money(asset.currentValue)}${asset.digital ? " · Digital" : ""}</li>`).join("") || "<li>No assets</li>"}</ul>
      ${showDigital ? `<div>Digital Ready: <strong>${team.digitalReady ? "YES" : "NO"}</strong> · Pressure: ${team.destinationPressure}</div>` : ""}
      ${showFuture ? `<div>Visitor Experience: ${team.visitorExperience}/5<br>Resident Wellbeing: ${team.residentWellbeing}/5 · Environmental Health: ${team.environmentalHealth}/5</div><div>Strategy: ${team.futureStrategy ? futureStrategies[team.futureStrategy].name : "Pending · 1 credit"}</div>` : ""}
      ${gameState.decisions[team.id] && !showFuture ? `<div class="decision-record">✓ ${escapeHTML(gameState.decisions[team.id])}</div>` : ""}
    </article>`).join("");
}
function actionButton(team, action, label, selection="", disabled=false){
  return `<button type="button" class="game-btn" data-action="${action}" data-team="${team.id}" data-phase="${gameState.phase}" data-selection="${selection}" ${disabled ? "disabled" : ""}>${label}</button>`;
}
function selectionAction(team, action, label, assets, cost){
  const selectId = `select-${action}`;
  const canAfford = team.cash >= cost;
  return `<div class="action-option"><label for="${selectId}">${label}</label>
    <select id="${selectId}" ${!assets.length || !canAfford ? "disabled" : ""}>
      ${assets.length ? assets.map(asset => `<option value="${asset.id}">${escapeHTML(asset.name)} · ${money(asset.currentValue)}</option>`).join("") : '<option value="">No eligible assets</option>'}
    </select>
    <button type="button" class="game-btn" data-action="${action}" data-team="${team.id}" data-phase="${gameState.phase}" data-select-id="${selectId}" ${!assets.length || !canAfford ? "disabled" : ""}>${action.toUpperCase()}${cost ? ` · $${cost}` : ""}</button>
    ${!canAfford ? `<small>Requires $${cost} cash.</small>` : ""}</div>`;
}
function renderActions(){
  const team = gameState.teams[gameState.currentTeam];
  const phase = gameState.phase;
  let html = `<section class="decision-panel"><h2>${team.name} · Choose exactly ONE decision</h2>`;
  if(phase === "future"){
    html += '<p>One Future Innovation Credit · No cash cost</p><div class="action-grid">';
    for(const [key, strategy] of Object.entries(futureStrategies)){
      html += `<article class="action-option"><strong>${strategy.name}</strong><p>${strategy.purpose}</p><p>Cash +$${strategy.cash} · Visitor Experience +${strategy.visitorExperience}<br>Resident Wellbeing +${strategy.residentWellbeing} · Environmental Health +${strategy.environmentalHealth}</p>${actionButton(team,"strategy",strategy.name,key)}</article>`;
    }
    return html + '</div></section>';
  }
  if(phase === "digital") html += '<p><strong>QUEST: BECOME DIGITALLY READY</strong></p>';
  html += '<div class="action-grid">';
  for(const type of markets[phase]){
    const asset = assetTypes[type];
    html += `<div class="action-option"><strong>${escapeHTML(asset.name)} · $${asset.price}</strong>${actionButton(team,"invest",`INVEST · $${asset.price}`,type,team.cash < asset.price)}${team.cash < asset.price ? "<small>Insufficient cash</small>" : ""}</div>`;
  }
  if(phase === "steam"){
    html += selectionAction(team,"sell","Sell one asset at its current value",team.assets,0);
    html += selectionAction(team,"adapt","Adapt one asset; preserve its current value",team.assets.filter(asset => Object.hasOwn(adaptations, asset.type)),1);
    html += '<p class="action-help">Coach → Station Transfer Service · Inn → Railway-Era Hotel · Shipping → Steam Passenger Shipping · Publishing → Guidebook &amp; Travel Publishing</p>';
  }
  if(phase === "digital") html += selectionAction(team,"digitise","Digitise one business; preserve its current value",team.assets.filter(asset => asset.tourism && !asset.digital),2);
  html += `</div><div class="hold-action">${actionButton(team,"hold","HOLD · No change")}</div></section>`;
  return html;
}
function renderRevaluation(){
  if(!revaluations[gameState.phase]) return "";
  return `<section><h2>Market revaluation</h2>${gameState.revaluationLog.length ? `<table class="value-table"><thead><tr><th>Team</th><th>Asset</th><th>Old → New</th></tr></thead><tbody>${gameState.revaluationLog.map(row => `<tr><td>${row.team}</td><td>${escapeHTML(row.name)}</td><td>${money(row.oldValue)} → ${money(row.newValue)}</td></tr>`).join("")}</tbody></table>` : "<p>No owned assets affected.</p>"}<p class="compact-note">Other assets keep their current values. Net Worth updates immediately.</p></section>`;
}
function renderSelection(){
  const draft = navigationState.selection;
  const team = gameState.teams.find(t => t.id === draft.teamId);
  const asset = team.assets.find(a => a.id === draft.selection);
  const name = draft.action === "strategy" ? futureStrategies[draft.selection].name :
    draft.action === "invest" ? assetTypes[draft.selection].name : asset?.name || "No change";
  const effects = {
    invest:"Exchange cash for an asset of the same value.",sell:"Sell at the current market value.",
    adapt:"Pay $1 and change business form; preserve the current asset value.",
    digitise:"Pay $2 and mark this business digital; preserve its current value.",
    hold:"Keep your portfolio as it is.",strategy:"Use your one Future Innovation Credit at no cash cost."
  };
  const strategy = draft.action === "strategy" ? futureStrategies[draft.selection] : null;
  return `<section class="decision-panel"><h2>${team.name} · Confirm ${escapeHTML(draft.action.toUpperCase())}</h2>
    <p><strong>${escapeHTML(name)}</strong></p><p>${effects[draft.action]}</p>
    ${draft.action === "invest" ? `<p>Price: ${money(assetTypes[draft.selection].price)}</p>` : ""}
    ${asset ? `<p>Current asset value: ${money(asset.currentValue)}</p>` : ""}
    ${strategy ? `<p>Cash +$${strategy.cash} · Visitor Experience +${strategy.visitorExperience}<br>Resident Wellbeing +${strategy.residentWellbeing} · Environmental Health +${strategy.environmentalHealth}</p>` : ""}
    <p>Nothing has been confirmed. Back discards this selection.</p>
    <button class="game-btn" type="button" id="confirmDecisionBtn">Confirm Decision</button></section>`;
}
function renderHistoricalView(){
  const view = navigationState.currentView;
  setupScreen.classList.add("hidden");
  monopolyScreen.hidden = true;
  hideBoardOverlays();
  gameScreen.hidden = false;
  document.getElementById("phaseTitle").textContent = view.phase === "setup" ? "IDENTITY DRAW" : phaseInfo[view.phase].title;
  document.getElementById("phaseEyebrow").textContent = view.label;
  document.getElementById("turnBadge").textContent = "VIEWING A PREVIOUS SCREEN";
  document.getElementById("statusText").textContent = "Navigation only. Current portfolios remain committed.";
  let html = `<h2>${escapeHTML(view.label)}</h2><p>${escapeHTML(view.message)}</p>`;
  if(view.phase === "setup") html += `<p>${gameState.teams.map(team => `${team.name}: ${escapeHTML(team.identity.name)}`).join("<br>")}</p><p>Identities have been confirmed. Return to the current game to continue.</p>`;
  if(view.landing) html += `<p>${escapeHTML(view.teamName)} landed on ${escapeHTML(tileNames[view.landing.tile])}. This previous landing view cannot replay a confirmed action.</p>`;
  if(view.revaluationLog.length) html += `<table class="value-table"><thead><tr><th>Team</th><th>Asset</th><th>Revaluation</th></tr></thead><tbody>${view.revaluationLog.map(row => `<tr><td>${row.team}</td><td>${escapeHTML(row.name)}</td><td>${money(row.oldValue)} &rarr; ${money(row.newValue)}</td></tr>`).join("")}</tbody></table>`;
  if(view.type === "pause") html += `<p>Return to presentation: <strong>${phaseInfo[view.phase].returnTo}</strong></p>`;
  html += '<p>This view is read-only. The team panel shows current committed values.</p><button type="button" class="game-btn secondary" data-navigation="resume">Return to current game</button>';
  phaseContent.innerHTML = html;
  moderatorControls.innerHTML = "";
  renderPlayers();
}
function renderGame(){
  syncNavigation();
  backBtn.hidden = navigationState.currentView.type === "identity" || !navigationState.previousViews.length;
  backBtn.disabled = !canNavigateBack();
  document.body.classList.toggle("has-back", !backBtn.hidden);
  actionError.textContent = "";
  document.getElementById("undoDecisionBtn").hidden = true;
  industrialShockScreen.hidden = true;
  if(!isCurrentView()){
    renderHistoricalView();
    return;
  }
  if(gameState.phase === "industrialShockRevealed"){
    setupScreen.classList.add("hidden");
    gameScreen.hidden = true;
    monopolyScreen.hidden = true;
    hideBoardOverlays();
    rollBtn.disabled = true;
    nextBtn.disabled = true;
    document.getElementById("triggerShockBtn").disabled = true;
    industrialShockScreen.hidden = false;
    document.getElementById("shockError").textContent = "";
    return;
  }
  const setup = gameState.phase === "setup";
  const monopoly = gameState.mode === "monopoly";
  setupScreen.classList.toggle("hidden", !setup);
  gameScreen.hidden = setup || monopoly;
  monopolyScreen.hidden = !monopoly;
  if(!monopoly) hideBoardOverlays();
  if(setup){
    renderSetupCards();
    renderSetupSelection();
    setupStatus.textContent = gameState.message;
    phaseContent.innerHTML = "";
    moderatorControls.innerHTML = "";
    playerPanel.innerHTML = "";
    return;
  }
  if(monopoly){ renderBoard(); return; }
  const info = phaseInfo[gameState.phase];
  document.getElementById("phaseTitle").textContent = info.title;
  document.getElementById("phaseEyebrow").textContent = `${revaluations[gameState.phase] ? "TECH SHOCK · " : ""}${info.slides}`;
  document.getElementById("turnBadge").textContent = gameState.phaseComplete ? "WAITING FOR PRESENTER" : `${gameState.teams[gameState.currentTeam].name.toUpperCase()}'S DECISION`;
  document.getElementById("statusText").textContent = gameState.phaseComplete ? "All outcomes locked. Return to the presentation." : gameState.message;
  let html = renderRevaluation();
  if(gameState.phase === "jet") html += '<p class="teaching-note"><strong>Passenger Shipping</strong><br>Pre-Industrial: $4 → Steam Era: $6 → Jet Age: $3</p><p>Revaluation only. No team decisions in this phase.</p>';
  if(gameState.phase === "future") html += '<p>Visitor demand surges; a major attraction becomes overcrowded; extreme weather disrupts another attraction; transport is strained; residents are frustrated; travellers still expect seamless personalised journeys.</p><p class="teaching-note">Start at 3/5 for each outcome. Accumulated Destination Pressure reduces resident wellbeing and environmental health first.<br><strong>Crisis applied once:</strong> cash −$2 · visitor experience −2 · resident wellbeing −1 · environmental health −1. Scores stay within 0–5.</p>';
  if(gameState.phase === "digital" && gameState.events.fitBoom) html += '<p class="teaching-note"><strong>FREE INDEPENDENT TRAVEL BOOM</strong><br>All teams: Destination Pressure +1.<br>Digital Ready teams: cash +$2. Other teams: no economic bonus.<br>Shared event applied once.</p>';
  if(!gameState.phaseComplete) html += navigationState.currentView.type === "selection" ? renderSelection() : renderActions();
  if(gameState.phase === "winner"){
    const winners = getMoneyWinners();
    html += `<h2>${winners.length > 1 ? "Joint money winners" : "Money winner"}: ${winners.map(team => team.name).join(" & ")} · ${money(calculateNetWorth(winners[0]))}</h2><p>Highest calculated Net Worth determines the money winner. Visitor, resident and environmental outcomes remain visible alongside it.</p>`;
  }
  if(gameState.phaseComplete && navigationState.currentView.type === "pause"){
    html += `<section class="pause-panel"><h2>${info.complete || "MONEY RESULT COMPLETE"}</h2>${gameState.phase === "future" ? "<strong>FINAL OUTCOMES LOCKED</strong>" : ""}<p>Return to presentation:<br><strong>${info.returnTo}</strong></p><p>${info.next ? "The presenter starts the next phase after the slides." : "Continue to the Canva conclusion on slide 17."}</p></section>`;
  }
  if(gameState.phaseComplete && navigationState.currentView.type === "phase-review"){
    html += `<section class="pause-panel"><h2>${info.complete || "MONEY RESULT COMPLETE"}</h2><p>Completed phase review. Committed outcomes remain unchanged.</p><button class="game-btn secondary" data-navigation="pause" type="button">Return to presentation pause</button></section>`;
  }
  phaseContent.innerHTML = html;
  moderatorControls.innerHTML = info.next ? `<button type="button" class="game-btn" data-next-phase="${gameState.phase}" ${!gameState.phaseComplete ? "disabled" : ""}>${info.next}</button>` : "";
  document.getElementById("undoDecisionBtn").hidden = !gameState.lastDecision || navigationState.currentView.type === "selection";
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
  try {applyIndustrialRevolution();renderGame();}
  catch(error){document.getElementById("shockError").textContent = error.message;}
});
document.getElementById("undoDecisionBtn").addEventListener("click", () => runAndRender(undoLastDecision));
phaseContent.addEventListener("click", event => {
  const navigationButton = event.target.closest("button[data-navigation]");
  if(navigationButton){
    runAndRender(navigationButton.dataset.navigation === "pause" ? showPresentationPause : resumeCurrentGame);
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
  const {team, action, selection, selectId, phase} = button.dataset;
  runAndRender(() => openStrategySelection(team, action, selectId ? document.getElementById(selectId).value : selection, phase));
});
moderatorControls.addEventListener("click", event => {
  const button = event.target.closest("button[data-next-phase]");
  if(button && !button.disabled) runAndRender(() => startNextPhase(button.dataset.nextPhase));
});
renderGame();

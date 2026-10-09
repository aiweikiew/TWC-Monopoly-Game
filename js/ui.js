"use strict";

// Reused identity cards; all gameplay rendering reads the central state.

const setupScreen = document.getElementById("setupScreen");

const setupCards = document.getElementById("setupCards");

const setupSelectedEl = document.getElementById("setupSelected");

const setupDrawBtn = document.getElementById("setupDrawBtn");

const setupUndoBtn = document.getElementById("setupUndoBtn");

const setupResetBtn = document.getElementById("setupResetBtn");



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


  if(ready){
    setupPickStatus.textContent = "3/3 drawn";
    setupBanner.textContent = "All teams have drawn. Starting market is open.";
    setupDrawBtn.textContent = "✓ All Teams Drawn";
  } else {
    setupPickStatus.textContent = `${gameState.setupSelected.length}/3 drawn`;
    setupBanner.textContent = `${setupTeams[gameState.setupSelected.length]}, draw your identity.`;
    setupDrawBtn.textContent = `${setupTeams[gameState.setupSelected.length]} · Draw Identity`;
  }
}

const gameScreen = document.getElementById("gameScreen");
const phaseContent = document.getElementById("phaseContent");
const playerPanel = document.getElementById("dynamicPlayers");
const moderatorControls = document.getElementById("moderatorControls");
const actionError = document.getElementById("actionError");
function money(value){ return value < 0 ? `-$${Math.abs(value)}` : `$${value}`; }
function escapeHTML(value){
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function renderPlayers(){
  const showDigital = ["digital","future","winner"].includes(gameState.phase);
  const showFuture = ["future","winner"].includes(gameState.phase);
  playerPanel.innerHTML = gameState.teams.map((team,i) => `
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
function renderGame(){
  actionError.textContent = "";
  const setup = gameState.phase === "setup";
  setupScreen.classList.toggle("hidden", !setup);
  gameScreen.hidden = setup;
  if(setup){
    renderSetupCards();
    renderSetupSelection();
    setupStatus.textContent = gameState.message;
    phaseContent.innerHTML = "";
    moderatorControls.innerHTML = "";
    playerPanel.innerHTML = "";
    return;
  }
  const info = phaseInfo[gameState.phase];
  document.getElementById("phaseTitle").textContent = info.title;
  document.getElementById("phaseEyebrow").textContent = `${revaluations[gameState.phase] ? "TECH SHOCK · " : ""}${info.slides}`;
  document.getElementById("turnBadge").textContent = gameState.phaseComplete ? "WAITING FOR PRESENTER" : `${gameState.teams[gameState.currentTeam].name.toUpperCase()}'S DECISION`;
  document.getElementById("statusText").textContent = gameState.phaseComplete ? "All outcomes locked. Return to the presentation." : gameState.message;
  let html = renderRevaluation();
  if(gameState.phase === "starting") html += '<p>Invest in one asset or hold. Investments convert cash to assets of equal value. Multiple teams may buy the same asset type.</p>';
  if(gameState.phase === "jet") html += '<p class="teaching-note"><strong>Passenger Shipping</strong><br>Pre-Industrial: $4 → Steam Era: $6 → Jet Age: $3</p><p>Revaluation only. No team decisions in this phase.</p>';
  if(gameState.phase === "future") html += '<p>Visitor demand surges; a major attraction becomes overcrowded; extreme weather disrupts another attraction; transport is strained; residents are frustrated; travellers still expect seamless personalised journeys.</p><p class="teaching-note">Start at 3/5 for each outcome. Accumulated Destination Pressure reduces resident wellbeing and environmental health first.<br><strong>Crisis applied once:</strong> cash −$2 · visitor experience −2 · resident wellbeing −1 · environmental health −1. Scores stay within 0–5.</p>';
  if(gameState.phase === "digital" && gameState.events.fitBoom) html += '<p class="teaching-note"><strong>FREE INDEPENDENT TRAVEL BOOM</strong><br>All teams: Destination Pressure +1.<br>Digital Ready teams: cash +$2. Other teams: no economic bonus.<br>Shared event applied once.</p>';
  if(!gameState.phaseComplete) html += renderActions();
  if(gameState.phase === "winner"){
    const winners = getMoneyWinners();
    html += `<h2>${winners.length > 1 ? "Joint money winners" : "Money winner"}: ${winners.map(team => team.name).join(" & ")} · ${money(calculateNetWorth(winners[0]))}</h2><p>Highest calculated Net Worth determines the money winner. Visitor, resident and environmental outcomes remain visible alongside it.</p>`;
  }
  if(gameState.phaseComplete){
    html += `<section class="pause-panel"><h2>${info.complete || "MONEY RESULT COMPLETE"}</h2>${gameState.phase === "future" ? "<strong>FINAL OUTCOMES LOCKED</strong>" : ""}<p>Return to presentation:<br><strong>${info.returnTo}</strong></p><p>${info.next ? "The presenter starts the next phase after the slides." : "Continue to the Canva conclusion on slide 17."}</p></section>`;
  }
  phaseContent.innerHTML = html;
  moderatorControls.innerHTML = info.next ? `<button type="button" class="game-btn" data-next-phase="${gameState.phase}" ${!gameState.phaseComplete ? "disabled" : ""}>${info.next}</button>` : "";
  renderPlayers();
}
function runAndRender(callback){
  try { callback(); renderGame(); }
  catch(error){ actionError.textContent = error.message; }
}
setupDrawBtn.addEventListener("click", () => runAndRender(setupDraw));
setupUndoBtn.addEventListener("click", () => runAndRender(setupUndo));
setupResetBtn.addEventListener("click", () => runAndRender(setupReset));
document.getElementById("resetGameBtn").addEventListener("click", () => runAndRender(resetGame));
phaseContent.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if(!button || button.disabled) return;
  const {team, action, selection, selectId, phase} = button.dataset;
  runAndRender(() => takeAction(team, action, selectId ? document.getElementById(selectId).value : selection, phase));
});
moderatorControls.addEventListener("click", event => {
  const button = event.target.closest("button[data-next-phase]");
  if(button && !button.disabled) runAndRender(() => startNextPhase(button.dataset.nextPhase));
});
renderGame();

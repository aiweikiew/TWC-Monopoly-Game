"use strict";

// DOM references, identity/player rendering, landing popups, and visual animations.

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
        <div class="setup-stat"><label>NET WORTH</label><strong>$10</strong></div>
        <div class="setup-legacy">${x.legacy}</div>
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
        <div class="setup-slot-worth"><label>NET WORTH</label><strong>$10</strong></div>
      </div>`;
    }
    const x = identityPool[entry.index];
    return `<div class="setup-slot">
      <div class="setup-slot-icon">${x.icon}</div>
      <div><div class="setup-slot-name">${team}</div><div class="setup-slot-role">${x.name}<br>Cash $${x.cash} · ${x.legacy}</div></div>
      <div class="setup-slot-worth"><label>NET WORTH</label><strong>$10</strong></div>
    </div>`;
  }).join("");

  const ready = gameState.setupSelected.length===3;
  setupDrawBtn.disabled = ready;
  setupUndoBtn.disabled = gameState.setupSelected.length===0;
  setupConfirmBtn.disabled = !ready;

  if(ready){
    setupPickStatus.textContent = "3/3 drawn";
    setupBanner.textContent = "All teams have drawn. Confirm to begin.";
    setupDrawBtn.textContent = "✓ All Teams Drawn";
  } else {
    setupPickStatus.textContent = `${gameState.setupSelected.length}/3 drawn`;
    setupBanner.textContent = `${setupTeams[gameState.setupSelected.length]}, draw your identity.`;
    setupDrawBtn.textContent = `🎲 ${setupTeams[gameState.setupSelected.length]} · Draw Identity`;
  }
}

const board = document.getElementById("board");

const overlay = document.getElementById("diceOverlay");

const die = document.getElementById("die");

const rollCaption = document.getElementById("rollCaption");

const rollBtn = document.getElementById("rollBtn");

const nextBtn = document.getElementById("nextBtn");

const turnBadge = document.getElementById("turnBadge");

const statusText = document.getElementById("statusText");

const statusSub = document.getElementById("statusSub");

const playerPanel = document.getElementById("dynamicPlayers");

renderPlayers();

const cards = [...document.querySelectorAll(".player-card")];

const tiles = [...document.querySelectorAll(".tile[data-index]")];

const landingModal = document.getElementById("landingModal");

const landingEyebrow = document.getElementById("landingEyebrow");

const landingIcon = document.getElementById("landingIcon");

const landingTitle = document.getElementById("landingTitle");

const landingDesc = document.getElementById("landingDesc");

const landingPrice = document.getElementById("landingPrice");

const landingBalance = document.getElementById("landingBalance");

const buyBtn = document.getElementById("buyBtn");

const passBtn = document.getElementById("passBtn");

const chanceModal = document.getElementById("chanceModal");

const chanceTitle = document.getElementById("chanceTitle");

const chanceStory = document.getElementById("chanceStory");

const chanceEffect = document.getElementById("chanceEffect");

const chanceSector = document.getElementById("chanceSector");

const chanceContinueBtn = document.getElementById("chanceContinueBtn");

const feeModal = document.getElementById("feeModal");

const feeIcon = document.getElementById("feeIcon");

const feeTitle = document.getElementById("feeTitle");

const feeOwner = document.getElementById("feeOwner");

const feeAmount = document.getElementById("feeAmount");

const feeTransfer = document.getElementById("feeTransfer");

const feeSpecialNote = document.getElementById("feeSpecialNote");

const payFeeBtn = document.getElementById("payFeeBtn");

const ownModal = document.getElementById("ownModal");

const ownTitle = document.getElementById("ownTitle");

const ownDesc = document.getElementById("ownDesc");

const upgradeOffer = document.getElementById("upgradeOffer");

const alreadyUpgraded = document.getElementById("alreadyUpgraded");

const upgradeBenefit = document.getElementById("upgradeBenefit");

const upgradeBtn = document.getElementById("upgradeBtn");

const keepBtn = document.getElementById("keepBtn");

const ownContinueBtn = document.getElementById("ownContinueBtn");

const opportunityModal = document.getElementById("opportunityModal");

const opportunityBalance = document.getElementById("opportunityBalance");

const opportunityContinueBtn = document.getElementById("opportunityContinueBtn");

const startModal = document.getElementById("startModal");

const startBalance = document.getElementById("startBalance");

const startContinueBtn = document.getElementById("startContinueBtn");

const tokens = [
  createToken("A","a","Team A"),
  createToken("B","b","Team B"),
  createToken("C","c","Team C")
];

function createToken(label, cls, aria){
  const el = document.createElement("div");
  el.className = `token ${cls}`;
  el.textContent = label;
  el.setAttribute("aria-label", aria + " token");
  return el;
}

function placeToken(teamIndex, tileIndex, animate=false){
  const zone = tiles[tileIndex].querySelector(".token-zone");
  zone.appendChild(tokens[teamIndex]);
  if(animate){
    tokens[teamIndex].classList.remove("walking");
    void tokens[teamIndex].offsetWidth;
    tokens[teamIndex].classList.add("walking");
  }
}

tokens.forEach((_,i)=>placeToken(i,0,false));

function updateTurnUI(){
  turnBadge.textContent = `${gameState.teamNames[gameState.currentTeam]}'S TURN`;
  cards.forEach((card,i)=>card.classList.toggle("active",i===gameState.currentTeam));
}

async function animateDice(finalValue){
  overlay.classList.add("show");
  die.classList.add("rolling");
  rollCaption.textContent = `${gameState.teamNames[gameState.currentTeam]} ROLLING...`;

  for(let i=0;i<12;i++){
    die.textContent = faces[Math.floor(Math.random()*6)];
    await sleep(85);
  }

  die.classList.remove("rolling");
  die.textContent = faces[finalValue-1];
  rollCaption.textContent = `${gameState.teamNames[gameState.currentTeam]} ROLLED ${finalValue}`;
  await sleep(950);

  overlay.classList.remove("show");
  await sleep(260);
}

function showPropertyPopup(teamIndex, tileIndex){
  const p = properties[tileIndex];
  if(!p) return false;

  landingEyebrow.textContent = "UNOWNED PROPERTY";
  landingIcon.textContent = p.icon;
  landingTitle.textContent = p.name;
  landingDesc.textContent = p.desc;
  landingPrice.textContent = `$${p.price}`;
  landingBalance.textContent = `${gameState.teamNames[teamIndex]} Cash · $${gameState.cash[teamIndex]}`;
  buyBtn.disabled = gameState.cash[teamIndex] < p.price;
  landingModal.classList.add("show");
  nextBtn.disabled = true;
  return true;
}

function closeLandingPopup(){
  landingModal.classList.remove("show");
  nextBtn.disabled = false;
}

function showChancePopup(teamIndex){
  const card = chanceCards[Math.floor(Math.random()*chanceCards.length)];
  const result = evaluateChanceCard(teamIndex, card);

  chanceTitle.textContent = card.title;
  chanceStory.textContent = card.story;
  chanceEffect.textContent = result.effect > 0 ? `+$${result.effect}` : result.effect < 0 ? `-$${Math.abs(result.effect)}` : "$0";
  chanceSector.textContent = result.reason;

  if(result.effect !== 0){
    gameState.cash[teamIndex] = Math.max(0, gameState.cash[teamIndex] + result.effect);
    cards[teamIndex].querySelector(".cash-row").textContent = `Cash · $${gameState.cash[teamIndex]}`;
  }

  chanceModal.classList.add("show");
  nextBtn.disabled = true;

  statusText.textContent = `${gameState.teamNames[teamIndex]} drew a Situation Card`;
  statusSub.textContent = `Chance cards use small effects: beneficial +$1, harmful -$1, not relevant $0.`;
}

function showOwnedPropertyPopup(teamIndex, tileIndex){
  const owner = gameState.owners[tileIndex];
  const p = properties[tileIndex];
  const special = getSpecialisationSector(owner) === p.sector;

  let fee = 1;
  if(special) fee += 1;
  if(gameState.upgraded[tileIndex]) fee += 1;

  feeIcon.textContent = p.icon;
  feeTitle.textContent = p.name;
  feeOwner.textContent = `Owned by ${gameState.teamNames[owner]}`;
  feeAmount.textContent = `$${fee}`;
  feeTransfer.textContent = `${gameState.teamNames[teamIndex]} pays ${gameState.teamNames[owner]}.`;

  const notes = [];
  if(special) notes.push(`Specialisation Bonus: +$1 landing fee.`);
  if(gameState.upgraded[tileIndex]) notes.push(`Business Upgrade: +$1 landing fee.`);

  if(notes.length){
    feeSpecialNote.hidden = false;
    feeSpecialNote.textContent = notes.join(" ");
  } else {
    feeSpecialNote.hidden = true;
    feeSpecialNote.textContent = "";
  }

  gameState.pendingFee = {fee, owner};
  feeModal.classList.add("show");
  nextBtn.disabled = true;
}

function showOwnPropertyPopup(tileIndex){
  const p = properties[tileIndex];
  ownTitle.textContent = p.name;
  ownDesc.textContent = "You landed on your own tourism business.";

  const special = getSpecialisationSector(gameState.currentTeam) === p.sector;
  const futureFee = 1 + (special ? 1 : 0) + 1;

  if(gameState.upgraded[tileIndex]){
    upgradeOffer.hidden = true;
    alreadyUpgraded.hidden = false;
  } else {
    upgradeOffer.hidden = false;
    alreadyUpgraded.hidden = true;
    upgradeBenefit.textContent = `Upgrade for $1. Future visitors will pay $${futureFee} landing fee${special ? " because your Specialisation Bonus also applies" : ""}.`;
    upgradeBtn.disabled = gameState.cash[gameState.currentTeam] < 1;
  }

  ownModal.classList.add("show");
  nextBtn.disabled = true;
}

function showBusinessOpportunityPopup(teamIndex){
  gameState.cash[teamIndex] += 1;
  cards[teamIndex].querySelector(".cash-row").textContent = `Cash · $${gameState.cash[teamIndex]}`;
  opportunityBalance.textContent = `${gameState.teamNames[teamIndex]} Cash · $${gameState.cash[teamIndex]}`;
  opportunityModal.classList.add("show");
  nextBtn.disabled = true;
  statusText.textContent = `${gameState.teamNames[teamIndex]} found a Business Opportunity`;
  statusSub.textContent = "+$1 cash has been applied.";
}

function showStartPopup(teamIndex){
  startBalance.textContent = `${gameState.teamNames[teamIndex]} Cash · $${gameState.cash[teamIndex]}`;
  startModal.classList.add("show");
  nextBtn.disabled = true;
  statusText.textContent = `${gameState.teamNames[teamIndex]} reached GO`;
  statusSub.textContent = "Grand Tour Payday: +$1 cash.";
}

renderSetupCards();

renderSetupSelection();

updateTurnUI();

function renderPlayers(){
  playerPanel.innerHTML = gameState.setup.map((p,i)=>`
    <div class="player-card ${i===0?"active":""}" data-team="${i}">
      <div class="player-head">
        <div class="avatar">${p.icon}</div>
        <div class="player-info">
          <div class="team">${p.teamName}</div>
          <div class="identity">${p.roleName}</div>
        </div>
        <div class="pawn">${["🔵","🟣","🟢"][i]}</div>
      </div>
      <div class="networth-row"><div class="currency">$</div><div class="networth">${p.netWorth}</div></div>
      <div class="cash-row">Cash · $${gameState.cash[i]}</div>
      <div class="cash-row">Legacy · ${p.legacy}</div>
    </div>
  `).join("");
}

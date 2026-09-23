"use strict";

// Turn flow, tile movement, Chance evaluation, and landing action handlers.

function getTeamSectors(teamIndex){
  const owned = Object.entries(gameState.owners)
    .filter(([tileIdx, owner]) => owner === teamIndex)
    .map(([tileIdx]) => properties[Number(tileIdx)]?.sector)
    .filter(Boolean);

  if(owned.length > 0){
    return [...new Set(owned)];
  }

  return gameState.setup[teamIndex]?.sector ? [gameState.setup[teamIndex].sector] : ["none"];
}

function evaluateChanceCard(teamIndex, card){
  const sectors = getTeamSectors(teamIndex);
  const matched = [];

  for(const sector of sectors){
    const effect = card.sectorEffects[sector];
    if(effect){
      matched.push({sector,value:effect.value,reason:effect.reason});
    }
  }

  if(matched.length === 0){
    return {
      effect:0,
      reason:card.neutralReason || "No change to your business."
    };
  }

  const hasPositive = matched.some(x => x.value > 0);
  const hasNegative = matched.some(x => x.value < 0);

  if(hasPositive && hasNegative){
    return {
      effect:0,
      reason:"One of your businesses benefits while another is harmed, so the effects cancel out."
    };
  }

  const chosen = matched[0];
  return {
    effect:chosen.value > 0 ? 1 : -1,
    reason:chosen.reason
  };
}

function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

function getSpecialisationSector(teamIndex){
  return gameState.setup[teamIndex]?.sector || null;
}

function resolveLanding(teamIndex){
  const tileIndex = gameState.positions[teamIndex];

  if(properties[tileIndex]){
    if(gameState.owners[tileIndex] === undefined){
      showPropertyPopup(teamIndex, tileIndex);
      return;
    }
    if(gameState.owners[tileIndex] === teamIndex){
      showOwnPropertyPopup(tileIndex);
      return;
    }
    showOwnedPropertyPopup(teamIndex, tileIndex);
    return;
  }

  if(tileIndex === 2 || tileIndex === 6){
    showChancePopup(teamIndex);
    return;
  }

  if(tileIndex === 4){
    showBusinessOpportunityPopup(teamIndex);
    return;
  }

  if(tileIndex === 0){
    showStartPopup(teamIndex);
    return;
  }

  nextBtn.disabled = false;
}

async function moveToken(teamIndex, steps){
  statusText.textContent = `${gameState.teamNames[teamIndex]} is travelling...`;
  statusSub.textContent = `Moving ${steps} tile${steps===1?"":"s"} around the board.`;

  for(let step=0; step<steps; step++){
    const nextPos = (gameState.positions[teamIndex] + 1) % tiles.length;
    if(nextPos === 0){
      gameState.cash[teamIndex] += 1;
      cards[teamIndex].querySelector(".cash-row").textContent = `Cash · $${gameState.cash[teamIndex]}`;
    }
    gameState.positions[teamIndex] = nextPos;
    placeToken(teamIndex, gameState.positions[teamIndex], true);
    await sleep(430);
  }

  const landed = tileNames[gameState.positions[teamIndex]];
  statusText.textContent = `${gameState.teamNames[teamIndex]} landed on ${landed}`;
  statusSub.textContent = "Resolve the landing action before continuing.";
  resolveLanding(teamIndex);
}

async function rollDice(){
  if(gameState.busy) return;
  gameState.busy = true;
  rollBtn.disabled = true;
  nextBtn.disabled = true;

  const result = Math.floor(Math.random()*6)+1;
  statusText.textContent = "Rolling...";
  statusSub.textContent = "Watch the centre of the board.";

  await animateDice(result);
  await moveToken(gameState.currentTeam,result);

  gameState.busy = false;
}

function nextTeam(){
  if(gameState.busy) return;
  gameState.currentTeam = (gameState.currentTeam + 1) % gameState.teamNames.length;
  updateTurnUI();
  statusText.textContent = "Ready to roll";
  statusSub.textContent = "The dice appears briefly, your traveller moves, then the landing popup resolves the turn.";
  rollBtn.disabled = false;
  nextBtn.disabled = true;
  die.textContent = "⚀";
}

buyBtn.addEventListener("click",()=>{
  const tileIndex = gameState.positions[gameState.currentTeam];
  const p = properties[tileIndex];
  if(!p || gameState.cash[gameState.currentTeam] < p.price) return;
  gameState.cash[gameState.currentTeam] -= p.price;
  gameState.owners[tileIndex] = gameState.currentTeam;
  cards[gameState.currentTeam].querySelector(".cash-row").textContent = `Cash · $${gameState.cash[gameState.currentTeam]}`;
  statusText.textContent = `${gameState.teamNames[gameState.currentTeam]} bought ${p.name}`;
  statusSub.textContent = `Paid $${p.price}. Property ownership will be styled on the board in the next step.`;
  closeLandingPopup();
});

passBtn.addEventListener("click",()=>{
  const tileIndex = gameState.positions[gameState.currentTeam];
  const p = properties[tileIndex];
  statusText.textContent = `${gameState.teamNames[gameState.currentTeam]} passed on ${p ? p.name : "the property"}`;
  statusSub.textContent = "The property remains unowned.";
  closeLandingPopup();
});

chanceContinueBtn.addEventListener("click",()=>{
  chanceModal.classList.remove("show");
  statusText.textContent = `${gameState.teamNames[gameState.currentTeam]}'s Situation Card resolved`;
  statusSub.textContent = "Turn complete. Move to the next team.";
  nextBtn.disabled = false;
});

payFeeBtn.addEventListener("click",()=>{
  const {fee, owner} = gameState.pendingFee;

  const paid = Math.min(fee, gameState.cash[gameState.currentTeam]);
  gameState.cash[gameState.currentTeam] -= paid;
  gameState.cash[owner] += paid;

  cards[gameState.currentTeam].querySelector(".cash-row").textContent = `Cash · $${gameState.cash[gameState.currentTeam]}`;
  cards[owner].querySelector(".cash-row").textContent = `Cash · $${gameState.cash[owner]}`;

  feeModal.classList.remove("show");
  statusText.textContent = `${gameState.teamNames[gameState.currentTeam]} paid ${gameState.teamNames[owner]} $${paid}`;
  statusSub.textContent = "Landing fee resolved. Turn complete.";
  nextBtn.disabled = false;
});

upgradeBtn.addEventListener("click",()=>{
  const tileIndex = gameState.positions[gameState.currentTeam];
  const p = properties[tileIndex];
  if(!p || gameState.upgraded[tileIndex] || gameState.cash[gameState.currentTeam] < 1) return;

  gameState.cash[gameState.currentTeam] -= 1;
  gameState.upgraded[tileIndex] = true;
  cards[gameState.currentTeam].querySelector(".cash-row").textContent = `Cash · $${gameState.cash[gameState.currentTeam]}`;

  ownModal.classList.remove("show");
  statusText.textContent = `${gameState.teamNames[gameState.currentTeam]} upgraded ${p.name}`;
  statusSub.textContent = "Paid $1. Future visitors pay +$1 landing fee on this business.";
  nextBtn.disabled = false;
});

keepBtn.addEventListener("click",()=>{
  const tileIndex = gameState.positions[gameState.currentTeam];
  const p = properties[tileIndex];
  ownModal.classList.remove("show");
  statusText.textContent = `${gameState.teamNames[gameState.currentTeam]} kept ${p.name} as is`;
  statusSub.textContent = "No upgrade purchased. Turn complete.";
  nextBtn.disabled = false;
});

ownContinueBtn.addEventListener("click",()=>{
  ownModal.classList.remove("show");
  statusText.textContent = `${gameState.teamNames[gameState.currentTeam]} landed on their upgraded business`;
  statusSub.textContent = "No further Past Era upgrade is available. Turn complete.";
  nextBtn.disabled = false;
});

opportunityContinueBtn.addEventListener("click",()=>{
  opportunityModal.classList.remove("show");
  statusText.textContent = `${gameState.teamNames[gameState.currentTeam]} collected +$1`;
  statusSub.textContent = "Business Opportunity resolved. Turn complete.";
  nextBtn.disabled = false;
});

startContinueBtn.addEventListener("click",()=>{
  startModal.classList.remove("show");
  statusText.textContent = `${gameState.teamNames[gameState.currentTeam]} collected Grand Tour Payday`;
  statusSub.textContent = "+$1 cash received. Turn complete.";
  nextBtn.disabled = false;
});

rollBtn.addEventListener("click",rollDice);

nextBtn.addEventListener("click",nextTeam);

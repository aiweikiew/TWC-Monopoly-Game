"use strict";

// Random identity draw, undo/reset, confirmation, and Change Identities.

function setupDraw(){
  if(gameState.setupSelected.length>=3) return;
  const used = new Set(gameState.setupSelected.map(s=>s.index));
  const available = identityPool.map((_,i)=>i).filter(i=>!used.has(i));
  const index = available[Math.floor(Math.random()*available.length)];
  gameState.setupSelected.push({index});
  setupStatus.textContent = `${setupTeams[gameState.setupSelected.length-1]} drew ${identityPool[index].name}.`;
  renderSetupCards();
  renderSetupSelection();
}

function setupUndo(){
  if(!gameState.setupSelected.length) return;
  const removed=gameState.setupSelected.pop();
  setupStatus.textContent = `${identityPool[removed.index].name} returned to the pool.`;
  renderSetupCards();
  renderSetupSelection();
}

function setupReset(){
  gameState.setupSelected=[];
  setupStatus.textContent="Team A draws first.";
  renderSetupCards();
  renderSetupSelection();
}

function applySetupFromDraw(){
  gameState.setup = gameState.setupSelected.map((entry,i)=>{
    const r = identityPool[entry.index];
    return {
      teamIndex:i,
      teamName:setupTeams[i],
      roleKey:r.key,
      roleName:r.name,
      icon:r.icon,
      cash:r.cash,
      netWorth:10,
      legacy:r.legacy,
      legacyValue:r.legacyValue,
      sector:r.sector
    };
  });

  gameState.teamNames = gameState.setup.map(x=>x.teamName.toUpperCase());

  gameState.cash.splice(0,gameState.cash.length,...gameState.setup.map(x=>x.cash));
  gameState.positions.splice(0,gameState.positions.length,0,0,0);

  renderPlayers();

  cards.splice(0,cards.length,...document.querySelectorAll(".player-card"));

  tiles.forEach(tile=>{
    const zone=tile.querySelector(".token-zone");
    if(zone) zone.innerHTML="";
  });
  tokens.forEach((_,i)=>placeToken(i,0,false));

  gameState.currentTeam=0;
  statusText.textContent="Ready to roll";
  statusSub.textContent="The dice appears briefly, your traveller moves, then the landing popup resolves the turn.";
  rollBtn.disabled=false;
  nextBtn.disabled=true;
  setupScreen.classList.add("hidden");
  updateTurnUI();
}

setupDrawBtn.addEventListener("click",setupDraw);

setupUndoBtn.addEventListener("click",setupUndo);

setupResetBtn.addEventListener("click",setupReset);

setupConfirmBtn.addEventListener("click",()=>{
  if(gameState.setupSelected.length!==3) return;
  applySetupFromDraw();
});

document.getElementById("changeSetupBtn").addEventListener("click",()=>{
  document.getElementById("setupScreen").classList.remove("hidden");
});

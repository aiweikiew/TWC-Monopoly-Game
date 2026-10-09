"use strict";

// The legacy board renderer and animation engine adapted to the shared state.
const monopolyScreen = document.getElementById("monopolyScreen");
const tiles = [...monopolyScreen.querySelectorAll(".tile[data-index]")];
const rollBtn = document.getElementById("rollBtn");
const nextBtn = document.getElementById("nextBtn");
const overlay = document.getElementById("diceOverlay");
const die = document.getElementById("die");
const rollCaption = document.getElementById("rollCaption");
const tokens = [createToken("A","a","Team A"),createToken("B","b","Team B"),createToken("C","c","Team C")];
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
function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }
function isCurrentBoard(board){
  return gameState.board === board && gameState.mode === "monopoly";
}
async function animateDice(finalValue, board){
  overlay.classList.add("show");
  die.classList.add("rolling");
  rollCaption.textContent = `${gameState.teams[gameState.currentTeam].name.toUpperCase()} ROLLING...`;
  for(let i=0;i<12;i++){
    if(!isCurrentBoard(board)) return;
    die.textContent = faces[Math.floor(Math.random()*6)];
    await sleep(85);
  }
  if(!isCurrentBoard(board)) return;
  die.classList.remove("rolling");
  die.textContent = faces[finalValue-1];
  rollCaption.textContent = `${gameState.teams[gameState.currentTeam].name.toUpperCase()} ROLLED ${finalValue}`;
  await sleep(950);
  if(!isCurrentBoard(board)) return;
  overlay.classList.remove("show");
  await sleep(260);
}
async function moveToken(teamIndex, steps, board){
  gameState.message = `${gameState.teams[teamIndex].name} is travelling ${steps} tiles...`;
  beginMonopolyMovement();
  for(let step=0; step<steps; step++){
    if(!isCurrentBoard(board)) return;
    advanceMonopolyStep();
    renderGame();
    placeToken(teamIndex, board.positions[teamIndex], true);
    await sleep(430);
  }
  if(!isCurrentBoard(board)) return;
  resolveLanding();
  renderGame();
}
async function rollDice(){
  if(gameState.mode !== "monopoly" || gameState.board.status !== "ready") return;
  const board = beginMonopolyRoll();
  const teamIndex = gameState.currentTeam;
  renderGame();
  try {
    await animateDice(board.lastRoll,board);
    if(isCurrentBoard(board)) await moveToken(teamIndex,board.lastRoll,board);
  } catch(error){
    if(isCurrentBoard(board)) document.getElementById("boardError").textContent = error.message;
  }
}
function boardText(id,text){ document.getElementById(id).textContent = text; }
function showBoardModal(id){
  const modal = document.getElementById(id);
  modal.hidden = false;
  modal.classList.add("show");
}
function hideBoardOverlays(){
  monopolyScreen.querySelectorAll(".landing-modal").forEach(modal => {
    modal.hidden = true;
    modal.classList.remove("show");
  });
  if(gameState.mode !== "monopoly" || gameState.board.status !== "rolling"){
    overlay.classList.remove("show");
    die.classList.remove("rolling");
  }
}
function showPropertyPopup(teamIndex, tileIndex){
  const p = boardProperties[tileIndex];
  boardText("landingEyebrow","UNOWNED PROPERTY");
  boardText("landingIcon",p.icon);
  boardText("landingTitle",p.name);
  boardText("landingDesc",p.desc);
  boardText("landingPrice",money(p.price));
  boardText("landingBalance",`${gameState.teams[teamIndex].name} Cash · ${money(gameState.teams[teamIndex].cash)}`);
  document.getElementById("buyBtn").disabled = gameState.teams[teamIndex].cash < p.price;
  showBoardModal("landingModal");
}
function showChancePopup(){
  const landing = gameState.board.pendingLanding;
  const card = chanceCards[landing.cardIndex];
  boardText("chanceTitle",card.title);
  boardText("chanceStory",card.story);
  boardText("chanceEffect",landing.effect > 0 ? "+$1" : money(landing.effect));
  boardText("chanceSector",landing.reason);
  showBoardModal("chanceModal");
}
function showOwnedPropertyPopup(teamIndex, tileIndex){
  const p = boardProperties[tileIndex];
  const owner = gameState.teams.find(team => team.id === gameState.board.owners[tileIndex]);
  boardText("feeIcon",p.icon);
  boardText("feeTitle",p.name);
  boardText("feeOwner",`Owned by ${owner.name}`);
  boardText("feeAmount","$1");
  boardText("feeTransfer",`${gameState.teams[teamIndex].name} pays ${owner.name}.`);
  showBoardModal("feeModal");
}
function showOwnPropertyPopup(tileIndex){
  boardText("ownTitle",boardProperties[tileIndex].name);
  boardText("ownDesc","You landed on your own tourism business.");
  showBoardModal("ownModal");
}
function renderBoard(){
  const board = gameState.board;
  const teamIndex = gameState.currentTeam;
  boardText("boardError","");
  hideBoardOverlays();
  tokens.forEach((_,i) => placeToken(i,board.positions[i]));
  tiles.forEach((tile,i) => {
    let marker = tile.querySelector(".ownership-marker");
    if(!marker){marker = document.createElement("div");marker.className="ownership-marker";tile.appendChild(marker);}
    marker.textContent = board.owners[i] === undefined ? "" : `Owned by Team ${board.owners[i]}`;
  });
  rollBtn.disabled = board.status !== "ready";
  nextBtn.disabled = board.status !== "resolved";
  const presenting = navigationState.currentView.type === "presenter";
  document.getElementById("presenterControls").hidden = !presenting;
  document.getElementById("presenterBtn").disabled = navigationBusy();
  document.getElementById("presenterBtn").setAttribute("aria-expanded",String(presenting));
  document.getElementById("triggerShockBtn").disabled = !canTriggerTechShock();
  document.getElementById("undoTurnBtn").disabled = !canUndoGrandTourTurn();
  boardText("presenterRound",`Current Round: ${gameState.roundNumber}`);
  boardText("presenterTurns",`Total Turns: ${gameState.totalTurnCount}`);
  const landingOverview = board.status === "landing" && navigationState.currentView.type === "landing";
  document.getElementById("resolveLandingBtn").hidden = !landingOverview;
  boardText("boardTurnBadge",`${gameState.teams[teamIndex].name.toUpperCase()}'S TURN`);
  boardText("boardStatusText",gameState.message);
  boardText("boardStatusSub",`Round ${gameState.roundNumber} · ${gameState.totalTurnCount} turns complete`);
  renderPlayers(document.getElementById("boardPlayers"));
  if(board.status === "landing" && !landingOverview){
    const landing = board.pendingLanding;
    if(landing.kind === "property") showPropertyPopup(teamIndex,landing.tile);
    else if(landing.kind === "fee") showOwnedPropertyPopup(teamIndex,landing.tile);
    else if(landing.kind === "own") showOwnPropertyPopup(landing.tile);
    else if(landing.kind === "chance") showChancePopup();
    else if(landing.kind === "opportunity"){
      boardText("opportunityBalance",`${gameState.teams[teamIndex].name} Cash · ${money(gameState.teams[teamIndex].cash)} before collection`);
      showBoardModal("opportunityModal");
    } else {
      boardText("startBalance",`+$1 already collected during movement. Cash · ${money(gameState.teams[teamIndex].cash)}`);
      showBoardModal("startModal");
    }
  }
}

function boardAction(callback){
  try {callback();renderGame();}
  catch(error){boardText("boardError",error.message);}
}
rollBtn.addEventListener("click",rollDice);
document.getElementById("resolveLandingBtn").addEventListener("click",() => boardAction(openLandingDecision));
nextBtn.addEventListener("click",() => boardAction(nextTeam));
const landingButtons = {
  buyBtn:"buy",passBtn:"pass",payFeeBtn:"pay",ownContinueBtn:"continue",
  chanceContinueBtn:"continue",opportunityContinueBtn:"continue",startContinueBtn:"continue"
};
for(const [id,action] of Object.entries(landingButtons)){
  document.getElementById(id).addEventListener("click",() => boardAction(() => finishMonopolyLanding(action)));
}
document.getElementById("boardResetBtn").addEventListener("click",() => boardAction(resetGame));
document.getElementById("presenterBtn").addEventListener("click",() => boardAction(togglePresenterControls));
document.getElementById("undoTurnBtn").addEventListener("click",() => boardAction(undoLastGrandTourTurn));
document.getElementById("triggerShockBtn").addEventListener("click",() => boardAction(triggerTechShock));

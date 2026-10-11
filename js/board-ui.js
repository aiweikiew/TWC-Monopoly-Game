"use strict";

// Dedicated visual layer for the Grand Tour board. Keeping it separate from the shared
// flow styles lets us polish the board without affecting later-era screens.
if(typeof document !== "undefined" && !document.querySelector('link[href="css/board-v2.css"]')){
  const boardStyles = document.createElement("link");
  boardStyles.rel = "stylesheet";
  boardStyles.href = "css/board-v2.css";
  document.head.appendChild(boardStyles);
}

// The legacy board renderer and animation engine adapted to the shared state.
const monopolyScreen = document.getElementById("monopolyScreen");
const tiles = [...monopolyScreen.querySelectorAll(".tile[data-index]")];
const rollBtn = document.getElementById("rollBtn");
const nextBtn = document.getElementById("nextBtn");
const overlay = document.getElementById("diceOverlay");
const die = document.getElementById("die");
const rollCaption = document.getElementById("rollCaption");
const shockBtn = document.getElementById("presenterBtn");
const presenterControls = document.getElementById("presenterControls");
const undoTurnBtn = document.getElementById("undoTurnBtn");
const boardResetBtn = document.getElementById("boardResetBtn");
const triggerShockBtn = document.getElementById("triggerShockBtn");

// The old Presenter drawer is no longer part of the classroom flow.
// Reuse its top-level button as the one-click surprise Tech Shock control,
// and move Undo alongside it so the board keeps a compact control strip.
shockBtn.textContent = "⚡";
shockBtn.title = "Trigger Tech Shock";
shockBtn.setAttribute("aria-label","Trigger Tech Shock");
shockBtn.removeAttribute("aria-controls");
shockBtn.removeAttribute("aria-expanded");
shockBtn.classList.add("tech-shock-trigger");
presenterControls.hidden = true;
const topControls = shockBtn.parentElement;
topControls.insertBefore(undoTurnBtn, boardResetBtn);
undoTurnBtn.textContent = "Undo";
undoTurnBtn.title = "Undo last completed turn";
boardResetBtn.textContent = "Reset";
boardResetBtn.title = "Reset the game";
undoTurnBtn.classList.add("board-top-action");
boardResetBtn.classList.add("board-top-action");
triggerShockBtn.hidden = true;

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
  return gameState.board === board && gameState.mode === "monopoly" &&
    gameState.phase === "starting" && board.status !== "shock";
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
  if(gameState.mode !== "monopoly" || gameState.phase !== "starting" || gameState.board.status !== "ready") return;
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
  if(gameState.mode !== "monopoly" || gameState.phase !== "starting" || gameState.board.status !== "rolling"){
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
function ensureChanceImpactLayout(){
  const box = document.querySelector("#chanceModal .chance-effect-box");
  const label = box?.querySelector(".chance-effect-label");
  const effect = document.getElementById("chanceEffect");
  const reason = document.getElementById("chanceSector");
  if(!box || !label || !effect || !reason) return null;

  let business = document.getElementById("chanceBusiness");
  if(!business){
    business = document.createElement("div");
    business.id = "chanceBusiness";
    business.className = "chance-business";
    label.insertAdjacentElement("afterend",business);
  }

  // Keep the visual reading order: impact label → business → why → money effect.
  box.appendChild(effect);
  return {box,label,business,effect,reason};
}
function showChancePopup(){
  const landing = gameState.board.pendingLanding;
  const card = chanceCards[landing.cardIndex];
  const team = gameState.teams[gameState.currentTeam];
  const impact = ensureChanceImpactLayout();

  boardText("chanceTitle",card.title);
  boardText("chanceStory",card.story);
  boardText("chanceEffect",landing.effect > 0 ? "+$1" : money(landing.effect));
  boardText("chanceSector",landing.reason);

  if(impact){
    impact.label.textContent = `${team.name.toUpperCase()} · YOUR IMPACT`;
    impact.business.textContent = landing.impactBusinesses?.length
      ? landing.impactBusinesses.join(" · ")
      : "No Direct Exposure";
    impact.box.classList.toggle("positive",landing.effect > 0);
    impact.box.classList.toggle("negative",landing.effect < 0);
    impact.box.classList.toggle("neutral",landing.effect === 0);
  }

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
    if(!marker){
      marker = document.createElement("div");
      marker.className = "ownership-marker";
      tile.appendChild(marker);
    }
    const owner = board.owners[i];
    marker.classList.remove("owner-a","owner-b","owner-c");
    tile.classList.remove("owned-tile","current-team-tile");
    marker.textContent = owner === undefined ? "" : `Team ${owner} · Owned`;
    if(owner !== undefined){
      marker.classList.add(`owner-${String(owner).toLowerCase()}`);
      tile.classList.add("owned-tile");
    }
    if(board.positions[teamIndex] === i) tile.classList.add("current-team-tile");
  });

  rollBtn.disabled = board.status !== "ready";
  nextBtn.disabled = board.status !== "resolved";
  shockBtn.disabled = !canTriggerTechShock();
  undoTurnBtn.disabled = !canUndoGrandTourTurn();
  const landingOverview = board.status === "landing" && navigationState.currentView.type === "landing";
  document.getElementById("resolveLandingBtn").hidden = !landingOverview;
  boardText("boardTurnBadge",`${gameState.teams[teamIndex].name.toUpperCase()}'S TURN`);
  boardText("boardStatusText",gameState.message);
  boardText("boardStatusSub",`Round ${gameState.roundNumber} · ${gameState.totalTurnCount} completed turns`);

  const playerTarget = document.getElementById("boardPlayers");
  renderPlayers(playerTarget);
  [...playerTarget.querySelectorAll(".player-card")].forEach((card,i) => {
    card.classList.toggle("active",i === teamIndex);
  });

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
      boardText("startBalance",`+$1 was automatically added as the traveller crossed GO. Cash · ${money(gameState.teams[teamIndex].cash)}`);
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
boardResetBtn.addEventListener("click",() => boardAction(resetGame));
undoTurnBtn.addEventListener("click",() => boardAction(undoLastGrandTourTurn));
shockBtn.addEventListener("click",() => boardAction(triggerTechShock));

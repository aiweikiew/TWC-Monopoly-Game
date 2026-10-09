"use strict";

// Legacy Situation Card evaluation, now reading actual portfolio sectors.
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
    return {effect:0,reason:card.neutralReason || "No change to your business."};
  }

  const hasPositive = matched.some(x => x.value > 0);
  const hasNegative = matched.some(x => x.value < 0);
  if(hasPositive && hasNegative){
    return {effect:0,reason:"One of your businesses benefits while another is harmed, so the effects cancel out."};
  }

  const chosen = matched[0];
  return {effect:chosen.value > 0 ? 1 : -1,reason:chosen.reason};
}

function getTeamSectors(teamIndex){
  const team = gameState.teams[teamIndex];
  const owned = team.assets.filter(a => a.boardTile !== undefined)
    .map(a => boardProperties[a.boardTile].sector);
  if(owned.length) return [...new Set(owned)];
  const sectors = team.assets.map(a => legacySectors[a.type]).filter(Boolean);
  return sectors.length ? [...new Set(sectors)] : ["none"];
}
function requireMonopoly(status){
  requireRule(gameState.mode === "monopoly" && gameState.phase === "starting" && !gameState.phaseComplete,
    "Grand Tour board actions are only available before the Tech Shock.");
  if(status) requireRule(gameState.board.status === status, "Finish the current turn step first.");
  return gameState.board;
}
function beginMonopolyRoll(result = Math.floor(Math.random() * 6) + 1){
  const board = requireMonopoly("ready");
  requireRule(Number.isInteger(result) && result >= 1 && result <= 6, "A roll must be between 1 and 6.");
  board.history = [JSON.parse(JSON.stringify({
    teams:gameState.teams,currentTeam:gameState.currentTeam,nextAssetId:gameState.nextAssetId,
    positions:board.positions,owners:board.owners,rolls:board.rolls,
    totalTurnCount:gameState.totalTurnCount,roundNumber:gameState.roundNumber,message:gameState.message
  }))];
  board.rolls[gameState.currentTeam] += 1;
  board.lastRoll = result;
  board.stepsRemaining = result;
  board.status = "rolling";
  gameState.message = `${gameState.teams[gameState.currentTeam].name} is rolling...`;
  return board;
}
function beginMonopolyMovement(){ requireMonopoly("rolling").status = "moving"; }
function advanceMonopolyStep(){
  const board = requireMonopoly("moving");
  requireRule(board.stepsRemaining > 0, "This roll has already finished moving.");
  const teamIndex = gameState.currentTeam;
  const team = gameState.teams[teamIndex];
  board.positions[teamIndex] = (board.positions[teamIndex] + 1) % tileNames.length;

  // GO payday is automatic the instant a traveller crosses/reaches tile 0.
  // This means a player does not need to LAND on GO to receive the money.
  if(board.positions[teamIndex] === 0){
    team.cash += 1;
    gameState.message = `${team.name} passed GO and automatically collected +$1.`;
  }
  board.stepsRemaining -= 1;
}
function resolveLanding(){
  const board = requireMonopoly("moving");
  requireRule(board.stepsRemaining === 0, "Finish token movement before resolving the landing.");
  const team = gameState.teams[gameState.currentTeam];
  const tile = board.positions[gameState.currentTeam];
  let landing = {tile,teamId:team.id};
  if(boardProperties[tile]){
    const owner = board.owners[tile];
    landing.kind = owner === undefined ? "property" : owner === team.id ? "own" : "fee";
    if(owner !== undefined) landing.owner = owner;
  } else if(tile === 2 || tile === 6){
    const cardIndex = Math.floor(Math.random() * chanceCards.length);
    landing = {...landing,kind:"chance",cardIndex,...evaluateChanceCard(gameState.currentTeam,chanceCards[cardIndex])};
  } else landing.kind = tile === 4 ? "opportunity" : "go";
  board.pendingLanding = landing;
  board.status = "landing";
  gameState.message = landing.kind === "go"
    ? `${team.name} reached GO. The +$1 payday was collected automatically.`
    : `${team.name} landed on ${tileNames[tile]}. Resolve the landing.`;
}
function finishMonopolyLanding(action){
  const board = requireMonopoly("landing");
  const landing = board.pendingLanding;
  const team = gameState.teams[gameState.currentTeam];
  requireRule(landing && landing.teamId === team.id, "This landing is no longer current.");
  const allowed = {property:["buy","pass"],fee:["pay"],own:["continue"],chance:["continue"],opportunity:["continue"],go:["continue"]};
  requireRule(allowed[landing.kind].includes(action), "Choose a valid landing action.");
  if(action === "buy"){
    const property = boardProperties[landing.tile];
    requireRule(board.owners[landing.tile] === undefined, "This property is already owned.");
    requireRule(team.cash >= property.price, "Insufficient cash for this property.");
    const asset = createAsset(boardAssetTypes[landing.tile]);
    asset.boardTile = landing.tile;
    team.cash -= property.price;
    team.assets.push(asset);
    board.owners[landing.tile] = team.id;
  } else if(landing.kind === "fee"){
    const owner = gameState.teams.find(t => t.id === landing.owner);
    requireRule(owner && owner !== team, "Invalid service fee recipient.");
    team.cash -= 1; owner.cash += 1;
  } else if(landing.kind === "opportunity") team.cash += 1;
  else if(landing.kind === "chance") team.cash += landing.effect;
  board.pendingLanding = null;
  gameState.totalTurnCount += 1;
  gameState.roundNumber = Math.floor(gameState.totalTurnCount / gameState.teams.length) + 1;
  board.status = "resolved";
  gameState.message = landing.kind === "go"
    ? `${team.name} collected +$1 at GO. Select Next Team.`
    : `${team.name}'s turn is complete. Select Next Team.`;
}
function nextTeam(){
  const board = requireMonopoly("resolved");
  gameState.currentTeam = gameState.totalTurnCount % gameState.teams.length;
  board.status = "ready";
  board.lastRoll = null;
  gameState.message = "Ready to roll.";
}
function restoreGrandTourSnapshot(snapshot){
  const board = gameState.board;
  gameState.teams = snapshot.teams;
  gameState.currentTeam = snapshot.currentTeam;
  gameState.nextAssetId = snapshot.nextAssetId;
  gameState.totalTurnCount = snapshot.totalTurnCount;
  gameState.roundNumber = snapshot.roundNumber;
  gameState.message = snapshot.message;
  Object.assign(board,{
    positions:snapshot.positions,owners:snapshot.owners,rolls:snapshot.rolls,
    status:"ready",pendingLanding:null,lastRoll:null,stepsRemaining:0,history:[]
  });
}
function undoLastGrandTourTurn(){
  const board = requireMonopoly();
  requireRule(canUndoGrandTourTurn(), "Finish the turn before using Undo Last Turn.");
  const snapshot = board.history[board.history.length - 1];
  restoreGrandTourSnapshot(snapshot);
  gameState.message = `Last turn undone. ${gameState.teams[gameState.currentTeam].name} can roll again.`;
}
function canUndoGrandTourTurn(){
  return gameState.mode === "monopoly" && gameState.phase === "starting" &&
    ["resolved","ready"].includes(gameState.board.status) && gameState.board.history.length > 0;
}
function canTriggerTechShock(){
  return gameState.mode === "monopoly" && gameState.phase === "starting" &&
    !gameState.phaseComplete && gameState.teams.length === 3 && gameState.board.status !== "shock";
}
function triggerTechShock(){
  requireRule(canTriggerTechShock(), "The Tech Shock is only available during the Grand Tour.");
  const board = gameState.board;

  // A technology shock can happen at any moment. If it interrupts an unfinished
  // roll/movement/landing, cancel that incomplete turn back to its pre-roll snapshot
  // so no half-finished purchase, fee or movement leaks into the next era.
  if(["rolling","moving","landing"].includes(board.status) && board.history.length){
    restoreGrandTourSnapshot(board.history[board.history.length - 1]);
  }

  gameState.phase = "industrialShockRevealed";
  gameState.uiStage = "shock";
  board.status = "shock";
  board.pendingLanding = null;
  board.stepsRemaining = 0;
  board.lastRoll = null;
  board.history = [];
  gameState.message = "Return to presentation. Apply Industrial Revolution when you return.";
}
function applyIndustrialRevolution(){
  requireRule(gameState.phase === "industrialShockRevealed" && gameState.board.status === "shock",
    "Reveal the Tech Shock before applying Industrial Revolution.");
  startNextPhase("industrialShockRevealed");
}

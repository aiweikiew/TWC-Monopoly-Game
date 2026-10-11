"use strict";

function formatBusinessList(names){
  const unique = [...new Set(names.filter(Boolean))];
  if(unique.length === 0) return "your portfolio";
  if(unique.length === 1) return unique[0];
  if(unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0,-1).join(", ")}, and ${unique[unique.length-1]}`;
}

function getTeamTourismHoldings(teamIndex){
  const team = gameState.teams[teamIndex];
  const holdings = [];

  // Situation Cards react to the team's FULL current tourism portfolio:
  // legacy tourism businesses + every board business bought during the Grand Tour.
  // Non-tourism assets such as the Aristocratic Household's Estate are excluded.
  for(const asset of team.assets){
    if(asset.boardTile !== undefined){
      const property = boardProperties[asset.boardTile];
      if(property?.sector){
        holdings.push({sector:property.sector,business:property.name,type:asset.type});
      }
      continue;
    }

    const legacySector = legacySectors[asset.type];
    if(legacySector){
      holdings.push({
        sector:legacySector,
        business:assetTypes[asset.type]?.name || sectorLabels[legacySector],
        type:asset.type
      });
    }
  }

  return holdings;
}

function evaluateChanceCard(teamIndex, card){
  const holdings = getTeamTourismHoldings(teamIndex);
  const matched = [];

  for(const holding of holdings){
    const effect = card.sectorEffects[holding.sector];
    if(effect){
      matched.push({
        sector:holding.sector,
        business:holding.business,
        value:effect.value,
        reason:effect.reason
      });
    }
  }

  if(matched.length === 0){
    return {
      effect:0,
      impactTitle:"No Direct Exposure",
      impactBusinesses:[],
      reason:card.neutralReason || "None of your current businesses are directly affected."
    };
  }

  const positive = matched.filter(x => x.value > 0);
  const negative = matched.filter(x => x.value < 0);

  if(positive.length && negative.length){
    const positiveNames = [...new Set(positive.map(x => x.business))];
    const negativeNames = [...new Set(negative.map(x => x.business))];
    const positiveText = formatBusinessList(positiveNames);
    const negativeText = formatBusinessList(negativeNames);
    return {
      effect:0,
      impactTitle:"Mixed Impact",
      impactBusinesses:[...new Set(matched.map(x => x.business))],
      reason:`${positiveText} ${positiveNames.length === 1 ? "benefits" : "benefit"}, while ${negativeText} ${negativeNames.length === 1 ? "is harmed" : "are harmed"}. Effects cancel out.`
    };
  }

  const affected = positive.length ? positive : negative;
  const affectedNames = [...new Set(affected.map(x => x.business))];
  let reason;

  if(affected.length === 1){
    reason = affected[0].reason.replace("{business}",affected[0].business);
  } else {
    const template = positive.length ? card.groupPositive : card.groupNegative;
    reason = template
      ? template.replace("{businesses}",formatBusinessList(affectedNames))
      : `${formatBusinessList(affectedNames)} ${positive.length ? "benefit" : "are harmed"} from this event.`;
  }

  return {
    effect:positive.length ? 1 : -1,
    impactTitle:formatBusinessList(affectedNames),
    impactBusinesses:affectedNames,
    reason
  };
}

function getTeamSectors(teamIndex){
  const sectors = getTeamTourismHoldings(teamIndex).map(holding => holding.sector);
  const uniqueSectors = [...new Set(sectors)];
  return uniqueSectors.length ? uniqueSectors : ["none"];
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

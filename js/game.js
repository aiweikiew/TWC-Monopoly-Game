"use strict";

// Rules have no DOM dependency; UI events call these guarded transitions.
function requireRule(condition, message){
  if(!condition) throw new Error(message);
}
function revalueAssets(phase){
  const values = revaluations[phase];
  gameState.revaluationLog = [];
  for(const team of gameState.teams){
    for(const asset of team.assets){
      if(Object.hasOwn(values, asset.type)){
        const oldValue = asset.currentValue;
        asset.currentValue = values[asset.type];
        gameState.revaluationLog.push({team:team.name,name:asset.name,oldValue,newValue:asset.currentValue});
      }
    }
  }
}
function applyFITBoom(){
  requireRule(gameState.phase === "digital" && gameState.teams.length === 3 &&
    gameState.teams.every(team => gameState.decisions[team.id]), "Finish all digital decisions first.");
  if(gameState.events.fitBoom) return;
  gameState.events.fitBoom = true;
  // Shared destination pressure counts events, not the sum across teams.
  gameState.destinationPressure += 1;
  for(const team of gameState.teams){
    team.destinationPressure += 1;
    if(team.digitalReady) team.cash += 2;
  }
}
function applyFutureCrisis(){
  requireRule(gameState.phase === "future", "The crisis belongs to the future phase.");
  if(gameState.events.crisis) return;
  gameState.events.crisis = true;
  for(const team of gameState.teams){
    team.visitorExperience = 3;
    team.residentWellbeing = 3 - team.destinationPressure;
    team.environmentalHealth = 3 - team.destinationPressure;
    clampScores(team);
    team.cash -= 2;
    team.visitorExperience -= 2;
    team.residentWellbeing -= 1;
    team.environmentalHealth -= 1;
    clampScores(team);
    team.futureInnovationCredit = 1;
  }
}
function startNextPhase(expectedPhase){
  requireRule(gameState.phase === expectedPhase, "This phase control is no longer current.");
  const index = phaseOrder.indexOf(gameState.phase);
  requireRule(index >= 0 && index < phaseOrder.length - 1, "There is no next phase.");
  requireRule(gameState.phaseComplete && (gameState.phase === "jet" ||
    gameState.teams.every(team => gameState.decisions[team.id])), "Resolve all team decisions before continuing.");
  gameState.phase = phaseOrder[index + 1];
  gameState.phaseComplete = false;
  gameState.decisions = {};
  gameState.currentTeam = 0;
  gameState.revaluationLog = [];
  gameState.message = "";
  if(revaluations[gameState.phase]) revalueAssets(gameState.phase);
  if(gameState.phase === "future") applyFutureCrisis();
  if(gameState.phase === "jet" || gameState.phase === "winner") gameState.phaseComplete = true;
}
function takeAction(teamId, action, selection, expectedPhase){
  requireRule(gameState.phase === expectedPhase, "This decision belongs to an earlier phase.");
  requireRule(!gameState.phaseComplete && ["starting","steam","digital","future"].includes(gameState.phase), "No strategy actions are available in this phase.");
  const team = gameState.teams.find(t => t.id === teamId);
  requireRule(team && team === gameState.teams[gameState.currentTeam], "Wait for this team's turn.");
  requireRule(!gameState.decisions[teamId], "This team already acted.");
  const allowed = {
    starting:["invest","hold"],steam:["hold","sell","adapt","invest"],
    digital:["digitise","invest","hold"],future:["strategy"]
  };
  requireRule(allowed[gameState.phase].includes(action), "This action is not available in this phase.");
  const asset = team.assets.find(a => a.id === selection);
  let description = action.toUpperCase();
  if(action === "invest"){
    requireRule(markets[gameState.phase].includes(selection), "Choose an asset from this era's market.");
    const price = assetTypes[selection].price;
    requireRule(team.cash >= price, "Insufficient cash for this investment.");
    team.cash -= price;
    team.assets.push(createAsset(selection));
    if(assetTypes[selection].digital) team.digitalReady = true;
    description += `: ${assetTypes[selection].name}`;
  } else if(action === "sell"){
    requireRule(asset, "Select an owned asset to sell.");
    team.cash += asset.currentValue;
    team.assets = team.assets.filter(a => a.id !== asset.id);
    description += `: ${asset.name}`;
  } else if(action === "adapt"){
    requireRule(asset && Object.hasOwn(adaptations, asset.type), "Choose an eligible tourism asset to adapt.");
    requireRule(team.cash >= 1, "Adaptation requires $1 cash.");
    team.cash -= 1;
    asset.type = adaptations[asset.type];
    asset.name = assetTypes[asset.type].name;
    asset.form = asset.name;
    asset.era = "steam";
    description += `: ${asset.name}`;
  } else if(action === "digitise"){
    requireRule(asset && asset.tourism && !asset.digital, "Choose a non-digital tourism business.");
    requireRule(team.cash >= 2, "Digitisation requires $2 cash.");
    team.cash -= 2;
    asset.digital = true;
    team.digitalReady = true;
    description += `: ${asset.name}`;
  } else if(action === "strategy"){
    requireRule(Object.hasOwn(futureStrategies, selection), "Choose a future strategy.");
    requireRule(team.futureInnovationCredit === 1 && team.futureStrategy === null, "This team's innovation credit has already been used.");
    const strategy = futureStrategies[selection];
    team.cash += strategy.cash;
    for(const key of ["visitorExperience","residentWellbeing","environmentalHealth"]) team[key] += strategy[key];
    clampScores(team);
    team.futureStrategy = selection;
    team.futureInnovationCredit = 0;
    description = strategy.name;
  }
  gameState.decisions[team.id] = description;
  gameState.message = `${team.name}: ${description}.`;
  const nextTeam = gameState.teams.findIndex(t => !gameState.decisions[t.id]);
  if(nextTeam === -1){
    if(gameState.phase === "digital") applyFITBoom();
    gameState.phaseComplete = true;
  } else {
    gameState.currentTeam = nextTeam;
  }
}
function getMoneyWinners(){
  if(!gameState.teams.length) return [];
  const highest = Math.max(...gameState.teams.map(calculateNetWorth));
  return gameState.teams.filter(team => calculateNetWorth(team) === highest);
}

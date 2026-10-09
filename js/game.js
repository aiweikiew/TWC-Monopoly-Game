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
function stageForPhase(phase){
  if(["steam","digital","jet"].includes(phase)) return "revaluation";
  if(phase === "future") return "crisis";
  if(phase === "winner") return "winner";
  return "overview";
}
function startNextPhase(expectedPhase){
  const applyingShock = expectedPhase === "industrialShockRevealed";
  requireRule(applyingShock ? gameState.mode === "monopoly" && gameState.board.status === "shock" : gameState.mode === "strategy",
    "Reveal and apply the Grand Tour Tech Shock first.");
  requireRule(gameState.phase === expectedPhase, "This phase control is no longer current.");
  if(!applyingShock){
    requireRule(gameState.phaseComplete && gameState.uiStage === "pause",
      "Finish the current phase and return to the presentation pause before starting the next era.");
  }
  const index = phaseOrder.indexOf(applyingShock ? "starting" : gameState.phase);
  requireRule(index >= 0 && index < phaseOrder.length - 1, "There is no next phase.");
  gameState.phase = phaseOrder[index + 1];
  gameState.mode = "strategy";
  gameState.lastDecision = null;
  gameState.phaseComplete = false;
  gameState.decisions = {};
  gameState.currentTeam = 0;
  gameState.revaluationLog = [];
  gameState.message = "";
  gameState.uiStage = stageForPhase(gameState.phase);
  if(revaluations[gameState.phase]) revalueAssets(gameState.phase);
  if(gameState.phase === "future") applyFutureCrisis();
  if(gameState.phase === "jet") gameState.phaseComplete = true;
  if(gameState.phase === "winner") gameState.phaseComplete = true;
}
function takeAction(teamId, action, selection, expectedPhase){
  requireRule(gameState.mode === "strategy", "Finish the Grand Tour before strategy decisions.");
  requireRule(gameState.phase === expectedPhase, "This decision belongs to an earlier phase.");
  requireRule(gameState.uiStage === "decisions", "Continue to the team decision screen first.");
  requireRule(!gameState.phaseComplete && ["steam","digital","future"].includes(gameState.phase), "No strategy actions are available in this phase.");
  const team = gameState.teams.find(t => t.id === teamId);
  requireRule(team && team === gameState.teams[gameState.currentTeam], "Wait for this team's turn.");
  requireRule(!gameState.decisions[teamId], "This team already acted.");
  const allowed = {steam:["hold","sell","adapt","invest"],digital:["digitise","invest","hold"],future:["strategy"]};
  requireRule(allowed[gameState.phase].includes(action), "This action is not available in this phase.");
  const checkpoint = JSON.parse(JSON.stringify({
    phase:gameState.phase,uiStage:gameState.uiStage,teams:gameState.teams,currentTeam:gameState.currentTeam,
    decisions:gameState.decisions,phaseComplete:gameState.phaseComplete,
    destinationPressure:gameState.destinationPressure,events:gameState.events,
    nextAssetId:gameState.nextAssetId,message:gameState.message
  }));
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
  gameState.lastDecision = checkpoint;
  gameState.message = `${team.name}: ${description}.`;
  const nextTeam = gameState.teams.findIndex(t => !gameState.decisions[t.id]);
  if(nextTeam === -1){
    gameState.phaseComplete = true;
    gameState.uiStage = "review";
  } else gameState.currentTeam = nextTeam;
}
function undoLastDecision(){
  const checkpoint = gameState.lastDecision;
  requireRule(gameState.mode === "strategy" && checkpoint && checkpoint.phase === gameState.phase && gameState.uiStage === "review",
    "Only the most recent decision can be undone from the review screen.");
  Object.assign(gameState, checkpoint, {lastDecision:null});
}
function continuePhaseStage(){
  requireRule(gameState.mode === "strategy", "This control is only available in strategy mode.");
  if(gameState.uiStage === "revaluation"){
    if(gameState.phase === "jet") gameState.uiStage = "pause";
    else gameState.uiStage = "decisions";
    return;
  }
  if(gameState.uiStage === "crisis" && gameState.phase === "future"){
    gameState.uiStage = "decisions";
    return;
  }
  if(gameState.uiStage === "event" && gameState.phase === "digital"){
    gameState.uiStage = "results";
    return;
  }
  if(gameState.uiStage === "results"){
    gameState.uiStage = "pause";
    return;
  }
  throw new Error("There is no next screen from here.");
}
function confirmPhaseReview(){
  requireRule(gameState.mode === "strategy" && gameState.phaseComplete && gameState.uiStage === "review",
    "Finish all team decisions before locking the phase.");
  gameState.lastDecision = null;
  if(gameState.phase === "steam") gameState.uiStage = "pause";
  else if(gameState.phase === "digital"){
    applyFITBoom();
    gameState.uiStage = "event";
  } else if(gameState.phase === "future") gameState.uiStage = "results";
  else throw new Error("This phase does not use a decision review.");
}
function revealJetTechShock(){
  requireRule(gameState.mode === "strategy" && gameState.phase === "steam" &&
    gameState.phaseComplete && gameState.uiStage === "pause",
    "Lock the Industrial portfolios before triggering the Jet Age Tech Shock.");
  gameState.uiStage = "jetShock";
  gameState.message = "Return to presentation. Apply the Jet Age when you return.";
}
function applyJetAge(){
  requireRule(gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "jetShock",
    "Trigger the Jet Age Tech Shock first.");
  gameState.uiStage = "pause";
  startNextPhase("steam");
}
function revealDigitalTechShock(){
  requireRule(gameState.mode === "strategy" && gameState.phase === "jet" &&
    gameState.phaseComplete && gameState.uiStage === "pause",
    "Complete the Jet Age revaluation before triggering the Digital Transformation Tech Shock.");
  gameState.uiStage = "digitalShock";
  gameState.message = "Return to presentation. Apply Digital Transformation when you return.";
}
function applyDigitalTransformation(){
  requireRule(gameState.mode === "strategy" && gameState.phase === "jet" && gameState.uiStage === "digitalShock",
    "Trigger the Digital Transformation Tech Shock first.");
  gameState.uiStage = "pause";
  startNextPhase("jet");
}
function getMoneyWinners(){
  if(!gameState.teams.length) return [];
  const highest = Math.max(...gameState.teams.map(calculateNetWorth));
  return gameState.teams.filter(team => calculateNetWorth(team) === highest);
}

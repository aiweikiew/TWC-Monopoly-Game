"use strict";

// All mutable gameplay data lives here. Net Worth is always derived.
const gameState = {};
function resetGame(){
  Object.keys(gameState).forEach(key => delete gameState[key]);
  Object.assign(gameState, {
    phase:"setup",mode:"setup",uiStage:"setup",teams:[],phaseComplete:false,destinationPressure:0,
    totalTurnCount:0,roundNumber:1,
    board:{positions:[0,0,0],owners:{},rolls:[0,0,0],
      status:"ready",pendingLanding:null,lastRoll:null,stepsRemaining:0,history:[]},
    setupSelected:[],currentTeam:0,nextAssetId:1,decisions:{},lastDecision:null,
    revaluationLog:[],events:{fitBoom:false,crisis:false},message:"Team A draws first."
  });
}
function calculateNetWorth(team){
  return team.cash + team.assets.reduce((total, asset) => total + asset.currentValue, 0);
}
function createAsset(type){
  const definition = assetTypes[type];
  return {
    id:`asset-${gameState.nextAssetId++}`,type,name:definition.name,
    era:definition.era,form:definition.name,currentValue:definition.price,
    tourism:definition.tourism !== false,digital:definition.digital === true
  };
}
function createTeam(identityIndex, teamIndex){
  const identity = identityPool[identityIndex];
  return {
    id:String.fromCharCode(65 + teamIndex),name:setupTeams[teamIndex],
    identity:{key:identity.key,name:identity.name,icon:identity.icon},
    cash:identity.cash,assets:[createAsset(identity.legacyType)],digitalReady:false,
    destinationPressure:0,visitorExperience:null,residentWellbeing:null,
    environmentalHealth:null,futureStrategy:null,futureInnovationCredit:0
  };
}
function clampScores(team){
  for(const key of ["visitorExperience","residentWellbeing","environmentalHealth"]){
    team[key] = Math.max(0, Math.min(5, team[key]));
  }
}
resetGame();

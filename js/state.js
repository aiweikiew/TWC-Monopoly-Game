"use strict";

// Load the dedicated screen-flow layer without disturbing the original board stylesheet.
if(typeof document !== "undefined" && !document.querySelector('link[href="css/flow.css"]')){
  const flowStyles = document.createElement("link");
  flowStyles.rel = "stylesheet";
  flowStyles.href = "css/flow.css";
  document.head.appendChild(flowStyles);
}

const GAME_STORAGE_KEY = "tourismopoly:screen-flow-v2:v1";

// All mutable gameplay data lives here. Net Worth is always derived.
const gameState = {};
function clearSavedGame(){
  if(typeof localStorage === "undefined") return;
  try { localStorage.removeItem(GAME_STORAGE_KEY); } catch(_) {}
}
function resetGame(clearSaved = true){
  if(clearSaved) clearSavedGame();
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
function saveGameState(){
  if(typeof localStorage === "undefined") return false;

  // Do not persist a half-played animation. The most recent stable screen remains saved,
  // so refreshing mid-roll safely returns to the state before that unfinished animation.
  if(gameState.mode === "monopoly" && ["rolling","moving"].includes(gameState.board?.status)) return false;

  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameState));
    return true;
  } catch(_) { return false; }
}
function restoreSavedGame(){
  if(typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY);
    if(!raw) return false;
    const saved = JSON.parse(raw);
    if(!saved || typeof saved !== "object" || !saved.board || !Array.isArray(saved.teams) || !saved.phase || !saved.mode) return false;
    Object.keys(gameState).forEach(key => delete gameState[key]);
    Object.assign(gameState, saved);
    return true;
  } catch(_) {
    clearSavedGame();
    return false;
  }
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

// Start clean only when there is no saved classroom/testing session.
resetGame(false);
restoreSavedGame();

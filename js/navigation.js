"use strict";

// v25: extension loading is handled centrally by extensions-bootstrap-v25.js.
// navigation.js now owns navigation only.

const navigationState = {
  currentView:null,previousViews:[],selection:null,sessionBoard:null,
  observedKey:null,revision:0
};
function navigationKey(){
  const board = gameState.board;
  const status = ["ready","rolling","moving"].includes(board.status) ? "turn" : board.status;
  return [gameState.mode,gameState.phase,gameState.uiStage,gameState.phaseComplete,gameState.currentTeam,
    gameState.totalTurnCount,status,Object.keys(gameState.decisions).length].join(":");
}
function navigationBusy(){
  return gameState.mode === "monopoly" && ["rolling","moving"].includes(gameState.board.status);
}
function makeView(type){
  const team = gameState.teams[gameState.currentTeam];
  const labels = {
    identity:"Identity Draw",board:"Grand Tour",landing:"Landing resolution",
    "landing-detail":"Landing decision","industrial-shock":"Tech Shock reveal",
    revaluation:"Market revaluation",overview:"Team decisions",selection:"Unconfirmed decision",
    "phase-review":"Decision review",event:"Shared event",crisis:"2035 crisis",
    results:"Era results",pause:"Presentation pause",winner:"Money winner",
    "identity-review":"Confirmed identities"
  };
  return {
    type,revision:navigationState.revision,phase:gameState.phase,uiStage:gameState.uiStage,label:labels[type],
    teamName:team?.name || "",message:gameState.message,
    landing:gameState.board.pendingLanding ? {...gameState.board.pendingLanding} : null,
    revaluationLog:gameState.revaluationLog.map(row => ({...row}))
  };
}

function replaceView(type){
  navigationState.currentView = makeView(type);
}

function visitView(type){
  if(navigationState.currentView) navigationState.previousViews.push(navigationState.currentView);
  navigationState.currentView = makeView(type);
}
function strategyViewType(){
  const map = {
    revaluation:"revaluation",decisions:"overview",review:"phase-review",event:"event",
    crisis:"crisis",results:"results",pause:"pause",winner:"winner"
  };
  return map[gameState.uiStage] || "overview";
}
function replaceWithCurrentGame(){
  if(gameState.phase === "setup") replaceView("identity");
  else if(gameState.phase === "industrialShockRevealed") replaceView("industrial-shock");
  else if(gameState.mode === "monopoly"){
    replaceView(gameState.board.status === "landing" ? "landing-detail" : "board");
  } else replaceView(strategyViewType());
}
function syncNavigation(){
  if(navigationState.sessionBoard !== gameState.board){
    Object.assign(navigationState,{currentView:null,previousViews:[],selection:null,sessionBoard:gameState.board,observedKey:null,revision:0});
  }
  const key = navigationKey();
  if(key !== navigationState.observedKey){
    navigationState.observedKey = key;
    navigationState.revision += 1;
    navigationState.selection = null;
    navigationState.previousViews = [];
    replaceWithCurrentGame();
  }
  if(isCurrentView()) navigationState.currentView = makeView(navigationState.currentView.type);
}
function isCurrentView(){ return navigationState.currentView?.revision === navigationState.revision; }

// ---------- DETERMINISTIC GAME-FLOW BACK HISTORY ----------
function cloneFlowState(){
  const snapshot = JSON.parse(JSON.stringify(gameState));
  delete snapshot.flowHistory;
  return snapshot;
}
function captureFlowSnapshot(){
  syncNavigation();
  return {
    state:cloneFlowState(),
    viewType:navigationState.currentView?.type || null,
    previousViewTypes:navigationState.previousViews.map(view => view.type),
    selection:navigationState.selection ? JSON.parse(JSON.stringify(navigationState.selection)) : null
  };
}
function commitFlowSnapshot(entry){
  if(!entry || !entry.state) return false;
  if(!Array.isArray(gameState.flowHistory)) gameState.flowHistory = [];
  gameState.flowHistory.push(entry);
  if(gameState.flowHistory.length > 80) gameState.flowHistory.splice(0,gameState.flowHistory.length - 80);
  return true;
}
function hasFlowHistory(){
  return Array.isArray(gameState.flowHistory) && gameState.flowHistory.length > 0;
}
function restoreFlowSnapshot(){
  if(!hasFlowHistory()) return false;
  const history = gameState.flowHistory.slice();
  const entry = history.pop();
  if(!entry?.state) return false;

  Object.keys(gameState).forEach(key => delete gameState[key]);
  Object.assign(gameState,JSON.parse(JSON.stringify(entry.state)));
  gameState.flowHistory = history;

  Object.assign(navigationState,{
    currentView:null,previousViews:[],selection:null,sessionBoard:null,observedKey:null,revision:0
  });
  syncNavigation();
  navigationState.previousViews = Array.isArray(entry.previousViewTypes)
    ? entry.previousViewTypes.map(type => makeView(type))
    : [];
  if(entry.viewType === "selection" && entry.selection){
    navigationState.selection = JSON.parse(JSON.stringify(entry.selection));
    replaceView("selection");
  }
  if(typeof saveGameState === "function") saveGameState();
  return true;
}

// Kept only for pre-v25 compatibility inside the current session. Published v25 saves
// start clean, so normal Back navigation should use exact flow snapshots.
function canUseLegacyFlowFallback(){
  if(gameState.mode !== "strategy") return false;
  if(gameState.uiStage === "jetShock" || gameState.uiStage === "digitalShock") return true;
  if(gameState.uiStage === "pause" && ["steam","jet"].includes(gameState.phase)) return true;
  if(gameState.uiStage === "review" && gameState.phase === "steam" && gameState.lastDecision) return true;
  return false;
}
function useLegacyFlowFallback(){
  if(!canUseLegacyFlowFallback()) return false;

  if(gameState.uiStage === "jetShock" && gameState.phase === "steam"){
    gameState.uiStage = "pause";
  } else if(gameState.uiStage === "digitalShock" && gameState.phase === "jet"){
    gameState.uiStage = "pause";
  } else if(gameState.uiStage === "pause" && gameState.phase === "jet"){
    gameState.uiStage = "revaluation";
  } else if(gameState.uiStage === "pause" && gameState.phase === "steam"){
    gameState.uiStage = "review";
  } else if(gameState.uiStage === "review" && gameState.phase === "steam" && gameState.lastDecision){
    const checkpoint = JSON.parse(JSON.stringify(gameState.lastDecision));
    Object.assign(gameState,checkpoint,{lastDecision:null});
  } else return false;

  gameState.message = "";
  Object.assign(navigationState,{
    currentView:null,previousViews:[],selection:null,sessionBoard:null,observedKey:null,revision:0
  });
  syncNavigation();
  if(typeof saveGameState === "function") saveGameState();
  return true;
}

function canNavigateBack(){
  if(navigationBusy() || navigationState.currentView?.type === "identity") return false;
  return navigationState.previousViews.length > 0 || hasFlowHistory() || canUseLegacyFlowFallback();
}
function navigateBack(){
  if(navigationBusy()) return false;

  if(navigationState.previousViews.length > 0){
    navigationState.selection = null;
    navigationState.currentView = navigationState.previousViews.pop();
    return true;
  }

  if(restoreFlowSnapshot()) return true;
  return useLegacyFlowFallback();
}
function resumeCurrentGame(){
  if(navigationBusy()) return false;
  navigationState.selection = null;
  navigationState.previousViews = [];
  replaceWithCurrentGame();
  return true;
}
function openLandingDecision(){
  return isCurrentView() && gameState.board.status === "landing";
}
function openStrategySelection(teamId, action, selection, phase){
  if(!isCurrentView() || navigationState.currentView.type !== "overview" || gameState.mode !== "strategy" ||
     gameState.uiStage !== "decisions" || gameState.phaseComplete || phase !== gameState.phase ||
     gameState.teams[gameState.currentTeam].id !== teamId) return false;
  navigationState.selection = {teamId,action,selection,phase};
  visitView("selection");
  return true;
}

let flowTransitionDepth = 0;
function withFlowHistory(original){
  return function(...args){
    const outermost = flowTransitionDepth === 0;
    const before = outermost ? captureFlowSnapshot() : null;
    flowTransitionDepth += 1;
    try{
      const result = original.apply(this,args);
      if(outermost && before) commitFlowSnapshot(before);
      return result;
    } finally {
      flowTransitionDepth -= 1;
    }
  };
}

if(typeof continuePhaseStage === "function") continuePhaseStage = withFlowHistory(continuePhaseStage);
if(typeof confirmPhaseReview === "function") confirmPhaseReview = withFlowHistory(confirmPhaseReview);
if(typeof revealJetTechShock === "function") revealJetTechShock = withFlowHistory(revealJetTechShock);
if(typeof applyJetAge === "function") applyJetAge = withFlowHistory(applyJetAge);
if(typeof revealDigitalTechShock === "function") revealDigitalTechShock = withFlowHistory(revealDigitalTechShock);
if(typeof applyDigitalTransformation === "function") applyDigitalTransformation = withFlowHistory(applyDigitalTransformation);
if(typeof startNextPhase === "function") startNextPhase = withFlowHistory(startNextPhase);
if(typeof takeAction === "function") takeAction = withFlowHistory(takeAction);
if(typeof applyIndustrialRevolution === "function") applyIndustrialRevolution = withFlowHistory(applyIndustrialRevolution);

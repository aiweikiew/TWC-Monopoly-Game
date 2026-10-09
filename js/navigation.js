"use strict";

// Navigation is for the CURRENT game screen only.
// Back never walks through old turns/eras and never restores gameplay snapshots.
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
    results:"Era results",pause:"Presentation pause",winner:"Money winner"
  };
  return {
    type,revision:navigationState.revision,phase:gameState.phase,uiStage:gameState.uiStage,label:labels[type],
    teamName:team?.name || "",message:gameState.message,
    landing:gameState.board.pendingLanding ? {...gameState.board.pendingLanding} : null,
    revaluationLog:gameState.revaluationLog.map(row => ({...row}))
  };
}

// Replace the current route when gameplay itself advances. This is the key difference
// from the old implementation: completed turns/eras are NOT added to Back history.
function replaceView(type){
  navigationState.currentView = makeView(type);
}

// Only explicit UI drill-downs (for example decision -> confirmation) create Back history.
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
    // A landing is one required interaction, not a historical subpage.
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
function canNavigateBack(){
  return !navigationBusy() && navigationState.currentView?.type !== "identity" && navigationState.previousViews.length > 0;
}
function navigateBack(){
  if(!canNavigateBack()) return false;
  navigationState.selection = null;
  navigationState.currentView = navigationState.previousViews.pop();
  return true;
}
function resumeCurrentGame(){
  if(navigationBusy()) return false;
  navigationState.selection = null;
  navigationState.previousViews = [];
  replaceWithCurrentGame();
  return true;
}
function openLandingDecision(){
  // Kept for compatibility with the board button, but the landing popup is already
  // the current required game screen, so there is no fake historical page to open.
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

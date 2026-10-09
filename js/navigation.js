"use strict";

// UI history only. No function in this file writes to gameState or browser history.
const navigationState = {
  currentView:null,previousViews:[],selection:null,sessionBoard:null,
  observedKey:null,revision:0
};
function navigationKey(){
  const board = gameState.board;
  const status = ["ready","rolling","moving"].includes(board.status) ? "turn" : board.status;
  return [gameState.mode,gameState.phase,gameState.phaseComplete,gameState.currentTeam,
    gameState.totalTurnCount,status,Object.keys(gameState.decisions).length].join(":");
}
function navigationBusy(){
  return gameState.mode === "monopoly" && ["rolling","moving"].includes(gameState.board.status);
}
function makeView(type){
  const team = gameState.teams[gameState.currentTeam];
  const labels = {
    identity:"Identity Draw",board:"Grand Tour",landing:"Landing resolution",
    "landing-detail":"Landing decision",presenter:"Presenter controls",
    "industrial-shock":"Tech Shock reveal",overview:"Phase overview",
    selection:"Unconfirmed decision","phase-review":"Completed phase review",pause:"Presentation pause"
  };
  return {
    type,revision:navigationState.revision,phase:gameState.phase,label:labels[type],
    teamName:team?.name || "",message:gameState.message,
    landing:gameState.board.pendingLanding ? {...gameState.board.pendingLanding} : null,
    revaluationLog:gameState.revaluationLog.map(row => ({...row}))
  };
}
function visitView(type){
  if(navigationState.currentView) navigationState.previousViews.push(navigationState.currentView);
  navigationState.currentView = makeView(type);
}
function visitCurrentGame(){
  if(gameState.phase === "setup") visitView("identity");
  else if(gameState.phase === "industrialShockRevealed") visitView("industrial-shock");
  else if(gameState.mode === "monopoly"){
    if(gameState.board.status === "landing"){
      visitView("landing");
      visitView("landing-detail");
    } else visitView("board");
  } else if(gameState.phaseComplete){
    // A pause always has a completed review immediately behind it.
    visitView("phase-review");
    visitView("pause");
  } else visitView("overview");
}
function syncNavigation(){
  if(navigationState.sessionBoard !== gameState.board){
    Object.assign(navigationState, {
      currentView:null,previousViews:[],selection:null,sessionBoard:gameState.board,
      observedKey:null,revision:0
    });
  }
  const key = navigationKey();
  if(key !== navigationState.observedKey){
    navigationState.observedKey = key;
    navigationState.revision += 1;
    navigationState.selection = null;
    visitCurrentGame();
  }
  if(isCurrentView()){
    // Refresh display metadata only; historical views never restore gameplay snapshots.
    navigationState.currentView = makeView(navigationState.currentView.type);
  }
}
function isCurrentView(){
  return navigationState.currentView?.revision === navigationState.revision;
}
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
  visitCurrentGame();
  return true;
}
function openLandingDecision(){
  if(!isCurrentView() || navigationState.currentView.type !== "landing" || gameState.board.status !== "landing") return false;
  visitView("landing-detail");
  return true;
}
function togglePresenterControls(){
  if(!isCurrentView() || navigationBusy() || gameState.mode !== "monopoly" || gameState.phase !== "starting") return false;
  if(navigationState.currentView.type === "presenter") return navigateBack();
  visitView("presenter");
  return true;
}
function showPresentationPause(){
  if(!isCurrentView() || !gameState.phaseComplete || navigationState.currentView.type !== "phase-review") return false;
  visitView("pause");
  return true;
}
function openStrategySelection(teamId, action, selection, phase){
  if(!isCurrentView() || navigationState.currentView.type !== "overview" || gameState.mode !== "strategy" ||
     gameState.phaseComplete || phase !== gameState.phase || gameState.teams[gameState.currentTeam].id !== teamId) return false;
  navigationState.selection = {teamId,action,selection,phase};
  visitView("selection");
  return true;
}

"use strict";

// UI history only. No function in this file rewrites gameplay state.
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
    "landing-detail":"Landing decision",presenter:"Presenter controls",
    "industrial-shock":"Tech Shock reveal",revaluation:"Market revaluation",
    overview:"Team decisions",selection:"Unconfirmed decision",
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
function visitCurrentGame(){
  if(gameState.phase === "setup") visitView("identity");
  else if(gameState.phase === "industrialShockRevealed") visitView("industrial-shock");
  else if(gameState.mode === "monopoly"){
    if(gameState.board.status === "landing"){
      visitView("landing");
      visitView("landing-detail");
    } else visitView("board");
  } else visitView(strategyViewType());
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
    visitCurrentGame();
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
function openStrategySelection(teamId, action, selection, phase){
  if(!isCurrentView() || navigationState.currentView.type !== "overview" || gameState.mode !== "strategy" ||
     gameState.uiStage !== "decisions" || gameState.phaseComplete || phase !== gameState.phase ||
     gameState.teams[gameState.currentTeam].id !== teamId) return false;
  navigationState.selection = {teamId,action,selection,phase};
  visitView("selection");
  return true;
}

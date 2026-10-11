"use strict";

// Board review enhancements are isolated so gameplay/navigation state stays untouched.
if(typeof document !== "undefined" && !document.querySelector('link[href="css/board-v3.css"]')){
  const boardCompactStyles = document.createElement("link");
  boardCompactStyles.rel = "stylesheet";
  boardCompactStyles.href = "css/board-v3.css";
  document.head.appendChild(boardCompactStyles);
}
if(typeof document !== "undefined" && !document.querySelector('script[src="js/board-review-v3.js"]')){
  const reviewScript = document.createElement("script");
  reviewScript.src = "js/board-review-v3.js";
  document.head.appendChild(reviewScript);
}
if(typeof document !== "undefined" && !document.querySelector('script[src="js/chance-sum-v5.js"]')){
  const chanceScript = document.createElement("script");
  chanceScript.src = "js/chance-sum-v5.js";
  chanceScript.async = false;
  document.head.appendChild(chanceScript);
}
if(typeof document !== "undefined" && !document.querySelector('script[src="js/debt-settlement-v4.js"]')){
  const debtScript = document.createElement("script");
  debtScript.src = "js/debt-settlement-v4.js";
  document.head.appendChild(debtScript);
}
if(typeof document !== "undefined" && !document.querySelector('script[src="js/shock-polish-v6.js"]')){
  const shockPolishScript = document.createElement("script");
  shockPolishScript.src = "js/shock-polish-v6.js";
  document.head.appendChild(shockPolishScript);
}
if(typeof document !== "undefined" && !document.querySelector('script[src="js/go-passive-v8.js"]')){
  const goPassiveScript = document.createElement("script");
  goPassiveScript.src = "js/go-passive-v8.js";
  goPassiveScript.async = false;
  document.head.appendChild(goPassiveScript);
}
if(typeof document !== "undefined" && !document.querySelector('script[src="js/industrial-summary-v10.js"]')){
  const industrialSummaryScript = document.createElement("script");
  industrialSummaryScript.src = "js/industrial-summary-v10.js";
  document.head.appendChild(industrialSummaryScript);
}
if(typeof document !== "undefined" && !document.querySelector('script[src="js/revaluation-back-v9.js"]')){
  const revaluationBackScript = document.createElement("script");
  revaluationBackScript.src = "js/revaluation-back-v9.js";
  document.head.appendChild(revaluationBackScript);
}
if(typeof document !== "undefined" && !document.querySelector('script[src="js/industrial-decisions-v11.js"]')){
  const industrialDecisionsScript = document.createElement("script");
  industrialDecisionsScript.src = "js/industrial-decisions-v11.js";
  document.head.appendChild(industrialDecisionsScript);
}
if(typeof document !== "undefined" && !document.querySelector('script[src="js/industrial-review-v12.js"]')){
  const industrialReviewScript = document.createElement("script");
  industrialReviewScript.src = "js/industrial-review-v12.js";
  document.head.appendChild(industrialReviewScript);
}

// navigationState is only for transient UI drill-downs such as an unconfirmed decision.
// Committed game screens use gameState.flowHistory so Back follows the actual game sequence.
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

// Only transient, uncommitted drill-downs use previousViews.
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
  if(entry.viewType === "selection" && entry.selection){
    navigationState.selection = JSON.parse(JSON.stringify(entry.selection));
    replaceView("selection");
  }
  if(typeof saveGameState === "function") saveGameState();
  return true;
}

// Compatibility for saves created before flowHistory existed.
function canUseLegacyFlowFallback(){
  if(gameState.mode !== "strategy") return false;
  if(gameState.phase === "winner" && gameState.uiStage === "winner") return true;
  if(gameState.uiStage === "jetShock" || gameState.uiStage === "digitalShock") return true;
  if(gameState.uiStage === "pause" && ["steam","jet","digital","future"].includes(gameState.phase)) return true;
  if(gameState.uiStage === "results" && ["digital","future"].includes(gameState.phase)) return true;
  if(gameState.uiStage === "event" && gameState.phase === "digital") return true;
  if(gameState.uiStage === "review" && gameState.lastDecision) return true;
  return false;
}
function useLegacyFlowFallback(){
  if(!canUseLegacyFlowFallback()) return false;

  if(gameState.phase === "winner" && gameState.uiStage === "winner"){
    gameState.phase = "future";
    gameState.uiStage = "pause";
    gameState.phaseComplete = true;
  } else if(gameState.uiStage === "jetShock" && gameState.phase === "steam"){
    gameState.uiStage = "pause";
  } else if(gameState.uiStage === "digitalShock" && gameState.phase === "jet"){
    gameState.uiStage = "pause";
  } else if(gameState.uiStage === "pause"){
    if(gameState.phase === "future" || gameState.phase === "digital") gameState.uiStage = "results";
    else if(gameState.phase === "jet") gameState.uiStage = "revaluation";
    else if(gameState.phase === "steam") gameState.uiStage = "review";
  } else if(gameState.uiStage === "results"){
    gameState.uiStage = gameState.phase === "digital" ? "event" : "review";
  } else if(gameState.uiStage === "event" && gameState.phase === "digital"){
    gameState.uiStage = "review";
  } else if(gameState.uiStage === "review" && gameState.lastDecision){
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

// Record every committed strategy-screen transition at the rules layer. This keeps Back
// correct even when different UI components trigger the same rule function.
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

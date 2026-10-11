"use strict";

(function(){
  function loadStyles(){
    const href="css/late-flow-polish-v24.css";
    if(document.querySelector(`link[href="${href}"]`)) return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=href;
    document.head.appendChild(link);
  }

  function repairRedundantFutureReview(){
    if(typeof gameState==="undefined" || gameState.phase!=="future" || gameState.uiStage!=="review") return false;
    const ready=(gameState.teams || []).length>0 && gameState.teams.every(team=>Boolean(team.futureStrategy));
    if(!ready) return false;
    gameState.phaseComplete=true;
    gameState.uiStage="results";
    gameState.lastDecision=null;
    gameState.message="Final strategies locked.";
    if(typeof saveGameState==="function") saveGameState();
    return true;
  }

  // The old Future-complete checkpoint repeated information already shown on
  // Adaptation Results. Any old save that lands there returns to Results instead.
  function repairRedundantFuturePause(){
    if(typeof gameState==="undefined" || gameState.phase!=="future" || gameState.uiStage!=="pause") return false;
    gameState.phaseComplete=true;
    gameState.uiStage="results";
    gameState.message="Adaptation results ready.";
    if(typeof navigationState!=="undefined"){
      Object.assign(navigationState,{currentView:null,previousViews:[],selection:null,sessionBoard:null,observedKey:null,revision:0});
      if(typeof syncNavigation==="function") syncNavigation();
    }
    if(typeof saveGameState==="function") saveGameState();
    return true;
  }

  function addWinnerButtonToResults(html){
    if(typeof html!=="string" || gameState?.phase!=="future" || gameState?.uiStage!=="results") return html;
    // Works with the current Future Results renderer without duplicating that UI.
    return html
      .replace(/data-flow-action="continue"/g,'id="showMoneyWinnerDirectBtn"')
      .replace(/>CONTINUE<\/button>/g,">🏆 SHOW MONEY WINNER</button>")
      .replace(/>RETURN TO PRESENTATION CHECKPOINT<\/button>/g,">🏆 SHOW MONEY WINNER</button>");
  }

  function goDirectlyToWinner(){
    if(gameState.phase!=="future" || gameState.uiStage!=="results") return false;
    const before=typeof captureFlowSnapshot==="function" ? captureFlowSnapshot() : null;

    gameState.phase="winner";
    gameState.mode="strategy";
    gameState.uiStage="winner";
    gameState.phaseComplete=true;
    gameState.lastDecision=null;
    gameState.decisions={};
    gameState.currentTeam=0;
    gameState.revaluationLog=[];
    gameState.message="";

    if(before && typeof commitFlowSnapshot==="function") commitFlowSnapshot(before);
    if(typeof navigationState!=="undefined"){
      Object.assign(navigationState,{currentView:null,previousViews:[],selection:null,sessionBoard:null,observedKey:null,revision:0});
      if(typeof syncNavigation==="function") syncNavigation();
    }
    if(typeof saveGameState==="function") saveGameState();
    return true;
  }

  function install(){
    if(document.documentElement.dataset.lateFlowV24==="true") return true;
    if(typeof renderResults!=="function" || typeof renderGame!=="function" || typeof gameState==="undefined") return false;
    document.documentElement.dataset.lateFlowV24="true";
    loadStyles();

    const previousRenderResults=renderResults;
    renderResults=function(){
      return addWinnerButtonToResults(previousRenderResults());
    };

    const previousRenderGame=renderGame;
    renderGame=function(){
      repairRedundantFutureReview();
      repairRedundantFuturePause();
      return previousRenderGame();
    };

    document.addEventListener("click",event=>{
      const button=event.target.closest("#showMoneyWinnerDirectBtn");
      if(!button || button.disabled) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(goDirectlyToWinner()) renderGame();
    },true);

    repairRedundantFutureReview();
    repairRedundantFuturePause();
    window.setTimeout(()=>renderGame(),0);
    return true;
  }

  if(!install()){
    let attempts=0;
    const timer=window.setInterval(()=>{
      attempts+=1;
      if(install() || attempts>200) window.clearInterval(timer);
    },50);
  }
})();

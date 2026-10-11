"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/future-streamline-v22.css"]')) return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="css/future-streamline-v22.css";
    document.head.appendChild(link);
  }

  function install(){
    if(document.documentElement.dataset.futureStreamlineV22==="true") return true;
    const target=document.getElementById("phaseContent");
    if(!target || typeof takeAction!=="function") return false;
    document.documentElement.dataset.futureStreamlineV22="true";
    loadStyles();

    target.addEventListener("click",event=>{
      const button=event.target.closest('button[data-action="strategy"]');
      if(!button || button.disabled || gameState?.phase!=="future" || gameState?.uiStage!=="decisions") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const {team,selection,phase}=button.dataset;
      if(typeof runAndRender!=="function") return;
      runAndRender(()=>{
        takeAction(team,"strategy",selection,phase);
        // Team C completes the round. Skip the redundant review/lock screen and
        // lock the final strategies immediately, preserving Back to Team C's turn.
        if(gameState.phase==="future" && gameState.phaseComplete && gameState.uiStage==="review"){
          gameState.lastDecision=null;
          gameState.uiStage="results";
          gameState.message="Final strategies locked.";
          if(typeof saveGameState==="function") saveGameState();
        }
      });
    },true);
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

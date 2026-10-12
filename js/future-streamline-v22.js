"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/future-streamline-v22.css"]')) return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="css/future-streamline-v22.css";
    document.head.appendChild(link);
  }

  function configureNeutralAgenticAI(){
    if(typeof futureStrategies==="undefined" || !futureStrategies.agenticAI) return false;
    futureStrategies.agenticAI.pressureReduction=0;
    futureStrategies.agenticAI.purpose="Use AI to route demand and personalise journeys, protecting growth without reducing underlying destination pressure.";
    return true;
  }

  function patchPressureLabels(){
    const agenticCard=document.querySelector(".future-response-card.agentic");
    const badge=agenticCard?.querySelector(".pressure-projection b");
    if(badge && badge.textContent.trim()==="−0") badge.textContent="0";

    document.querySelectorAll(".future-result-strategy").forEach(row=>{
      const name=row.querySelector("span")?.textContent.trim();
      const pressure=row.querySelector("b");
      if(name==="Agentic AI" && pressure && pressure.textContent.includes("−0")) pressure.textContent="Pressure 0";
    });
  }

  function install(){
    if(document.documentElement.dataset.futureStreamlineV22==="true") return true;
    const target=document.getElementById("phaseContent");
    if(!target || typeof takeAction!=="function") return false;
    document.documentElement.dataset.futureStreamlineV22="true";
    loadStyles();
    configureNeutralAgenticAI();

    const observer=new MutationObserver(()=>{
      configureNeutralAgenticAI();
      patchPressureLabels();
    });
    observer.observe(target,{childList:true,subtree:true});
    patchPressureLabels();

    target.addEventListener("click",event=>{
      const button=event.target.closest('button[data-action="strategy"]');
      if(!button || button.disabled || gameState?.phase!=="future" || gameState?.uiStage!=="decisions") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const {team,selection,phase}=button.dataset;
      if(typeof runAndRender!=="function") return;
      runAndRender(()=>{
        configureNeutralAgenticAI();
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

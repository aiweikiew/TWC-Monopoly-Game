"use strict";

(function(){
  const localBackSelectors = [
    "#shockBackBtn",
    "#revaluationShockBackBtn",
    "#industrialDecisionBackBtn",
    "#industrialReviewBackBtn",
    "#industrialLockedBackBtn"
  ];

  const previousValues = {
    steam:{estate:1,legacyShipping:4,legacyCoach:5,legacyInn:5,legacyPublishing:3,horse:3,inn:3,shipping:4,guide:2},
    jet:{rail:4,tour:3,hotel:4,shipping:6,legacyShipping:6},
    digital:{tour:6,legacyPublishing:4,guide:3}
  };

  function clone(value){ return JSON.parse(JSON.stringify(value)); }

  function resetNav(){
    if(typeof navigationState !== "undefined"){
      Object.assign(navigationState,{currentView:null,previousViews:[],selection:null,sessionBoard:null,observedKey:null,revision:0});
      if(typeof syncNavigation === "function") syncNavigation();
    }
    if(typeof saveGameState === "function") saveGameState();
  }

  function reverseFITBoom(){
    if(!gameState.events?.fitBoom) return;
    gameState.events.fitBoom = false;
    gameState.destinationPressure = Math.max(0,(gameState.destinationPressure || 0) - 1);
    for(const team of gameState.teams){
      team.destinationPressure = Math.max(0,(team.destinationPressure || 0) - 1);
      if(team.digitalReady) team.cash -= 2;
    }
  }

  function stripDigitalArtifacts(){
    reverseFITBoom();
    for(const team of gameState.teams){
      for(let i = team.assets.length - 1; i >= 0; i--){
        const asset = team.assets[i];
        if(assetTypes[asset.type]?.digital){
          team.cash += assetTypes[asset.type]?.price ?? asset.currentValue;
          team.assets.splice(i,1);
        }
      }

      for(const asset of team.assets){
        if(asset.digital && !assetTypes[asset.type]?.digital){
          asset.digital = false;
          team.cash += 2;
        }
      }
      team.digitalReady = false;

      let restoredMapmakerGuidebook = false;
      for(const asset of team.assets){
        if(asset.type === "tour") asset.currentValue = 6;
        else if(asset.type === "legacyPublishing") asset.currentValue = 4;
        else if(asset.type === "guide") asset.currentValue = 3;
        else if(asset.type === "guidebook"){
          const publishingRoute = team.identity?.key === "mapmaker" && !restoredMapmakerGuidebook;
          asset.currentValue = publishingRoute ? 4 : 3;
          if(publishingRoute) restoredMapmakerGuidebook = true;
        }
      }
    }
    gameState.decisions = {};
    gameState.lastDecision = null;
  }

  function repairRevaluation(){
    if(gameState.mode !== "strategy" || gameState.uiStage !== "revaluation") return false;
    if(!["steam","jet","digital"].includes(gameState.phase)) return false;
    if(Array.isArray(gameState.revaluationLog) && gameState.revaluationLog.length) return false;

    if(gameState.phase === "jet"){
      const staleDigital = Boolean(gameState.events?.fitBoom) || gameState.teams.some(team =>
        team.assets.some(asset => asset.digital || assetTypes[asset.type]?.digital));
      if(staleDigital) stripDigitalArtifacts();
    }

    const phase = gameState.phase;
    const values = revaluations[phase] || {};
    const oldValues = previousValues[phase] || {};
    const rows = [];

    for(const team of gameState.teams){
      for(const asset of team.assets){
        if(!Object.hasOwn(values,asset.type)) continue;
        const newValue = values[asset.type];
        const oldValue = Object.hasOwn(oldValues,asset.type) ? oldValues[asset.type] : asset.currentValue;
        asset.currentValue = newValue;
        rows.push({team:team.name,name:asset.name,oldValue,newValue});
      }
    }

    gameState.revaluationLog = rows;
    if(typeof saveGameState === "function") saveGameState();
    return true;
  }

  function reverseRevaluation(){
    repairRevaluation();
    const used = new Set();
    for(const row of gameState.revaluationLog || []){
      const team = gameState.teams.find(item => item.name === row.team);
      if(!team) continue;
      const asset = team.assets.find(item => !used.has(item.id) && item.name === row.name && item.currentValue === row.newValue)
        || team.assets.find(item => !used.has(item.id) && item.name === row.name);
      if(asset){ asset.currentValue = row.oldValue; used.add(asset.id); }
    }
  }

  function reverseFutureCrisis(){
    if(!gameState.events?.crisis) return;
    for(const team of gameState.teams){
      team.cash += 2;
      team.visitorExperience = null;
      team.residentWellbeing = null;
      team.environmentalHealth = null;
      team.futureStrategy = null;
      team.futureInnovationCredit = 0;
    }
    gameState.events.crisis = false;
  }

  function restoreCheckpoint(){
    const checkpoint = gameState.lastDecision;
    if(!checkpoint || checkpoint.phase !== gameState.phase) return false;
    Object.assign(gameState,clone(checkpoint),{lastDecision:null});
    resetNav();
    return true;
  }

  function hasFallback(){
    if(gameState.phase === "setup") return false;
    if(typeof navigationBusy === "function" && navigationBusy()) return false;
    if(gameState.phase === "industrialShockRevealed") return true;
    if(gameState.mode !== "strategy") return false;
    const s = gameState.uiStage;
    return ["revaluation","decisions","review","event","crisis","results","pause","jetShock","digitalShock","winner"].includes(s)
      || gameState.phase === "winner";
  }

  function fallbackBack(){
    if(!hasFallback()) return false;

    if(gameState.phase === "industrialShockRevealed"){
      gameState.phase = "starting";
      gameState.mode = "monopoly";
      gameState.uiStage = "board";
      gameState.phaseComplete = false;
      gameState.board.status = "ready";
      gameState.board.pendingLanding = null;
      gameState.board.stepsRemaining = 0;
      gameState.board.lastRoll = null;
      resetNav();
      return true;
    }

    const phase = gameState.phase;
    const stage = gameState.uiStage;

    if(stage === "decisions"){
      if(restoreCheckpoint()) return true;
      if(gameState.currentTeam > 0){
        gameState.currentTeam -= 1;
        gameState.phaseComplete = false;
        gameState.lastDecision = null;
        resetNav();
        return true;
      }
      if(phase === "digital") stripDigitalArtifacts();
      gameState.currentTeam = 0;
      gameState.phaseComplete = false;
      gameState.uiStage = phase === "future" ? "crisis" : "revaluation";
      gameState.revaluationLog = [];
      repairRevaluation();
      resetNav();
      return true;
    }

    if(stage === "review"){
      if(restoreCheckpoint()) return true;
      gameState.uiStage = "decisions";
      gameState.currentTeam = Math.max(0,gameState.teams.length - 1);
      gameState.phaseComplete = false;
      resetNav();
      return true;
    }

    if(stage === "revaluation"){
      reverseRevaluation();
      if(phase === "steam"){
        gameState.phase = "industrialShockRevealed";
        gameState.mode = "monopoly";
        gameState.uiStage = "shock";
        gameState.phaseComplete = false;
        gameState.board.status = "shock";
      } else if(phase === "jet"){
        gameState.phase = "steam";
        gameState.uiStage = "jetShock";
        gameState.phaseComplete = true;
      } else {
        gameState.phase = "jet";
        gameState.uiStage = "digitalShock";
        gameState.phaseComplete = true;
      }
      gameState.currentTeam = 0;
      gameState.lastDecision = null;
      gameState.revaluationLog = [];
      resetNav();
      return true;
    }

    if(stage === "jetShock" && phase === "steam"){
      gameState.uiStage = "pause";
      gameState.phaseComplete = true;
      resetNav();
      return true;
    }

    if(stage === "digitalShock" && phase === "jet"){
      gameState.uiStage = "pause";
      gameState.phaseComplete = true;
      resetNav();
      return true;
    }

    if(stage === "event" && phase === "digital"){
      reverseFITBoom();
      gameState.uiStage = "review";
      gameState.phaseComplete = true;
      resetNav();
      return true;
    }

    if(stage === "crisis" && phase === "future"){
      reverseFutureCrisis();
      gameState.phase = "digital";
      gameState.uiStage = "pause";
      gameState.phaseComplete = true;
      gameState.currentTeam = 0;
      gameState.decisions = {};
      gameState.revaluationLog = [];
      resetNav();
      return true;
    }

    if(stage === "results"){
      gameState.uiStage = phase === "digital" ? "event" : "review";
      gameState.phaseComplete = true;
      resetNav();
      return true;
    }

    if(stage === "pause"){
      if(phase === "steam") gameState.uiStage = "review";
      else if(phase === "jet"){
        gameState.uiStage = "revaluation";
        gameState.revaluationLog = [];
        repairRevaluation();
      } else gameState.uiStage = "results";
      gameState.phaseComplete = true;
      resetNav();
      return true;
    }

    if(stage === "winner" || phase === "winner"){
      gameState.phase = "future";
      gameState.mode = "strategy";
      gameState.uiStage = "pause";
      gameState.phaseComplete = true;
      gameState.currentTeam = 0;
      resetNav();
      return true;
    }

    return false;
  }

  function repairReview(){
    if(gameState.mode !== "strategy" || gameState.uiStage !== "review") return;
    if(!gameState.decisions || typeof gameState.decisions !== "object") gameState.decisions = {};

    if(gameState.phase === "future" && gameState.teams.length && gameState.teams.every(team => team.futureStrategy)){
      for(const team of gameState.teams){
        if(!gameState.decisions[team.id]) gameState.decisions[team.id] = futureStrategies[team.futureStrategy]?.name || team.futureStrategy;
      }
      gameState.phaseComplete = true;
    }
  }

  function visibleLocalBack(){
    return localBackSelectors.some(selector => {
      const element = document.querySelector(selector);
      if(!element || element.hidden || element.disabled) return false;
      const style = window.getComputedStyle(element);
      if(style.display === "none" || style.visibility === "hidden") return false;
      return element.getClientRects().length > 0;
    });
  }

  function syncGlobalBack(){
    const back = document.getElementById("backBtn");
    if(!back || typeof canNavigateBack !== "function") return;
    const show = gameState.phase !== "setup" && !visibleLocalBack() && canNavigateBack();
    back.hidden = !show;
    back.disabled = !show;
    back.textContent = "← Back";
    document.body.classList.toggle("has-back",show);
  }

  function init(){
    if(document.documentElement.dataset.flowBackUniversalV3 === "true") return true;
    if(typeof renderGame !== "function" || typeof gameState === "undefined" ||
       typeof canNavigateBack !== "function" || typeof navigateBack !== "function") return false;

    document.documentElement.dataset.flowBackUniversalV3 = "true";

    const originalCanNavigateBack = canNavigateBack;
    canNavigateBack = function(){
      if(typeof navigationBusy === "function" && navigationBusy()) return false;
      return originalCanNavigateBack() || hasFallback();
    };

    const originalNavigateBack = navigateBack;
    navigateBack = function(){
      if(typeof navigationBusy === "function" && navigationBusy()) return false;
      const hasExact = (navigationState.previousViews?.length || 0) > 0 ||
        (Array.isArray(gameState.flowHistory) && gameState.flowHistory.length > 0);
      if(hasExact) return originalNavigateBack();
      if(fallbackBack()) return true;
      return originalNavigateBack();
    };

    if(typeof triggerTechShock === "function" && !triggerTechShock.__flowHistoryWrapped){
      const originalTrigger = triggerTechShock;
      triggerTechShock = function(...args){
        const before = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;
        const result = originalTrigger.apply(this,args);
        if(before && typeof commitFlowSnapshot === "function") commitFlowSnapshot(before);
        return result;
      };
      triggerTechShock.__flowHistoryWrapped = true;
    }

    const originalRenderGame = renderGame;
    renderGame = function(){
      repairReview();
      repairRevaluation();
      originalRenderGame();
      syncGlobalBack();
      window.setTimeout(syncGlobalBack,0);
    };

    document.addEventListener("click",event => {
      const selector = localBackSelectors.join(",");
      const button = event.target.closest(selector);
      if(button && !button.disabled && canNavigateBack()){
        event.preventDefault();
        event.stopImmediatePropagation();
        if(navigateBack()) renderGame();
        return;
      }
      window.setTimeout(syncGlobalBack,0);
    },true);

    repairReview();
    repairRevaluation();
    window.setTimeout(() => renderGame(),0);
    return true;
  }

  if(!init()){
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if(init() || attempts > 160) window.clearInterval(timer);
    },50);
  }
})();
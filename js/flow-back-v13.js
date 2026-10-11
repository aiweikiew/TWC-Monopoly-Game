"use strict";

(function(){
  const localBackSelectors = [
    "#shockBackBtn",
    "#revaluationShockBackBtn",
    "#industrialDecisionBackBtn",
    "#industrialReviewBackBtn",
    "#industrialLockedBackBtn"
  ];

  function deepClone(value){ return JSON.parse(JSON.stringify(value)); }

  function resetNavigationAfterFallback(){
    if(typeof navigationState !== "undefined"){
      Object.assign(navigationState,{
        currentView:null,previousViews:[],selection:null,sessionBoard:null,observedKey:null,revision:0
      });
      if(typeof syncNavigation === "function") syncNavigation();
    }
    if(typeof saveGameState === "function") saveGameState();
  }

  function assetTypeByName(name){
    return Object.keys(assetTypes).find(type => assetTypes[type]?.name === name) || null;
  }

  function restoreCheckpoint(){
    const checkpoint = gameState.lastDecision;
    if(!checkpoint || checkpoint.phase !== gameState.phase) return false;
    Object.assign(gameState,deepClone(checkpoint),{lastDecision:null});
    resetNavigationAfterFallback();
    return true;
  }

  function reverseFutureDecision(team){
    if(!team?.futureStrategy) return false;
    const strategy = futureStrategies[team.futureStrategy];
    if(!strategy) return false;
    team.cash -= strategy.cash;
    team.visitorExperience -= strategy.visitorExperience;
    team.residentWellbeing -= strategy.residentWellbeing;
    team.environmentalHealth -= strategy.environmentalHealth;
    clampScores(team);
    team.futureStrategy = null;
    team.futureInnovationCredit = 1;
    return true;
  }

  function reverseDigitalDecision(team,description){
    const text = String(description || "");
    if(text.startsWith("INVEST:")){
      const name = text.slice(7).trim();
      const index = team.assets.map(asset => asset.name).lastIndexOf(name);
      if(index >= 0){
        const asset = team.assets[index];
        team.cash += assetTypes[asset.type]?.price ?? asset.currentValue;
        team.assets.splice(index,1);
      }
    } else if(text.startsWith("DIGITISE:")){
      const name = text.slice(9).trim();
      const asset = team.assets.find(item => item.name === name && item.digital);
      if(asset){
        asset.digital = false;
        team.cash += 2;
      }
    }
    team.digitalReady = team.assets.some(asset => asset.digital);
    return true;
  }

  function reverseIndustrialDecision(team,description){
    const pieces = String(description || "").split(" · ").filter(Boolean).reverse();
    for(const piece of pieces){
      if(piece.startsWith("BUY:")){
        const name = piece.slice(4).trim();
        const index = team.assets.map(asset => asset.name).lastIndexOf(name);
        if(index >= 0){
          const asset = team.assets[index];
          team.cash += assetTypes[asset.type]?.price ?? asset.currentValue;
          team.assets.splice(index,1);
        }
      } else if(piece.startsWith("SELL:")){
        const name = piece.slice(5).trim();
        const type = assetTypeByName(name);
        if(type){
          const definition = assetTypes[type];
          const value = revaluations.steam?.[type] ?? definition.price ?? 0;
          team.cash -= value;
          team.assets.push({
            id:`asset-${gameState.nextAssetId++}`,type,name:definition.name,
            era:definition.era,form:definition.name,currentValue:value,
            tourism:definition.tourism !== false,digital:definition.digital === true
          });
        }
      } else if(piece.startsWith("ADAPT:")){
        const body = piece.slice(6).trim();
        const [oldName,newName] = body.split("→").map(value => value.trim());
        const oldType = assetTypeByName(oldName);
        const asset = team.assets.find(item => item.name === newName);
        if(asset && oldType){
          asset.type = oldType;
          asset.name = assetTypes[oldType].name;
          asset.form = asset.name;
          asset.era = assetTypes[oldType].era;
          team.cash += 1;
        }
      }
    }
    return true;
  }

  function reverseRecordedDecision(index){
    const team = gameState.teams[index];
    if(!team) return false;
    const description = gameState.decisions?.[team.id];
    if(!description && gameState.phase !== "future") return false;

    if(gameState.phase === "future") reverseFutureDecision(team);
    else if(gameState.phase === "digital") reverseDigitalDecision(team,description);
    else if(gameState.phase === "steam") reverseIndustrialDecision(team,description);
    else return false;

    if(gameState.decisions) delete gameState.decisions[team.id];
    gameState.currentTeam = index;
    gameState.uiStage = "decisions";
    gameState.phaseComplete = false;
    gameState.lastDecision = null;
    gameState.message = `${team.name}, choose your ${gameState.phase === "future" ? "Future strategy" : "move"}.`;
    resetNavigationAfterFallback();
    return true;
  }

  function reverseCurrentRevaluation(){
    const used = new Set();
    for(const row of gameState.revaluationLog || []){
      const team = gameState.teams.find(item => item.name === row.team);
      if(!team) continue;
      const asset = team.assets.find(item => !used.has(item.id) && item.name === row.name && item.currentValue === row.newValue)
        || team.assets.find(item => !used.has(item.id) && item.name === row.name);
      if(asset){
        asset.currentValue = row.oldValue;
        used.add(asset.id);
      }
    }
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

  function reverseFutureCrisis(){
    if(gameState.events?.crisis){
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
  }

  function hasUniversalFallback(){
    if(gameState.phase === "setup" || navigationBusy()) return false;
    if(gameState.phase === "industrialShockRevealed") return true;
    if(gameState.mode !== "strategy") return false;

    const stage = gameState.uiStage;
    const phase = gameState.phase;
    if(stage === "revaluation" && ["steam","jet","digital"].includes(phase)) return true;
    if(stage === "decisions" && ["steam","digital","future"].includes(phase)) return true;
    if(stage === "review" && ["steam","digital","future"].includes(phase)) return true;
    if(stage === "event" && phase === "digital") return true;
    if(stage === "crisis" && phase === "future") return true;
    if(stage === "results" && ["digital","future"].includes(phase)) return true;
    if(stage === "pause" && ["steam","jet","digital","future"].includes(phase)) return true;
    if(stage === "jetShock" && phase === "steam") return true;
    if(stage === "digitalShock" && phase === "jet") return true;
    if(stage === "winner" || phase === "winner") return true;
    return false;
  }

  function restoreUniversalFallback(){
    if(!hasUniversalFallback()) return false;

    if(gameState.phase === "industrialShockRevealed"){
      gameState.phase = "starting";
      gameState.mode = "monopoly";
      gameState.uiStage = "board";
      gameState.phaseComplete = false;
      gameState.board.status = "ready";
      gameState.board.pendingLanding = null;
      gameState.board.stepsRemaining = 0;
      gameState.board.lastRoll = null;
      gameState.message = "Ready to roll.";
      resetNavigationAfterFallback();
      return true;
    }

    const phase = gameState.phase;
    const stage = gameState.uiStage;

    if(stage === "decisions"){
      if(restoreCheckpoint()) return true;
      if(gameState.currentTeam > 0) return reverseRecordedDecision(gameState.currentTeam - 1);
      gameState.currentTeam = 0;
      gameState.phaseComplete = false;
      gameState.lastDecision = null;
      if(phase === "future") gameState.uiStage = "crisis";
      else gameState.uiStage = "revaluation";
      resetNavigationAfterFallback();
      return true;
    }

    if(stage === "review"){
      if(restoreCheckpoint()) return true;
      let index = -1;
      for(let i = gameState.teams.length - 1; i >= 0; i--){
        const team = gameState.teams[i];
        if(gameState.decisions?.[team.id] || (phase === "future" && team.futureStrategy)){ index = i; break; }
      }
      if(index >= 0) return reverseRecordedDecision(index);
      gameState.uiStage = "decisions";
      gameState.currentTeam = Math.max(0,gameState.teams.length - 1);
      gameState.phaseComplete = false;
      resetNavigationAfterFallback();
      return true;
    }

    if(stage === "revaluation"){
      reverseCurrentRevaluation();
      if(phase === "steam"){
        gameState.phase = "industrialShockRevealed";
        gameState.mode = "monopoly";
        gameState.uiStage = "shock";
        gameState.phaseComplete = false;
        gameState.board.status = "shock";
        gameState.message = "Industrial Revolution Tech Shock revealed.";
      } else if(phase === "jet"){
        gameState.phase = "steam";
        gameState.uiStage = "jetShock";
        gameState.phaseComplete = true;
        gameState.message = "Jet Age Tech Shock revealed.";
      } else {
        gameState.phase = "jet";
        gameState.uiStage = "digitalShock";
        gameState.phaseComplete = true;
        gameState.message = "Digital Transformation Tech Shock revealed.";
      }
      gameState.currentTeam = 0;
      gameState.lastDecision = null;
      resetNavigationAfterFallback();
      return true;
    }

    if(stage === "jetShock" && phase === "steam"){
      gameState.uiStage = "pause";
      gameState.phaseComplete = true;
      resetNavigationAfterFallback();
      return true;
    }

    if(stage === "digitalShock" && phase === "jet"){
      gameState.uiStage = "pause";
      gameState.phaseComplete = true;
      resetNavigationAfterFallback();
      return true;
    }

    if(stage === "event" && phase === "digital"){
      reverseFITBoom();
      gameState.uiStage = "review";
      gameState.phaseComplete = true;
      resetNavigationAfterFallback();
      return true;
    }

    if(stage === "crisis" && phase === "future"){
      reverseFutureCrisis();
      gameState.phase = "digital";
      gameState.uiStage = "pause";
      gameState.phaseComplete = true;
      gameState.currentTeam = 0;
      gameState.decisions = {};
      gameState.lastDecision = null;
      gameState.revaluationLog = [];
      gameState.message = "Present era complete. Continue to the Future when ready.";
      resetNavigationAfterFallback();
      return true;
    }

    if(stage === "results"){
      gameState.uiStage = phase === "digital" ? "event" : "review";
      gameState.phaseComplete = true;
      resetNavigationAfterFallback();
      return true;
    }

    if(stage === "pause"){
      if(phase === "steam") gameState.uiStage = "review";
      else if(phase === "jet") gameState.uiStage = "revaluation";
      else gameState.uiStage = "results";
      gameState.phaseComplete = true;
      resetNavigationAfterFallback();
      return true;
    }

    if(stage === "winner" || phase === "winner"){
      gameState.phase = "future";
      gameState.mode = "strategy";
      gameState.uiStage = "pause";
      gameState.phaseComplete = true;
      gameState.currentTeam = 0;
      gameState.message = "Future era complete.";
      resetNavigationAfterFallback();
      return true;
    }

    return false;
  }

  function repairImpossibleReviewState(){
    if(gameState.mode !== "strategy" || gameState.uiStage !== "review") return false;
    if(!gameState.decisions || typeof gameState.decisions !== "object") gameState.decisions = {};

    if(gameState.phase === "future"){
      const allChosen = gameState.teams.length > 0 && gameState.teams.every(team => team.futureStrategy);
      if(allChosen){
        let changed = false;
        for(const team of gameState.teams){
          if(!gameState.decisions[team.id]){
            gameState.decisions[team.id] = futureStrategies[team.futureStrategy]?.name || team.futureStrategy;
            changed = true;
          }
        }
        if(!gameState.phaseComplete){ gameState.phaseComplete = true; changed = true; }
        if(changed && typeof saveGameState === "function") saveGameState();
        return changed;
      }
    }

    const missing = gameState.teams.findIndex(team => !gameState.decisions[team.id]);
    if(missing >= 0 && !gameState.lastDecision){
      gameState.currentTeam = missing;
      gameState.uiStage = "decisions";
      gameState.phaseComplete = false;
      gameState.message = `${gameState.teams[missing].name}, complete your decision.`;
      resetNavigationAfterFallback();
      return true;
    }
    return false;
  }

  function visibleLocalBack(){
    return localBackSelectors.some(selector => {
      const element = document.querySelector(selector);
      if(!element || element.hidden || element.disabled) return false;
      const style = window.getComputedStyle(element);
      if(style.display === "none" || style.visibility === "hidden") return false;
      // A child of a hidden screen can still report display:block. Rects tell us whether
      // the button is actually rendered in the current viewport/layout.
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
    if(document.documentElement.dataset.flowBackUniversal === "true") return true;
    if(typeof renderGame !== "function" || typeof gameState === "undefined" ||
       typeof canNavigateBack !== "function" || typeof navigateBack !== "function") return false;

    document.documentElement.dataset.flowBackUniversal = "true";

    const originalCanNavigateBack = canNavigateBack;
    canNavigateBack = function(){
      if(navigationBusy()) return false;
      return originalCanNavigateBack() || hasUniversalFallback();
    };

    const originalNavigateBack = navigateBack;
    navigateBack = function(){
      if(navigationBusy()) return false;
      const hasExact = (navigationState.previousViews?.length || 0) > 0 ||
        (Array.isArray(gameState.flowHistory) && gameState.flowHistory.length > 0);
      if(hasExact) return originalNavigateBack();
      if(restoreUniversalFallback()) return true;
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
      repairImpossibleReviewState();
      originalRenderGame();
      syncGlobalBack();
      window.setTimeout(syncGlobalBack,0);
    };

    document.addEventListener("click",event => {
      const selector = localBackSelectors.join(",");
      const button = event.target.closest(selector);
      if(button && !button.disabled && typeof navigateBack === "function" && canNavigateBack()){
        event.preventDefault();
        event.stopImmediatePropagation();
        if(navigateBack() && typeof renderGame === "function") renderGame();
        return;
      }
      window.setTimeout(syncGlobalBack,0);
    },true);

    repairImpossibleReviewState();
    window.setTimeout(() => {
      if(typeof renderGame === "function") renderGame();
      else syncGlobalBack();
    },0);
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

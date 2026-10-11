"use strict";

(function(){
  const localBackSelectors = [
    "#shockBackBtn",
    "#revaluationShockBackBtn",
    "#industrialDecisionBackBtn",
    "#industrialReviewBackBtn",
    "#industrialLockedBackBtn"
  ];

  function futureStrategyName(team){
    const key = team?.futureStrategy;
    return key && futureStrategies?.[key] ? futureStrategies[key].name : null;
  }

  // Older saves created before deterministic flow history can contain a Future review
  // with the strategies already applied to the teams but the decisions map cleared.
  // Repair that state instead of showing three impossible "Pending" rows.
  function repairImpossibleReviewState(){
    if(gameState.mode !== "strategy" || gameState.uiStage !== "review") return false;
    if(!gameState.decisions || typeof gameState.decisions !== "object") gameState.decisions = {};

    if(gameState.phase === "future"){
      const allStrategiesChosen = gameState.teams.length > 0 &&
        gameState.teams.every(team => Boolean(futureStrategyName(team)));

      if(allStrategiesChosen){
        let changed = false;
        for(const team of gameState.teams){
          if(!gameState.decisions[team.id]){
            gameState.decisions[team.id] = futureStrategyName(team);
            changed = true;
          }
        }
        if(!gameState.phaseComplete){
          gameState.phaseComplete = true;
          changed = true;
        }
        if(changed && typeof saveGameState === "function") saveGameState();
        return changed;
      }
    }

    // A review page is only valid after every team has a recorded decision. If a restored
    // session reaches review early, resume the first unfinished team instead of trapping it.
    const firstMissing = gameState.teams.findIndex(team => !gameState.decisions[team.id]);
    if(firstMissing >= 0){
      gameState.currentTeam = firstMissing;
      gameState.uiStage = "decisions";
      gameState.phaseComplete = false;
      gameState.lastDecision = null;
      gameState.message = `${gameState.teams[firstMissing].name}, complete your decision.`;
      if(typeof navigationState !== "undefined"){
        navigationState.selection = null;
        navigationState.previousViews = [];
        navigationState.observedKey = null;
      }
      if(typeof saveGameState === "function") saveGameState();
      return true;
    }
    return false;
  }

  function isLegacyFutureReview(){
    return gameState.mode === "strategy" &&
      gameState.phase === "future" &&
      gameState.uiStage === "review" &&
      (!Array.isArray(gameState.flowHistory) || gameState.flowHistory.length === 0) &&
      typeof navigationState !== "undefined" &&
      navigationState.previousViews.length === 0 &&
      gameState.teams.length > 0 &&
      gameState.teams.every(team => Boolean(futureStrategyName(team)));
  }

  // For an old save with no exact snapshot, rebuild the immediately previous Future screen:
  // Team C's decision. The crisis baseline is deterministic, so its strategy effects can be
  // reversed without touching Teams A/B. We also save the review screen as the previous
  // flow snapshot so Back remains available on the reconstructed decision screen.
  function restoreLegacyPreviousFutureDecision(){
    if(!isLegacyFutureReview()) return false;
    const reviewSnapshot = typeof captureFlowSnapshot === "function" ? captureFlowSnapshot() : null;

    let index = -1;
    for(let i = gameState.teams.length - 1; i >= 0; i--){
      if(gameState.teams[i].futureStrategy){ index = i; break; }
    }
    if(index < 0) return false;

    const team = gameState.teams[index];
    const strategyKey = team.futureStrategy;
    const strategy = futureStrategies[strategyKey];
    if(!strategy) return false;

    team.cash -= strategy.cash;
    team.visitorExperience = 1;
    const destinationBaseline = Math.max(0,Math.min(5,2 - (team.destinationPressure || 0)));
    team.residentWellbeing = destinationBaseline;
    team.environmentalHealth = destinationBaseline;
    team.futureStrategy = null;
    team.futureInnovationCredit = 1;

    delete gameState.decisions[team.id];
    gameState.currentTeam = index;
    gameState.uiStage = "decisions";
    gameState.phaseComplete = false;
    gameState.lastDecision = null;
    gameState.message = `${team.name}, choose your Future strategy.`;

    navigationState.selection = null;
    navigationState.previousViews = [];
    navigationState.observedKey = null;
    navigationState.currentView = null;

    if(reviewSnapshot && typeof commitFlowSnapshot === "function") commitFlowSnapshot(reviewSnapshot);
    if(typeof saveGameState === "function") saveGameState();
    return true;
  }

  function visibleLocalBack(){
    return localBackSelectors.some(selector => {
      const element = document.querySelector(selector);
      if(!element || element.hidden) return false;
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }

  function syncGlobalBack(){
    const back = document.getElementById("backBtn");
    if(!back || typeof canNavigateBack !== "function") return;

    const setup = gameState.phase === "setup";
    const show = !setup && !visibleLocalBack() && canNavigateBack();
    back.hidden = !show;
    back.disabled = !show;
    back.textContent = "← Back";
    document.body.classList.toggle("has-back",show);
  }

  function init(){
    if(document.documentElement.dataset.flowBackV13 === "true") return true;
    if(typeof renderGame !== "function" || typeof gameState === "undefined" ||
       typeof canNavigateBack !== "function" || typeof navigateBack !== "function") return false;

    document.documentElement.dataset.flowBackV13 = "true";

    const originalCanNavigateBack = canNavigateBack;
    canNavigateBack = function(){
      if(isLegacyFutureReview()) return true;
      return originalCanNavigateBack();
    };

    const originalNavigateBack = navigateBack;
    navigateBack = function(){
      if(isLegacyFutureReview()) return restoreLegacyPreviousFutureDecision();
      return originalNavigateBack();
    };

    const originalRenderGame = renderGame;
    renderGame = function(){
      repairImpossibleReviewState();
      originalRenderGame();
      syncGlobalBack();
      // Some screen-specific render wrappers insert their inline Back after the core render.
      window.setTimeout(syncGlobalBack,0);
    };

    repairImpossibleReviewState();
    document.addEventListener("click",() => window.setTimeout(syncGlobalBack,0),true);
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
      if(init() || attempts > 120) window.clearInterval(timer);
    },50);
  }
})();

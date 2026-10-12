"use strict";

// v27: makes the teaching narrative explicit inside gameplay.
// Consumer lens: Access → Autonomy → Adaptation.
// Industry lens: Innovation → Disruption → Consequence → Adaptation.
(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/narrative-cycle-v27.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/narrative-cycle-v27.css";
    document.head.appendChild(link);
  }

  function configureFutureStrategies(){
    if(typeof futureStrategies === "undefined") return;
    Object.assign(futureStrategies.agenticAI,{
      pressureReduction:0,
      purpose:"Optimise traveller journeys through prediction, personalisation and automated action. Protects growth, but does not reduce underlying destination pressure."
    });
    Object.assign(futureStrategies.regenerative,{
      pressureReduction:2,
      purpose:"Restore destination capacity by reinvesting in ecosystems, communities and infrastructure."
    });
  }

  function phaseShockCopy(){
    if(gameState?.phase === "steam") return "Steam makes travel faster and higher-capacity, shifting demand and business value.";
    if(gameState?.phase === "jet") return "Air travel compresses long-distance journeys, changing which transport and tourism businesses remain valuable.";
    if(gameState?.phase === "digital") return "Search, comparison and booking move online, shifting value toward digitally connected businesses.";
    return "New technology changes traveller behaviour — and traveller behaviour changes business value.";
  }

  function cycleChip(stage){
    return `<div class="narrative-cycle-chip">${stage}</div>`;
  }

  function injectAfter(html,needle,addition){
    if(typeof html !== "string" || !html.includes(needle)) return html;
    return html.replace(needle,`${needle}${addition}`);
  }

  function enhanceRevaluation(html){
    if(typeof html !== "string") return html;
    const chip = cycleChip("INNOVATION → DISRUPTION");
    html = injectAfter(html,'<div class="screen-kicker">TECHNOLOGY IMPACT · MARKET REVALUATION</div>',chip);

    const link = `<div class="narrative-cause-link"><strong>NEW TECHNOLOGY</strong><span>→</span><strong>TRAVELLER BEHAVIOUR CHANGES</strong><span>→</span><strong>BUSINESS VALUE CHANGES</strong></div><p class="narrative-shock-explain">${phaseShockCopy()}</p>`;
    if(html.includes('<div class="industrial-team-grid">')) html = html.replace('<div class="industrial-team-grid">',`${link}<div class="industrial-team-grid">`);
    else if(html.includes('<div class="revaluation-grid">')) html = html.replace('<div class="revaluation-grid">',`${link}<div class="revaluation-grid">`);
    return html;
  }

  function enhanceDigitalEvent(html){
    if(typeof html !== "string") return html;
    html = html.replace("SHARED MARKET EVENT","CONSEQUENCE · SHARED MARKET EVENT");
    html = html.replace("Search, comparison, booking and navigation shift toward independent travellers.","Digital autonomy creates new demand and new business opportunity — but also more pressure on the destination.");
    html = html.replace("Travellers can now search, compare, book and navigate independently.","Digital autonomy creates new demand and new business opportunity — but also more pressure on the destination.");
    const link = '<div class="narrative-cause-link consequence"><strong>MORE AUTONOMY</strong><span>→</span><strong>MORE TOURISM ACTIVITY</strong><span>→</span><strong>MORE DESTINATION PRESSURE</strong></div>';
    if(html.includes('<div class="strategy-impact-banner">')) html = html.replace('<div class="strategy-impact-banner">',`${link}<div class="strategy-impact-banner">`);
    else if(html.includes('<div class="event-effects">')) html = html.replace('<div class="event-effects">',`${link}<div class="event-effects">`);
    return html;
  }

  function enhanceCrisis(html){
    if(typeof html !== "string") return html;
    html = html.replace("2035 TOURISM CRISIS","CONSEQUENCE · 2035 TOURISM CRISIS");
    html = html.replace("Growth created value — but it also created pressure the destination now has to absorb.","Yesterday's tourism growth becomes today's capacity problem.");
    const line = '<div class="narrative-cause-link consequence"><strong>GROWTH</strong><span>→</span><strong>CAPACITY STRAIN</strong><span>→</span><strong>NEW PROBLEM TO SOLVE</strong></div>';
    if(html.includes('<div class="strategy-crisis-tags">')) html = html.replace('<div class="strategy-crisis-tags">',`${line}<div class="strategy-crisis-tags">`);
    else if(html.includes('<div class="crisis-list">')) html = html.replace('<div class="crisis-list">',`${line}<div class="crisis-list">`);
    return html;
  }

  function enhanceFutureActions(html){
    if(typeof html !== "string") return html;
    html = html.replace("TEAM DECISION · FUTURE","ADAPTATION · FUTURE DECISION");
    html = html.replace("ADAPTATION · FUTURE ROUND","ADAPTATION · FUTURE DECISION");
    html = html.replace("Use your one Future Innovation Credit. No cash cost.","Two pressures, two responses: adapt to changing traveller expectations or restore destination capacity.");
    html = html.replace("Your goal is to reduce Destination Pressure toward 0 while protecting Net Worth.","Two pressures, two responses: adapt to changing traveller expectations or restore destination capacity.");
    return html;
  }

  function enhanceFutureResults(html){
    if(typeof html !== "string") return html;
    html = html.replace("FINAL OUTCOMES","ADAPTATION RESULTS");
    html = html.replace("How did each tourism system perform?","How well did each team adapt?");
    html = html.replace("Compare money with visitor, resident and environmental outcomes.","Compare market value with the consequences each strategy leaves behind.");
    return html;
  }

  function enhancePause(html){
    if(typeof html !== "string") return html;
    if(gameState?.phase === "future"){
      html = html.replace(/Slide 16 · Tourism Timeline Recap/g,"Slide 14 · 200 Years, Two Perspectives");
      html = html.replace(/CONTINUE AFTER SLIDE 16 → SHOW WINNER/g,"CONTINUE AFTER SLIDE 14 → SHOW MARKET WINNER");
    }
    if(gameState?.phase === "digital"){
      html = html.replace(/Slides 13–15 · The Future/g,"Slides 10–13 · Consequence → Adaptation");
      html = html.replace(/CONTINUE AFTER SLIDES → 2035 CRISIS/g,"CONTINUE AFTER SLIDES 10–13 → 2035 CRISIS");
    }
    return html;
  }

  function renderWinnerV27(){
    const winners = getMoneyWinners();
    const ranked = [...gameState.teams].sort((a,b)=>calculateNetWorth(b)-calculateNetWorth(a));
    const high = calculateNetWorth(winners[0]);
    const winnerNames = winners.map(team=>team.name).join(" · ");
    const adaptationRows = ranked.map(team=>`<article class="narrative-adaptation-card ${winners.includes(team)?"market-winner":""}">
      <div class="narrative-adaptation-head"><span>${team.identity.icon}</span><strong>${escapeHTML(team.name)}</strong></div>
      <div class="narrative-adaptation-metrics">
        <span>Net Worth <b>${money(calculateNetWorth(team))}</b></span>
        <span>Pressure <b>${Number(team.destinationPressure || 0)}</b></span>
        <span>Resident <b>${team.residentWellbeing ?? "—"}/5</b></span>
        <span>Environment <b>${team.environmentalHealth ?? "—"}/5</b></span>
      </div>
    </article>`).join("");

    return `<section class="strategy-modern-screen future-era winner-modern-screen narrative-winner-screen">
      <header class="strategy-modern-header">
        <div class="strategy-event-icon">🏆</div>
        <div class="screen-kicker">MARKET RESULT</div>
        <h2>${winners.length>1 ? "Joint market winners" : `${escapeHTML(winnerNames)} wins the market`}</h2>
        <div class="strategy-winner-worth">${money(high)}</div>
        <p>Highest Net Worth wins the market — but market success is only one measure.</p>
      </header>
      <div class="narrative-winner-check">
        ${cycleChip("CONSEQUENCE CHECK")}
        <h3>BUT DID YOU ACTUALLY WIN?</h3>
        <p>Money shows who captured value. Pressure, resident wellbeing and environmental health show what that growth left behind.</p>
        <div class="narrative-adaptation-grid">${adaptationRows}</div>
      </div>
      <div class="strategy-winner-handoff">Return to Canva → <strong>INNOVATION → DISRUPTION → CONSEQUENCE → ADAPTATION</strong></div>
      <div class="strategy-footer"><button class="game-btn secondary" id="strategyResetBtn" type="button">Reset Game</button></div>
    </section>`;
  }

  function decorateShock(title){
    const screen = document.getElementById("industrialShockScreen");
    const kicker = screen?.querySelector(".shock-kicker");
    const titleEl = document.getElementById("industrialShockTitle");
    if(!screen || !titleEl || screen.hidden) return;
    let chip = screen.querySelector(".narrative-shock-cycle");
    if(!chip){
      chip = document.createElement("div");
      chip.className = "narrative-cycle-chip narrative-shock-cycle";
      if(kicker) kicker.insertAdjacentElement("afterend",chip);
      else titleEl.insertAdjacentElement("beforebegin",chip);
    }
    chip.textContent = "INNOVATION → DISRUPTION";

    let line = screen.querySelector(".narrative-shock-line");
    if(!line){
      line = document.createElement("div");
      line.className = "narrative-shock-line";
      titleEl.insertAdjacentElement("afterend",line);
    }
    line.textContent = "New technology changes how people travel — then revalues the businesses serving them.";
  }

  function wrapFuturePressureRule(){
    if(document.documentElement.dataset.narrativeFutureRuleV27 === "true" || typeof takeAction !== "function") return;
    document.documentElement.dataset.narrativeFutureRuleV27 = "true";
    const previousTakeAction = takeAction;
    takeAction = function(teamId,action,selection,expectedPhase){
      const isFuture = expectedPhase === "future" && action === "strategy" && futureStrategies?.[selection];
      const team = isFuture ? gameState.teams.find(t=>t.id===teamId) : null;
      const before = team ? Number(team.destinationPressure || 0) : 0;
      const result = previousTakeAction.apply(this,arguments);
      if(team && isFuture){
        const reduction = Number(futureStrategies[selection].pressureReduction || 0);
        // Only apply here when an earlier extension did not already alter pressure.
        if(Number(team.destinationPressure || 0) === before){
          team.destinationPressure = Math.max(0,before-reduction);
        }
        gameState.message = `${team.name}: ${futureStrategies[selection].name}. Destination Pressure ${before} → ${team.destinationPressure}.`;
        if(typeof saveGameState === "function") saveGameState();
      }
      return result;
    };
  }

  function init(){
    if(document.documentElement.dataset.narrativeCycleV27 === "true") return true;
    if(typeof renderGame !== "function" || typeof renderRevaluation !== "function" || typeof renderDigitalEvent !== "function" || typeof renderCrisis !== "function" || typeof renderActions !== "function" || typeof renderWinner !== "function") return false;

    document.documentElement.dataset.narrativeCycleV27 = "true";
    loadStyles();
    configureFutureStrategies();
    wrapFuturePressureRule();

    const previousRevaluation = renderRevaluation;
    renderRevaluation = function(){ return enhanceRevaluation(previousRevaluation()); };

    const previousDigitalEvent = renderDigitalEvent;
    renderDigitalEvent = function(){ return enhanceDigitalEvent(previousDigitalEvent()); };

    const previousCrisis = renderCrisis;
    renderCrisis = function(){ return enhanceCrisis(previousCrisis()); };

    const previousActions = renderActions;
    renderActions = function(){
      const html = previousActions();
      return gameState.phase === "future" ? enhanceFutureActions(html) : html;
    };

    if(typeof renderResults === "function"){
      const previousResults = renderResults;
      renderResults = function(){
        const html = previousResults();
        return gameState.phase === "future" ? enhanceFutureResults(html) : html;
      };
    }

    if(typeof renderPause === "function"){
      const previousPause = renderPause;
      renderPause = function(){ return enhancePause(previousPause()); };
    }

    renderWinner = function(){ return renderWinnerV27(); };

    if(typeof configureShockScreen === "function"){
      const previousShock = configureShockScreen;
      configureShockScreen = function(title,...rest){
        const result = previousShock.call(this,title,...rest);
        window.setTimeout(()=>decorateShock(title),0);
        return result;
      };
    }

    const previousRenderGame = renderGame;
    renderGame = function(){
      previousRenderGame();
      if(gameState.phase === "industrialShockRevealed") decorateShock("INDUSTRIAL REVOLUTION");
      else if(gameState.mode === "strategy" && gameState.uiStage === "jetShock") decorateShock("JET AGE");
      else if(gameState.mode === "strategy" && gameState.uiStage === "digitalShock") decorateShock("DIGITAL TRANSFORMATION");
    };

    renderGame();
    return true;
  }

  if(!init()){
    let attempts = 0;
    const timer = window.setInterval(()=>{
      attempts += 1;
      if(init() || attempts > 160) window.clearInterval(timer);
    },50);
  }
})();

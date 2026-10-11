"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/strategy-layout-v14.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/strategy-layout-v14.css";
    document.head.appendChild(link);
  }

  function modernPhase(){
    return gameState?.mode === "strategy" && ["digital","future","winner"].includes(gameState.phase);
  }

  function modernScreenActive(){
    if(!modernPhase()) return false;
    if(gameState.phase === "winner") return true;
    return ["decisions","review","event","crisis","results","pause"].includes(gameState.uiStage);
  }

  function phaseClass(){
    if(gameState.phase === "future" || gameState.phase === "winner") return "future-era";
    return "digital-era";
  }

  function btn(team,action,label,selection="",disabled=false){
    return `<button type="button" class="game-btn strategy-action-btn" data-action="${action}" data-team="${team.id}" data-phase="${gameState.phase}" data-selection="${selection}" ${disabled ? "disabled" : ""}>${label}</button>`;
  }

  function backButton(){
    return '<button class="game-btn secondary strategy-back-btn" id="strategyFlowBackBtn" type="button">← Back</button>';
  }

  function footer(primary="",secondary=""){
    return `<div class="strategy-footer">${backButton()}<button class="game-btn secondary" id="strategyResetBtn" type="button">Reset Game</button>${secondary}${primary}</div>`;
  }

  function teamStatusCard(team,index,active=false){
    const done = Boolean(gameState.decisions?.[team.id]);
    const future = gameState.phase === "future" || gameState.phase === "winner";
    return `<article class="strategy-team-status ${active ? "active" : ""} ${done ? "done" : ""}">
      <div class="strategy-team-head">
        <div class="strategy-team-icon">${team.identity.icon}</div>
        <div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div>
        <b>${team.id}</b>
      </div>
      <div class="strategy-team-money"><span>NET WORTH <strong>${money(calculateNetWorth(team))}</strong></span><span>${team.cash < 0 ? "DEBT" : "CASH"} <strong>${money(team.cash)}</strong></span></div>
      ${future ? `<div class="strategy-team-flags"><span>Visitor <b>${team.visitorExperience ?? "—"}/5</b></span><span>Resident <b>${team.residentWellbeing ?? "—"}/5</b></span><span>Environment <b>${team.environmentalHealth ?? "—"}/5</b></span></div>` : `<div class="strategy-team-flags"><span>Digital Ready <b>${team.digitalReady ? "YES" : "NO"}</b></span><span>Pressure <b>${team.destinationPressure}</b></span></div>`}
      <div class="strategy-team-state">${done ? `✓ ${escapeHTML(gameState.decisions[team.id])}` : active ? "YOUR MOVE" : "WAITING"}</div>
    </article>`;
  }

  function teamStatusGrid(){
    return `<div class="strategy-team-status-grid">${gameState.teams.map((team,index)=>teamStatusCard(team,index,index===gameState.currentTeam && gameState.uiStage==="decisions")).join("")}</div>`;
  }

  function portfolioRows(team){
    return team.assets.length
      ? team.assets.map(asset => `<div class="strategy-portfolio-row"><span>${escapeHTML(asset.name)}${asset.digital ? '<small>DIGITAL</small>' : ""}</span><strong>${money(asset.currentValue)}</strong></div>`).join("")
      : '<div class="strategy-empty">No assets</div>';
  }

  function detailedTeamCard(team,index,mode="review"){
    const future = gameState.phase === "future" || gameState.phase === "winner";
    const decision = gameState.decisions?.[team.id];
    const strategy = team.futureStrategy ? futureStrategies[team.futureStrategy]?.name : null;
    return `<article class="strategy-team-block ${team.cash < 0 ? "in-debt" : ""}">
      <header class="strategy-team-block-head">
        <div class="strategy-team-icon">${team.identity.icon}</div>
        <div><strong>${escapeHTML(team.name)}</strong><span>${escapeHTML(team.identity.name)}</span></div>
        <b>${team.id}</b>
      </header>
      <div class="strategy-metric-pair"><div><span>NET WORTH</span><strong>${money(calculateNetWorth(team))}</strong></div><div><span>${team.cash < 0 ? "DEBT" : "CASH"}</span><strong>${money(team.cash)}</strong></div></div>
      <div class="strategy-portfolio-title">PORTFOLIO</div>
      <div class="strategy-portfolio-list">${portfolioRows(team)}</div>
      ${future ? `<div class="strategy-score-grid"><span>Visitor <b>${team.visitorExperience ?? "—"}/5</b></span><span>Resident <b>${team.residentWellbeing ?? "—"}/5</b></span><span>Environment <b>${team.environmentalHealth ?? "—"}/5</b></span></div>` : `<div class="strategy-score-grid digital"><span>Digital Ready <b>${team.digitalReady ? "YES" : "NO"}</b></span><span>Pressure <b>${team.destinationPressure}</b></span></div>`}
      ${mode === "review" ? `<div class="strategy-decision-pill">${escapeHTML(decision || strategy || "Pending")}</div>` : ""}
    </article>`;
  }

  function renderDigitalActions(){
    const team = gameState.teams[gameState.currentTeam];
    const eligible = team.assets.filter(asset => asset.tourism && !asset.digital);
    const selectId = "strategy-digitise-select";
    return `<section class="strategy-modern-screen digital-era decision-modern-screen">
      <header class="strategy-modern-header"><div class="screen-kicker">TEAM DECISION · DIGITAL TRANSFORMATION</div><h2>${escapeHTML(team.name)}, choose one move</h2><p>Invest in a digital-native business, digitise an existing tourism business, or hold.</p></header>
      ${teamStatusGrid()}
      <div class="strategy-quest">QUEST · BECOME DIGITALLY READY</div>
      <div class="strategy-choice-grid three">
        ${markets.digital.map(type => { const asset=assetTypes[type]; const disabled=team.cash<asset.price; return `<article class="strategy-choice-card"><span>NEW INVESTMENT</span><h3>${escapeHTML(asset.name)}</h3><div class="strategy-choice-price">${money(asset.price)}</div><p>Acquire a digital-native tourism intermediary.</p>${btn(team,"invest",`INVEST · ${money(asset.price)}`,type,disabled)}${disabled?'<small>Insufficient cash</small>':""}</article>`; }).join("")}
      </div>
      <div class="strategy-choice-grid two lower-actions">
        <article class="strategy-choice-card digitise-card"><span>TRANSFORM EXISTING BUSINESS</span><h3>Digitise one tourism business</h3><p>Pay $2 to preserve its current market value and become Digital Ready.</p><select id="${selectId}" ${!eligible.length || team.cash<2 ? "disabled" : ""}>${eligible.length ? eligible.map(asset=>`<option value="${asset.id}">${escapeHTML(asset.name)} · ${money(asset.currentValue)}</option>`).join("") : '<option value="">No eligible business</option>'}</select><button type="button" class="game-btn strategy-action-btn" data-action="digitise" data-team="${team.id}" data-phase="digital" data-select-id="${selectId}" ${!eligible.length || team.cash<2 ? "disabled" : ""}>DIGITISE · $2</button>${team.cash<2?'<small>Requires $2 cash.</small>':""}</article>
        <article class="strategy-choice-card hold-card"><span>NO CHANGE</span><h3>Hold current portfolio</h3><p>Keep cash and businesses unchanged for this era.</p>${btn(team,"hold","HOLD · KEEP CURRENT PORTFOLIO")}</article>
      </div>
      ${footer()}
    </section>`;
  }

  function renderFutureActions(){
    const team = gameState.teams[gameState.currentTeam];
    return `<section class="strategy-modern-screen future-era decision-modern-screen">
      <header class="strategy-modern-header"><div class="screen-kicker">TEAM DECISION · FUTURE</div><h2>${escapeHTML(team.name)}, choose one strategy</h2><p>Use your one Future Innovation Credit. No cash cost.</p></header>
      ${teamStatusGrid()}
      <div class="strategy-quest">1 FUTURE INNOVATION CREDIT · NO CASH COST</div>
      <div class="strategy-choice-grid two future-choice-grid">
        ${Object.entries(futureStrategies).map(([key,strategy])=>`<article class="strategy-choice-card future-strategy-card"><span>2035 RESPONSE</span><h3>${escapeHTML(strategy.name)}</h3><p>${escapeHTML(strategy.purpose)}</p><div class="strategy-impact-grid"><span>Cash <b>+$${strategy.cash}</b></span><span>Visitor <b>+${strategy.visitorExperience}</b></span><span>Resident <b>+${strategy.residentWellbeing}</b></span><span>Environment <b>+${strategy.environmentalHealth}</b></span></div>${btn(team,"strategy",`CHOOSE ${strategy.name.toUpperCase()}`,key)}</article>`).join("")}
      </div>
      ${footer()}
    </section>`;
  }

  function renderModernSelection(){
    const draft = navigationState.selection;
    if(!draft) return "";
    const team = gameState.teams.find(t=>t.id===draft.teamId);
    const asset = team?.assets.find(a=>a.id===draft.selection);
    const name = draft.action === "strategy" ? futureStrategies[draft.selection]?.name : draft.action === "invest" ? assetTypes[draft.selection]?.name : asset?.name || "No change";
    const descriptions = {invest:"Cash is exchanged for a new business of the same value.",digitise:"Pay $2 to make this tourism business digitally ready while preserving its market value.",hold:"Keep the current portfolio unchanged.",strategy:"Use this team's Future Innovation Credit."};
    return `<section class="strategy-modern-screen ${phaseClass()} confirm-modern-screen"><div class="strategy-confirm-card"><div class="screen-kicker">CONFIRM DECISION</div><div class="strategy-team-icon">${team.identity.icon}</div><h2>${escapeHTML(team.name)}</h2><span class="strategy-confirm-action">${escapeHTML(draft.action.toUpperCase())}</span><h3>${escapeHTML(name)}</h3><p>${escapeHTML(descriptions[draft.action] || "Confirm this move.")}</p><div class="strategy-confirm-note">Nothing is committed until you confirm.</div><button class="game-btn" type="button" id="confirmDecisionBtn">CONFIRM DECISION</button></div>${footer()}</section>`;
  }

  function renderModernReview(){
    const future = gameState.phase === "future";
    const title = future ? "Future strategies chosen" : "Digital decisions complete";
    const lock = future ? "LOCK FINAL STRATEGIES" : "LOCK & REVEAL FIT BOOM";
    return `<section class="strategy-modern-screen ${phaseClass()} review-modern-screen"><header class="strategy-modern-header"><div class="screen-kicker">FINAL CHECK · ${future?"FUTURE":"DIGITAL TRANSFORMATION"}</div><h2>${title}</h2><p>Review all three teams before locking this era.</p></header><div class="strategy-team-block-grid">${gameState.teams.map((team,index)=>detailedTeamCard(team,index,"review")).join("")}</div>${footer(`<button class="game-btn" data-flow-action="lock" type="button">${lock}</button>`,`<button class="game-btn secondary" data-flow-action="undo" type="button" ${!gameState.lastDecision?"disabled":""}>UNDO LAST DECISION</button>`)}</section>`;
  }

  function renderModernDigitalEvent(){
    return `<section class="strategy-modern-screen digital-era event-modern-screen"><header class="strategy-modern-header"><div class="strategy-event-icon">📱</div><div class="screen-kicker">SHARED MARKET EVENT</div><h2>Free Independent Travel Boom</h2><p>Search, comparison, booking and navigation shift toward independent travellers.</p></header><div class="strategy-impact-banner"><span>ALL TEAMS · PRESSURE +1</span><span>DIGITAL READY · CASH +$2</span></div><div class="strategy-team-block-grid">${gameState.teams.map((team,index)=>`<article class="strategy-team-block event-team"><header class="strategy-team-block-head"><div class="strategy-team-icon">${team.identity.icon}</div><div><strong>${escapeHTML(team.name)}</strong><span>${team.digitalReady?"DIGITAL READY":"NOT DIGITAL READY"}</span></div><b>${team.id}</b></header><div class="strategy-event-result ${team.digitalReady?"positive":"neutral"}"><strong>${team.digitalReady?"+$2 CASH":"NO CASH BONUS"}</strong><span>Destination Pressure +1</span></div><div class="strategy-metric-pair"><div><span>NET WORTH</span><strong>${money(calculateNetWorth(team))}</strong></div><div><span>PRESSURE</span><strong>${team.destinationPressure}</strong></div></div></article>`).join("")}</div>${footer('<button class="game-btn" data-flow-action="continue" type="button">VIEW PRESENT ERA RESULTS</button>')}</section>`;
  }

  function renderModernCrisis(){
    return `<section class="strategy-modern-screen future-era crisis-modern-screen"><header class="strategy-modern-header"><div class="strategy-event-icon">🚨</div><div class="screen-kicker">2035 TOURISM CRISIS</div><h2>The destination is under pressure</h2><p>Growth created value — but it also created pressure the destination now has to absorb.</p></header><div class="strategy-crisis-tags"><span>Visitor demand surges</span><span>Major attraction overcrowded</span><span>Extreme weather disruption</span><span>Transport strained</span><span>Resident frustration rising</span></div><div class="strategy-impact-banner danger"><span>CRISIS IMPACT · CASH −$2</span><span>VISITOR −2 · RESIDENT −1 · ENVIRONMENT −1</span></div><div class="strategy-team-block-grid">${gameState.teams.map((team,index)=>detailedTeamCard(team,index,"crisis")).join("")}</div>${footer('<button class="game-btn" data-flow-action="continue" type="button">CHOOSE A FUTURE STRATEGY</button>')}</section>`;
  }

  function renderModernResults(){
    const future = gameState.phase === "future";
    return `<section class="strategy-modern-screen ${phaseClass()} results-modern-screen"><header class="strategy-modern-header"><div class="screen-kicker">${future?"FINAL OUTCOMES":"PRESENT ERA COMPLETE"}</div><h2>${future?"How did each tourism system perform?":"Digital transformation results"}</h2><p>${future?"Compare money with visitor, resident and environmental outcomes.":"Compare who captured digital value and who accumulated destination pressure."}</p></header><div class="strategy-team-block-grid results-grid">${gameState.teams.map((team,index)=>detailedTeamCard(team,index,"results")).join("")}</div>${footer('<button class="game-btn" data-flow-action="continue" type="button">RETURN TO PRESENTATION CHECKPOINT</button>')}</section>`;
  }

  function renderModernPause(){
    const future = gameState.phase === "future";
    const title = future ? "Future era complete" : "Present era complete";
    const handoff = future ? "Slide 16 · Tourism Timeline Recap" : "Slides 13–15 · The Future";
    const button = future ? '<button class="game-btn" data-next-phase="future" type="button">CONTINUE AFTER SLIDE 16 → SHOW WINNER</button>' : '<button class="game-btn" data-next-phase="digital" type="button">CONTINUE AFTER SLIDES → 2035 CRISIS</button>';
    return `<section class="strategy-modern-screen ${phaseClass()} checkpoint-modern-screen"><header class="strategy-modern-header"><div class="strategy-event-icon">✓</div><div class="screen-kicker">${future?"FINAL PRESENTATION CHECKPOINT":"PRESENTATION CHECKPOINT"}</div><h2>${title}</h2><p>Portfolios are locked for this era.</p></header><div class="strategy-checkpoint-card"><span>SWITCH TO CANVA</span><strong>${handoff}</strong><p>${future?"Return to reveal the money winner.":"Return after Regenerative Tourism."}</p></div><div class="strategy-team-block-grid checkpoint-teams">${gameState.teams.map((team,index)=>detailedTeamCard(team,index,"checkpoint")).join("")}</div>${footer(button)}</section>`;
  }

  function renderModernWinner(){
    const winners = getMoneyWinners();
    const high = calculateNetWorth(winners[0]);
    const ranked = [...gameState.teams].sort((a,b)=>calculateNetWorth(b)-calculateNetWorth(a));
    return `<section class="strategy-modern-screen future-era winner-modern-screen"><header class="strategy-modern-header"><div class="strategy-event-icon">🏆</div><div class="screen-kicker">TOURISMOPOLY MONEY RESULT</div><h2>${winners.length>1?"Joint money winners":`${escapeHTML(winners[0].name)} wins the money game`}</h2><div class="strategy-winner-worth">${money(high)}</div><p>Highest calculated Net Worth wins — for now.</p></header><div class="strategy-ranking-grid">${ranked.map((team,index)=>`<article class="strategy-rank-card ${winners.includes(team)?"winner":""}"><span>#${index+1}</span><div class="strategy-team-icon">${team.identity.icon}</div><h3>${escapeHTML(team.name)}</h3><strong>${money(calculateNetWorth(team))}</strong><small>${escapeHTML(team.identity.name)}</small></article>`).join("")}</div><div class="strategy-winner-handoff">Return to Canva → <strong>But Did You Actually Win?</strong></div>${footer()}</section>`;
  }

  function init(){
    if(document.documentElement.dataset.strategyLayoutV14 === "true") return true;
    if(typeof renderGame !== "function" || typeof renderActions !== "function" || typeof renderSelection !== "function" || typeof renderDecisionReview !== "function" || typeof renderDigitalEvent !== "function" || typeof renderCrisis !== "function" || typeof renderResults !== "function" || typeof renderPause !== "function" || typeof renderWinner !== "function") return false;

    document.documentElement.dataset.strategyLayoutV14 = "true";
    loadStyles();

    const originalRenderActions = renderActions;
    renderActions = function(){
      if(gameState.phase === "digital") return renderDigitalActions();
      if(gameState.phase === "future") return renderFutureActions();
      return originalRenderActions();
    };

    const originalRenderSelection = renderSelection;
    renderSelection = function(){
      if(["digital","future"].includes(gameState.phase)) return renderModernSelection();
      return originalRenderSelection();
    };

    const originalRenderDecisionReview = renderDecisionReview;
    renderDecisionReview = function(){
      if(["digital","future"].includes(gameState.phase)) return renderModernReview();
      return originalRenderDecisionReview();
    };

    const originalRenderDigitalEvent = renderDigitalEvent;
    renderDigitalEvent = function(){ return gameState.phase === "digital" ? renderModernDigitalEvent() : originalRenderDigitalEvent(); };

    const originalRenderCrisis = renderCrisis;
    renderCrisis = function(){ return gameState.phase === "future" ? renderModernCrisis() : originalRenderCrisis(); };

    const originalRenderResults = renderResults;
    renderResults = function(){ return ["digital","future"].includes(gameState.phase) ? renderModernResults() : originalRenderResults(); };

    const originalRenderPause = renderPause;
    renderPause = function(){ return ["digital","future"].includes(gameState.phase) ? renderModernPause() : originalRenderPause(); };

    const originalRenderWinner = renderWinner;
    renderWinner = function(){ return gameState.phase === "winner" ? renderModernWinner() : originalRenderWinner(); };

    const originalRenderGame = renderGame;
    renderGame = function(){
      originalRenderGame();
      const active = modernScreenActive() || (["digital","future"].includes(gameState.phase) && navigationState?.currentView?.type === "selection");
      const game = document.getElementById("gameScreen");
      if(game) game.classList.toggle("strategy-modern-mode",active);
      document.body.classList.toggle("strategy-modern-active",active);
    };

    document.addEventListener("click",event=>{
      const back = event.target.closest("#strategyFlowBackBtn");
      if(back){
        event.preventDefault();
        event.stopImmediatePropagation();
        if(typeof navigateBack === "function" && navigateBack()) renderGame();
        return;
      }
      const reset = event.target.closest("#strategyResetBtn");
      if(reset){
        event.preventDefault();
        event.stopImmediatePropagation();
        resetGame();
        renderGame();
      }
    },true);

    renderGame();
    return true;
  }

  if(!init()){
    let attempts=0;
    const timer=window.setInterval(()=>{
      attempts+=1;
      if(init() || attempts>180) window.clearInterval(timer);
    },50);
  }
})();

"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const source = ["data","board-data","state","setup","game","monopoly","navigation"]
  .map(name => fs.readFileSync(path.join(__dirname,"../js",`${name}.js`),"utf8")).join("\n");
function game(){
  const context = vm.createContext({});vm.runInContext(source,context);
  return code => vm.runInContext(code,context);
}
function snapshot(run){return run('JSON.stringify(gameState)');}
function start(run){
  run('syncNavigation(); gameState.setupSelected=[{index:0},{index:1},{index:2}]; applySetupFromDraw(); syncNavigation();');
}
function land(run,steps){
  run(`beginMonopolyRoll(${steps});syncNavigation();beginMonopolyMovement();while(gameState.board.stepsRemaining)advanceMonopolyStep();resolveLanding();syncNavigation();`);
}
function steam(run){
  start(run);
  run(`for(let i=0;i<6;i++){
    if(i)nextTeam();beginMonopolyRoll(i<3?1:2);beginMonopolyMovement();
    while(gameState.board.stepsRemaining)advanceMonopolyStep();resolveLanding();finishMonopolyLanding("pass");
  }triggerTechShock();syncNavigation();applyIndustrialRevolution();syncNavigation();`);
}
function holdAll(run){run('while(!gameState.phaseComplete)takeAction(gameState.teams[gameState.currentTeam].id,"hold",null,gameState.phase);syncNavigation();');}
function next(run){run('startNextPhase(gameState.phase);syncNavigation();');}
function unchangedBack(run){
  const before = snapshot(run);
  assert.equal(run('navigateBack()'),true);
  run('syncNavigation()');assert.equal(snapshot(run),before);
}
test("initial entry hides Back; internal history never rewrites identities or uses browser history", () => {
  const run=game();run('syncNavigation()');assert.equal(run('canNavigateBack()'),false);
  start(run);unchangedBack(run);
  assert.equal(run('navigationState.currentView.type'),"identity");
  assert.equal(run('isCurrentView()'),false);
  assert.equal(run('gameState.mode'),"monopoly");
  assert.equal(run('canNavigateBack()'),false);
});
test("Back is disabled during dice and movement, and leaves roll/GO results untouched", () => {
  const run=game();start(run);run('gameState.board.positions[0]=7;beginMonopolyRoll(2);syncNavigation();');
  for(const step of ['','beginMonopolyMovement();advanceMonopolyStep();']){
    run(step+'syncNavigation();');const before=snapshot(run);
    assert.equal(run('canNavigateBack()'),false);assert.equal(run('navigateBack()'),false);
    assert.equal(snapshot(run),before);
  }
  run('advanceMonopolyStep();resolveLanding();syncNavigation();');
  unchangedBack(run);assert.equal(run('gameState.teams[0].cash'),10);
});
test("Back dismisses an unresolved popup without resolving it; confirmed Buy and Pass cannot replay", () => {
  for(const action of ['buy','pass']){
    const run=game();start(run);land(run,5);
    unchangedBack(run);assert.equal(run('navigationState.currentView.type'),"landing");
    assert.equal(run('gameState.board.status'),"landing");
    assert.throws(() => run('nextTeam()'));
    run('openLandingDecision()');assert.equal(run('navigationState.currentView.type'),"landing-detail");
    run(`finishMonopolyLanding("${action}");syncNavigation();`);
    unchangedBack(run);assert.equal(run('isCurrentView()'),false);
    assert.equal(run('openLandingDecision()'),false);
    assert.throws(() => run(`finishMonopolyLanding("${action}")`));
    assert.equal(run('gameState.teams[0].assets.length'),action==='buy'?2:1);
  }
});
test("completed phase pauses return to read-only reviews without unlocking; Back never reverses revaluation", () => {
  const run=game();steam(run);
  const steamCash=run('gameState.teams.map(t => t.cash).join(",")');
  unchangedBack(run);assert.equal(run('gameState.phase'),"steam");
  assert.equal(run('gameState.teams[1].assets[0].currentValue'),6);
  assert.equal(run('gameState.teams.map(t => t.cash).join(",")'),steamCash);
  run('resumeCurrentGame()');holdAll(run);
  unchangedBack(run);assert.equal(run('navigationState.currentView.type'),"phase-review");
  assert.equal(run('gameState.phaseComplete'),true);
  const before=snapshot(run);run('showPresentationPause()');assert.equal(snapshot(run),before);
  assert.equal(run('navigationState.currentView.type'),"pause");
  next(run); // Jet automatically revalues and pauses.
  unchangedBack(run);assert.equal(run('navigationState.currentView.type'),"phase-review");
  assert.equal(run('gameState.teams[1].assets[0].currentValue'),3);
});
test("unconfirmed strategy selections can be abandoned; Back cannot undo adaptation or make it actionable again", () => {
  const run=game();steam(run);run('takeAction("A","hold",null,"steam");syncNavigation();');
  const before=snapshot(run);
  run('openStrategySelection("B","adapt",gameState.teams[1].assets[0].id,"steam")');
  assert.equal(snapshot(run),before);unchangedBack(run);
  assert.equal(run('navigationState.selection'),null);
  assert.equal(run('navigationState.currentView.type'),"overview");
  run('openStrategySelection("B","adapt",gameState.teams[1].assets[0].id,"steam");takeAction("B","adapt",gameState.teams[1].assets[0].id,"steam");syncNavigation();');
  unchangedBack(run);assert.equal(run('isCurrentView()'),false);
  assert.equal(run('gameState.teams[1].assets[0].type'),"steamShipping");
  assert.equal(run('openStrategySelection("B","adapt",gameState.teams[1].assets[0].id,"steam")'),false);
});
test("explicit Undo Last Decision restores the last action only and never reverts the phase's revaluation", () => {
  const run=game();steam(run);run('takeAction("A","hold",null,"steam");syncNavigation();');
  run('takeAction("B","adapt",gameState.teams[1].assets[0].id,"steam");syncNavigation();');
  unchangedBack(run);assert.equal(run('gameState.teams[1].cash'),5);
  run('resumeCurrentGame();undoLastDecision();syncNavigation();');
  assert.equal(run('gameState.teams[1].cash'),6);
  assert.equal(run('gameState.teams[1].assets[0].type'),"legacyShipping");
  assert.equal(run('gameState.teams[1].assets[0].currentValue'),6);
  assert.equal(run('gameState.decisions.A'),"HOLD");
  assert.equal(run('gameState.lastDecision'),null);
  assert.throws(() => run('undoLastDecision()'));
  holdAll(run);next(run);assert.throws(() => run('undoLastDecision()'));
});
test("digital undo restores the shared FIT event atomically; Back alone changes none of it", () => {
  const run=game();steam(run);holdAll(run);next(run);next(run);
  run('takeAction("A","invest","booking","digital");takeAction("B","hold",null,"digital");syncNavigation();');
  const beforeFinal=run('JSON.stringify({teams:gameState.teams,events:gameState.events,pressure:gameState.destinationPressure})');
  run('takeAction("C","digitise",gameState.teams[2].assets[0].id,"digital");syncNavigation();');
  unchangedBack(run);assert.equal(run('gameState.events.fitBoom'),true);
  run('undoLastDecision();syncNavigation()');
  assert.equal(run('JSON.stringify({teams:gameState.teams,events:gameState.events,pressure:gameState.destinationPressure})'),beforeFinal);
  assert.equal(run('gameState.phaseComplete'),false);
  run('takeAction("C","hold",null,"digital");syncNavigation();');
  assert.equal(run('gameState.destinationPressure'),1);
});
test("Back preserves crisis and future strategy; explicit strategy undo preserves crisis baseline", () => {
  const run=game();steam(run);holdAll(run);next(run);next(run);holdAll(run);next(run);
  const baseline=run('JSON.stringify(gameState.teams[0])');
  run('openStrategySelection("A","strategy","agenticAI","future");takeAction("A","strategy","agenticAI","future");syncNavigation();');
  unchangedBack(run);assert.equal(run('gameState.teams[0].futureStrategy'),"agenticAI");
  run('undoLastDecision();syncNavigation()');assert.equal(run('JSON.stringify(gameState.teams[0])'),baseline);
  assert.equal(run('gameState.events.crisis'),true);
});
test("reset clears views and drafts; no historical action becomes current after an undo", () => {
  const run=game();steam(run);
  run('openStrategySelection("A","invest","rail","steam");takeAction("A","invest","rail","steam");syncNavigation();undoLastDecision();syncNavigation();');
  unchangedBack(run);assert.equal(run('isCurrentView()'),false);
  run('resetGame();syncNavigation()');
  assert.equal(run('navigationState.previousViews.length'),0);
  assert.equal(run('navigationState.selection'),null);
  assert.equal(run('navigationState.currentView.type'),"identity");
});
test("Back after a deliberate shock only visits read-only views and cannot resume or undo Monopoly", () => {
  const run=game();start(run);
  run(`for(let i=0;i<3;i++){
    if(i)nextTeam();beginMonopolyRoll(1);beginMonopolyMovement();advanceMonopolyStep();
    resolveLanding();finishMonopolyLanding("pass");syncNavigation();
  }togglePresenterControls();triggerTechShock();syncNavigation();`);
  assert.equal(run('navigationState.currentView.type'),"industrial-shock");
  const revealed=snapshot(run);
  unchangedBack(run);
  assert.equal(run('isCurrentView()'),false);
  assert.throws(() => run('beginMonopolyRoll(1)'));
  assert.throws(() => run('nextTeam()'));
  assert.throws(() => run('undoLastGrandTourTurn()'));
  run('resumeCurrentGame();syncNavigation();');
  assert.equal(snapshot(run),revealed);
  assert.equal(run('navigationState.currentView.type'),"industrial-shock");
  run('applyIndustrialRevolution();syncNavigation();');
  unchangedBack(run);
  assert.equal(run('gameState.phase'),"steam");
  assert.throws(() => run('applyIndustrialRevolution()'));
});

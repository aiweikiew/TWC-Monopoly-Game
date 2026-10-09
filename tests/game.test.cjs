"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const source = ["data","board-data","state","setup","game","monopoly","navigation"].map(name => fs.readFileSync(path.join(__dirname,"../js",`${name}.js`),"utf8")).join("\n");
function game(){
  const context = vm.createContext({});
  vm.runInContext(source,context);
  return code => vm.runInContext(code,context);
}
function start(run, identities=[0,1,2]){
  run(`gameState.setupSelected = ${JSON.stringify(identities.map(index => ({index})))}; applySetupFromDraw();`);
}
function holdAll(run){
  if(run('gameState.mode') === "monopoly"){
    run(`while(gameState.totalTurnCount < 6){
      if(gameState.board.status === "resolved") nextTeam();
      beginMonopolyRoll(gameState.board.positions[gameState.currentTeam] === 0 ? 1 : 2);
      beginMonopolyMovement();
      while(gameState.board.stepsRemaining) advanceMonopolyStep();
      resolveLanding(); finishMonopolyLanding("pass");
    } triggerTechShock();`);
  } else run('while(!gameState.phaseComplete) takeAction(gameState.teams[gameState.currentTeam].id,"hold",null,gameState.phase)');
}
function next(run){run('gameState.phase === "industrialShockRevealed" ? applyIndustrialRevolution() : startNextPhase(gameState.phase)');}
function snapshot(run){return run('JSON.stringify(gameState)');}
function rejectsUnchanged(run, code){
  const before = snapshot(run);
  assert.throws(() => run(code));
  assert.equal(snapshot(run),before);
}
test("unique random draws, every identity starts at calculated $10, and confirmation starts Monopoly", () => {
  const run = game();
  for(let i=0;i<200;i++){
    run('resetGame(); setupDraw(); setupDraw(); setupDraw();');
    assert.equal(run('gameState.phase'),"setup");
    assert.equal(run('gameState.teams.length'),0);
    run('applySetupFromDraw()');
    assert.equal(run('new Set(gameState.teams.map(t => t.identity.key)).size'),3);
    assert.equal(run('gameState.teams.every(t => calculateNetWorth(t) === 10 && !Object.hasOwn(t,"netWorth"))'),true);
    assert.equal(run('gameState.phase'),"starting");
    assert.equal(run('setupDraw()'),false);
  }
  assert.equal(run('identityPool.every((_,i) => calculateNetWorth(createTeam(i,0)) === 10)'),true);
});
test("draw undo/reset and invalid identity confirmation cannot start a game", () => {
  const run = game();
  assert.equal(run('applySetupFromDraw()'),false);
  run('setupDraw(); setupUndo();');
  assert.equal(run('gameState.setupSelected.length'),0);
  run('setupDraw(); setupReset();');
  assert.equal(run('gameState.setupSelected.length'),0);
  run('gameState.setupSelected = [{index:0},{index:0},{index:2}]');
  assert.equal(run('applySetupFromDraw()'),false);
});
test("strategy investments convert cash to assets and multiple teams can buy the same type", () => {
  const run = game(); start(run); holdAll(run); next(run);
  rejectsUnchanged(run,'startNextPhase("steam")');
  rejectsUnchanged(run,'takeAction("B","hold",null,"steam")');
  rejectsUnchanged(run,'takeAction("A","invest","ota","steam")');
  const worth = run('calculateNetWorth(gameState.teams[0])');
  run('takeAction("A","invest","steamShipping","steam")');
  assert.equal(run('gameState.teams[0].cash'),5);
  assert.equal(run('calculateNetWorth(gameState.teams[0])'),worth);
  rejectsUnchanged(run,'takeAction("A","invest","steamShipping","steam")');
  run('takeAction("B","invest","steamShipping","steam")');
  assert.equal(run('gameState.teams[0].assets[1].id !== gameState.teams[1].assets[1].id'),true);
  run('takeAction("C","hold",null,"steam")');
  assert.equal(run('gameState.teams[2].cash'),5);
  assert.equal(run('gameState.phaseComplete'),true);
  assert.equal(run('gameState.phase'),"steam");
});
test("Steam revalues every relevant legacy/investment and recalculates worth", () => {
  const run = game(); start(run);
  run('gameState.teams[0].assets = Object.keys(revaluations.steam).map(createAsset)');
  holdAll(run); next(run);
  assert.equal(run('gameState.teams[0].assets.map(a => a.currentValue).join(",")'),"1,6,2,6,4,1,4,6,3");
  assert.equal(run('calculateNetWorth(gameState.teams[0])'),42);
  assert.equal(run('gameState.revaluationLog[1].oldValue'),4);
  assert.equal(run('gameState.revaluationLog[1].newValue'),6);
  rejectsUnchanged(run,'startNextPhase("starting")');
});
test("sell preserves NW; adaptation costs $1, retains value/id and changes form", () => {
  const run = game(); start(run,[1,2,0]); holdAll(run); next(run);
  const worth = run('calculateNetWorth(gameState.teams[0])');
  run('takeAction("A","sell",gameState.teams[0].assets[0].id,"steam")');
  assert.equal(run('calculateNetWorth(gameState.teams[0])'),worth);
  assert.equal(run('gameState.teams[0].assets.length'),0);
  const id = run('gameState.teams[1].assets[0].id');
  run('takeAction("B","adapt",gameState.teams[1].assets[0].id,"steam")');
  assert.equal(run('gameState.teams[1].assets[0].id'),id);
  assert.equal(run('gameState.teams[1].assets[0].type'),"transfer");
  assert.equal(run('gameState.teams[1].assets[0].currentValue'),2);
  assert.equal(run('calculateNetWorth(gameState.teams[1])'),6);
  rejectsUnchanged(run,'takeAction("C","adapt",gameState.teams[2].assets[0].id,"steam")');
});
test("all eight adaptation mappings preserve revalued amounts", () => {
  for(const [type,target] of Object.entries({legacyCoach:"transfer",horse:"transfer",legacyInn:"hotel",inn:"hotel",legacyShipping:"steamShipping",shipping:"steamShipping",legacyPublishing:"guidebook",guide:"guidebook"})){
    const run = game(); start(run); holdAll(run); next(run);
    run(`gameState.teams[0].assets = [createAsset("${type}")]; gameState.teams[0].assets[0].currentValue = 6; takeAction("A","adapt",gameState.teams[0].assets[0].id,"steam")`);
    assert.equal(run('gameState.teams[0].assets[0].type'),target);
    assert.equal(run('gameState.teams[0].assets[0].currentValue'),6);
  }
});
test("insufficient cash rejects purchases/adaptation/digitisation without consuming decisions", () => {
  const run = game(); start(run,[1,2,3]);
  run('gameState.teams[0].cash = 0');
  rejectsUnchanged(run,'takeAction("A","invest","horse","starting")');
  holdAll(run); next(run);
  rejectsUnchanged(run,'takeAction("A","invest","rail","steam")');
  rejectsUnchanged(run,'takeAction("A","adapt",gameState.teams[0].assets[0].id,"steam")');
  holdAll(run); next(run); next(run);
  rejectsUnchanged(run,'takeAction("A","invest","ota","digital")');
  rejectsUnchanged(run,'takeAction("A","digitise",gameState.teams[0].assets[0].id,"digital")');
});
test("Steam investment then Jet revaluation only; guidebook and unlisted assets hold value", () => {
  const run = game(); start(run); holdAll(run); next(run);
  run('takeAction("A","invest","rail","steam")');
  assert.equal(run('calculateNetWorth(gameState.teams[0])'),10);
  holdAll(run);
  run('gameState.teams[0].assets = ["rail","tour","hotel","transfer","steamShipping","shipping","legacyShipping","guidebook","horse"].map(createAsset); gameState.teams[0].assets.forEach(a => a.currentValue = 4)');
  next(run);
  assert.equal(run('gameState.teams[0].assets.map(a => a.currentValue).join(",")'),"5,6,7,4,3,3,3,4,4");
  for(const action of ["hold","sell","adapt","invest"]) rejectsUnchanged(run,`takeAction("A","${action}",null,"jet")`);
  assert.equal(run('gameState.phaseComplete'),true);
});
test("digital revaluation and both readiness routes; shared FIT event applies exactly once", () => {
  const run = game(); start(run,[4,0,1]); holdAll(run); next(run); holdAll(run); next(run); next(run);
  assert.equal(run('gameState.teams[0].assets[0].currentValue'),2);
  const worth = run('calculateNetWorth(gameState.teams[0])');
  run('takeAction("A","digitise",gameState.teams[0].assets[0].id,"digital")');
  assert.equal(run('calculateNetWorth(gameState.teams[0])'),worth-2);
  assert.equal(run('gameState.teams[0].assets[0].digital'),true);
  rejectsUnchanged(run,'takeAction("B","digitise",gameState.teams[1].assets[0].id,"digital")');
  run('takeAction("B","invest","booking","digital")');
  assert.equal(run('gameState.events.fitBoom'),false);
  const cash = JSON.parse(run('JSON.stringify(gameState.teams.map(t => t.cash))'));
  run('takeAction("C","hold",null,"digital")');
  assert.equal(run('gameState.teams.map(t => t.cash).join(",")'),[cash[0]+2,cash[1]+2,cash[2]].join(","));
  assert.equal(run('gameState.teams.map(t => t.destinationPressure).join(",")'),"1,1,1");
  assert.equal(run('gameState.destinationPressure'),1);
  assert.equal(run('gameState.teams.map(t => t.digitalReady).join(",")'),"true,true,false");
  const before = snapshot(run); run('applyFITBoom()'); assert.equal(snapshot(run),before);
});
test("all digital-native investments mark readiness; intermediary revaluation leaves physical assets alone", () => {
  for(const type of ["ota","booking","marketplace"]){
    const run = game(); start(run); holdAll(run); next(run); holdAll(run); next(run);
    run('gameState.teams[0].assets = ["tour","legacyPublishing","guide","guidebook","hotel","rail","transfer","steamShipping"].map(createAsset); gameState.teams[0].assets.forEach(a => a.currentValue = 6)');
    next(run);
    assert.equal(run('gameState.teams[0].assets.map(a => a.currentValue).join(",")'),"4,2,2,2,6,6,6,6");
    run(`takeAction("A","invest","${type}","digital")`);
    assert.equal(run('gameState.teams[0].digitalReady && gameState.teams[0].assets.at(-1).digital'),true);
  }
});
test("crisis and strategies apply once, allow negative cash, clamp scores, preserve outcomes at winner", () => {
  const run = game(); start(run); holdAll(run); next(run); holdAll(run); next(run); next(run); holdAll(run);
  run('gameState.teams[0].cash = 0; gameState.teams[2].destinationPressure = 9');
  next(run);
  assert.equal(run('gameState.teams[0].cash'),-2);
  assert.equal(run('[gameState.teams[0].visitorExperience,gameState.teams[0].residentWellbeing,gameState.teams[0].environmentalHealth].join(",")'),"1,1,1");
  assert.equal(run('gameState.teams[2].environmentalHealth'),0);
  const before = snapshot(run); run('applyFutureCrisis()'); assert.equal(snapshot(run),before);
  rejectsUnchanged(run,'startNextPhase("future")');
  run('takeAction("A","strategy","agenticAI","future")');
  assert.equal(run('[gameState.teams[0].cash,gameState.teams[0].visitorExperience,gameState.teams[0].residentWellbeing,gameState.teams[0].environmentalHealth].join(",")'),"0,3,1,1");
  rejectsUnchanged(run,'takeAction("A","strategy","regenerative","future")');
  run('takeAction("B","strategy","regenerative","future")');
  assert.equal(run('[gameState.teams[1].visitorExperience,gameState.teams[1].residentWellbeing,gameState.teams[1].environmentalHealth].join(",")'),"2,3,3");
  run('gameState.teams[2].visitorExperience = 5; gameState.teams[2].residentWellbeing = 5; gameState.teams[2].environmentalHealth = 5; takeAction("C","strategy","regenerative","future")');
  assert.equal(run('gameState.teams.every(t => [t.visitorExperience,t.residentWellbeing,t.environmentalHealth].every(n => n >= 0 && n <= 5))'),true);
  const teams = run('JSON.stringify(gameState.teams)'); next(run);
  assert.equal(run('JSON.stringify(gameState.teams)'),teams);
  assert.equal(run('gameState.phase'),"winner");
  rejectsUnchanged(run,'takeAction("C","strategy","agenticAI","future")');
  rejectsUnchanged(run,'startNextPhase("winner")');
});
test("ties, reset after full flow, and refresh create a clean initial state", () => {
  const run = game(); const clean = snapshot(run); start(run);
  assert.equal(run('getMoneyWinners().length'),3);
  holdAll(run); next(run); holdAll(run); next(run); next(run); holdAll(run); next(run);
  run('for(const team of gameState.teams) takeAction(team.id,"strategy","agenticAI","future")');
  next(run);
  run('gameState.teams.forEach(t => t.cash = 20 - t.assets.reduce((n,a) => n+a.currentValue,0))');
  assert.equal(run('getMoneyWinners().length'),3);
  run('gameState.teams[0].cash += 1');
  assert.equal(run('getMoneyWinners().map(t => t.id).join(",")'),"A");
  run('resetGame()'); assert.equal(snapshot(run),clean);
  assert.equal(snapshot(game()),clean);
});
function land(run,steps){
  run(`beginMonopolyRoll(${steps}); beginMonopolyMovement(); while(gameState.board.stepsRemaining) advanceMonopolyStep(); resolveLanding();`);
}
function complete(run,steps,action="pass"){
  land(run,steps); run(`finishMonopolyLanding("${action}")`);
}
test("third identity can be undone/reset; explicit confirmation alone starts the board", () => {
  const run=game();
  run('setupDraw(); setupDraw(); setupDraw();');
  assert.equal(run('gameState.mode'),"setup");
  assert.equal(run('setupUndo()'),true);
  assert.equal(run('gameState.setupSelected.length'),2);
  run('setupDraw(); setupReset();');
  assert.equal(run('gameState.setupSelected.length'),0);
  run('setupDraw(); setupDraw(); setupDraw(); applySetupFromDraw();');
  assert.equal(run('gameState.mode'),"monopoly");
  assert.equal(run('gameState.board.status'),"ready");
  assert.equal(run('applySetupFromDraw()'),false);
  rejectsUnchanged(run,'takeAction("A","hold",null,"starting")');
});
test("Grand Tour continues past six turns in fair rounds; mid-turn shock triggers are rejected", () => {
  const run=game(); start(run);
  const turns=[];
  assert.equal(run('canTriggerTechShock()'),false);
  for(let i=0;i<9;i++){
    turns.push(run('gameState.teams[gameState.currentTeam].id'));
    rejectsUnchanged(run,'nextTeam()');
    run(`beginMonopolyRoll(${i<3 ? 1 : 2})`);
    rejectsUnchanged(run,'beginMonopolyRoll(1)'); rejectsUnchanged(run,'nextTeam()');
    rejectsUnchanged(run,'triggerTechShock()');
    rejectsUnchanged(run,'finishMonopolyLanding("pass")');
    run('beginMonopolyMovement()');
    rejectsUnchanged(run,'nextTeam()'); rejectsUnchanged(run,'resolveLanding()');
    rejectsUnchanged(run,'triggerTechShock()');
    run('while(gameState.board.stepsRemaining) advanceMonopolyStep(); resolveLanding();');
    assert.equal(run('gameState.totalTurnCount'),i);
    rejectsUnchanged(run,'nextTeam()'); rejectsUnchanged(run,'beginMonopolyRoll(1)');
    rejectsUnchanged(run,'triggerTechShock()');
    run('finishMonopolyLanding("pass")');
    rejectsUnchanged(run,'finishMonopolyLanding("pass")');
    rejectsUnchanged(run,'beginMonopolyRoll(1)');
    assert.equal(run('gameState.roundNumber'),Math.floor((i+1)/3)+1);
    assert.equal(run('gameState.phaseComplete'),false);
    assert.equal(run('gameState.board.status'),"resolved");
    assert.equal(run('canTriggerTechShock()'),(i+1)%3===0);
    if(i<8)run('nextTeam()');
  }
  assert.deepEqual(turns,["A","B","C","A","B","C","A","B","C"]);
  assert.equal(run('gameState.board.rolls.join(",")'),"3,3,3");
  rejectsUnchanged(run,'startNextPhase("starting")');
  run('triggerTechShock()');
  assert.equal(run('gameState.phase'),"industrialShockRevealed");
  assert.equal(run('gameState.mode'),"monopoly");
  rejectsUnchanged(run,'triggerTechShock()'); rejectsUnchanged(run,'undoLastGrandTourTurn()');
  rejectsUnchanged(run,'nextTeam()'); rejectsUnchanged(run,'beginMonopolyRoll(1)');
});
test("buy uses shared assets/cash without raising worth; pass leaves ownership empty; insufficient cash is atomic", () => {
  const run=game(); start(run);
  complete(run,5,"buy");
  assert.equal(run('gameState.teams[0].cash'),5);
  assert.equal(run('calculateNetWorth(gameState.teams[0])'),10);
  assert.equal(run('gameState.teams[0].assets[1].type'),"shipping");
  assert.equal(run('gameState.teams[0].assets[1].boardTile'),5);
  assert.equal(run('gameState.board.owners[5]'),"A");
  run('nextTeam()'); complete(run,3,"pass");
  assert.equal(run('gameState.board.owners[3]'),undefined);
  assert.equal(run('gameState.teams[1].assets.length'),1);
  run('nextTeam(); gameState.teams[2].cash = 1');land(run,1);
  rejectsUnchanged(run,'finishMonopolyLanding("buy")');
  assert.equal(run('gameState.board.status'),"landing");
  run('finishMonopolyLanding("pass")');
});
test("service fee transfers exactly $1 even at zero cash; own property has no fee or upgrade", () => {
  const run=game(); start(run,[2,1,0]); complete(run,1,"buy");
  run('nextTeam(); gameState.teams[1].cash = 0'); land(run,1);
  assert.equal(run('gameState.board.pendingLanding.kind'),"fee");
  run('finishMonopolyLanding("pay")');
  assert.equal(run('gameState.teams[1].cash'),-1);
  assert.equal(run('gameState.teams[0].cash'),3); // Matching coach identity adds no bonus.
  run('nextTeam()');complete(run,3,"pass");run('nextTeam()');
  // Exercise the own-property branch from a controlled starting position.
  run('gameState.board.positions[0] = 0');land(run,1);
  const cash=run('gameState.teams[0].cash');
  rejectsUnchanged(run,'finishMonopolyLanding("upgrade")');
  run('finishMonopolyLanding("continue")');
  assert.equal(run('gameState.teams[0].cash'),cash);
  assert.equal(run('Object.hasOwn(gameState.board,"upgraded")'),false);
});
test("GO pays once when passing or landing; opportunity and Chance apply once on confirmation", () => {
  for(const steps of [3,4]){
    const run=game();start(run);run('gameState.board.positions[0] = 5');land(run,steps);
    assert.equal(run('gameState.teams[0].cash'),10);
    run(`finishMonopolyLanding("${steps===3 ? "continue" : "pass"}")`);
    assert.equal(run('gameState.teams[0].cash'),10);
  }
  const run=game(); start(run); land(run,4);
  assert.equal(run('gameState.teams[0].cash'),9);
  run('finishMonopolyLanding("continue")');assert.equal(run('gameState.teams[0].cash'),10);
  rejectsUnchanged(run,'finishMonopolyLanding("continue")');
  run('nextTeam(); Math.random = () => 0.2');land(run,2); // Storm harms legacy shipping.
  assert.equal(run('gameState.board.pendingLanding.effect'),-1);
  const before=run('gameState.teams[1].cash');
  run('finishMonopolyLanding("continue")');assert.equal(run('gameState.teams[1].cash'),before-1);
  rejectsUnchanged(run,'finishMonopolyLanding("continue")');
  for(const types of [['legacyShipping'],['legacyInn'],['estate'],['shipping','inn']]){
    run(`gameState.teams[0].assets = ${JSON.stringify(types)}.map(createAsset); gameState.teams[0].assets.forEach(a => {const tile=Object.keys(boardAssetTypes).find(t => boardAssetTypes[t]===a.type); if(tile) a.boardTile=Number(tile)});`);
    assert.equal(run('chanceCards.every(card => [-1,0,1].includes(evaluateChanceCard(0,card).effect))'),true);
  }
  assert.equal(run('evaluateChanceCard(0,chanceCards[1]).effect'),0); // Shipping harm cancels lodging benefit.
});
test("shock preserves exact team and asset objects and cash; purchased shipping and inn revalue in Steam", () => {
  const run=game();start(run);
  complete(run,5,"buy");run('nextTeam()');complete(run,3,"buy");run('nextTeam()');complete(run,5,"pay");
  run('nextTeam()');complete(run,4,"pass"); // A passes GO, leaves horse unowned.
  run('nextTeam()');complete(run,4,"pass"); // B passes on guide.
  run('nextTeam()');complete(run,4,"pass"); // C passes GO.
  run('const carriedTeams = gameState.teams; const carriedShipping = gameState.teams[0].assets[1]; const carriedInn = gameState.teams[1].assets[1];');
  const cash=run('gameState.teams.map(t => t.cash).join(",")');
  const portfolios=run('JSON.stringify(gameState.teams)');
  run('triggerTechShock()');assert.equal(run('JSON.stringify(gameState.teams)'),portfolios);
  assert.equal(run('carriedTeams === gameState.teams && carriedShipping === gameState.teams[0].assets[1] && carriedInn === gameState.teams[1].assets[1]'),true);
  next(run);
  assert.equal(run('carriedShipping === gameState.teams[0].assets[1] && carriedShipping.currentValue === 6'),true);
  assert.equal(run('carriedInn === gameState.teams[1].assets[1] && carriedInn.currentValue === 4'),true);
  assert.equal(run('gameState.teams.map(t => t.cash).join(",")'),cash);
  rejectsUnchanged(run,'beginMonopolyRoll(1)');rejectsUnchanged(run,'nextTeam()');
});
test("undo last turn restores purchases, GO, fees, Chance and opportunity across all teams", () => {
  for(const outcome of ['buy','pay','chance','opportunity']){
    const run=game();start(run);
    for(let i=0;i<5;i++){
      complete(run,i<3 ? 1 : 2,"pass");run('nextTeam()');
    }
    // C starts at tile 1; prepare four distinct final-turn outcomes.
    if(outcome==='pay')run('gameState.board.owners[3]="A"; const ownedAsset=createAsset("inn");ownedAsset.boardTile=3;gameState.teams[0].assets.push(ownedAsset)');
    if(outcome==='buy')run('gameState.board.positions[2]=7'); // Pass GO, then buy horse.
    const before=run('JSON.stringify({teams:gameState.teams,positions:gameState.board.positions,owners:gameState.board.owners,rolls:gameState.board.rolls,nextAssetId:gameState.nextAssetId})');
    complete(run,outcome==='opportunity' ? 3 : outcome==='chance' ? 1 : 2,outcome==='buy' ? 'buy' : outcome==='pay' ? 'pay' : 'continue');
    run('undoLastGrandTourTurn()');
    assert.equal(run('JSON.stringify({teams:gameState.teams,positions:gameState.board.positions,owners:gameState.board.owners,rolls:gameState.board.rolls,nextAssetId:gameState.nextAssetId})'),before);
    assert.equal(run('gameState.totalTurnCount'),5);
    assert.equal(run('gameState.board.status'),"ready");
    rejectsUnchanged(run,'undoLastGrandTourTurn()');
  }
});
test("shock is available both immediately after C and while waiting for the next A; Apply is required", () => {
  for(const advance of [false,true]){
    const run=game();start(run);
    rejectsUnchanged(run,'applyIndustrialRevolution()');
    for(let i=0;i<3;i++){
      complete(run,1,"pass");
      if(i<2)run('nextTeam()');
    }
    assert.equal(run('gameState.roundNumber'),2);
    if(advance)run('nextTeam()');
    assert.equal(run('canTriggerTechShock()'),true);
    const before = run('JSON.stringify({teams:gameState.teams,positions:gameState.board.positions,owners:gameState.board.owners,rolls:gameState.board.rolls,currentTeam:gameState.currentTeam,total:gameState.totalTurnCount,round:gameState.roundNumber})');
    run('triggerTechShock()');
    assert.equal(run('JSON.stringify({teams:gameState.teams,positions:gameState.board.positions,owners:gameState.board.owners,rolls:gameState.board.rolls,currentTeam:gameState.currentTeam,total:gameState.totalTurnCount,round:gameState.roundNumber})'),before);
    assert.equal(run('gameState.revaluationLog.length'),0);
    assert.equal(run('gameState.teams[1].assets[0].currentValue'),4);
    run('applyIndustrialRevolution()');
    assert.equal(run('gameState.mode'),"strategy");
    assert.equal(run('gameState.phase'),"steam");
    assert.equal(run('gameState.phaseComplete'),false);
    assert.equal(run('gameState.teams[1].assets[0].currentValue'),6);
    assert.equal(run('gameState.revaluationLog.length'),3);
    rejectsUnchanged(run,'applyIndustrialRevolution()');
    rejectsUnchanged(run,'startNextPhase("industrialShockRevealed")');
  }
});
test("Grand Tour remains playable across many rounds, with one bounded turn-undo snapshot", () => {
  const run=game();start(run);
  for(let i=0;i<60;i++){
    land(run,1);
    run('finishMonopolyLanding(gameState.board.pendingLanding.kind === "property" ? "pass" : "continue")');
    assert.equal(run('gameState.mode'),"monopoly");
    assert.equal(run('gameState.phase'),"starting");
    assert.equal(run('gameState.board.history.length'),1);
    run('nextTeam()');
  }
  assert.equal(run('gameState.totalTurnCount'),60);
  assert.equal(run('gameState.roundNumber'),21);
  assert.equal(run('gameState.board.rolls.join(",")'),"20,20,20");
  assert.equal(run('gameState.currentTeam'),0);
  assert.equal(run('canTriggerTechShock()'),true);
  run('undoLastGrandTourTurn()');
  assert.equal(run('gameState.totalTurnCount'),59);
  assert.equal(run('gameState.roundNumber'),20);
  assert.equal(run('gameState.currentTeam'),2);
  assert.equal(run('canTriggerTechShock()'),false);
  assert.equal(run('canUndoGrandTourTurn()'),false);
});

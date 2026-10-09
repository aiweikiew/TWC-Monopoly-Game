"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const source = ["data","state","setup","game"].map(name => fs.readFileSync(path.join(__dirname,"../js",`${name}.js`),"utf8")).join("\n");
function game(){
  const context = vm.createContext({});
  vm.runInContext(source,context);
  return code => vm.runInContext(code,context);
}
function start(run, identities=[0,1,2]){
  run(`gameState.setupSelected = ${JSON.stringify(identities.map(index => ({index})))}; applySetupFromDraw();`);
}
function holdAll(run){run('while(!gameState.phaseComplete) takeAction(gameState.teams[gameState.currentTeam].id,"hold",null,gameState.phase)');}
function next(run){run('startNextPhase(gameState.phase)');}
function snapshot(run){return run('JSON.stringify(gameState)');}
function rejectsUnchanged(run, code){
  const before = snapshot(run);
  assert.throws(() => run(code));
  assert.equal(snapshot(run),before);
}
test("unique random draws, every identity starts at calculated $10, and third draw opens market", () => {
  const run = game();
  for(let i=0;i<200;i++){
    run('resetGame(); setupDraw(); setupDraw(); setupDraw();');
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
test("buy converts cash to assets; markets allow shared types; hold and turn/phase guards", () => {
  const run = game(); start(run);
  rejectsUnchanged(run,'startNextPhase("starting")');
  rejectsUnchanged(run,'takeAction("B","hold",null,"starting")');
  rejectsUnchanged(run,'takeAction("A","invest","ota","starting")');
  run('takeAction("A","invest","shipping","starting")');
  assert.equal(run('gameState.teams[0].cash'),5);
  assert.equal(run('calculateNetWorth(gameState.teams[0])'),10);
  rejectsUnchanged(run,'takeAction("A","invest","shipping","starting")');
  run('takeAction("B","invest","shipping","starting")');
  assert.equal(run('gameState.teams[0].assets[1].id !== gameState.teams[1].assets[1].id'),true);
  run('takeAction("C","hold",null,"starting")');
  assert.equal(run('gameState.teams[2].cash'),5);
  assert.equal(run('gameState.phaseComplete'),true);
  assert.equal(run('gameState.phase'),"starting");
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

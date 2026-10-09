"use strict";
// Dependency-free browser smoke test using Chrome DevTools Protocol.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {spawn} = require("node:child_process");
const assert = require("node:assert/strict");
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
async function main(){
  const browser = [process.env.BROWSER_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  ].filter(Boolean).find(file => fs.existsSync(file));
  assert.ok(browser,"Set BROWSER_PATH to a Chrome/Chromium/Edge executable.");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"tourismopoly-browser-"));
  const child = spawn(browser,["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check","--remote-debugging-port=0",`--user-data-dir=${profile}`,"about:blank"],{windowsHide:true,stdio:"ignore"});
  let spawnError;
  child.on("error",error => {spawnError = error;});
  let socket;
  try {
    const portFile = path.join(profile,"DevToolsActivePort");
    for(let i=0;i<100 && !fs.existsSync(portFile);i++){
      if(spawnError) throw spawnError;
      await delay(100);
    }
    assert.ok(fs.existsSync(portFile),"Browser debugging endpoint did not start.");
    const port = fs.readFileSync(portFile,"utf8").split("\n")[0].trim();
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find(page => page.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve,reject) => {socket.onopen=resolve; socket.onerror=reject;});
    let sequence = 0;
    const requests = new Map();
    const errors = [];
    socket.onmessage = ({data}) => {
      const message = JSON.parse(data);
      if(message.id){
        const request = requests.get(message.id);
        if(request){requests.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);}
      } else if(message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text + ": " + message.params.exceptionDetails.exception?.description);
      else if(message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(JSON.stringify(message.params.args));
      else if(message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(message.params.entry.text);
    };
    function send(method,params={}){
      return new Promise((resolve,reject) => {
        const id=++sequence; requests.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params}));
      });
    }
    async function evaluate(expression){
      const result = await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
      if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    }
    await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride",{width:1366,height:768,deviceScaleFactor:1,mobile:false});
    await send("Page.navigate",{url:pathToFileURL(path.resolve(__dirname,"../index.html")).href});
    for(let i=0;i<100;i++){
      if(await evaluate('document.readyState === "complete" && !!document.querySelector(".setup-card")')) break;
      await delay(50);
    }
    assert.equal(await evaluate('document.querySelectorAll(".setup-card").length'),5);
    const result = await evaluate(`(async () => {
      function check(condition,message){if(!condition) throw new Error(message);}
      function click(selector){
        const button = document.querySelector(selector);
        check(button && !button.disabled,"Missing/enabled control: " + selector);
        button.click();
        check(!document.getElementById("actionError").textContent && !document.getElementById("boardError").textContent,"UI action failed");
      }
      const layouts = [];
      function layout(label){
        check(document.documentElement.scrollWidth <= innerWidth,"Page has horizontal overflow");
        check(document.documentElement.scrollHeight <= innerHeight,"Page has vertical overflow");
        const panel = gameState.mode === 'monopoly' ? document.getElementById('board') : document.querySelector('.phase-panel');
        const players = gameState.mode === 'monopoly' ? document.querySelector('#monopolyScreen .player-panel') : document.querySelector('#gameScreen .player-panel');
        check(panel.getBoundingClientRect().right <= innerWidth,'Panel extends off screen');
        check(players.getBoundingClientRect().right <= innerWidth,'Players extend off screen');
        layouts.push({label,phaseOverflow:panel.scrollHeight-panel.clientHeight,portfolioOverflow:players.scrollHeight-players.clientHeight});
      }
      function action(type,selection){click('[data-action="'+type+'"]'+(selection ? '[data-selection="'+selection+'"]' : '')); click('#confirmDecisionBtn');}
      function next(){click('[data-next-phase]');}
      const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
      async function until(predicate){
        for(let i=0;i<160;i++){if(predicate()) return; await wait(50);}
        throw new Error('Timed out waiting for animation');
      }
      const originalRandom = Math.random;
      function draw(){
        Math.random = () => 0;
        click('#setupDrawBtn'); click('#setupDrawBtn'); click('#setupDrawBtn');
        check(gameState.phase === 'setup' && gameState.teams.length === 0,'Third draw auto-started');
        check(!document.getElementById('setupConfirmBtn').disabled,'Confirmation not enabled');
        check(document.querySelectorAll('#setupSelected .setup-slot:not(.empty)').length === 3,'Three drawn identities not shown');
        click('#setupConfirmBtn'); Math.random = originalRandom;
        check(gameState.mode === 'monopoly','Confirmation did not start Monopoly');
      }
      async function roll(steps){
        Math.random = () => (steps - 0.5) / 6;
        click('#rollBtn');
        check(document.getElementById('rollBtn').disabled && document.getElementById('nextBtn').disabled,'Animation controls not locked');
        check(document.getElementById('diceOverlay').classList.contains('show'),'Dice overlay absent');
        check(document.getElementById('backBtn').disabled,'Back enabled during dice animation');
        const duringRoll=JSON.stringify(gameState);
        document.getElementById('backBtn').click();
        check(JSON.stringify(gameState) === duringRoll,'Back changed dice state');
        document.getElementById('rollBtn').click();
        document.getElementById('nextBtn').click();
        await until(() => gameState.board.status === 'landing');
        Math.random = originalRandom;
        check(document.getElementById('nextBtn').disabled,'Unresolved landing can be skipped');
        check(!document.getElementById('diceOverlay').classList.contains('show'),'Dice did not disappear');
        const token = document.querySelector('.token.' + ['a','b','c'][gameState.currentTeam]);
        check(Number(token.closest('[data-index]').dataset.index) === gameState.board.positions[gameState.currentTeam],'Token does not match state');
      }
      click('#setupDrawBtn'); click('#setupUndoBtn'); click('#setupDrawBtn'); click('#setupResetBtn');
      check(document.getElementById('backBtn').hidden,'Initial screen has Back');
      draw(); layout('Grand Tour');
      const identitiesConfirmed=JSON.stringify(gameState);
      click('#backBtn');
      check(JSON.stringify(gameState) === identitiesConfirmed && !document.getElementById('gameScreen').hidden,'Back changed confirmed identities');
      click('[data-navigation="resume"]');
      check(document.querySelectorAll('#board .tile').length === 8,'Legacy board tiles missing');
      check(!document.querySelector('#monopolyScreen #upgradeBtn'),'Upgrade still available');
      // Reset during the dice animation; stale async work must not mutate a new game.
      click('#rollBtn'); await wait(120); click('#boardResetBtn'); draw();
      await wait(250);
      check(gameState.board.status === 'ready' && gameState.board.rolls.join(',') === '0,0,0','Stale dice animation affected reset');
      // Also cancel in-flight movement after a token step.
      Math.random=() => 0.99; click('#rollBtn');
      await until(() => gameState.board.status === 'moving');
      click('#boardResetBtn'); draw(); await wait(500);
      check(gameState.board.positions.join(',') === '0,0,0' && gameState.board.status === 'ready','Stale movement affected reset');
      const turns=[];
      async function turn(steps,button){
        turns.push(gameState.teams[gameState.currentTeam].id);
        await roll(steps); click(button);
      }
      turns.push('A'); await roll(5);
      const pendingPurchase=JSON.stringify(gameState);
      click('#backBtn');
      check(navigationState.currentView.type === 'landing','Back did not show landing resolution');
      check(document.getElementById('landingModal').hidden && document.getElementById('nextBtn').disabled,'Landing can be skipped');
      check(JSON.stringify(gameState) === pendingPurchase,'Abandoning property popup mutated gameplay');
      click('#resolveLandingBtn'); click('#buyBtn');
      const committedPurchase=JSON.stringify(gameState);
      click('#backBtn');
      check(!isCurrentView() && !document.querySelector('#gameScreen #buyBtn'),'Confirmed purchase can be replayed');
      check(JSON.stringify(gameState) === committedPurchase,'Back undid purchase');
      click('[data-navigation="resume"]');
      check(calculateNetWorth(gameState.teams[0]) === 10,'Buy changed Net Worth');
      click('#nextBtn'); await turn(3,'#buyBtn');
      click('#nextBtn'); await turn(5,'#payFeeBtn');
      check(gameState.teams[0].cash === 6 && gameState.teams[2].cash === 4,'Service fee transfer incorrect');
      click('#nextBtn'); await turn(3,'#startContinueBtn');
      check(gameState.teams[0].cash === 7,'Exact GO landing paid incorrectly');
      click('#nextBtn'); await turn(1,'#opportunityContinueBtn');
      check(gameState.teams[1].cash === 4,'Opportunity was not collected');
      click('#nextBtn'); await turn(2,'#buyBtn');
      check(turns.join(',') === 'A,B,C,A,B,C','Wrong turn order');
      check(gameState.board.status === 'review' && !gameState.phaseComplete,'Turn six auto-locked');
      check(!document.getElementById('marketClosedModal').hidden,'Market review missing');
      const reviewState=JSON.stringify(gameState);
      click('#reviewPortfoliosBtn'); click('#backBtn');
      check(JSON.stringify(gameState) === reviewState,'Portfolio navigation changed game state');
      click('#reviewPortfoliosBtn');
      check(!document.getElementById('grandTourReview').hidden,'Review portfolios did not open');
      layout('Grand Tour review');
      const beforeUndo=JSON.stringify(gameState.teams);
      click('#undoTurnBtn');
      check(gameState.totalTurnCount === 5 && gameState.teams[2].cash === 4,'Undo failed');
      await roll(2); click('#buyBtn');
      check(JSON.stringify(gameState.teams) === beforeUndo,'Replayed final turn changed portfolio');
      const carriedTeams=gameState.teams;
      const shipping=gameState.teams[0].assets[1];
      click('#lockPortfoliosBtn');
      check(gameState.mode === 'strategy' && gameState.phaseComplete,'Lock did not enter strategy pause');
      check(gameState.teams === carriedTeams && JSON.stringify(gameState.teams) === beforeUndo,'Handoff rebuilt or changed teams');
      check(document.getElementById('monopolyScreen').hidden,'Board still active after lock');
      check(document.getElementById('phaseContent').textContent.includes('PORTFOLIOS LOCKED'),'Locked pause missing');
      const lockedState=JSON.stringify(gameState);
      click('#backBtn');
      check(navigationState.currentView.type === 'phase-review' && gameState.phaseComplete,'Pause Back unlocked portfolios');
      check(JSON.stringify(gameState) === lockedState,'Pause Back mutated game');
      click('[data-navigation="pause"]');
      next(); layout('steam');
      const revaluedState=JSON.stringify(gameState);
      click('#backBtn');
      check(JSON.stringify(gameState) === revaluedState && gameState.phase === 'steam','Back undid Steam revaluation');
      click('[data-navigation="resume"]');
      check(gameState.teams[0].assets[1] === shipping && shipping.currentValue === 6,'Purchased shipping did not revalue in place');
      check(gameState.teams[1].assets[1].currentValue === 4,'Purchased inn did not revalue');
      check(document.querySelector('[data-next-phase]').disabled,'Unresolved Steam decisions can advance');
      const adapt = document.getElementById('select-adapt');
      check(adapt.options.length === 1,'Estate incorrectly offered for adaptation');
      const beforeDraft=JSON.stringify(gameState);
      click('[data-action="adapt"]');
      check(navigationState.currentView.type === 'selection','Missing strategy selection view');
      click('#backBtn');
      check(navigationState.selection === null && JSON.stringify(gameState) === beforeDraft,'Back committed or retained a draft');
      action('adapt');
      const adapted=JSON.stringify(gameState);
      click('#backBtn'); check(JSON.stringify(gameState) === adapted,'Back reversed adaptation');
      click('[data-navigation="resume"]');
      click('#undoDecisionBtn');
      check(gameState.currentTeam === 0 && gameState.teams[0].assets[1].type === 'shipping','Explicit decision undo failed');
      action('adapt'); action('sell'); action('hold');
      next(); layout('jet');
      check(!document.querySelector('[data-action]'),'Jet offers a strategy');
      check(document.getElementById('phaseContent').textContent.includes('Pre-Industrial: $4'),'Shipping trajectory missing');
      next(); layout('digital');
      action('digitise');
      const digitised=JSON.stringify(gameState);
      click('#backBtn'); check(JSON.stringify(gameState) === digitised,'Back reversed digitisation');
      click('[data-navigation="resume"]');
      action('invest','ota'); action('hold');
      check(gameState.events.fitBoom && gameState.teams.every(t => t.destinationPressure === 1),'FIT event missing');
      check(gameState.teams.map(t => t.digitalReady).join(',') === 'true,true,false','Digital readiness incorrect');
      layout('digital complete'); next(); layout('future');
      action('strategy','agenticAI');
      const futureCommitted=JSON.stringify(gameState);
      click('#backBtn'); check(JSON.stringify(gameState) === futureCommitted,'Back reversed future strategy');
      click('[data-navigation="resume"]');
      action('strategy','regenerative'); action('strategy','agenticAI');
      check(gameState.phase === 'future' && gameState.phaseComplete,'Future pause missing');
      layout('future complete'); next(); layout('winner');
      check(document.getElementById('phaseTitle').textContent === 'TOURISMOPOLY WINNER','Winner screen missing');
      check(document.getElementById('dynamicPlayers').textContent.includes('Environmental Health'),'Final metrics missing');
      check(document.getElementById('phaseContent').textContent.includes('But Did You Actually Win?'),'Conclusion handoff missing');
      check(!document.querySelector('[data-next-phase]'),'Winner has unexpected next phase');
      const finalWorth = gameState.teams.map(calculateNetWorth);
      // Verify tied result rendering using equal calculated portfolios.
      gameState.teams.forEach(t => t.cash = 20 - t.assets.reduce((sum,a) => sum + a.currentValue,0)); renderGame();
      check(document.getElementById('phaseContent').textContent.includes('Joint money winners: Team A & Team B & Team C'),'Tie rendering incorrect');
      click('#resetGameBtn');
      check(gameState.phase === 'setup' && gameState.teams.length === 0,'Reset failed');
      check(document.getElementById('gameScreen').hidden,'Game remains visible after reset');
      check(document.getElementById('backBtn').hidden && navigationState.previousViews.length === 0,'Reset retained navigation history');
      draw();
      return {layouts,finalWorth};
    })()`);
    assert.deepEqual(result.finalWorth,[10,15,6]);
    const screenshot = await send("Page.captureScreenshot",{format:"png"});
    const screenshotPath = path.join(os.tmpdir(),"tourismopoly-grand-tour.png");
    fs.writeFileSync(screenshotPath,Buffer.from(screenshot.data,"base64"));
    console.log(`Board screenshot: ${screenshotPath}`);
    await send("Page.reload");
    for(let i=0;i<100;i++){
      if(await evaluate('document.readyState === "complete" && typeof gameState !== "undefined" && gameState.phase === "setup"')) break;
      await delay(50);
    }
    assert.equal(await evaluate('gameState.teams.length'),0);
    assert.equal(await evaluate('navigationState.previousViews.length'),0);
    assert.equal(await evaluate('document.getElementById("backBtn").hidden'),true);
    assert.deepEqual(errors,[],"Browser reported console or runtime errors");
    console.log("PASS: complete browser playthrough, all controls, pauses, ties, reset, refresh; no console errors.");
    console.log(JSON.stringify(result,null,2));
    await send("Browser.close").catch(() => {});
  } finally {
    socket?.close();
    if(child.exitCode === null && !spawnError) child.kill();
    // Only delete this test's uniquely created directory beneath the system temp root.
    const tempRoot = path.resolve(os.tmpdir()) + path.sep;
    const resolved = path.resolve(profile);
    if(resolved.startsWith(tempRoot) && path.basename(resolved).startsWith("tourismopoly-browser-")){
      await delay(300);
      try {fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:100});} catch {console.log(`Browser profile retained at ${resolved}`);}
    }
  }
}
main().catch(error => {console.error(error);process.exitCode=1;});

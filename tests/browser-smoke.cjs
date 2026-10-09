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
      const result = await send("Runtime.evaluate",{expression,returnByValue:true});
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
    const result = await evaluate(`(() => {
      function check(condition,message){if(!condition) throw new Error(message);}
      function click(selector){
        const button = document.querySelector(selector);
        check(button && !button.disabled,"Missing/enabled control: " + selector);
        button.click();
        check(!document.getElementById("actionError").textContent,"UI action failed");
      }
      const layouts = [];
      function layout(label){
        check(document.documentElement.scrollWidth <= innerWidth,"Page has horizontal overflow");
        check(document.documentElement.scrollHeight <= innerHeight,"Page has vertical overflow");
        const panel = document.querySelector(".phase-panel");
        const players = document.querySelector(".player-panel");
        layouts.push({label,phaseOverflow:panel.scrollHeight-panel.clientHeight,portfolioOverflow:players.scrollHeight-players.clientHeight});
      }
      function action(type,selection){click('[data-action="'+type+'"]'+(selection ? '[data-selection="'+selection+'"]' : ''));}
      function next(){click('[data-next-phase]');}
      // Fix random identity order for a repeatable browser interaction path.
      const originalRandom = Math.random; Math.random = () => 0;
      click('#setupDrawBtn'); click('#setupUndoBtn'); click('#setupDrawBtn'); click('#setupResetBtn');
      click('#setupDrawBtn'); click('#setupDrawBtn'); click('#setupDrawBtn'); Math.random = originalRandom;
      check(gameState.phase === 'starting','Draw did not enter market');
      check(document.querySelector('[data-next-phase]').disabled,'Unresolved phase can advance');
      layout('starting');
      action('invest','shipping'); action('hold'); action('invest','guide');
      check(gameState.phase === 'starting' && gameState.phaseComplete,'Starting pause missing');
      check(document.getElementById('phaseContent').textContent.includes('PORTFOLIOS LOCKED'),'Pause label missing');
      next(); layout('steam');
      const adapt = document.getElementById('select-adapt');
      check(adapt.options.length === 1,'Estate incorrectly offered for adaptation');
      action('adapt'); action('sell'); action('invest','tour');
      next(); layout('jet');
      check(!document.querySelector('[data-action]'),'Jet offers a strategy');
      check(document.getElementById('phaseContent').textContent.includes('Pre-Industrial: $4'),'Shipping trajectory missing');
      next(); layout('digital');
      action('digitise'); action('invest','ota'); action('hold');
      check(gameState.events.fitBoom && gameState.teams.every(t => t.destinationPressure === 1),'FIT event missing');
      check(gameState.teams.map(t => t.digitalReady).join(',') === 'true,true,false','Digital readiness incorrect');
      layout('digital complete'); next(); layout('future');
      action('strategy','agenticAI'); action('strategy','regenerative'); action('strategy','agenticAI');
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
      click('#setupDrawBtn'); click('#setupDrawBtn'); click('#setupDrawBtn');
      return {layouts,finalWorth};
    })()`);
    assert.deepEqual(result.finalWorth,[8,13,8]);
    await send("Page.reload");
    for(let i=0;i<100;i++){
      if(await evaluate('document.readyState === "complete" && typeof gameState !== "undefined" && gameState.phase === "setup"')) break;
      await delay(50);
    }
    assert.equal(await evaluate('gameState.teams.length'),0);
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

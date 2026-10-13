"use strict";

// v31: loud classroom reinforcement layer for all gameplay cues after identity draw.
// Keeps the existing v30 sound system/toggle, but adds a clearly audible second layer
// for dice, movement, board actions, strategy decisions and major era events.
(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.gameAudioBoostV31 === "true") return;
  document.documentElement.dataset.gameAudioBoostV31 = "true";

  let ctx = null;
  let master = null;
  let compressor = null;
  let noiseBuffer = null;

  function soundEnabled(){
    return !window.GameAudio || window.GameAudio.enabled !== false;
  }

  function ensureContext(){
    if(!soundEnabled()) return null;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if(!AudioContextCtor) return null;
    if(!ctx){
      ctx = new AudioContextCtor();
      master = ctx.createGain();
      compressor = ctx.createDynamicsCompressor();
      master.gain.value = 1.65;
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 5;
      compressor.attack.value = .003;
      compressor.release.value = .18;
      master.connect(compressor);
      compressor.connect(ctx.destination);
    }
    if(ctx.state === "suspended") ctx.resume().catch(()=>{});
    return ctx;
  }

  function getNoise(){
    if(noiseBuffer) return noiseBuffer;
    if(!ensureContext()) return null;
    const length = Math.floor(ctx.sampleRate * 1.4);
    noiseBuffer = ctx.createBuffer(1,length,ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for(let i=0;i<length;i++) data[i] = Math.random()*2-1;
    return noiseBuffer;
  }

  function tone(freq,duration=.1,{delay=0,volume=.08,type="triangle",endFreq=freq}={}){
    if(!ensureContext()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20,freq),t);
    if(endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume),t+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t+duration+.03);
  }

  function noise(duration=.08,{delay=0,volume=.07,freq=1400,endFreq=freq,filterType="bandpass",q=1.2}={}){
    if(!ensureContext()) return;
    const t = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = getNoise();
    filter.type = filterType;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(40,freq),t);
    if(endFreq !== freq) filter.frequency.exponentialRampToValueAtTime(Math.max(40,endFreq),t+duration);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume),t+.006);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter); filter.connect(gain); gain.connect(master);
    source.start(t,0,duration+.03); source.stop(t+duration+.04);
  }

  function play(name){
    if(!soundEnabled() || !ensureContext()) return;
    switch(name){
      case "dice":
        for(let i=0;i<10;i++) noise(.055,{delay:i*.052,volume:.075,freq:700+Math.random()*1700,q:1.7});
        tone(170,.14,{volume:.09,delay:.03,endFreq:115});
        break;
      case "step":
        noise(.04,{volume:.075,freq:950,q:2.2});
        tone(190,.055,{volume:.07,endFreq:125});
        break;
      case "chance":
        noise(.15,{volume:.085,filterType:"highpass",freq:900,endFreq:3000});
        tone(820,.12,{volume:.09,delay:.055,endFreq:1320});
        break;
      case "purchase":
      case "invest":
        tone(660,.12,{volume:.10}); tone(930,.16,{volume:.105,delay:.07}); tone(1240,.20,{volume:.085,delay:.14});
        break;
      case "payment":
        tone(760,.11,{volume:.095}); tone(470,.17,{volume:.10,delay:.07});
        break;
      case "reward":
        tone(560,.11,{volume:.095}); tone(840,.16,{volume:.105,delay:.07}); tone(1120,.18,{volume:.08,delay:.14});
        break;
      case "sell":
        tone(900,.10,{volume:.10}); tone(650,.13,{volume:.10,delay:.07}); tone(430,.17,{volume:.095,delay:.14});
        break;
      case "adapt":
        tone(230,.28,{type:"sawtooth",volume:.075,endFreq:820}); tone(930,.20,{volume:.105,delay:.18});
        break;
      case "digitise":
        tone(500,.08,{type:"square",volume:.065}); tone(760,.08,{type:"square",volume:.07,delay:.065}); tone(1160,.16,{volume:.10,delay:.13});
        break;
      case "hold":
        tone(450,.10,{volume:.075,endFreq:390});
        break;
      case "confirm":
        tone(600,.10,{volume:.085}); tone(860,.15,{volume:.095,delay:.07});
        break;
      case "error":
        tone(185,.16,{type:"square",volume:.12,endFreq:145}); tone(125,.18,{type:"square",volume:.115,delay:.17,endFreq:105});
        break;
      case "shockIndustrial":
        noise(.60,{volume:.14,filterType:"lowpass",freq:1100,endFreq:280}); tone(92,.68,{type:"sawtooth",volume:.14,endFreq:42}); tone(590,.38,{volume:.10,delay:.17,endFreq:1150});
        break;
      case "revaluation":
        tone(280,.20,{volume:.085,endFreq:650}); tone(760,.16,{volume:.10,delay:.14}); tone(1060,.20,{volume:.09,delay:.25});
        break;
      case "shockJet":
        noise(.72,{volume:.13,filterType:"bandpass",freq:240,endFreq:3300,q:.75}); tone(105,.50,{type:"sawtooth",volume:.10,endFreq:250}); tone(520,.40,{volume:.10,delay:.18,endFreq:1350});
        break;
      case "shockDigital":
        for(let i=0;i<7;i++) tone(i%2?1020:220,.07,{type:"square",volume:.08,delay:i*.055,endFreq:i%2?700:400});
        noise(.24,{volume:.095,filterType:"highpass",freq:1300,delay:.10}); tone(1400,.17,{volume:.11,delay:.36,endFreq:820});
        break;
      case "fitBoom":
        tone(500,.12,{volume:.09}); tone(660,.12,{volume:.10,delay:.09}); tone(920,.20,{volume:.11,delay:.18});
        break;
      case "crisis":
        tone(170,.23,{type:"sawtooth",volume:.13,endFreq:145}); tone(115,.24,{type:"sawtooth",volume:.135,delay:.24,endFreq:100}); tone(170,.22,{type:"sawtooth",volume:.125,delay:.50,endFreq:140}); noise(.60,{volume:.095,filterType:"lowpass",freq:700,endFreq:260});
        break;
      case "agentic":
        tone(500,.09,{type:"square",volume:.065}); tone(760,.10,{volume:.09,delay:.07}); tone(1060,.12,{volume:.10,delay:.14}); tone(1520,.18,{volume:.09,delay:.22});
        break;
      case "regenerative":
        tone(390,.24,{volume:.085}); tone(500,.28,{volume:.09,delay:.05}); tone(670,.34,{volume:.10,delay:.10});
        break;
      case "results":
        tone(440,.11,{volume:.085}); tone(560,.13,{volume:.09,delay:.08}); tone(700,.19,{volume:.105,delay:.16});
        break;
      case "winner":
        tone(520,.14,{volume:.10}); tone(660,.14,{volume:.105,delay:.11}); tone(790,.15,{volume:.11,delay:.22}); tone(1050,.38,{volume:.14,delay:.33});
        break;
    }
  }

  // Unlock this louder context on any classroom interaction.
  window.addEventListener("pointerdown",()=>ensureContext(),true);

  window.addEventListener("pointerdown",event=>{
    const button = event.target.closest?.("button");
    if(!button?.disabled) return;
    if(button.id === "industrialConfirmTurnBtn" || button.id === "buyBtn" || button.matches("[data-action], [data-industrial-invest], [data-industrial-portfolio]")) play("error");
  },true);

  window.addEventListener("click",event=>{
    const button = event.target.closest?.("button");
    if(!button || button.disabled || button.id === "gameSoundToggle") return;
    if(button.id === "rollBtn"){ play("dice"); return; }
    if(button.id === "buyBtn"){ play("purchase"); return; }
    if(button.id === "payFeeBtn"){ play("payment"); return; }
    if(button.id === "opportunityContinueBtn" || button.id === "startContinueBtn"){ play("reward"); return; }
    if(button.id === "chanceContinueBtn"){
      const effect = Number(gameState?.board?.pendingLanding?.effect || 0);
      if(effect > 0) play("reward"); else if(effect < 0) play("payment");
      return;
    }

    if(button.id === "industrialConfirmTurnBtn"){
      const choices = [...document.querySelectorAll(".industrial-turn-summary .turn-summary-choice strong")].map(node=>node.textContent.trim());
      if(choices[0] && !/no new investment/i.test(choices[0])) play("invest");
      if(/^sell\b/i.test(choices[1] || "")) window.setTimeout(()=>play("sell"),140);
      else if(/^adapt\b/i.test(choices[1] || "")) window.setTimeout(()=>play("adapt"),140);
      else if(/^hold\b/i.test(choices[1] || "")) window.setTimeout(()=>play("hold"),140);
      else if(!choices[0] || /no new investment/i.test(choices[0])) play("confirm");
      return;
    }

    if(button.id === "confirmDecisionBtn"){
      const draft = typeof navigationState !== "undefined" && navigationState.selection ? {...navigationState.selection} : null;
      if(!draft){ play("confirm"); return; }
      if(draft.action === "invest") play("invest");
      else if(draft.action === "sell") play("sell");
      else if(draft.action === "adapt") play("adapt");
      else if(draft.action === "digitise") play("digitise");
      else if(draft.action === "hold") play("hold");
      else if(draft.action === "strategy") play(draft.selection === "regenerative" ? "regenerative" : "agentic");
      return;
    }

    const direct = button.closest?.('button[data-action="strategy"]');
    if(direct){
      const selection = direct.dataset.selection;
      play(selection === "regenerative" ? "regenerative" : "agentic");
    }
  },true);

  function installMovementObserver(){
    if(!document.body) return;
    const lastStep = new WeakMap();
    const observer = new MutationObserver(records=>{
      const now = performance.now();
      for(const record of records){
        if(record.type !== "attributes" || record.attributeName !== "class") continue;
        const target = record.target;
        if(!(target instanceof Element) || !target.matches(".token.walking")) continue;
        const last = lastStep.get(target) || 0;
        if(now-last > 120){ lastStep.set(target,now); play("step"); }
      }
    });
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
  }

  function stateKey(){
    if(typeof gameState === "undefined") return "";
    return [gameState.mode,gameState.phase,gameState.uiStage,Boolean(gameState.phaseComplete)].join("|");
  }
  function landingKey(){
    const landing = gameState?.board?.pendingLanding;
    if(gameState?.mode !== "monopoly" || gameState?.board?.status !== "landing" || !landing) return "";
    return [landing.teamId,landing.tile,landing.kind,landing.cardIndex ?? ""].join("|");
  }

  let lastState = stateKey();
  let lastLanding = landingKey();
  function checkState(){
    const current = stateKey();
    if(current !== lastState){
      lastState = current;
      if(gameState.phase === "industrialShockRevealed" && gameState.uiStage === "shock") play("shockIndustrial");
      else if(gameState.phase === "steam" && gameState.uiStage === "jetShock") play("shockJet");
      else if(gameState.phase === "jet" && gameState.uiStage === "digitalShock") play("shockDigital");
      else if(["steam","jet","digital"].includes(gameState.phase) && gameState.uiStage === "revaluation") play("revaluation");
      else if(gameState.phase === "digital" && gameState.uiStage === "event") play("fitBoom");
      else if(gameState.phase === "future" && gameState.uiStage === "crisis") play("crisis");
      else if(gameState.phase === "future" && gameState.uiStage === "results") play("results");
      else if(gameState.phase === "winner" || gameState.uiStage === "winner") play("winner");
    }
    const currentLanding = landingKey();
    if(currentLanding && currentLanding !== lastLanding){
      lastLanding = currentLanding;
      if(gameState.board.pendingLanding?.kind === "chance") play("chance");
    }else if(!currentLanding) lastLanding = "";
  }

  function wrapRenderGame(){
    if(typeof renderGame !== "function" || renderGame.__audioBoostV31Wrapped) return false;
    const previous = renderGame;
    renderGame = function(){
      const result = previous.apply(this,arguments);
      checkState();
      return result;
    };
    renderGame.__audioBoostV31Wrapped = true;
    return true;
  }

  function init(){
    installMovementObserver();
    if(!wrapRenderGame()){
      let attempts = 0;
      const timer = window.setInterval(()=>{
        attempts += 1;
        if(wrapRenderGame() || attempts > 160) window.clearInterval(timer);
      },50);
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

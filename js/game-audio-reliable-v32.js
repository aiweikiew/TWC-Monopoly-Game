"use strict";

// v32: reliable classroom audio hooks. Uses pointerdown (direct user gesture)
// for buttons and the token animation class for movement, so cues cannot be lost
// behind later click handlers. Intentionally obvious/loud for projector speakers.
(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.gameAudioReliableV32 === "true") return;
  document.documentElement.dataset.gameAudioReliableV32 = "true";

  let ctx = null;
  let master = null;
  let noiseBuffer = null;

  function enabled(){
    return !window.GameAudio || window.GameAudio.enabled !== false;
  }

  function ensureContext(){
    if(!enabled()) return null;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if(!Ctor) return null;
    if(!ctx){
      ctx = new Ctor();
      master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      master.gain.value = 1.8;
      compressor.threshold.value = -16;
      compressor.knee.value = 14;
      compressor.ratio.value = 5;
      compressor.attack.value = .002;
      compressor.release.value = .16;
      master.connect(compressor);
      compressor.connect(ctx.destination);
    }
    if(ctx.state === "suspended") ctx.resume().catch(()=>{});
    return ctx;
  }

  function tone(freq,duration=.1,{delay=0,volume=.22,type="triangle",endFreq=freq}={}){
    if(!ensureContext()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30,freq),t);
    if(endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),t+duration);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.002,volume),t+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t+duration+.03);
  }

  function noise(duration=.07,{delay=0,volume=.18,freq=1500,endFreq=freq,type="bandpass",q=1.1}={}){
    if(!ensureContext()) return;
    if(!noiseBuffer){
      const len = Math.floor(ctx.sampleRate * 1.5);
      noiseBuffer = ctx.createBuffer(1,len,ctx.sampleRate);
      const d = noiseBuffer.getChannelData(0);
      for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
    }
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noiseBuffer;
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(40,freq),t);
    if(endFreq !== freq) filter.frequency.exponentialRampToValueAtTime(Math.max(40,endFreq),t+duration);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.002,volume),t+.006);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(t,0,duration+.03); src.stop(t+duration+.04);
  }

  function play(name){
    if(!enabled() || !ensureContext()) return;
    switch(name){
      case "dice":
        for(let i=0;i<12;i++) noise(.06,{delay:i*.055,volume:.20,freq:800+Math.random()*1800,q:1.5});
        tone(440,.16,{volume:.24,delay:.03,endFreq:260});
        break;
      case "step":
        tone(980,.065,{volume:.24,type:"square",endFreq:720});
        noise(.04,{volume:.16,freq:1800,q:2});
        break;
      case "chance":
        noise(.18,{volume:.22,type:"highpass",freq:900,endFreq:3400});
        tone(880,.16,{volume:.24,delay:.06,endFreq:1320});
        break;
      case "purchase":
      case "invest":
        tone(660,.12,{volume:.24}); tone(900,.14,{volume:.26,delay:.08}); tone(1240,.18,{volume:.22,delay:.16});
        break;
      case "payment":
        tone(700,.13,{volume:.24}); tone(420,.18,{volume:.26,delay:.09});
        break;
      case "reward":
        tone(600,.11,{volume:.24}); tone(860,.14,{volume:.26,delay:.08}); tone(1180,.18,{volume:.24,delay:.16});
        break;
      case "sell":
        tone(880,.10,{volume:.24}); tone(620,.13,{volume:.25,delay:.08}); tone(380,.18,{volume:.24,delay:.16});
        break;
      case "adapt":
        tone(260,.28,{volume:.20,type:"sawtooth",endFreq:900}); tone(980,.20,{volume:.27,delay:.18});
        break;
      case "digitise":
        tone(520,.08,{volume:.20,type:"square"}); tone(820,.08,{volume:.22,type:"square",delay:.07}); tone(1260,.16,{volume:.26,delay:.14});
        break;
      case "hold":
        tone(460,.11,{volume:.20,endFreq:390});
        break;
      case "confirm":
        tone(620,.10,{volume:.22}); tone(900,.15,{volume:.25,delay:.08});
        break;
      case "error":
        tone(190,.18,{volume:.31,type:"square",endFreq:145}); tone(120,.20,{volume:.30,type:"square",delay:.19,endFreq:100});
        break;
      case "shockIndustrial":
        noise(.65,{volume:.32,type:"lowpass",freq:1200,endFreq:260}); tone(110,.72,{volume:.30,type:"sawtooth",endFreq:45}); tone(620,.40,{volume:.24,delay:.18,endFreq:1180});
        break;
      case "revaluation":
        tone(300,.20,{volume:.22,endFreq:700}); tone(780,.17,{volume:.25,delay:.15}); tone(1080,.20,{volume:.22,delay:.27});
        break;
      case "shockJet":
        noise(.78,{volume:.30,freq:260,endFreq:3600,q:.7}); tone(120,.52,{volume:.24,type:"sawtooth",endFreq:280}); tone(560,.42,{volume:.25,delay:.19,endFreq:1450});
        break;
      case "shockDigital":
        for(let i=0;i<8;i++) tone(i%2?1100:250,.075,{volume:.21,type:"square",delay:i*.055,endFreq:i%2?720:430});
        noise(.26,{volume:.23,type:"highpass",freq:1300,delay:.12}); tone(1450,.18,{volume:.27,delay:.40,endFreq:800});
        break;
      case "fitBoom":
        tone(520,.12,{volume:.23}); tone(700,.12,{volume:.25,delay:.09}); tone(960,.20,{volume:.28,delay:.18});
        break;
      case "crisis":
        tone(170,.24,{volume:.30,type:"sawtooth",endFreq:145}); tone(115,.25,{volume:.32,type:"sawtooth",delay:.25,endFreq:95}); tone(170,.23,{volume:.30,type:"sawtooth",delay:.52,endFreq:140}); noise(.65,{volume:.22,type:"lowpass",freq:720,endFreq:250});
        break;
      case "agentic":
        tone(520,.09,{volume:.20,type:"square"}); tone(800,.10,{volume:.23,delay:.07}); tone(1100,.12,{volume:.25,delay:.14}); tone(1580,.18,{volume:.23,delay:.22});
        break;
      case "regenerative":
        tone(390,.24,{volume:.22}); tone(500,.28,{volume:.23,delay:.05}); tone(680,.34,{volume:.26,delay:.10});
        break;
      case "results":
        tone(440,.11,{volume:.22}); tone(560,.13,{volume:.23,delay:.08}); tone(720,.19,{volume:.26,delay:.16});
        break;
      case "winner":
        tone(520,.14,{volume:.24}); tone(660,.14,{volume:.25,delay:.11}); tone(800,.15,{volume:.27,delay:.22}); tone(1080,.40,{volume:.32,delay:.34});
        break;
    }
  }

  // Direct user-gesture hooks: guaranteed to run before later click handlers.
  window.addEventListener("pointerdown",event=>{
    ensureContext();
    const button = event.target.closest?.("button");
    if(!button) return;

    if(button.disabled){
      if(button.id === "industrialConfirmTurnBtn" || button.id === "buyBtn" || button.matches("[data-action],[data-industrial-invest],[data-industrial-portfolio]")) play("error");
      return;
    }

    if(button.id === "rollBtn"){ play("dice"); return; }
    if(button.id === "buyBtn"){ play("purchase"); return; }
    if(button.id === "payFeeBtn"){ play("payment"); return; }
    if(button.id === "opportunityContinueBtn" || button.id === "startContinueBtn"){ play("reward"); return; }
    if(button.id === "chanceContinueBtn"){
      const effect = Number(gameState?.board?.pendingLanding?.effect || 0);
      if(effect > 0) play("reward"); else if(effect < 0) play("payment"); else play("confirm");
      return;
    }
    if(button.id === "industrialConfirmTurnBtn"){
      const labels = [...document.querySelectorAll(".industrial-turn-summary .turn-summary-choice strong")].map(n=>n.textContent.trim());
      if(labels[0] && !/no new investment/i.test(labels[0])) play("invest");
      if(/^sell\b/i.test(labels[1]||"")) setTimeout(()=>play("sell"),150);
      else if(/^adapt\b/i.test(labels[1]||"")) setTimeout(()=>play("adapt"),150);
      else if(/^hold\b/i.test(labels[1]||"")) setTimeout(()=>play("hold"),150);
      return;
    }
    if(button.id === "confirmDecisionBtn"){
      const d = typeof navigationState !== "undefined" ? navigationState.selection : null;
      if(!d){ play("confirm"); return; }
      if(d.action === "invest") play("invest");
      else if(d.action === "sell") play("sell");
      else if(d.action === "adapt") play("adapt");
      else if(d.action === "digitise") play("digitise");
      else if(d.action === "hold") play("hold");
      else if(d.action === "strategy") play(d.selection === "regenerative" ? "regenerative" : "agentic");
      return;
    }
  },true);

  // Tile-by-tile movement sound.
  const lastStep = new WeakMap();
  const observer = new MutationObserver(records=>{
    const now = performance.now();
    for(const record of records){
      if(record.type !== "attributes" || record.attributeName !== "class") continue;
      const target = record.target;
      if(!(target instanceof Element) || !target.matches(".token.walking")) continue;
      const last = lastStep.get(target) || 0;
      if(now-last > 110){ lastStep.set(target,now); play("step"); }
    }
  });
  if(document.body) observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});

  // Era/event cues follow the actual rendered state.
  function stateKey(){
    if(typeof gameState === "undefined") return "";
    return [gameState.mode,gameState.phase,gameState.uiStage,Boolean(gameState.phaseComplete)].join("|");
  }
  let lastState = stateKey();
  function stateCue(){
    const current = stateKey();
    if(current === lastState) return;
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

  if(typeof renderGame === "function" && !renderGame.__audioReliableV32Wrapped){
    const previous = renderGame;
    renderGame = function(){
      const out = previous.apply(this,arguments);
      stateCue();
      return out;
    };
    renderGame.__audioReliableV32Wrapped = true;
  }
})();

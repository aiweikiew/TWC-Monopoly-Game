"use strict";

// v30: self-contained classroom sound layer using the Web Audio API.
// No external audio files are required. Sounds are intentionally short so they
// reinforce actions without competing with the presentation narration.
(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.gameAudioV30 === "true") return;
  document.documentElement.dataset.gameAudioV30 = "true";

  const STORAGE_KEY = "timeToTravel:soundEnabled:v30";
  let enabled = true;
  try{
    const stored = localStorage.getItem(STORAGE_KEY);
    if(stored !== null) enabled = stored !== "false";
  }catch(_error){}

  let ctx = null;
  let master = null;
  let noiseBuffer = null;

  function loadStyles(){
    if(document.querySelector('link[href="css/game-audio-v30.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/game-audio-v30.css";
    document.head.appendChild(link);
  }

  function ensureContext(){
    if(!enabled) return null;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if(!AudioContextCtor) return null;
    if(!ctx){
      ctx = new AudioContextCtor();
      master = ctx.createGain();
      // Classroom boost: raise every game cue together while preserving their relative hierarchy.
      master.gain.value = 1.25;
      master.connect(ctx.destination);
    }
    if(ctx.state === "suspended") ctx.resume().catch(()=>{});
    return ctx;
  }

  function buildNoiseBuffer(){
    if(!ctx) return null;
    if(noiseBuffer) return noiseBuffer;
    const length = Math.max(1,Math.floor(ctx.sampleRate * 1.2));
    const buffer = ctx.createBuffer(1,length,ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<length;i++) data[i] = Math.random()*2-1;
    noiseBuffer = buffer;
    return buffer;
  }

  function tone(freq,duration=.1,options={}){
    if(!ensureContext()) return;
    const delay = Number(options.delay || 0);
    const volume = Number(options.volume ?? .05);
    const type = options.type || "sine";
    const endFreq = Number(options.endFreq || freq);
    const attack = Math.min(.018,duration*.25);
    const t = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20,freq),t);
    if(endFreq !== freq) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+attack);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(t);
    oscillator.stop(t+duration+.03);
  }

  function noise(duration=.08,options={}){
    if(!ensureContext()) return;
    const delay = Number(options.delay || 0);
    const volume = Number(options.volume ?? .025);
    const filterType = options.filterType || "bandpass";
    const freq = Number(options.freq || 1200);
    const endFreq = Number(options.endFreq || freq);
    const t = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buildNoiseBuffer();
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(40,freq),t);
    if(endFreq !== freq) filter.frequency.exponentialRampToValueAtTime(Math.max(40,endFreq),t+duration);
    if(options.q !== undefined) filter.Q.value = Number(options.q);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t,0,duration+.03);
    source.stop(t+duration+.04);
  }

  function pulseToggle(){
    const button = document.getElementById("gameSoundToggle");
    if(!button) return;
    button.classList.remove("sound-pulse");
    void button.offsetWidth;
    button.classList.add("sound-pulse");
  }

  function play(name){
    if(!enabled || !ensureContext()) return;
    pulseToggle();
    switch(name){
      case "identityTick":
        tone(720 + Math.random()*180,.055,{type:"triangle",volume:.026,endFreq:820+Math.random()*120});
        break;
      case "identityReveal":
        tone(659,.20,{type:"triangle",volume:.046});
        tone(880,.24,{type:"triangle",volume:.042,delay:.07});
        tone(1175,.30,{type:"sine",volume:.040,delay:.14});
        break;
      case "dice":
        for(let i=0;i<9;i++) noise(.045,{delay:i*.055,volume:.022,filterType:"bandpass",freq:900+Math.random()*900,q:1.4});
        tone(190,.10,{type:"triangle",volume:.025,delay:.02,endFreq:150});
        break;
      case "step":
        noise(.032,{volume:.018,filterType:"bandpass",freq:1150,q:2});
        tone(165,.038,{type:"sine",volume:.018,endFreq:125});
        break;
      case "chance":
        noise(.11,{volume:.021,filterType:"highpass",freq:1100,endFreq:2600});
        tone(880,.10,{type:"triangle",volume:.028,delay:.05,endFreq:1180});
        break;
      case "purchase":
      case "invest":
        tone(740,.11,{type:"triangle",volume:.038});
        tone(1046,.16,{type:"sine",volume:.044,delay:.07});
        tone(1318,.20,{type:"sine",volume:.030,delay:.13});
        break;
      case "payment":
        tone(760,.10,{type:"triangle",volume:.032});
        tone(520,.14,{type:"triangle",volume:.032,delay:.07});
        break;
      case "reward":
        tone(620,.10,{type:"triangle",volume:.032});
        tone(930,.16,{type:"sine",volume:.038,delay:.07});
        break;
      case "sell":
        tone(920,.09,{type:"triangle",volume:.036});
        tone(700,.11,{type:"triangle",volume:.034,delay:.06});
        tone(520,.14,{type:"sine",volume:.034,delay:.12});
        break;
      case "adapt":
        tone(260,.23,{type:"sawtooth",volume:.025,endFreq:760});
        tone(880,.18,{type:"triangle",volume:.040,delay:.16});
        break;
      case "digitise":
        tone(540,.07,{type:"square",volume:.020});
        tone(810,.07,{type:"square",volume:.019,delay:.06});
        tone(1215,.12,{type:"triangle",volume:.032,delay:.12});
        break;
      case "hold":
        tone(460,.07,{type:"triangle",volume:.023,endFreq:430});
        break;
      case "confirm":
        tone(620,.09,{type:"triangle",volume:.030});
        tone(820,.14,{type:"sine",volume:.034,delay:.065});
        break;
      case "error":
        tone(180,.12,{type:"square",volume:.038,endFreq:150});
        tone(135,.14,{type:"square",volume:.034,delay:.13,endFreq:118});
        break;
      case "shockIndustrial":
        noise(.48,{volume:.050,filterType:"lowpass",freq:950,endFreq:420});
        tone(95,.55,{type:"sawtooth",volume:.050,endFreq:48});
        tone(620,.34,{type:"triangle",volume:.030,delay:.16,endFreq:1080});
        break;
      case "revaluation":
        tone(300,.18,{type:"triangle",volume:.027,endFreq:610});
        tone(760,.14,{type:"sine",volume:.034,delay:.13});
        tone(980,.18,{type:"sine",volume:.027,delay:.22});
        break;
      case "shockJet":
        noise(.58,{volume:.043,filterType:"bandpass",freq:320,endFreq:2800,q:.8});
        tone(110,.42,{type:"sawtooth",volume:.028,endFreq:220});
        tone(540,.36,{type:"triangle",volume:.026,delay:.18,endFreq:1180});
        break;
      case "shockDigital":
        for(let i=0;i<6;i++) tone(i%2?960:240,.055,{type:"square",volume:.022,delay:i*.052,endFreq:i%2?720:360});
        noise(.18,{volume:.025,filterType:"highpass",freq:1500,delay:.09});
        tone(1320,.14,{type:"triangle",volume:.032,delay:.29,endFreq:880});
        break;
      case "fitBoom":
        tone(520,.10,{type:"triangle",volume:.032});
        tone(660,.10,{type:"triangle",volume:.034,delay:.08});
        tone(880,.18,{type:"sine",volume:.040,delay:.16});
        break;
      case "crisis":
        tone(165,.20,{type:"sawtooth",volume:.040,endFreq:145});
        tone(120,.22,{type:"sawtooth",volume:.042,delay:.22,endFreq:108});
        tone(165,.20,{type:"sawtooth",volume:.038,delay:.46,endFreq:145});
        noise(.52,{volume:.025,filterType:"lowpass",freq:650,endFreq:300});
        break;
      case "agentic":
        tone(520,.08,{type:"square",volume:.019});
        tone(780,.09,{type:"triangle",volume:.028,delay:.06});
        tone(1040,.11,{type:"triangle",volume:.031,delay:.12});
        tone(1560,.16,{type:"sine",volume:.026,delay:.19});
        break;
      case "regenerative":
        tone(392,.22,{type:"sine",volume:.026});
        tone(494,.25,{type:"sine",volume:.026,delay:.04});
        tone(659,.30,{type:"sine",volume:.030,delay:.08});
        break;
      case "results":
        tone(440,.09,{type:"triangle",volume:.028});
        tone(554,.11,{type:"triangle",volume:.028,delay:.07});
        tone(659,.16,{type:"sine",volume:.034,delay:.14});
        break;
      case "winner":
        tone(523,.12,{type:"triangle",volume:.034});
        tone(659,.12,{type:"triangle",volume:.034,delay:.10});
        tone(784,.13,{type:"triangle",volume:.038,delay:.20});
        tone(1046,.34,{type:"sine",volume:.050,delay:.30});
        break;
    }
  }

  function setEnabled(next){
    enabled = Boolean(next);
    try{ localStorage.setItem(STORAGE_KEY,String(enabled)); }catch(_error){}
    const button = document.getElementById("gameSoundToggle");
    if(button){
      button.dataset.muted = enabled ? "false" : "true";
      button.textContent = enabled ? "🔊" : "🔇";
      button.title = enabled ? "Sound on · click to mute" : "Sound muted · click to unmute";
      button.setAttribute("aria-label",button.title);
    }
    if(enabled) ensureContext();
  }

  window.GameAudio = {play,setEnabled,get enabled(){ return enabled; }};

  function installToggle(){
    if(document.getElementById("gameSoundToggle")) return;
    const button = document.createElement("button");
    button.id = "gameSoundToggle";
    button.type = "button";
    document.body.appendChild(button);
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      setEnabled(!enabled);
      if(enabled) window.setTimeout(()=>play("confirm"),20);
    });
    setEnabled(enabled);
  }

  function stateKey(){
    if(typeof gameState === "undefined") return "";
    return [gameState.mode,gameState.phase,gameState.uiStage,Boolean(gameState.phaseComplete)].join("|");
  }

  function landingKey(){
    if(typeof gameState === "undefined" || gameState.mode !== "monopoly") return "";
    const board = gameState.board;
    const landing = board?.pendingLanding;
    if(board?.status !== "landing" || !landing) return "";
    return [landing.teamId,landing.tile,landing.kind,landing.cardIndex ?? ""].join("|");
  }

  let lastState = stateKey();
  let lastLanding = landingKey();

  function playStateCue(){
    if(typeof gameState === "undefined") return;
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

  function playAction(action,selection){
    if(action === "invest") play("invest");
    else if(action === "sell") play("sell");
    else if(action === "adapt") play("adapt");
    else if(action === "digitise") play("digitise");
    else if(action === "hold") play("hold");
    else if(action === "strategy") play(selection === "regenerative" ? "regenerative" : "agentic");
    else play("confirm");
  }

  function invalidButton(button){
    if(!button?.disabled) return false;
    if(button.id === "industrialConfirmTurnBtn") return true;
    if(button.matches("[data-action], [data-industrial-invest], [data-industrial-portfolio]")) return true;
    if(button.id === "buyBtn") return true;
    return false;
  }

  window.addEventListener("pointerdown",event=>{
    if(enabled) ensureContext();
    const button = event.target.closest?.("button");
    if(invalidButton(button)) play("error");
  },true);

  window.addEventListener("click",event=>{
    const button = event.target.closest?.("button");
    if(!button || button.id === "gameSoundToggle") return;

    if(button.id === "rollBtn" && !button.disabled){ play("dice"); return; }
    if(button.id === "buyBtn" && !button.disabled){ play("purchase"); return; }
    if(button.id === "payFeeBtn" && !button.disabled){ play("payment"); return; }
    if(button.id === "opportunityContinueBtn" && !button.disabled){ play("reward"); return; }
    if(button.id === "chanceContinueBtn" && !button.disabled){
      const effect = Number(gameState?.board?.pendingLanding?.effect || 0);
      if(effect > 0) play("reward");
      else if(effect < 0) play("payment");
      return;
    }

    if(button.id === "industrialConfirmTurnBtn"){
      if(button.disabled){ play("error"); return; }
      const beforeCount = Object.keys(gameState?.decisions || {}).length;
      const summaries = [...document.querySelectorAll(".industrial-turn-summary .turn-summary-choice strong")].map(node=>node.textContent.trim());
      const sounds = [];
      if(summaries[0] && !/no new investment/i.test(summaries[0])) sounds.push("invest");
      if(/^sell\b/i.test(summaries[1] || "")) sounds.push("sell");
      else if(/^adapt\b/i.test(summaries[1] || "")) sounds.push("adapt");
      else if(/^hold\b/i.test(summaries[1] || "")) sounds.push("hold");
      window.setTimeout(()=>{
        const afterCount = Object.keys(gameState?.decisions || {}).length;
        if(afterCount > beforeCount || gameState?.uiStage !== "decisions"){
          if(!sounds.length) play("confirm");
          sounds.forEach((sound,index)=>window.setTimeout(()=>play(sound),index*170));
        }else play("error");
      },0);
      return;
    }

    if(button.id === "confirmDecisionBtn"){
      const draft = typeof navigationState !== "undefined" && navigationState.selection
        ? {...navigationState.selection}
        : null;
      const beforeCount = Object.keys(gameState?.decisions || {}).length;
      window.setTimeout(()=>{
        const afterCount = Object.keys(gameState?.decisions || {}).length;
        if(draft && (afterCount > beforeCount || gameState?.uiStage !== "decisions")) playAction(draft.action,draft.selection);
        else play("error");
      },0);
    }
  },true);

  function installVisualObservers(){
    if(!document.body) return;
    const lastStepAt = new WeakMap();
    const lastIdentityTickAt = new WeakMap();
    const lastRevealAt = new WeakMap();
    const observer = new MutationObserver(records=>{
      const now = performance.now();
      for(const record of records){
        if(record.type !== "attributes" || record.attributeName !== "class") continue;
        const target = record.target;
        if(!(target instanceof Element)) continue;

        if(target.matches(".setup-card.is-draw-scan")){
          const last = lastIdentityTickAt.get(target) || 0;
          if(now-last > 45){ lastIdentityTickAt.set(target,now); play("identityTick"); }
        }
        if(target.matches(".setup-card.draw-winner")){
          const last = lastRevealAt.get(target) || 0;
          if(now-last > 500){ lastRevealAt.set(target,now); play("identityReveal"); }
        }
        if(target.matches(".token.walking")){
          const last = lastStepAt.get(target) || 0;
          if(now-last > 120){
            lastStepAt.set(target,now);
            play("step");
            const label = (target.textContent || "").trim();
            const index = label === "A" ? 0 : label === "B" ? 1 : label === "C" ? 2 : -1;
            if(index >= 0 && gameState?.board?.positions?.[index] === 0) window.setTimeout(()=>play("reward"),80);
          }
        }
      }
    });
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
  }

  function wrapRenderGame(){
    if(typeof renderGame !== "function" || renderGame.__audioV30Wrapped) return false;
    const previous = renderGame;
    const wrapped = function(){
      const result = previous.apply(this,arguments);
      playStateCue();
      return result;
    };
    wrapped.__audioV30Wrapped = true;
    renderGame = wrapped;
    return true;
  }

  function init(){
    loadStyles();
    installToggle();
    installVisualObservers();
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
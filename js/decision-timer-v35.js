"use strict";

// v35: compact draggable 20s presenter timer across Industrial, Digital and Future decisions.
(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.decisionTimerV35 === "true") return;
  document.documentElement.dataset.decisionTimerV35 = "true";

  const DURATION = 20;
  const POSITION_KEY = "timeToTravel:decisionTimerPosition:v35";
  let decisionKey = null;
  let remaining = DURATION;
  let running = false;
  let deadline = 0;
  let lastTickSecond = null;
  let timerId = null;
  let audioContext = null;
  let dragState = null;
  let savedPosition = null;

  document.getElementById("decisionTimerV33")?.remove();
  document.getElementById("decisionTimerV34")?.remove();

  try{
    const stored = localStorage.getItem(POSITION_KEY);
    if(stored){
      const parsed = JSON.parse(stored);
      if(Number.isFinite(parsed?.left) && Number.isFinite(parsed?.top)) savedPosition = parsed;
    }
  }catch(_error){}

  function loadStyles(){
    if(document.querySelector('link[href*="decision-timer-v34.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/decision-timer-v34.css?v=2";
    document.head.appendChild(link);
  }

  function nodeVisible(node){
    return Boolean(node && node.offsetParent !== null);
  }

  function activeDecision(){
    if(typeof gameState === "undefined") return null;

    const phase = gameState.phase;
    const team = gameState.teams?.[gameState.currentTeam];

    // State-based check is the primary rule so the timer survives layout/render variations.
    const stateDecision = ["steam","digital","future"].includes(phase) && gameState.uiStage === "decisions";

    // DOM fallbacks cover alternate/current layouts used by each era.
    const selectors = [
      ".industrial-turn-screen.decision-screen",
      ".strategy-modern-screen.digital-era.decision-modern-screen",
      ".strategy-modern-screen.future-era.decision-modern-screen",
      ".digital-turn-screen",
      ".digital-decision-screen",
      ".future-decision-v18",
      ".future-response-screen"
    ];
    const visibleDecision = selectors.some(selector => nodeVisible(document.querySelector(selector)));

    if(!stateDecision && !visibleDecision) return null;
    return {key:`${phase || "decision"}|${team?.id || gameState.currentTeam || "current"}`};
  }

  function ensureAudio(){
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if(!Ctor) return null;
    if(!audioContext) audioContext = new Ctor();
    if(audioContext.state === "suspended") audioContext.resume().catch(()=>{});
    return audioContext;
  }

  function beep(freq=700,duration=.055,volume=.09,delay=0){
    const ctx = ensureAudio();
    if(!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq,t);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(volume,t+.005);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t+duration+.02);
  }

  function secondTick(second){
    if(second < 1 || second === lastTickSecond) return;
    lastTickSecond = second;
    if(second <= 2) beep(1050,.075,.15);
    else if(second <= 5) beep(880,.065,.12);
    else beep(640,.05,.085);
  }

  function timeUpSound(){
    beep(900,.12,.15,0);
    beep(600,.16,.16,.15);
    beep(380,.22,.18,.34);
  }

  function panel(){ return document.getElementById("decisionTimerV35"); }

  function clampPosition(el,left,top){
    const gap = 6;
    const width = el.offsetWidth || 176;
    const height = el.offsetHeight || 124;
    return {
      left:Math.max(gap,Math.min(left,window.innerWidth-width-gap)),
      top:Math.max(gap,Math.min(top,window.innerHeight-height-gap))
    };
  }

  function place(el,left,top,save=false){
    const pos = clampPosition(el,left,top);
    el.style.left = `${pos.left}px`;
    el.style.top = `${pos.top}px`;
    savedPosition = pos;
    if(save){
      try{ localStorage.setItem(POSITION_KEY,JSON.stringify(pos)); }catch(_error){}
    }
  }

  function installDrag(el){
    const handle = el.querySelector("#decisionTimerDragV35");
    handle.addEventListener("pointerdown",event=>{
      if(event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = el.getBoundingClientRect();
      dragState = {pointerId:event.pointerId,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top};
      el.classList.add("is-dragging");
      try{ handle.setPointerCapture(event.pointerId); }catch(_error){}
    });
    handle.addEventListener("pointermove",event=>{
      if(!dragState || dragState.pointerId !== event.pointerId) return;
      event.preventDefault();
      place(el,event.clientX-dragState.offsetX,event.clientY-dragState.offsetY,false);
    });
    function finish(event){
      if(!dragState || dragState.pointerId !== event.pointerId) return;
      try{ handle.releasePointerCapture(event.pointerId); }catch(_error){}
      dragState = null;
      el.classList.remove("is-dragging");
      const rect = el.getBoundingClientRect();
      place(el,rect.left,rect.top,true);
    }
    handle.addEventListener("pointerup",finish);
    handle.addEventListener("pointercancel",finish);
    window.addEventListener("resize",()=>{
      if(savedPosition) place(el,savedPosition.left,savedPosition.top,false);
    });
  }

  function mount(){
    if(panel()) return panel();
    const el = document.createElement("aside");
    el.id = "decisionTimerV35";
    el.className = "decision-timer-v34";
    el.hidden = true;
    el.innerHTML = `
      <button class="decision-timer-drag-v34" id="decisionTimerDragV35" type="button" aria-label="Drag timer" title="Drag timer">•••</button>
      <div class="decision-timer-clock-v34" id="decisionTimerClockV35">20</div>
      <div class="decision-timer-controls-v34">
        <button type="button" id="decisionTimerStartV35">START</button>
        <button type="button" id="decisionTimerStopV35">STOP</button>
        <button type="button" id="decisionTimerResetV35">RESET</button>
      </div>`;
    document.body.appendChild(el);
    installDrag(el);
    if(savedPosition) place(el,savedPosition.left,savedPosition.top,false);
    else place(el,Math.max(8,window.innerWidth-194),70,false);

    el.querySelector("#decisionTimerStartV35").addEventListener("pointerdown",ensureAudio,{passive:true});
    el.querySelector("#decisionTimerStartV35").addEventListener("click",startTimer);
    el.querySelector("#decisionTimerStopV35").addEventListener("click",stopTimer);
    el.querySelector("#decisionTimerResetV35").addEventListener("click",()=>resetTimer(true));
    return el;
  }

  function resetTimer(playCue=false){
    running = false;
    deadline = 0;
    remaining = DURATION;
    lastTickSecond = null;
    if(playCue) beep(620,.06,.07);
    updatePanel();
  }

  function startTimer(){
    syncContext();
    if(!decisionKey || running) return;
    if(remaining <= 0) remaining = DURATION;
    running = true;
    deadline = performance.now() + remaining*1000;
    lastTickSecond = null;
    updatePanel();
  }

  function stopTimer(){
    if(!running) return;
    remaining = Math.max(0,(deadline-performance.now())/1000);
    running = false;
    deadline = 0;
    updatePanel();
  }

  function updatePanel(){
    const el = panel();
    if(!el) return;
    el.querySelector("#decisionTimerClockV35").textContent = String(Math.max(0,Math.ceil(remaining))).padStart(2,"0");
    el.classList.toggle("is-running",running);
    el.classList.toggle("is-warning",remaining > 0 && remaining <= 5);
    el.classList.toggle("is-expired",remaining <= 0);
    el.querySelector("#decisionTimerStartV35").disabled = running;
    el.querySelector("#decisionTimerStopV35").disabled = !running;
  }

  function syncContext(){
    const el = mount();
    const current = activeDecision();
    if(!current){
      el.hidden = true;
      decisionKey = null;
      running = false;
      remaining = DURATION;
      deadline = 0;
      lastTickSecond = null;
      return;
    }

    el.hidden = false;
    if(current.key !== decisionKey){
      decisionKey = current.key;
      running = false;
      remaining = DURATION;
      deadline = 0;
      lastTickSecond = null;
      updatePanel();
    }
  }

  function tick(){
    syncContext();
    if(!running || !decisionKey) return;
    remaining = Math.max(0,(deadline-performance.now())/1000);
    const second = Math.ceil(remaining);
    secondTick(second);
    if(remaining <= 0){
      remaining = 0;
      running = false;
      deadline = 0;
      timeUpSound();
    }
    updatePanel();
  }

  function init(){
    loadStyles();
    mount();
    syncContext();
    if(timerId) window.clearInterval(timerId);
    timerId = window.setInterval(tick,100);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

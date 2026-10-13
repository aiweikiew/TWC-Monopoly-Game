"use strict";

// v34: ultra-compact draggable 20s presenter timer.
(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.decisionTimerV34 === "true") return;
  document.documentElement.dataset.decisionTimerV34 = "true";

  const DURATION = 20;
  const POSITION_KEY = "timeToTravel:decisionTimerPosition:v34";
  let decisionKey = null;
  let remaining = DURATION;
  let running = false;
  let deadline = 0;
  let lastTickSecond = null;
  let timerId = null;
  let audioContext = null;
  let dragState = null;
  let savedPosition = null;

  // Remove any stale v33 timer that may have been loaded from cache.
  document.getElementById("decisionTimerV33")?.remove();

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
    link.href = "css/decision-timer-v34.css?v=1";
    document.head.appendChild(link);
  }

  function activeDecision(){
    const industrial = document.querySelector(".industrial-turn-screen.decision-screen");
    const modern = document.querySelector(".strategy-modern-screen.decision-modern-screen");
    const visible = [industrial,modern].find(node=>node && node.offsetParent !== null);
    if(!visible) return null;
    const team = typeof gameState !== "undefined" ? gameState.teams?.[gameState.currentTeam] : null;
    return {key:`${gameState?.phase || "decision"}|${team?.id || "current"}`};
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

  function panel(){ return document.getElementById("decisionTimerV34"); }

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
    const handle = el.querySelector("#decisionTimerDragV34");
    handle.addEventListener("pointerdown",event=>{
      if(event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
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
    el.id = "decisionTimerV34";
    el.className = "decision-timer-v34";
    el.hidden = true;
    el.innerHTML = `
      <button class="decision-timer-drag-v34" id="decisionTimerDragV34" type="button" aria-label="Drag timer" title="Drag timer">•••</button>
      <div class="decision-timer-clock-v34" id="decisionTimerClockV34">20</div>
      <div class="decision-timer-controls-v34">
        <button type="button" id="decisionTimerStartV34">START</button>
        <button type="button" id="decisionTimerStopV34">STOP</button>
        <button type="button" id="decisionTimerResetV34">RESET</button>
      </div>`;
    document.body.appendChild(el);
    installDrag(el);
    if(savedPosition) place(el,savedPosition.left,savedPosition.top,false);
    else place(el,Math.max(8,window.innerWidth-194),70,false);

    el.querySelector("#decisionTimerStartV34").addEventListener("pointerdown",ensureAudio,{passive:true});
    el.querySelector("#decisionTimerStartV34").addEventListener("click",startTimer);
    el.querySelector("#decisionTimerStopV34").addEventListener("click",stopTimer);
    el.querySelector("#decisionTimerResetV34").addEventListener("click",()=>resetTimer(true));
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
    el.querySelector("#decisionTimerClockV34").textContent = String(Math.max(0,Math.ceil(remaining))).padStart(2,"0");
    el.classList.toggle("is-running",running);
    el.classList.toggle("is-warning",remaining > 0 && remaining <= 5);
    el.classList.toggle("is-expired",remaining <= 0);
    el.querySelector("#decisionTimerStartV34").disabled = running;
    el.querySelector("#decisionTimerStopV34").disabled = !running;
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

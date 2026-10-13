"use strict";

// Simple presenter-controlled 20-second timer shown as a compact floating overlay
// on team decision screens. Drag it anywhere inside the browser viewport.
(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.decisionTimerV33 === "true") return;
  document.documentElement.dataset.decisionTimerV33 = "true";

  const DURATION = 20;
  const POSITION_KEY = "timeToTravel:decisionTimerPosition:v33";
  let decisionKey = null;
  let remaining = DURATION;
  let running = false;
  let deadline = 0;
  let lastBeepSecond = null;
  let intervalId = null;
  let audioContext = null;
  let dragState = null;
  let savedPosition = null;

  try{
    const stored = localStorage.getItem(POSITION_KEY);
    if(stored){
      const parsed = JSON.parse(stored);
      if(Number.isFinite(parsed?.left) && Number.isFinite(parsed?.top)) savedPosition = parsed;
    }
  }catch(_error){}

  function loadStyles(){
    if(document.querySelector('link[href="css/decision-timer-v33.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/decision-timer-v33.css";
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

  function beep(freq=760,duration=.08,volume=.09,delay=0){
    const ctx = ensureAudio();
    if(!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq,t);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(volume,t+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t+duration+.03);
  }

  // Audible clock tick on EVERY second. Final five seconds are deliberately
  // higher and louder so teams can feel the deadline approaching.
  function countdownBeep(second){
    if(second < 1 || second > DURATION || second === lastBeepSecond) return;
    lastBeepSecond = second;

    if(second <= 2){
      beep(1040,.095,.15);
    }else if(second <= 5){
      beep(900,.09,.125);
    }else{
      beep(650,.065,.095);
    }
  }

  function timeUpSound(){
    beep(880,.12,.13,0);
    beep(620,.14,.13,.14);
    beep(420,.20,.15,.30);
  }

  function panel(){ return document.getElementById("decisionTimerV33"); }

  function clampPosition(el,left,top){
    const gap = 6;
    const width = el.offsetWidth || 190;
    const height = el.offsetHeight || 118;
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
    const handle = el.querySelector("#decisionTimerDrag");
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
    el.id = "decisionTimerV33";
    el.className = "decision-timer-v33";
    el.hidden = true;
    el.innerHTML = `
      <div class="decision-timer-drag" id="decisionTimerDrag" title="Drag timer" aria-label="Drag timer">
        <span class="decision-timer-grip">•••</span>
      </div>
      <div class="decision-timer-clock" id="decisionTimerClock">20</div>
      <div class="decision-timer-controls">
        <button type="button" id="decisionTimerStart">START</button>
        <button type="button" id="decisionTimerStop">STOP</button>
        <button type="button" id="decisionTimerReset">RESET</button>
      </div>`;
    document.body.appendChild(el);
    installDrag(el);
    if(savedPosition) place(el,savedPosition.left,savedPosition.top,false);
    else place(el,Math.max(8,window.innerWidth-210),70,false);

    el.querySelector("#decisionTimerStart").addEventListener("pointerdown",ensureAudio,{passive:true});
    el.querySelector("#decisionTimerStart").addEventListener("click",startTimer);
    el.querySelector("#decisionTimerStop").addEventListener("click",stopTimer);
    el.querySelector("#decisionTimerReset").addEventListener("click",()=>resetTimer(true));
    return el;
  }

  function resetTimer(playCue=false){
    running = false;
    deadline = 0;
    remaining = DURATION;
    lastBeepSecond = null;
    if(playCue) beep(620,.07,.07);
    updatePanel();
  }

  function startTimer(){
    syncContext();
    if(!decisionKey || running) return;
    if(remaining <= 0) remaining = DURATION;
    running = true;
    deadline = performance.now() + remaining*1000;
    lastBeepSecond = null;
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
    el.querySelector("#decisionTimerClock").textContent = String(Math.max(0,Math.ceil(remaining))).padStart(2,"0");
    el.classList.toggle("is-running",running);
    el.classList.toggle("is-warning",remaining > 0 && remaining <= 5);
    el.classList.toggle("is-expired",remaining <= 0);
    el.querySelector("#decisionTimerStart").disabled = running;
    el.querySelector("#decisionTimerStop").disabled = !running;
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
      lastBeepSecond = null;
      return;
    }
    el.hidden = false;
    if(current.key !== decisionKey){
      decisionKey = current.key;
      running = false;
      remaining = DURATION;
      deadline = 0;
      lastBeepSecond = null;
      updatePanel();
    }
  }

  function tick(){
    syncContext();
    if(!running || !decisionKey) return;
    remaining = Math.max(0,(deadline-performance.now())/1000);
    const second = Math.ceil(remaining);
    countdownBeep(second);
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
    if(intervalId) window.clearInterval(intervalId);
    intervalId = window.setInterval(tick,100);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

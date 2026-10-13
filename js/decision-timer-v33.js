"use strict";

// v33: presenter-controlled 20-second timer for every team decision screen.
// The timer resets for each new team/phase, but only starts when the presenter clicks it.
// It can also be dragged anywhere on screen; double-click DRAG to dock it back inline.
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
  let timerHandle = null;
  let audioContext = null;
  let userPositioned = false;
  let savedPosition = null;
  let dragState = null;

  try{
    const stored = localStorage.getItem(POSITION_KEY);
    if(stored){
      const parsed = JSON.parse(stored);
      if(Number.isFinite(parsed?.left) && Number.isFinite(parsed?.top)){
        savedPosition = parsed;
        userPositioned = true;
      }
    }
  }catch(_error){}

  function loadStyles(){
    if(document.querySelector('link[href="css/decision-timer-v33.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/decision-timer-v33.css";
    document.head.appendChild(link);
  }

  function visibleDecisionHost(){
    const industrial = document.querySelector(".industrial-turn-screen.decision-screen .industrial-turn-heading");
    if(industrial && industrial.offsetParent !== null) return industrial.parentElement;

    const modern = document.querySelector(".strategy-modern-screen.decision-modern-screen .strategy-modern-header");
    if(modern && modern.offsetParent !== null) return modern.parentElement;

    return null;
  }

  function phaseLabel(){
    const host = visibleDecisionHost();
    if(host?.classList.contains("industrial-turn-screen")) return "INDUSTRIAL DECISION";
    if(host?.classList.contains("digital-era")) return "DIGITAL DECISION";
    if(host?.classList.contains("future-era")) return "FUTURE DECISION";
    if(typeof gameState !== "undefined"){
      if(gameState.phase === "steam") return "INDUSTRIAL DECISION";
      if(gameState.phase === "digital") return "DIGITAL DECISION";
      if(gameState.phase === "future") return "FUTURE DECISION";
    }
    return "TEAM DECISION";
  }

  function currentDecision(){
    const host = visibleDecisionHost();
    if(!host) return null;

    const team = typeof gameState !== "undefined" ? gameState.teams?.[gameState.currentTeam] : null;
    const teamId = team?.id || "CURRENT";
    const teamName = team?.name || "Current Team";
    const phase = phaseLabel();

    return {
      key:`${phase}|${teamId}`,
      teamName,
      phase,
      host
    };
  }

  function ensureAudio(){
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if(!Ctor) return null;
    if(!audioContext) audioContext = new Ctor();
    if(audioContext.state === "suspended") audioContext.resume().catch(()=>{});
    return audioContext;
  }

  function beep(freq=720,duration=.09,volume=.11,delay=0){
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

  function warningBeep(second){
    if(second > 5 || second < 1 || second === lastBeepSecond) return;
    lastBeepSecond = second;
    beep(second <= 2 ? 980 : 760,.08,second <= 2 ? .14 : .10);
  }

  function timeUpSound(){
    beep(880,.13,.15,0);
    beep(660,.16,.15,.16);
    beep(440,.22,.17,.34);
  }

  function panel(){ return document.getElementById("decisionTimerV33"); }

  function clampPosition(el,left,top){
    const gap = 8;
    const width = el.offsetWidth || 520;
    const height = el.offsetHeight || 100;
    return {
      left:Math.max(gap,Math.min(left,window.innerWidth-width-gap)),
      top:Math.max(gap,Math.min(top,window.innerHeight-height-gap))
    };
  }

  function applyFloatingPosition(el,left,top,save=false){
    if(el.parentElement !== document.body) document.body.appendChild(el);
    el.classList.add("is-floating");
    const pos = clampPosition(el,left,top);
    el.style.left = `${pos.left}px`;
    el.style.top = `${pos.top}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
    savedPosition = pos;
    userPositioned = true;
    if(save){
      try{ localStorage.setItem(POSITION_KEY,JSON.stringify(pos)); }catch(_error){}
    }
  }

  function dockTimer(){
    const el = panel();
    if(!el) return;
    userPositioned = false;
    savedPosition = null;
    dragState = null;
    el.classList.remove("is-floating","is-dragging");
    el.style.removeProperty("left");
    el.style.removeProperty("top");
    el.style.removeProperty("right");
    el.style.removeProperty("bottom");
    try{ localStorage.removeItem(POSITION_KEY); }catch(_error){}
    syncDecisionContext();
  }

  function installDrag(el){
    const handle = el.querySelector("#decisionTimerDrag");
    if(!handle || handle.dataset.dragReady === "true") return;
    handle.dataset.dragReady = "true";

    handle.addEventListener("pointerdown",event=>{
      if(event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      ensureAudio();

      const before = el.getBoundingClientRect();
      const compactWidth = Math.min(560,Math.max(430,before.width));
      const pointerRatio = before.width ? (event.clientX-before.left)/before.width : .5;

      if(el.parentElement !== document.body) document.body.appendChild(el);
      el.classList.add("is-floating","is-dragging");
      el.style.width = `${compactWidth}px`;

      const afterWidth = el.offsetWidth || compactWidth;
      const initialLeft = event.clientX - Math.max(20,Math.min(afterWidth-20,pointerRatio*afterWidth));
      const initialTop = before.top;
      const initial = clampPosition(el,initialLeft,initialTop);
      el.style.left = `${initial.left}px`;
      el.style.top = `${initial.top}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";

      dragState = {
        pointerId:event.pointerId,
        offsetX:event.clientX-initial.left,
        offsetY:event.clientY-initial.top
      };
      userPositioned = true;
      try{ handle.setPointerCapture(event.pointerId); }catch(_error){}
    });

    handle.addEventListener("pointermove",event=>{
      if(!dragState || dragState.pointerId !== event.pointerId) return;
      event.preventDefault();
      const pos = clampPosition(el,event.clientX-dragState.offsetX,event.clientY-dragState.offsetY);
      el.style.left = `${pos.left}px`;
      el.style.top = `${pos.top}px`;
      savedPosition = pos;
    });

    function finishDrag(event){
      if(!dragState || dragState.pointerId !== event.pointerId) return;
      try{ handle.releasePointerCapture(event.pointerId); }catch(_error){}
      dragState = null;
      el.classList.remove("is-dragging");
      const rect = el.getBoundingClientRect();
      const pos = clampPosition(el,rect.left,rect.top);
      savedPosition = pos;
      userPositioned = true;
      el.style.left = `${pos.left}px`;
      el.style.top = `${pos.top}px`;
      try{ localStorage.setItem(POSITION_KEY,JSON.stringify(pos)); }catch(_error){}
    }

    handle.addEventListener("pointerup",finishDrag);
    handle.addEventListener("pointercancel",finishDrag);
    handle.addEventListener("dblclick",event=>{
      event.preventDefault();
      event.stopPropagation();
      dockTimer();
    });

    window.addEventListener("resize",()=>{
      if(!userPositioned || !el.classList.contains("is-floating")) return;
      const rect = el.getBoundingClientRect();
      const pos = clampPosition(el,rect.left,rect.top);
      el.style.left = `${pos.left}px`;
      el.style.top = `${pos.top}px`;
      savedPosition = pos;
    });
  }

  function mount(){
    if(panel()) return panel();
    const el = document.createElement("aside");
    el.id = "decisionTimerV33";
    el.className = "decision-timer-v33";
    el.hidden = true;
    el.setAttribute("aria-live","polite");
    el.innerHTML = `
      <div class="decision-timer-main">
        <div class="decision-timer-labels">
          <div class="decision-timer-label-row">
            <span class="decision-timer-kicker">DECISION TIMER</span>
            <button type="button" class="decision-timer-drag" id="decisionTimerDrag" title="Drag timer · double-click to dock">↕ DRAG</button>
          </div>
          <strong id="decisionTimerTeam">TEAM DECISION</strong>
        </div>
        <div class="decision-timer-clock-wrap">
          <span class="decision-timer-clock" id="decisionTimerClock">20</span>
          <small>SEC</small>
        </div>
        <div class="decision-timer-track" aria-hidden="true"><span id="decisionTimerProgress"></span></div>
        <span class="decision-timer-status" id="decisionTimerStatus">READY</span>
        <button type="button" id="decisionTimerStart">START 20s</button>
        <button type="button" id="decisionTimerReset">RESET</button>
      </div>
      <div class="decision-timer-note" id="decisionTimerNote">Click START when the team begins discussing. Drag to move · double-click DRAG to dock.</div>`;
    document.body.appendChild(el);

    installDrag(el);
    if(userPositioned && savedPosition) applyFloatingPosition(el,savedPosition.left,savedPosition.top,false);

    el.querySelector("#decisionTimerStart").addEventListener("pointerdown",ensureAudio,{passive:true});
    el.querySelector("#decisionTimerStart").addEventListener("click",()=>{
      syncDecisionContext();
      if(!decisionKey) return;
      if(remaining <= 0) resetTimer(false);
      if(running) pauseTimer();
      else startTimer();
    });
    el.querySelector("#decisionTimerReset").addEventListener("click",()=>resetTimer(true));
    return el;
  }

  function resetTimer(playCue=false){
    running = false;
    deadline = 0;
    remaining = DURATION;
    lastBeepSecond = null;
    if(playCue) beep(620,.07,.08);
    updatePanel();
  }

  function startTimer(){
    if(remaining <= 0) remaining = DURATION;
    running = true;
    deadline = performance.now() + remaining * 1000;
    lastBeepSecond = null;
    beep(720,.08,.10);
    updatePanel();
  }

  function pauseTimer(){
    if(!running) return;
    remaining = Math.max(0,(deadline - performance.now()) / 1000);
    running = false;
    deadline = 0;
    updatePanel();
  }

  function updatePanel(){
    const el = panel();
    if(!el) return;
    const display = Math.max(0,Math.ceil(remaining));
    const clock = el.querySelector("#decisionTimerClock");
    const status = el.querySelector("#decisionTimerStatus");
    const start = el.querySelector("#decisionTimerStart");
    const note = el.querySelector("#decisionTimerNote");
    const progress = el.querySelector("#decisionTimerProgress");

    clock.textContent = String(display).padStart(2,"0");
    progress.style.width = `${Math.max(0,Math.min(100,(remaining / DURATION) * 100))}%`;
    el.classList.toggle("is-running",running);
    el.classList.toggle("is-warning",remaining > 0 && remaining <= 5);
    el.classList.toggle("is-expired",remaining <= 0);

    if(remaining <= 0){
      status.textContent = "TIME'S UP";
      start.textContent = "RESTART 20s";
      note.textContent = "Decision window ended — confirm the team's choice now.";
    }else if(running){
      status.textContent = remaining <= 5 ? "HURRY" : "RUNNING";
      start.textContent = "PAUSE";
      note.textContent = remaining <= 5 ? "Final seconds — lock in a decision." : "Timer is running.";
    }else if(remaining < DURATION){
      status.textContent = "PAUSED";
      start.textContent = "RESUME";
      note.textContent = "Paused — resume when ready.";
    }else{
      status.textContent = "READY";
      start.textContent = "START 20s";
      note.textContent = userPositioned ? "Drag to reposition · double-click DRAG to dock." : "Click START when the team begins discussing. Drag to move.";
    }
  }

  function placePanel(el,current){
    if(!current?.host) return;

    if(userPositioned){
      const fallback = savedPosition || {left:Math.max(8,window.innerWidth-580),top:18};
      applyFloatingPosition(el,fallback.left,fallback.top,false);
      return;
    }

    el.classList.remove("is-floating","is-dragging");
    el.style.removeProperty("left");
    el.style.removeProperty("top");
    el.style.removeProperty("right");
    el.style.removeProperty("bottom");
    el.style.removeProperty("width");

    const host = current.host;
    const anchor = host.querySelector(".industrial-turn-heading, .strategy-modern-header");
    if(anchor){
      if(el.parentElement !== host || el.previousElementSibling !== anchor){
        anchor.insertAdjacentElement("afterend",el);
      }
    }else if(el.parentElement !== host){
      host.prepend(el);
    }
  }

  function syncDecisionContext(){
    const el = mount();
    const current = currentDecision();
    if(!current){
      el.hidden = true;
      if(decisionKey !== null){
        decisionKey = null;
        running = false;
        remaining = DURATION;
        deadline = 0;
        lastBeepSecond = null;
      }
      return;
    }

    placePanel(el,current);
    el.hidden = false;
    if(current.key !== decisionKey){
      decisionKey = current.key;
      running = false;
      remaining = DURATION;
      deadline = 0;
      lastBeepSecond = null;
    }
    el.querySelector("#decisionTimerTeam").textContent = `${current.teamName.toUpperCase()} · ${current.phase}`;
    updatePanel();
  }

  function tick(){
    syncDecisionContext();
    if(running && decisionKey){
      remaining = Math.max(0,(deadline - performance.now()) / 1000);
      const second = Math.ceil(remaining);
      warningBeep(second);
      if(remaining <= 0){
        remaining = 0;
        running = false;
        deadline = 0;
        timeUpSound();
      }
      updatePanel();
    }
  }

  function init(){
    loadStyles();
    mount();
    syncDecisionContext();
    if(timerHandle) window.clearInterval(timerHandle);
    timerHandle = window.setInterval(tick,100);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

"use strict";

// v33: presenter-controlled 20-second timer for every team decision screen.
// The timer resets for each new team/phase, but only starts when the presenter clicks it.
(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.decisionTimerV33 === "true") return;
  document.documentElement.dataset.decisionTimerV33 = "true";

  const DURATION = 20;
  let decisionKey = null;
  let remaining = DURATION;
  let running = false;
  let deadline = 0;
  let lastBeepSecond = null;
  let timerHandle = null;
  let audioContext = null;

  function loadStyles(){
    if(document.querySelector('link[href="css/decision-timer-v33.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/decision-timer-v33.css";
    document.head.appendChild(link);
  }

  function phaseLabel(){
    if(typeof gameState === "undefined") return "TEAM DECISION";
    if(gameState.phase === "steam") return "INDUSTRIAL DECISION";
    if(gameState.phase === "digital") return "DIGITAL DECISION";
    if(gameState.phase === "future") return "FUTURE DECISION";
    return "TEAM DECISION";
  }

  function currentDecision(){
    if(typeof gameState === "undefined") return null;
    if(gameState.mode !== "strategy" || gameState.uiStage !== "decisions") return null;
    const team = gameState.teams?.[gameState.currentTeam];
    if(!team) return null;
    return {
      key:`${gameState.phase}|${team.id}`,
      teamName:team.name || `Team ${team.id}`,
      phase:phaseLabel()
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

  function panel(){
    return document.getElementById("decisionTimerV33");
  }

  function mount(){
    if(panel()) return panel();
    const el = document.createElement("aside");
    el.id = "decisionTimerV33";
    el.className = "decision-timer-v33";
    el.hidden = true;
    el.setAttribute("aria-live","polite");
    el.innerHTML = `
      <div class="decision-timer-topline">
        <div>
          <span class="decision-timer-kicker">DECISION TIMER</span>
          <strong id="decisionTimerTeam">TEAM DECISION</strong>
        </div>
        <span class="decision-timer-status" id="decisionTimerStatus">READY</span>
      </div>
      <div class="decision-timer-clock" id="decisionTimerClock">20</div>
      <div class="decision-timer-seconds">SECONDS</div>
      <div class="decision-timer-track" aria-hidden="true"><span id="decisionTimerProgress"></span></div>
      <div class="decision-timer-actions">
        <button type="button" id="decisionTimerStart">START 20s</button>
        <button type="button" id="decisionTimerReset">RESET</button>
      </div>
      <div class="decision-timer-note" id="decisionTimerNote">Click START when the team begins discussing.</div>`;
    document.body.appendChild(el);

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
      note.textContent = "Click START when the team begins discussing.";
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

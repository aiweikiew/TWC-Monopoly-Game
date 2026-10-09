"use strict";

// Load the dedicated screen-flow layer without disturbing the original board stylesheet.
if(typeof document !== "undefined" && !document.querySelector('link[href="css/flow.css"]')){
  const flowStyles = document.createElement("link");
  flowStyles.rel = "stylesheet";
  flowStyles.href = "css/flow.css";
  document.head.appendChild(flowStyles);
}
// The landing screen is a visual shell over the existing setup screen. It is only shown
// at the start of a fresh game and never interrupts a restored mid-game vetting session.
if(typeof document !== "undefined" && !document.querySelector('link[href="css/landing.css"]')){
  const landingStyles = document.createElement("link");
  landingStyles.rel = "stylesheet";
  landingStyles.href = "css/landing.css";
  document.head.appendChild(landingStyles);
}

const GAME_STORAGE_KEY = "tourismopoly:screen-flow-v2:v1";

// All mutable gameplay data lives here. Net Worth is always derived.
const gameState = {};
function clearSavedGame(){
  if(typeof localStorage === "undefined") return;
  try { localStorage.removeItem(GAME_STORAGE_KEY); } catch(_) {}
}
function resetGame(clearSaved = true){
  if(clearSaved) clearSavedGame();
  Object.keys(gameState).forEach(key => delete gameState[key]);
  Object.assign(gameState, {
    phase:"setup",mode:"setup",uiStage:"setup",landingSeen:false,teams:[],phaseComplete:false,destinationPressure:0,
    totalTurnCount:0,roundNumber:1,
    board:{positions:[0,0,0],owners:{},rolls:[0,0,0],
      status:"ready",pendingLanding:null,lastRoll:null,stepsRemaining:0,history:[]},
    setupSelected:[],currentTeam:0,nextAssetId:1,decisions:{},lastDecision:null,
    revaluationLog:[],events:{fitBoom:false,crisis:false},message:"Team A draws first."
  });
  if(typeof window !== "undefined" && typeof window.syncLandingScreen === "function") window.syncLandingScreen();
}
function saveGameState(){
  if(typeof localStorage === "undefined") return false;

  // Do not persist a half-played animation. The most recent stable screen remains saved,
  // so refreshing mid-roll safely returns to the state before that unfinished animation.
  if(gameState.mode === "monopoly" && ["rolling","moving"].includes(gameState.board?.status)) return false;

  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameState));
    return true;
  } catch(_) { return false; }
}
function restoreSavedGame(){
  if(typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY);
    if(!raw) return false;
    const saved = JSON.parse(raw);
    if(!saved || typeof saved !== "object" || !saved.board || !Array.isArray(saved.teams) || !saved.phase || !saved.mode) return false;
    // Older saved sessions predate the landing screen. Treat any progressed game as already entered.
    if(typeof saved.landingSeen !== "boolean"){
      saved.landingSeen = saved.phase !== "setup" || saved.teams.length > 0 || (saved.setupSelected?.length || 0) > 0;
    }
    Object.keys(gameState).forEach(key => delete gameState[key]);
    Object.assign(gameState, saved);
    return true;
  } catch(_) {
    clearSavedGame();
    return false;
  }
}
function calculateNetWorth(team){
  return team.cash + team.assets.reduce((total, asset) => total + asset.currentValue, 0);
}
function createAsset(type){
  const definition = assetTypes[type];
  return {
    id:`asset-${gameState.nextAssetId++}`,type,name:definition.name,
    era:definition.era,form:definition.name,currentValue:definition.price,
    tourism:definition.tourism !== false,digital:definition.digital === true
  };
}
function createTeam(identityIndex, teamIndex){
  const identity = identityPool[identityIndex];
  return {
    id:String.fromCharCode(65 + teamIndex),name:setupTeams[teamIndex],
    identity:{key:identity.key,name:identity.name,icon:identity.icon},
    cash:identity.cash,assets:[createAsset(identity.legacyType)],digitalReady:false,
    destinationPressure:0,visitorExperience:null,residentWellbeing:null,
    environmentalHealth:null,futureStrategy:null,futureInnovationCredit:0
  };
}
function clampScores(team){
  for(const key of ["visitorExperience","residentWellbeing","environmentalHealth"]){
    team[key] = Math.max(0, Math.min(5, team[key]));
  }
}

function mountLandingScreen(){
  if(typeof document === "undefined") return;
  let landing = document.getElementById("landingScreen");
  let returnBtn = document.getElementById("landingReturnBtn");

  if(!landing){
    landing = document.createElement("section");
    landing.id = "landingScreen";
    landing.className = "tourismopoly-landing";
    landing.setAttribute("aria-label","Tourismopoly start screen");
    landing.innerHTML = `
      <img class="landing-artwork" src="assets/landing-background.png" alt="Evolution of tourism from horse-drawn travel and steam transport to aviation and AI-enabled future travel" />
      <div class="landing-vignette" aria-hidden="true"></div>
      <div class="landing-title-card">
        <h1>TOURISMOPOLY</h1>
        <p class="landing-theme">ACCESS → AUTONOMY → ADAPTATION</p>
        <p class="landing-tagline">A Journey Through the Evolution of Tourism</p>
      </div>
      <div class="landing-interactive-zone">
        <button id="startTravellingBtn" class="start-travelling-btn" type="button" aria-label="Start Travelling">
          <span>Start Travelling</span><span class="start-arrow" aria-hidden="true">›</span>
        </button>
      </div>
      <div class="landing-footer">Grand Tour Edition · Europe c.1825 → 2035</div>`;
    document.body.appendChild(landing);
  }

  if(!returnBtn){
    returnBtn = document.createElement("button");
    returnBtn.id = "landingReturnBtn";
    returnBtn.type = "button";
    returnBtn.textContent = "← Back to Landing";
    returnBtn.setAttribute("aria-label","Back to Tourismopoly landing page");
    returnBtn.style.cssText = [
      "position:fixed","top:18px","left:18px","z-index:9998",
      "padding:10px 16px","border-radius:999px","border:1px solid rgba(97,64,34,.55)",
      "background:rgba(246,235,207,.94)","color:#3f2917","font:700 14px Georgia,serif",
      "box-shadow:0 6px 16px rgba(0,0,0,.16)","cursor:pointer"
    ].join(";");
    document.body.appendChild(returnBtn);
  }

  const startBtn = document.getElementById("startTravellingBtn");
  if(startBtn && !startBtn.dataset.landingBound){
    startBtn.dataset.landingBound = "true";
    startBtn.addEventListener("click", () => {
      if(landing.classList.contains("leaving")) return;
      gameState.landingSeen = true;
      saveGameState();
      returnBtn.hidden = false;
      landing.classList.add("leaving");
      window.setTimeout(() => {
        landing.hidden = true;
        landing.classList.remove("leaving");
      }, 560);
    });
  }

  if(!returnBtn.dataset.landingBound){
    returnBtn.dataset.landingBound = "true";
    returnBtn.addEventListener("click", () => {
      // This is only navigation: do not reset identity draws or any setup progress.
      gameState.landingSeen = false;
      saveGameState();
      landing.classList.remove("leaving");
      landing.hidden = false;
      returnBtn.hidden = true;
    });
  }

  window.syncLandingScreen = function(){
    if(!landing || !returnBtn) return;
    const shouldShowLanding = gameState.phase === "setup" && !gameState.landingSeen;
    const shouldShowReturn = gameState.phase === "setup" && gameState.landingSeen;
    landing.hidden = !shouldShowLanding;
    returnBtn.hidden = !shouldShowReturn;
    if(shouldShowLanding) landing.classList.remove("leaving");
  };
  window.syncLandingScreen();
}

// Start clean only when there is no saved classroom/testing session.
resetGame(false);
restoreSavedGame();
if(typeof document !== "undefined"){
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountLandingScreen, {once:true});
  else mountLandingScreen();
}

"use strict";

// Identity draw v4 is isolated from the rest of the game so the visual redesign
// does not disturb the board or later strategy screens.
if(typeof document !== "undefined" && !document.querySelector('link[href="css/setup-v4.css"]')){
  const setupStyles = document.createElement("link");
  setupStyles.rel = "stylesheet";
  setupStyles.href = "css/setup-v4.css";
  document.head.appendChild(setupStyles);
}

let setupDrawAnimating = false;

function setupDraw(forcedIndex = null){
  if(gameState.phase !== "setup" || gameState.setupSelected.length >= 3) return false;
  const used = new Set(gameState.setupSelected.map(s => s.index));
  const available = identityPool.map((_, i) => i).filter(i => !used.has(i));
  const index = forcedIndex === null ? available[Math.floor(Math.random() * available.length)] : forcedIndex;
  if(!available.includes(index)) return false;
  gameState.setupSelected.push({index});
  gameState.message = `${setupTeams[gameState.setupSelected.length - 1]} drew ${identityPool[index].name}.`;
  return true;
}

function setupUndo(){
  if(gameState.phase !== "setup" || !gameState.setupSelected.length || setupDrawAnimating) return false;
  const removed = gameState.setupSelected.pop();
  gameState.message = `${identityPool[removed.index].name} returned to the pool.`;
  return true;
}

function setupReset(){
  if(gameState.phase !== "setup" || setupDrawAnimating) return false;
  gameState.setupSelected = [];
  gameState.currentTeam = 0;
  gameState.teams = [];
  gameState.nextAssetId = 1;
  gameState.decisions = {};
  gameState.lastDecision = null;
  gameState.message = "Team A draws first.";
  return true;
}

function applySetupFromDraw(){
  const selected = gameState.setupSelected;
  if(gameState.phase !== "setup" || setupDrawAnimating || selected.length !== 3 ||
     new Set(selected.map(s => s.index)).size !== 3 ||
     selected.some(s => !Number.isInteger(s.index) || !identityPool[s.index])) return false;
  gameState.teams = selected.map((entry, i) => createTeam(entry.index, i));
  gameState.phase = "starting";
  gameState.mode = "monopoly";
  gameState.uiStage = "board";
  gameState.decisions = {};
  gameState.message = "Ready to roll. Teams take turns around the Grand Tour.";
  return true;
}

function setupWait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

function setSetupAnimationControlsLocked(locked){
  for(const id of ["setupDrawBtn","setupUndoBtn","setupResetBtn","setupConfirmBtn"]){
    const button = document.getElementById(id);
    if(button) button.disabled = locked || button.disabled;
  }
  const landingReturn = document.getElementById("landingReturnBtn");
  if(landingReturn) landingReturn.disabled = locked;
}

async function animateIdentityDraw(){
  if(setupDrawAnimating || gameState.phase !== "setup" || gameState.setupSelected.length >= 3) return;

  const used = new Set(gameState.setupSelected.map(s => s.index));
  const available = identityPool.map((_, i) => i).filter(i => !used.has(i));
  if(!available.length) return;

  const teamIndex = gameState.setupSelected.length;
  const teamName = setupTeams[teamIndex];
  const targetIndex = available[Math.floor(Math.random() * available.length)];
  const cardsContainer = document.getElementById("setupCards");
  const banner = document.getElementById("setupBanner");
  const status = document.getElementById("setupStatus");
  const drawButton = document.getElementById("setupDrawBtn");
  const cards = [...cardsContainer.querySelectorAll(".setup-card")];

  setupDrawAnimating = true;
  cardsContainer.classList.add("is-drawing");
  setSetupAnimationControlsLocked(true);
  if(drawButton) drawButton.textContent = `${teamName} · Drawing...`;
  if(banner) banner.textContent = `${teamName}, your travelling identity is being drawn...`;
  if(status) status.textContent = "Watch the illuminated frame — one identity will be selected.";

  let activeIndex = null;
  const lightCard = index => {
    if(activeIndex !== null && cards[activeIndex]) cards[activeIndex].classList.remove("is-draw-scan");
    activeIndex = index;
    if(cards[activeIndex]) cards[activeIndex].classList.add("is-draw-scan");
  };

  try {
    // Fast roulette for roughly 2.4 seconds.
    let cursor = Math.floor(Math.random() * available.length);
    const start = performance.now();
    while(performance.now() - start < 2380){
      lightCard(available[cursor % available.length]);
      cursor += 1;
      await setupWait(85);
    }

    // A short easing-out finish gives the class time to anticipate the landing.
    for(const delay of [115,145,185,220]){
      lightCard(available[cursor % available.length]);
      cursor += 1;
      await setupWait(delay);
    }

    lightCard(targetIndex);
    await setupWait(320);

    if(activeIndex !== null && cards[activeIndex]) cards[activeIndex].classList.remove("is-draw-scan");
    cardsContainer.classList.remove("is-drawing");

    setupDrawAnimating = false;
    const committed = setupDraw(targetIndex);
    if(!committed){
      renderGame();
      return;
    }

    // Re-render the committed state, then give the winning card one final gold flare.
    renderGame();
    const freshCards = [...document.querySelectorAll("#setupCards .setup-card")];
    const winnerCard = freshCards[targetIndex];
    const freshContainer = document.getElementById("setupCards");
    if(winnerCard && freshContainer){
      freshContainer.classList.add("winner-reveal");
      winnerCard.classList.add("draw-winner");
      window.setTimeout(() => {
        winnerCard.classList.remove("draw-winner");
        freshContainer.classList.remove("winner-reveal");
      }, 1100);
    }
  } catch(error){
    setupDrawAnimating = false;
    cardsContainer.classList.remove("is-drawing");
    cards.forEach(card => card.classList.remove("is-draw-scan"));
    renderGame();
    const actionError = document.getElementById("actionError");
    if(actionError) actionError.textContent = error.message;
  }
}

// Intercept real classroom clicks before ui.js's normal instant draw handler.
// Synthetic clicks used by the smoke tests still take the original fast path.
if(typeof document !== "undefined"){
  const drawButton = document.getElementById("setupDrawBtn");
  if(drawButton && !drawButton.dataset.rouletteBound){
    drawButton.dataset.rouletteBound = "true";
    drawButton.addEventListener("click", event => {
      if(!event.isTrusted) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      animateIdentityDraw();
    }, true);
  }
}

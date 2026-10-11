"use strict";

(function(){
  function loadShockStyles(){
    if(!document.querySelector('link[href="css/shock-v6.css"]')){
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "css/shock-v6.css";
      document.head.appendChild(link);
    }
    if(!document.querySelector('link[href="css/industrial-v7.css"]')){
      const industrial = document.createElement("link");
      industrial.rel = "stylesheet";
      industrial.href = "css/industrial-v7.css";
      document.head.appendChild(industrial);
    }
  }

  function graphicFor(title){
    if(title === "INDUSTRIAL REVOLUTION") return ["🚂","⚙️"];
    if(title === "JET AGE") return ["✈️","🌍"];
    if(title === "DIGITAL TRANSFORMATION") return ["💻","📱"];
    return ["⚡"];
  }

  function ensureShockGraphic(){
    const title = document.getElementById("industrialShockTitle");
    if(!title) return null;
    let graphic = document.getElementById("shockGraphic");
    if(!graphic){
      graphic = document.createElement("div");
      graphic.id = "shockGraphic";
      graphic.className = "shock-graphic";
      graphic.setAttribute("aria-hidden","true");
      title.insertAdjacentElement("beforebegin",graphic);
    }
    return graphic;
  }

  function ensureShockBack(){
    const screen = document.getElementById("industrialShockScreen");
    if(!screen) return null;
    let button = document.getElementById("shockBackBtn");
    if(!button){
      button = document.createElement("button");
      button.id = "shockBackBtn";
      button.type = "button";
      button.className = "shock-back-btn";
      button.textContent = "← Back";
      button.setAttribute("aria-label","Back to previous game screen");
      screen.appendChild(button);
    }
    return button;
  }

  function returnFromShock(){
    if(gameState.phase === "industrialShockRevealed"){
      gameState.phase = "starting";
      gameState.mode = "monopoly";
      gameState.uiStage = "board";
      gameState.phaseComplete = false;
      gameState.board.status = "ready";
      gameState.board.pendingLanding = null;
      gameState.board.stepsRemaining = 0;
      gameState.board.lastRoll = null;
      gameState.board.history = [];
      gameState.message = "Ready to roll.";
    } else if(gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "jetShock"){
      gameState.uiStage = "pause";
      gameState.phaseComplete = true;
      gameState.message = "Industrial portfolios remain locked. Trigger the Jet Age when ready.";
    } else if(gameState.mode === "strategy" && gameState.phase === "jet" && gameState.uiStage === "digitalShock"){
      gameState.uiStage = "pause";
      gameState.phaseComplete = true;
      gameState.message = "Jet Age values remain locked. Trigger Digital Transformation when ready.";
    } else return;

    if(typeof saveGameState === "function") saveGameState();
    if(typeof renderGame === "function") renderGame();
  }

  function applyShockPresentation(title){
    const screen = document.getElementById("industrialShockScreen");
    const titleEl = document.getElementById("industrialShockTitle");
    const button = document.getElementById("applyIndustrialBtn");
    const kicker = screen?.querySelector(".shock-kicker");
    const subtitle = screen?.querySelector("p:not(.shock-kicker):not(#shockError)");
    const graphic = ensureShockGraphic();
    const back = ensureShockBack();
    if(!screen || !titleEl || !button) return;

    if(kicker) kicker.textContent = "⚡ TECH SHOCK!";
    titleEl.textContent = title;
    button.textContent = "CONTINUE";
    if(subtitle){
      subtitle.classList.add("shock-copy");
      subtitle.hidden = true;
      subtitle.textContent = "";
    }
    if(graphic){
      graphic.innerHTML = graphicFor(title).map(icon => `<span>${icon}</span>`).join("");
    }
    if(back && !back.dataset.shockBackBound){
      back.dataset.shockBackBound = "true";
      back.addEventListener("click", returnFromShock);
    }
    screen.dataset.shock = title.toLowerCase().replace(/\s+/g,"-");
  }

  function init(){
    if(document.documentElement.dataset.shockPolishV6 === "true") return true;
    if(typeof configureShockScreen !== "function" || typeof industrialShockScreen === "undefined") return false;

    document.documentElement.dataset.shockPolishV6 = "true";
    loadShockStyles();

    configureShockScreen = function(title){
      applyShockPresentation(title);
    };

    if(gameState.phase === "industrialShockRevealed"){
      applyShockPresentation("INDUSTRIAL REVOLUTION");
    } else if(gameState.mode === "strategy" && gameState.phase === "steam" && gameState.uiStage === "jetShock"){
      applyShockPresentation("JET AGE");
    } else if(gameState.mode === "strategy" && gameState.phase === "jet" && gameState.uiStage === "digitalShock"){
      applyShockPresentation("DIGITAL TRANSFORMATION");
    }

    return true;
  }

  if(!init()){
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if(init() || attempts > 100) window.clearInterval(timer);
    },50);
  }
})();

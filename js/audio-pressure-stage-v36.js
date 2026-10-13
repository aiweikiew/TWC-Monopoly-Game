"use strict";

// v36: move the Digital-era consequence cue to the actual "Downside of growth" reveal.
(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.audioPressureStageV36 === "true") return;
  document.documentElement.dataset.audioPressureStageV36 = "true";

  let restoreTimer = null;

  function soundOn(){
    return Boolean(window.GameAudio && window.GameAudio.enabled !== false);
  }

  function muteBriefly(){
    if(!window.GameAudio || typeof window.GameAudio.setEnabled !== "function" || !window.GameAudio.enabled) return;
    window.GameAudio.setEnabled(false);
    if(restoreTimer) window.clearTimeout(restoreTimer);
    restoreTimer = window.setTimeout(()=>{
      try{ window.GameAudio.setEnabled(true); }catch(_error){}
      restoreTimer = null;
    },60);
  }

  // The old audio layers key off uiStage="event", so they fire on the first
  // Digital Boom page. Suppress that one transition: the actual dramatic cue
  // belongs on the subsequent pressure/downside reveal instead.
  window.addEventListener("click",event=>{
    const button = event.target.closest?.("button");
    if(!button) return;

    const isBoomLock = gameState?.phase === "digital" &&
      gameState?.uiStage === "review" &&
      button.matches('[data-flow-action="lock"]') &&
      /DIGITAL BOOM|FIT BOOM/i.test(button.textContent || "");

    if(isBoomLock){
      muteBriefly();
      return;
    }

    if(button.id === "v19RevealPressureBtn"){
      const wasOn = soundOn();
      window.setTimeout(()=>{
        const pressureVisible = gameState?.phase === "digital" &&
          gameState?.uiStage === "event" &&
          gameState?.events?.digitalBoomV19?.stage === "pressure";
        if(pressureVisible && wasOn && window.GameAudio?.enabled !== false){
          window.GameAudio.play("fitBoom");
        }
      },0);
    }
  },true);
})();

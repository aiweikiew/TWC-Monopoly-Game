"use strict";

// Companion hook for streamlined screens that commit a strategy immediately
// instead of opening the shared confirmation screen.
(function(){
  if(typeof document === "undefined") return;
  if(document.documentElement.dataset.gameAudioDirectV30 === "true") return;
  document.documentElement.dataset.gameAudioDirectV30 = "true";

  window.addEventListener("click",event=>{
    const button = event.target.closest?.('button[data-action="strategy"]');
    if(!button || button.disabled || !window.GameAudio) return;
    const beforeCount = Object.keys(gameState?.decisions || {}).length;
    const selection = button.dataset.selection;
    window.setTimeout(()=>{
      const afterCount = Object.keys(gameState?.decisions || {}).length;
      if(afterCount > beforeCount){
        window.GameAudio.play(selection === "regenerative" ? "regenerative" : "agentic");
      }
    },0);
  },true);
})();

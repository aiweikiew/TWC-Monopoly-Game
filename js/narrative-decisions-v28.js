"use strict";

// v28: labels the decision rounds as business adaptation, after each Tech Shock.
(function(){
  function loadExtraStyles(){
    if(document.querySelector('link[href="css/narrative-cycle-v27-extra.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/narrative-cycle-v27-extra.css";
    document.head.appendChild(link);
  }

  function adaptSteam(html){
    if(typeof html !== "string") return html;
    html = html.replace("TEAM DECISION · INDUSTRIAL REVOLUTION","ADAPTATION · INDUSTRIAL RESPONSE");
    const bar = '<div class="narrative-cause-link"><strong>MARKET REVALUED</strong><span>→</span><strong>NEW BUSINESS MODELS</strong><span>→</span><strong>ADAPT / INVEST / SELL / HOLD</strong></div>';
    if(html.includes('<section class="industrial-step invest-step')){
      html = html.replace('<section class="industrial-step invest-step',`${bar}<section class="industrial-step invest-step`);
    }
    return html;
  }

  function adaptDigital(html){
    if(typeof html !== "string") return html;
    html = html.replace("TEAM DECISION · DIGITAL TRANSFORMATION","ADAPTATION · DIGITAL RESPONSE");
    html = html.replace("Invest in a digital-native business, digitise an existing tourism business, or hold.","Traveller autonomy has shifted market value. Invest, digitise or hold to decide how your business responds.");
    const bar = '<div class="narrative-cause-link"><strong>TRAVELLER AUTONOMY</strong><span>→</span><strong>MARKET VALUE SHIFTS</strong><span>→</span><strong>BUSINESS ADAPTS</strong></div>';
    if(html.includes('<div class="strategy-quest">QUEST · BECOME DIGITALLY READY</div>')){
      html = html.replace('<div class="strategy-quest">QUEST · BECOME DIGITALLY READY</div>',`<div class="strategy-quest">QUEST · BECOME DIGITALLY READY</div>${bar}`);
    }
    return html;
  }

  function init(){
    if(document.documentElement.dataset.narrativeDecisionsV28 === "true") return true;
    if(typeof renderActions !== "function") return false;
    document.documentElement.dataset.narrativeDecisionsV28 = "true";
    loadExtraStyles();

    const previousActions = renderActions;
    renderActions = function(){
      const html = previousActions();
      if(gameState?.phase === "steam") return adaptSteam(html);
      if(gameState?.phase === "digital") return adaptDigital(html);
      return html;
    };

    if(typeof renderDecisionReview === "function"){
      const previousReview = renderDecisionReview;
      renderDecisionReview = function(){
        let html = previousReview();
        if(gameState?.phase === "steam") html = html.replace("FINAL CHECK","ADAPTATION CHECK");
        if(gameState?.phase === "digital") html = html.replace("FINAL CHECK · DIGITAL TRANSFORMATION","ADAPTATION CHECK · DIGITAL TRANSFORMATION").replace("FINAL CHECK","ADAPTATION CHECK");
        return html;
      };
    }

    if(typeof renderGame === "function") renderGame();
    return true;
  }

  if(!init()){
    let attempts = 0;
    const timer = window.setInterval(()=>{
      attempts += 1;
      if(init() || attempts > 160) window.clearInterval(timer);
    },50);
  }
})();

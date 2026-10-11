"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/digital-builder-polish-v20.css"]')) return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="css/digital-builder-polish-v20.css";
    document.head.appendChild(link);
  }

  function polishBuilder(){
    const builder=document.querySelector(".v19-builder");
    if(!builder) return;

    const intro=builder.querySelector(".v19-builder-head p");
    if(intro){
      intro.textContent="Restructure your portfolio for the Digital era. You may sell, digitise, or invest based on your strategy and available cash.";
    }

    const sections=builder.querySelectorAll(".v19-builder-section");
    if(sections[0]) sections[0].classList.add("v20-sell-zone");
    if(sections[1]) sections[1].classList.add("v20-digitise-zone");
    if(sections[2]) sections[2].classList.add("v20-buy-zone");

    const summaryMoney=builder.querySelectorAll(".v19-builder-summary .money");
    if(summaryMoney[0]){
      const label=summaryMoney[0].querySelector("span");
      if(label) label.textContent="CASH LEFT";
      let note=summaryMoney[0].querySelector("small");
      if(!note){ note=document.createElement("small"); summaryMoney[0].appendChild(note); }
      note.textContent="Spendable cash after your selected changes";
    }
    if(summaryMoney[1]){
      const label=summaryMoney[1].querySelector("span");
      if(label) label.textContent="TOTAL PORTFOLIO VALUE";
      const note=summaryMoney[1].querySelector("small");
      if(note){
        const ready=/YES/i.test(note.textContent||"") ? "YES" : "NO";
        note.textContent=`Cash + remaining business value · Digital Ready ${ready}`;
      }
    }
  }

  function init(){
    if(document.documentElement.dataset.digitalBuilderPolishV20==="true") return;
    document.documentElement.dataset.digitalBuilderPolishV20="true";
    loadStyles();
    polishBuilder();
    const observer=new MutationObserver(()=>polishBuilder());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

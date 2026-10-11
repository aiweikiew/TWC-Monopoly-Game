"use strict";

(function(){
  const INTRO_COPY = "Restructure your portfolio for the Digital era. You may sell, digitise, or invest based on your strategy and available cash.";

  function ensureStylesheet(href){
    if(document.querySelector(`link[href="${href}"]`)) return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=href;
    document.head.appendChild(link);
  }

  function loadStyles(){
    ensureStylesheet("css/digital-builder-polish-v20.css");
    ensureStylesheet("css/digital-pressure-polish-v21.css");
  }

  function setTextIfChanged(node,text){
    if(node && node.textContent !== text) node.textContent = text;
  }

  function polishBuilder(){
    const builder=document.querySelector(".v19-builder");
    if(!builder) return;

    const intro=builder.querySelector(".v19-builder-head p");
    setTextIfChanged(intro,INTRO_COPY);

    const sections=builder.querySelectorAll(".v19-builder-section");
    if(sections[0] && !sections[0].classList.contains("v20-sell-zone")) sections[0].classList.add("v20-sell-zone");
    if(sections[1] && !sections[1].classList.contains("v20-digitise-zone")) sections[1].classList.add("v20-digitise-zone");
    if(sections[2] && !sections[2].classList.contains("v20-buy-zone")) sections[2].classList.add("v20-buy-zone");

    const summaryMoney=builder.querySelectorAll(".v19-builder-summary .money");
    if(summaryMoney[0]){
      setTextIfChanged(summaryMoney[0].querySelector("span"),"CASH LEFT");
      let note=summaryMoney[0].querySelector("small");
      if(!note){
        note=document.createElement("small");
        note.textContent="Spendable cash after your selected changes";
        summaryMoney[0].appendChild(note);
      }else{
        setTextIfChanged(note,"Spendable cash after your selected changes");
      }
    }

    if(summaryMoney[1]){
      setTextIfChanged(summaryMoney[1].querySelector("span"),"TOTAL PORTFOLIO VALUE");
      const note=summaryMoney[1].querySelector("small");
      if(note){
        const ready=/YES/i.test(note.textContent||"") ? "YES" : "NO";
        setTextIfChanged(note,`Cash + remaining business value · Digital Ready ${ready}`);
      }
    }
  }

  function init(){
    if(document.documentElement.dataset.digitalBuilderPolishV20==="true") return;
    document.documentElement.dataset.digitalBuilderPolishV20="true";
    loadStyles();
    polishBuilder();

    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      window.requestAnimationFrame(()=>{
        queued=false;
        polishBuilder();
      });
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

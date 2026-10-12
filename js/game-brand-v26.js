"use strict";

(function(){
  const BRAND = "Time to Travel";
  const BRAND_UPPER = "TIME TO TRAVEL";
  const oldBrand = /tourismopoly/gi;

  function replaceTextNode(node){
    if(!node || node.nodeType !== Node.TEXT_NODE || !oldBrand.test(node.nodeValue || "")) return;
    oldBrand.lastIndex = 0;
    node.nodeValue = node.nodeValue.replace(oldBrand, match => match === match.toUpperCase() ? BRAND_UPPER : BRAND);
  }

  function replaceIn(root){
    if(!root) return;
    if(root.nodeType === Node.TEXT_NODE){
      replaceTextNode(root);
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while((node = walker.nextNode())) replaceTextNode(node);
  }

  function applyBrand(){
    document.title = BRAND;
    replaceIn(document.body);
  }

  applyBrand();

  const observer = new MutationObserver(records => {
    for(const record of records){
      for(const node of record.addedNodes) replaceIn(node);
    }
    if(document.title !== BRAND) document.title = BRAND;
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();

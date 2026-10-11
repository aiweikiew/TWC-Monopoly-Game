"use strict";

(function(){
  const href="css/presentation-type-v23.css";
  if(document.querySelector(`link[href="${href}"]`)) return;
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=href;
  document.head.appendChild(link);
})();

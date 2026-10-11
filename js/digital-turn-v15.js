"use strict";

// v15 is kept as the stable bootstrap path used by strategy-layout-v14.
// The Digital era itself now lives in the free-form v19 portfolio system.
(function(){
  if(typeof document === "undefined") return;
  const queue = [
    "js/digital-freeform-v19.js",
    "js/digital-v19-compat.js",
    "js/digital-builder-polish-v20.js",
    "js/future-streamline-v22.js",
    "js/winner-podium-v22.js",
    "js/presentation-type-v23.js"
  ];
  for(const src of queue){
    if(document.querySelector(`script[src="${src}"]`)) continue;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  }
})();

"use strict";

// v15 is kept as the stable bootstrap path used by strategy-layout-v14.
// The Digital era itself now lives in the free-form v19 portfolio system.
(function(){
  if(typeof document === "undefined") return;
  if(document.querySelector('script[src="js/digital-freeform-v19.js"]')) return;
  const script = document.createElement("script");
  script.src = "js/digital-freeform-v19.js";
  script.async = false;
  document.head.appendChild(script);
})();

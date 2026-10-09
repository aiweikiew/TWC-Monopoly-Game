"use strict";

// Board definitions and Situation Cards reused from legacy/js/data.js.
const faces = ["⚀","⚁","⚂","⚃","⚄","⚅"];

const tileNames = [
  "Begin Your Grand Tour",
  "Horse & Carriage",
  "Chance",
  "Inn & Accommodation",
  "Business Opportunity",
  "Passenger Shipping",
  "Chance",
  "Travel Guide & Information"
];

const boardProperties = {
  1:{name:"Horse & Carriage",icon:"🐎",desc:"Established overland transport",price:3,sector:"road"},
  3:{name:"Inn & Accommodation",icon:"🏨",desc:"Lodging along major routes",price:3,sector:"accommodation"},
  5:{name:"Passenger Shipping",icon:"🚢",desc:"Sea routes & passenger movement",price:4,sector:"shipping"},
  7:{name:"Travel Guide & Information",icon:"🗺️",desc:"Maps, guides & printed knowledge",price:2,sector:"information"}
};

const chanceCards = [
  {
    title:"Heavy Rain Damages Major Roads",
    story:"Poor road conditions disrupt overland journeys and delay coaches across the region.",
    sectorEffects:{
      road:{value:-1,reason:"Road damage slows coach travel and reduces demand."},
      accommodation:{value:1,reason:"Delayed travellers need to stay overnight, increasing lodging demand."}
    },
    neutralReason:"No change to your business."
  },
  {
    title:"Storm Disrupts Sea Travel",
    story:"Rough weather delays departures and interrupts passenger shipping at the ports.",
    sectorEffects:{
      shipping:{value:-1,reason:"Rough seas delay passenger journeys and reduce shipping activity."},
      accommodation:{value:1,reason:"Stranded travellers need extra nights of accommodation."}
    },
    neutralReason:"No change to your business."
  },
  {
    title:"Major Festival Attracts Visitors",
    story:"A popular festival draws extra visitors and raises demand for travel-related services.",
    sectorEffects:{
      road:{value:1,reason:"More visitors need transport to and around the destination."},
      accommodation:{value:1,reason:"More visitors increase demand for places to stay."},
      shipping:{value:1,reason:"Visitors arriving by sea increase passenger traffic."},
      information:{value:1,reason:"More travellers need maps, guides and local information."}
    },
    neutralReason:"No change to your business."
  },
  {
    title:"Improved Roads Speed Up Travel",
    story:"Road improvements make overland travel faster and easier across major routes.",
    sectorEffects:{
      road:{value:1,reason:"Better roads make coach travel faster and more attractive."},
      accommodation:{value:-1,reason:"Faster journeys reduce the need for overnight stops."},
      shipping:{value:-1,reason:"Some travellers switch from sea routes to improved land routes."}
    },
    neutralReason:"No change to your business."
  },
  {
    title:"Port Expansion Boosts Passenger Traffic",
    story:"Expanded port capacity allows more travellers to arrive and depart by sea.",
    sectorEffects:{
      shipping:{value:1,reason:"Greater port capacity brings more passenger traffic by sea."},
      information:{value:1,reason:"More arrivals increase demand for maps and travel guidance."}
    },
    neutralReason:"No change to your business."
  },
  {
    title:"Travel Information Becomes Outdated",
    story:"Route details and printed travel information are no longer fully accurate.",
    sectorEffects:{
      information:{value:-1,reason:"Outdated routes and details make your guides less useful to travellers."}
    },
    neutralReason:"No change to your business."
  }
];

const sectorLabels = {
  road:"Horse Transport",
  accommodation:"Accommodation",
  shipping:"Passenger Shipping",
  information:"Travel Information",
  none:"No clear tourism sector"
};

const boardAssetTypes = {1:"horse",3:"inn",5:"shipping",7:"guide"};
const legacySectors = {legacyCoach:"road",legacyInn:"accommodation",legacyShipping:"shipping",legacyPublishing:"information"};

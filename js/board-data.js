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
    story:"Heavy rain damages key roads and delays overland travel.",
    sectorEffects:{
      road:{value:-1,reason:"Poor road conditions delay {business} and reduce passenger activity."},
      accommodation:{value:1,reason:"Delayed travellers need somewhere to stay, increasing demand for {business}."}
    },
    groupPositive:"Delayed journeys increase demand for {businesses}.",
    groupNegative:"Road disruption reduces activity for {businesses}.",
    neutralReason:"None of your current businesses are directly affected."
  },
  {
    title:"Storm Disrupts Sea Travel",
    story:"Rough weather delays departures and disrupts passenger travel by sea.",
    sectorEffects:{
      shipping:{value:-1,reason:"Rough seas disrupt {business} and reduce passenger traffic."},
      accommodation:{value:1,reason:"Stranded travellers stay longer, increasing demand for {business}."}
    },
    groupPositive:"Stranded travellers increase demand for {businesses}.",
    groupNegative:"Sea disruption reduces activity for {businesses}.",
    neutralReason:"None of your current businesses are directly affected."
  },
  {
    title:"Major Festival Attracts Visitors",
    story:"A major festival draws more visitors into the region.",
    sectorEffects:{
      road:{value:1,reason:"More visitors need transport, increasing demand for {business}."},
      accommodation:{value:1,reason:"More visitors need places to stay, increasing demand for {business}."},
      shipping:{value:1,reason:"More visitors arrive by sea, boosting {business}."},
      information:{value:1,reason:"More travellers need maps and guidance, increasing demand for {business}."}
    },
    groupPositive:"The visitor surge increases demand across {businesses}.",
    neutralReason:"None of your current businesses are directly affected."
  },
  {
    title:"Improved Roads Speed Up Travel",
    story:"Better roads make journeys faster and easier.",
    sectorEffects:{
      road:{value:1,reason:"Improved roads make {business} faster and more attractive."},
      accommodation:{value:-1,reason:"Faster journeys reduce overnight stops, lowering demand for {business}."},
      shipping:{value:-1,reason:"Some travellers switch to improved land routes, reducing demand for {business}."}
    },
    groupPositive:"Better roads increase demand for {businesses}.",
    groupNegative:"Faster land travel reduces demand for {businesses}.",
    neutralReason:"None of your current businesses are directly affected."
  },
  {
    title:"Port Expansion Boosts Passenger Traffic",
    story:"Expanded port capacity brings more travellers through the region.",
    sectorEffects:{
      shipping:{value:1,reason:"More passengers travel by sea, boosting {business}."},
      information:{value:1,reason:"More arrivals need maps and guidance, increasing demand for {business}."}
    },
    groupPositive:"The increase in arrivals boosts {businesses}.",
    neutralReason:"None of your current businesses are directly affected."
  },
  {
    title:"Travel Information Becomes Outdated",
    story:"Route details and printed travel information are no longer accurate.",
    sectorEffects:{
      information:{value:-1,reason:"Travellers can no longer rely on {business}, reducing its usefulness."}
    },
    groupNegative:"Outdated information reduces demand for {businesses}.",
    neutralReason:"None of your current businesses are directly affected."
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

"use strict";

// Identity only determines starting cash and the legacy asset.
const identityPool = [
  {key:"aristocrat",icon:"🎩",name:"Aristocratic Household",cash:9,legacyType:"estate",desc:"Highest liquidity; the estate is not a tourism business."},
  {key:"merchant",icon:"🚢",name:"Merchant House",cash:6,legacyType:"legacyShipping",desc:"Starts with an established shipping business."},
  {key:"stagecoach",icon:"🐎",name:"Stagecoach Operator",cash:5,legacyType:"legacyCoach",desc:"Starts with an established overland transport business."},
  {key:"innkeeper",icon:"🏨",name:"Coaching Inn Proprietor",cash:5,legacyType:"legacyInn",desc:"Starts with a lodging business serving travellers."},
  {key:"mapmaker",icon:"🗺️",name:"Mapmaker & Printer",cash:7,legacyType:"legacyPublishing",desc:"Starts with a travel-information publishing business."}
];
const setupTeams = ["Team A", "Team B", "Team C"];
const assetTypes = {
  estate: {name:"Estate",price:1,era:"legacy",tourism:false},
  legacyShipping: {name:"Legacy Shipping Business",price:4,era:"legacy"},
  legacyCoach: {name:"Legacy Coach Business",price:5,era:"legacy"},
  legacyInn: {name:"Legacy Inn Business",price:5,era:"legacy"},
  legacyPublishing: {name:"Legacy Publishing Business",price:3,era:"legacy"},
  horse: {name:"Horse & Carriage",price:3,era:"preIndustrial"},
  inn: {name:"Inn & Accommodation",price:3,era:"preIndustrial"},
  shipping: {name:"Passenger Shipping",price:4,era:"preIndustrial"},
  guide: {name:"Travel Guide & Information",price:2,era:"preIndustrial"},
  rail: {name:"Railway Travel",price:4,era:"steam"},
  tour: {name:"Organised Tour Operator",price:3,era:"steam"},
  hotel: {name:"Railway-Era Hotel",price:4,era:"steam"},
  steamShipping: {name:"Steam Passenger Shipping",price:4,era:"steam"},
  transfer: {name:"Station Transfer Service",era:"steam"},
  guidebook: {name:"Guidebook & Travel Publishing",era:"steam"},
  ota: {name:"Online Travel Agency",price:5,era:"digital",digital:true},
  booking: {name:"Digital Booking Platform",price:4,era:"digital",digital:true},
  marketplace: {name:"Travel Marketplace",price:4,era:"digital",digital:true}
};
const markets = {
  starting:["horse","inn","shipping","guide"],
  steam:["rail","tour","hotel","steamShipping"],
  digital:["ota","booking","marketplace"]
};
const revaluations = {
  steam:{estate:1,legacyShipping:6,legacyCoach:2,legacyInn:6,legacyPublishing:4,horse:1,inn:4,shipping:6,guide:3},
  // Jet Age rewards businesses that adapted during Industrialisation and erodes unchanged Grand Tour forms.
  // Rail/transfer remain useful; organised tours win most; hotels gain modestly; old coach/inn/info formats lose relevance; shipping declines.
  jet:{
    rail:4,tour:6,hotel:5,transfer:4,guidebook:4,
    steamShipping:3,shipping:3,legacyShipping:3,
    legacyCoach:0,horse:0,legacyInn:3,inn:2,legacyPublishing:2,guide:1
  },
  // Digital Transformation primarily disrupts information and intermediation rather than physical tourism infrastructure.
  // Traditional tour packaging loses some value as travellers self-search/book; print information loses more sharply.
  // Rail, transfer, hotels and shipping keep their Jet-era values here; teams can then sell/reallocate or digitise during the Digital turn.
  digital:{tour:4,legacyPublishing:1,guide:0,guidebook:2}
};
const adaptations = {
  legacyCoach:"transfer",horse:"transfer",legacyInn:"hotel",inn:"hotel",
  legacyShipping:"steamShipping",shipping:"steamShipping",legacyPublishing:"guidebook",guide:"guidebook"
};
const futureStrategies = {
  agenticAI:{name:"Agentic AI",cash:2,visitorExperience:2,residentWellbeing:0,environmentalHealth:0,purpose:"Strong traveller-level adaptation and friction reduction"},
  regenerative:{name:"Regenerative Tourism",cash:1,visitorExperience:1,residentWellbeing:2,environmentalHealth:2,purpose:"Better destination and community outcomes"}
};
const phaseOrder = ["starting","steam","jet","digital","future","winner"];
const phaseInfo = {
  industrialShockRevealed:{title:"INDUSTRIAL REVOLUTION",returnTo:"Industrial Revolution"},
  starting:{title:"GRAND TOUR / PRE-INDUSTRIAL ERA",slides:"After slides 1–4",complete:"PORTFOLIOS LOCKED",returnTo:"Industrial Revolution",next:"Start Industrial Revolution"},
  steam:{title:"INDUSTRIAL REVOLUTION",slides:"After slides 5–6",complete:"INDUSTRIAL PORTFOLIOS LOCKED",returnTo:"Automobiles & Jet Age",next:"Start Jet Age"},
  jet:{title:"JET AGE",slides:"After slides 7–10",complete:"PAST ERA COMPLETE",returnTo:"Digital Transformation",next:"Start Digital Transformation"},
  digital:{title:"DIGITAL TRANSFORMATION",slides:"After slides 11–12",complete:"PRESENT ERA COMPLETE",returnTo:"The Future",next:"Start 2035 Crisis"},
  future:{title:"2035 TOURISM CRISIS",slides:"After slides 13–15",complete:"FUTURE ERA COMPLETE",returnTo:"Tourism Timeline Recap",next:"Show Money Winner"},
  winner:{title:"TOURISMOPOLY WINNER",slides:"After slide 16",returnTo:"But Did You Actually Win?"}
};

// Compatibility repair for saved classroom/test sessions created before the realistic Jet values.
// It also rebuilds the Jet log so Back/recovery screens show the correct red/green deltas.
function repairLegacyJetRevaluation(){
  if(typeof gameState === "undefined" || gameState.mode !== "strategy" ||
     gameState.phase !== "jet" || gameState.uiStage !== "revaluation" || !Array.isArray(gameState.teams)) return false;

  const beforeJet = {
    rail:4,tour:3,hotel:4,transfer:4,guidebook:4,
    steamShipping:6,shipping:6,legacyShipping:6,
    legacyCoach:2,horse:1,legacyInn:6,inn:4,legacyPublishing:4,guide:3
  };
  const rows = [];
  let changed = false;

  for(const team of gameState.teams){
    for(const asset of team.assets || []){
      if(!Object.hasOwn(revaluations.jet,asset.type)) continue;
      const oldValue = Object.hasOwn(beforeJet,asset.type) ? beforeJet[asset.type] : asset.currentValue;
      const newValue = revaluations.jet[asset.type];
      if(asset.currentValue !== newValue) changed = true;
      asset.currentValue = newValue;
      rows.push({team:team.name,name:asset.name,oldValue,newValue});
    }
  }

  const oldLog = Array.isArray(gameState.revaluationLog) ? gameState.revaluationLog : [];
  if(oldLog.length !== rows.length || oldLog.some((row,index) =>
    !rows[index] || row.team !== rows[index].team || row.name !== rows[index].name ||
    row.oldValue !== rows[index].oldValue || row.newValue !== rows[index].newValue)) changed = true;

  if(!changed) return false;
  gameState.revaluationLog = rows;
  if(typeof saveGameState === "function") saveGameState();
  return true;
}

// Compatibility repair for Digital saves made with the earlier, less realistic table.
// Safe for revaluation and decision screens; digital-native investments are never touched.
function repairLegacyDigitalRevaluation(){
  if(typeof gameState === "undefined" || gameState.mode !== "strategy" ||
     gameState.phase !== "digital" || !Array.isArray(gameState.teams)) return false;
  if(!["revaluation","decisions","review","event","results","pause"].includes(gameState.uiStage)) return false;

  const beforeDigital = {tour:6,legacyPublishing:2,guide:1,guidebook:4};
  const rows = [];
  let changed = false;

  for(const team of gameState.teams){
    for(const asset of team.assets || []){
      if(!Object.hasOwn(revaluations.digital,asset.type)) continue;
      const oldValue = beforeDigital[asset.type];
      const newValue = revaluations.digital[asset.type];
      if(asset.currentValue !== newValue) changed = true;
      asset.currentValue = newValue;
      rows.push({team:team.name,name:asset.name,oldValue,newValue});
    }
  }

  // If the new two-step Digital turn already sold an information asset under the old table,
  // correct the released cash so the saved test run remains economically consistent.
  const saleCorrections = {
    "Legacy Publishing Business":1,
    "Travel Guide & Information":2
  };
  for(const team of gameState.teams){
    const decision = gameState.decisions?.[team.id] || "";
    for(const [name,correction] of Object.entries(saleCorrections)){
      if(decision.includes(`SELL: ${name}`) && !decision.includes("[DIGITAL VALUE REPAIRED]")){
        team.cash -= correction;
        gameState.decisions[team.id] = `${decision} [DIGITAL VALUE REPAIRED]`;
        changed = true;
        break;
      }
    }
  }

  if(gameState.uiStage === "revaluation"){
    const oldLog = Array.isArray(gameState.revaluationLog) ? gameState.revaluationLog : [];
    if(oldLog.length !== rows.length || oldLog.some((row,index) =>
      !rows[index] || row.team !== rows[index].team || row.name !== rows[index].name ||
      row.oldValue !== rows[index].oldValue || row.newValue !== rows[index].newValue)) changed = true;
    gameState.revaluationLog = rows;
  }

  if(!changed) return false;
  if(typeof saveGameState === "function") saveGameState();
  return true;
}

if(typeof document !== "undefined"){
  const repairAndRender = () => {
    const repairedJet = repairLegacyJetRevaluation();
    const repairedDigital = repairLegacyDigitalRevaluation();
    if((repairedJet || repairedDigital) && typeof renderGame === "function") renderGame();
  };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",() => window.setTimeout(repairAndRender,0),{once:true});
  else window.setTimeout(repairAndRender,0);
  document.addEventListener("click",() => window.setTimeout(repairAndRender,0),true);
}

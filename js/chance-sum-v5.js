"use strict";

(function(){
  function initChanceSumV5(){
    if(document.documentElement.dataset.chanceSumV5 === "true") return true;
    if(typeof evaluateChanceCard !== "function" || typeof getTeamTourismHoldings !== "function" || typeof formatBusinessList !== "function") return false;

    document.documentElement.dataset.chanceSumV5 = "true";

    evaluateChanceCard = function(teamIndex, card){
      const holdings = getTeamTourismHoldings(teamIndex);
      const matched = [];

      for(const holding of holdings){
        const effect = card.sectorEffects[holding.sector];
        if(effect){
          matched.push({
            sector:holding.sector,
            business:holding.business,
            value:effect.value,
            reason:effect.reason
          });
        }
      }

      if(matched.length === 0){
        return {
          effect:0,
          impactTitle:"No Direct Exposure",
          impactBusinesses:[],
          reason:card.neutralReason || "None of your current businesses are directly affected."
        };
      }

      const positive = matched.filter(item => item.value > 0);
      const negative = matched.filter(item => item.value < 0);
      const rawTotal = matched.reduce((sum,item) => sum + item.value,0);
      const finalEffect = rawTotal > 0 ? 1 : rawTotal < 0 ? -1 : 0;

      if(positive.length && negative.length){
        const positiveNames = [...new Set(positive.map(item => item.business))];
        const negativeNames = [...new Set(negative.map(item => item.business))];
        const positiveText = formatBusinessList(positiveNames);
        const negativeText = formatBusinessList(negativeNames);
        const outcome = finalEffect > 0
          ? "Overall, the gains outweigh the losses."
          : finalEffect < 0
            ? "Overall, the losses outweigh the gains."
            : "The effects cancel out.";

        return {
          effect:finalEffect,
          impactTitle:"Mixed Impact",
          impactBusinesses:[...new Set(matched.map(item => item.business))],
          reason:`${positiveText} ${positiveNames.length === 1 ? "benefits" : "benefit"}, while ${negativeText} ${negativeNames.length === 1 ? "is harmed" : "are harmed"}. ${outcome}`
        };
      }

      const affected = positive.length ? positive : negative;
      const affectedNames = [...new Set(affected.map(item => item.business))];
      let reason;

      if(affected.length === 1){
        reason = affected[0].reason.replace("{business}",affected[0].business);
      } else {
        const template = positive.length ? card.groupPositive : card.groupNegative;
        reason = template
          ? template.replace("{businesses}",formatBusinessList(affectedNames))
          : `${formatBusinessList(affectedNames)} ${positive.length ? "benefit" : "are harmed"} from this event.`;
      }

      return {
        effect:finalEffect,
        impactTitle:formatBusinessList(affectedNames),
        impactBusinesses:affectedNames,
        reason
      };
    };

    return true;
  }

  if(!initChanceSumV5()){
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if(initChanceSumV5() || attempts > 100) window.clearInterval(timer);
    },50);
  }
})();

"use strict";

(function(){
  function loadStyles(){
    if(document.querySelector('link[href="css/winner-podium-v22.css"]')) return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="css/winner-podium-v22.css";
    document.head.appendChild(link);
  }

  function moneyRankedTeams(){
    return [...(gameState?.teams || [])].sort((a,b)=>calculateNetWorth(b)-calculateNetWorth(a));
  }

  function rankFor(team,ranked){
    const value=calculateNetWorth(team);
    const higher=[...new Set(ranked.map(t=>calculateNetWorth(t)).filter(v=>v>value))];
    return higher.length+1;
  }

  function medalFor(rank){
    return rank===1?"🥇":rank===2?"🥈":"🥉";
  }

  function rankLabel(team,ranked){
    const rank=rankFor(team,ranked);
    const same=ranked.filter(t=>calculateNetWorth(t)===calculateNetWorth(team)).length;
    if(rank===1 && same>1) return "JOINT 1ST";
    if(rank===1) return "1ST";
    if(rank===2) return "2ND";
    return "3RD";
  }

  function podiumCard(team,ranked,position){
    const rank=rankFor(team,ranked);
    return `<article class="money-podium-entry podium-rank-${rank} podium-position-${position}">
      <div class="podium-medal">${medalFor(rank)}</div>
      <div class="podium-team-icon">${team.identity.icon}</div>
      <strong class="podium-team-name">${escapeHTML(team.name)}</strong>
      <span class="podium-identity">${escapeHTML(team.identity.name)}</span>
      <div class="podium-worth-label">FINAL NET WORTH</div>
      <div class="podium-worth">${money(calculateNetWorth(team))}</div>
      <div class="podium-base"><span>${rankLabel(team,ranked)}</span></div>
    </article>`;
  }

  function renderPodiumWinner(){
    const ranked=moneyRankedTeams();
    if(!ranked.length) return '<section class="flow-screen winner-screen"><h2>No teams available</h2></section>';
    const first=ranked[0], second=ranked[1], third=ranked[2];
    const visual=[second,first,third].filter(Boolean);
    const topWorth=calculateNetWorth(first);
    const topTeams=ranked.filter(team=>calculateNetWorth(team)===topWorth);
    const title=topTeams.length>1 ? "JOINT MONEY WINNERS" : `${first.name} WINS THE MONEY GAME`;
    return `<section class="money-podium-screen">
      <header class="money-podium-header">
        <div class="screen-kicker">TOURISMOPOLY · MONEY RESULT</div>
        <h2>${escapeHTML(title)}</h2>
        <p>Final ranking by calculated Net Worth.</p>
      </header>
      <div class="money-podium-grid">${visual.map((team,index)=>podiumCard(team,ranked,index)).join("")}</div>
      <div class="money-podium-note"><strong>Money game complete.</strong> Highest Net Worth wins — but did you actually win?</div>
      <div class="money-podium-controls">
        <button class="game-btn secondary" id="winnerPodiumBack" type="button">← Back</button>
        <button class="game-btn secondary" id="winnerPodiumReset" type="button">Reset Game</button>
      </div>
    </section>`;
  }

  function install(){
    if(document.documentElement.dataset.winnerPodiumV22==="true") return true;
    if(typeof renderWinner!=="function" || typeof calculateNetWorth!=="function") return false;
    document.documentElement.dataset.winnerPodiumV22="true";
    loadStyles();
    renderWinner=renderPodiumWinner;

    document.addEventListener("click",event=>{
      if(event.target.closest("#winnerPodiumBack")){
        event.preventDefault();
        if(typeof runAndRender==="function") runAndRender(navigateBack);
      } else if(event.target.closest("#winnerPodiumReset")){
        event.preventDefault();
        if(typeof runAndRender==="function") runAndRender(resetGame);
      }
    });
    return true;
  }

  if(!install()){
    let attempts=0;
    const timer=window.setInterval(()=>{
      attempts+=1;
      if(install() || attempts>200) window.clearInterval(timer);
    },50);
  }
})();

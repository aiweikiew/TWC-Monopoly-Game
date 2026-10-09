"use strict";

// Reuse the original draw-without-replacement and undo/reset interaction.
function setupDraw(){
  if(gameState.phase !== "setup" || gameState.setupSelected.length >= 3) return false;
  const used = new Set(gameState.setupSelected.map(s => s.index));
  const available = identityPool.map((_, i) => i).filter(i => !used.has(i));
  const index = available[Math.floor(Math.random() * available.length)];
  gameState.setupSelected.push({index});
  gameState.message = `${setupTeams[gameState.setupSelected.length - 1]} drew ${identityPool[index].name}.`;
  return true;
}
function setupUndo(){
  if(gameState.phase !== "setup" || !gameState.setupSelected.length) return false;
  const removed = gameState.setupSelected.pop();
  gameState.message = `${identityPool[removed.index].name} returned to the pool.`;
  return true;
}
function setupReset(){
  if(gameState.phase !== "setup") return false;
  resetGame();
  return true;
}
function applySetupFromDraw(){
  const selected = gameState.setupSelected;
  if(gameState.phase !== "setup" || selected.length !== 3 ||
     new Set(selected.map(s => s.index)).size !== 3 ||
     selected.some(s => !Number.isInteger(s.index) || !identityPool[s.index])) return false;
  gameState.teams = selected.map((entry, i) => createTeam(entry.index, i));
  gameState.phase = "starting";
  gameState.mode = "monopoly";
  gameState.uiStage = "board";
  gameState.decisions = {};
  gameState.message = "Ready to roll. Teams take turns around the Grand Tour.";
  return true;
}

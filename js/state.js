"use strict";

// Central mutable state. Preserve prototype cash, ownership, setup, and turn semantics.

const gameState = {};

gameState.setupSelected = [];

gameState.setup = fallbackSetup.map(x => ({...x}));

gameState.teamNames = gameState.setup.map(x => x.teamName.toUpperCase());

gameState.positions = [0,0,0];

gameState.cash = gameState.setup.map(x => Number(x.cash) || 0);

gameState.owners = {};

gameState.upgraded = {};

gameState.currentTeam = 0;

gameState.busy = false;

gameState.pendingFee = null;

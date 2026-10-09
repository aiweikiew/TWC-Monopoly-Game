# Tourismopoly

A static HTML/CSS/vanilla JavaScript classroom game for **ACCESS → AUTONOMY → ADAPTATION**. Three teams make portfolio decisions between Canva slide sections. The presenter operates one screen; there is no backend, framework, database, or saved session.

## Run and reset

Open `index.html` in a browser, or serve the folder with `python -m http.server 8000` and open `http://localhost:8000`.

Draw three identities. The third draw opens the starting market immediately. Teams act in A/B/C order, once per decision phase. Each completed block waits for the presenter to return from Canva and explicitly start the next phase. The next-phase button stays disabled until every required decision is resolved.

**Reset Game**, browser refresh, or `resetGame(); renderGame();` in the browser console returns to a clean identity draw. There is no persistence. Undo is available during the first two identity draws; after the third draw, use Reset Game to redraw all identities.

## Presentation sequence

| Slides completed | Game block | Return to presentation |
| --- | --- | --- |
| 1–4 | Starting Economy | Industrial Revolution |
| 5–6 | Industrial Revolution / Steam Shock | Automobiles & Jet Age |
| 7–10 | Jet Age (revaluation only) | Digital Transformation |
| 11–12 | Digital Transformation and FIT Boom | The Future |
| 13–15 | 2035 Tourism Crisis | Tourism Timeline Recap |
| 16 | Money Winner | But Did You Actually Win? (slide 17) |

## State and economic rules

`gameState` owns teams, phase, completion, current decision, draw selections, revaluation history, event guards and destination pressure. Every team owns asset **objects** with a unique instance ID, type, name, era, form, current market value, tourism eligibility and digital status.

`calculateNetWorth(team)` is the only Net Worth calculation: **cash + sum of current asset values**. Net Worth is never stored separately. Purchases and sales exchange cash and assets without changing Net Worth. Adaptation and digitisation costs reduce Net Worth. Multiple teams may own the same investment type; there is no exclusive property ownership.

Identity determines starting cash and legacy asset only. There are no identity bonuses, exclusive actions, discounts or specialisations.

| Identity | Cash | Legacy asset | Asset value |
| --- | ---: | --- | ---: |
| Aristocratic Household | $9 | Estate | $1 |
| Merchant House | $6 | Legacy Shipping Business | $4 |
| Stagecoach Operator | $5 | Legacy Coach Business | $5 |
| Coaching Inn Proprietor | $5 | Legacy Inn Business | $5 |
| Mapmaker & Printer | $7 | Legacy Publishing Business | $3 |

Draw three unique identities from these five. Every starting portfolio totals $10.

## Starting Economy

**EUROPE BEFORE MASS TOURISM**: each team invests in exactly one asset or holds.

| Investment | Price |
| --- | ---: |
| Horse & Carriage | $3 |
| Inn & Accommodation | $3 |
| Passenger Shipping | $4 |
| Travel Guide & Information | $2 |

Insufficient cash blocks investment without consuming a decision. After three decisions: **PORTFOLIOS LOCKED**.

## Industrial Revolution

Revalue first and show old → new values:

| Asset | Before | Steam |
| --- | ---: | ---: |
| Estate | $1 | $1 |
| Legacy Shipping Business | $4 | $6 |
| Legacy Coach Business | $5 | $2 |
| Legacy Inn Business | $5 | $6 |
| Legacy Publishing Business | $3 | $4 |
| Horse & Carriage | $3 | $1 |
| Inn & Accommodation | $3 | $4 |
| Passenger Shipping | $4 | $6 |
| Travel Guide & Information | $2 | $3 |

Each team then chooses exactly one action:

- **Hold:** no change.
- **Sell:** sell one owned asset, including the Estate, at its current market value.
- **Adapt:** pay $1 for one eligible asset; preserve its ID and current market value while changing its business form.
- **Invest:** purchase Railway Travel ($4), Organised Tour Operator ($3), Railway-Era Hotel ($4), or Steam Passenger Shipping ($4).

Adaptation mappings apply to both legacy businesses and starting investments:

| Original business | Adapted business |
| --- | --- |
| Coach / Horse & Carriage | Station Transfer Service |
| Inn / Inn & Accommodation | Railway-Era Hotel |
| Shipping / Passenger Shipping | Steam Passenger Shipping |
| Publishing / Travel Information | Guidebook & Travel Publishing |

The Estate is not a tourism business and cannot adapt. After three actions: **INDUSTRIAL PORTFOLIOS LOCKED**.

## Jet Age

Revaluation only, with no Hold, Sell, Adapt or Invest decisions:

| Asset | Jet value |
| --- | ---: |
| Railway Travel | $5 |
| Organised Tour Operator | $6 |
| Railway-Era Hotel | $7 |
| Station Transfer Service | $4 |
| Steam Passenger Shipping | $3 |
| Remaining Passenger Shipping / Legacy Shipping | $3 |

Guidebook & Travel Publishing and all unlisted assets retain their current values. Show **Passenger Shipping: Pre-Industrial $4 → Steam $6 → Jet $3**, cash, assets and calculated Net Worth. Pause at **PAST ERA COMPLETE**.

## Digital Transformation

Revalue Organised Tour Operator to $4 and Legacy Publishing / Travel Guide / Guidebook & Travel Publishing to $2. Physical assets retain their current values.

**QUEST: BECOME DIGITALLY READY**. Each team chooses exactly one:

- **Digitise:** pay $2, choose one non-digital tourism business, preserve its value, mark it digital, and set the team Digital Ready. The Estate is ineligible.
- **Invest:** buy Online Travel Agency ($5), Digital Booking Platform ($4), or Travel Marketplace ($4). All are digital-native and set the team Digital Ready.
- **Hold:** no change; the team remains not Digital Ready.

After all three decisions, apply **FREE INDEPENDENT TRAVEL BOOM** once. Every team's Destination Pressure increases by 1. Only Digital Ready teams receive $2 cash. The shared `gameState.destinationPressure` also increases by 1; it counts the common event, not the sum of team pressures.

Show Net Worth, Digital Ready and Destination Pressure. Pause at **PRESENT ERA COMPLETE**.

## 2035 Tourism Crisis

On entering this phase, initialise Visitor Experience, Resident Wellbeing and Environmental Health to 3. Subtract each team's accumulated Destination Pressure from Resident Wellbeing and Environmental Health, then clamp all outcome scores to 0–5.

Scenario: demand surges, one attraction is overcrowded, extreme weather disrupts another, transport is strained, residents are frustrated, and travellers expect seamless personalised journeys.

Apply the crisis exactly once: cash −$2, Visitor Experience −2, Resident Wellbeing −1 and Environmental Health −1. Negative cash is allowed. Clamp outcome scores to 0–5 again.

Each team receives one Future Innovation Credit and chooses one strategy at no cash cost:

| Strategy | Cash | Visitor Experience | Resident Wellbeing | Environmental Health |
| --- | ---: | ---: | ---: | ---: |
| Agentic AI | +$2 | +2 | +0 | +0 |
| Regenerative Tourism | +$1 | +1 | +2 | +2 |

Agentic AI supports traveller-level adaptation and reduces friction. Regenerative Tourism supports destination and community outcomes. Apply the strategy once, consume the credit, retain the chosen strategy, and clamp scores to 0–5.

Show Net Worth, all three outcomes and Future Strategy. Pause at **FUTURE ERA COMPLETE / FINAL OUTCOMES LOCKED**. Digital Twins and Spatial Computing are not part of this version.

## Money Winner

After slide 16, the presenter selects **Show Money Winner**. Highest calculated Net Worth wins; ties display joint winners. Future outcome metrics remain in state and on screen. This is a money result, not a declaration of the best tourism system.

End with **Return to presentation: But Did You Actually Win?** for the Canva conclusion.

## Files and verification

- `index.html`: reused identity setup and the phase/portfolio shell.
- `css/styles.css`: existing visual components plus basic phase layout; no page-level scrolling, with internal panel overflow for smaller displays.
- `js/data.js`: identities, assets, markets, valuations, adaptation mappings, strategies and presentation labels.
- `js/state.js`: central state, clean reset, team/asset creation, calculated Net Worth and score clamping.
- `js/setup.js`: unique random draw, undo/reset and direct market entry.
- `js/game.js`: guarded decisions, phase transitions, revaluation, one-time events and money winners; independent of the DOM.
- `js/ui.js`: reused setup cards, dynamic portfolios, action controls and presentation pauses.
- `tests/game.test.cjs`: Node built-in rule tests, including repeat guards, all valuation/mapping rules, cash validation, score limits, reset and ties.
- `tests/browser-smoke.cjs`: headless Chrome/Edge interaction playthrough, reset/refresh and browser error checks; uses Node built-ins, no dependencies.

Run rule tests with `node --test tests/game.test.cjs`. Run browser checks with `node tests/browser-smoke.cjs` (Windows Chrome/Edge auto-detected, or set `BROWSER_PATH`).

The previous board implementation is preserved at `legacy/index.html` and `legacy/js/` for reference. It is disconnected from the active game. Its dice, board movement, rent/landing fees, specialisation, upgrades and Chance effects are obsolete rules. Existing board-specific instructions in `AGENTS.md` apply to that archived prototype; this README documents the current presentation flow. UI polish and gameplay undo beyond the identity draw are outside this implementation.

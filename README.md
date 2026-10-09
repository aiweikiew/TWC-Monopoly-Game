# Tourismopoly

A static HTML/CSS/vanilla JavaScript classroom game for **ACCESS → AUTONOMY → ADAPTATION**. Three teams make portfolio decisions between Canva slide sections. The presenter operates one screen; there is no backend, framework, database, or saved session.

## Run and reset

Open `index.html` in a browser, or serve the folder with `python -m http.server 8000` and open `http://localhost:8000`.

Draw three identities, review all three, then select **Confirm Identities & Start Game**. Undo Last Draw and Reset Draws remain available after the third draw. The Grand Tour uses the Monopoly board for exactly six turns in A/B/C/A/B/C order. Industrial Revolution onward uses strategy/portfolio decisions. Each completed block waits for the presenter to return from Canva and explicitly start the next phase. The next-phase button stays disabled until every required decision is resolved.

**Reset Game**, browser refresh, or `resetGame(); renderGame();` in the browser console returns to a clean identity draw. There is no persistence. Identity undo is available until confirmation. At the end of Grand Tour, Undo Last Turn restores the entire sixth turn before portfolio lock, including purchases, GO, Chance, opportunity income and transfers between teams. Reset during dice animation or movement cancels that old board session.

## Back navigation and explicit Undo

A small **← Back** control appears at the top-left whenever there is a previous view. It is hidden on the initial Identity Draw view and disabled throughout dice animation and token movement.

Navigation uses a separate `navigationState` (`currentView`, `previousViews`, draft selection and view revision). It never restores game snapshots, changes cash/assets, reruns events or uses browser history. Reset and refresh clear navigation history alongside the game.

- An unconfirmed landing popup can go Back to its landing-resolution overview. **Resolve Landing** reopens the same stored outcome; Next Team remains unavailable until the landing is confirmed.
- Strategy buttons open an unconfirmed selection view with **Confirm Decision**. Back discards that draft and returns to the phase overview.
- Back from a presentation pause opens the completed phase review without unlocking anything. **Return to presentation pause** restores the waiting view.
- Earlier views become read-only after gameplay advances. They show the earlier screen's context alongside current committed portfolios, with **Return to current game** to resume. They never expose stale Buy/Pass or decision-confirmation controls.

Gameplay reversal is explicit: **Undo Last Draw** before identity confirmation, **Undo Last Turn** at the Grand Tour market review, and **Undo Last Decision** for the most recent strategy decision in the current phase. Decision undo restores the pre-decision cash/assets/outcomes (including the shared FIT Boom when undoing the last digital decision), while preserving that phase's revaluation or crisis baseline. It is cleared when the next phase starts and supports one decision, not an unlimited undo history. Back never invokes any Undo control.

## Presentation sequence

| Slides completed | Game block | Return to presentation |
| --- | --- | --- |
| 1–4 | Grand Tour / Pre-Industrial Monopoly | Industrial Revolution |
| 5–6 | Industrial Revolution / Steam Shock | Automobiles & Jet Age |
| 7–10 | Jet Age (revaluation only) | Digital Transformation |
| 11–12 | Digital Transformation and FIT Boom | The Future |
| 13–15 | 2035 Tourism Crisis | Tourism Timeline Recap |
| 16 | Money Winner | But Did You Actually Win? (slide 17) |

## State and economic rules

`gameState` owns teams, phase, mode, completion, current decision, draw selections, revaluation history, event guards and destination pressure. Its `board` record owns positions, tile owners, roll counts, pending landing, completed-turn count and undo snapshots. There is only one live team/cash/asset model. Mode starts as `setup`, becomes `monopoly` on identity confirmation, and becomes `strategy` only after Grand Tour portfolio lock. Every team owns asset **objects** with a unique instance ID, type, name, era, form, current market value, tourism eligibility and digital status.

`calculateNetWorth(team)` is the only Net Worth calculation: **cash + sum of current asset values**. Net Worth is never stored separately. Purchases and sales exchange cash and assets without changing Net Worth. Adaptation and digitisation costs reduce Net Worth. Grand Tour tiles have exclusive ownership and charge a flat $1 service fee when another team lands. In later strategy markets, multiple teams may buy the same investment type independently. Board ownership records become inactive after lock; later sales and adaptations operate directly on portfolio assets.

Identity determines starting cash and legacy asset only. There are no identity bonuses, exclusive actions, discounts or specialisations.

| Identity | Cash | Legacy asset | Asset value |
| --- | ---: | --- | ---: |
| Aristocratic Household | $9 | Estate | $1 |
| Merchant House | $6 | Legacy Shipping Business | $4 |
| Stagecoach Operator | $5 | Legacy Coach Business | $5 |
| Coaching Inn Proprietor | $5 | Legacy Inn Business | $5 |
| Mapmaker & Printer | $7 | Legacy Publishing Business | $3 |

Draw three unique identities from these five. Every starting portfolio totals $10.

## Grand Tour / Monopoly mode

The opening era reuses the legacy board, centre Tourismopoly panel, dice animation, tile-by-tile token movement and landing dialogs. Board left; controls and team portfolios right.

| Tile | Space | Price / effect |
| --- | --- | --- |
| 0 | GO / Begin Your Grand Tour | +$1 when passed or landed on |
| 1 | Horse & Carriage | $3 |
| 2 | Chance | Situation Card |
| 3 | Inn & Accommodation | $3 |
| 4 | Business Opportunity | +$1 |
| 5 | Passenger Shipping | $4 |
| 6 | Chance | Situation Card |
| 7 | Travel Guide & Information | $2 |

Exactly two rolls per team: **A -> B -> C -> A -> B -> C**. Each turn is Roll Dice, animate dice, move tile-by-tile, resolve and confirm the landing, then Next Team. Double rolls and early advances are blocked in both rules and UI. No operating income is added.

- **Unowned property:** Buy or Pass. Buying validates cash, deducts price, records tile ownership and adds an equal-value asset to the team's actual portfolio. Passing leaves it unowned.
- **Another team's property:** Pay a flat $1 service fee to the owner. Identity does not modify it.
- **Own property:** Continue with no fee and no upgrade.
- **GO:** Add $1 on crossing or entering tile 0 during movement. The landing dialog does not award it again.
- **Business Opportunity:** Confirm to collect $1 once.
- **Chance:** Reuse the six legacy Situation Cards and sector logic. Purchased tourism sectors take precedence; otherwise evaluate the owned legacy business sector. Beneficial and harmful effects cancel; each outcome is capped at +$1, $0 or -$1. Confirm to apply the stored result once; rendering never redraws or reapplies it.

Cash may become negative from the full $1 service fee or a harmful Chance card. This preserves the specified effect rather than silently reducing it when cash is zero. Investments still require sufficient cash. There are no specialisation bonuses, upgrades, identity bonuses or exclusive identity actions.

After resolving the sixth landing, show **GRAND TOUR MARKET CLOSED / All six turns are complete**. Final portfolios remain visible. Review Portfolios expands the summary; Undo Last Turn restores turn six for replay. The phase remains incomplete until **Confirm & Lock Portfolios**.

Lock changes mode to `strategy` and marks the opening phase complete. It does not rebuild teams, cash or assets: the same objects carry directly into the existing Steam revaluation. Pause at **PORTFOLIOS LOCKED / Return to presentation: Industrial Revolution**. The presenter must separately select Start Industrial Revolution. No board actions are available after lock or in any later phase.

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

- `index.html`: identity confirmation, restored legacy board/dialogs and strategy/portfolio shell.
- `css/styles.css`: existing visual components plus basic phase layout; no page-level scrolling, with internal panel overflow for smaller displays.
- `js/data.js`: identities, assets, markets, valuations, adaptation mappings, strategies and presentation labels.
- `js/state.js`: central state, clean reset, team/asset creation, calculated Net Worth and score clamping.
- `js/setup.js`: unique random draw, undo/reset and explicit confirmation into Monopoly mode.
- `js/game.js`: guarded decisions, phase transitions, revaluation, one-time events and money winners; independent of the DOM.
- `js/ui.js`: reused setup cards, shared portfolios, strategy confirmation, read-only previous views and presentation pauses.
- `js/navigation.js`: separate internal view history, unconfirmed selections, animation guards and safe return to the current game.
- `js/board-data.js`: reused legacy board properties, dice faces and Situation Cards.
- `js/monopoly.js`: guarded board turns, purchases, service fees, GO, Chance, final-turn undo and portfolio lock.
- `js/board-ui.js`: adapted legacy tokens, dice/movement animations and landing dialogs, reading the shared state.
- `tests/game.test.cjs`: 19 Node built-in rule groups covering identity confirmation, six-turn sequencing, every landing branch, handoff by object identity, undo, and the existing strategy valuations, readiness, crisis, reset and ties.
- `tests/navigation.test.cjs`: navigation invariance, draft abandonment, pause reviews, animation guards and explicit decision undo.
- `tests/browser-smoke.cjs`: headless Chrome/Edge interaction playthrough with real dice and movement timing, review/undo/lock, carried assets, reset during animations, refresh and browser error checks; uses Node built-ins, no dependencies.

Run rule tests with `node --test tests/game.test.cjs tests/navigation.test.cjs`. Run browser checks with `node tests/browser-smoke.cjs` (Windows Chrome/Edge auto-detected, or set `BROWSER_PATH`).

The original prototype remains unchanged at `legacy/index.html` and `legacy/js/` for reference. The active app reuses its board layout, animation patterns, landing components and Situation Card logic through the new board adapter files. It does not load the old conflicting state, specialisation or upgrade handlers. The presentation-linked Steam, Jet, Digital, Future and Money Winner economics remain unchanged. UI redesign is outside this implementation.

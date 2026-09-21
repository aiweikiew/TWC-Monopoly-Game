# Tourismopoly

Tourismopoly is a classroom board game built for a university presentation on the evolution of tourism technology.

The game is designed to support a presentation about how tourism has evolved through:

**ACCESS → AUTONOMY → ADAPTATION**

The audience is divided into 3 teams. Teams build tourism businesses, respond to technological disruption, make adaptation decisions, and eventually face a future tourism crisis.

This repository is currently a **frontend-first prototype**. The immediate goal is to make the game polished, reliable, readable on a classroom projector, and easy for one moderator to operate from a single laptop.

---

# 1. Presentation Context

The overall presentation is approximately 20 minutes.

Industry focus:

- Tourism
- Tours and in-destination activities
- Evolution of tourism technology

Presentation eras:

## Past — Access

Theme:

**Mass and standardised tourism**

Main developments:

- Grand Tour / early European travel
- Steam and rail
- Thomas Cook
- Commercial aviation / Jet Age
- Computer reservation systems

Core question:

**Can more people travel?**

## Present — Autonomy

Theme:

**Digital and personalised tourism**

Main developments:

- Internet
- Online Travel Agencies
- Smartphones
- GPS / Google Maps
- Social media
- Algorithms
- Generative AI

Core question:

**Can travellers control their own journey?**

## Future — Adaptation

Theme:

**Adaptive and intelligent tourism**

Main developments:

- Agentic AI
- Digital twins
- IoT
- Spatial computing / mixed reality
- Regenerative tourism management

Core question:

**Can tourism adapt intelligently to both travellers and destinations?**

---

# 2. Game Design Principles

These principles should remain consistent unless explicitly changed.

## Strategy over luck

Luck creates situations and opportunities, but should not determine the winner.

Major wealth movement should come from:

- operating income
- landing/service fees
- investment decisions
- technology revaluation
- adaptation choices
- strategic positioning

Chance effects should remain small.

## Businesses evolve

Businesses may:

- CONTINUE
- ADAPT
- DECLINE

as technology changes.

## Era emphasis

- Past: starting identity matters most
- Present: portfolio and digital readiness matter more
- Future: strategic capability and destination outcomes matter most

## No elimination

Teams are never removed from the game.

---

# 3. Global UI Requirements

These are locked requirements.

The game must behave like a **single-screen game interface**, not a scrolling website.

## Screen behaviour

- No vertical scrolling during gameplay
- No horizontal scrolling during gameplay
- All important information must remain visible in one viewport
- Target a typical 16:9 classroom projector / laptop screen
- Use `100vw × 100vh` for the main game shell
- If space is tight, shrink/reflow components instead of creating page scroll

## Main gameplay layout

- Board on the LEFT
- Controls and player information on the RIGHT
- Board remains the main visual focus
- Dice button appears on the right
- Dice animation appears temporarily on the board
- Player panel remains visible throughout gameplay

## Moderator use

The entire game is operated from:

- one laptop
- one projector
- one moderator

Students do not need their own devices or links.

---

# 4. Visual Direction

The Past Era should resemble an **antique European travel board from the early 1800s**.

Desired visual language:

- aged parchment
- old-map texture
- foxing / light paper stains
- faded ink
- worn printed borders
- muted earthy colours
- serif typography
- engraved / stamp-like travel motifs

Avoid:

- modern SaaS dashboard styling
- bright gradients
- futuristic UI
- glossy cards
- excessive smoothness

Preferred palette:

- parchment beige
- warm cream
- dark walnut
- faded sage
- worn burgundy
- antique brass / ochre

The board should feel like:

**a physical historical travel board game brought to life digitally**

---

# 5. Current Game Flow

The current implementation focuses on the start of the **Past Era**.

Flow:

1. Identity Draw
2. Enter Past Era board
3. Team A rolls
4. Dice animation appears temporarily
5. Result caption appears
6. Dice disappears
7. Team token travels tile-by-tile
8. Landing tile is highlighted / resolved
9. Landing popup appears
10. Team completes the action
11. Next Team becomes available
12. Team B rolls
13. Team C rolls
14. Continue until Round 1 turn limit is reached

---

# 6. Identity Draw

There are 5 possible identities.

Exactly 3 are used in a game.

Teams draw identities one by one:

1. Team A draws randomly
2. Team B draws randomly from remaining identities
3. Team C draws randomly from remaining identities

No duplicate identities.

The draw should feel like a reveal moment.

All identities begin with:

**$10 Net Worth**

but have different mixes of cash and legacy assets.

---

# 7. Identity Pool

## Aristocratic Household

Icon:

🎩

Starting cash:

**$9**

Legacy asset:

**Estate — $1**

Total starting Net Worth:

**$10**

Characteristics:

- highest liquidity
- estate is not a tourism business
- no tourism specialisation bonus

---

## Merchant House

Icon:

🚢

Starting cash:

**$6**

Legacy asset:

**Legacy Shipping Business — $4**

Total starting Net Worth:

**$10**

Specialisation:

**Shipping**

---

## Stagecoach Operator

Icon:

🐎

Starting cash:

**$5**

Legacy asset:

**Legacy Coach Business — $5**

Total starting Net Worth:

**$10**

Specialisation:

**Horse / Road Transport**

---

## Coaching Inn Proprietor

Icon:

🏨

Starting cash:

**$5**

Legacy asset:

**Legacy Inn Business — $5**

Total starting Net Worth:

**$10**

Specialisation:

**Accommodation**

---

## Mapmaker & Printer

Icon:

🗺️

Starting cash:

**$7**

Legacy asset:

**Legacy Publishing Business — $3**

Total starting Net Worth:

**$10**

Specialisation:

**Travel Information**

---

# 8. Player Panel

The player panel must update dynamically from the identity draw.

Each player card should show:

- Team A / B / C
- identity name
- identity icon
- team token
- cash
- Net Worth
- legacy asset

The active team should be visually highlighted.

Future information may later include:

- businesses owned
- upgraded businesses
- Digital Ready
- Digital Capability
- Destination Pressure
- Traveller Experience

Do not show future-era metrics prematurely.

---

# 9. Past Era Board

Current board has 8 tiles.

Order:

1. GO / Begin Your Grand Tour
2. Horse & Carriage
3. Chance
4. Inn & Accommodation
5. Business Opportunity
6. Passenger Shipping
7. Chance
8. Travel Guide & Information

The board loops continuously.

---

# 10. Property Prices

## Horse & Carriage

Price:

**$3**

Sector:

**Road / Horse Transport**

## Inn & Accommodation

Price:

**$3**

Sector:

**Accommodation**

## Passenger Shipping

Price:

**$4**

Sector:

**Shipping**

## Travel Guide & Information

Price:

**$2**

Sector:

**Travel Information**

Property tiles should show:

**PRICE**

followed by a large, projector-readable dollar value.

---

# 11. Dice Behaviour

The Roll Dice button belongs in the RIGHT control panel.

The dice itself should NOT permanently cover the board.

Sequence:

1. Team presses Roll Dice
2. Temporary dice overlay appears in the centre of the board
3. Dice animates
4. Result appears, e.g.:
   - `TEAM A ROLLED 4`
5. Result remains visible briefly
6. Dice overlay fades away
7. Team token starts moving
8. Token moves one tile at a time
9. Token lands
10. Landing popup appears

During dice and movement animation:

- Roll Dice must be disabled
- Next Team must be disabled
- no double roll is possible

---

# 12. Token Movement

Each team has a clearly visible token.

Current placeholder token colours:

- Team A — blue
- Team B — purple
- Team C — green

Tokens move tile-by-tile.

Do not teleport directly to the destination.

Movement should visibly communicate how many spaces were rolled.

---

# 13. Landing Resolution

After movement finishes:

1. identify the landed tile
2. show the relevant popup
3. resolve the action
4. only then enable Next Team

Next Team should NEVER become available before the landing action is resolved.

---

# 14. Unowned Property Popup

If a player lands on an unowned property:

Show:

- `UNOWNED PROPERTY`
- property icon
- property name
- short description
- `PRICE`
- large price value
- current team cash
- `BUY`
- `PASS`

If BUY:

- deduct price from cash
- assign property to the team
- update player panel
- property should later visually show ownership on the board

If PASS:

- property remains unowned

No auction.

---

# 15. Owned Property Landing Fee

If a player lands on another team's property:

Normal landing fee:

**$1**

Popup should show:

- `OWNED PROPERTY`
- property name
- owner
- `LANDING FEE`
- fee amount
- who pays whom
- `PAY FEE`

Payment transfers:

visitor cash → owner cash

---

# 16. Specialisation Bonus

If the property matches the owner's original identity specialisation:

normal fee:

**$1**

specialisation bonus:

**+$1**

total:

**$2**

Matches:

- Stagecoach Operator → Horse & Carriage
- Coaching Inn Proprietor → Inn & Accommodation
- Merchant House → Passenger Shipping
- Mapmaker & Printer → Travel Guide & Information
- Aristocratic Household → none

This specialisation logic belongs to the original identity.

---

# 17. Own Property / Upgrade

If a team lands on its own business:

it may upgrade that business once.

Upgrade cost:

**$1**

Upgrade effect:

future visitors pay:

**+$1 additional landing fee**

Example:

Normal business:

- landing fee = $1

Upgraded:

- landing fee = $2

Specialised + upgraded:

- base = $1
- specialisation = +$1
- upgrade = +$1

Total:

**$3**

Each business can only be upgraded ONCE during the Past Era.

Popup before upgrade:

- `YOUR BUSINESS`
- property name
- `UPGRADE COST`
- `$1`
- future landing fee explanation
- `UPGRADE`
- `KEEP AS IS`

Already upgraded:

- show `UPGRADED`
- explain that the Past Era upgrade limit has been reached
- Continue

---

# 18. GO / Grand Tour Payday

GO works like Payday.

Rule:

**Every time a team passes OR lands on GO, collect +$1 cash.**

Do not award the money twice when landing exactly on GO.

The movement logic should apply the +$1 once when crossing/entering GO.

GO popup:

- `GRAND TOUR PAYDAY`
- `Another Circuit Complete`
- short explanation
- `COLLECT`
- `+$1`
- updated cash balance
- `COLLECT & CONTINUE`

---

# 19. Business Opportunity

Business Opportunity is a simple positive space.

Effect:

**+$1 cash**

Popup:

- `BUSINESS OPPORTUNITY`
- short commercial opportunity message
- `CASH GAIN`
- `+$1`
- updated cash balance
- `COLLECT & CONTINUE`

Keep it simple.

---

# 20. Chance = Situation Card

Chance is NOT automatically good or bad.

A short tourism situation appears.

The impact depends on the team's current tourism business / sector.

Core rule:

- Beneficial → **+$1**
- Harmful → **−$1**
- No effect → **$0**

Chance should remain small so luck does not decide the game.

Preferred neutral wording:

**No change to your business.**

Avoid:

`Not relevant to your current sector.`

---

# 21. Situation Card Deck

Use 6 cards for now.

## 1. Heavy Rain Damages Major Roads

Story:

Poor road conditions disrupt overland journeys and delay coaches across the region.

Effects:

- Horse & Carriage → **−$1**
  - `Road damage slows coach travel and reduces demand.`
- Accommodation → **+$1**
  - `Delayed travellers need to stay overnight, increasing lodging demand.`
- Shipping → **$0**
  - `No change to your business.`
- Travel Information → **$0**
  - `No change to your business.`

---

## 2. Storm Disrupts Sea Travel

Story:

Rough weather delays departures and interrupts passenger shipping at the ports.

Effects:

- Shipping → **−$1**
  - `Rough seas delay passenger journeys and reduce shipping activity.`
- Accommodation → **+$1**
  - `Stranded travellers need extra nights of accommodation.`
- Horse & Carriage → **$0**
- Travel Information → **$0**

Neutral wording:

`No change to your business.`

---

## 3. Major Festival Attracts Visitors

Story:

A popular festival draws extra visitors and raises demand for travel-related services.

Effects:

- Horse & Carriage → **+$1**
  - `More visitors need transport to and around the destination.`
- Accommodation → **+$1**
  - `More visitors increase demand for places to stay.`
- Shipping → **+$1**
  - `Visitors arriving by sea increase passenger traffic.`
- Travel Information → **+$1**
  - `More travellers need maps, guides and local information.`

---

## 4. Improved Roads Speed Up Travel

Story:

Road improvements make overland travel faster and easier across major routes.

Effects:

- Horse & Carriage → **+$1**
  - `Better roads make coach travel faster and more attractive.`
- Accommodation → **−$1**
  - `Faster journeys reduce the need for overnight stops.`
- Shipping → **−$1**
  - `Some travellers switch from sea routes to improved land routes.`
- Travel Information → **$0**
  - `No change to your business.`

---

## 5. Port Expansion Boosts Passenger Traffic

Story:

Expanded port capacity allows more travellers to arrive and depart by sea.

Effects:

- Shipping → **+$1**
  - `Greater port capacity brings more passenger traffic by sea.`
- Travel Information → **+$1**
  - `More arrivals increase demand for maps and travel guidance.`
- Horse & Carriage → **$0**
- Accommodation → **$0**

Neutral wording:

`No change to your business.`

---

## 6. Travel Information Becomes Outdated

Story:

Route details and printed travel information are no longer fully accurate.

Effects:

- Travel Information → **−$1**
  - `Outdated routes and details make your guides less useful to travellers.`
- Horse & Carriage → **$0**
- Accommodation → **$0**
- Shipping → **$0**

Neutral wording:

`No change to your business.`

---

# 22. Teams Owning Multiple Sectors

Later in the round, a team may own businesses in multiple sectors.

Chance should evaluate the team's relevant businesses.

Current intended rule:

- if only beneficial businesses are affected → **+$1**
- if only harmful businesses are affected → **−$1**
- if both a beneficial and harmful business are affected → effects cancel → **$0**
- if none are affected → **$0**

Chance impact remains capped at:

**+$1 / $0 / −$1**

This prevents luck from dominating.

---

# 23. Operating Income

Planned rule:

At the start of a team's turn:

**collect +$1 per operating tourism business owned**

Legacy tourism businesses count.

Aristocratic Estate does NOT count as a tourism business.

A newly purchased business begins generating operating income from the next turn.

This mechanic may not yet be fully implemented in the current prototype.

---

# 24. Round 1 Turn Limit

Planned Past Era pre-shock gameplay:

- 3 teams
- each team gets 2 rolls
- total = 6 turns

After the sixth completed turn:

**MARKET CLOSED — PORTFOLIOS LOCKED**

Then switch back to the presentation for the Steam & Rail technology shock.

This turn limit may not yet be implemented.

---

# 25. Past Era Quest

Quest:

**BUILD YOUR TRAVEL FORTUNE**

Target by end of Past Era:

**$20 Net Worth**

Stretch:

**$25+ = Tourism Tycoon**

Nobody is eliminated for missing the target.

---

# 26. Steam & Rail Technology Shock

After the initial 6 turns:

1. market closes
2. presentation explains Steam & Rail
3. return to the game
4. apply revaluation

Board asset revaluation:

- Horse & Carriage: **$3 → $1**
- Inn & Accommodation: **$3 → $4**
- Passenger Shipping: **$4 → $6**
- Travel Guide & Information: **$2 → $3**

Legacy revaluation:

- Legacy Coach: **$5 → $2**
- Legacy Inn: **$5 → $6**
- Legacy Shipping: **$4 → $6**
- Legacy Publishing: **$3 → $4**
- Estate: **$1 → $1**

These are game abstractions, not literal historical percentages.

---

# 27. Steam Adaptation Window

After revaluation, each team gets ONE action:

- HOLD
- SELL
- ADAPT
- INVEST

Possible new Steam-era businesses:

- Railway Travel Business — $4
- Organised Tour Operator — $3
- Railway-Era Hotel — $4
- Steam Passenger Shipping — $4

Possible evolution:

- Coach → Station Transfer Service
- Inn → Railway-Era Hotel
- Shipping → Steam Passenger Shipping
- Travel Information → Guidebook & Travel Publishing

---

# 28. Jet Age

There should NOT be another full dice board before Jet Age.

Presentation introduces:

- commercial aviation
- Jet Age
- computer reservation systems / SABRE

Example revaluation:

- Railway Travel: $4 → $5
- Railway-Era / Grand Hotel: $4 → $7
- Steam Passenger Shipping: $6 → $3
- Organised Tour Operator: $3 → $6
- Station Transfer Service: about $3 → $4

The key shipping trajectory should remain visible:

**$4 → $6 → $3**

This demonstrates how an asset can benefit from one technology shock and later be disrupted by another.

---

# 29. Present Era — Autonomy

Round 2 structure:

1. Carry Past portfolio
2. Post-Jet Portfolio Review
3. Digital Dawn clues
4. One-roll mini-board
5. Internet / OTA Digital Revolution
6. Revaluation
7. Digital Adaptation
8. Digital Ready
9. Smartphones / GPS
10. Social / algorithms / GenAI
11. Choose Digital Capability
12. Guaranteed Viral Event
13. Present results

Quest:

**BECOME DIGITALLY READY**

Requirement:

own at least one digitally adapted or digital-native tourism business.

---

# 30. Present Mini-Board

Each team rolls once.

Possible spaces:

- GO
- Traditional Travel Agency — $4
- Chance
- Computer Reservation System — $5
- Hotel Chain — $5
- Business Opportunity +$1
- Travel Publishing / Guidebooks — $3

Do not introduce OTAs before the Internet/OTA shock.

---

# 31. Digital Revaluation

After Internet + OTA shock:

- Traditional Travel Agency: $4 → $3
- Computer Reservation System: $5 → $7
- Hotel Chain: $5 → $5
- Travel Publishing: $3 → $2

Carry-over examples:

- Rail Travel — no change
- International Hotel — no change
- Cruise Tourism — no change
- Ground Transfer — no change
- Package Tour Operator — −$1
- Traditional Publishing — −$1

---

# 32. Digital Adaptation Costs

Service / information businesses:

**$2**

Physical / operational businesses:

**$3**

Examples:

- Traditional Agency → Digital Travel Agency — $2
- Travel Publishing → Digital Travel Content Platform — $2
- Package Tour Operator → Online Tour Operator — $2
- Reservation System → Digital Distribution Infrastructure — $2
- Hotel → Digitally Enabled / Direct-Booking Hotel — $3
- Rail → Digital Ticketing Rail — $3
- Cruise → Digitally Bookable Cruise — $3
- Ground Transfer → Digitally Bookable Transfer — $3

Paying the adaptation cost does NOT automatically increase asset value.

---

# 33. Digital-Native Investments

After the Internet/OTA shock:

- Online Travel Agency / Booking Platform — $5
- Online Tours & Activities Marketplace — $4
- Digital Travel Content / Review Platform — $3

Do not unlock mobile/AI businesses before the slides introducing them.

---

# 34. Digital Capability

Digital Ready teams choose ONE capability:

## Mobile Connected

Focus:

- mobile access
- real-time booking
- in-destination convenience

## Social Discovery

Focus:

- social visibility
- algorithmic reach
- demand amplification

## AI Assisted

Focus:

- personalisation
- information support
- customer assistance

Capabilities are free to choose once digitally ready.

---

# 35. Viral Event

Guaranteed event:

**YOUR DESTINATION WENT VIRAL!**

Base:

- +$1 revenue
- +1 Destination Pressure

Capability modifiers:

## None

Total:

- +$1 revenue
- +1 pressure

## Mobile

Total:

- +$3 revenue
- +2 pressure

## Social

Total:

- +$4 revenue
- +3 pressure

## AI

Total:

- +$2 revenue
- +1 pressure

These are game abstractions.

---

# 36. Future Era — Adaptation

No dice board.

Teams choose one future strategy.

Carry forward:

- Net Worth
- Digital Readiness
- Digital Capability
- Destination Pressure

Add:

**Traveller Experience = 3/5**

Quest:

**BUILD AN ADAPTIVE DESTINATION**

Protect at least 2 of 3 outcomes:

1. Commercial Resilience
2. Traveller Experience
3. Destination Health

---

# 37. Future Strategies

Each team receives one Future Innovation Credit.

No cash cost.

Choose ONE:

## Agentic AI

Strength:

real-time traveller adaptation

## Digital Twin + IoT

Strength:

destination-level prediction and management

## Spatial Computing / MR

Strength:

immersive visitor experience

## Regenerative Tourism Management

Strength:

destination wellbeing and responsible growth

---

# 38. 2035 Tourism Crisis

Hypothetical game scenario:

- visitor demand rises sharply
- major heritage attraction overcrowded
- heavy rain closes another attraction
- public transport disrupted
- residents frustrated
- travellers still expect seamless personalised experiences

Base crisis:

- Net Worth −$2
- Traveller Experience −2
- Destination Pressure +2

Strategy effects:

## Agentic AI

- +$2 financial recovery
- +2 Traveller Experience
- −1 Destination Pressure

## Digital Twin + IoT

- +$1 financial recovery
- +2 Traveller Experience
- −2 Destination Pressure

## Spatial Computing / MR

- +$2 financial recovery
- +2 Traveller Experience
- 0 pressure reduction

## Regenerative Tourism Management

- +$1 financial recovery
- +1 Traveller Experience
- −3 Destination Pressure

These are game abstractions.

---

# 39. Final Game Message

The game should NOT imply that highest Net Worth automatically means overall success.

Final reveal:

**BUT DID YOU ACTUALLY WIN?**

Tourism success should be considered across:

- Economic Value
- Visitor Experience
- Resident Wellbeing
- Environmental / Destination Health

Closing evolution:

**ACCESS → AUTONOMY → ADAPTATION**

---

# 40. Current Prototype Status

Already prototyped:

- antique Past Era board
- right-side player panel
- identity draw UI
- random identity draw, one team at a time
- dynamic identity information
- dice control on right
- temporary dice overlay on board
- dice animation
- tile-by-tile token movement
- unowned property popup
- Buy / Pass
- Chance popup
- sector-based Situation Cards
- GO / Payday +$1
- Business Opportunity +$1
- owned property landing fee
- specialisation bonus
- own-property upgrade
- one upgrade maximum per property

Still to implement / improve:

- property ownership indicators on board
- Net Worth calculation updates
- operating income
- exact Round 1 turn limit
- market lock
- Steam revaluation UI
- adaptation window
- Jet Age transition
- Present Era
- Future Era
- moderator controls
- undo
- robust game-state architecture
- final polish / accessibility / testing

---

# 41. Recommended Architecture

Refactor toward a central state object.

Example:

```js
const gameState = {
  era: "past",
  phase: "preSteam",
  currentTeam: 0,
  turn: 0,
  marketLocked: false,
  teams: [],
  properties: [],
  chanceDeck: [],
  destinationPressure: 0
};
```

Team example:

```js
{
  id: "A",
  identity: "stagecoach",
  cash: 5,
  netWorth: 10,
  position: 0,
  legacyAsset: {},
  businesses: [],
  digitalReady: false,
  digitalCapability: null,
  destinationPressure: 0,
  travellerExperience: 3
}
```

Do not scatter important game state across unrelated DOM nodes.

The UI should render from state wherever practical.

---

# 42. Codex Development Rules

When using Codex:

1. Read this README before changing game logic.
2. Preserve the current visual direction unless a task explicitly changes it.
3. Do not redesign unrelated screens while implementing a feature.
4. Do not silently change game rules.
5. Keep HTML/CSS/JS simple.
6. Prefer vanilla JavaScript.
7. Do not add React unless explicitly requested.
8. Do not add a backend unless explicitly requested.
9. Do not add Docker unless deployment requires it.
10. Keep every gameplay screen inside one viewport.
11. Never introduce page-level scrolling during the game.
12. Keep the board on the left and controls/player panel on the right.
13. Keep the dice button on the right.
14. Dice animation appears temporarily on the board.
15. Landing actions must be resolved before Next Team.
16. Chance effects must remain capped at +$1 / $0 / −$1.
17. Preserve projector readability.
18. Commit or work in small feature increments.
19. When uncertain about a game rule, do not invent one—leave a TODO or ask for clarification.
20. Treat values in this README as the current source of truth.

---

# 43. Suggested Next Development Tasks

Recommended order:

1. Refactor current single-file prototype into:
   - `index.html`
   - `css/styles.css`
   - `js/data.js`
   - `js/state.js`
   - `js/setup.js`
   - `js/game.js`
   - `js/ui.js`
2. Preserve all existing behaviour while refactoring.
3. Add visible ownership markers to purchased properties.
4. Calculate Net Worth dynamically.
5. Implement operating income.
6. Implement 2 rolls per team / 6 turns total.
7. Add Market Closed state.
8. Build Steam & Rail revaluation screen.
9. Build Past Era adaptation window.
10. Only after Past Era is stable, begin Present Era.

---

# 44. Local Development

This is currently a static frontend project.

You can run it with a simple local server.

Example with Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

For deployment later, GitHub Pages is sufficient because the current game does not require a backend.

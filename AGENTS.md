# AGENTS.md

You are working on Tourismopoly, a classroom tourism-technology board game.

Before changing anything:

1. Read `README.md`.
2. Treat the README as the current source of truth for game rules.
3. Inspect the current implementation before editing.

Development constraints:

- Use plain HTML, CSS, and vanilla JavaScript unless explicitly instructed otherwise.
- Do not introduce React, frameworks, a backend, Docker, or a database without approval.
- Do not change game rules silently.
- Do not redesign unrelated UI while implementing a feature.
- Preserve the 1800s antique visual direction for the Past Era.
- Gameplay must fit into one viewport with no page-level horizontal or vertical scrolling.
- Board stays left; controls/player panel stay right.
- Dice control stays right; dice animation appears temporarily on the board.
- Tokens move tile-by-tile.
- Landing popups must resolve before Next Team becomes available.
- Keep projector readability high.
- Chance effects remain capped at +$1, $0, or -$1.
- Prefer a central game-state object rather than storing logic implicitly in DOM content.
- Make small, testable changes.
- When a requested change could break an existing mechanic, preserve the existing mechanic and explain the conflict.
- If a rule is unclear, ask rather than inventing it.

Current recommended next task:

Refactor the current single-file prototype into separate HTML, CSS, and JS files while preserving every existing interaction and visual behaviour.

# ArtLead — Category #10: Prompt / Template Quality
> Analyst: ArtLead (Sonnet) | Date: 2026-04-23
> Note: (Gemini fallback: sonnet) — gemini-2.5-pro-preview-05-06 returned ModelNotFoundError (HTTP 404).

---

## Scope

File analyzed: `docs/genre-presets.json` (all 12 templates)

Context: These prompt templates are the **creative core** of GameFactory. Each is fed to a subscription LLM CLI (Claude, Codex, or Gemini) and must produce a complete, working, playable game in a single HTML file. Quality directly determines generation success rate.

---

## Cross-Cutting Analysis

### Common strengths across all templates
- Clear file format constraint: "single HTML file, No frameworks" — LLM-safe, prevents scope explosion.
- Most templates specify a concrete minimum (at least 3 upgrades, 5 waves, 15+ items, 3 endings) — this is good prompt engineering practice.
- All templates are written in imperative mood ("Build a...") — clear task framing.
- Most templates end with an open-ended suffix for user customization ("Theme:", "Mechanics:", "Story:") — correct separation of system constraints vs user intent.

### Common weaknesses across all templates
1. **No responsive/mobile specification** in most templates (only `grid_logic` and `top_down` mention it).
2. **No error handling / graceful degradation** — none mention what happens on invalid user input.
3. **No performance budget** — only `top_down` and `platformer` specify 60fps. Others may produce janky games.
4. **No audio specified in most templates** — only `reflex` mentions Web Audio. Games feel hollow without sound feedback.
5. **No code structure guidance** — LLMs may produce unmaintainable 3000-line files. No comment structure or function organization requested.
6. **Suffix prompts are bare** — e.g., "Mechanics:" with no example or guidance on what level of detail is expected.

---

## Per-Template Analysis

### T-01: `grid_logic` — Grid Puzzle
**Template:** "Build a grid-based puzzle game in a single HTML file. No frameworks. Dark theme. Include: clear win/lose state, move counter, reset button, mobile-responsive tap targets (min 44px), satisfying transition on each move (100-200ms). Mechanics:"

**Strengths:** Mobile tap targets specified (44px). Animation timing specified (100–200ms). Dark theme forced (consistent look).

**Weaknesses:**
- Grid dimensions not specified — LLM will invent arbitrary grid size.
- No score/high-score requirement — missing retention hook.
- "Satisfying transition" is subjective — needs concrete spec (e.g., "CSS transform scale or color fade").
- "Mechanics:" suffix is too bare — "match-3" and "minesweeper" need completely different implementations.

**Severity:** P2 (functional but outputs will vary widely in quality)

**Improved suffix:** Change "Mechanics:" to "Grid size, win condition, and core mechanic (e.g. '8x8 grid, match 3+ same-color cells, survive 20 moves'):".

---

### T-02: `hyper_casual` — Hyper-Casual 1-Tap
**Template:** "Build a hyper-casual 1-tap game in a single HTML file. No frameworks. Requirements: score + best score in localStorage, game-over screen, one-tap control, bright colors, tactile feedback on tap (scale + brief particle). 60fps smooth. Game idea:"

**Strengths:** 60fps specified. localStorage persistence required. Tactile feedback specified (scale + particle — concrete). "Bright colors" sets visual identity.

**Weaknesses:**
- No mobile responsive spec despite being a 1-tap game (implies mobile).
- "Brief particle" needs a duration spec (e.g., "5–8 particles, 300ms lifetime").
- No difficulty progression — games will be flat difficulty (boring after 30 seconds).

**Severity:** P2

**Recommended addition:** "Progressive difficulty: speed or spawn rate increases every 10 points. Mobile responsive (full viewport)."

---

### T-03: `idle_clicker` — Idle / Clicker
**Template:** "Build an idle/clicker game in a single HTML file. No frameworks. Include: main clickable resource, at least 3 upgrades with increasing cost, auto-income tick every second, save/load to localStorage every 5s. Clean UI with number formatting (1.2K, 3.4M). Theme:"

**Strengths:** Number formatting specified (prevents raw large numbers). Auto-save interval specified. Upgrade minimum count specified.

**Weaknesses:**
- No offline progress (most clicker games show earnings while idle). This is a genre expectation.
- "Clean UI" is subjective — no layout spec.
- "Increasing cost" doesn't specify growth rate — LLM will use arbitrary multipliers leading to broken balance.

**Severity:** P1 — balance issue can make the game unplayable

**Recommended addition:** "Upgrade cost multiplier: 1.15x per purchase. Offline income: calculate earnings on page load based on time elapsed (max 8 hours cap)."

---

### T-04: `card_battle` — Turn-Based Card
**Template:** "Build a turn-based card game in a single HTML file. No frameworks. Include: deck, hand, discard, clear turn indicator, opponent AI (simple rule-based), end-game screen with winner. Smooth card draw animation. Rules:"

**Strengths:** Deck/hand/discard architecture specified. Opponent AI required. Animation required.

**Weaknesses:**
- No deck size specified — LLM may generate 5-card or 52-card decks randomly.
- "Simple rule-based" AI is ambiguous — LLM may produce an AI that always wins or always loses.
- No card count in hand specified.
- "Rules:" suffix is the weakest of all templates — card games have enormous design space. Without a rules skeleton, LLMs will hallucinate arbitrary card games.

**Severity:** P1 — highest variance template; without rules, outputs are unpredictable

**Recommended change:** "Rules:" → "Card game rules (e.g. 'Uno: 7 cards each, match color or number, +2/+4/skip/reverse special cards, first to empty hand wins'):"

---

### T-05: `tower_defense` — Tower Defense
**Template:** "Build a tower defense game in a single HTML file on a canvas or CSS grid. No frameworks. Include: at least 2 tower types, wave progression (5 waves), enemy HP bars, currency for buying towers, win/lose. Path-based movement. Theme:"

**Strengths:** Wave count specified (5). Currency system required. HP bars required. Tower minimum specified (2).

**Weaknesses:**
- "Path-based movement" without specifying if path is fixed or procedural — huge implementation difference.
- No tower range visualization — LLM may omit it, making the game confusing.
- No tower upgrade path — static towers get boring quickly.
- Canvas vs CSS grid choice left to LLM — inconsistent output across generations.

**Severity:** P2

**Recommended addition:** "Fixed path (pre-drawn waypoints, not procedural). Tower placement on grid cells adjacent to path. Show tower attack radius on hover."

---

### T-06: `quiz` — Quiz / Word
**Template:** "Build a word/quiz game in a single HTML file. No frameworks. Include: built-in word or question list (15+ items), feedback per answer (right/wrong/close), score tracking, restart button, on-screen keyboard if letter-input. Dark theme."

**Weaknesses:**
- Only template with **no suffix prompt** — user cannot customize the game topic. This means every `quiz` game is about... what? The LLM decides.
- "Close" feedback implies Wordle-style (proximity scoring) but not all quiz games have proximity. Ambiguous.
- 15+ items minimum is good, but no variety in difficulty levels.

**Severity:** P1 — missing suffix means zero user customization

**Fix:** Add suffix "Topic (e.g. 'Wordle-style word puzzle', 'geography trivia', 'math drill'):" at the end.

---

### T-07: `top_down` — Top-Down Shooter/Roguelite
**Template:** "Build a top-down 2D game on canvas in a single HTML file. No frameworks. Include: player (WASD/arrows + mobile joystick), enemies with basic AI, projectiles or melee, HP bar, wave-based progression, game-over screen. Smooth 60fps. Theme:"

**Strengths:** Mobile joystick specified (rare in templates). 60fps specified. Dual control (WASD + arrows) specified.

**Weaknesses:**
- "Basic AI" for enemies — will produce enemies that walk in straight lines toward player. Needs: "Enemies move toward player, avoid each other (simple separation)."
- No enemy count per wave.
- "Projectiles or melee" — offering a choice to the LLM leads to inconsistent output. Pick one as default.

**Severity:** P2

---

### T-08: `platformer` — 2D Platformer
**Template:** "Build a 2D platformer on canvas in a single HTML file. No frameworks. Include: AABB collision, gravity+jump, coyote time (100ms), at least 1 level with platforms+goal, death/respawn, win screen. Arrow keys + space. Theme:"

**Strengths:** AABB collision specified (technical constraint prevents physics errors). Coyote time with duration (100ms — game-feel detail). Specific control keys.

**Weaknesses:**
- Only 1 level required — too minimal. Playtesters will finish in 30 seconds.
- No enemy requirement — platformers without hazards are not engaging.
- No jump height/gravity spec — will produce floaty or heavy characters randomly.

**Severity:** P2

**Recommended addition:** "At least 3 screen-length levels with increasing difficulty. At least 1 enemy type (patrol or stationary hazard). Jump height: 3 player-heights. Gravity: smooth fall with apex float (100ms reduced gravity at peak)."

---

### T-09: `visual_novel` — Visual Novel / Text Adventure
**Template:** "Build a text-based interactive story in a single HTML file. No frameworks. Include: branching choices (at least 3 endings), typed-out text effect (20ms/char), character name tags, location indicators, restart. Moody theme. Story:"

**Strengths:** Typed-out text effect with timing (20ms/char — specific and correct). 3 endings minimum. Character name tags and location indicators (production quality signals).

**Weaknesses:**
- "Moody theme" forced regardless of user input — a user asking for a "children's adventure" will get a moody UI.
- No save/load — players who close the tab lose progress.
- "Story:" suffix — LLM will hallucinate a complete story without guidance on length or structure.

**Severity:** P2

**Fix:** Remove "Moody theme" and let the theme follow the story. Add "Auto-save progress to localStorage." Change suffix to "Story premise and protagonist (e.g. 'A detective investigating a locked-room murder in 1920s Paris'):".

---

### T-10: `reflex` — Reflex / Reaction
**Template:** "Build a reflex/reaction game in a single HTML file. No frameworks. Include: best reaction time in localStorage, 5-round average, visual+audio cue (Web Audio beep), false-start detection, clean UI. Mechanic:"

**Strengths:** Web Audio specified (only template that does). False-start detection (advanced game-feel detail). localStorage for best score. 5-round average.

**Weaknesses:** Very minimal — the strongest template but the mechanic space is too open. "Piano Tiles" requires completely different implementation vs "reaction test."

**Severity:** P2

**Recommended change:** "Mechanic (e.g. 'Tap when light turns green — measure reaction time', 'Hit falling tiles on beat', 'Whack-a-mole variant'):"

---

### T-11: `physics_sandbox` — Physics Sandbox
**Template:** "Build a physics game in a single HTML file using simple Verlet or Euler integration (no Matter.js). Include: gravity, drag-to-aim mechanic, 3 levels, target objects to hit, win per level. Clean canvas rendering. Theme:"

**Strengths:** Physics integration method specified (Verlet/Euler — prevents LLM from using Matter.js despite the constraint). 3 levels required. Win condition per level.

**Weaknesses:**
- "No Matter.js" contradicts `game-fit-guide.md:77` which says "Matter.js + simple level editor." This needs resolution (see art_12).
- No collision detection spec — Verlet integration alone doesn't specify how objects interact.
- "Drag-to-aim" mechanic is constrained but narrow — what about sandbox-style physics?

**Severity:** P1 (contradiction with fit guide; see art_12 for details)

---

### T-12: `educational` — Educational Mini-Game
**Template:** "Build an educational mini-game in a single HTML file. No frameworks. Include: adaptive difficulty, streak counter, encouraging feedback (no negative shaming), restart. Bright, child-friendly dark theme. Subject & age:"

**Strengths:** "No negative shaming" is an explicit, thoughtful constraint. Adaptive difficulty and streak counter are good UX requirements.

**Weaknesses:**
- "Bright, child-friendly dark theme" is contradictory — "bright" and "dark theme" are opposites.
- "Adaptive difficulty" without spec — LLM may implement trivial or broken adaptive systems.
- No time limit specification — drill games need pacing.

**Severity:** P1 — "Bright, child-friendly dark theme" is internally contradictory

**Fix:** Change to "Bright, colorful theme (light background, high-contrast text)." For adaptive difficulty: "Increase difficulty after 3 correct in a row, decrease after 2 wrong in a row."

---

## Missing Genre Templates

The fit guide's "Sweet Spot" tier includes "Turn-Based Strategy (hex, chess variant, sabit grid)" but there is no `turn_based_strategy` key in `genre-presets.json`. This is a gap.

**Recommendation:** Add:
```json
"turn_based_strategy": {
  "label": "Turn-Based Strategy",
  "examples": ["chess variant", "hex tactics", "into the breach mini"],
  "promptTemplate": "Build a turn-based strategy game on a grid in a single HTML file. No frameworks. Include: two opposing sides (player vs AI), clear turn indicator, at least 3 unit types with different move/attack ranges, win condition (eliminate all enemies or capture objective), undo last move. Grid-based movement (no diagonals unless chess-style). AI: greedy (attack nearest player unit). Theme and grid type (hex or square):"
}
```

---

## Summary Table

| Template | Key Issue | Severity | Fix Effort |
|----------|-----------|---------|-----------|
| grid_logic | Bare "Mechanics:" suffix; no grid size | P2 | Trivial |
| hyper_casual | No difficulty progression; no mobile spec | P2 | Trivial |
| idle_clicker | No cost growth rate; no offline progress | P1 | Trivial |
| card_battle | "Rules:" suffix too bare; high variance | P1 | Small |
| tower_defense | Path type ambiguous; no range viz | P2 | Trivial |
| quiz | No suffix prompt — zero user customization | P1 | Trivial |
| top_down | Vague enemy AI; choice offered to LLM | P2 | Trivial |
| platformer | Only 1 level; no enemies; no physics spec | P2 | Small |
| visual_novel | Forced "moody"; no save/load; bare suffix | P2 | Small |
| reflex | Mechanic space too open | P2 | Trivial |
| physics_sandbox | Contradicts fit guide (Matter.js) | P1 | Small (+ resolve with #12) |
| educational | "Bright dark theme" contradiction | P1 | Trivial |
| (missing) | turn_based_strategy not in presets | P2 | Small |

---

## Priority Actions

1. **Immediate (P1):** Fix `educational` theme contradiction (1 word), add suffix to `quiz`, fix `idle_clicker` balance guidance, resolve `physics_sandbox` vs fit guide contradiction, expand `card_battle` suffix. Total: ~45 minutes.
2. **Short-term (P2):** Improve all remaining template suffixes, add mobile specs to missing templates, add audio note to all templates, add `turn_based_strategy` template. Total: ~2 hours.
3. **Cross-cutting:** Add standard footer to all templates: "Add Web Audio beep on key interactions. Mobile responsive (full viewport). Show FPS counter in top-right corner during development mode (add ?debug=1 to URL)." Total: ~30 min.

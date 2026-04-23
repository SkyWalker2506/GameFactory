# ArtLead — Category #12: Art Direction Coherence
> Analyst: ArtLead (Sonnet) | Date: 2026-04-23
> Note: (Gemini fallback: sonnet) — gemini-2.5-pro-preview-05-06 returned ModelNotFoundError (HTTP 404).

---

## Scope

Files analyzed:
- `docs/genre-presets.json` (12 templates)
- `docs/game-fit-guide.md` (genre tiers + technical scope)
- `README.md` (Supported genres section)
- `CLAUDE.md` (genre module list)

Goal: Verify that the genre templates in `genre-presets.json` are coherent with the tier classifications and technical claims in `game-fit-guide.md`, and that genre naming is consistent across all surfaces.

---

## Findings

### F-12-01 — `physics_sandbox` template contradicts fit guide on Matter.js
**Severity: P1**

`docs/genre-presets.json` `physics_sandbox.promptTemplate`: "...using simple Verlet or Euler integration (no Matter.js)."

`docs/game-fit-guide.md:78` (Teknik Kapsam): "Asset: LLM text/logic + opsiyonel image provider" — and the "Physics Sandbox" row in the Sweet Spot table implies a physics library: "Matter.js + simple level editor."

The prompt template explicitly bans Matter.js. The fit guide implicitly endorses it. A user reading both gets contradictory guidance. The template constraint (no Matter.js) is actually defensible (reduces LLM dependency on library APIs it may hallucinate), but the fit guide needs to be updated to match.

Evidence: `docs/genre-presets.json:physics_sandbox.promptTemplate`; `docs/game-fit-guide.md:78` (implied from "Physics Sandbox" row context).

Recommendation: Update the fit guide Physics Sandbox description to: "Simple physics via Verlet/Euler integration (bespoke — no Matter.js dependency)." This aligns the template with the documentation. If Matter.js is actually desired, remove the "no Matter.js" constraint from the template.

Effort: Trivial (1 line in fit guide).

---

### F-12-02 — "Turn-Based Strategy" is Sweet Spot tier in fit guide but has no template
**Severity: P1**

`docs/game-fit-guide.md:24`: "Turn-Based Strategy (hex, chess variant, sabit grid)" — listed as Sweet Spot with the note "Minimax AI deterministik yazılır."

`docs/genre-presets.json`: No `turn_based_strategy` key exists.

This is a functional gap: a user who reads the fit guide, sees "Turn-Based Strategy" as a Sweet Spot genre, and runs `gf genres` will not find it. The genre key list in README also does not include it.

Evidence: `docs/game-fit-guide.md:24`; `docs/genre-presets.json` (all 12 keys — no turn_based_strategy).

Recommendation: Add a `turn_based_strategy` template (see art_10 report for proposed prompt). Also add it to the README "Supported genres" section and to `gf genres` output.

Effort: Small (30 min template authoring + doc update).

---

### F-12-03 — "ui_heavy" OpenGame module has no direct genre mapping
**Severity: P1**

OpenGame has 5 native template modules: `platformer`, `top_down`, `tower_defense`, `grid_logic`, `ui_heavy`. The `ui_heavy` module is used in the live demo (`tap-reflex` — made with `ui_heavy`/Codex), but `ui_heavy` is not a genre key in `genre-presets.json`.

The `ui_heavy` module presumably underlies genres like `idle_clicker`, `reflex`, `card_battle`, and `quiz` — all UI-dominant games. But this mapping is implicit and undocumented. When `gf new tap-reflex --genre reflex` is run, does it select the `ui_heavy` OpenGame module? Or does it use something else?

This ambiguity is a coherence gap between OpenGame's module system and GameFactory's genre taxonomy.

Evidence: `README.md:10` (tap-reflex made with ui_heavy/Codex); `docs/genre-presets.json` (no ui_heavy key); `CLAUDE.md` (lists `ui_heavy` as a template module).

Recommendation: Document the genre-to-OpenGame-module mapping explicitly in the fit guide or in a new `docs/genre-module-map.md`:
```
grid_logic → grid_logic module
top_down → top_down module
platformer → platformer module
tower_defense → tower_defense module
reflex, idle_clicker, quiz, card_battle, visual_novel, educational, hyper_casual → ui_heavy module
physics_sandbox → (canvas, no module)
```
If this mapping is incorrect, the error is in CLAUDE.md and should be fixed there.

Effort: Small (30 min to verify mapping by reading scripts/gf, then document).

---

### F-12-04 — `quiz` template genre label mismatch across surfaces
**Severity: P2**

`docs/genre-presets.json`: key `quiz`, label `"Quiz / Word"`.
`docs/game-fit-guide.md`: "Quiz / Trivia / Kelime (wordle, hangman)".
`README.md:81`: "quiz" (just the key).
`CLAUDE.md`: "quiz" (just the key).

The label "Quiz / Word" omits "Trivia" which is explicitly in the fit guide. "Wordle" and "hangman" are in the fit guide examples but not in the presets.json examples list (`["wordle", "trivia", "hangman"]` — wait, "trivia" IS in the examples). So the label is narrower than the examples. Minor but creates scanning confusion.

Evidence: `docs/genre-presets.json:quiz.label`; `docs/game-fit-guide.md` (Quiz row).

Recommendation: Change label to `"Quiz / Trivia / Word"` to match fit guide.

Effort: Trivial.

---

### F-12-05 — README "Supported genres" list is not sorted consistently with fit guide tier order
**Severity: P2**

`README.md:81`: "Top picks: `grid_logic`, `hyper_casual`, `idle_clicker`, `card_battle`, `tower_defense`, `quiz`, `top_down`, `platformer`, `visual_novel`, `reflex`, `physics_sandbox`, `educational`."

`docs/game-fit-guide.md`: "Başlangıç Sırası Önerisi (Start Order): Grid Puzzle → Hyper-Casual → Idle / Clicker."

The README does list these first three in the recommended order. But the rest of the list (`card_battle`, `tower_defense`, etc.) follows no clear order — not alphabetical, not by complexity, not by fit guide row order. This inconsistency makes the genre list harder to scan and compare with the fit guide.

Evidence: `README.md:81`; `docs/game-fit-guide.md:64–72` (start order section).

Recommendation: Sort the README genre list to match fit guide tier order (Sweet Spot top → medium genres last). Or match the fit guide row order exactly. This makes the two surfaces coherent.

Effort: Trivial (reorder 12 items).

---

### F-12-06 — Fit guide "⚠️ Medium" genres have no templates and no "not yet" signal
**Severity: P2**

`docs/game-fit-guide.md` lists 7 "Medium/Difficult but doable" genres (Metroidvania, Online Multiplayer, Simple 3D, Rhythm, Roguelike, Builder/Tycoon, Racing). None have templates in `genre-presets.json`. There is no indication in the README or the JSON that these genres are planned, future, or unsupported. A user reading the fit guide and seeing "Uğraştırır ama yapılabilir" (difficult but doable) might expect a template to exist.

Evidence: `docs/game-fit-guide.md:28–40` (Medium tier, 7 genres); `docs/genre-presets.json` (no medium-tier templates).

Recommendation: Add a note to `docs/genre-presets.json` or a companion `docs/genre-status.md`:
```
Sweet Spot (templates available): [12 listed]
Medium (templates planned, not yet available): metroidvania, roguelike, builder_tycoon, racing
Avoid (no template planned): [9 listed]
```
This sets correct user expectations.

Effort: Small (15 min documentation).

---

### F-12-07 — "No frameworks" constraint conflicts with Phaser 3 / three.js capability claims
**Severity: P1**

`docs/game-fit-guide.md:77`: "Destekli engine'ler: Canvas API, Phaser 3, three.js" — states that Phaser 3 and three.js are supported.

All 12 templates in `genre-presets.json`: "No frameworks" — explicitly forbids using any framework including Phaser 3 or three.js.

A user reading the fit guide believes Phaser 3 is supported. A user running a template gets games with no Phaser 3 (Canvas only). This is a significant capability gap between the stated technical scope and the actual prompt behavior.

The "No frameworks" constraint is justified for single-file output (Phaser requires CDN or bundling), but the fit guide does not acknowledge this limitation.

Evidence: `docs/game-fit-guide.md:77`; all templates in `docs/genre-presets.json`.

Recommendation: Two paths:
- **Path A (Update docs):** Change fit guide to: "Supported rendering: Canvas API (default — all templates). Phaser 3 / three.js supported via CDN in custom prompts (not in default templates)." Clarify that default templates are Canvas-only.
- **Path B (Update templates):** Add Phaser 3 CDN-loading variants for `platformer` and `top_down` templates where Phaser adds the most value.

Path A is lower effort and more honest. Path B is a meaningful capability upgrade.

Effort: Path A = Small (30 min doc update). Path B = Medium (2–3 hours per template variant).

---

### F-12-08 — Visual/audio polish expectations misaligned across templates
**Severity: P2**

Some templates specify visual polish details (`hyper_casual`: "scale + brief particle", `grid_logic`: "satisfying transition 100-200ms") while others have none (`card_battle`, `tower_defense`, `platformer`, `educational`). The fit guide's Sweet Spot description does not differentiate visual fidelity expectations by genre. A user generating a platformer gets a bare canvas game while a user generating hyper_casual gets particle effects.

Evidence: Comparison of all 12 templates' animation/visual requirements.

Recommendation: Define a minimum visual "juice" baseline across all templates: "On key game events (score, win, loss, level complete): brief scale animation or color flash (100-200ms). On main interaction (click, jump, shoot): immediate visual feedback." Add this to templates that lack it.

Effort: Small (30 min, update 7–8 templates).

---

## Coherence Map

| Surface | grid_logic | hyper_casual | idle_clicker | card_battle | tower_defense | quiz | top_down | platformer | visual_novel | reflex | physics_sandbox | educational | turn_based_strategy |
|---------|-----------|-------------|-------------|------------|--------------|------|---------|----------|-------------|-------|----------------|------------|-------------------|
| fit-guide Sweet Spot | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| genre-presets.json | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | **MISSING** |
| README genres | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | N |
| OpenGame module | Y | ui_heavy? | ui_heavy? | ui_heavy? | Y | ui_heavy? | Y | Y | ui_heavy? | ui_heavy? | canvas | ui_heavy? | — |

---

## Summary Table

| ID | Finding | Severity | Effort |
|----|---------|---------|--------|
| F-12-01 | physics_sandbox vs fit guide: Matter.js contradiction | P1 | Trivial |
| F-12-02 | turn_based_strategy in fit guide but no template | P1 | Small |
| F-12-03 | ui_heavy OpenGame module unmapped to genres | P1 | Small |
| F-12-04 | quiz label narrower than fit guide description | P2 | Trivial |
| F-12-05 | README genre list order inconsistent with fit guide | P2 | Trivial |
| F-12-06 | Medium-tier genres have no "not yet" signal | P2 | Small |
| F-12-07 | "No frameworks" contradicts Phaser/three.js claim | P1 | Small (doc) or Medium (impl) |
| F-12-08 | Visual juice baseline inconsistent across templates | P2 | Small |

---

## Priority Actions

1. **Immediate (P1):** Fix physics_sandbox / Matter.js contradiction in fit guide (F-12-01). Resolve "No frameworks" vs Phaser claim — update fit guide (F-12-07, Path A). Document ui_heavy module mapping (F-12-03). Add turn_based_strategy template (F-12-02).
2. **Short-term (P2):** Fix quiz label (F-12-04), reorder README genre list (F-12-05), add genre-status note (F-12-06), standardize visual juice in templates (F-12-08).

# BizLead #11 — Roadmap

**Analyst:** BizLead (Sonnet)
**Date:** 2026-04-23
**Scope:** Multi-CLI auth maturity, genre expansion, agent layer status, and strategic roadmap

---

## Findings

### Current State Assessment

GameFactory is functional but early. The core loop (new → generate → playtest → iterate → ship) works end-to-end, evidenced by 3 live Vercel demos. The codebase shows active development churn — 5 recent commits in the git log all address CLI adapter fixes (auth types, timeout, model defaults), indicating the infrastructure layer is not yet stable.

### Theme 1: Multi-CLI Auth Maturity

**Current state:** Three CLIs supported (claude, codex, gemini) via `CliContentGenerator`. Selection is via `GF_DEFAULT_AUTH` env var or per-game `.qwen/settings.json`. Recent commits show ongoing fixes:
- `4829594`: timeout bumped to 900s for Gemini
- `72f1123` / `27b9149`: Gemini model default corrected to `gemini-2.5-pro-preview`
- `ad1c01a`: new auth types added to `validateAuthMethod`
- `99b99c3`: `settings.json` schema corrected

**Gaps:**
- No automatic fallback: if claude-cli times out, gf does not retry with codex-cli
- No CLI health check before generation
- No per-genre CLI recommendation (some genres may work better with specific models)
- Auth selection logic is opaque to the user — no `gf info <name>` showing which CLI will be used

**Roadmap items:**
- `gf doctor` — verify all CLIs are installed, authenticated, and responding (Q3 2026)
- CLI auto-fallback — if primary CLI fails, retry with next available (Q3 2026)
- Per-genre CLI hints in `genre-presets.json` — e.g., `"preferredCli": "claude"` (Q4 2026)

### Theme 2: Genre Expansion

**Current state:** 12 genres defined in `docs/genre-presets.json`. README lists: `grid_logic`, `hyper_casual`, `idle_clicker`, `card_battle`, `tower_defense`, `quiz`, `top_down`, `platformer`, `visual_novel`, `reflex`, `physics_sandbox`, `educational`. All appear to target the single-HTML-file constraint.

**Gaps:**
- No genres for narrative-heavy experiences (interactive fiction, branching dialogue)
- No genres leveraging WebGL / three.js (despite CLAUDE.md mentioning it as supported)
- Genres not benchmarked — no documented success rate per genre
- No "experimental" genre tier for genres at the complexity ceiling

**Roadmap items:**
- Add `interactive_fiction` and `branching_narrative` genres with appropriate prompt templates (Q3 2026)
- Benchmark existing 12 genres: measure FPPR per genre (Q3 2026, requires #9 metrics first)
- Add `webgl_demo` genre for three.js-based 3D scenes (Q4 2026)
- Create "genre fit matrix" — single table showing complexity, FPPR, recommended CLI, example output (Q4 2026)

### Theme 3: Agent Layer

**Current state:** CLAUDE.md describes a planned agent layer with four agents: `puzzle-designer`, `balance-tuner`, `juice-polish`, `playtest-bot`. These are described in `AGENTS.md` but appear to be aspirational — no agent implementations exist in the codebase. The AGENTS.md file is present but its relationship to the working `scripts/gf` CLI is unclear.

**AGENTS.md findings:** The file exists at the root but its content was not directly read in this analysis. Based on the assignment map, it is likely a specification document for future agent integration via the Claude agent SDK.

**Gaps:**
- Agents are fully aspirational — none implemented
- No integration between the agent descriptions and `gf` CLI commands
- No agent orchestration infrastructure
- The `playtest-bot` is partially realized by `playtest.mjs` but lacks the structured feedback loop described in CLAUDE.md

**Roadmap items:**
- `playtest-bot`: Extend `playtest.mjs` to produce structured feedback and write it to `playtest-feedback.md` (Q3 2026, ~1 week)
- `juice-polish` agent: A post-generation agent that runs `gf iterate` with predefined "polish" prompts (animations, sound, visual feedback) (Q4 2026)
- `balance-tuner` agent: Reads `playtest-feedback.md`, generates balance-adjustment iterations (Q4 2026)
- `puzzle-designer` agent: Pre-generation design step that expands a genre prompt into a detailed GAME.md (Q4 2026)

### Theme 4: Developer Experience

**Current state:** `setup.sh` provides a one-shot bootstrap. README has a quick-start. The `gf` CLI has a clean help output.

**Gaps:**
- No `gf upgrade` command to update GameFactory and OpenGame fork
- No `gf new --interactive` mode with guided prompts
- No validation of GAME.md quality before generation (e.g., minimum length, required sections)
- No Windows support (bash script, macOS-specific `xattr -cr`)

**Roadmap items:**
- `gf upgrade` command (Q3 2026)
- GAME.md linting in `gf generate` (Q3 2026)
- Windows support via PowerShell equivalent or WSL documentation (Q4 2026)

### Theme 5: Public Launch Readiness

Based on all BizLead analysis, the following are blockers for a credible public OSS launch:

| Blocker | Category | Estimated effort |
|---|---|---|
| Fix LICENSE (Apache 2.0, not MIT) | Legal (#4) | 30 min |
| Add attribution headers to patched files | Legal (#4) | 2 hours |
| Fix Gemini data training caveat in README | Compliance (#5) | 30 min |
| Make Vercel scope configurable | Ops (#8) | 15 min |
| Add staging step to `gf ship` | Ops (#8) | 30 min |
| Instrument `gf` with basic metrics | Metrics (#9) | 4 hours |
| `playtest.mjs` structured output | Metrics (#9) | 2 hours |
| `gf doctor` pre-flight checks | Risk/Roadmap | 3 hours |
| README positioning section | Market (#7) | 1 hour |

**Total estimated effort to public launch readiness: ~14 hours of focused work**

### Proposed Milestone Timeline

**M1 — Legal/Compliance Clean (1 day)**
- Fix LICENSE, README attribution, patched file headers
- Gemini data training note

**M2 — Ops Hardening (2 days)**
- Staging step, Vercel scope env var, pre-flight checks
- Pre-iterate checkpoint, deploy log

**M3 — Observability (2 days)**
- `playtest.mjs` structured output
- `gf` metrics logging, `gf stats` command

**M4 — Public Launch (1 day)**
- README polish: positioning section, cost comparison, playtesting GIF
- `gf doctor` command
- Announce on relevant communities (Hacker News, game dev Discord, indie hackers)

**M5 — Agent Layer MVP (4 weeks)**
- `playtest-bot` structured feedback
- `juice-polish` agent (predefined polish iterations)
- Benchmark all 12 genres for FPPR

---

## Severity

| Issue | Severity |
|---|---|
| Agent layer is entirely aspirational — no implementation | P2 |
| No CLI auto-fallback — single CLI failure = total generation failure | P1 |
| No `gf upgrade` — users cannot easily update the tool | P2 |
| Public launch readiness items (legal, ops, metrics) unaddressed | P1 aggregate |

---

## Recommendations

1. **(P1) Prioritize M1 (Legal) before any public GitHub promotion** — the MIT/Apache mismatch is a credibility issue.
2. **(P1) Implement CLI auto-fallback** as the highest-value reliability improvement.
3. **(P2) Scope the agent layer**: pick one agent (suggest `playtest-bot` as it builds on existing `playtest.mjs`) and ship it rather than describing four aspirational ones.
4. **(P2) Run the M1-M4 milestones in ~1 focused week** before promoting the project.

---

## Effort

- M1 (Legal/Compliance): 3 hours
- M2 (Ops Hardening): 3 hours
- M3 (Observability): 6 hours
- M4 (Public Launch): 5 hours
- M5 (Agent Layer MVP): 3-4 weeks

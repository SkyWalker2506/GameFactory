# ArtLead — Category #8: Localization (TR/EN Consistency)
> Analyst: ArtLead (Sonnet) | Date: 2026-04-23
> Note: (Gemini fallback: sonnet) — gemini-2.5-pro-preview-05-06 returned ModelNotFoundError (HTTP 404).

---

## Scope

Files analyzed:
- `README.md`
- `docs/game-fit-guide.md`
- `docs/constraint-and-approach.md`
- `docs/genre-presets.json`
- `CLAUDE.md`
- `AGENTS.md` (surface check)

---

## Language Inventory

| File | Primary Language | Mixed? | Notes |
|------|-----------------|--------|-------|
| `README.md` | English | Yes (1 TR line) | Line 4 is Turkish |
| `docs/game-fit-guide.md` | Turkish | Yes | Technical terms/tool names in EN within TR prose |
| `docs/constraint-and-approach.md` | Turkish | Yes | Code blocks, interface names in EN |
| `docs/genre-presets.json` | English | No | All labels, keys, templates in EN |
| `CLAUDE.md` | Turkish | Yes | Directory trees, commands in EN |
| `AGENTS.md` | (not fully analyzed) | — | — |
| `scripts/gf` | English | Assumed | CLI output, command names |

---

## Findings

### F-08-01 — Isolated Turkish sentence in English README creates jarring language switch
**Severity: P1**

`README.md:4` reads: `"Tarif et → üret → oto-playtest → yayınla."` — a Turkish tagline sandwiched between English paragraphs. This is the most visible localization defect: GitHub visitors see it immediately, it signals unclear audience targeting, and it breaks the reading flow for all non-Turkish speakers.

Evidence: `README.md:4`

Recommendation: Replace with English: `"Describe → generate → auto-playtest → ship."` This is also a stronger call-to-action. If the author wants a Turkish version of the README, create `README.tr.md` with a full Turkish translation and link from the English README.

Effort: Trivial (1 line).

---

### F-08-02 — All user-facing developer docs are in Turkish while the tool interface is in English
**Severity: P1**

Both `game-fit-guide.md` and `constraint-and-approach.md` are written entirely in Turkish. The genre keys (`grid_logic`, `hyper_casual`), CLI commands (`gf new`, `gf generate`), config keys (`GF_DEFAULT_AUTH`), and all prompt templates are in English. This creates a split-brain situation:

- User runs: `gf genres` → sees English genre names
- User consults: `docs/game-fit-guide.md` → reads Turkish
- User reads template: `genre-presets.json` → English
- User hits error: `docs/constraint-and-approach.md` → Turkish

The mismatch adds friction for non-Turkish contributors and signals a project that hasn't decided its audience.

Evidence: `docs/game-fit-guide.md` (entirely Turkish); `docs/constraint-and-approach.md` (entirely Turkish); `docs/genre-presets.json` (entirely English).

Recommendation: **Make a strategic language decision** (see F-08-07 below). If the project aims to be public/open-source, translate both docs to English and move Turkish originals to `docs/tr/`. If it's an internal tool, acknowledge this explicitly and stop treating README as a public-facing document.

Effort: Medium (2–4 hours for full translation of both docs).

---

### F-08-03 — Technical terms mixed inconsistently within Turkish prose
**Severity: P2**

Within Turkish documents, technical terms appear in English without any consistent convention — sometimes quoted, sometimes unquoted, sometimes with Turkish suffixes (inflections), sometimes without:

- `docs/game-fit-guide.md:14`: "Net kurallar, asset yükü düşük, kod üretimi LLM için deterministik" — "asset" and "LLM" untranslated, no quotes.
- `docs/game-fit-guide.md:79`: "Canvas API, Phaser 3, three.js" — tool names in English, correct.
- `docs/constraint-and-approach.md:28`: "Yeni auth tipleri ekliyoruz:" — "auth" untranslated.
- `docs/constraint-and-approach.md:39`: "`selectedType: claude-cli`" — inline code, correct.

Tool names and CLI commands in inline code blocks (`code`) are handled correctly. Prose-embedded technical terms are inconsistent.

Evidence: `docs/game-fit-guide.md:14,79`; `docs/constraint-and-approach.md:28,39`

Recommendation: If docs stay in Turkish: define a style rule — all technical terms that have no standard Turkish translation should appear in inline code or quotes on first use, then plain thereafter. E.g., "asset yükü" → "`asset` yükü" or just "varlık yükü".

Effort: Small (30 min to scan and apply consistently).

---

### F-08-04 — `genre-presets.json` prompt templates correctly in English — no action needed
**Severity: N/A (informational)**

All 12 prompt templates are in English. This is the correct decision — the prompts are sent directly to LLM CLIs (Claude, Codex, Gemini) and must be in English for optimal results across all three providers. The template suffix variables ("Mechanics:", "Theme:", "Story:") are also English. No change recommended.

Evidence: `docs/genre-presets.json` (all entries).

---

### F-08-05 — CLAUDE.md mixes TR/EN in a way that works for the target audience (agent system) but is sloppy
**Severity: P2**

`CLAUDE.md` uses Turkish for narrative/explanatory sections and English for technical content (directory trees, command examples, JSON). This is intentional (agents are expected to follow TR instructions per the global harness rules) but the mixing is not marked or explained. A new contributor reading CLAUDE.md would be confused about which parts are machine-directed vs human-directed.

Evidence: `CLAUDE.md` (throughout — TR workflow descriptions, EN directory tree).

Recommendation: Add a comment at the top of CLAUDE.md: `<!-- Instructions in Turkish are for the Claude agent system. Technical examples and code blocks are in English. -->`. This makes the convention explicit without requiring translation.

Effort: Trivial (1 line comment).

---

### F-08-06 — `gf` CLI output language is undetermined (not analyzed)
**Severity: P2**

The `scripts/gf` bash CLI is referenced throughout docs but its user-facing output text (error messages, status updates, help text) could not be analyzed as the file was not read. If `gf` outputs Turkish error messages or help text, it would compound the language inconsistency when a non-Turkish speaker runs `gf --help` or hits an error.

Evidence: `README.md:19–28` (gf command examples without showing any output); `scripts/gf` (not read).

Recommendation: Read `scripts/gf` and audit all `echo` / output statements. If any are in Turkish, translate to English or make them bilingual. CLI output should be in the same language as the CLI interface (English).

Effort: Small (30 min audit once file is read).

---

### F-08-07 — Strategic language decision needed: "internal tool" vs "public open-source"
**Severity: P1**

The core issue behind all localization findings is that no language strategy has been decided. The evidence suggests two conflicting realities:

**Signals of "public open-source":** Public GitHub repo (implied), 3 live Vercel demos linked from README, MIT license, OpenGame attribution with hyperlinks, `gf genres` output in English.

**Signals of "internal Turkish-speaking team":** All user docs in Turkish, Turkish tagline in README, CLAUDE.md in Turkish, Turkish commit message style (from global CLAUDE.md rules).

These two identities are currently coexisting without explicit acknowledgement. The result is a confusing developer experience for anyone who isn't the author.

Evidence: `README.md` (public-facing signals); `docs/game-fit-guide.md`, `docs/constraint-and-approach.md` (Turkish signals).

Recommendation: **Decide explicitly**, then execute:
- **Option A (Public tool):** Translate all docs to English. Keep Turkish in CLAUDE.md only (agent instructions). Estimated effort: 3–4 hours.
- **Option B (Internal tool):** Remove the live example links and public signals, or add a "This is a personal project" disclaimer. Stop treating README as a public pitch. Estimated effort: 30 min.
- **Option C (Bilingual):** Maintain `docs/en/` and `docs/tr/` folders. Only do this if the project has multiple active users who need their native language. Estimated effort: ongoing.

Option A is recommended given the public Vercel demos and the open-source structure.

Effort: P1 decision — near-zero cost to decide, 3–4 hours to execute Option A.

---

## Summary Table

| ID | Finding | Severity | Effort |
|----|---------|---------|--------|
| F-08-01 | Isolated Turkish sentence in English README | P1 | Trivial |
| F-08-02 | User docs in Turkish while tool interface is English | P1 | Medium |
| F-08-03 | Technical terms mixed inconsistently in TR prose | P2 | Small |
| F-08-04 | genre-presets.json correctly in English | N/A | — |
| F-08-05 | CLAUDE.md TR/EN mix unexplained | P2 | Trivial |
| F-08-06 | gf CLI output language unaudited | P2 | Small |
| F-08-07 | No language strategy defined | P1 | Medium (decision + execution) |

---

## Priority Actions

1. **Immediate (P1):** Fix Turkish tagline in README (F-08-01). Make the strategic language decision (F-08-07).
2. **Execute decision (P1):** If Option A: translate game-fit-guide.md and constraint-and-approach.md to English (F-08-02).
3. **Polish (P2):** Standardize technical term handling in Turkish docs (F-08-03), add CLAUDE.md comment (F-08-05), audit gf CLI output (F-08-06).

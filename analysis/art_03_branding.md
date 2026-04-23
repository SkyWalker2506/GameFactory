# ArtLead — Category #3: Branding
> Analyst: ArtLead (Sonnet) | Date: 2026-04-23
> Note: (Gemini fallback: sonnet) — gemini-2.5-pro-preview-05-06 returned ModelNotFoundError (HTTP 404).

---

## Scope

Files analyzed:
- `README.md` (root)
- `docs/game-fit-guide.md`
- `docs/constraint-and-approach.md`
- `CLAUDE.md` (project)
- `AGENTS.md`

---

## Findings

### F-03-01 — Mixed-language tagline in README breaks brand voice
**Severity: P1**

The README opens with an English value proposition on line 3, then immediately switches to Turkish on line 4: `"Tarif et → üret → oto-playtest → yayınla."` This is the first impression for any external reader or GitHub visitor. A Turkish tagline in an otherwise English README signals either internal-only audience (which contradicts the public live examples) or careless editing. The brand voice is split before the user reads a single feature.

Evidence: `README.md:4`

Recommendation: Replace with English equivalent: `"Describe → generate → auto-playtest → ship."` or add it as a subtitle: `> Describe it → generate → auto-playtest → ship.` If the project is intended as bilingual, add a TR/EN toggle section explicitly — do not mix languages at the headline level.

Effort: Trivial (1 line).

---

### F-03-02 — Brand name appears inconsistently across files
**Severity: P2**

The project is called "GameFactory" but references vary: `GameFactory` (README), `GameFactory` (docs titles), but "game factory" appears in lowercase in some mid-sentence uses in CLAUDE.md. The compound word is also hyphenated differently in one comment block. No brand style guide exists to normalize this.

Evidence: `CLAUDE.md:2` ("oyun üretim fabrikası" — not branded), `README.md:1` (correct).

Recommendation: Define canonical form: `GameFactory` (no space, no hyphen, capitalized). Enforce in all doc headings and references. Add a note to CLAUDE.md.

Effort: Small (30 min, grep + replace).

---

### F-03-03 — Value proposition is buried and passive
**Severity: P1**

The one-sentence pitch "LLM-driven web game factory built on OpenGame — uses your subscription CLIs instead of paid API keys" is accurate but passive. It leads with technology (LLM-driven) rather than user benefit (free game generation via your existing subscriptions). The most differentiating claim — **zero extra API cost** — is not in the first sentence.

Evidence: `README.md:3`

Recommendation: Rewrite as: `"Turn natural language into playable web games — using your Claude/Codex/Gemini subscription. No API keys. No extra cost."` This front-loads the user benefit and the key differentiator.

Effort: Trivial (2–3 sentences).

---

### F-03-04 — Emoji-heavy section headers in docs are inconsistent with CLI-tool brand persona
**Severity: P2**

`game-fit-guide.md` uses emoji headers (`✅ Çok İyi Gider`, `⚠️ Orta`, `❌ Sıkıntılı`, `🎯 Başlangıç Sırası`, `🧱 Teknik Kapsam`). `constraint-and-approach.md` also uses emoji (🧩 in title). The CLI tool itself (scripts/gf) is minimal and technical. Emoji-heavy docs feel like a consumer product blog post, not developer tooling documentation. The mismatch is jarring when a developer links a colleague to the docs.

Evidence: `docs/game-fit-guide.md:7,29,43,64,74`; `docs/constraint-and-approach.md:1`

Recommendation: Strip emoji from headings. Use markdown `##` hierarchy with text-only section names. Reserve emoji for the "Live examples" table in README only (where it's already rendered nicely in GitHub).

Effort: Small (15 min, find/replace in 2 files).

---

### F-03-05 — "OpenGame" attribution inconsistent
**Severity: P2**

README credits "[OpenGame](https://github.com/leigest519/OpenGame)" correctly with a hyperlink. But `constraint-and-approach.md` refers to it as "OpenGame (leigest519/OpenGame)" inline without a link, and `game-fit-guide.md` references it only in the footer as a plain `[OpenGame]` link. The upstream relationship is a key branding element (differentiates from "we built this from scratch").

Evidence: `game-fit-guide.md:84`; `constraint-and-approach.md:7`

Recommendation: Standardize to: `[OpenGame](https://github.com/leigest519/OpenGame)` everywhere. Add a one-line "Built on" section in README just above License.

Effort: Trivial.

---

### F-03-06 — No stated target audience in any document
**Severity: P1**

None of the public-facing docs state who this is for. Is it for solo developers? Game jams? Agencies? The implicit audience (subscription LLM users, web devs comfortable with CLI) is never made explicit. This weakens the brand positioning when potential adopters land on the repo.

Evidence: `README.md` (entire file — no "Who is this for?" section).

Recommendation: Add a 3-line "Who is this for?" section to README: "GameFactory is for developers who already subscribe to Claude, ChatGPT Plus, or Gemini Advanced and want to generate playable web games in minutes — without paying extra API fees."

Effort: Small (10 min).

---

### F-03-07 — Project identity blurred by CLAUDE.md/AGENTS.md duplication
**Severity: P2**

The assignment map notes "duplicate README vs AGENTS.md" as a tech debt item. From a brand perspective, AGENTS.md appears to define the project for an AI audience while README defines it for humans. A new human contributor opening the repo sees two partially overlapping documents without clear distinction. This dilutes the single-source-of-truth brand anchor.

Evidence: `AGENTS.md` (entire file); `README.md:44–62` (Architecture section).

Recommendation: Add a one-line header to AGENTS.md: `<!-- Machine-readable agent configuration — human docs are in README.md -->`. Do not merge them, just signal the split.

Effort: Trivial.

---

## Summary Table

| ID | Finding | Severity | Effort |
|----|---------|---------|--------|
| F-03-01 | Turkish tagline in English README | P1 | Trivial |
| F-03-02 | Brand name capitalization inconsistency | P2 | Small |
| F-03-03 | Value proposition passive, buries key differentiator | P1 | Trivial |
| F-03-04 | Emoji headers inconsistent with CLI-tool brand | P2 | Small |
| F-03-05 | OpenGame attribution not standardized | P2 | Trivial |
| F-03-06 | No target audience statement | P1 | Small |
| F-03-07 | AGENTS.md/README.md identity blurring | P2 | Trivial |

---

## Priority Actions

1. **Immediate (P1):** Fix the Turkish tagline (F-03-01), rewrite value proposition (F-03-03), add target audience section (F-03-06). Total: ~30 minutes.
2. **Short-term (P2):** Strip emoji from doc headers (F-03-04), normalize OpenGame attribution (F-03-05), normalize brand name casing (F-03-02), add AGENTS.md comment (F-03-07). Total: ~1 hour.

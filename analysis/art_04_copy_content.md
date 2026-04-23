# ArtLead — Category #4: Copy / Content
> Analyst: ArtLead (Sonnet) | Date: 2026-04-23
> Note: (Gemini fallback: sonnet) — gemini-2.5-pro-preview-05-06 returned ModelNotFoundError (HTTP 404).

---

## Scope

Files analyzed:
- `README.md`
- `docs/game-fit-guide.md`
- `docs/constraint-and-approach.md`
- `docs/genre-presets.json` (prompt labels and structure — deep analysis in #10)

---

## Findings

### F-04-01 — README missing Prerequisites section
**Severity: P1**

The Quick Start section jumps directly to `git clone` without listing prerequisites. A developer on a fresh machine needs to know: macOS assumed (xattr mentioned), Node 20+ required, npm required, one of the three subscription CLIs must be active (not just installed — the user needs an active subscription). The `setup.sh` does a Node 20 check, but there's no pre-flight checklist visible before cloning.

Evidence: `README.md:17–28` (Quick start section)

Recommendation: Add a "Prerequisites" section above Quick Start:
```
## Prerequisites
- Node 20+ (`node --version`)
- macOS (setup.sh uses `xattr`; Linux support is untested)
- Active subscription to at least one: Claude Pro/Max, ChatGPT Plus, or Gemini Advanced
- Corresponding CLI installed: `claude`, `codex`, or `gemini`
```
Effort: Small (15 min).

---

### F-04-02 — No troubleshooting section for known failure modes
**Severity: P1**

The project has known fragile steps: esbuild Gatekeeper issue (macOS), 900s timeout for Gemini, Gemini model name changes (recent commit shows "fix: default model to gemini-3-pro-preview"). None of these are documented in README or a TROUBLESHOOTING.md. A developer who hits "esbuild killed by macOS Gatekeeper" has no documented path to recovery except reading setup.sh source.

Evidence: `README.md:37` (`xattr -cr workaround for macOS Gatekeeper killing esbuild install` — mentioned but unexplained); recent commits `72f1123`, `4829594`.

Recommendation: Add a "Troubleshooting" section to README with at minimum:
1. esbuild/Gatekeeper issue + `xattr -cr` fix
2. Gemini timeout behavior (900s) and model name instability
3. "opengame command not found after setup" (npm link resolution)
4. CLI auth failure patterns per CLI type

Effort: Medium (1–2 hours to document all known issues).

---

### F-04-03 — `gf` command help text is not documented in README
**Severity: P1**

The Quick Start shows 7 `gf` subcommands (`genres`, `new`, `generate`, `playtest`, `iterate`, `ship`, `list`) but provides no flag documentation. `gf new` accepts `--genre` and `--cli` but these are only shown by example. Flags like `--yolo`, output format, and per-game override are undocumented. A user cannot discover `GF_DEFAULT_AUTH` without reading `secrets/secrets.env` comments.

Evidence: `README.md:18–29`

Recommendation: Add a "CLI Reference" section with a table of subcommands and their flags:
```
| Command | Flags | Description |
|---------|-------|-------------|
| gf new <name> | --genre, --cli | Create new game scaffold |
| gf generate <name> | — | Run LLM generation |
...
```
Or link to `gf --help` if it exists.

Effort: Medium (1 hour, requires reading scripts/gf source).

---

### F-04-04 — `docs/constraint-and-approach.md` is an internal design doc, not end-user documentation
**Severity: P2**

The constraint-and-approach doc reads as a decision journal ("why we couldn't use OpenGame out of the box"). This is valuable for contributors and future maintainers but is linked from README as if it explains user behavior ("How we solved the subscription-vs-API problem"). A new user clicking this link gets a historical design rationale, not usage guidance.

Evidence: `README.md:84` ("How we solved the subscription-vs-API problem: docs/constraint-and-approach.md"); `docs/constraint-and-approach.md` (entire file — uses first-person plural "bizim durumumuz", has a timeline section "Takvim").

Recommendation: Either (a) rename and re-scope the doc as "Architecture Decision Record: CLI Adapter" with an ADR header, moving it to `docs/adr/` and removing the README link, or (b) write a new user-facing "How it works" section in README and demote constraint-and-approach to a CONTRIBUTING-level doc.

Effort: Small (30 min reframing, no new content needed).

---

### F-04-05 — `docs/game-fit-guide.md` mixes Turkish content with English-audience signals
**Severity: P1**

The fit guide is the most developer-useful reference document — it's what a user consults when choosing a genre. But it's entirely in Turkish, while the genre keys in `genre-presets.json` and `gf genres` output are in English. A developer using `gf genres` sees `grid_logic` and checks the fit guide — but the fit guide lists "Grid Puzzle" with Turkish explanation columns ("Neden Uygun", "Örnek"). The mapping is guessable but not seamless.

Evidence: `docs/game-fit-guide.md:13–27` (table headers); `docs/genre-presets.json` (all keys and labels in English).

Recommendation: Translate `game-fit-guide.md` to English. The technical content (engine names, genre taxonomy) is already in English within the Turkish prose; full translation is straightforward. Alternatively, add English headers alongside Turkish in the tables.

Effort: Medium (1–2 hours full translation, or 30 min for table headers only).

---

### F-04-06 — Timeline section in constraint-and-approach.md is outdated
**Severity: P2**

`docs/constraint-and-approach.md` contains a "Takvim" (Timeline) section listing 4 phases starting with "Aşama 1 (bugün): CliContentGenerator scaffold + claude CLI adapter". All 4 phases are complete (the project has 3 live games and 3 working CLI adapters). The stale timeline misleads future contributors about project maturity.

Evidence: `docs/constraint-and-approach.md:90–98`

Recommendation: Remove the Takvim section entirely, or replace with a "Status" section noting what's implemented vs what's planned.

Effort: Trivial (delete 8 lines, add 3-line status note).

---

### F-04-07 — Live example URLs in README are likely to rot
**Severity: P2**

The README links to 3 Vercel preview URLs (non-production: `skywalker2506s-projects.vercel.app` subdomain with build hash in path). These are preview deployments, not production URLs, and will expire or break when Vercel cleans up old deployments.

Evidence: `README.md:9–13` (Live examples table — all three URLs contain deployment hashes like `p6v5luyaq`, `2i0dvztg2`, `bpxz8ttjy`).

Recommendation: Replace with stable production URLs after `gf ship` to a named Vercel project (no hash suffix), or add a note "links may be preview builds — run `gf ship` to deploy your own."

Effort: Small (requires re-running `gf ship` for each demo game with a production alias).

---

### F-04-08 — No "Contributing" or "Development" section
**Severity: P2**

The project forks OpenGame and patches it with CliContentGenerator. A developer who wants to add a fourth CLI adapter or a new genre template has no guidance. The assignment map notes CONTRIBUTING/LICENSE are only in the upstream fork, not in the meta-project.

Evidence: `README.md` (no Contributing section); `00_assignment_map.md:63` ("CONTRIBUTING/LICENSE in upstream fork only; meta has none").

Recommendation: Add a minimal Contributing section to README:
```
## Contributing
- New CLI adapter: see `factory/opengame/packages/core/src/core/cliContentGenerator/`
- New genre: add entry to `docs/genre-presets.json` and update `gf genres` output
- Fork maintenance: `factory/opengame` tracks upstream leigest519/OpenGame; patch surface is [...]
```

Effort: Medium (1 hour, requires reading CliContentGenerator source).

---

## Summary Table

| ID | Finding | Severity | Effort |
|----|---------|---------|--------|
| F-04-01 | No Prerequisites section | P1 | Small |
| F-04-02 | No Troubleshooting section for known failures | P1 | Medium |
| F-04-03 | gf CLI flags undocumented | P1 | Medium |
| F-04-04 | constraint-and-approach is internal doc presented as user doc | P2 | Small |
| F-04-05 | game-fit-guide.md in Turkish while genre keys are English | P1 | Medium |
| F-04-06 | Stale timeline section in constraint-and-approach.md | P2 | Trivial |
| F-04-07 | Live example URLs use ephemeral Vercel preview hashes | P2 | Small |
| F-04-08 | No Contributing/Development section | P2 | Medium |

---

## Priority Actions

1. **Immediate (P1):** Add Prerequisites, Troubleshooting, and CLI Reference sections to README (F-04-01, F-04-02, F-04-03). Translate or add English headers to game-fit-guide.md (F-04-05). Total: ~4 hours.
2. **Short-term (P2):** Reframe constraint-and-approach.md as ADR (F-04-04), remove stale timeline (F-04-06), fix live example URLs (F-04-07), add Contributing section (F-04-08). Total: ~2 hours.

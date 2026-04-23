# GameFactory — Sprint Plan
**Generated:** 2026-04-23  
**Source:** MASTER_ANALYSIS.md (42 reports, 20 top actions, 11 P0 blockers)  
**Capacity:** ~25 SP / sprint · 2-week sprints · 1 person

---

## Sprint 1 — Security & Legal (P0 Blockers)
**Goal:** Public-launch-safe minimum · Close B1–B7 · ~8 person-days · 22 SP

### GF-S1-01: Remove --yolo default from scripts/gf
- Priority: P0
- Effort: S (1 SP)
- Labels: security
- Verify: `grep '\-\-yolo' scripts/gf | wc -l` → 0; `GF_YOLO=1 ./scripts/gf generate test` succeeds; without flag, generate prompts for confirmation
- Depends: []
- Wave: 1

### GF-S1-02: Add root LICENSE file + fix MIT/Apache claim
- Priority: P0
- Effort: S (1 SP)
- Labels: legal
- Verify: `ls LICENSE` → exists; `grep "Apache" LICENSE` → present; `grep "MIT" README.md:88` → corrected
- Depends: []
- Wave: 1

### GF-S1-03: Validate $name + $auth inputs in scripts/gf
- Priority: P0
- Effort: XS (0.5 SP)
- Labels: security
- Verify: `./scripts/gf new "../../.ssh/evil" 2>&1 | grep "invalid"` exits non-zero; `./scripts/gf new "valid-game" --cli invalid 2>&1 | grep "must be"` exits non-zero
- Depends: []
- Wave: 1

### GF-S1-04: Default gh repo create to --visibility private in gf ship
- Priority: P0
- Effort: S (1 SP)
- Labels: security, ops
- Verify: `grep -- '--visibility private' scripts/gf` → present; `grep 'GF_VERCEL_SCOPE' scripts/gf` → reads from env; `grep '|| true' scripts/gf | wc -l` → 0
- Depends: [GF-S1-01]
- Wave: 2

### GF-S1-05: Narrow xattr in setup.sh to esbuild binary only
- Priority: P0
- Effort: XS (0.5 SP)
- Labels: security
- Verify: `grep 'xattr' scripts/setup.sh` → targets only `node_modules/@esbuild/darwin-*/bin/esbuild`, not `-cr .`
- Depends: []
- Wave: 1

### GF-S1-06: Externalize hard-coded git identity + Vercel scope
- Priority: P0
- Effort: XS (0.5 SP)
- Labels: security, ops
- Verify: `grep 'musabkara1990' scripts/gf | wc -l` → 0; `grep 'GF_GIT_EMAIL' scripts/gf` → present; running gf ship without env vars prints clear error
- Depends: []
- Wave: 1

### GF-S1-07: Add pre-ship HTML linter with CSP injection
- Priority: P0
- Effort: M (3 SP)
- Labels: security
- Verify: `node scripts/lint-html.mjs games/smoke-test/src/index.html` exits 0; inject crafted base64 blob → exits non-zero; `grep "Content-Security-Policy" games/smoke-test/src/index.html` → present after lint pass
- Depends: [GF-S1-01]
- Wave: 2

### GF-S1-08: Fix Gemini adapter -p - stdin bug in cliContentGenerator.ts
- Priority: P0
- Effort: S (1 SP)
- Labels: arch
- Verify: `gf generate <game> --cli gemini` produces non-empty index.html; `grep "\-p '\-'" factory/opengame/packages/core/src/cliContentGenerator.ts | wc -l` → 0
- Depends: []
- Wave: 1

### GF-S1-09: set -euo pipefail in scripts/gf + scripts/setup.sh
- Priority: P1
- Effort: S (1 SP)
- Labels: ops
- Verify: `head -3 scripts/gf | grep 'set -euo pipefail'` → present; `head -3 scripts/setup.sh | grep 'set -euo pipefail'` → present; deliberate bad command in gf → exits non-zero immediately
- Depends: []
- Wave: 1

### GF-S1-10: Atomic output write in scripts/gf
- Priority: P1
- Effort: S (1 SP)
- Labels: ops
- Verify: `kill -9 <opengame_pid>` during generation → no partial index.html committed; valid generation → index.html > 500B
- Depends: [GF-S1-09]
- Wave: 2

### GF-S1-11: Playwright network allowlist + bounded timeout in playtest.mjs
- Priority: P1
- Effort: S (1 SP)
- Labels: security, perf
- Verify: `node scripts/playtest.mjs games/smoke-test` completes in <30s; inject external fetch in game HTML → playtest fails with "blocked request"
- Depends: []
- Wave: 1

**Sprint 1 Total: 11 tasks · 11 SP · ~8 person-days**

---

## Sprint 2 — Code Hardening + Discoverability
**Goal:** Stability + public OSS readiness · Close B8-B11 · ~8 person-days · 24 SP

### GF-S2-01: Pin global CLI versions in setup.sh
- Priority: P1
- Effort: S (1 SP)
- Labels: arch, security
- Verify: `grep '@anthropic-ai/claude-code@' scripts/setup.sh` → pinned version; `grep 'npm i -g @anthropic-ai/claude-code$' scripts/setup.sh | wc -l` → 0
- Depends: []
- Wave: 1

### GF-S2-02: Stop npm link; invoke node factory/opengame/dist/cli.js directly
- Priority: P1
- Effort: XS (0.5 SP)
- Labels: arch
- Verify: `grep 'npm link' scripts/setup.sh | wc -l` → 0; `grep 'node factory/opengame/dist/cli.js' scripts/gf` → present
- Depends: []
- Wave: 1

### GF-S2-03: Narrow secrets env inheritance in cliContentGenerator.ts
- Priority: P1
- Effort: S (1 SP)
- Labels: security
- Verify: `grep 'env:' factory/opengame/packages/core/src/cliContentGenerator.ts` → explicit allowlist; spawned process `env` does not contain `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` when not needed
- Depends: [GF-S1-01]
- Wave: 1

### GF-S2-04: Add gf doctor preflight command
- Priority: P1
- Effort: S (1 SP)
- Labels: dx
- Verify: `./scripts/gf doctor` outputs version + auth status for all 3 CLIs; missing CLI exits non-zero with install instructions; runs automatically before gf new
- Depends: [GF-S2-01]
- Wave: 2

### GF-S2-05: Convert factory/opengame to pinned git submodule
- Priority: P1
- Effort: M (3 SP)
- Labels: arch, security
- Verify: `cat .gitmodules | grep opengame` → present; `git submodule status` → shows pinned SHA; `docs/fork-maintenance.md` exists with patch inventory
- Depends: []
- Wave: 1

### GF-S2-06: Fix build bundle - use prepack + broaden staleness check
- Priority: P1
- Effort: S (1 SP)
- Labels: arch
- Verify: `npm install` in factory/opengame does NOT run bundle; `npm run build:bundle` triggers esbuild; `setup.sh` rebuilds if any .ts file is newer than dist/cli.js
- Depends: []
- Wave: 1

### GF-S2-07: Add minimum test harness (cliContentGenerator + smoke)
- Priority: P1
- Effort: M (3 SP)
- Labels: testing
- Verify: `npm test` in root exits 0 with at least 5 passing tests; `tests/smoke/genre-presets.test.mjs` validates all 12 genre templates parse correctly; CI-ready (no network calls in unit tests)
- Depends: [GF-S1-08]
- Wave: 2

### GF-S2-08: Add structured JSONL logging to scripts/gf
- Priority: P1
- Effort: S (1 SP)
- Labels: observability
- Verify: after `gf generate`, `cat games/<name>/.gf/events.jsonl | jq .` → valid JSONL with correlation ID, timestamps, exit codes; no raw CLI stdout in log
- Depends: [GF-S1-09]
- Wave: 2

### GF-S2-09: English-first README + GitHub topics + badges
- Priority: P1
- Effort: M (2 SP)
- Labels: growth, content
- Verify: `head -5 README.md` → English only, "subscription-CLI" in first 10 words; `gh repo view SkyWalker2506/GameFactory --json repositoryTopics | jq .repositoryTopics | grep ai-games` → present; 3 live demo links in README with screenshots
- Depends: []
- Wave: 1

### GF-S2-10: Add CONTRIBUTING.md + SECURITY.md + CODE_OF_CONDUCT.md
- Priority: P1
- Effort: S (1 SP)
- Labels: community, legal
- Verify: `ls CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md` → all exist; SECURITY.md has responsible disclosure email; GitHub "Community Standards" checklist → all green
- Depends: [GF-S1-02]
- Wave: 2

**Sprint 2 Total: 10 tasks · 14.5 SP · ~8 person-days**

---

## Wave Dependency Graph (Sprint 1)

```
Wave 1 (paralel): GF-S1-01, GF-S1-02, GF-S1-03, GF-S1-05, GF-S1-06, GF-S1-08, GF-S1-09, GF-S1-11
Wave 2 (paralel): GF-S1-04 (depends: S1-01), GF-S1-07 (depends: S1-01), GF-S1-10 (depends: S1-09)
```

## Wave Dependency Graph (Sprint 2)

```
Wave 1 (paralel): GF-S2-01, GF-S2-02, GF-S2-03, GF-S2-05, GF-S2-06, GF-S2-09
Wave 2 (paralel): GF-S2-04 (depends: S2-01), GF-S2-07 (depends: S1-08), GF-S2-08 (depends: S1-09), GF-S2-10 (depends: S1-02)
```

---

## Summary

| Sprint | Focus | Tasks | SP | Est. Days |
|--------|-------|-------|----|-----------|
| Sprint 1 | Security & Legal P0 | 11 | 11 | ~8 |
| Sprint 2 | Code Hardening + Growth | 10 | 14.5 | ~8 |
| **Total** | | **21** | **25.5** | **~16** |

**Public launch gate:** Sprint 1 complete → flip repo public, announce.  
**Full hardening:** Sprint 1 + Sprint 2 → stable OSS tool.

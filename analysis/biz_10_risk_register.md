# BizLead #10 — Risk Register

**Analyst:** BizLead (Sonnet)
**Date:** 2026-04-23
**Scope:** Model drift, CLI deprecation, Vercel quota, upstream fork abandonment, and other operational risks

---

## Risk Register

### R-01: Model Drift / Output Quality Regression

**Category:** Supply Chain / Quality
**Likelihood:** High (near-certain over 12 months)
**Impact:** High — game generation quality degrades silently
**Severity:** P0

**Description:** The three subscription CLIs (Claude Code, Codex, Gemini) are backed by LLMs that are continuously updated by their providers. Model updates can change output style, token count, verbosity, code quality, and adherence to the game-generation prompts. A model update that makes Claude more conservative about generating long files (e.g., splitting into multiple files) could break the single-HTML-file output contract that OpenGame's Debug Skill depends on.

Recent evidence: Commit `72f1123` and `27b9149` show the Gemini default model was already changed (`gemini-3-pro-preview`) — indicating active model churn.

**Current mitigation:** None. No version pinning of models in `.qwen/settings.json`. No regression test suite.

**Recommended mitigations:**
- Pin model versions in `~/.qwen/settings.json` and per-game `.qwen/settings.json` (e.g., `"model": "claude-sonnet-4-6"`)
- Define a regression test: run `gf generate smoke-test` on a known prompt, run `gf playtest`, assert pass. Run weekly.
- Monitor provider changelogs / model deprecation notices

---

### R-02: CLI Deprecation or Breaking Changes

**Category:** Infrastructure / Dependency
**Likelihood:** Medium (CLI APIs change with each major release)
**Impact:** High — entire generation pipeline breaks
**Severity:** P1

**Description:** The `CliContentGenerator` wraps `claude -p --output-format json`, `codex`, and `gemini` CLI commands. All three are under active development. Breaking changes observed already: commit `ad1c01a` added support for new CLI auth types; commit `4829594` bumped timeout to 900s to accommodate a slower CLI behavior.

A CLI update that changes the `--output-format json` schema, removes the `-p` flag, or changes the exit code behavior on timeout would silently break generation or cause `CliContentGenerator` to produce malformed responses.

**Current mitigation:** Partial — the `validateAuthMethod` patch in commit `ad1c01a` shows reactive fixing after CLI changes. No proactive version locking.

**Recommended mitigations:**
- Pin CLI versions in `scripts/setup.sh` (e.g., `npm i -g @anthropic-ai/claude-code@1.x.x`)
- Add a `gf doctor` command that runs each CLI with a trivial prompt and validates response shape
- Subscribe to release notes for all three CLIs

---

### R-03: Vercel Quota Exhaustion

**Category:** Infrastructure / Cost
**Likelihood:** Low (current scale), Medium (if public launch)
**Impact:** Medium — deployed games go offline or new deployments fail
**Severity:** P2

**Description:** `gf ship` deploys to a personal Vercel Hobby account (`skywalker2506s-projects`). Vercel Hobby limits: 100GB bandwidth/month, 6,000 build minutes/month. At current scale (3 games, minimal traffic) this is not a risk. However:
- If a game goes viral (e.g., a game shared on social media), bandwidth could spike
- If GameFactory is open-sourced and many users all deploy to the same scope, they would conflict
- If the Hobby plan changes pricing (Vercel has done this before), existing deployments could be affected

**Current mitigation:** None documented.

**Recommended mitigations:**
- Make Vercel scope configurable (see #8 Ops: `GF_VERCEL_SCOPE` env var)
- Add a note in README that each user should deploy to their own Vercel account
- Consider a `vercel.json` per game that sets appropriate caching headers to reduce bandwidth
- Set up Vercel usage alerts at 80% of limits

---

### R-04: Upstream OpenGame Fork Abandonment

**Category:** Dependency / Open Source
**Likelihood:** Medium (project is early, community unclear)
**Impact:** High — bug fixes, security patches, and new features must be self-maintained
**Severity:** P1

**Description:** `factory/opengame` is a fork of `leigest519/OpenGame`. If the upstream is abandoned or goes dormant, GameFactory must self-maintain the full Qwen-Code derived stack — a significant engineering burden for a solo project. The upstream is at version 0.6.0 (pre-1.0), indicating it is still maturing. The LICENSE credits Google LLC and Qwen, suggesting potential corporate backing, but the GitHub account `leigest519` is an individual.

Conversely, if upstream becomes very active, maintaining the fork divergence (the `CliContentGenerator` patch + new AuthTypes) becomes a continuous rebase burden.

**Current mitigation:** None. No documented merge/rebase strategy.

**Recommended mitigations:**
- Attempt to upstream the `CliContentGenerator` and new AuthTypes as a PR to `leigest519/OpenGame`. If merged, GameFactory no longer needs to maintain the fork — it becomes a pure configuration layer.
- If upstream is non-responsive, document the fork strategy and patch surface in `docs/fork-strategy.md`
- Watch upstream via GitHub Watch + release notifications
- Evaluate quarterly: is the fork worth maintaining vs switching to API-based generation

---

### R-05: Secrets Exposure

**Category:** Security
**Likelihood:** Low (gitignored), but consequence is severe
**Impact:** Critical — API key or subscription credentials leaked
**Severity:** P0 (consequence-weighted)

**Description:** `secrets/secrets.env` is gitignored and contains API keys and auth credentials. The `gf` script sources it via `set -a`. Risks:
- Accidental `git add secrets/` — the `.gitignore` must be correctly configured
- Secrets echoed in verbose/debug logs from opengame or CLIs
- `secrets/` symlinked to `~/Projects/claude-config/claude-secrets/` which is a separate repo — cross-repo exposure possible

**Current mitigation:** `.gitignore` (assumed — not verified in this analysis). SecLead is assigned this as a primary finding.

**Recommended mitigations:** (deferred to SecLead #1)

---

### R-06: LLM Provider Subscription Price Increase

**Category:** Business / Cost
**Likelihood:** Medium (subscription prices have increased historically)
**Impact:** Low (cost-pass-through to user in OSS model)
**Severity:** P3

**Description:** If Claude Pro, ChatGPT Plus, or Gemini Advanced prices increase, users of GameFactory bear the cost. In the OSS-tool model this is not a risk to the operator. In a hosted SaaS model, this would compress margins.

**Recommended mitigations:** None needed for OSS model. Monitor if SaaS pivot is considered.

---

### R-07: Single HTML File Output Complexity Ceiling

**Category:** Technical / Product
**Likelihood:** High (certain as genre complexity increases)
**Impact:** Medium — limits the types of games GameFactory can produce
**Severity:** P2

**Description:** The OpenGame stack targets single `index.html` output. This works well for hyper-casual, grid logic, quiz, and reflex games. Complex genres (platformer with multiple levels, RPG with save states, card battle with deck management) will push against the ~500KB practical size limit of a single HTML file and LLM context windows. As genre ambitions increase, the single-file constraint becomes a ceiling.

**Recommended mitigations:**
- Document the complexity ceiling clearly in `docs/game-fit-guide.md`
- For complex genres, explore multi-file output via OpenGame's Vite template path (not currently used in `gf`)
- Consider a `--template vite` flag for `gf generate` that produces a proper multi-file project

---

### R-08: Playwright Version Lock / Headless Browser Compatibility

**Category:** Infrastructure / Testing
**Likelihood:** Low-Medium
**Impact:** Medium — automated playtest breaks
**Severity:** P2

**Description:** `playtest.mjs` uses Playwright `^1.59.1`. Playwright requires downloading a browser binary on install. If a macOS update changes WebKit/Chromium behavior, or if Playwright's headless mode changes, playtests may produce false positives or fail to run. The `xattr -cr` workaround in `setup.sh` for macOS Gatekeeper is already a sign of platform-specific fragility.

**Recommended mitigations:**
- Pin Playwright to an exact version (`"playwright": "1.59.1"`) rather than `^`
- Test `gf playtest` in CI (GitHub Actions) on each commit

---

## Risk Summary

| ID | Risk | Likelihood | Impact | Severity | Owner |
|---|---|---|---|---|---|
| R-01 | Model drift / output regression | High | High | P0 | CodeLead |
| R-02 | CLI breaking changes | Medium | High | P1 | CodeLead |
| R-03 | Vercel quota exhaustion | Low | Medium | P2 | BizLead |
| R-04 | Upstream fork abandonment | Medium | High | P1 | CodeLead |
| R-05 | Secrets exposure | Low | Critical | P0 | SecLead |
| R-06 | Provider price increase | Medium | Low | P3 | BizLead |
| R-07 | Single-file complexity ceiling | High | Medium | P2 | CodeLead |
| R-08 | Playwright fragility | Low | Medium | P2 | CodeLead |

---

## Recommendations

1. **(P0) Pin model versions** in default `~/.qwen/settings.json` generation
2. **(P0) SecLead to verify secrets gitignore** and no log echo of secrets
3. **(P1) Attempt to upstream CliContentGenerator** to reduce fork maintenance burden
4. **(P1) Add `gf doctor` command** to verify CLI versions and response shape
5. **(P2) Make Vercel scope configurable** via env var
6. **(P2) Pin Playwright to exact version** in `package.json`

---

## Effort

- Model version pinning: 1 hour
- `gf doctor` command: 3 hours
- Upstream PR attempt: 4 hours
- Vercel scope env var: 15 minutes
- Playwright pin: 5 minutes

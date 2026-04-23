# GameFactory — Master Analysis

**Author:** Master Analyst (Opus 4.7)
**Date:** 2026-04-23
**Scope:** Meta-project only (`factory/opengame/` fork, `scripts/gf`, `scripts/playtest.mjs`, `scripts/setup.sh`, `docs/`, root `README.md` / `CLAUDE.md` / `AGENTS.md`). Games under `games/` excluded.
**Inputs:** 42 category reports from 5 Lead departments (Art, Code, Growth, Biz, Sec) + A1 assignment map.

---

## 1. Executive Summary

- **What it is:** GameFactory is a bash-orchestrated fork of OpenGame (Qwen-Code derivative) that routes game-generation prompts through three subscription CLIs (Claude Code / Codex / Gemini) via a new `CliContentGenerator` adapter, auto-playtests the output with Playwright, and ships the result to a public Vercel URL.
- **Maturity:** Early-functional prototype. Working end-to-end (3 live demos), but zero test suite, no CI, unpinned dependencies, identity/scope hard-coded to the author, and a forked upstream tree with no sync policy.
- **Dominant risks (converged):** (a) `--yolo` default everywhere — arbitrary code execution via prompt injection on the host with full access to secrets, SSH keys, and OAuth tokens; (b) LLM output is auto-deployed to a public Vercel URL with no content filter or CSP; (c) License misrepresentation (README claims MIT for an Apache-2.0 derivative, no LICENSE file at root).
- **Highest-ROI single action:** Remove `--yolo` as default in `scripts/gf:69` and `scripts/gf:80` and gate behind an opt-in `GF_YOLO=1` / `--unsafe` flag. This single change collapses the blast radius of the top 4 P0 security findings (secret exfil, persistence, supply-chain pivot, HTML payload injection) from "one prompt = full compromise" to "user must opt in per run."
- **Second-highest-ROI:** Add root `LICENSE` (MIT + Apache-2.0 dual), correct README license claim, and set `gh repo create` default to `--visibility private`. Legally unblocks public release and removes the immediate GDPR/reputation tail-risk of auto-public repos.
- **Operational debt is concentrated in scripts/gf and setup.sh** — both are 100–150 lines of bash that carry every cross-cutting risk (validation, auth, sandbox, secrets, deploy, ship). A one-week hardening sprint against these two files yields disproportionate gains.
- **Launch-readiness verdict:** **NOT PUBLIC-LAUNCH-SAFE.** Safe for private/personal use only. Public OSS release should wait until P0 legal + P0 security items are closed (estimated 2 working weeks).

---

## 2. Cross-Cutting Insights

Findings that recur in 3+ Leads, converged into single insights with full blast radius.

### CX-1: `--yolo` is the keystone risk — cited by Sec #1/#3/#4/#8, Code #1, Biz #5/#10
`scripts/gf:69` and `scripts/gf:80` unconditionally pass `--yolo` to the subscription CLI. This flag auto-approves every tool call (shell exec, file read/write, web fetch). Impact cascades through:
- **Sec #1 (Secrets)** — CLI can `cat ~/.ssh/id_rsa`, `~/.aws/credentials`, `~/.claude/auth.json`, and the entire `process.env` inherited via `set -a`.
- **Sec #3 (Prompt Injection)** — any attacker-controlled GAME.md text causes arbitrary tool execution.
- **Sec #4 (Sandbox)** — OpenGame's own Docker sandbox exists (`sandboxConfig.ts:31-70`) but is never invoked; `GEMINI_SANDBOX` is unset.
- **Sec #8 (Output Safety)** — resulting exfil payloads land in `index.html` that `gf ship` auto-publishes.
- **Code #1 Architecture** — marks `--yolo` as P0 architectural flaw ("trusted workspace invariant is fictional").
- **Biz #5 Compliance** — `--yolo` combined with auto-publish derivative content raises provider ToS concerns.
- **Biz #10 R-05** — Secrets Exposure rated P0 (consequence-weighted).

**Converged fix:** remove default; require `GF_YOLO=1` env or explicit `--unsafe` flag; add `--approval-mode auto-edit` as safe default; eventually wrap in Docker or `sandbox-exec` for full isolation.

### CX-2: Auto-publish with no gate — cited by Sec #2/#6/#8, Biz #4/#8, Code #7, Growth #9
`scripts/gf:88-92` does `gh repo create --public` + `vercel deploy --prod` with `|| true` silencing GitHub errors and a fragile grep pipeline masking Vercel errors. The Vercel scope is hard-coded to `skywalker2506s-projects`. No diff review, no content scan, no confirmation prompt.
**Converged fix:** `gf ship --review` (interactive y/N with file summary); default `--visibility private`; externalize Vercel scope via `GF_VERCEL_SCOPE`; `set -euo pipefail` and remove `|| true`.

### CX-3: Hard-coded identity & scope — cited by Code #2, Sec #6, Biz #8, Tech-debt #12
`scripts/gf:89` commits as `musabkara1990@gmail.com` / `Musab Kara`; `scripts/gf:92` deploys to a personal Vercel scope. Every collaborator, every fork, every CI run inherits the author's identity. Non-portable, privacy-adjacent, and blocks any team/OSS distribution.
**Converged fix:** read `GF_GIT_EMAIL`, `GF_GIT_NAME`, `GF_VERCEL_SCOPE` from `secrets/secrets.env` skeleton; fail fast with clear message if absent.

### CX-4: License / attribution mess — cited by Biz #4, Growth #9, Tech-debt #12
README claims MIT "same as upstream," but upstream OpenGame is **Apache 2.0**. No root `LICENSE` file. No NOTICE. Patched files (`contentGenerator.ts`, `cliContentGenerator.ts`, `auth.ts`) lack Apache §4(b) modification notices. No `CONTRIBUTING.md`, no `SECURITY.md`, no `CODE_OF_CONDUCT.md`.
**Converged fix:** add root `LICENSE` (dual-license: MIT for GameFactory originals, Apache-2.0 retained for `factory/opengame/` subtree); add modification headers to 3 patched files; correct `README.md:88`.

### CX-5: Fork drift with no sync policy — cited by Code #1/#5/#12, Sec #2, Biz #10
`factory/opengame/` is a full in-tree clone (~thousands of files) with only 3 real patch files. No `upstream` remote, no pinned SHA, no `UPSTREAM.md`, no diff-review gate. `xattr -cr .` (`setup.sh:124`) recursively strips Gatekeeper quarantine from the whole tree. Any upstream malicious PR would be pulled on next `git pull` without review.
**Converged fix:** convert to pinned git submodule; narrow `xattr -d com.apple.quarantine` to specific esbuild binary only; document patch inventory in `docs/fork-maintenance.md`; try to upstream the CLI auth adapter.

### CX-6: Unpinned subscription CLIs + model IDs — cited by Code #5, Sec #2, Biz #10, Code #1
`setup.sh:41-52` installs three globally with `npm i -g` and no version. CLIs release daily (e.g., claude-code 1.0.11x); version skew silently changes prompt behavior, flag shape, and output format. Recent commits (`72f1123`, `27b9149`, `4829594`) show reactive patching after CLI breakage.
**Converged fix:** pin exact versions in `setup.sh`; add `gf doctor` that runs `<bin> --version` + a trivial prompt-probe; pin model IDs in `~/.qwen/settings.json`.

### CX-7: Mixed TR/EN content + missing LICENSE block international reach — cited by Art #3/#4/#8, Growth #7/#8/#12, Biz #7
README opens English then switches to Turkish (`README.md:4`). `docs/game-fit-guide.md` and `constraint-and-approach.md` are Turkish. No GitHub topics. No badges. Three live demos are not positioned as proof points. Differentiator ("subscription CLI, no API keys") is buried.
**Converged fix:** strategic language decision — English primary, Turkish under `docs/tr/`; add GitHub topics (`game-generator`, `claude-code`, `codex`, `gemini-cli`, `ai-games`, `vite`); rewrite README headline around the subscription-CLI differentiator; showcase the 3 live games.

### CX-8: Silent failures across the stack — cited by Code #2/#6/#7/#8
`set -e` without `pipefail`; `|| true` on `gh repo create`; `.catch(() => {})` in `playtest.mjs`; `2>/dev/null` suppressing JSON parse errors; no timeout heartbeat on 900s CLI calls. False-PASS scenarios abound: partial `index.html`, failed deploy with empty URL, playtest screenshot before game boot.
**Converged fix:** `set -euo pipefail`; atomic output (write `.tmp` then rename after size/validity check); structured JSONL logging under `games/<name>/.gf/events.jsonl`; Playwright network-request assertion + bounded total timeout.

---

## 3. Top 20 Action List

Prioritized P0 → P1 → P2. Each with file targets, severity, sources, effort, unblocks.

| # | Action | Severity | Source(s) | Effort | Unblocks |
|---|---|---|---|---|---|
| 1 | Remove `--yolo` default in `scripts/gf:69,80`; gate behind `GF_YOLO=1` env or `--unsafe` flag | P0 | Sec #1, #3, #4, #8; Code #1 | S (0.5d) | CX-1, all host-compromise scenarios |
| 2 | Add root `LICENSE` (dual MIT + Apache-2.0); fix `README.md:88` MIT claim; add modification headers to `contentGenerator.ts`, `cliContentGenerator.ts`, `auth.ts` | P0 | Biz #4, Growth #9, Code #12 | S (0.5d) | Public OSS release |
| 3 | Enforce sandbox: `export GEMINI_SANDBOX=docker` (or `sandbox-exec` on macOS) in `scripts/gf` before opengame spawn; fail fast if neither available | P0 | Sec #4 F4.1 | M (1d minimum / 1wk Docker image) | CX-1, defense-in-depth |
| 4 | Pre-ship HTML linter: parse `index.html`, enforce `<script src>` allowlist, reject base64 blobs >256 chars, reject unknown `fetch`/`WebSocket` hosts; inject strict CSP meta | P0 | Sec #8 F8.1/F8.2 | M (2-3d) | Public Vercel safety |
| 5 | Validate `$name` against `^[a-z0-9][a-z0-9-]{0,63}$` in `scripts/gf:35`; validate `$auth` against `claude\|codex\|gemini` in `scripts/gf:56` | P0 | Sec #10 F10.1, Code #2 GF-002, Sec #5 F5.2 | XS (15min) | Path-traversal / JSON injection |
| 6 | Default `gh repo create` to `--visibility private`; add `gf ship --review` interactive y/N with file list + size + URL allowlist | P0 | Sec #2 F2.5, Sec #6 F6.4, Sec #8 | S (0.5d) | CX-2, privacy + reputation |
| 7 | Externalize hard-coded identity: read `GF_GIT_EMAIL`/`GF_GIT_NAME`/`GF_VERCEL_SCOPE` from env in `scripts/gf:89,92`; add to `secrets/secrets.env` skeleton | P1 | Code #2 GF-003, Code #12, Sec #6 F6.5, Biz #8 | XS (15min) | CX-3, team/OSS use |
| 8 | `set -euo pipefail` in `scripts/gf` and `scripts/setup.sh`; remove `\|\| true` on `gh repo create`; capture `vercel deploy` output and parse URL with exit-code check | P1 | Code #2 GF-001/GF-008, Code #7 | S (0.5d) | CX-8, silent-failure class |
| 9 | Narrow `xattr -cr .` in `setup.sh:124` to target only `node_modules/@esbuild/darwin-*/bin/esbuild` with `-d com.apple.quarantine` | P1 | Sec #2 F2.2, Code #4 | XS (10min) | Gatekeeper bypass |
| 10 | Pin global CLIs to exact versions in `setup.sh:41-52` (e.g., `@anthropic-ai/claude-code@1.0.119`); pin model IDs in `~/.qwen/settings.json` | P1 | Code #5, Sec #2 F2.1, Biz #10 R-01/R-02 | S (0.5d) | CX-6, version drift |
| 11 | Drop `secrets/claude-config-secrets.env` symlink in `setup.sh:80-83`; spawn child CLI with whitelisted env (`env:{}` in `cliContentGenerator.ts:140`) instead of full inheritance | P1 | Sec #1 F1.2/F1.3 | S (0.5d) | Secret blast-radius |
| 12 | Atomic generation output in `scripts/gf`: write to `index.html.tmp`, validate size > 500B + HTML parses, then rename; reject empty/partial on `opengame` non-zero exit | P1 | Code #7 | S (0.5d) | CX-8, partial-artifact |
| 13 | Playwright network-allowlist + bounded total timeout in `playtest.mjs`; fail on any external fetch during playtest | P1 | Sec #8 F8.6, Sec #9 F9.2, Code #6 | S (0.5d) | Exfil via playtest |
| 14 | Replace `prepare: npm run bundle` with `prepack`/`build:bundle` in `factory/opengame/package.json:53`; broaden staleness check in `setup.sh:130-135` or always rebuild on setup | P1 | Code #4 | S (0.5d) | Install-time side-effects |
| 15 | Convert `factory/opengame/` to pinned git submodule; add `docs/fork-maintenance.md` with upstream base SHA + patch inventory; add `upstream` remote | P1 | Sec #2 F2.4, Code #12 P0, Biz #10 R-04 | M (1d) | CX-5, fork drift |
| 16 | Stop `npm link`-ing opengame (`setup.sh:141-143`); invoke `node factory/opengame/dist/cli.js` directly from `scripts/gf` | P1 | Sec #2 F2.3, Code #1, Code #4 | XS (20min) | Version skew across projects |
| 17 | Fix Gemini adapter in `cliContentGenerator.ts:74-78`: `['-p', '-']` is invalid (`-` is not a stdin sentinel for Gemini CLI); pass prompt as `-p <string>` or use documented stdin mode | P1 | Code #1 (P0 architecturally) | S (0.5d) | Gemini code path |
| 18 | Add `gf doctor`: `which claude/codex/gemini`, `<bin> --version`, trivial prompt-probe with short timeout; called from `validateAuthMethod` and `gf new --cli` | P1 | Code #1, Sec #5 F5.1, Biz #10 R-02 | S (0.5d) | Auth-failure UX |
| 19 | Add minimum test harness: `cliContentGenerator.test.ts`, `auth.cli.test.ts`, `tests/smoke/genre-presets.test.mjs`; replace root `package.json:9` placeholder | P1 | Code #3 | M (1-2d) | Regression safety |
| 20 | English-first README: replace line-4 Turkish tagline; move `docs/game-fit-guide.md` + `constraint-and-approach.md` to English, keep Turkish under `docs/tr/`; add GitHub topics + badges; lead headline with subscription-CLI differentiator | P1 | Art #3/#4/#8, Growth #7/#8/#12 | M (1d) | CX-7, discoverability |

---

## 4. P0 Blocker Table (all P0 findings, converged)

| # | Blocker | Converged Sources | Count | File:Line |
|---|---|---|---|---|
| B1 | `--yolo` default enables arbitrary code execution via prompt injection | Sec #1 F1.6, Sec #3 F3.1/F3.3/F3.4, Sec #4 F4.1, Code #1 Design Risk #2 | 6 | `scripts/gf:69,80` |
| B2 | LLM output auto-shipped to public Vercel with no content filter / CSP | Sec #8 F8.1/F8.2 | 2 | `scripts/gf:82-93` |
| B3 | README license misrepresentation + missing root LICENSE file (Apache-2.0 upstream claimed as MIT) | Biz #4, Growth #9 F-01, Code #12 | 3 | `README.md:88`, root `LICENSE` absent |
| B4 | `xattr -cr .` recursive Gatekeeper bypass across entire fork tree | Sec #2 F2.2, Code #4 | 2 | `scripts/setup.sh:124` |
| B5 | Forked upstream tree with no integrity gate / sync policy | Sec #2 F2.4, Code #12 (P0), Biz #10 R-04 | 3 | `factory/opengame/` |
| B6 | Unvalidated `$name` enables path-traversal (`gf new ../../.ssh/evil`) | Sec #10 F10.1, Code #2 GF-002 | 2 | `scripts/gf:35` |
| B7 | Gemini adapter `-p -` is not a valid stdin sentinel for Gemini CLI | Code #1 P0, Code #2 (validated) | 2 | `cliContentGenerator.ts:74-78` |
| B8 | Model drift — no model-version pinning; provider updates silently degrade output | Biz #10 R-01, Code #5 | 2 | `~/.qwen/settings.json` |
| B9 | Secrets exposure risk is P0 consequence-weighted (SSH keys, OAuth tokens, env vars exfiltratable via B1) | Biz #10 R-05, Sec #1 F1.6 | 2 | `scripts/gf:9-13` + `setup.sh:80-83` |
| B10 | README mixed TR/EN + no GitHub topics + no SEO — zero international discovery | Growth #7 F-01, Growth #8 F-01, Growth #12 F-01 | 3 | `README.md` |
| B11 | Structured output / `generateJson()` contract broken in CLI adapter; `embedContent()` hard-throws | Code #9 | 1 | `cliContentGenerator.ts:97,246` |

---

## 5. Effort & Cost Summary

### Effort totals (converted from S/M/L, 1 person)

| Bucket | Count | Effort Days |
|---|---|---|
| XS (≤30min) | 4 | 0.5 |
| S (0.5d) | 11 | 5.5 |
| M (1-3d) | 5 | 10 |
| **Top-20 total** | 20 | **~16 person-days** |

**Excluded:** full Docker sandbox image (~1 week, listed under action #3 as optional upgrade path), full test suite beyond smoke (Code #3 P2 items, ~1 week), full agent-layer build-out (Code #12, de-scope or defer).

### Cheapest path to "public-launch-safe"

Minimum viable set to flip from private-only → public-safe:

1. Actions #1, #2, #5, #6, #7, #9, #10 (legal + identity + yolo + path-traversal + visibility + xattr + pinning) — **~3 person-days**
2. Actions #4, #8, #12 (HTML pre-ship linter + pipefail + atomic output) — **~4 person-days**
3. Action #20 English-first README + topics — **~1 day**

**Total minimum: ~8 person-days (2 working weeks solo).** Sandbox (#3) and submodule (#15) can ship in a second wave.

### Cost dimensions

- **Security:** removing `--yolo` is zero-dollar; Docker sandbox costs 1 wk engineering + ongoing image maintenance.
- **Legal:** LICENSE + correction is zero-dollar, pure writing.
- **Infra:** no infra costs. All changes are config/code.
- **Subscription-CLI cost per game** (Biz #3): ~$0 marginal (fixed-cost subscriptions), this is the product's structural advantage.

---

## 6. Strategic Recommendation

**Recommendation: Keep private for 2 weeks, then public-launch with guardrails.**

GameFactory has a genuinely differentiated positioning — "subscription-CLI game generator, no API keys" — and three live demos proving the loop works end-to-end. The core bet (CLI adapter seam in a narrow fork) is architecturally sound per Code #1's second-pass review. However, shipping publicly **today** would expose any user who clones and runs `scripts/gf` to the `--yolo` + auto-public-deploy + hard-coded-author-identity combination, which is reckless: a single crafted GAME.md circulated on social media would compromise developer machines at scale, and the author would be the attributable deployer for every malicious game published. Legally, the MIT/Apache misrepresentation is a clean fix but a real P0 for OSS hygiene.

Two weeks of focused work on the top-20 actions (predominantly surgical edits to `scripts/gf` + `scripts/setup.sh` + adding `LICENSE` + pre-ship linter) converts this from "personal experiment" to "safe OSS tool." The Docker sandbox (action #3 full form) and forked-subtree submodule migration (action #15) can land in a second wave post-launch without blocking. After that, GrowthLead's discoverability work (topics, badges, positioning) becomes high-leverage, and the differentiator can land in a Hacker News / devtool-focused launch window.

**Decision gate for public launch:** P0 blockers B1–B7 closed + B10 (README/topics) done. B8/B11 can remain open as documented known-limitations. B9 collapses automatically once B1 is closed.

---

## 7. Appendix — All 42 Reports, One-Line Verdicts

### ArtLead (6 reports)
- **art_03_branding** — Mixed TR/EN tagline in README breaks voice on first line; brand name inconsistent. (P1)
- **art_04_copy_content** — README missing Prerequisites, Troubleshooting, CLI Reference; user-doc vs internal-doc boundary blurred. (P1)
- **art_05_asset_pipeline** — Asset pipeline is a promised-but-stub; templates compensate with "no frameworks" constraint. (P1)
- **art_08_localization** — Strategic language decision needed; Turkish in English-audience surfaces. (P1)
- **art_10_prompt_template_quality** — 11 genre templates audited; `idle_clicker`, `card_battle`, `quiz` have P1 prompt-engineering gaps. (P1)
- **art_12_art_direction_coherence** — `physics_sandbox` contradicts fit guide on Matter.js; "no frameworks" vs Phaser/three.js capability claim. (P1)

### CodeLead (11 reports)
- **code_01_architecture** — Narrow fork seam is sound; P0 `--yolo` default + Gemini adapter `-p -` bug + fictional trusted-workspace invariant. (P0)
- **code_02_code_quality** — `set -e` without pipefail, hard-coded email/scope, node -e interpolation, silent playtest PASS. (P1)
- **code_03_testing** — Zero meta-test coverage; proposes minimum harness starting with `cliContentGenerator.test.ts`. (P1)
- **code_04_build_bundle** — Staleness check watches only 3 files; `prepare` runs on every install; `sharp` externalized but not runtime-declared. (P1)
- **code_05_dependencies** — Global CLIs unpinned; nested esbuild@0.21.5 advisory in test deps; Playwright browsers not installed in setup. (P1)
- **code_06_performance** — 900s timeout with no heartbeat/idle-timeout; SIGTERM doesn't kill process group. (P1)
- **code_07_error_handling** — Partial index.html accepted as valid; `vercel deploy` pipeline failure masked; playtest false PASS. (P1)
- **code_08_observability** — No structured logs; proposes JSONL schema under `games/<name>/.gf/events.jsonl` with correlation IDs. (P1)
- **code_09_api_interface** — `generateJson()` and `embedContent()` contracts broken; fake streaming; `countTokens()` distorts session limits. (P0 latent)
- **code_10_data_state** — `GF_DEFAULT_AUTH` is setup-only (not runtime); workspace trust gate silently ignores game-level settings. (P1)
- **code_12_tech_debt** — In-tree fork with no sync policy (P0); product claims exceed implementation; root `npm test` is a placeholder. (P0)

### GrowthLead (5 reports)
- **growth_02_activation** — macOS xattr block; three CLIs required before any feedback; 900s first-run loop. (P1)
- **growth_07_seo** — No GitHub topics (P0); no badges; TR/EN mix weakens search indexing. (P0)
- **growth_08_content_strategy** — Both strategy docs Turkish = zero international demand (P0); live games not marketed. (P0)
- **growth_09_community** — No LICENSE (P0); no CONTRIBUTING, SECURITY, CoC; Discussions disabled. (P0)
- **growth_12_positioning** — Core differentiator (subscription-CLI, no API keys) not in headline; "Built on OpenGame" dilutes brand. (P0)

### BizLead (9 reports)
- **biz_01_business_model** — Ambiguous "OSS tool vs hosted SaaS" intent; strategic decision missing. (P1)
- **biz_03_unit_economics** — OSS path is ~zero marginal cost per game; hypothetical SaaS requires pricing floor analysis. (P2)
- **biz_04_legal_licensing** — README MIT claim wrong (upstream is Apache-2.0); no LICENSE; missing §4(b) modification notices. (P0)
- **biz_05_compliance** — `--yolo` + auto-publish derivative content raises ToS concerns for all three CLI providers. (P1)
- **biz_07_market_competition** — Differentiated vs Rosebud/WebSim/GDevelop AI via subscription-CLI positioning; target devtool niche. (P2)
- **biz_08_ops_process** — `gf ship` prod path has no change mgmt; hard-coded Vercel scope; no release process for GameFactory itself. (P1)
- **biz_09_metrics_kpis** — No metrics today; proposes Primary (generation quality), Secondary (ops), Tertiary (usage). (P1)
- **biz_10_risk_register** — R-01 Model Drift (P0), R-05 Secrets Exposure (P0); R-02 CLI Deprecation (P1), R-04 Fork Abandonment (P1). (P0) 
- **biz_11_roadmap** — 5-theme roadmap: multi-CLI auth maturity, genre expansion, agent layer, DX, public-launch readiness. (P1)

### SecLead (11 reports, Opus)
- **sec_01_secrets** — `--yolo` enables exfil of `~/.ssh`, `~/.aws`, env vars; symlink to claude-config-secrets amplifies blast radius. (P0)
- **sec_02_supply_chain** — `xattr -cr .` (P0); unpinned global CLIs; forked tree w/o integrity gate; `npm install` runs untrusted scripts. (P0)
- **sec_03_prompt_injection** — `--yolo` default + unscoped filesystem + unscoped egress = arbitrary code execution. (P0)
- **sec_04_sandbox** — OpenGame Docker sandbox exists but never invoked; Playwright playtest runs untrusted HTML with default perms. (P0)
- **sec_05_auth** — `validateAuthMethod` returns null for all CLI types with no preflight check; `$auth` not allowlisted. (P1)
- **sec_06_data_privacy** — File contents exfil to LLM provider via tool-use; `gh repo create --public` default publishes GAME.md. (P1)
- **sec_07_dep_cves** — Fork-wide dep graph untriaged; global CLIs outside `npm audit`; Playwright caret pin. (P1)
- **sec_08_output_safety** — No pre-ship content filter; no CSP on deployed output; playtest allows outbound fetches. (P0)
- **sec_09_network_egress** — Tool-use `fetch` has no allowlist (P0); no egress logging. (P0)
- **sec_10_filesystem** — Path-traversal via unvalidated `$name`; `~/.qwen/settings.json` clobbered; `secrets.env` world-readable perms. (P1)
- **sec_11_logging_pii** — Raw `opengame` stdout not redacted; `bodySnippet` in playtest output can contain exfiltrated secrets. (P2)

---

*End of Master Analysis — 42 reports synthesized, 20 actions prioritized, 11 P0 blockers identified, ~16 person-days to public-launch-safe.*

# A1 Assignment Map — GameFactory Meta

Scope: meta-project only — `factory/opengame` fork, `scripts/gf` + `scripts/playtest.mjs`, `scripts/setup.sh`, `docs/` (genre presets, fit guide), root `CLAUDE.md` / `AGENTS.md` / `README.md`. Individual games under `games/` are explicitly excluded.

Maturity: early but functional. A working bash CLI, a pluggable `CliContentGenerator` patched into OpenGame, Playwright-based playtest, 3 live Vercel demos. No test suite, no CI, no typed config, secrets loaded via `set -a; source`.

## Executive Notes

- Core value lives in the **generator pipeline**, not UI: `CliContentGenerator` + `scripts/gf` + `genre-presets.json` + `setup.sh`. Reliability, reproducibility, and determinism of game output are the dominant analysis axes.
- **Supply-chain / prompt-injection risk is elevated**: LLM output is dropped as `index.html` and shipped to Vercel with minimal review. GAME.md prompts are fed verbatim into CLIs that can execute tools (`--yolo`). SecLead deserves Opus.
- **Subscription-CLI coupling is the key architectural bet** (Claude/Codex/Gemini CLIs vs API keys). Analysis should stress-test auth fallbacks, timeout behavior, and CLI-version drift — recent commits already show churn here (timeout bump to 900s, Gemini model default fixes).
- **Fork maintenance debt**: `factory/opengame` is a forked Qwen-Code tree with local patches (new `AuthType`s). Rebase/merge strategy + patch surface area is a real CodeLead concern.
- **No growth/biz surface yet** — no analytics, no monetization, no user acquisition layer. GrowthLead and BizLead are mostly strategic/forward-looking, not audit-heavy.
- **Accessibility / end-user UX is N/A at meta level** — meta-project has only a CLI; per-game a11y belongs to the games sub-analysis.

## Lead Departments

### ArtLead (Sonnet)
| Category | Status | Worker | Model | Reason |
|---|---|---|---|---|
| #1 UI/UX | N/A | — | — | Meta is a bash CLI; no UI surface |
| #2 Visual Design | N/A | — | — | No design system in meta (per-game only) |
| #3 Branding | partial | brand-voice-auditor | sonnet | README/docs tone, naming of genres/presets |
| #4 Copy/Content | active | docs-copy-reviewer | sonnet | `docs/game-fit-guide.md`, `constraint-and-approach.md`, README, genre prompt templates are the product voice |
| #5 Asset Pipeline | active | asset-pipeline-analyst | sonnet | OpenGame asset providers (Tongyi/Doubao/OpenAI) wrapper plan — currently stub; worth documenting |
| #6 Motion/Juice | N/A | — | — | Per-game concern |
| #7 Audio | N/A | — | — | Per-game concern |
| #8 Localization | partial | i18n-scanner | sonnet | Mixed TR/EN in docs + CLI; consistency check |
| #9 Design Tokens | N/A | — | — | No tokens at meta level |
| #10 Prompt/Template Quality | active | prompt-template-reviewer | sonnet | `docs/genre-presets.json` is the creative core — prompt engineering audit |
| #11 Accessibility | N/A | — | — | CLI-only meta |
| #12 Art Direction Coherence | partial | genre-coherence-auditor | sonnet | Genre presets vs fit-guide alignment |

### CodeLead (Sonnet)
| Category | Status | Worker | Model | Reason |
|---|---|---|---|---|
| #1 Architecture | active | architecture-reviewer | opus | CliContentGenerator patch strategy, OpenGame fork seams, pluggability |
| #2 Code Quality | active | static-code-reviewer | sonnet | `scripts/gf` bash + `playtest.mjs` + patched TS under `factory/opengame/packages/core` |
| #3 Testing | active | test-coverage-auditor | sonnet | No meta tests; playtest only. Identify minimum smoke-test harness |
| #4 Build/Bundle | active | build-pipeline-reviewer | sonnet | `npm run bundle` + `npm link`, esbuild xattr workaround, Node 20 pin |
| #5 Dependencies | active | dep-auditor | sonnet | Forked OpenGame deps, global `npm i -g` CLIs, Playwright version lock |
| #6 Performance | partial | perf-reviewer | sonnet | CLI spawn overhead, 900s timeout, single-shot generation cost |
| #7 Error Handling | active | error-handling-reviewer | sonnet | Bash `set -e` only, no retries on CLI failure, silent `|| true` in gf |
| #8 Observability | active | logging-reviewer | sonnet | No structured logs from gf; playtest.png is the only artifact |
| #9 API/Interface | active | adapter-api-reviewer | sonnet | `ContentGenerator` contract fidelity of the CLI adapter — approx token counts, missing embeddings |
| #10 Data/State | partial | state-model-reviewer | sonnet | `.qwen/settings.json` override layering (user/project/game) |
| #11 Concurrency | N/A | — | — | Single-shot CLI, no parallelism in meta |
| #12 Tech Debt | active | debt-mapper | sonnet | Fork-drift risk, TODOs, duplicate README vs AGENTS.md |

Note: Architecture (#1) bumped to **opus** — it's the load-bearing decision surface for the whole factory.

### GrowthLead (Sonnet)
| Category | Status | Worker | Model | Reason |
|---|---|---|---|---|
| #1 Acquisition | N/A | — | — | No marketing surface |
| #2 Activation | partial | onboarding-reviewer | sonnet | `setup.sh` + README quick-start is the only onboarding |
| #3 Retention | N/A | — | — | No users tracked |
| #4 Referral | N/A | — | — | — |
| #5 Revenue | N/A | — | — | — |
| #6 Analytics | N/A | — | — | No analytics in meta |
| #7 SEO | partial | readme-discoverability | sonnet | README is the discovery surface; keywords, examples, shields |
| #8 Content Strategy | active | content-strategy-reviewer | sonnet | `docs/` as demand-gen (fit guide, constraint article) |
| #9 Community | partial | community-surface-reviewer | sonnet | CONTRIBUTING/LICENSE in upstream fork only; meta has none |
| #10 Conversion Funnel | N/A | — | — | — |
| #11 Experimentation | N/A | — | — | No A/B infra |
| #12 Positioning | active | positioning-reviewer | sonnet | "Subscription-CLI vs API" is the differentiator — sharpen messaging |

### BizLead (Sonnet)
| Category | Status | Worker | Model | Reason |
|---|---|---|---|---|
| #1 Business Model | partial | model-reviewer | sonnet | OSS tool vs hosted factory — define intent |
| #2 Pricing | N/A | — | — | No product tier |
| #3 Unit Economics | active | cost-model-reviewer | sonnet | Subscription-CLI cost per generated game; Vercel deploy cost |
| #4 Legal/Licensing | active | license-reviewer | sonnet | MIT claim in README vs upstream OpenGame license terms; forked code attribution |
| #5 Compliance | partial | tos-compliance-reviewer | sonnet | Using Claude/Codex/Gemini CLIs via subscription to generate + publish derivative content — ToS check |
| #6 Partnerships | N/A | — | — | — |
| #7 Market/Competition | active | competitive-scan | sonnet | Rosebud AI, WebSim, GDevelop AI, etc. — positioning input |
| #8 Ops/Process | partial | release-process-reviewer | sonnet | `gf ship` → Vercel prod path; no change management |
| #9 Metrics/KPIs | partial | kpi-definer | sonnet | Define "generation success rate", "first-playable pass rate" |
| #10 Risk Register | active | risk-register-builder | sonnet | Model-drift, CLI deprecation, Vercel quota, upstream fork abandon |
| #11 Roadmap | active | roadmap-reviewer | sonnet | Multi-CLI auth, genre expansion, agent layer status |
| #12 Team/Ownership | N/A | — | — | Solo project |

### SecLead (Opus)
| Category | Status | Worker | Model | Reason |
|---|---|---|---|---|
| #1 Secrets Handling | active | secrets-auditor | opus | `secrets/secrets.env` sourced via `set -a`, linked to claude-secrets; verify gitignore + no leakage in logs |
| #2 Supply Chain | active | supply-chain-auditor | opus | Global `npm i -g` of three CLIs, forked OpenGame with local patches, `xattr -cr` Gatekeeper bypass |
| #3 Prompt Injection | active | prompt-injection-auditor | opus | GAME.md → CLI `--yolo` → tool execution; attacker-controlled prompt can run arbitrary tools |
| #4 Code Execution Safety | active | sandbox-reviewer | opus | OpenGame mentions Docker sandbox but gf runs `opengame --yolo` in host; confirm isolation claim |
| #5 Auth/Authorization | partial | auth-flow-reviewer | sonnet | `selectedType: claude-cli` flow, `validateAuthMethod` patch correctness |
| #6 Data Privacy | partial | privacy-reviewer | sonnet | Prompts sent to external CLI providers; no user data at meta level |
| #7 Dependency CVEs | active | cve-scanner | sonnet | Playwright, forked OpenGame deps, bundled CLIs |
| #8 Output Safety | active | generated-code-safety-reviewer | opus | LLM-generated `index.html` shipped to Vercel prod — XSS, telemetry, malicious fetch in output |
| #9 Network Egress | partial | egress-reviewer | sonnet | CLI spawns outbound to provider APIs; playtest loads generated HTML |
| #10 Filesystem Safety | active | fs-safety-reviewer | sonnet | `gf` writes to `$GAMES/$name`, sources env files from `$HOME` paths |
| #11 Logging/PII | partial | log-pii-reviewer | sonnet | Timeout bump, debug output — any prompt echoes? |
| #12 Incident Response | N/A | — | — | No IR plan, solo project |

## Summary Table

| Lead | Active/Partial cats | Skipped (N/A) | Default Model | Notes |
|---|---|---|---|---|
| ArtLead | 6 | 6 | sonnet | Docs, prompts, genre presets focus |
| CodeLead | 11 | 1 | sonnet (+ opus for #1) | Dominant lead — generator is the product |
| GrowthLead | 5 | 7 | sonnet | Mostly strategic; README/docs as surface |
| BizLead | 8 | 4 | sonnet | Licensing + ToS + risk register are the meaningful items |
| SecLead | 11 | 1 | opus (sonnet for lower-risk cats) | Elevated priority due to `--yolo`, output shipping, supply chain |

Model budget intent: Opus only for SecLead critical categories (#1-4, #8) and CodeLead #1 (architecture). Everything else defaults to Sonnet.

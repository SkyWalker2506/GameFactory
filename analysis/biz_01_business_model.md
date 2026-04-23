# BizLead #1 — Business Model

**Analyst:** BizLead (Sonnet)
**Date:** 2026-04-23
**Scope:** Meta-project only — `scripts/gf`, `README.md`, `CLAUDE.md`, `docs/`

---

## Findings

### Current State: Ambiguous OSS Tool

GameFactory is currently positioned as a developer tool (OSS, MIT-licensed) that wraps subscription CLIs to generate web games. The README is technically oriented — it is a how-to guide for a developer audience, not a product pitch. There is no pricing page, no hosted service, no user account system, and no monetization mechanism.

The core value proposition is explicit in the README tagline: "uses **your subscription CLIs** (Claude Code, Codex, Gemini) instead of paid API keys." This is a cost-arbitrage play — the user already pays for Claude Pro / ChatGPT Plus / Gemini Advanced; GameFactory routes generation through those subscriptions instead of burning API token budgets.

### Two Competing Intents

Two distinct strategic directions are latent in the codebase, and they are not reconciled:

**Option A — OSS Developer Tool**
- GameFactory is a scaffold/wrapper that developers run locally
- Revenue model: none (or GitHub sponsorship / consulting)
- Users: indie devs, game jam participants, solo makers
- Risk: low legal exposure, high community growth potential
- Evidence: MIT license claim, `setup.sh` local install flow, no hosted infra

**Option B — Hosted Factory (SaaS)**
- GameFactory runs the CLIs on behalf of end users
- Revenue model: subscription or per-game fee
- Users: non-technical creators
- Risk: significant — see #5 Compliance; hosting subscription CLI sessions for third parties likely violates Claude/Codex/Gemini ToS
- Evidence: CLAUDE.md references "hosted factory", Vercel live demos suggest productization intent

The CLAUDE.md description ("oyun üretim fabrikası" — game production factory) and the 3 live Vercel demos suggest hosted SaaS ambition. But the current architecture (local CLI install, `setup.sh`, personal Vercel account `skywalker2506s-projects`) is 100% OSS-tool architecture.

### Missing Strategic Decision

There is no business model document, no monetization hypothesis, no pricing model, and no user acquisition strategy. This is not a blocker at current maturity (solo, pre-product) but must be decided before any public launch or funding conversation.

---

## Severity

| Issue | Severity |
|---|---|
| OSS-tool vs hosted-SaaS intent not defined | P1 |
| No monetization hypothesis | P2 |
| README positions as OSS tool but CLAUDE.md describes factory SaaS | P2 |
| No business model document exists | P2 |

---

## Evidence

- `README.md` line 88: `## License — MIT (same as upstream OpenGame)`
- `README.md` line 1: "uses **your subscription CLIs**" — implies user runs their own CLIs
- `CLAUDE.md`: "GameFactory, bir oyun üretim fabrikasıdır" — "factory" framing
- `scripts/gf ship`: deploys to `skywalker2506s-projects` Vercel scope — personal account
- No `PRICING.md`, no `BUSINESS.md`, no monetization code anywhere

---

## Recommendations

1. **(P1) Make the strategic decision explicit**: Is GameFactory an OSS developer tool or a hosted SaaS? Document it in `docs/business-model.md`. Everything else (legal, compliance, KPIs) branches from this.

2. **(P1, if OSS)**: Stay on "bring your own subscription" model. Build toward GitHub Sponsors + marketplace distribution. Keep the `gf` CLI as the primary surface.

3. **(P1, if SaaS)**: Before building hosted infra, audit ToS for all three CLIs (see #5 Compliance). The subscription-as-backend model likely requires switching to API keys for hosted use. Budget $0.05–$0.30 per game generation at GPT-4o pricing (see #3 Unit Economics).

4. **(P2)**: Add a one-paragraph "Who is this for?" section to README. Current audience (developers with subscriptions) is implicit.

---

## Effort

- Strategic decision: 1 meeting / async doc — 0 dev hours
- `docs/business-model.md`: 2 hours writing
- README rewrite for clarity: 1 hour

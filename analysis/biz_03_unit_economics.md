# BizLead #3 — Unit Economics

**Analyst:** BizLead (Sonnet)
**Date:** 2026-04-23
**Scope:** Subscription CLI cost per game generation, Vercel deploy cost, operator economics

---

## Findings

### Cost Structure

GameFactory's economics are unconventional because the primary generation cost is borne by **the user's existing subscription**, not by the operator. This is the core architectural bet.

#### Generation Cost (Subscription-CLI Model)

The user runs `gf generate <name>` which shells out to `opengame -p "$(cat GAME.md)" --yolo`. This spawns the locally installed CLI (claude, codex, or gemini) and burns against the user's subscription quota.

**Claude Pro ($20/month):** Claude Pro includes unlimited (fair-use) Claude Sonnet usage. A single game generation is a long-context, multi-turn agent session. Observed timeout in the codebase was bumped to 900 seconds (commit `4829594`). A 15-minute Claude session of moderate complexity likely uses ~50k-200k tokens. At Claude API pricing ($3/M input, $15/M output for Sonnet 4.5) that would be $0.15–$3.00 per game at API rates. Via subscription: marginal cost = $0/generation (absorbed in flat fee).

**ChatGPT Plus ($20/month) / Codex CLI:** Similar economics. GPT-4o at API rates: ~$5/M input, $15/M output. A generation at 100k tokens ≈ $0.50–$2.00. Via ChatGPT Plus subscription: $0 marginal.

**Gemini Advanced ($20/month):** Gemini 2.5 Pro. Similar ballpark.

**Effective cost per game (OSS-tool model):** ~$0 direct out-of-pocket per game, amortized across the $20/month subscription the user already pays. If a user generates 10 games/month, cost is $2/game equivalent. If 1 game, $20/game equivalent.

#### Operator Cost (If Hosted SaaS)

If GameFactory were to host generation on behalf of users (Option B from #1), economics shift dramatically:

| CLI/Model | API cost per generation (estimate) | Margin at $5/game |
|---|---|---|
| Claude Sonnet 4.6 (100k tokens) | ~$0.75–$2.50 | Thin to negative |
| GPT-4o (100k tokens) | ~$0.75–$2.00 | Thin |
| Gemini 2.5 Pro (100k tokens) | ~$0.40–$1.50 | Positive at low volume |

At hosted SaaS, you'd need to price ≥ $5/game or $30+/month subscription to have viable margins. The subscription-CLI model is not usable for hosted SaaS (ToS risk — see #5).

#### Vercel Deploy Cost

`gf ship` deploys to Vercel via `vercel deploy --prod --yes`. Each game becomes a static Vercel project under `gamefactory-<name>`.

- Vercel Hobby (free): 1 team, unlimited static deployments, 100GB bandwidth/month, 6,000 build minutes/month. For static HTML games, this is extremely generous — a single `index.html` costs ~1 build minute and near-zero bandwidth per play.
- Current setup: personal `skywalker2506s-projects` scope — likely Hobby plan.
- At 50 games deployed: still free (static, no serverless functions).
- At 500 games: bandwidth could become a concern if games go viral, but still likely within Hobby limits for indie use.
- **Vercel Pro ($20/month)**: 1TB bandwidth, 60,000 build minutes. Sufficient for hundreds of games and thousands of plays.

**Conclusion:** Vercel cost is negligible for OSS-tool model (each user deploys to their own account). Even for a hosted scenario at small scale, Vercel Hobby covers it.

#### Storage and GitHub Cost

`gf ship` creates a GitHub repo per game (`gh repo create gamefactory-<name>`). GitHub Free: unlimited public repos. No cost.

### Break-Even Analysis (OSS Tool)

There is no revenue to break even against. The operator's cost is:
- Developer time (primary cost)
- GitHub repo (free)
- Vercel Hobby (free)
- Node.js infra (free, runs locally)

Total recurring operator cost: **$0/month** at current scale.

### Break-Even Analysis (Hypothetical SaaS)

Minimum viable pricing to cover API generation at GPT-4o rates with 40% margin:
- Cost per game: ~$1.50 (50k token average, optimistic)
- Price per game: ~$2.50
- Or: $25/month subscription for 10 games/month

This is competitive with Rosebud AI pricing (~$9–$29/month). However the 900s timeout implies heavy sessions — cost may exceed the optimistic estimate.

---

## Severity

| Issue | Severity |
|---|---|
| No cost model documented — decisions made blind | P2 |
| 900s timeout implies very heavy generation sessions — actual token cost unknown | P2 |
| If SaaS pivot, subscription-CLI model incompatible; API cost model needed | P1 (if SaaS) |
| No bandwidth monitoring on Vercel | P3 |

---

## Evidence

- `scripts/gf` line: `opengame -p "$(cat GAME.md)" --yolo` — full GAME.md as prompt
- Commit `4829594`: timeout bumped to 900s — sessions are long
- `scripts/gf ship`: `vercel deploy --prod --yes --scope skywalker2506s-projects`
- `README.md`: "uses **your subscription CLIs**" — cost-pass-through to user

---

## Recommendations

1. **(P2)** Instrument generation sessions: log approximate token counts from CLI output. Build a `gf stats` command that shows generation time + estimated token cost for each game.

2. **(P2)** If considering SaaS, prototype with Gemini CLI (lowest API cost) first. Run 20 generations and measure actual token consumption before committing to pricing.

3. **(P3)** Add Vercel project tagging or a naming convention (e.g., `gf-<name>`) to make cost attribution easy if moving to a Pro plan.

4. **(P2)** Document break-even in `docs/economics.md` with real numbers from actual generations once instrumentation is in place.

---

## Effort

- Token logging in `gf`: 2–4 hours
- `gf stats` command: 4 hours
- Economics doc: 2 hours (after data collection)

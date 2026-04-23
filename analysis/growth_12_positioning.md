# Growth #12 — Positioning Analysis
> GameFactory meta-project | Forward-looking (no live users yet)

## Summary

GameFactory has a genuinely novel and defensible positioning angle: **use your existing LLM subscription (Claude Pro, ChatGPT Plus, Gemini Advanced) to generate games — no API key, no per-token cost.** This is a real differentiator against every major AI game generator (Rosebud AI, GDevelop AI, WebSim, etc.), all of which require either a paid subscription to their own platform or direct API key usage. The problem is that this positioning is currently buried in the architecture section of the README and in a Turkish-only docs file. It is not the first thing a visitor sees, hears, or remembers.

---

## Findings

### F-01 · The core differentiator is not in the headline (P0)
**Evidence:** `README.md` lines 1-4:
```
# GameFactory
LLM-driven web game factory built on OpenGame — uses your subscription CLIs (Claude Code, Codex, Gemini) instead of paid API keys.
```

The one-liner does contain the key claim ("instead of paid API keys") but it is the second half of a long sentence after "LLM-driven web game factory built on OpenGame." The average developer scanning GitHub search results reads the first 6 words. "LLM-driven web game factory" is generic — it matches Rosebud, WebSim, GDevelop AI, and dozens of others. The "no API key" angle only lands if the reader gets to the end.

**Severity:** P0 — the differentiator is present but not leading.

### F-02 · No explicit competitive context (P1)
**Evidence:** README full text — no mention of Rosebud AI, WebSim, GDevelop AI, or any competitor.

Positioning is relative. Without naming the alternative (pay-per-token API tools, SaaS game generators), the "no API key" angle has no contrast. Developers who have been burned by Rosebud's pricing or who are avoiding OpenAI API costs are the highest-intent users — but the README gives them no signal that GameFactory is specifically for them.

**Severity:** P1 — positioning requires contrast to land.

### F-03 · "Subscription CLI" is not a recognized category — needs translation (P1)
**Evidence:** README line 2, `docs/constraint-and-approach.md`.

The term "subscription CLI" is an internal framing that accurately describes the mechanism but does not match how developers think about it. Target users think in terms of: "I already pay for Claude Pro", "I have ChatGPT Plus", "I don't want to pay for API calls." The positioning should translate the mechanism into the benefit: "uses your Claude Pro / ChatGPT Plus / Gemini Advanced — no extra cost."

**Severity:** P1 — mechanism-first framing instead of benefit-first.

### F-04 · Three-CLI support is a strength that is not positioned as such (P1)
**Evidence:** `README.md` demo table — three games, three CLIs, presented as a flat list.

Supporting Claude, Codex, and Gemini CLIs simultaneously is architecturally significant. It means a user can switch CLIs if one produces better output for a specific genre, or if pricing changes. This is a moat against single-provider tools. It is not called out as a feature — it is only implied by the demo table.

**Severity:** P1 — a key positioning asset is not surfaced.

### F-05 · "Built on OpenGame" dilutes the brand (P2)
**Evidence:** README title and first sentence.

Leading with "built on OpenGame" positions GameFactory as a derivative work rather than a standalone product. OpenGame is not well-known outside a niche. For developers who do not know OpenGame, the reference adds confusion. For developers who do know OpenGame, "built on OpenGame" may imply it inherits OpenGame's limitations (API key requirement) — exactly the opposite of the truth.

**Severity:** P2 — upstream attribution is appropriate but should not be the positioning anchor.

### F-06 · No positioning statement for the "I already have a subscription" audience (P2)
**Evidence:** README — no section targeting the "I have Claude Pro, how do I get value from it?" audience.

This is likely the largest addressable audience for GameFactory: developers who are already paying for Claude/ChatGPT/Gemini subscriptions and want to extract more value. A headline like "Turn your Claude Pro subscription into a game studio" would land immediately for this segment.

**Severity:** P2 — highest-intent audience not directly addressed.

---

## Competitive Landscape (relevant comparisons)

| Tool | Model | Cost to user | Multi-CLI |
|---|---|---|---|
| Rosebud AI | SaaS (proprietary) | SaaS subscription ($20+/mo) | No |
| WebSim | SaaS (AI browser) | SaaS subscription | No |
| GDevelop AI | Extension of GDevelop | API key required | No |
| Ludo.ai | SaaS | Paid tiers | No |
| GameFactory | OSS CLI tool | Use existing sub (Claude/GPT/Gemini) | Yes (3 CLIs) |

**GameFactory's unique position:** Only tool that runs entirely within existing subscriptions, open-source, with multi-CLI support. This is a white space.

---

## Recommended Positioning Statement

**Primary:** "Generate web games using your Claude Pro, ChatGPT Plus, or Gemini Advanced subscription — no API key, no extra cost."

**Secondary:** "An open-source game factory that plugs into the AI subscription you already have."

**For technical README:** "Subscription-CLI adapter for OpenGame — turns your existing Claude/Codex/Gemini subscription into a zero-extra-cost game generation pipeline."

---

## Recommendations

| # | Recommendation | Effort |
|---|---|---|
| R1 | Rewrite README headline section to lead with: "Generate web games using your existing Claude Pro / ChatGPT Plus / Gemini Advanced subscription. No API key. No extra cost." | Trivial |
| R2 | Add a "vs. API-based tools" comparison table near the top of the README showing cost difference (subscription included vs. ~$0.10-0.50 per generation at API rates). | Small |
| R3 | Add a "Which CLI is right for me?" section that positions each CLI for its strengths (Claude: best code reasoning; Codex: fast iteration; Gemini: long context). | Small |
| R4 | Move "built on OpenGame" to the architecture section, not the headline. The positioning lead should be the user benefit, not the upstream dependency. | Trivial |
| R5 | Add a "If you already pay for Claude Pro / ChatGPT Plus / Gemini Advanced" callout box early in the README — direct address to the highest-intent audience. | Trivial |
| R6 | Publish the `constraint-and-approach.md` content (translated to English) as a public article titled "How we eliminated API costs in our AI game generator." This sets the positioning narrative externally. | Medium |

---

## Positioning Priority

The single highest-leverage change is R1 — rewriting the README opening to lead with the benefit. It takes 10 minutes and affects every subsequent discovery touchpoint (GitHub search, social shares, word-of-mouth). Everything else builds on that foundation.

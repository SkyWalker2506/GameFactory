# Growth #8 — Content Strategy Analysis
> GameFactory meta-project | Forward-looking (no live users yet)

## Summary

The `docs/` directory contains two content pieces (`game-fit-guide.md` and `constraint-and-approach.md`) that are genuinely useful and differentiated. However, they are written entirely in Turkish, live only in the repo, and have no distribution mechanism. They function as internal reference documents, not demand-gen assets. The strategic opportunity is high — the "subscription CLI vs API" angle is a novel take that would perform well on Hacker News, Reddit r/gamedev, and developer Twitter/X.

---

## Findings

### F-01 · Both docs are in Turkish — international reach is zero (P0)
**Evidence:** `docs/constraint-and-approach.md` lines 1-end; `docs/game-fit-guide.md` lines 1-end — entirely in Turkish.

These documents cannot be discovered, shared, or linked to by the vast majority of the global developer audience. The "constraint-and-approach" document in particular contains a genuinely novel framing (subscription CLI adapter as a cost-free alternative to paid API keys) that would resonate widely if written in English.

**Severity:** P0 — content exists but cannot generate demand internationally.

### F-02 · No blog, no external publication, no distribution channel (P1)
**Evidence:** No `blog/` directory, no link to an external blog, no social account mentioned in README.

The constraint-and-approach document is essentially a technical blog post about an architectural decision. It is currently buried inside the repo. The same content, published as a dev.to article, HN "Show HN" post, or GitHub Discussion, would drive stars and users.

**Severity:** P1 — high-value content with no distribution.

### F-03 · game-fit-guide is a strong SEO/demand asset but not structured for search (P1)
**Evidence:** `docs/game-fit-guide.md` — the guide covers 13+ game genres with "sweet spot / medium / avoid" framing.

This is the kind of opinionated, structured content that ranks well on Google for queries like "what games can AI generate", "best genres for LLM game dev", "HTML5 game generator capabilities". Currently it has no meta description, no canonical URL (it is only in the repo), and no links from external sources.

**Severity:** P1 — untapped SEO value.

### F-04 · No "showcase" content — the three live games are not marketed (P1)
**Evidence:** `README.md` lines 8-12 — three live Vercel demos (smoke-test, tap-reflex, word-guess) listed in a plain table with no context.

These three games are proof points. Each represents a different CLI (Claude, Codex, Gemini) and a different genre. They could each be a mini case study: "We generated this game in X minutes using Y CLI with this prompt." That content would perform on Reddit r/webgames, r/gamedev, Product Hunt, and Hacker News.

**Severity:** P1 — proof points exist but are not leveraged as content.

### F-05 · No content calendar or content types defined (P2)
**Evidence:** No roadmap or plan visible in repo.

For a tool like this, the high-value content types are:
1. "How we built X in Y minutes" (generation logs + screenshots)
2. "Subscription CLI vs API: the full cost breakdown" (the constraint doc, published)
3. "12 game genres you can generate with AI today" (the fit guide, published)
4. Genre deep-dives (e.g., "Building a tower defense game with Gemini Advanced")

None of these are planned or templated.

**Severity:** P2 — strategic gap, not an immediate blocker.

### F-06 · PNG companion files exist but are unexplained (P2)
**Evidence:** `docs/game-fit-guide.png`, `docs/constraint-and-approach.png` — these files exist alongside the markdown but are not referenced in README or in the markdown files themselves.

These appear to be visual summaries or diagrams. If they are good, they should be embedded in the docs and shared as social media assets. If they are drafts, they should be removed to avoid confusion.

**Severity:** P2 — unclear asset status.

---

## Recommendations

| # | Recommendation | Effort |
|---|---|---|
| R1 | Translate both docs to English. Keep Turkish as secondary in the same file or as a separate file. | Medium |
| R2 | Publish `constraint-and-approach.md` as a dev.to / Hashnode article. Submit to HN as "Show HN: I built a game factory that uses subscription CLIs instead of API keys." | Small (content exists) |
| R3 | Publish `game-fit-guide.md` as a standalone article on a GitHub Pages site or dev.to. Add a canonical URL link from the README. | Small |
| R4 | For each of the three live games, write a 200-word "how we made this" blurb with the actual prompt used, time taken, and CLI used. Add to README or a `docs/showcase/` section. | Small |
| R5 | Embed the PNG files in their respective markdown docs or remove them. | Trivial |
| R6 | Define a content type template: "Game Showcase" (prompt + time + CLI + screenshot + play link). Make it easy for users to submit their own. | Medium |
| R7 | Add a GitHub Discussions tab and seed it with two threads: "Show your games" and "Which CLI gives best results?" — community content is demand-gen with zero ongoing effort. | Trivial |

---

## Content Asset Inventory

| Asset | Current State | Potential |
|---|---|---|
| `docs/constraint-and-approach.md` | Turkish, repo-only | High — novel technical angle, HN-worthy |
| `docs/game-fit-guide.md` | Turkish, repo-only | High — SEO-friendly structured guide |
| 3 live Vercel demos | Linked in README, no context | Medium — needs "how we made this" wrapper |
| `docs/*.png` | Unexplained, unlinked | Unknown — needs audit |
| Genre presets (12 genres) | `genre-presets.json`, not human-readable | Medium — blog series potential |

---

## Demand-Gen Potential by Channel

| Channel | Best Content | Estimated Effort |
|---|---|---|
| Hacker News "Show HN" | constraint-and-approach article (EN) | Low |
| Reddit r/gamedev | game-fit-guide + showcase | Low |
| Reddit r/webdev | constraint-and-approach | Low |
| dev.to / Hashnode | Both docs as articles | Low |
| Twitter/X | Game showcase GIFs | Medium |
| GitHub trending | Stars from HN/Reddit traffic | Derived |

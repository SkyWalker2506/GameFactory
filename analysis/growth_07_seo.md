# Growth #7 — SEO / README Discoverability Analysis
> GameFactory meta-project | Forward-looking (no live users yet)

## Summary

The README is the primary — and currently only — discovery surface. GitHub search, Google indexing, and word-of-mouth all flow through it. The README is functional and clear but underoptimized for organic discovery. Key gaps: no topic tags, weak keyword density for the actual search terms developers use, no badges/shields, mixed Turkish/English dilutes search signal.

---

## Findings

### F-01 · No GitHub repository topics set (P0)
**Evidence:** Not visible in README; topics are set in GitHub repo settings, not the file — but the README contains no prompt to set them and the repo appears to have none based on project state.

Topics are the #1 GitHub discovery mechanism. Relevant topics for this project:
- `game-generator`, `ai-game-dev`, `llm`, `vite`, `typescript`, `phaser`, `web-games`, `claude-ai`, `openai-codex`, `gemini`, `openai`, `game-development`, `subscription-api`

**Severity:** P0 — zero topic tags = zero GitHub category browsing traffic.

### F-02 · README opens with a project name + one-liner, but no hook (P1)
**Evidence:** `README.md` lines 1-4:
```
# GameFactory
LLM-driven web game factory built on OpenGame — uses your subscription CLIs...
```

The one-liner is accurate but does not answer the developer's first question: "Why should I use this instead of just calling the API?" The unique value prop (zero extra API cost, use your existing subscriptions) is buried in the architecture section.

**Severity:** P1 — first impression fails to differentiate.

### F-03 · No badges/shields (P1)
**Evidence:** `README.md` — no shields.io badges present.

Badges (Node version, license MIT, Vercel deploy status, last commit) signal project health to browsing developers and increase click-through from search results. They also contribute to the visual weight that makes a README appear "serious" in GitHub search result previews.

**Severity:** P1 — perception of project maturity.

### F-04 · Mixed Turkish/English in README weakens search indexing (P1)
**Evidence:** `README.md` lines 5 (Turkish: "Tarif et → üret → oto-playtest → yayınla"), sections in `docs/` are entirely Turkish.

GitHub's search indexes README content. Mixed language splits keyword density and confuses language-based discovery. The docs (constraint-and-approach.md, game-fit-guide.md) are entirely in Turkish — they cannot be discovered by non-Turkish developers who are the larger global audience.

**Severity:** P1 — significantly limits international discovery.

### F-05 · Key search terms absent or weak (P1)
**Evidence:** README full text.

High-value search terms not present or used only once:
- "no API key" / "no API cost" (the #1 differentiator — not in README)
- "Claude Pro" / "ChatGPT Plus" / "Gemini Advanced" (subscription tier names developers search)
- "browser game" / "HTML5 game" (canonical terms for web game category)
- "zero cost game generation" / "free game AI"
- "Playwright testing"

**Severity:** P1 — misses the searches most likely to bring qualified users.

### F-06 · Live demo links are not human-readable (P2)
**Evidence:** `README.md` lines 8-12 — Vercel URLs contain hash suffixes (`p6v5luyaq`, `2i0dvztg2`, etc.).

Vercel auto-generated URLs look untrustworthy and ephemeral to external visitors. Custom domains or at minimum named Vercel projects improve click-through trust. Additionally, there is no screenshot/GIF of an actual game running — the demo table is text-only.

**Severity:** P2 — reduces trust in demo section.

### F-07 · No "Related Projects" or upstream attribution section (P2)
**Evidence:** README — OpenGame is mentioned once in the intro but not linked prominently. No mention of Qwen-Code, OpenAI Codex, or other well-known projects that would generate backlinks and discoverability via those communities.

**Severity:** P2 — missed backlink opportunities from upstream ecosystems.

---

## Recommendations

| # | Recommendation | Effort |
|---|---|---|
| R1 | Add 10-15 GitHub repository topics via repo Settings. | Trivial |
| R2 | Rewrite the README opening paragraph to lead with the value prop: "No API key needed. Generate web games using your Claude Pro / ChatGPT Plus / Gemini Advanced subscription." | Small |
| R3 | Add shields.io badges: Node >=20, MIT License, Vercel deploy, last commit. | Small |
| R4 | Write an English-language version of the README (or make English primary, Turkish secondary). At minimum, translate docs/ to English. | Medium |
| R5 | Add a "Why no API key?" section near the top with the key terms: subscription CLI, zero API cost, Claude Pro, ChatGPT Plus, Gemini Advanced. | Small |
| R6 | Add a GIF or screenshot of a running game to the demo table. | Small |
| R7 | Add a "Built on" section listing OpenGame, Qwen-Code, Phaser, Vite, Playwright — each with a link. This generates backlinks from those project ecosystems. | Small |

---

## SEO Priority Matrix

| Signal | Current State | Target |
|---|---|---|
| GitHub topics | 0 | 12-15 |
| README language | Mixed TR/EN | English primary |
| Key term density | Weak | "subscription CLI", "no API key" x3+ |
| Badges | 0 | 4 (node, license, deploy, commit) |
| Demo media | Text links only | 1 GIF + Vercel links |
| Upstream links | 1 (OpenGame) | 5+ (ecosystem) |

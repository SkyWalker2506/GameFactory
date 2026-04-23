# Growth #9 — Community Analysis
> GameFactory meta-project | Forward-looking (no live users yet)

## Summary

The community surface is essentially absent. There is no CONTRIBUTING.md, no LICENSE file at the repo root (only a text mention in README), no CODE_OF_CONDUCT, no issue templates, and no GitHub Discussions. The upstream OpenGame has MIT license but GameFactory does not carry it forward as a proper LICENSE file. This is a P0 blocker for any open-source community formation and potentially a legal concern for contributors.

---

## Findings

### F-01 · No LICENSE file at repo root (P0)
**Evidence:** `ls /Users/musabkara/Projects/GameFactory/LICENSE*` → no matches. README.md bottom: "MIT (same as upstream OpenGame)."

A text claim of MIT license in the README is legally insufficient. Without a LICENSE file, GitHub explicitly shows "No license" in the repository sidebar, which:
- Blocks forks: developers cannot legally use the code without explicit license grant
- Blocks contributions: contributors cannot know their contribution terms
- Prevents listing on OSS directories (OSSI, libraries.io, etc.)
- Creates ambiguity about the OpenGame fork attribution

**Severity:** P0 — legal and community-formation blocker.

### F-02 · No CONTRIBUTING.md (P1)
**Evidence:** `ls /Users/musabkara/Projects/GameFactory/CONTRIBUTING*` → no matches.

Without a CONTRIBUTING guide, the contribution pathway is undefined. GitHub shows a prompt to create one when it is absent, which signals immaturity to visiting developers. Specifically missing:
- How to add a new genre preset
- How to add a new CLI adapter
- How to submit a generated game as a showcase
- PR workflow and branch naming
- How to report bugs vs. ask questions

**Severity:** P1 — significant barrier to first contributors.

### F-03 · No GitHub issue templates (P1)
**Evidence:** No `.github/ISSUE_TEMPLATE/` directory exists.

Without templates, issues will arrive as free-form text missing critical debugging information (Node version, OS, CLI used, `gf` command run, error output). This makes triage expensive and discourages maintainers from engaging. Given the multi-CLI nature of the project (claude/codex/gemini), a bug report template that captures the CLI and auth type is especially important.

**Severity:** P1 — increases maintenance cost as first users arrive.

### F-04 · No CODE_OF_CONDUCT (P2)
**Evidence:** No `CODE_OF_CONDUCT.md` present.

Most open-source projects now include a CoC (typically Contributor Covenant). Its absence is a signal of early-stage roughness rather than a hard blocker, but it becomes a prerequisite for community events, listings on major OSS directories, and involvement of corporate contributors.

**Severity:** P2 — forward-looking requirement.

### F-05 · No GitHub Discussions enabled (P2)
**Evidence:** No mentions of Discussions in README; no `.github/` discussion configuration.

GitHub Discussions is the primary async community surface for developer tools. Appropriate categories for GameFactory:
- "Show your games" — viral content driver
- "Which CLI gives best results?" — qualitative research + engagement
- "Genre requests" — roadmap input
- "Q&A" — reduces issue noise

**Severity:** P2 — missed low-effort community surface.

### F-06 · No SECURITY.md / vulnerability disclosure policy (P2)
**Evidence:** No `SECURITY.md` present.

Given the security risks identified in the assignment map (LLM output dropped as index.html, `--yolo` flag, GAME.md prompt injection), a security disclosure policy is more important than average for this project. GitHub's security advisory feature also requires a SECURITY.md to enable private vulnerability reporting.

**Severity:** P2 — elevated importance given prompt-injection risk profile.

### F-07 · Upstream attribution unclear in community context (P2)
**Evidence:** README.md — "built on OpenGame (leigest519/OpenGame)" is mentioned once but the fork relationship is not formalized.

The upstream OpenGame project may have community members who would discover GameFactory positively — but there is no back-link from GameFactory to the upstream community (no upstream mention in CONTRIBUTING, no "fork of" badge, no PR to upstream's ecosystem list). This misses an early audience of already-interested developers.

**Severity:** P2 — missed upstream ecosystem traffic.

---

## Recommendations

| # | Recommendation | Effort |
|---|---|---|
| R1 | Add `LICENSE` file (MIT) at repo root. Use the standard MIT template. Include copyright year and holder name. | Trivial |
| R2 | Create `CONTRIBUTING.md` covering: how to add genre presets, how to add CLI adapters, how to submit showcase games, PR workflow. | Small |
| R3 | Create `.github/ISSUE_TEMPLATE/bug_report.yml` and `feature_request.yml`. Bug template must capture: OS, Node version, CLI type, command run, full error output. | Small |
| R4 | Enable GitHub Discussions. Seed with 2-3 starter threads: "Show your games", "CLI comparison: which gives best results?", "Genre requests". | Trivial |
| R5 | Add `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 is copy-paste. | Trivial |
| R6 | Add `SECURITY.md` with private vulnerability reporting instructions and note about the prompt-injection risk surface. | Small |
| R7 | Reach out to leigest519/OpenGame with a PR or Discussion linking GameFactory as a known fork/extension. This generates backlinks and community discovery. | Small |

---

## Community Readiness Checklist

| Item | Status |
|---|---|
| LICENSE file | Missing (P0) |
| CONTRIBUTING.md | Missing (P1) |
| Issue templates | Missing (P1) |
| GitHub Discussions | Not enabled (P2) |
| CODE_OF_CONDUCT | Missing (P2) |
| SECURITY.md | Missing (P2) |
| Upstream attribution | Partial (README mention only) |

Current community readiness: 0/7 items satisfied. With R1-R4 implemented (all trivial/small effort), readiness reaches 4/7 and the project becomes forkable and contributable.

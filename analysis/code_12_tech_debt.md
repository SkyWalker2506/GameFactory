# Code #12 — Tech Debt

> Analysis model: GPT via Codex MCP
> Date: 2026-04-23

---

## Executive Summary

Debt load is **moderate-to-high**. The biggest risk is not code quality in isolation — it is **operational drift**: GameFactory embeds a live upstream fork in-tree, mixes upstream and local patches, and has no documented sync or verification policy. A second layer of debt comes from **documentation duplication**, **declared-but-unimplemented capabilities**, and **repo-level automation gaps**.

The repo is functional today, but several claims in root docs describe a broader platform than what the scripts actually implement. That mismatch will compound maintenance cost unless the project is tightened around a clear contract.

---

## Findings Catalog

### Category: Fork Strategy

| Finding | Evidence | Severity | Effort |
|---|---|---|---|
| `factory/opengame` is a vendored in-tree fork with no upstream sync process. No `UPSTREAM.md`, no pinned upstream commit/tag, no `upstream` remote, no merge/rebase policy, no patch inventory | `factory/opengame/package.json:13` points to upstream; `CHANGELOG.md` in fork; no `.gitmodules`; patches in `contentGenerator.ts:40-196`, `cliContentGenerator.ts:1-257`, `auth.ts:61-68` | **P0** | M |
| Upstream-facing docs inside `factory/opengame` are stale for GameFactory consumers — describe API-key auth, point to original clone URL | `factory/opengame/README.md:167,212` | P1 | S |

**What's needed for safe fork tracking:**
- `docs/fork-maintenance.md`: pinned upstream base commit, merge/rebase policy, patch inventory
- `git remote add upstream https://github.com/leigest519/OpenGame.git`
- Tag for current base: `git tag upstream-base-v0.6.0`
- Scheduled diff check: `git diff upstream/main...HEAD -- packages/` to surface conflicts

### Category: Documentation Overlap

| Finding | Evidence | Severity | Effort |
|---|---|---|---|
| Root `AGENTS.md` and `CLAUDE.md` are near-duplicates with only tool-specific wording differences — no single source of truth | `AGENTS.md:1` and `CLAUDE.md:1` repeat same structure, workflow, capabilities | P1 | S |
| Root docs reference files that do not exist: `docs/genres.md` and `docs/pipeline.md` | `AGENTS.md:20`, `CLAUDE.md:20` — actual docs are `docs/genre-presets.json`, `game-fit-guide.md`, `constraint-and-approach.md` | P1 | XS |
| `AGENTS.md` references `~/Projects/Codex-config/AGENTS.md` but config repo is `claude-config` | `AGENTS.md:3` | P2 | XS |

**Recommended merge/delete plan:**
- Keep `README.md` as public product doc
- Keep `AGENTS.md` as agent-only operating instructions (canonical)
- Delete root `CLAUDE.md` or auto-generate it from `AGENTS.md`
- Add dedicated `docs/fork-maintenance.md`
- Fix all stale cross-references

### Category: Stubs / Unimplemented Capabilities

| Finding | Evidence | Severity | Effort | Note |
|---|---|---|---|---|
| "Agent layer" (`puzzle-designer`, `balance-tuner`, `juice-polish`, `playtest-bot`) described as a platform feature but no implementation or registration path exists | `AGENTS.md:45`, `CLAUDE.md:45`; no agent files found | P1 | M | Implement or explicitly mark as "planned" |
| "Per-game Jira + ClaudeHQ projects.json registration" described but `gf new` only creates folders/markdown | `AGENTS.md:44`, `CLAUDE.md:44`; `scripts/gf:24` | P1 | S | Cut from top-level docs or mark planned |
| "Asset pipeline wrapper" for OpenGame's image/audio providers — promised but is a stub | `AGENTS.md:46`, `CLAUDE.md:46`; `setup.sh:115` only asks for optional `DASHSCOPE_API_KEY` | P1 | M | Decide: near-term gap or intentional non-goal |
| Root `package.json` test command is a hard-fail placeholder | `package.json:9`: `"test": "echo 'Error: no test specified' && exit 1"` | P1 | S | Replace with actual test runner |

### Category: Hardcoded Values

| Finding | Evidence | Severity | Effort |
|---|---|---|---|
| Personal email, name, Vercel scope hardcoded in `gf ship` — non-portable | `scripts/gf:89` (email + name), `scripts/gf:92` (scope) | P1 | XS |
| Config externalization design missing for identity/deploy fields | No `GF_GIT_USER_NAME`, `GF_GIT_USER_EMAIL`, `GF_VERCEL_SCOPE` in `secrets.env` template | P1 | S |

**Fix pattern** (add to `secrets/secrets.env` template in `setup.sh`):
```bash
# GF_GIT_USER_EMAIL=your@email.com
# GF_GIT_USER_NAME="Your Name"
# GF_VERCEL_SCOPE=your-vercel-scope
# GF_GH_REPO_PREFIX=gamefactory
```

### Category: Dependency Debt

| Finding | Evidence | Severity | Effort |
|---|---|---|---|
| Global CLIs unpinned — fresh installs nondeterministic | `setup.sh:46-52` | P1 | S |
| Nested `esbuild@0.21.5` advisory in test deps | `package-lock.json` under `sdk-typescript` node_modules | P1 | M |

### Category: CI/CD Gaps

| Finding | Evidence | Severity | Effort |
|---|---|---|---|
| No root-level CI — nothing enforces shell-script validity, docs consistency, smoke tests | No `.github/workflows`; root `package.json` has no useful pipeline | P1 | M |
| Minimum root CI needed: shellcheck for `scripts/*`, JSON validation for `docs/genre-presets.json`, `gf genres` smoke test, markdown link check, fork-drift check | — | P1 | M |

### Category: Naming / Language Consistency

| Finding | Evidence | Severity | Effort |
|---|---|---|---|
| "Preset" naming inconsistent: `PRESETS` var in gf, `genre-presets.json` in docs, `genres.md` reference in AGENTS.md | `scripts/gf:6`, `AGENTS.md:21`, `README.md:57` | P2 | XS |
| Mixed Turkish/English in docs without explicit policy | `README.md` mixed; `AGENTS.md`/`CLAUDE.md` Turkish-heavy; `factory/opengame` English | P2 | S |
| No root `CONTRIBUTING.md` despite embedded upstream having one | Root missing; `factory/opengame/CONTRIBUTING.md:1` exists | P2 | XS |

### Category: Architecture Contract Gaps

| Finding | Evidence | Severity | Effort |
|---|---|---|---|
| `gf new` writes `CLAUDE.md` but repo contract says `AGENTS.md` | `scripts/gf:50` vs `AGENTS.md:45` | P1 | XS |
| External config home paths inconsistent (`Codex-config` vs `claude-config`) | `AGENTS.md:3` vs `CLAUDE.md:3`, `setup.sh:17`, `scripts/gf:11` | P2 | S |

---

## Near-Term vs Non-Goal Classification

### Near-Term Gaps (implement or de-scope in docs now)
- Fork maintenance policy and tooling
- Root CI and test contract
- Hardcoded deploy identity/scope
- Agent layer claims
- Jira/ClaudeHQ registration claims
- `gf new` generating `AGENTS.md` instead of `CLAUDE.md`

### Valid Long-Term Non-Goals (state explicitly in docs)
- Full asset pipeline wrapper beyond OpenGame's built-in providers
- Multimodal generation beyond code-only HTML
- Team-wide generic deploy orchestration beyond Vercel
- Full upstream parity with every OpenGame capability

---

## Priority Order

1. **P0**: Document and operationalize fork maintenance
2. **P1**: Remove misleading product claims or implement them
3. **P1**: Externalize hardcoded identity/deploy config
4. **P1**: Add root CI and real `npm test`
5. **P1**: Fix `gf new` to emit `AGENTS.md`
6. **P2**: Clean naming, language policy, contributor guidance

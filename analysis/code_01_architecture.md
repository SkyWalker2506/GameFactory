# Code #1 — Architecture (Opus-Depth)

> Analysis model: GPT via Codex MCP (two-pass: gather + critique)
> Date: 2026-04-23

---

## Executive Summary

GameFactory's core architectural bet is viable only as a **narrow fork seam**, not as a fully integrated upstream extension. It works today because exactly three core auth/content-generator seam points were patched, and the `gf` wrapper handles the rest by writing `.qwen/settings.json` and always invoking `opengame ... --yolo`. That keeps the happy path short, but reliability depends on several unstated invariants that are not enforced in code.

The biggest **correctness issue** is the Gemini adapter (`gemini -p -` — the `-` is not a documented stdin sentinel for Gemini CLI). The biggest **operational risk** is `gf generate`/`gf iterate` forcing `--yolo`, enabling unrestricted shell/edit/write tool execution without confirmation. The **second-pass critique** additionally revealed that the "trusted workspace" invariant is fictional in the current setup, and the global `npm link` binary creates version-skew bugs across projects.

---

## Component Map

| Layer | Files | Role |
|---|---|---|
| Factory wrapper | `scripts/gf` | Per-game settings, GAME.md seeding, opengame invocation |
| Auth seam | `packages/core/src/core/contentGenerator.ts:40-196` | Adds CLI AuthTypes, default model selection, generator dispatch |
| Adapter | `packages/core/src/core/cliContentGenerator/cliContentGenerator.ts` | Translates ContentGenerator calls → CLI subprocess |
| CLI validation | `packages/cli/src/config/auth.ts:61-68` | Marks CLI auth types valid (no key checks) |
| Settings merge | `packages/cli/src/config/settings.ts:405` | system < user < workspace < system-override |
| Trust gate | `packages/cli/src/config/trustedFolders.ts:208` | Controls whether workspace settings apply |
| Permission layer | `packages/cli/src/config/config.ts:806` | Maps `--yolo` to full tool auto-approval |

---

## Seam Analysis

### What Was Patched vs Upstream

Three insertion points in the OpenGame codebase:

1. **Auth enum expansion** — `contentGenerator.ts:46-48`
   Adds `USE_CLAUDE_CLI='claude-cli'`, `USE_CODEX_CLI='codex-cli'`, `USE_GEMINI_CLI='gemini-cli'`

2. **Config synthesis** — `contentGenerator.ts:178-196`
   CLI auth types get default model and fake `apiKey='cli-no-key'`

3. **Generator dispatch** — `contentGenerator.ts:267-276`
   CLI auth types route to `createCliContentGenerator`

4. **New adapter module** — `cliContentGenerator/cliContentGenerator.ts` + `index.ts`

5. **Auth validation bypass** — `auth.ts:61-68`
   CLI auth types return `null` (valid) without key checks

6. **Factory-side integration** — `scripts/gf`, `scripts/setup.sh`

### Where the Seam is Fragile

| Seam Point | Risk | Trigger |
|---|---|---|
| `ContentGenerator` interface | Required method additions or response semantic changes | Upstream evolves the interface |
| `AuthType` enum | Exhaustive switches elsewhere not patched | Upstream adds provider with switch-over-enum |
| `createContentGeneratorConfig()` | Assumes "truthy apiKey" sufficient | Upstream validates apiKey format |
| `gf` wrapper | Does hidden integration work not in OpenGame UI | Upstream exposes CLI auth in their UI, conflict |
| `setup.sh` staleness check | Only watches 3 source files | Any other patched file changes |

### What Breaks on Upstream Merge

- `generateContentStream()` → if upstream relies on incremental chunks, the one-shot shim at `cliContentGenerator.ts:222` becomes incompatible
- `embedContent()` → hard-fails; if upstream uses embeddings in more flows, breakage propagates
- Auth UX → `--auth-type` choices at `config.ts:474`, auth UI at `AuthDialog.tsx:40`, env default validation at `useAuth.ts:227` all omit CLI auth types
- Staleness check in `setup.sh:130` may skip rebuilds for future patched files

---

## Design Risks (Severity Table)

| Severity | Finding | Evidence (file:line) | Fix |
|---|---|---|---|
| **P0** | Gemini invocation broken — `['-p', '-']` uses `-` as stdin sentinel but Gemini CLI's `-p` flag takes a literal prompt string, not a stdin redirect | `cliContentGenerator.ts:74-78`, `runCli():173` | Pass actual prompt as `-p <prompt>` arg, stop writing to stdin for Gemini; or find documented stdin-only mode |
| **P0** | `gf generate`/`iterate` force unrestricted tool execution via `--yolo` | `scripts/gf:69`, `scripts/gf:80`, `config.ts:806,859` | Default to `--approval-mode auto-edit`; make full YOLO opt-in; run inside real sandbox for generation |
| **P0** | Trusted workspace invariant is not enforced — OpenGame defaults to trusted when trust check is disabled; `gf` never registers game dirs as trusted | `trustedFolders.ts:222`, `config.ts:821`, `scripts/gf:57`, `scripts/setup.sh:148` | Enable folder trust explicitly in `gf`, pre-trust `games/` root, add `gf doctor` check |
| **P1** | CLI auth only partially integrated; wrapper hides missing upstream surfaces | `config.ts:474` (auth choices), `AuthDialog.tsx:40` (auth UI), `useAuth.ts:227` (env default) | Decide: wrapper-only (document clearly) or first-class (patch config, UI, validation, tests) |
| **P1** | No preflight check that CLI binaries exist or are healthy — failure deferred to spawn-time ENOENT | `auth.ts:61-68`, `cliContentGenerator.ts:152` | Add `command -v` + `<bin> --version` during auth/setup; classify auth-prompt failures |
| **P1** | `CliContentGenerator` only partially satisfies the semantic contract — non-text parts flattened, embeddings hard-fail, streaming buffered | `cliContentGenerator.ts:97,246,222` | Add capability flags; fail fast when unsupported features requested; document what CLI mode supports |
| **P1** | Settings layering race-prone under parallel `gf` runs | `scripts/gf:58`, `settings.ts:657,680` | Atomic write-rename for `.qwen/settings.json`; file lock around global `~/.qwen/settings.json` |
| **P1** | Global `npm link` creates version-skew across projects — whichever linked first wins | `scripts/setup.sh:141` | Invoke local build directly: `node factory/opengame/dist/cli.js` or `npm exec --prefix factory/opengame opengame` |
| **P1** | Subscription CLI auth can deadlock mid-generation if CLI prompts for interactive login | `cliContentGenerator.ts:140,173`, `validateNonInterActiveAuth.ts:53` | Probe each CLI before generation with non-destructive auth-health command; detect auth prompts on stderr; fail fast |
| **P1** | `GAME.md` passed as shell arg hits OS limit at ~1 MB; practical safety limit ~256 KB | `scripts/gf:69`, OS `ARG_MAX=1,048,576` | Pass prompt over stdin: `opengame -p - < GAME.md` or add `--prompt-file` support |
| **P2** | Token counting is only `ceil(len/4)`, feeds session-limit gates | `cliContentGenerator.ts:129`, `client.ts:439` | Use model-specific tokenizer or isolate "estimated" from "enforced"; downgrade to warning with margin |
| **P2** | Rebuild detection brittle — `setup.sh` only watches 3 source files | `scripts/setup.sh:130-135` | Rebuild on any changed TS under patched dirs, or always bundle during setup |
| **P2** | `apiKey='cli-no-key'` is a fragile sentinel that could trigger downstream apiKey-presence checks | `contentGenerator.ts:191` | Keep CLI auth config completely separate from API-key-bearing configs |
| **P2** | `gf new` writes `CLAUDE.md` but repo contract specifies `AGENTS.md` | `scripts/gf:50`, `AGENTS.md:45` | Emit `AGENTS.md` as canonical; add compatibility alias only if needed |

---

## Architectural Invariants

These invariants must hold for the factory to be reliable. Currently most are **unenforced**:

1. `authType` must remain the sole routing authority for generator selection — if upstream infers provider from `apiKey` presence, CLI auth misroutes
2. Workspace `.qwen/settings.json` must override user `~/.qwen/settings.json` — true today only when workspace is trusted
3. Shell environment variables outrank `.env` files — true via `loadEnvironment()` at `settings.ts:588`
4. CLI auth selection does not come from env fallback in non-interactive mode — `validateNonInterActiveAuth.ts:16` only recognizes API-key/OAuth auths
5. Reliability requires trusted workspace — currently fictional because `gf` never registers trust

---

## Fix Recommendations (Prioritized)

### Immediate (P0 — block on production use)

1. **Fix Gemini adapter** — Remove `'-'` from Gemini args; pass actual prompt string as `-p` value; or research if `gemini --stdin` exists
2. **Remove unconditional `--yolo`** — Default `gf generate` to `--approval-mode auto-edit`; add `--unsafe` flag for full YOLO
3. **Enforce trusted workspace** — `gf` should register the game dir as trusted before spawning `opengame`; add `gf doctor` that aborts on untrusted state

### Short-term (P1 — reliability blockers)

4. **Replace global binary** — Change `gf` to invoke `node factory/opengame/dist/cli.js` directly
5. **Prompt via stdin** — `opengame -p - < "$dir/GAME.md"` avoids ARG_MAX
6. **Auth preflight** — Run `claude --version`, `codex --version`, `gemini --version` in `setup.sh`; detect auth prompt patterns in `cliContentGenerator` stderr
7. **Atomic settings writes** — temp file + rename for `.qwen/settings.json`
8. **Declare capability surface** — Add a capability flag object to `CliContentGenerator`; fail fast if callers request structured output, embeddings, or true streaming

### Medium-term (P2 — polish and maintainability)

9. **Widen staleness check** — Hash or find-based freshness for full `packages/` tree
10. **Remove `cli-no-key` sentinel** — Separate CLI auth config path from API-key config path
11. **First-class CLI auth integration** — Patch `config.ts:474`, `AuthDialog.tsx:40`, `useAuth.ts:227` to expose CLI auth types in OpenGame UI
12. **Fork maintenance** — Document upstream base commit, add `upstream` remote, create `docs/fork-maintenance.md`

---

## Second-Pass Upgrade Path Assessment

A safe upgrade path from current fork to a future upstream release is possible **if and only if** the patch delta is kept narrow:
- Keep upstream-touching changes limited to: `AuthType` additions, `createContentGeneratorConfig` branch, `createContentGenerator` dispatch, new adapter module
- Move GameFactory-specific bootstrapping out of the fork where possible
- Add black-box integration tests for `claude`/`codex`/`gemini` headless flows
- Freeze a compatibility test matrix pinned to specific CLI versions

Without this discipline, every upstream merge becomes a full re-audit.

**Minimum viable set for production-stable vs research-prototype:**
1. Enforce workspace trust
2. Remove global binary dependence
3. Replace `$(cat GAME.md)` arg with stdin
4. Add preflight/doctor step
5. Add atomic writes around settings files

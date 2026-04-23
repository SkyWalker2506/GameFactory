# Code #10 — Data / State (Partial)

> Analysis model: GPT via Codex MCP
> Date: 2026-04-23
> Focus: .qwen/settings.json layering, config state management

---

## State Layering Diagram

```
gf shell
  ├─ sources `secrets/secrets.env`           (set -a)
  ├─ sources `~/Projects/claude-config/claude-secrets/secrets.env`
  └─ runs `opengame` in `games/<name>/`

OpenGame settings load (settings.ts:405)
  1. system defaults
  2. user   → ~/.qwen/settings.json
  3. workspace → games/<name>/.qwen/settings.json  [ONLY if workspace is trusted]
  4. system override                                [highest priority]

Trust gate (trustedFolders.ts:208)
  → Trust determined BEFORE workspace settings applied
  → If trusted:  workspace settings participate; project .env loaded
  → If untrusted: workspace settings DISCARDED; project .env skipped

Auth/model resolution
  merged security.auth.selectedType
    → refreshAuth(authType)
    → createContentGeneratorConfig(...)
    → CLI model default from env:
       CLAUDE_CLI_MODEL / CODEX_CLI_MODEL / GEMINI_CLI_MODEL
```

---

## Conflict Resolution Table

| Scenario | Winner / Behavior | Evidence |
|---|---|---|
| Both `~/.qwen/settings.json` and game `.qwen/settings.json` exist | Game-level wins — but ONLY when workspace is trusted. Untrusted = workspace config ignored | `settings.ts:394,720` |
| `GF_DEFAULT_AUTH` env var vs `.qwen/settings.json` | `.qwen/settings.json` wins at runtime. `GF_DEFAULT_AUTH` is ONLY used by `setup.sh` when writing `~/.qwen/settings.json`. `gf` exports it but OpenGame does not read it | `setup.sh:150`, `gf:8`, no consumer of `GF_DEFAULT_AUTH` in opengame |
| Workspace trust vs game `.qwen/settings.json` | Trust decided before workspace settings applied; game cannot self-trust via its own settings | `settings.ts:710`, `trustedFolders.ts:208` |
| Broken `secrets/claude-config-secrets.env` symlink | No effect on `gf` — `gf` reads the home-path file directly; broken symlink silently skipped | `gf:10`, `setup.sh:81` |
| Invalid `selectedType` in game settings | No enum validation at load; non-interactive mode exits with auth error; interactive recovery clears user scope but NOT workspace scope | `settingsSchema.ts:1068`, `auth.ts:16`, `initializer.ts:45` |
| `CLAUDE_CLI_MODEL` env vars through spawn | Preserved in normal process flow. NOT reliably forwarded into Docker/Podman sandbox containers | `contentGenerator.ts:186`, `sandbox.ts:838` |
| Malformed `settings.json` | Parse error → `FatalConfigError` at startup (fail fast, good). Unknown but valid JSON values: accepted silently | `settings.ts:631` |
| GF_DEFAULT_AUTH actual runtime role | Setup-time seed only. Changing it in `secrets.env` has NO effect until `setup.sh` is rerun or per-game `.qwen/settings.json` created | — |

---

## Findings

### P1 — `GF_DEFAULT_AUTH` is a setup-time seed, not a runtime authority

**Problem:** `setup.sh` uses `GF_DEFAULT_AUTH` once to write `~/.qwen/settings.json`. After that, changing `GF_DEFAULT_AUTH` in `secrets.env` has no effect at runtime — OpenGame reads the settings file, not the env var.

This creates config drift: a developer who changes `GF_DEFAULT_AUTH=codex-cli` in their secrets file and re-sources it will expect `gf generate` to use Codex, but it still uses whatever was in `~/.qwen/settings.json` from the last `setup.sh` run.

**Fix options:**
- Document explicitly: "GF_DEFAULT_AUTH is setup-only; re-run `setup.sh` or edit `~/.qwen/settings.json` to change"
- OR: have `gf generate` synthesize/update the effective `.qwen/settings.json` based on current `GF_DEFAULT_AUTH` env before spawning OpenGame

### P1 — Invalid workspace `selectedType` is hard to recover from interactively

**Problem:** If a game's `.qwen/settings.json` has an invalid `selectedType`, the startup recovery path clears `security.auth.selectedType` only in user scope (`~/.qwen/settings.json`). Because workspace settings override user, the bad value persists across sessions.

**Fix:** On auth failure, identify which settings scope provided the bad `selectedType` and clear that scope specifically. Or: validate `selectedType` against known `AuthType` values during settings load and fail with a targeted config error.

### P2 — Workspace config trust-gated; appears to "randomly not work" in untrusted folders

**Problem:** Per-game `.qwen/settings.json` only applies after trust is established from user/system trust config or IDE trust. If a game dir is not trusted, the per-game CLI override is silently ignored with no user-visible error. Developer sees "it uses claude even though I set codex in the game's settings."

**Fix:** Document this explicitly in GameFactory. Optionally: pre-trust `games/<name>` during `gf new` using the appropriate OpenGame trust API.

### P2 — CLI model env vars disappear in sandbox containers

**Problem:** `CLAUDE_CLI_MODEL`, `CODEX_CLI_MODEL`, `GEMINI_CLI_MODEL` survive the parent process and relaunch path, but Docker/Podman sandbox code at `sandbox.ts:838` forwards only a selected list of env vars that does NOT include these.

**Fix:** Add model override vars to sandbox env passthrough, or document that CLI model overrides require non-sandbox mode.

### P3 — Symlinked `secrets/claude-config-secrets.env` is operationally misleading

`setup.sh` creates the symlink at `secrets/claude-config-secrets.env`, but `gf` never reads it — it reads the home-path file directly. A broken symlink has no effect. This is state duplication without purpose.

**Fix:** Remove the symlink; keep one source of truth. Or source the symlink consistently from `gf`.

### P3 — `selectedType` accepted as plain string; enum validation only at runtime

`settingsSchema.ts` defines `selectedType` as a plain `string`, so unknown auth type strings are accepted during JSON parse. The validation error surfaces later during auth flow, with a less specific error message.

**Fix:** Add enum validation at settings load time; fail with `FatalConfigError: Unknown auth type '<value>'. Valid values: ...`.

---

## Settings Layering — Practical Behavior Summary

For a `gf generate tap-reflex` call:

1. `gf` sources `secrets/secrets.env` → `GF_DEFAULT_AUTH=claude-cli` in env (but NOT read by OpenGame)
2. `gf` cd's to `games/tap-reflex`
3. `opengame` starts, loads settings:
   - system defaults
   - `~/.qwen/settings.json` → `selectedType: "claude-cli"` (from last `setup.sh` run)
   - If `games/tap-reflex` is trusted: `games/tap-reflex/.qwen/settings.json` → may override to `"codex-cli"`
   - If untrusted: game-level override silently ignored
4. `createContentGeneratorConfig()` uses merged `selectedType`
5. Model: `process.env.CLAUDE_CLI_MODEL ?? 'claude-opus-4-7'`
6. `CliContentGenerator` spawns `claude -p --output-format json ...`

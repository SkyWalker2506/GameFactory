# SEC #5 — Auth/Authorization (P1)

Scope: `factory/opengame/packages/cli/src/config/auth.ts`, `selectedType: *-cli` flow in `~/.qwen/settings.json` and per-game `.qwen/settings.json`.

## Threat Model

GameFactory adds three `AuthType`s (`USE_CLAUDE_CLI`, `USE_CODEX_CLI`, `USE_GEMINI_CLI`) that short-circuit Qwen-Code's normal key-based auth. The question: is the short-circuit correct, can it be abused, and do auth choices cross trust boundaries?

## Findings

### F5.1 `validateAuthMethod` returns `null` for all CLI types without any check — P1
- Evidence: `auth.ts:61-68`:
  ```
  if (authMethod === AuthType.USE_CLAUDE_CLI || USE_CODEX_CLI || USE_GEMINI_CLI)
    return null; // ok
  ```
- There is no verification that the CLI binary is actually installed, nor that the user is logged in. A stale OAuth session or a fresh machine with `claude` not-yet-logged-in will fail deep inside `cliContentGenerator.ts:166` with an opaque `claude exited 1: ...`.
- Fix: add a minimal check — `which claude` / `claude --version` before returning null, with a helpful "run `claude login`" message.

### F5.2 Per-game `.qwen/settings.json` is written from CLI arg without validation — P2
- Evidence: `scripts/gf:56-59`:
  ```
  echo "{\"security\":{\"auth\":{\"selectedType\":\"${auth}-cli\"}}}" > "$dir/.qwen/settings.json"
  ```
- `$auth` is a user-supplied `--cli` arg. No allowlist check, no JSON-escape. Values like `claude"}},"arbitrary":"x` break out of the JSON string.
- Impact: Low — the resulting invalid JSON fails to parse in `validateAuthMethod`, so no downstream effect beyond confusing error. But principle is poor.
- Fix: validate `$auth` against `claude|codex|gemini` explicitly before writing.

### F5.3 No distinction between "user CLI not logged in" and "CLI refused request" — P2
- Evidence: `cliContentGenerator.ts:164-170` returns a generic error with 400 chars of stderr. Users see `claude exited 1: ...` with no hint whether it's auth, quota, or ToS refusal.
- Fix: parse common "not authenticated" patterns, surface actionable message.

### F5.4 No authorization boundary between user identities — N/A
- Single-user desktop tool; all three CLIs resolve to whichever account is logged in on that host. Cross-user concerns don't apply.

### F5.5 Settings-file precedence: user `~/.qwen/settings.json` vs project `.qwen/settings.json` — P2
- Evidence: `setup.sh:148-159` writes global `~/.qwen/settings.json`. `scripts/gf:56-59` writes per-project. No documentation of which wins under what condition.
- Risk: a user expecting per-game isolation may accidentally run with their global auth type. Low security risk; correctness risk.
- Fix: document precedence; add `gf list` column showing the resolved auth.

## Severity Summary

| ID | Finding | Severity |
|---|---|---|
| F5.1 | No pre-flight auth check for CLI types | P1 |
| F5.2 | `--cli` arg written unvalidated into JSON | P2 |
| F5.3 | Opaque auth-error surface | P2 |
| F5.5 | Settings precedence undocumented | P2 |

## Mitigations

1. Add `verifyCli(kind)` that runs `<bin> --version` with short timeout; call from both `validateAuthMethod` and `scripts/gf new --cli`.
2. Allowlist `$auth ∈ {claude, codex, gemini}` in `gf new`.
3. Parse stderr for common auth failure keywords and surface a "run `<cli> login`" hint.
4. Document settings precedence in `README.md`.

Effort: 0.5 day.

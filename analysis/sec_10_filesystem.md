# SEC #10 — Filesystem Safety (P1)

Scope: `scripts/gf` write paths, `setup.sh` writes, `~/.qwen/settings.json` overwrite.

## Findings

### F10.1 `$GAMES/$name` — `$name` not validated — P1
- Evidence: `scripts/gf:35-36`: `dir="$GAMES/$name"; mkdir -p "$dir"`. `$name` is `$1`. An attacker-chosen name like `../../.ssh/evil` would break out of `games/`.
- Impact: `gf new ../../.ssh/evil --genre grid_logic` creates `~/.ssh/evil/GAME.md` (sibling traversal relative to `games/`).
- Fix: validate `$name` matches `^[a-z0-9][a-z0-9-]{0,63}$`.

### F10.2 `cat GAME.md` from cwd `$dir` — acceptable; but no cwd assert — P2
- Evidence: `scripts/gf:68-69`. If `$dir` disappears mid-run (race), `cd` fails under `set -e`; OK.

### F10.3 `setup.sh` writes `~/.qwen/settings.json` — overwrites user's existing — P1
- Evidence: `setup.sh:148-159`. `cat > "$QWEN_SETTINGS"` clobbers anything the user had (e.g. existing Qwen/Gemini CLI preferences, other auth config).
- Fix: merge JSON via `jq`, preserving other keys; or warn+backup before overwrite.

### F10.4 `xattr -cr .` recursion — also filesystem concern — P0 (also SEC #2 F2.2)
- Recursively modifies every file under the fork. Acceptable per intent but broad.

### F10.5 `secrets.env` permissions not set — P1
- Evidence: `setup.sh:57-73`. File is created with umask-default perms (usually 644). World-readable on multi-user machines.
- Fix: `chmod 600 "$LOCAL_SECRETS"` after creation.

### F10.6 Symlink creation without check — P2
- Evidence: `setup.sh:82` `ln -sf "$CFG_SECRETS" "$LINK"` — always overwrites. If `$LINK` is an attacker-placed regular file containing their secrets, this silently replaces with symlink (data loss, no exfil).

### F10.7 `gf list` node -e with game dir interpolation — P2
- Evidence: `scripts/gf:99` — `node -e "console.log(require('$d/.qwen/settings.json')...` — `$d` contains directory name. If a game is named with `'` it breaks JS; if named with backticks it could execute shell. Practically guarded by `gf new` sanitization (after F10.1 fix).

## Severity Summary

| ID | Finding | Severity |
|---|---|---|
| F10.1 | Unvalidated `$name` enables path traversal | P1 |
| F10.3 | `~/.qwen/settings.json` clobber | P1 |
| F10.5 | `secrets.env` world-readable perms | P1 |
| F10.6 | Symlink blindly overwrites | P2 |
| F10.7 | `node -e` interpolation | P2 |

## Mitigations

1. Regex-validate `$name` and `$auth` at entry of each `gf` subcommand.
2. Merge `~/.qwen/settings.json` with `jq` preserving existing keys; `.bak` backup.
3. `chmod 600 secrets/*.env` after write.
4. Refuse to `ln -sf` over a non-symlink; prompt to confirm.

Effort: 0.5 day.

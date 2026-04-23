# Code #8 — Observability

> Analysis model: GPT via Codex MCP
> Date: 2026-04-23

---

## Current Blind Spots

| What Can Go Wrong | Currently Detectable? | Notes |
|---|---|---|
| `opengame` hung, produced no `index.html` | No | Only terminal scroll-back, no durable record |
| Generation succeeded but `index.html` is 200 bytes (empty/broken) | No | File existence check passes |
| Which CLI adapter was used for which game | No | Not recorded anywhere |
| How long generation took | No | No timing |
| Which `gf iterate` pass introduced a regression | No | No version/correlation chain |
| Playtest screenshot taken before game initialized | No | `networkidle` silently swallowed |
| Setup skipped a credential non-interactively | Partial | Yellow message only, not durable |
| Model override env vars lost in sandbox run | No | |

---

## Proposed Log Schema (JSONL)

**Format:** Append-only JSON Lines. One event per line. Written to game-scoped files — not mixed into terminal stdout.

### Common Envelope
```json
{
  "ts": "2026-04-23T14:21:33.412Z",
  "event": "generate.finish",
  "schemaVersion": 1,
  "game": "tap-reflex",
  "correlationId": "tap-reflex-20260423T142133Z"
}
```

### `generate.start`
```json
{
  "ts": "...", "event": "generate.start", "schemaVersion": 1,
  "game": "tap-reflex", "correlationId": "...",
  "cli": "codex-cli", "cwd": "/.../games/tap-reflex",
  "promptSource": "GAME.md", "promptBytes": 1824
}
```

### `generate.finish` (success)
```json
{
  "ts": "...", "event": "generate.finish", "schemaVersion": 1,
  "game": "tap-reflex", "correlationId": "...",
  "cli": "codex-cli", "durationMs": 418233,
  "exitCode": 0, "errorCategory": "none",
  "indexHtmlExists": true, "indexHtmlBytes": 84213,
  "indexHtmlMtime": "2026-04-23T14:28:21.101Z",
  "artifactVersion": "1745411301101-84213"
}
```

### `generate.finish` (failure)
```json
{
  "ts": "...", "event": "generate.finish", "schemaVersion": 1,
  "game": "tap-reflex", "correlationId": "...",
  "cli": "codex-cli", "durationMs": 900112,
  "exitCode": 1, "status": "error",
  "errorCategory": "timeout",
  "errorSummary": "codex timed out after 900000ms",
  "indexHtmlExists": false
}
```

### `playtest.finish`
```json
{
  "ts": "...", "event": "playtest.finish", "schemaVersion": 1,
  "game": "tap-reflex", "correlationId": "...",
  "durationMs": 6214,
  "title": "Tap Reflex", "bodySnippet": "...",
  "errors": [], "errorsCount": 0,
  "warnings": ["networkidle timed out"], "warningsCount": 1,
  "screenshot": "games/tap-reflex/playtest.png",
  "verdict": "PASS", "errorCategory": "none",
  "indexHtmlBytes": 84213,
  "indexHtmlMtime": "2026-04-23T14:28:21.101Z",
  "artifactVersion": "1745411301101-84213"
}
```

### `setup.step`
```json
{
  "ts": "...", "event": "setup.step", "schemaVersion": 1,
  "step": "install_cli", "target": "codex",
  "status": "skipped", "reason": "already_present"
}
```

### Error Categories
`timeout` | `non_zero_exit` | `missing_output` | `empty_output` | `spawn_error` | `json_parse_failure` | `navigation_error` | `runtime_error` | `unknown`

---

## File Locations

```
games/<game>/.gf/events.jsonl        All per-game generate/playtest/iterate events
games/<game>/.gf/latest-playtest.json  Last structured playtest result
games/<game>/playtest.png            Existing artifact — keep
.gf/setup.jsonl                      Factory-level bootstrap/install log
```

**Why this layout:**
- Per-game history stays with the game
- Root setup log stays factory-wide
- One append-only stream per game — simpler than separate `generate.jsonl` + `playtest.jsonl`
- Terminal output stays human-readable (unchanged)

---

## Correlation ID Strategy

Format: `<game>-<UTC-compact-timestamp>`
Example: `tap-reflex-20260423T142133Z`

Rules:
- Created at the start of `gf generate`, `gf iterate`, `gf playtest`
- If `gf generate` auto-invokes playtest, pass the same `correlationId`
- Allow override via `GF_CORRELATION_ID=<id> gf playtest tap-reflex`

---

## Timing Hooks

| Location | Measurement |
|---|---|
| `gf generate` | Start before `opengame` spawn; end after post-check of `index.html` |
| `gf iterate` | Same as generate |
| `playtest.mjs` | `performance.now()` at script start; sub-timers: `launchMs`, `gotoMs`, `interactionMs`, `screenshotMs`, `totalMs` |
| `setup.sh` | Per major step: Node check, CLI install/skip, secrets bootstrap, npm install, bundle, npm link |

Bash timing: `start_ms=$(node -e 'process.stdout.write(String(Date.now()))')`
Node timing: `const t0 = performance.now()` from `node:perf_hooks`

---

## OpenGame's `LoggingContentGenerator`

Covers model request/response timing, model error logging, usage metadata, internal telemetry. Does NOT cover:
- Whether `gf generate` produced `index.html`
- Output file size
- Per-game run history
- Setup/install actions
- Correlation between generation and playtest in the factory workflow

Additionally, it may log prompt/request content depending on config — conflicts with "no PII in logs" requirement. Treat it as secondary/internal. Keep factory observability independent.

---

## Code Changes (Pseudocode)

### 1. Shared JSONL helper: `scripts/obs.mjs` — Effort: S
```javascript
export function nowIso() { return new Date().toISOString(); }
export function makeCorrelationId(game) { return `${game}-${nowIso().replace(/[:.]/g,'').slice(0,18)}Z`; }
export function appendJsonLine(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(obj) + '\n', 'utf8');
}
export function fileMeta(path) {
  if (!existsSync(path)) return { exists: false };
  const s = statSync(path);
  return { exists: true, bytes: s.size, mtime: new Date(s.mtimeMs).toISOString(),
           mtimeMs: s.mtimeMs, artifactVersion: `${Math.trunc(s.mtimeMs)}-${s.size}` };
}
export function classifyGenerateFailure({ exitCode, timedOut, htmlExists, htmlBytes }) {
  if (timedOut) return 'timeout';
  if (exitCode !== 0) return 'non_zero_exit';
  if (!htmlExists) return 'missing_output';
  if (htmlBytes === 0) return 'empty_output';
  return 'unknown';
}
```

### 2. `gf generate` wrapper — Effort: S
```bash
obs_log="$dir/.gf/events.jsonl"
cid="${GF_CORRELATION_ID:-$(node "$ROOT/scripts/obs.mjs" make-id "$name")}"
start_ms=$(node -e 'process.stdout.write(String(Date.now()))')
# log generate.start event
set +e; opengame -p "$(cat GAME.md)" --yolo; exit_code=$?; set -e
end_ms=$(node -e 'process.stdout.write(String(Date.now()))')
# log generate.finish with file meta, duration, exit code, error category
exit "$exit_code"
```

### 3. `playtest.mjs` augmentation — Effort: S
- Add `performance.now()` at start
- Wrap in top-level try/catch
- In finally: compute duration, `fileMeta(htmlPath)`, classify errors
- `appendJsonLine(eventsPath, result)` + `writeFileSync(latestPath, ...)`
- Continue emitting to stdout for scripting compatibility

### 4. `setup.sh` step logging — Effort: S
```bash
log_step() { node "$ROOT/scripts/obs.mjs" log-step --file "$ROOT/.gf/setup.jsonl" "$@"; }
log_step --step install_cli --target codex --status skipped --reason already_present
```

### 5. Stderr redaction before logging — Effort: S
Store only first 160 chars after removing `*_API_KEY=...`, bearer tokens, long base64-like secrets. Never store raw prompt content.

---

## Effort Summary

| Change | Effort |
|---|---|
| Shared JSONL helper (obs.mjs) | S |
| `gf generate`/`iterate` instrumentation | S |
| `gf playtest` correlation ID pass-through | XS |
| `playtest.mjs` augmentation + persistence | S |
| `setup.sh` step logging | S |
| Error categorization helper | XS |
| Stderr redaction | S |
| **Total** | **~S (2-3 days)** |

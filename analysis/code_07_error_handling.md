# Code #7 — Error Handling

> Analysis model: GPT via Codex MCP
> Date: 2026-04-23

---

## Findings

| Severity | Location | Error Scenario | Current Behavior | Expected Behavior | Fix |
|---|---|---|---|---|---|
| P1 | `scripts/gf:3`, `scripts/gf:92` | `vercel deploy` fails, pipeline returns 0 | `set -e` + no `pipefail` — `grep`/`head` can exit 0 despite upstream failure; URL is empty but script appears to succeed | Pipeline failure must surface; deploy URL absence must be fatal | `set -euo pipefail`; capture output to tmp; check URL explicitly |
| P1 | `scripts/gf:90` | `gh repo create` auth/network/name conflict | `>/dev/null 2>&1 \|\| true` — fully swallowed; script continues; user may believe repo was created | Failure should be reported as warning or fatal depending on policy | Remove `\|\| true`; log stderr if non-fatal; print "GitHub repo create skipped/failed" |
| P1 | `scripts/gf:69`, `scripts/gf:80` | `opengame` exits non-zero mid-generation leaving partial `index.html` | `set -e` stops the script. But partial `index.html` remains. `gf playtest`/`ship` only check file existence, so broken artifact passes as valid | Atomic output: old file preserved or new file validated before replacing | Write to `index.html.tmp`; move on success; validate file size > 0 after generation |
| P1 | `scripts/setup.sh:15`, `scripts/gf:3` | `set -e` gaps in pipes/OR-suppressed contexts | Partial protection only; `\|\| true`, `2>/dev/null`, pipeline stages silently pass | Consistent strict mode; expected non-fatal cases explicitly marked | `set -euo pipefail` in both scripts; document each `\|\| true` or `2>/dev/null` with rationale |
| P2 | `scripts/gf:20`, `scripts/gf:99` | JSON parse / settings read error | `2>/dev/null` suppresses stderr; `preset_template` returns empty string; `list` shows CLI as `-` | Missing file vs malformed JSON should be distinguished; user should see warning | Don't suppress stderr; check exit code; print "settings unreadable" or "preset missing" |
| P2 | `scripts/playtest.mjs:40`, `scripts/playtest.mjs:51` | `networkidle` timeout or click failure | `.catch(() => {})` and `catch {}` swallow failures; PASS returned | Soft failures should appear in `warnings`; load failures should affect verdict | Write to `warnings` array; add `loadWarnings` field; consider WARN verdict |
| P2 | `scripts/playtest.mjs:39`, `scripts/playtest.mjs:72` | `page.goto()` throws; asset load failure; non-interaction failures | `goto` throws → unhandled crash with stack trace (visible but unfriendly). Warnings/click failures → PASS. Verdict only checks `errors.length` | All failure modes should produce structured JSON output | Top-level try/catch; always emit JSON (with errors); verdict should include load and interaction health |
| P2 | `scripts/setup.sh:101`, `scripts/setup.sh:125`, `scripts/setup.sh:143` | Non-interactive skip; `npm install`/`npm link` transient failure | Non-interactive: yellow message + continue. `npm install`/`npm link`: hard fail on first error, no retry | Missing credentials summarized at end; transient npm failures retried | Setup summary at end; retry helper for `npm install`/`npm link` (2-3 attempts) |
| P2 | `cliContentGenerator.ts:166` | CLI stderr very long or main error at end | Non-zero exit surfaces (good), but stderr truncated to 400 chars | Sufficient context should be visible | Use tail-of-stderr approach; include exit code, signal, command in error |
| P2 | `contentGenerator.ts:59`, `cliContentGenerator.ts:145,222` | Timeout, transient spawn failure, auth/network issue | `runCli()` one attempt; `maxRetries` defined in config but unused in CLI adapter | Retryable errors should be retried with backoff | Wire `maxRetries` into CLI adapter; classify: retryable (timeout, ECONNRESET) vs non-retryable (ENOENT, auth) |

---

## What Surfaces to User vs What's Silent

### Surfaces to User
- `gf generate`/`iterate`: if `opengame` exits non-zero, `set -e` stops the script and opengame's terminal output is visible
- `playtest.mjs`: if `page.goto()` throws, process crashes with stack trace
- `cliContentGenerator.runCli()`: timeout, ENOENT, non-zero exit all produce explicit rejections that propagate to caller

### Silent or Weakly Surfaced
- `gh repo create` failure — fully swallowed (`|| true`)
- `vercel deploy` pipeline failure — masked by `grep`/`head` exit codes
- `gf list` and preset JSON/Node errors — `2>/dev/null`
- `playtest.mjs` click failures and `networkidle` timeout — `catch {}` and `.catch(() => {})`
- Partial `index.html` from failed generation — remains on disk, accepted by downstream commands as valid

---

## Key Recommendation: Atomic Generation Output

The most operationally dangerous gap is partial artifact persistence:

```bash
# In gf generate, replace:
opengame -p "$(cat GAME.md)" --yolo

# With:
opengame -p "$(cat GAME.md)" --yolo && {
  # Post-generation validation
  if [ ! -f "$dir/index.html" ]; then
    echo "ERROR: generation produced no index.html" >&2
    exit 1
  fi
  size=$(wc -c < "$dir/index.html")
  if [ "$size" -lt 500 ]; then
    echo "ERROR: index.html suspiciously small (${size} bytes)" >&2
    exit 1  
  fi
  echo "✓ Generated index.html (${size} bytes)"
}
```

---

## Recommended Changes Priority

1. **P1 — Immediate**: `set -euo pipefail` in both scripts
2. **P1 — Immediate**: Remove `|| true` from `gh repo create`; fix `vercel deploy` pipeline
3. **P1 — Short-term**: Atomic generation output (validate `index.html` before accepting as success)
4. **P2 — Short-term**: `playtest.mjs` top-level try/catch; always emit structured JSON
5. **P2 — Short-term**: Wire `maxRetries` into CLI adapter
6. **P2 — Medium-term**: Setup summary at end; retry for transient npm errors

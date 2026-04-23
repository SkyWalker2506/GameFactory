# SEC #11 — Logging / PII (P2)

Scope: stdout/stderr of `scripts/gf`, `playtest.mjs`, `setup.sh`; any persisted logs.

## Findings

### F11.1 Raw `opengame` output streamed to terminal — P2
- Evidence: `scripts/gf:69,80`. The CLI's own tool-call transcripts land on the dev's terminal, which may be captured by terminal-session-logging tools (asciinema, iTerm triggers, Claude Code transcripts). If the LLM echoes any snippet of a secret during tool use, it is now in multiple logs.
- Fix: optional `GF_QUIET=1` mode that pipes to `games/<name>/generate.log` with a redactor.

### F11.2 `playtest.mjs` prints `bodySnippet` (200 chars of rendered body) — P2
- Evidence: `playtest.mjs:58,62-70`. If generated game happens to render an exfiltrated secret into DOM, it lands in stdout JSON.
- Fix: redact; or opt-out of bodySnippet.

### F11.3 Error messages include up to 400 chars of CLI stderr — P2
- Evidence: `cliContentGenerator.ts:167`. CLIs sometimes include request IDs, account hints, even truncated auth headers in verbose error modes.
- Fix: regex-scrub before including.

### F11.4 `setup.sh` prompts log raw entered values via `green "saved to ..."` — P2
- Evidence: `setup.sh:108-110`. The *location* is logged, not the value, but the written line `VAR=value` sits in `secrets.env` (intended). OK.

### F11.5 Timeout bump commit message visible in git log — informational — P2
- Evidence: recent commit `4829594 fix(cli-adapter): bump default timeout to 900s for slower CLIs (gemini)`. No PII leak; simply noting that operational changes show in public git history after `gf ship` publishes.

### F11.6 No structured logging / observability — P2
- Evidence: no log format convention anywhere in meta. Makes incident response hard ("when did secret X first leak?").
- Fix: JSON-lines log to `~/.gamefactory/log/YYYY-MM-DD.jsonl` with redactor.

## Severity Summary

| ID | Finding | Severity |
|---|---|---|
| F11.1 | Raw CLI output untouched | P2 |
| F11.2 | bodySnippet unredacted | P2 |
| F11.3 | stderr echoed in error message | P2 |
| F11.6 | No structured logging | P2 |

## Mitigations

1. Central redactor utility (node + bash) used by `gf`, `playtest.mjs`, `cliContentGenerator.ts`.
2. Structured JSONL log with rotation.
3. `GF_QUIET=1` env to suppress stdout when piping.

Effort: 0.5 day.

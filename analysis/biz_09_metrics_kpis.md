# BizLead #9 — Metrics / KPIs

**Analyst:** BizLead (Sonnet)
**Date:** 2026-04-23
**Scope:** Define generation success rate, first-playable pass rate, and operational KPIs

---

## Findings

### Current State: No Metrics

GameFactory currently collects zero metrics. There is no:
- Logging of generation outcomes (success/failure/timeout)
- Tracking of playtest results
- Structured output from `gf` commands beyond print statements
- Analytics on deployed games (page views, play sessions)
- Any data store beyond the filesystem

This is acceptable for a solo early-stage OSS tool but makes it impossible to answer basic quality questions: "What percentage of generations produce a playable game on the first try?"

### Proposed KPI Framework

#### Primary KPIs — Generation Quality

**1. Generation Success Rate (GSR)**

Definition: Percentage of `gf generate` runs that complete without a process-level error (non-zero exit from `opengame`).

Formula: `successful_runs / total_runs * 100`

Measurement: Log exit code of `opengame` subprocess in `gf generate`. Append to `games/<name>/gen.log`.

Target: >90% (CLI stability goal). Current baseline: unknown.

Failure modes counted against this metric:
- `opengame` timeout (900s exceeded)
- CLI auth failure
- OpenGame internal crash
- Network error to LLM provider

Note: A generation that produces syntactically invalid HTML still counts as a success here — the subprocess exited 0. Invalid output is captured by the next metric.

**2. First-Playable Pass Rate (FPPR)**

Definition: Percentage of generated games that are "playable" on the first generation attempt, without manual intervention or iteration.

Formula: `games_passing_playtest / games_generated * 100`

Measurement: After each `gf generate`, automatically run `gf playtest` and check for:
- No JS errors in Playwright console
- Page renders a canvas or interactive element
- At least one user-interaction event is possible (click/keydown listener exists in DOM)

Target: >70% (LLM code quality goal). Current baseline: unknown.

This is the most important quality metric for the product. It reflects the real "does it work?" question.

**3. Playtest Pass Rate (PPR)**

Definition: Same as FPPR but measured across all playtest runs (including post-iterate runs, not just first generation).

Formula: `passing_playtests / total_playtests * 100`

Target: >85% (generation + iteration loop quality). A game that fails FPPR but passes after one iteration still succeeds here.

#### Secondary KPIs — Operational

**4. Generation Time (P50 / P95)**

Definition: Wall-clock time from `gf generate` invocation to `opengame` exit.

Measurement: Bash `time` wrapper or explicit `$SECONDS` in `gf`.

Target: P50 < 180s, P95 < 900s (current timeout). Current: committed timeout bump to 900s suggests P95 was hitting limits.

**5. CLI Fallback Rate**

Definition: Percentage of generations attempted with each CLI (claude/codex/gemini). Useful for understanding which CLI is most reliable.

Measurement: Log `selectedType` from `.qwen/settings.json` per generation.

**6. Ship Rate**

Definition: Percentage of generated games that are ultimately shipped (`gf ship` called).

Formula: `games_with_vercel_url / games_generated * 100`

Target: >50% (most generated games should be worth shipping).

**7. Iterate Count per Game**

Definition: Number of `gf iterate` calls before a game is shipped.

Measurement: Count `gf iterate` invocations per game from `gen.log`.

Target: Median < 3 iterations to ship. High iteration counts signal poor first-generation quality.

#### Tertiary KPIs — Usage (If Public)

**8. GitHub Stars / Forks** — community adoption proxy

**9. Live Game Count** — total Vercel-deployed games across all users (currently 3 live examples)

**10. Time-to-First-Game** — from `git clone` to first successful `gf ship`. Target: <30 minutes for a developer familiar with Node.

### Instrumentation Plan

The `gf` script can be extended with a lightweight local metrics collector:
- Append JSON lines to `~/.gf/metrics.jsonl` after each command
- Each line: `{cmd, game, timestamp, duration_s, exit_code, cli_type, playtest_passed}`
- `gf stats` command reads this file and prints summary

No external service needed at current scale. If GameFactory grows, export to a simple InfluxDB or even a static GitHub Gist for community aggregate data.

### Playtest Metric Definition

The current `playtest.mjs` takes a screenshot (`playtest.png`). To support KPIs, it needs structured output:

```json
{
  "game": "smoke-test",
  "timestamp": "2026-04-23T10:00:00Z",
  "passed": true,
  "errors": [],
  "has_canvas": true,
  "has_interactive": true,
  "duration_ms": 3200
}
```

Exit code 0 = passed, 1 = failed. This enables `gf generate` to automatically capture FPPR.

---

## Severity

| Issue | Severity |
|---|---|
| Zero metrics collected — cannot measure generation quality | P1 |
| `playtest.mjs` produces only a screenshot, no structured pass/fail | P1 |
| No definition of "playable" — FPPR undefined and unmeasurable | P2 |
| No generation time tracking — cannot detect CLI performance regression | P2 |

---

## Evidence

- `scripts/gf`: no logging of exit codes, durations, or outcomes
- `scripts/playtest.mjs`: produces `playtest.png` only — no JSON output, no exit code signaling
- `README.md`: no mention of any metric or quality benchmark
- `games/` directory: 3 games (smoke-test, tap-reflex, word-guess) — manual inspection is the only current quality signal

---

## Recommendations

1. **(P1) Add structured output to `playtest.mjs`**: Emit a `playtest.json` alongside `playtest.png`. Exit 0/1 based on pass/fail. Define "pass" as: no JS errors + canvas or interactive element present.

2. **(P1) Log generation outcomes in `gf`**: Append to `~/.gf/metrics.jsonl` after each `gf generate` and `gf playtest` invocation.

3. **(P2) Add `gf stats` command**: Reads `~/.gf/metrics.jsonl`, prints GSR, FPPR, P50/P95 generation time, CLI breakdown.

4. **(P2) Auto-playtest after generate**: Optionally run playtest automatically after `gf generate` (with `--playtest` flag) to capture FPPR without extra step.

5. **(P2) Set baseline targets**: After collecting 20 generations, establish baseline GSR and FPPR numbers. Document in `docs/quality-benchmarks.md`.

---

## Effort

- `playtest.mjs` structured output: 2 hours
- `gf` metrics logging: 2 hours
- `gf stats` command: 3 hours
- Auto-playtest flag: 1 hour
- Total: ~8 hours

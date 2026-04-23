# Code #6 — Performance (Partial)

> Analysis model: GPT via Codex MCP
> Date: 2026-04-23
> Focus: CLI spawn overhead, 900s timeout, generation cost, playtest

---

## Findings

| Severity | Issue | Evidence | Fix |
|---|---|---|---|
| High | Silent hangs consume 15 min with no progress signal | `cliContentGenerator.ts:145` hard timeout 900s; no heartbeat; no inactivity timeout | Split into `maxDuration` + `idleTimeout`; surface periodic progress; default hard timeout 180-300s |
| High | Timeout kill is shallow — descendants may survive | `cliContentGenerator.ts:140-147` plain `spawn()` then `child.kill('SIGTERM')`; no process-group kill, no SIGKILL escalation | Spawn in separate process group, kill group; escalate to SIGKILL after grace period |
| Medium | No retry on transient CLI/API failure | `generateContent()` awaits `runCli()` once; `maxRetries` in config but unused by CLI adapter | Add bounded retries for retryable failures: timeout before first byte, 429-like errors, ECONNRESET |
| Medium | Full stdout/stderr buffering — no cap, memory scales with output | `cliContentGenerator.ts:143-151` accumulates all bytes in JS strings | Stream chunks to log; enforce output cap; spool large output to temp file |
| Medium | `gf generate` chain adds 0.8-2s overhead on every call | bash → opengame node (~300-500ms) → spawn provider CLI (~200-1500ms startup) | Not primary bottleneck; pass prompt via stdin to eliminate one arg-expansion overhead |
| Medium | Playtest has no end-to-end deadline | `playtest.mjs:39-40` networkidle swallowed; per-click timeout only 1500ms; no global timeout | Add overall playtest timeout via `Promise.race` or `AbortController` |
| Low | `$(cat GAME.md)` eagerly materializes whole prompt before opengame starts | `scripts/gf:69` | Minor: `opengame -p - < GAME.md` avoids shell expansion |

---

## Detailed Analysis

### 1. Realistic End-to-End Latency

Local chain overhead: ~0.5-2s (bash start, node startup, CLI startup). Not the primary cost.

Dominant cost is the provider doing agent/tool work:

| Scenario | Expected Duration |
|---|---|
| Simple prompt, small game, limited tool loop | 45-120s |
| Normal single-file game generation | 2-6 min |
| Slow tail (provider stall, large tool loop, Gemini worst case) | 8-15 min |

Process-chain overhead is typically under 5% of total wall time. Becomes noticeable on repeated `iterate` calls.

### 2. Is 900s Appropriate?

No. 900s is a tail-budget used as a default, not a healthy operational default. A silent dead session gets the same 15-minute budget as a productive long run.

Better timeout shape:
- Default hard timeout: **180-300s**
- Idle timeout (no stdout/stderr activity): **30-60s**
- Provider-specific overrides:
  - `claude`/`codex`: 180-300s
  - `gemini`: 300-600s if evidence supports it

### 3. Silent Hang — User Experience

Current behavior during a silent hang:
- No streaming output (adapter buffers everything)
- No inactivity detection
- No partial-progress logging
- User sees nothing until timeout or completion

User cannot distinguish:
- Healthy but slow generation
- Provider-side stall
- Child process deadlock
- Auth flow waiting unexpectedly
- Descendant alive after parent timeout

### 4. Memory Impact of Full Buffering

The adapter accumulates both `out` and `err` as JS strings:

| stdout size | Approximate memory footprint |
|---|---|
| 200 KB | ~1 MB (safe) |
| 1 MB | ~2-4 MB (safe) |
| 5 MB | ~10-20 MB (noticeable) |
| 20 MB | ~40-60 MB peak (problematic) |

For a single-file HTML game, typical output is 100KB-1MB — ordinary runs fine. Risk is malformed output or verbose tool logs producing unbounded growth.

### 5. SIGTERM Propagation / Zombie Risk

`child.kill('SIGTERM')` targets only the direct spawned CLI process — not grandchildren. Provider CLIs may launch helper processes that survive after the parent is killed.

The main risk is not classic zombie accumulation (Node reaps the direct child on `close`) but **orphaned live descendants** continuing after the parent has declared failure. This compounds with subscription CLIs that may launch browser-based auth or telemetry helpers.

**Fix:**
```typescript
// Spawn in separate process group
const child = spawn(spec.bin, spec.args(prompt, model), {
  stdio: ['pipe', 'pipe', 'pipe'],
  detached: true,  // creates new process group on Unix
});

// Kill entire process group on timeout:
timer = setTimeout(() => {
  try { process.kill(-child.pid, 'SIGTERM'); } catch {}
  setTimeout(() => {
    try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  }, 5000);
  reject(new Error(`${spec.bin} timed out after ${timeoutMs}ms`));
}, timeoutMs);
```

### 6. Missing Retry Logic

`generateContent()` calls `runCli()` once and either succeeds or fails. `maxRetries` is defined in `ContentGeneratorConfig` but wired to zero effect in the CLI adapter.

Each failed attempt already paid: OpenGame startup, CLI startup, partial remote work cost, user waiting time. Even a single retry for idempotent failures is high-value.

**Retryable conditions:**
- Timeout before first stdout byte (likely transient stall)
- `ECONNRESET`, `EAI_AGAIN` (network transient)
- CLI stderr containing `429` or `rate limit` patterns
- `SIGTERM` from timeout (retry with shorter budget)

**Non-retryable:**
- `ENOENT` (CLI not installed)
- Non-zero exit with auth error patterns
- Non-zero exit with "invalid prompt" patterns

### 7. Playtest Timeout

Normal failure path upper bound from visible code:
- `goto`: Playwright default navigation timeout (~30s)
- `networkidle`: swallowed silently
- clicks: up to `5 × 1500ms + 5 × 300ms = 9s`
- screenshot/extract: additional ops

No robust global stop condition. For CI usage, add:
```javascript
const PLAYTEST_TIMEOUT_MS = 60_000;
await Promise.race([
  runPlaytest(page, gameDir, name),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('playtest global timeout')), PLAYTEST_TIMEOUT_MS)
  ),
]);
```

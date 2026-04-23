# Code #3 — Testing

> Analysis model: GPT via Codex MCP
> Date: 2026-04-23

---

## Current State

| Surface | Test Coverage | Notes |
|---|---|---|
| `factory/opengame` workspace | Vitest per-package + integration suites | Upstream tests exist; OpenGame has decent adjacent coverage |
| `contentGenerator.test.ts` | Partial | Covers Gemini and LoggingContentGenerator; NOT CLI auth types |
| `auth.test.ts` | Partial | Covers `openai`, `qwen-oauth`, invalid input; NOT claude-cli/codex-cli/gemini-cli branches |
| `cliContentGenerator/` | NONE | No test file exists alongside the new adapter |
| `scripts/gf` | NONE | Untested bash routing logic |
| `scripts/playtest.mjs` | NONE (it IS a test runner, not a tested module) | |
| `docs/genre-presets.json` | NONE | No schema/assertion test |
| Root `package.json` | `"test": "echo 'Error: no test specified' && exit 1"` | Hard placeholder |

---

## Gap Analysis

Missing specifically for GameFactory patches:

1. `CliContentGenerator.generateContent` — spawn args, stdin write, stdout parse, response shape, usageMetadata
2. `authToKind`, `flattenContents`, `approxTokens`, `runCli` — pure helpers, untested, not currently exported
3. `runCli` timeout, ENOENT, non-zero exit handling — regression-prone
4. `validateAuthMethod` extensions for `claude-cli`, `codex-cli`, `gemini-cli` — uncovered in existing test file
5. `createContentGenerator`/`createContentGeneratorConfig` CLI auth routing and default model logic
6. `scripts/gf` branching logic (`new`, `generate`, `playtest`, `iterate`, `ship`, `list`, `genres`)
7. `genre-presets.json` schema validity — malformed JSON or missing keys break UX silently

---

## Proposed Harness (File Tree)

```
package.json                            ← change test script to run smoke suite
tests/
  smoke/
    gf.test.mjs
    genre-presets.test.mjs
    playtest-contract.test.mjs
    fixtures/
      sample-game/index.html
factory/opengame/packages/core/src/core/cliContentGenerator/
  cliContentGenerator.test.ts           ← NEW — highest priority
factory/opengame/packages/core/src/core/
  contentGenerator.cli.test.ts          ← NEW — CLI routing + defaults
factory/opengame/packages/cli/src/config/
  auth.cli.test.ts                      ← NEW — validateAuthMethod extensions
```

---

## Test Stubs

### `cliContentGenerator.test.ts`
```typescript
describe('CliContentGenerator', () => {
  it('generateContent spawns selected CLI and returns parsed response')
  it('flattenContents includes system and role-tagged parts in stable order')
  it('approxTokens uses ceil(length / 4) with minimum 1')
  it('runCli rejects on timeout — SIGTERM + error message')
  it('runCli maps ENOENT to install hint error')
  it('runCli rejects on non-zero exit with stderr preview')
  it('generateContentStream yields one chunk after full completion')
  it('embedContent throws NotImplemented')
})
```

### `contentGenerator.cli.test.ts`
```typescript
describe('createContentGenerator CLI routing', () => {
  it('routes claude-cli to CliContentGenerator')
  it('routes codex-cli to CliContentGenerator')
  it('routes gemini-cli to CliContentGenerator')
  it('createContentGeneratorConfig assigns claude default model')
  it('createContentGeneratorConfig assigns codex default model')
  it('createContentGeneratorConfig assigns gemini default model')
  it('respects CLAUDE_CLI_MODEL env var override')
})
```

### `auth.cli.test.ts`
```typescript
describe('validateAuthMethod CLI types', () => {
  it('returns null for claude-cli')
  it('returns null for codex-cli')
  it('returns null for gemini-cli')
})
```

### `tests/smoke/genre-presets.test.mjs`
```javascript
describe('genre-presets.json contract', () => {
  it('parses without error')
  it('each preset has label, examples, promptTemplate')
  it('examples is a non-empty array per preset')
  it('all 12 expected genres are present')
})
```

### `tests/smoke/gf.test.mjs`
```javascript
// Run bash scripts/gf with stubbed PATH (fake opengame/gh/vercel binaries)
describe('gf CLI', () => {
  it('help prints command summary')
  it('genres prints all preset labels')
  it('new creates GAME.md and CLAUDE.md')
  it('new --cli writes .qwen/settings.json')
  it('new without name prints usage and exits 1')
})
```

---

## Mock Strategy for child_process.spawn

```typescript
import { vi } from 'vitest';
import { EventEmitter } from 'node:events';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

function makeChildMock() {
  const child = new EventEmitter() as any;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = { end: vi.fn() };
  child.kill = vi.fn();
  return child;
}

// Success scenario:
child.stdout.emit('data', '{"result": "game code here"}');
child.emit('close', 0);

// Failure scenario:
child.stderr.emit('data', 'auth failed');
child.emit('close', 1);

// ENOENT:
child.emit('error', Object.assign(new Error('not found'), { code: 'ENOENT' }));

// Timeout: use fake timers, never emit close, assert child.kill('SIGTERM') called
```

---

## playtest.mjs Output Contract

**Worth testing.** Keep it shallow — test the stable JSON shape only:

```javascript
const result = JSON.parse(stdout);
expect(result).toHaveProperty('game');
expect(result).toHaveProperty('title');
expect(result).toHaveProperty('bodySnippet');
expect(result).toHaveProperty('errors');
expect(Array.isArray(result.errors)).toBe(true);
expect(result).toHaveProperty('warnings');
expect(result).toHaveProperty('screenshot');
expect(['PASS', 'FAIL']).toContain(result.verdict);
// Exit code matches:
expect(exitCode).toBe(result.errors.length === 0 ? 0 : 1);
```

---

## Priority Queue

| Priority | Test | Effort | Rationale |
|---|---|---|---|
| P0 | `cliContentGenerator.test.ts` | 2-3h | Newest, least-covered, most failure modes |
| P0 | `auth.cli.test.ts` | 20-30m | Cheap guard for user-visible config path already modified |
| P0 | `genre-presets.test.mjs` | 20-30m | Cheap contract test; prevents silent `gf new`/`gf genres` breakage |
| P1 | `contentGenerator.cli.test.ts` | 45-60m | Verifies factory wiring and CLI default models |
| P1 | `gf.test.mjs` (help, genres, new) | 2-4h | Shell smoke test with stubbed external bins |
| P2 | `playtest-contract.test.mjs` | 1-2h | Useful in CI if browsers installed; otherwise optional |
| P2 | Full `gf` routing (generate, iterate, ship, list) | 3-5h | More setup: temp FS + PATH stubs |

### 3 Highest-ROI Tests First

1. `cliContentGenerator.test.ts` — catches the most dangerous new code with no coverage
2. `auth.cli.test.ts` — 20-min investment, guards a user-visible config path
3. `tests/smoke/genre-presets.test.mjs` — trivial to write, prevents silent JSON breakage

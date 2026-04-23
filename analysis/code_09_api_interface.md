# Code #9 — API / Interface (ContentGenerator Contract Fidelity)

> Analysis model: GPT via Codex MCP
> Date: 2026-04-23
> Scope: `CliContentGenerator` vs `ContentGenerator` interface

---

## Contract Fidelity Matrix

| Field / Method | Expected by Callers | Actual | Risk |
|---|---|---|---|
| `candidates[0].content.parts[*].text` | Required for text consumers (`getResponseText()`, `turn.ts`) | Always returns one text part | Low for plain-text flows |
| `candidates[0].finishReason` | Required for stream completion in `turn.ts:300`, `useGeminiStream.ts:657` | Always `'STOP' as never` | Medium — synthetic; can misreport truncation or safety stops |
| `usageMetadata` | Optional structurally; used for stream validity/logging in `geminiChat.ts:74`, `turn.ts:313` | Synthetic approximate counts | Medium — accepted but inaccurate for limit/accounting |
| `promptFeedback` | Optional; propagated by `loggingContentGenerator.ts:386` | `{ safetyRatings: [] }` | Low-Medium — "no ratings" indistinguishable from "safe" |
| `candidates[0].safetyRatings` | Optional currently; policy decisions may inspect | Always `[]` | Medium — "not evaluated" = "no issues" appearance |
| `responseId` | Optional; `turn.ts:284` uses for correlation | Synthetic `cli-{Date.now()}` | Low |
| `createTime` | Optional; when present, callers expect epoch-ms string (`Number(createTime)` in `converter.ts:311`) | `Date.now().toString()` | Low — internally consistent |
| `modelVersion` | Optional; converters fall back if absent | `cfg.model \|\| kind` | Low |
| `generateContentStream()` | Callers expect incremental chunks (`geminiChat.ts:370`) | Blocks for full completion, yields once | High for streaming UX/cancellation; Medium for correctness |
| `countTokens().totalTokens` | Hard gate in session-limit logic `client.ts:440` | `ceil(len/4)` approximation — text only | High — false positives/negatives affect session behavior |
| `embedContent()` | Interface-required; `BaseLlmClient.generateEmbedding():166` awaits directly | Throws "not supported" | High if any embedding-backed path used |
| `userPromptId` | Used in other providers for metadata correlation (DashScope `dashscope.ts:132`) | Ignored | Medium — observability/correlation loss |
| `config.tools` / structured output | `BaseLlmClient.generateJson()` injects `tools`, expects `functionCall` parts back | Prompt flattened to text; returns only plain text parts | P0 — structured-output flows silently degrade |

---

## Findings

### P0

**Structured output / tool-call contract broken for `generateJson()`**

`BaseLlmClient.generateJson()` at `baseLlmClient.ts:91` injects `tools` schema and expects `functionCall` parts in the response. `CliContentGenerator` flattens the entire request to a text prompt and returns only plain text parts. When `generateJson()` is used in CLI mode, the response will parse to `{}` or throw a parse error rather than returning a structured object.

- Evidence: `cliContentGenerator.ts:97-127` (flattenContents ignores non-text parts), `cliContentGenerator.ts:200-213` (response has only text part)
- Fix: Either implement prompt-based tool-call encoding/decoding (JSON schema in prompt, parse JSON from response), OR explicitly detect `config.tools` presence and reject before execution with a clear capability error

**`embedContent()` hard contract violation**

`BaseLlmClient.generateEmbedding():166` has no fallback and directly awaits `embedContent()`. The thrown error propagates unhandled.

- Evidence: `cliContentGenerator.ts:246-250`, `baseLlmClient.ts:166`
- Fix: Capability-gate CLI auth at configuration time — CLI auth types cannot be selected for flows that require embeddings; OR provide a fallback embedding provider

### P1

**Fake streaming is not contract-faithful**

`generateContentStream()` blocks until full completion, then yields one chunk. This defeats:
- Incremental rendering of long game outputs (user sees nothing for minutes)
- Mid-flight abort semantics
- Progress indication upstream

- Evidence: `cliContentGenerator.ts:222-230`, `geminiChat.ts:370`
- Fix: Either pipe child stdout chunks through an async generator for real streaming, OR introduce a non-streaming content generator interface that routes CLI mode through a different path

**`countTokens()` can materially distort session management**

The hard session gate at `client.ts:447` uses the token count. `ceil(len/4)` misses:
- Tool payloads in the content
- JSON overhead from structured requests
- Provider-specific tokenization differences (e.g., Claude's Claude tokens ≠ GPT tokens)
- Special token overhead

- Evidence: `cliContentGenerator.ts:129`, `client.ts:440-450`
- Fix: Use model-specific tokenizer where available. If not possible, downgrade to warning-only with generous margin rather than hard block.

**`finishReason: 'STOP' as never` is a TypeScript lie**

`as never` is a type-system escape hatch. At runtime the value is the string `'STOP'`. It works with current callers but:
- Misreports truncation, safety stops, max-token exits all as `STOP`
- Lies to the type system
- Future callers checking `finishReason !== 'STOP'` for loop continuation will be misled

- Evidence: `cliContentGenerator.ts:210`
- Fix: Use the proper `FinishReason.STOP` enum value; for unknown termination states, either omit the field or map real termination signals to appropriate values

### P2

**`promptFeedback` and `safetyRatings` are ambiguous empty arrays**

Empty `safetyRatings` means "not evaluated" but looks like "no issues found" to downstream policy code that checks the arrays.

- Evidence: `cliContentGenerator.ts:204,207`
- Fix: If safety was not run, omit these fields entirely, or add an adapter capability flag so policy code can distinguish "evaluated, no issues" from "not evaluated"

**`userPromptId` ignored**

Other providers (DashScope) pass this as request metadata for traceability at `dashscope.ts:136`. The CLI adapter ignores it, breaking end-to-end correlation.

- Evidence: `cliContentGenerator.ts:189` (`_userPromptId`)
- Fix: Pass as env var or metadata file to CLI invocation; log it in the observability layer

**`createTime` format**

`Date.now().toString()` produces epoch-milliseconds as a string. This is internally consistent — `converter.ts:311` does `Number(createTime) / 1000`. No bug, but worth standardizing via a shared helper to prevent future adapters emitting ISO format accidentally.

---

## Net Assessment

Plain text generation works. The adapter is **not contract-faithful** for:
1. Structured output / tool-call responses (`generateJson()` path) — P0
2. Embeddings — P0
3. True streaming — P1
4. Token accounting — P1

For GameFactory's primary use case (single-file HTML game generation from a text prompt), none of the P0 issues are hit in normal `gf generate` flows because the game-generation path is text-in/text-out without structured output calls. However, if OpenGame's internal scaffolding uses `generateJson()` at any point in the game generation pipeline, the P0 finding becomes immediately relevant.

# Code #2 — Code Quality

> Analysis model: GPT via Codex MCP
> Date: 2026-04-23
> Scope: `scripts/gf`, `scripts/playtest.mjs`, `factory/opengame/packages/core/src/core/cliContentGenerator/cliContentGenerator.ts`

---

## Findings

| ID | Severity | File:Line | Description | Fix |
|---|---|---|---|---|
| GF-001 | P1 | `scripts/gf:3`, `scripts/gf:92` | `set -e` without `set -u`/`pipefail`. `ship` uses a pipeline (`vercel deploy \| grep \| head`) — `pipefail` absent means upstream deploy failure can be masked by `grep`/`head` returning 0 | Use `set -euo pipefail`; extract deploy URL separately; fail if URL parse fails |
| GF-002 | P1 | `scripts/gf:35` | Game names are not validated before being joined into filesystem paths and GitHub/Vercel names. Input like `../../tmp/x` escapes `games/` | Validate `name` against `^[a-z0-9][a-z0-9-]*$`; reject path separators, `..`, spaces, uppercase |
| GF-003 | P1 | `scripts/gf:89`, `scripts/gf:92` | Hardcoded personal email (`musabkara1990@gmail.com`), name (`Musab Kara`), and Vercel scope (`skywalker2506s-projects`) — leaks identity, non-portable | Read from env (`GIT_AUTHOR_EMAIL`, `GIT_AUTHOR_NAME`, `GF_VERCEL_SCOPE`); fail with clear message if missing |
| GF-004 | P2 | `scripts/gf:20`, `scripts/gf:99`, `scripts/gf:104` | `node -e` with shell value interpolation inside JS source strings — `$genre` and directory names can break JS string or inject arbitrary JS | Pass values via `process.argv`; use `fs.readFileSync` + `JSON.parse` instead of `require()` in inline scripts |
| GF-005 | P2 | `scripts/gf:77` | `iterate` injects free-form `$change` directly into the LLM prompt. Not shell injection (double-quoted), but enables prompt injection and accepts empty/malformed input | Require non-empty change text; delimit user text clearly in prompt; consider passing a file or structured template |
| GF-006 | P2 | `scripts/playtest.mjs:40` | `waitForLoadState('networkidle').catch(() => {})` silently swallows load failure — can produce false PASS | Log timeout into `warnings`; make readiness explicit; fail if page never settles |
| GF-007 | P2 | `scripts/playtest.mjs:39`, `scripts/playtest.mjs:47-51` | Weak readiness heuristic for local file:// games — `networkidle` fires before canvas/game loop initializes; screenshot/body captured before game is playable | Use `waitForSelector` or explicit `window.__GAME_READY__` contract; bounded loop over known canvas/UI |
| GF-008 | P1 | `scripts/gf:90` | `gh repo create ... \|\| true` — entire GitHub repo creation failure silently swallowed | Remove `\|\| true`; if non-fatal, emit a warning and record in log |

---

## Detailed Explanations

### GF-001 — set -e without pipefail

`set -e` alone does not protect pipeline stages. The `ship` command:
```bash
vercel deploy --prod --yes ... 2>&1 | grep -oE 'https://[^ ]+vercel\.app' | head -1
```
If `vercel deploy` exits non-zero, the `grep` and `head` commands may still exit 0, making the pipeline succeed. The deploy URL is then empty but `set -e` does not trigger. The script appears to succeed while deployment actually failed.

Fix: capture deploy output to a temp file, check exit code, then parse URL from the file.

### GF-002 — No game name validation

All path-sensitive operations use `dir="$GAMES/$name"` without normalization:
- `scripts/gf:35`: filesystem path
- `scripts/gf:83`: deploy/repo naming
- `scripts/gf:77`: before `cd`

`gf new ../../tmp/pwn` would write files outside `games/`. Even with trusted callers, this is a code quality defect in a CLI.

### GF-003 — Hardcoded identity

Every `gf ship` on any machine commits with one person's identity and deploys to one Vercel scope. This is guaranteed to create incorrect commits or failed deploys for any collaborator.

### GF-004 — node -e injection surface

Three locations embed shell values in JS source:
- `scripts/gf:20`: `$genre` inside a JS string literal
- `scripts/gf:99`: filesystem path inside `require(...)`
- `scripts/gf:104`: multi-line JS embedded in bash

Values containing `'`, backslashes, or newlines change the JS source. This creates a second injection surface layered on top of the shell.

### GF-005 — Prompt injection in iterate

The `iterate` path is NOT shell injection (double-quoted expansion). However, the user text is concatenated into a privileged instruction frame, and empty input is accepted. Control tokens, prompt delimiters, or adversarial instructions can distort the edit request.

### GF-006 / GF-007 — Playtest false PASS

Silent catches mean `PASS` can be returned when:
- The game page never settled to `networkidle`
- All 5 click interactions failed
- The canvas never rendered

`verdict` only keys off `pageerror`/console errors, so visual rendering failures are invisible.

### Validated Non-Findings

- **Claude CLI args**: `claude -p` is a flag (`--print`), not an option requiring a value. Prompt on stdin is the correct pattern for current Claude Code. Not a bug.
- **Codex `exec` subcommand**: `codex exec` is a valid, documented non-interactive subcommand. `-` correctly signals stdin. Not a bug.
- **Gemini `-p -`**: The `-` is suspicious — `gemini -p` expects a prompt string; `-` may be passed as a literal hyphen prompt rather than a stdin sentinel. This IS the Gemini bug from architecture analysis.

---

## Effort Estimates

| ID | Effort |
|---|---|
| GF-001 | S |
| GF-002 | XS |
| GF-003 | XS |
| GF-004 | S |
| GF-005 | XS |
| GF-006 | S |
| GF-007 | S |
| GF-008 | XS |

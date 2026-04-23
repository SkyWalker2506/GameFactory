# SEC #6 — Data Privacy (P1)

Scope: what data leaves the host, to whom, with what retention.

## Threat Model

At meta-level GameFactory has no end-user data (no analytics, no user accounts). The privacy surface is:
1. **Developer's own prompts** — `GAME.md` and iterate args are sent to Anthropic / OpenAI / Google servers via the respective CLI.
2. **Filesystem context** — because `--yolo` tools can read arbitrary files, tool results (file contents) are shipped to the LLM provider inside the tool-use loop.
3. **Env vars** inherited into CLIs (see SEC #1, F1.2).
4. **Generated games deployed to Vercel** — once shipped, end users load the game; that's their privacy surface (SEC #8 covers telemetry injected by LLM).

## Findings

### F6.1 Arbitrary files readable by `--yolo` become training/log data at the provider — P1
- Evidence: `scripts/gf:69`, `cliContentGenerator.ts:140`. Anthropic Claude Code, OpenAI Codex, Google Gemini CLI each have their own data-usage policies:
  - Claude Code Pro: logs prompts, may use for safety, no training by default.
  - Codex (ChatGPT): depends on "Improve model for everyone" toggle on the account.
  - Gemini CLI: Google's Workspace or consumer terms apply; typically logged.
- Any secret/credential that the LLM reads as a tool result (SSH key, `.env`, Keychain dump) is now at the provider's servers.
- Fix: restrict filesystem tools to cwd (SEC #4 mitigation doubles as privacy control).

### F6.2 Source of prompts not labeled — P2
- Evidence: `cliContentGenerator.ts:199`: `responseId = cli-<timestamp>`. No anonymization, no user-id removal. Whatever GAME.md contains (project names, internal product code names, client names) is sent verbatim.
- Fix: optional `GF_PROMPT_SCRUB=1` mode that strips obvious PII before sending.

### F6.3 Provider switching may leak one provider's prompt to another — P2
- If a user runs `claude-cli` once then switches to `gemini-cli`, the CLIs' own chat histories on disk may carry prior prompts. Not exfil, but latent privacy debt.
- Fix: document per-CLI "clear history" commands.

### F6.4 `gh repo create --public` publishes GAME.md and any sidecar files — P1
- Evidence: `scripts/gf:90`. `GAME.md` plus `CLAUDE.md` plus whatever the LLM wrote under `games/<name>/` becomes a public GitHub repo.
- Risk: developer-authored GAME.md intended as private spec becomes public. Possible accidental inclusion of client/internal info.
- Fix: `--public` should be opt-in via `gf ship --visibility public|private`; default `private`.

### F6.5 `musabkara1990@gmail.com` hard-coded in `git commit` — P2
- Evidence: `scripts/gf:89`: `git -c user.email=musabkara1990@gmail.com -c user.name="Musab Kara" commit ...`.
- Risk: any forked version of this script will commit under the author's identity until edited. Privacy on the author, attribution confusion.
- Fix: read from `$GF_GIT_EMAIL` / `git config --global user.email` with fallback.

## Severity Summary

| ID | Finding | Severity |
|---|---|---|
| F6.1 | File contents exfil to LLM provider via tool-use | P1 |
| F6.4 | `gh repo create --public` default | P1 |
| F6.2 | Prompt content not scrubbed | P2 |
| F6.5 | Hard-coded author email | P2 |
| F6.3 | Cross-CLI history residue | P2 |

## Mitigations

1. Scope filesystem tools (reuse SEC #4 fix).
2. `gf ship` default `--visibility private`; require explicit `--public`.
3. `GF_PROMPT_SCRUB` optional regex redactor.
4. Parameterize author identity.

Effort: 0.5 day.

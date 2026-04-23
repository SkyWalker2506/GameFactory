# SEC #7 — Dependency CVEs (P1)

Scope: root `package.json`, `factory/opengame/package.json` (implicit via fork), global CLIs.

## Findings

### F7.1 Playwright `^1.59.1` caret pin — P2
- Evidence: `package.json:17`. Caret allows any 1.x upgrade. Playwright bundles its own Chromium; historical Chromium CVEs are frequent. Caret upgrades bring fixes but also allow supply-chain incidents to propagate.
- Fix: switch to exact pin + scheduled renovate bumps.

### F7.2 `factory/opengame` brings the full Qwen-Code dep graph — P1
- Evidence: `factory/opengame/package.json` + its packages/*/package.json (not shown in this audit but inferred). Thousands of transitive deps. No `npm audit` ci, no lockfile review in repo.
- Recommended action: run `npm audit --production --prefix factory/opengame` and triage. Also run `npm ls` to catch duplicate/vulnerable nested versions.

### F7.3 No lock-file at root for GameFactory tooling — P2
- Evidence: `package-lock.json` exists for root but only covers Playwright. Fine today, brittle as scripts add deps.

### F7.4 Global CLIs are outside `npm audit` reach — P1
- The three subscription CLIs are installed globally, not tracked in any repo lockfile. CVEs in their deps are invisible to this project's security process.
- Fix: track the chosen versions in a `SECURITY.md` + automate weekly `npm view <pkg> versions` diff.

### F7.5 `@google/genai` SDK used by cliContentGenerator — P2
- Evidence: `cliContentGenerator.ts:18-26`. Pulls `@google/genai` which has its own transitive graph.
- Fix: audit as part of F7.2.

## Severity Summary

| ID | Finding | Severity |
|---|---|---|
| F7.2 | Untriaged fork-wide dep graph | P1 |
| F7.4 | Global CLIs not audited | P1 |
| F7.1 | Playwright caret pin | P2 |
| F7.3 | Root lock-file narrow coverage | P2 |
| F7.5 | `@google/genai` unaudited | P2 |

## Mitigations

1. Add `npm audit --production` check to `setup.sh` with a non-fatal warn.
2. Exact-pin Playwright; renovate config.
3. Weekly CI job (or local cron) that runs `npm view <cli> version` for the three CLIs and diffs against a committed manifest.
4. Triage `npm audit` output once; fix high/critical.

Effort: 0.5 day + ongoing.

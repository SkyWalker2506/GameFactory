# BizLead #8 — Ops / Process

**Analyst:** BizLead (Sonnet)
**Date:** 2026-04-23
**Scope:** `gf ship` Vercel production path, change management, release process

---

## Findings

### Current `gf ship` Production Path

The `gf ship` command executes the following sequence:

1. Checks for `index.html` in the game directory
2. If no `.git` directory: initializes a new git repo, commits all files, creates a public GitHub repo via `gh repo create gamefactory-<name> --public --source=. --push`
3. Runs `vercel deploy --prod --yes --scope skywalker2506s-projects --name gamefactory-<name>`
4. Extracts and prints the Vercel production URL

This is a single-command zero-review path from AI-generated HTML to public internet. Key operational observations:

**No review gate**: There is no human review step, no staging deployment, no diff review between the generated file and the previous version. The `--yes` flag on `vercel deploy` suppresses all confirmation prompts. Generated content goes directly to production.

**No rollback mechanism**: Once shipped, there is no `gf rollback <name>` command. Reverting requires manual `vercel rollback` or re-running `gf generate` and shipping again.

**No deploy history**: The `gf ship` command extracts only the production URL from the Vercel output. No deploy ID, timestamp, or version is stored locally. The game's git history is the only record of what was shipped.

**GitHub repo per game**: Every `gf ship` creates a public GitHub repo (if not already initialized). This is good for reproducibility but means unreviewed AI-generated code is immediately public on GitHub, which is a secondary security/reputation surface (see SecLead #8).

**Vercel project naming**: `gamefactory-<name>` is hardcoded in the `gf ship` command. If the project already exists on Vercel, `vercel deploy` updates it. If the user runs `gf ship` on a different machine, it may create a duplicate project because the Vercel project ID is not stored locally.

**Scope hardcoding**: `--scope skywalker2506s-projects` is hardcoded in the script. This is a personal Vercel team scope, not configurable. Other users cloning GameFactory would need to modify the script to deploy to their own scope.

### Change Management Gap

There is no change management process:
- No changelog (`CHANGELOG.md`)
- No version tags on game repos
- No diff surfacing between `gf generate` runs — the user cannot easily see what changed between two generation passes
- No `gf diff <name>` or comparison artifact
- `gf iterate` applies changes additively but does not checkpoint the previous state before overwriting

The Playwright `playtest.png` is the only artifact produced by a test run, and it is overwritten on each playtest.

### Release Process for GameFactory Itself

There is no release process for the GameFactory tool itself:
- No version number in `package.json` beyond `"version": "1.0.0"`
- No `npm publish` or release workflow
- No `CHANGELOG.md` or git tags
- Changes are made directly to `main` branch (solo project, so this is acceptable at current maturity)

### Environment and Config Management

Secrets loaded via `set -a; source secrets.env` in the `gf` script. This is functional but fragile:
- If `secrets.env` is missing (first run, new machine), the script silently continues without credentials — subsequent `opengame` calls may fail with cryptic auth errors
- No validation that required env vars are set before spawning `opengame`
- `GF_DEFAULT_AUTH` environment variable is documented in README but not validated in `gf`

### Dependency on External Services

`gf ship` depends on:
1. `gh` CLI — authenticated GitHub CLI
2. `vercel` CLI — authenticated Vercel CLI
3. Network access to GitHub and Vercel

No pre-flight checks confirm these are installed and authenticated before `gf ship` starts. Failure mid-way (e.g., after git init but before Vercel deploy) leaves the game in a partial state.

---

## Severity

| Issue | Severity |
|---|---|
| No staging / review gate before Vercel prod deploy | P1 |
| No rollback mechanism in `gf` | P1 |
| Vercel scope hardcoded to personal account — not reusable by other users | P1 |
| No pre-flight checks for `gh` and `vercel` CLI auth | P2 |
| No deploy history or version tracking | P2 |
| `gf iterate` overwrites without checkpointing | P2 |
| No change management for GameFactory itself | P3 |

---

## Evidence

- `scripts/gf` ship section: `vercel deploy --prod --yes --scope skywalker2506s-projects`
- `scripts/gf` ship: no staging step, no diff, no confirmation
- `scripts/gf` iterate: `opengame -p "Apply this change..." --yolo` with no prior git commit
- `scripts/gf` secrets loading: silent `|| true` pattern, no env var validation
- No `CHANGELOG.md`, no git tags, no version tracking in any game directory

---

## Recommendations

1. **(P1) Add a staging step to `gf ship`**: Run `vercel deploy --yes` (no `--prod`) first, print the preview URL, prompt "Deploy to prod? [y/N]" before `vercel deploy --prod`.

2. **(P1) Make Vercel scope configurable**: Read from `GF_VERCEL_SCOPE` env var in `secrets.env`, falling back to the current hardcoded default. Document in README.

3. **(P1) Add pre-flight checks**: At the start of `gf ship`, verify `gh auth status` and `vercel whoami` succeed before doing anything.

4. **(P2) Checkpoint before iterate**: In `gf iterate`, run `git add -A && git commit -m "pre-iterate snapshot"` before spawning opengame. This gives a rollback point.

5. **(P2) Store deploy metadata**: After a successful `gf ship`, append to `games/<name>/deploys.log`: timestamp, Vercel URL, git SHA.

6. **(P2) Validate required env vars**: Add a check at the top of `gf generate` that `GF_DEFAULT_AUTH` (or per-game `.qwen/settings.json`) is set.

---

## Effort

- Staging step in `gf ship`: 30 minutes
- Scope configurability: 15 minutes
- Pre-flight checks: 30 minutes
- Pre-iterate checkpoint: 15 minutes
- Deploy metadata log: 20 minutes
- Env var validation: 20 minutes
- Total: ~2.5 hours

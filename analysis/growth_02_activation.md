# Growth #2 — Activation Analysis
> GameFactory meta-project | Forward-looking (no live users yet)

## Summary

Activation = time from `git clone` to first working game. The entire onboarding surface is `scripts/setup.sh` + the README quick-start block. It is functional but has several friction points that will cause silent drop-off for first-time users.

---

## Findings

### F-01 · No prerequisite check for macOS Gatekeeper xattr issue (P1)
**Evidence:** `scripts/setup.sh` line ~68 — `xattr -cr` is run silently on the esbuild binary but only as part of the OpenGame npm install step. If the user runs `npm run bundle` before or separately, they hit a cryptic "operation not permitted" error with no recovery message.

**Impact:** On macOS 13+ (Ventura+), Gatekeeper quarantines downloaded binaries by default. This is the #1 silent failure path for Mac users. The fix is present in setup.sh but not surfaced in the README or error output.

**Severity:** P1 — blocks activation on the dominant developer OS.

### F-02 · Three global CLIs required before any game is generated (P1)
**Evidence:** `README.md` quick-start, step 1; `scripts/setup.sh` steps 2/6.

The setup installs `claude`, `codex`, and `gemini` CLIs unconditionally. A user who only has Claude Pro (the likely majority) still has `codex` and `gemini` installed even if they never use them. More critically, each CLI requires **separate interactive auth** (Claude: browser OAuth, Codex: OpenAI login, Gemini: Google login). Setup.sh does not guide the user through these auth flows — it only installs the packages.

**Impact:** A user who runs `setup.sh` and immediately tries `gf generate` without completing CLI auth gets a confusing spawn error from CliContentGenerator (likely "claude: not authenticated" or an empty stdout). No fallback, no friendly error.

**Severity:** P1 — the most likely Day 1 failure mode.

### F-03 · No "hello world" validation step in setup.sh (P1)
**Evidence:** `scripts/setup.sh` — ends after npm link, no smoke test.

After setup completes, there is no confirmation that the chosen CLI actually works. A single `claude -p "say hello" --output-format json` invocation at the end of setup would immediately surface auth problems before the user tries a full game generation (900s timeout).

**Severity:** P1 — first real feedback loop takes 900s if auth is broken.

### F-04 · Time-to-first-game is misleadingly fast in README (P2)
**Evidence:** `README.md` quick-start — no timing expectations set.

The quick-start shows 7 commands with no indication that `gf generate` may take 5-15 minutes (single-shot LLM call via CLI, 900s timeout budget). Users unfamiliar with LLM generation times may assume it is broken after 60s.

**Severity:** P2 — expectation mismatch, not a hard blocker.

### F-05 · secrets/secrets.env skeleton is incomplete for Vercel deploy (P2)
**Evidence:** `scripts/setup.sh` line ~55-68 — `VERCEL_TOKEN` and `VERCEL_ORG_ID` are not templated into the skeleton, but `gf ship` requires them.

A user who completes setup and reaches `gf ship` will hit an undocumented requirement. The README mentions "Vercel" in the architecture diagram but provides no setup guidance.

**Severity:** P2 — blocks the final activation milestone (shipping a game).

### F-06 · Node 20 requirement enforced but nvm/.nvmrc absent (P2)
**Evidence:** `scripts/setup.sh` lines 22-28.

The script checks for Node >=20 and exits with an error if not met, but does not offer to install it or reference a version manager. Developers on Node 18 LTS (still common in 2025) get a hard stop. An `.nvmrc` or `.node-version` file at the repo root would allow `nvm use` to auto-resolve.

**Severity:** P2 — friction for 20-30% of developers.

---

## Recommendations

| # | Recommendation | Effort |
|---|---|---|
| R1 | Add a `gf doctor` command that checks: Node version, each CLI installed+authenticated, Vercel token, Playwright installed. Print green/red per check. | Medium |
| R2 | At the end of `setup.sh`, run a smoke test: `${DEFAULT_CLI} -p "reply with the word READY" 2>&1` and fail loudly with auth instructions if it does not return READY. | Small |
| R3 | Only install the one CLI the user selected as default (`GF_DEFAULT_AUTH`). Make other CLIs opt-in with `--all-clis`. | Small |
| R4 | Add `.nvmrc` with `20` at repo root. Add `nvm use` hint to setup.sh output. | Trivial |
| R5 | Add timing expectations to README: "Generation takes ~5-10 min depending on your CLI." | Trivial |
| R6 | Add `VERCEL_TOKEN` and `VERCEL_ORG_ID` to the secrets.env skeleton with comments. | Trivial |
| R7 | Surface the `xattr -cr` step explicitly in the README under a "macOS notes" callout. | Trivial |

---

## Activation Funnel (current state)

```
git clone + setup.sh     → ~5 min (mostly npm installs)
CLI auth (3 flows)       → 5-30 min (undocumented, manual)
gf new + gf generate     → 5-15 min (no feedback during wait)
gf playtest              → 1-2 min
gf ship                  → blocked if Vercel not configured
```

**Estimated current drop-off:** ~60% of users do not reach a first working game due to F-01 through F-03. With R1-R3 implemented, estimated drop-off falls to ~20%.

# SEC #2 — Supply Chain (P0)

Scope: `scripts/setup.sh`, `factory/opengame/` fork, `package.json`, global npm installs.

## Threat Model

Three independent supply chains converge on the developer host:
1. **Three global npm packages** (`@anthropic-ai/claude-code`, `@openai/codex`, `@google/gemini-cli`) installed with `npm i -g` in `setup.sh:50-52`. Any of these, or a transitive dep, if compromised (or typosquatted — `codex` vs `@openai/codex` naming) executes as the logged-in user with OAuth tokens already persisted.
2. **The forked `factory/opengame` tree** — upstream `leigest519/OpenGame` is a Qwen-Code fork. The GameFactory-local patches (3 files: `cliContentGenerator/*`, `auth.ts`) sit inside a tree of thousands of upstream files that are not reviewed. `npm install` (`setup.sh:125`) runs arbitrary install scripts from the full transitive graph of a Qwen-Code fork.
3. **Playwright** pinned `^1.59.1` in root `package.json:17` — caret, so any patched release is auto-accepted; first `npm install` pulls ~200MB including Chromium binary that runs headless with local filesystem access.

## Findings

### F2.1 Global install of three CLIs without version pinning — P1
- Evidence: `setup.sh:41-52`: `npm install -g "$pkg"` with no `@<version>`. Re-running setup can silently upgrade to a newer `claude-code` that has different flags, deprecated output format, or a compromised release.
- Risk: Recent real-world incident (`@ctrl/tinycolor` / `shai-hulud` Sep 2025, 500+ npm packages wormed) shows global CLIs are high-value targets. All three packages have wide install bases and install scripts that run as the user.
- Fix: Pin exact versions; re-evaluate monthly. Prefer `npm ci` against a lock file if the CLIs' own package.json were tracked.

### F2.2 `xattr -cr .` — macOS Gatekeeper bypass on the entire fork — P0
- Evidence: `setup.sh:124`: `xattr -cr . 2>/dev/null || true`. This recursively strips `com.apple.quarantine` (and all other extended attributes — signatures, provenance) from every file under `factory/opengame/`.
- Impact: You are intentionally telling macOS "do not check these binaries". If a malicious `postinstall` script drops a native binary into `node_modules/`, Gatekeeper would normally block first-run; after this command it will not.
- The justification ("macOS Gatekeeper sometimes SIGKILLs esbuild's install.js") is real but the hammer is too wide: only `node_modules/esbuild/bin/esbuild` needs the workaround, not the whole tree.
- Fix: scope narrowly: `xattr -d com.apple.quarantine node_modules/@esbuild/darwin-*/bin/esbuild` after install. Even better: `ditto --norsrc --noextattr` the single binary, or let esbuild's own install handle it.

### F2.3 `npm link` of built bundle — makes `opengame` a global command — P1
- Evidence: `setup.sh:143`. `opengame` now resolves anywhere on the machine. Any script, any LLM session, any auto-complete tab can spawn it. Combined with `--yolo` defaults (scripts/gf:69), this is an always-loaded, high-capability attack surface.
- Fix: call `dist/cli.js` directly by path from `scripts/gf`; skip global linking.

### F2.4 Forked Qwen-Code tree carries upstream supply-chain risk with no diff-review gate — P0
- Evidence: `factory/opengame/` is a full clone. Only 3 files are GameFactory patches (per assignment map). The other ~tens of thousands of files are trusted by transitive authority only. Upstream `leigest519/OpenGame` has no `SECURITY.md` reference to code-signing or release integrity in our copy (`SECURITY.md` exists but is boilerplate Google template inherited from Gemini-CLI roots).
- Risk: A malicious PR merged to upstream could be pulled during any future `git pull` under `factory/opengame` without local review.
- Fix: vendor as a submodule at a pinned SHA, or mirror into a private repo with required PR review before integration.

### F2.5 `gh repo create --public --source=. --push` + `vercel deploy --prod` — no review gate — P1
- Evidence: `scripts/gf:88-92`. `gf ship` silently publishes whatever is in the game dir. Combined with `--yolo`-generated `index.html` (SEC #8), this means any prompt-injection artifact reaches a public URL with zero human approval.
- Fix: require `gf ship --confirm` or an interactive `y/N` after showing a diff/hash of `index.html`.

### F2.6 `npm install` inside fork runs install scripts unsandboxed — P1
- Evidence: `setup.sh:125` `npm install` with no `--ignore-scripts`. Qwen-Code tree has hundreds of transitive deps.
- Fix: use `npm ci --ignore-scripts` then selectively allow only esbuild's install (`npm rebuild esbuild`).

### F2.7 No integrity verification of secrets symlink target — P2
- The `ln -sf` in `setup.sh:82` silently re-targets. If the path is ever writable by another process, it could redirect reads to attacker-controlled content. Low likelihood on dev host.

## Severity Summary

| ID | Finding | Severity |
|---|---|---|
| F2.2 | `xattr -cr .` recursive Gatekeeper bypass | P0 |
| F2.4 | Forked tree w/o integrity gate | P0 |
| F2.1 | Unpinned global CLI installs | P1 |
| F2.3 | `npm link` global opengame | P1 |
| F2.5 | Auto-publish (gh+vercel) with no review | P1 |
| F2.6 | `npm install` runs untrusted install scripts | P1 |
| F2.7 | Symlink target not verified | P2 |

## Mitigations

1. Replace `xattr -cr .` with a single-file targeted `xattr -d com.apple.quarantine` on esbuild binary only.
2. Pin global CLIs to exact versions in `setup.sh`; add a SHA/provenance check step.
3. Convert `factory/opengame` to a pinned git submodule; lock to a reviewed SHA; document upgrade process.
4. Use `npm ci --ignore-scripts` inside the fork; whitelist necessary rebuilds.
5. Add `gf ship` confirmation step, with summary of files and size.
6. Stop `npm link`-ing; use direct `node dist/cli.js` path from `gf`.

Effort: 2–3 days, mostly mechanical. The submodule migration (F2.4) is the biggest cultural shift.

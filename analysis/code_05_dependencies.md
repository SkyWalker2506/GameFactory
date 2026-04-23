# Code #5 — Dependencies

> Analysis model: GPT via Codex MCP (with live web research)
> Date: 2026-04-23

---

## Findings

| Severity | Dep | Issue | Fix |
|---|---|---|---|
| P1 | Global CLIs (`@anthropic-ai/claude-code`, `@openai/codex`, `@google/gemini-cli`) | `setup.sh` installs without version pinning and only if missing — nondeterministic across machines, never upgrades | Pin exact versions in setup.sh; or use Volta/mise toolchain manifest |
| P1 | `factory/opengame` fork | High upstream drift risk: embedded directory, not submodule, no automated sync policy | Track upstream tags/SHAs; add `upstream` remote; document merge/rebase policy |
| P2 | `@opengame/sdk ^0.1.0` | Not an external mystery package — it is the workspace package in `factory/opengame/packages/sdk-typescript`. Risk is semver drift if published separately | Treat as internal workspace dep; prefer `"workspace:*"` locally |
| P2 | `@testing-library/dom` | Declared in runtime `dependencies`, not found in any source imports — dead or test-only baggage | Move to `devDependencies` or remove entirely |
| P2 | `playwright` | Only at root `package.json:16`; `factory/opengame` has no Playwright dep — implicit cross-project coupling | Keep at root but document; or add explicit dep where used |
| P2 | Playwright browsers | `package-lock.json` pins `playwright@1.59.1` but browser binaries unmanaged — no install step enforces them | Add `npx playwright install --with-deps chromium` in setup.sh or CI |
| P2 | `@lydell/node-pty 1.1.0` | Exact pin for ABI/prebuilt-binary coordination, not clearly security-driven | Keep exact pin; document reason; review upstream periodically |
| P2 | `esbuild` | Top-level resolves to `0.25.12` (patched for GHSA-67mh-4wv8-2f99), but nested test deps pull `esbuild@0.21.5` under `packages/sdk-typescript/node_modules` | Upgrade Vitest/Vite in SDK test stack or add override |
| P2 | `overrides` (wrap-ansi, ansi-regex, cliui) | Appear to be compatibility/hygiene overrides, not clearly current-CVE mitigations | Keep them; add comments explaining purpose and what can remove them |
| OK | Root `package-lock.json` | Root lockfile EXISTS (`lockfileVersion: 3`, pins `playwright@1.59.1`) | No action needed — concern was incorrect |

---

## Detailed Analysis

### Global CLI Drift Risk (P1)

`scripts/setup.sh:40-52` installs three CLIs without version pinning:
```bash
install_cli claude "@anthropic-ai/claude-code"
install_cli codex  "@openai/codex"
install_cli gemini "@google/gemini-cli"
```

The `install_cli` function only installs if the binary is missing — it never upgrades. As of April 2026, these packages have extremely active release cycles:
- `@anthropic-ai/claude-code`: versions in 1.0.11x–1.0.119 range, daily releases
- `@openai/codex`: `0.28.0` observed
- `@google/gemini-cli`: `0.3.3` observed

This means fresh clones install different versions from day to day, and re-running setup doesn't normalize existing machines. Since GameFactory routes ALL generation through these CLIs, version skew changes prompt behavior, auth flows, flags, and output quality.

**Fix options:**
```bash
# Option A: Pin in setup.sh
npm install -g "@anthropic-ai/claude-code@1.0.119"
npm install -g "@openai/codex@0.28.0"
npm install -g "@google/gemini-cli@0.3.3"

# Option B: Toolchain manifest (Volta)
volta install node@20
volta pin "@anthropic-ai/claude-code@1.0.119"
```

### @opengame/sdk Provenance (P2)

`@opengame/sdk` is the local workspace package at:
- `factory/opengame/packages/sdk-typescript/package.json`
- repository: `github.com/leigest519/OpenGame`, dir `packages/sdk-typescript`

It resolves as a workspace package in the lockfile at `factory/opengame/package-lock.json:16445`. Risk is not provenance but: if someone installs it from npm with `^0.1.0`, local workspace behavior and published behavior can diverge. Prefer `"workspace:*"` in monorepo context.

### Nested esbuild Advisory (P2)

- Top-level esbuild `0.25.12`: safe (GHSA-67mh-4wv8-2f99 patched in 0.25.0+)
- Nested under `packages/sdk-typescript/node_modules/vite-node/node_modules/esbuild` and `packages/sdk-typescript/node_modules/vitest/node_modules/esbuild`: `0.21.5`

`0.21.5` is below the 0.25.0 patch threshold — advisory still exists transitively in test tooling. Local-dev exposure, but real.

**Fix:** Upgrade Vitest/Vite in the SDK test stack, or add an override:
```json
"overrides": {
  "esbuild": ">=0.25.0"
}
```

### Playwright Browser Management (P2)

`playwright@1.59.1` is pinned in `package-lock.json`. However, Playwright browser binaries are NOT managed by npm — they require a separate install step. Without explicit `npx playwright install chromium`, `playtest.mjs` fails silently or with a confusing error.

**Add to setup.sh:**
```bash
bold "==> Playwright browsers"
npx playwright install chromium --with-deps 2>/dev/null || \
  npx playwright install chromium
green "  chromium ✓"
```

### Overrides — Intent Documentation (P2)

Current overrides in `factory/opengame/package.json`:
- `wrap-ansi: 9.0.2` — modern ESM
- `ansi-regex: 6.2.2` — flattened tree
- `cliui.wrap-ansi: 7.0.0` — CJS-compatible subtree requirement

These appear to be compatibility management, not clear CVE mitigations. Each should have a comment:
```json
"overrides": {
  "wrap-ansi": "9.0.2",           // enforce ESM-compatible wrap-ansi globally
  "ansi-regex": "6.2.2",          // flatten tree; prevent older transitive variants  
  "cliui": {
    "wrap-ansi": "7.0.0"          // cliui expects CJS wrap-ansi; isolate to subtree
  }
}
```

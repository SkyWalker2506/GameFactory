# Code #4 — Build / Bundle

> Analysis model: GPT via Codex MCP
> Date: 2026-04-23

---

## Findings

| Severity | File:Line | Issue | Fix | Effort |
|---|---|---|---|---|
| High | `scripts/setup.sh:130-135` | Staleness check only watches 3 source files — bundle can stay stale when other inputs change | Replace heuristic with broader input set or always rebuild on explicit setup/build | M |
| High | `factory/opengame/package.json:53` | `prepare` runs `npm run bundle` on every `npm install`, causing install-time side effects and slow/failing installs in CI | Move bundling to `prepack` or dedicated `build:bundle`; keep `prepare` for husky only | S |
| High | `tileset-processor.ts`, `packages/core/package.json` | `sharp` externalized from bundle but not declared as runtime dependency in shipped manifests — runtime break waiting to happen | Add `sharp` to runtime deps or stop externalizing if bundling is acceptable | S |
| Medium | `scripts/prepare-package.js:108` | Dist `package.json` only carries `tiktoken` and PTY optional deps; other externalized runtime deps (`@imgly/background-removal-node`, `sharp`) omitted | Generate dist `package.json` from shared external/runtime manifest | M |
| Medium | `scripts/setup.sh:123` | `xattr -cr .` recursively clears all extended attributes — overly broad, macOS-specific | Gate on macOS; clear only `com.apple.quarantine` on specific binary/package paths | XS |
| Medium | `factory/opengame/package.json:71`, `.gitignore:35` | `dist/` in published files but gitignored — reproducibility depends on lifecycle scripts, no clear artifact policy | Pick explicitly: generated-only with CI/prepack publish, or committed artifact with verification | S |
| Low | `esbuild.config.js:70` | No sourcemaps in production bundle; metafile only written under `DEV=true` | Add external or hidden sourcemaps for release/CI builds | XS |
| Medium | Root `package.json:9`, `scripts/gf:69`, `scripts/setup.sh:119` | Root package has no build entrypoint; root workflows depend on nested OpenGame bundle + global `npm link` — coupling is implicit | Add root scripts: `build`, `build:opengame`, `link:opengame`, `setup`; prefer local binary path | S |
| Low | `factory/opengame/package.json:4`, `esbuild.config.js:50`, `scripts/setup.sh:28` | Node 20 enforced in multiple places but no repo-level `.nvmrc`/`.node-version` | Add `.nvmrc` or `.node-version` at repo root; optionally enforce `engine-strict` in CI | XS |

---

## Detailed Analysis

### 1. Staleness Check (High)

`scripts/setup.sh:130-135` only watches:
- `packages/core/src/core/cliContentGenerator/cliContentGenerator.ts`
- `packages/cli/src/config/auth.ts`
- `packages/core/src/core/contentGenerator.ts`

The actual bundle also depends on:
- `esbuild.config.js`
- `scripts/esbuild-shims.js`
- `scripts/copy_bundle_assets.js`
- Any transitive imports reachable from `packages/cli/index.ts`

Even if these 3 files are the only intentional GameFactory patches, the heuristic is structurally wrong. Transitive code or bundler config changes leave `dist/cli.js` stale silently.

**Recommended fix:**
```bash
# In setup.sh, instead of 3-file check:
if [ ! -f dist/cli.js ] || \
   find packages/ -name '*.ts' -newer dist/cli.js | grep -q .; then
  npm run bundle
fi
```
Or simply always rebuild during explicit setup.

### 2. `prepare` Side Effects (High)

```json
"prepare": "husky && npm run bundle"
```

This runs on every `npm install`, `npm ci`, git dependency installs, and some publish flows. That means install can:
- Wipe and rebuild `dist/`
- Execute esbuild
- Copy runtime assets
- Fail on native/tooling issues during dependency install

Move heavy builds to `prepack` or a dedicated `npm run build:bundle`.

### 3. Externalized Native Deps (High)

`esbuild.config.js:28` correctly externalizes:
- `@lydell/node-pty` / `node-pty`
- `tiktoken`
- `@imgly/background-removal-node`
- `onnxruntime-node`

However, `tileset-processor.ts` imports `sharp`, which is externalized but not found in runtime dependency declarations of the shipped package manifests. Externalizing a module is only correct if the shipped package also declares and installs it.

### 4. `xattr -cr` Workaround (Medium)

```bash
xattr -cr . 2>/dev/null || true
```

`-c` clears ALL extended attributes, `-r` applies recursively to the entire repo tree. This can strip Finder metadata, Gatekeeper quarantine, and any other xattrs — broader than needed.

The more targeted pattern already exists in `packages/core/scripts/postinstall.js:67` which removes only `com.apple.quarantine` from specific binaries.

```bash
# Better:
if [[ "$(uname)" == "Darwin" ]]; then
  xattr -d com.apple.quarantine node_modules/.bin/esbuild 2>/dev/null || true
fi
```

### 5. `dist/` Publish Policy (Medium)

`dist/` is in published `files` but gitignored. Reproducibility comes entirely from the `prepare` hook — which is the risky side-effect coupling described above. This creates a fragile chain where `npm install` must succeed with bundling for the package to be usable.

### 6. No Sourcemaps (Low)

`esbuild.config.js` has no `sourcemap` option at all. Crash stacks point into `dist/cli.js` line numbers. For an actively developed fork this makes debugging slower than necessary.

```javascript
// Add to build config:
sourcemap: 'external',  // or 'inline' for debugging
```

### 7. Root Build Coupling (Medium)

The implicit operational build contract:
1. `npm install` in `factory/opengame`
2. Build bundle there
3. `npm link` for global binary
4. Root `scripts/gf` then works

Add explicit root scripts:
```json
{
  "scripts": {
    "build": "npm run build --prefix factory/opengame",
    "setup": "bash scripts/setup.sh",
    "test": "node --test tests/smoke/**"
  }
}
```

### 8. Node Version Pin (Low)

Node 20 is enforced in:
- `factory/opengame/package.json:4`: engines `>=20.0.0`
- `esbuild.config.js:50`: target `node20`
- `scripts/setup.sh:28`: runtime check

But no `.nvmrc` at repo root. Add:
```
# .nvmrc at repo root
20
```

# SEC #4 — Code Execution Safety / Sandbox (P0)

Scope: `scripts/gf`, OpenGame's `sandboxConfig.ts`, actual runtime isolation of `opengame --yolo`.

## Threat Model

Design docs (`README.md`, `CLAUDE.md`) claim "Sandbox: Docker/Podman, headless browser playtest" as part of OpenGame's value proposition. Users reasonably assume generated code and tool calls are isolated. Reality: **they are not** in the GameFactory invocation path.

## Findings

### F4.1 GameFactory invokes `opengame --yolo` directly on the host; sandbox is bypassed — P0
- Evidence: `scripts/gf:69,80`: `opengame -p "$(cat GAME.md)" --yolo`. No `--sandbox`, no `GEMINI_SANDBOX=1`, no Docker wrap.
- OpenGame's own sandbox machinery exists (`packages/cli/src/config/sandboxConfig.ts:31-70`: supports `docker | podman | sandbox-exec`), but it is **opt-in** and triggered only by env var `GEMINI_SANDBOX` or CLI flag, neither of which GameFactory sets.
- Reality: every tool call runs as the developer's UID with full home-dir access, network, and keychain.
- Fix: export `GEMINI_SANDBOX=docker` (or `sandbox-exec` on macOS) in `scripts/gf` before spawning `opengame`. Or wrap `opengame` in a `docker run --rm -v "$dir":/work -w /work` explicit container.

### F4.2 Playwright playtest runs on host against a `file://` URL — P1
- Evidence: `scripts/playtest.mjs:27,39`: `chromium.launch({headless:true})`, `page.goto('file://' + htmlPath)`.
- Risk: the generated `index.html` (untrusted — see SEC #3, SEC #8) is loaded into a real Chromium with default security posture. `file://` origin has historically had over-permissive access to sibling files, and any JS in the page runs with fetch/XHR. The random click pass (`playtest.mjs:43-52`) actively triggers event handlers that could pop dialogs, open tabs, or drive outbound fetches before the screenshot.
- A malicious generated page could:
  - fetch `file:///etc/passwd`, `file:///Users/musabkara/.ssh/id_rsa` (modern Chrome restricts, but history of bypasses exists);
  - beacon any of that to an external URL;
  - write to localStorage in a pattern that persists into future playtest contexts (the `newContext()` does create a fresh storage, mitigating here).
- Fix: `browser.newContext({ ... permissions: [], bypassCSP: false, offline: true })`. Serve via `http://localhost` from a temp static server instead of `file://`. Run Chromium with `--disable-file-system-access`.

### F4.3 `ship` runs on host with full Vercel + GitHub credentials — P1
- Evidence: `scripts/gf:82-92`. If the generated `index.html` contains a malicious `vercel.json` or `.vercel/project.json` that redirects the deploy target, a compromised prompt could deploy into an attacker's Vercel scope or set rewrite rules. Also `gh repo create --public` publishes instantly.
- Fix: deploy from a clean staging clone with `.vercelignore` and a strict `vercel.json` templated by `gf`, not inherited from the generated dir.

### F4.4 No resource limits on CLI / Chromium spawn — P2
- Evidence: `cliContentGenerator.ts:140`, `playtest.mjs:27`. No `ulimit`, no memory cap, no CPU cap. A runaway prompt could spin a fork bomb through the tool API, or a crafted HTML could exhaust RAM during playtest.
- Fix: `ulimit -v` in shell wrapper; Chromium `--disable-dev-shm-usage --js-flags="--max-old-space-size=512"`.

### F4.5 `SANDBOX` env-var escape check is presence-only — P2
- Evidence: `sandboxConfig.ts:35`: `if (process.env['SANDBOX']) { ... we're inside }`. Trivially spoofable; if prompt-injection writes `SANDBOX=1` to a shell rc, future opengame invocations believe they're sandboxed when they aren't. Low likelihood, defense-in-depth concern.

## Severity Summary

| ID | Finding | Severity |
|---|---|---|
| F4.1 | No sandbox on `gf generate/iterate` | P0 |
| F4.2 | Playwright loads untrusted HTML with default permissions | P1 |
| F4.3 | `gf ship` runs from untrusted cwd with publish creds | P1 |
| F4.4 | No resource limits | P2 |
| F4.5 | SANDBOX env detection spoofable | P2 |

## Mitigations

1. (P0) Enforce sandbox in `scripts/gf`: `export GEMINI_SANDBOX=docker` (or `sandbox-exec` for macOS users). Fail fast if neither `docker` nor `sandbox-exec` exists.
2. (P0) Alternative: explicit Docker wrap — `docker run --rm --network <allowlist> -v "$dir":/work -w /work --user $(id -u):$(id -g) opengame-runner opengame -p "..." --yolo`. Build the runner image once; skip host CLIs entirely.
3. (P1) Playtest: serve via ephemeral `http-server` on `127.0.0.1:<rand>`; disable JS network unless explicitly allowed; block file:// loads.
4. (P1) Ship from a clean re-clone of the generated output; pin vercel.json.
5. (P2) Resource ulimits + playwright flags.

Effort: Docker-wrap approach ~1 week (image build, dev UX, volume mounts, network policy). Minimum viable (`GEMINI_SANDBOX=sandbox-exec`) ~1 day.

## Residual Risk After Mitigation

Even with Docker sandbox, the generated `index.html` still ships to Vercel public — see SEC #8 for output-safety post-filters. Sandbox solves host compromise; output safety solves end-user-of-deployed-game compromise.

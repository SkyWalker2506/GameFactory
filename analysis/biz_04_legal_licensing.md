# BizLead #4 — Legal / Licensing

**Analyst:** BizLead (Sonnet)
**Date:** 2026-04-23
**Scope:** Upstream OpenGame license, GameFactory license claim, fork attribution requirements

---

## Findings

### Upstream OpenGame License: Apache 2.0

File: `/Users/musabkara/Projects/GameFactory/factory/opengame/LICENSE`

License: **Apache License 2.0**

Copyright holders listed in the license file:
- Copyright 2025 Google LLC
- Copyright 2025 Qwen
- Copyright 2026 OpenGame contributors

Apache 2.0 is permissive. It allows free use, modification, distribution, sublicensing, and commercial use, with no copyleft requirement. However it imposes the following obligations on distributors:

- (a) Include a copy of the Apache 2.0 license with any distribution
- (b) Modified files must carry prominent notices stating they were changed
- (c) Retain all copyright, patent, trademark, and attribution notices
- (d) Propagate any NOTICE file content

No NOTICE file exists at `factory/opengame/NOTICE` — this item is satisfied by absence.

### GameFactory License Claim: MIT (Factually Incorrect)

`README.md` line 88 states: `MIT (same as upstream OpenGame).`

This is wrong on both counts:
1. Upstream OpenGame is Apache 2.0, not MIT
2. Therefore "same as upstream" is also wrong

This is a P0 legal finding. While MIT and Apache 2.0 are broadly compatible (Apache 2.0 code can be included in MIT-licensed projects, but the Apache 2.0 obligations still apply to the included portions), misrepresenting the license to downstream users and contributors is a material misstatement.

### Missing Root LICENSE File

There is no `LICENSE` file at the GameFactory repository root. Apache 2.0 Section 4(a) requires that any distribution of the work or derivative works include a copy of the license. This obligation is currently unmet.

### Missing Modification Notices (Apache 2.0 §4b)

The patched OpenGame files — specifically the `CliContentGenerator` class and the three new `AuthType` values (`USE_CLAUDE_CLI`, `USE_CODEX_CLI`, `USE_GEMINI_CLI`) added under `factory/opengame/packages/core/` — have no "modified by GameFactory" header comments. Apache 2.0 §4(b) requires modified files to carry prominent notices stating the changes were made and by whom.

### License Compatibility Analysis

The GameFactory original files (`scripts/gf`, `scripts/playtest.mjs`, `scripts/setup.sh`, `docs/`, `games/`) are entirely original and can be licensed MIT or Apache 2.0 by the author's choice.

The `factory/opengame/` subtree is a derivative of Apache 2.0 code and must remain Apache 2.0 (or a compatible license). You cannot relicense it as MIT.

The correct dual-license approach:
- Root LICENSE: state that original GameFactory code is MIT; `factory/opengame/` is Apache 2.0
- Include full Apache 2.0 text (or reference) for the opengame subtree
- MIT text for original files

### Generated Game Output

Games produced by `gf generate` are AI-generated `index.html` files. The tool's Apache 2.0 license does not attach to the output (tools do not typically license their output). The copyright status of AI-generated code is unsettled globally — in the US, the Copyright Office has taken the position that purely AI-generated works lack human authorship and are in the public domain. Generated games are currently deployed unlicensed (no license comment in the HTML, no attribution to GameFactory).

### Trademark Concern

The Apache 2.0 license (§6) explicitly excludes trademark rights. Using "OpenGame," "Qwen," or "Google" branding in GameFactory marketing or UI would require separate permission. The current README's reference to "built on OpenGame" in the description is acceptable attribution, not trademark use.

---

## Severity

| Issue | Severity |
|---|---|
| README claims MIT but upstream is Apache 2.0 | P0 |
| No root LICENSE file — Apache 2.0 §4(a) unmet | P0 |
| Patched upstream files lack modification notices (Apache 2.0 §4b) | P1 |
| Generated games deployed without any license notice | P2 |

---

## Evidence

- `/Users/musabkara/Projects/GameFactory/factory/opengame/LICENSE`: Apache 2.0, Copyright 2025 Google LLC / 2025 Qwen / 2026 OpenGame contributors
- `/Users/musabkara/Projects/GameFactory/README.md` line 88: "MIT (same as upstream OpenGame)" — factually incorrect
- No file at `/Users/musabkara/Projects/GameFactory/LICENSE` (verified by directory listing)
- No NOTICE file at `factory/opengame/NOTICE` (verified — not present, so §4d is moot)
- New AuthTypes and CliContentGenerator added to forked tree — no modification headers

---

## Recommendations

1. **(P0) Fix README.md license section**: Replace `MIT (same as upstream OpenGame)` with:
   `Apache 2.0 (factory/opengame, upstream). MIT (GameFactory original scripts and docs). See LICENSE.`

2. **(P0) Create root LICENSE file** containing:
   - Section 1: MIT license text covering original GameFactory files
   - Section 2: Statement that `factory/opengame/` is Apache 2.0 with reference to `factory/opengame/LICENSE`

3. **(P1) Add modification headers** to all patched OpenGame source files. Minimal example:
   `// Modified by GameFactory contributors. Original: OpenGame (Apache 2.0, leigest519/OpenGame). Added: CliContentGenerator, USE_CLAUDE_CLI/USE_CODEX_CLI/USE_GEMINI_CLI AuthTypes.`

4. **(P2) Consider adding a comment** to generated game HTML via `gf ship`, e.g.:
   `<!-- Created with GameFactory (github.com/musabkara/GameFactory). No warranty. -->`
   This sets user expectations without asserting copyright.

---

## Effort

- Root LICENSE file: 30 minutes
- README fix: 5 minutes
- Modification headers in patched files: 1-2 hours (requires identifying all modified files)
- Optional legal review before public launch: ~1 lawyer hour

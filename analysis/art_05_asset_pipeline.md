# ArtLead — Category #5: Asset Pipeline
> Analyst: ArtLead (Sonnet) | Date: 2026-04-23
> Note: (Gemini fallback: sonnet) — gemini-2.5-pro-preview-05-06 returned ModelNotFoundError (HTTP 404).

---

## Scope

Files analyzed:
- `README.md` (Architecture section, Supported genres)
- `CLAUDE.md` (Asset pipeline section)
- `docs/game-fit-guide.md` (Technical Scope section)
- `docs/genre-presets.json` (all 12 prompt templates)
- `docs/constraint-and-approach.md` (trade-off table)

---

## Context

GameFactory's asset pipeline is currently a **stated plan, not an implementation**. The `CLAUDE.md` describes three image providers (Tongyi, Doubao, OpenAI) and mentions separate video + audio providers, but the assignment map (`00_assignment_map.md:25`) explicitly labels this as "currently stub; worth documenting." All 12 genre prompt templates in `genre-presets.json` work around the absent asset pipeline by mandating "No frameworks" and relying entirely on code-generated visuals (Canvas, CSS).

---

## Findings

### F-05-01 — Asset pipeline is entirely a stub — no implementation exists
**Severity: P1**

The project description in `CLAUDE.md` states "Asset sağlayıcılar: Tongyi / Doubao / OpenAI (görsel), ayrı video+ses" as if these are live capabilities. The assignment map confirms they are stub/wrapper plans only. No provider configuration, no API keys for image generation, and no prompt-to-image flow exists in the documented scripts. A user reading CLAUDE.md would believe image generation is available.

Evidence: `CLAUDE.md` (Asset pipeline bullet); `00_assignment_map.md:25` ("currently stub; worth documenting").

Recommendation:
1. Add a clear `[NOT YET IMPLEMENTED]` label next to asset provider mentions in CLAUDE.md.
2. Create a `docs/asset-pipeline-plan.md` that documents the intended architecture before any code is written. This prevents design drift as implementation begins.

Effort: Small (30 min documentation, no code).

---

### F-05-02 — All prompt templates compensate for absent asset pipeline with "No frameworks" constraint
**Severity: P1**

Every single genre template in `genre-presets.json` includes "No frameworks" and relies on Canvas API or CSS for all visual output. This is a deliberate workaround for the absent asset pipeline (no sprites, no image assets, no audio files). The workaround works for the 3 live demo games, but creates a ceiling on visual quality:

- `top_down`: "Build a top-down 2D game on canvas in a single HTML file. No frameworks." — enemies and players are shapes, not sprites.
- `platformer`: "Build a 2D platformer on canvas in a single HTML file. No frameworks." — AABB collision with rectangular shapes only.
- `physics_sandbox`: "Build a physics game in a single HTML file using simple Verlet or Euler integration (no Matter.js)." — explicitly forbids even a physics library, forcing bespoke integration.

This constraint produces functional games but they will always look like dev prototypes. The first time a user wants a "pixel art platformer" or any game with visual identity, the pipeline fails them.

Evidence: All 12 templates in `docs/genre-presets.json`; `docs/game-fit-guide.md:77` ("LLM text/logic + opsiyonel image provider (Tongyi / Doubao / OpenAI)") — the "opsiyonel" is misleading since it implies the option exists.

Recommendation: The "No frameworks" constraint should be accompanied by an explicit note in the fit guide and README that says current generation is code-only visuals. When an asset pipeline is implemented, templates should be versioned: `grid_logic_v1` (code-only) and `grid_logic_v2` (with sprite support).

Effort: Small (documentation only for now; medium when implementing provider integration).

---

### F-05-03 — No defined interface for asset provider integration
**Severity: P1**

The `constraint-and-approach.md` documents the `ContentGenerator` interface that was used to plug in the CLI adapter. There is no equivalent interface design for asset providers. When the time comes to integrate Tongyi or OpenAI image generation, the developer will need to design the interface from scratch. The risk is that asset generation gets bolted on as a post-processing step rather than integrated into the OpenGame skill pipeline.

Evidence: `docs/constraint-and-approach.md:36–43` (ContentGenerator interface documented); no equivalent in any doc for AssetProvider.

Recommendation: Define an `AssetProvider` interface in a design doc before implementation:
```ts
interface AssetProvider {
  generateImage(prompt: string, size: string): Promise<{ url: string; base64?: string }>;
  generateAudio(description: string): Promise<{ url: string }>;
  provider: 'tongyi' | 'doubao' | 'openai' | 'none';
}
```
This establishes the contract before code and prevents divergence across providers.

Effort: Small (1 hour design doc).

---

### F-05-04 — Audio pipeline entirely unplanned
**Severity: P2**

CLAUDE.md mentions "ayrı video+ses" (separate video+audio) providers but no provider names are given for audio. The prompt templates for reflex (`reflex`) do mention "visual+audio cue (Web Audio beep)" — relying on the Web Audio API (code-generated sound), not actual audio assets. There is no plan for music, SFX libraries, or audio file pipeline.

Evidence: `CLAUDE.md` ("ayrı video+ses"); `docs/genre-presets.json:reflex.promptTemplate` ("Web Audio beep").

Recommendation: For the near-term roadmap, treat audio as "Web Audio API only" (no external assets needed). Document this as a constraint in `docs/asset-pipeline-plan.md`. Defer external audio providers to a later phase.

Effort: Trivial (documentation, no code).

---

### F-05-05 — Vercel deploy pipeline has no asset hosting strategy
**Severity: P2**

Games are deployed as single `index.html` files to Vercel. If/when asset generation is implemented (images, audio), those assets need to be served alongside the HTML. The current `gf ship` flow (described in README as "git + GitHub + Vercel prod") assumes everything fits in a single file. No strategy exists for:
- Where generated images are stored (Vercel blob? S3? inlined as base64?)
- How audio files are bundled
- Whether CDN caching applies to generated assets

Evidence: `README.md:26` ("gf ship my-puzzle — git + GitHub + Vercel prod"); `CLAUDE.md` (workflow section — no asset hosting step).

Recommendation: When designing the asset pipeline, decide and document the asset hosting strategy upfront. For initial implementation, recommend base64 inlining of small images (keeps single-file model intact) with a size limit (e.g., max 512KB total). For larger assets, use Vercel Blob Storage.

Effort: Medium (architecture decision + implementation when asset pipeline begins).

---

### F-05-06 — Provider priority and fallback order undocumented
**Severity: P2**

Three image providers are named (Tongyi, Doubao, OpenAI) but there is no stated priority or fallback order. OpenAI image generation requires a paid API key (contradicts the "zero extra cost" brand promise). Tongyi and Doubao require Chinese platform accounts which global users may not have. The right default for most users is probably OpenAI DALL-E if they already have the key, or falling back to code-generated visuals.

Evidence: `CLAUDE.md` ("Tongyi / Doubao / OpenAI (görsel)") — listed without priority; `README.md` (no mention of image generation at all).

Recommendation: Document provider priority: `openai > tongyi > doubao > none (code-only)`. Add note that OpenAI image gen requires a separate API key beyond the subscription CLI. For zero-cost operation, document that `none` (code-only mode) is the default.

Effort: Small (documentation only).

---

## Asset Pipeline Implementation Roadmap (Recommendation)

**Phase 1 (Now — already done):** Code-only visuals via Canvas/CSS. Document as constraint.

**Phase 2 (Near-term):** Define `AssetProvider` interface. Implement OpenAI DALL-E adapter (most users will have the key). Store as base64-inlined in HTML. Size limit: 200KB/image, 3 images max.

**Phase 3 (Later):** Tongyi/Doubao adapters for users with Chinese platform accounts. Audio via ElevenLabs or similar (separate key). Vercel Blob for larger assets.

---

## Summary Table

| ID | Finding | Severity | Effort |
|----|---------|---------|--------|
| F-05-01 | Asset pipeline is entirely a stub | P1 | Small (doc) |
| F-05-02 | All templates work around absent pipeline | P1 | Small (doc) / Medium (impl) |
| F-05-03 | No AssetProvider interface defined | P1 | Small (design doc) |
| F-05-04 | Audio pipeline entirely unplanned | P2 | Trivial (doc) |
| F-05-05 | No asset hosting strategy for Vercel | P2 | Medium (when implementing) |
| F-05-06 | Provider priority and fallback undocumented | P2 | Small (doc) |

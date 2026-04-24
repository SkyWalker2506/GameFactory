# GameFactory

LLM-driven web game factory built on [OpenGame](https://github.com/leigest519/OpenGame). It lets you generate playable web games from a prompt, iterate on them with CLI-based agents, auto-playtest them, and ship them fast.

Instead of forcing paid API usage, GameFactory can route generation through your local coding CLIs: `claude`, `codex`, `gemini`, and `opencode`.

Tarif et → üret → oto-playtest → asset topla → level tasarla → yayınla.

## What this repo is for

GameFactory is meant for small-to-medium scope web games that are a good fit for LLM-assisted generation:

- 2D platformers
- top-down action games
- tower defense
- puzzle and grid logic games
- card battle and quiz games
- reflex / survival / hyper-casual loops
- idle and UI-heavy games

It is not meant for AAA 3D pipelines, MMO networking, or engine-heavy Unity/Unreal production.

## Live examples

| Game | Genre | Made by | Live |
|---|---|---|---|
| smoke-test | grid_logic | Claude (Pro) | https://gamefactory-smoke-test-p6v5luyaq-skywalker2506s-projects.vercel.app |
| tap-reflex | ui_heavy | Codex (ChatGPT Plus) | https://gamefactory-tap-reflex-2i0dvztg2-skywalker2506s-projects.vercel.app |
| word-guess | quiz | Gemini (Advanced) | https://gamefactory-word-guess-bpxz8ttjy-skywalker2506s-projects.vercel.app |

## Repo structure

```text
GameFactory/
├── factory/opengame/            # OpenGame fork used as generator runtime
├── games/<name>/                # Each generated game lives here
│   ├── GAME.md                  # Source-of-truth prompt/design doc
│   ├── CLAUDE.md                # Per-game instructions/context
│   ├── .qwen/settings.json      # Optional per-game CLI override
│   ├── index.html               # Generated game output
│   └── playtest.png             # Screenshot from playtest
├── asset-browser/               # Reusable asset workflow package
├── tools/canvas-level-editor/   # Generic 2D canvas level editor core
├── docs/                        # Guides and preset docs
└── scripts/                     # Setup, CLI wrapper, playtest automation
```

## Quick start

```bash
git clone https://github.com/SkyWalker2506/GameFactory.git
cd GameFactory
./scripts/setup.sh

./scripts/gf genres
./scripts/gf new my-puzzle --genre grid_logic --cli claude
./scripts/gf generate my-puzzle
./scripts/gf playtest my-puzzle
./scripts/gf iterate my-puzzle "add combo counter and clearer lose feedback"
./scripts/gf ship my-puzzle
./scripts/gf list
```

## Setup

`./scripts/setup.sh` is the one-shot bootstrap. It:

- checks Node 20+
- installs missing coding CLIs: `claude`, `codex`, `gemini`, `opencode`
- creates `secrets/secrets.env`
- links shared secrets from `~/Projects/claude-config/claude-secrets/` when available
- installs and bundles the OpenGame fork
- links `opengame` as a local CLI
- writes `~/.qwen/settings.json` with the selected auth type

Default CLI selection lives in `secrets/secrets.env`:

```bash
GF_DEFAULT_AUTH=claude-cli
```

Valid values:

- `claude-cli`
- `codex-cli`
- `gemini-cli`
- `opencode-cli`

Optional model overrides:

```bash
CLAUDE_CLI_MODEL=claude-opus-4-7
CODEX_CLI_MODEL=gpt-5.4
GEMINI_CLI_MODEL=gemini-2.5-pro
OPENCODE_CLI_MODEL=openai/gpt-5
```

## Core workflow

### 1. Create a game shell

```bash
./scripts/gf new my-game --genre platformer --cli codex
```

This creates `games/my-game/` with a starter `GAME.md` and optional per-game CLI config.

### 2. Write the design prompt

Edit `games/<name>/GAME.md`. This is the source of truth for:

- fantasy/theme
- core loop
- mechanics
- win/lose conditions
- feel/juice goals
- constraints like single-file HTML or control scheme

The better `GAME.md` is, the better first-pass output you get.

### 3. Generate the first playable build

```bash
./scripts/gf generate my-game
```

This runs OpenGame against the prompt in `GAME.md` and generates the first playable game in that game folder.

### 4. Playtest automatically

```bash
./scripts/gf playtest my-game
```

This uses Playwright to boot the game, exercise it, and save a screenshot like `games/my-game/playtest.png`.

Use this after generation and after major iterations to quickly catch:

- broken startup
- invisible UI
- input issues
- layout overflow
- obvious gameplay dead-ends

### 5. Iterate

```bash
./scripts/gf iterate my-game "make enemy bullets slower and add a score multiplier"
```

This applies a focused patch request to the existing game rather than starting from scratch.

Best practice:

- keep each iteration narrow
- ask for one gameplay change at a time
- re-run playtest after important changes
- update `GAME.md` when the design direction changes permanently

### 6. Ship

```bash
./scripts/gf ship my-game
```

This is the publishing path. In the current repo flow, it can initialize git for the game, create/push a GitHub repo, and deploy to Vercel.

## CLI routing model

OpenGame's `ContentGenerator` is pluggable. GameFactory adds a `CliContentGenerator` that shells out to local coding CLIs and translates the result into OpenGame's expected response shape.

```text
OpenGame → CliContentGenerator → local CLI
                               → claude / codex / gemini / opencode
                               → generated response
                               → OpenGame pipeline
```

This keeps the workflow subscription-friendly while preserving most of the generation loop.

Trade-offs:

- no embeddings through CLI mode
- token counting is approximate
- tool-use fidelity is lower than native API orchestration
- single-shot and patch-style generation work best

## Supported genres

Run:

```bash
./scripts/gf genres
```

Top picks:

- `grid_logic`
- `hyper_casual`
- `idle_clicker`
- `card_battle`
- `tower_defense`
- `quiz`
- `top_down`
- `platformer`
- `visual_novel`
- `reflex`
- `physics_sandbox`
- `educational`

More background:

- [docs/game-fit-guide.md](/Users/musabkara/Projects/GameFactory/docs/game-fit-guide.md)
- [docs/constraint-and-approach.md](/Users/musabkara/Projects/GameFactory/docs/constraint-and-approach.md)

## Asset browser

`asset-browser/` is a reusable asset intake and review tool bundled alongside GameFactory. It is useful when a generated game starts needing lots of art, FX, UI icons, or other content that you want to manage outside the code prompt itself.

What it does:

- scans configured asset folders
- builds a searchable/filterable browser UI
- tracks missing assets in `missing.json`
- lets you upload generated assets for review
- supports approve/deny workflow for asset requests
- can be deployed separately to Vercel

Typical use inside a game workflow:

1. Generate the first playable game with `gf generate`.
2. Identify missing art, icons, backgrounds, or FX.
3. Add those requests to `asset-browser/data/missing.json`.
4. Generate raw assets with your preferred image pipeline.
5. Upload them into the asset browser review flow.
6. Approve the good ones and move them into the game's runtime assets.

Install it into another project:

```bash
cd /Users/musabkara/Projects/GameFactory/asset-browser
./install.sh /path/to/YourProject YourGitHubUser/YourRepo
```

Per-project config example:

```json
{
  "title": "My Game",
  "projectRoot": "..",
  "sources": [
    { "dir": "public/assets", "category": "Runtime", "tag": "game" },
    { "dir": "assets/raw", "category": "Raw", "tag": "raw" }
  ],
  "github": { "owner": "user", "repo": "repo", "branch": "main" },
  "uploadPath": "asset-browser/data/uploads"
}
```

Good fit for:

- games with many icons or sprites
- multi-step asset curation
- outsourced or AI-generated asset review
- keeping art backlog visible outside prompt files

Important note:

- `asset-browser/` appears to be maintained as its own linked package/worktree in this repo setup, so if you want to change the tool itself, treat it as its own package rather than editing README assumptions only.

## Canvas level editor

`tools/canvas-level-editor/` is a generic 2D level editor core for canvas-based games. It is not a full standalone app by itself in this repo; it is the reusable engine layer you embed into a game-specific editor.

What the editor core provides:

- canvas-based object placement
- selectable tools and obstacle editing
- grid snapping
- undo/redo history
- autosave to local storage
- prefab save/load workflow
- publish/sync hooks
- validation hooks
- custom rendering hooks for game-specific visuals

The editor is configured through `window.CanvasLevelEditor.create(config)`.

The config injects:

- schema for obstacle/entity types
- course definitions
- color mappings and tooltips
- builtin prefabs
- drawing hooks
- validation rules
- import/export hooks

This makes it a good fit for:

- puzzle games with hand-authored layouts
- platformers with reusable obstacle chunks
- physics sandbox levels
- course-based games where designers need to tune object placement manually after LLM generation

Recommended workflow:

1. Use GameFactory to generate the playable base game.
2. Extract the level data shape used by the game.
3. Wrap `canvas-level-editor` with a game-specific HTML shell.
4. Implement `schema`, `drawObstacle`, `validateLevel`, and import/export hooks.
5. Use the editor to author or rebalance handcrafted levels.
6. Load exported level data back into the game runtime.

In practice, GameFactory is strongest when the LLM generates the mechanics and scaffolding first, and the level editor is used afterward for handcrafted tuning.

## Suggested workflow by project phase

### Prototype phase

- use `gf new`
- write a compact but sharp `GAME.md`
- generate with one CLI
- iterate quickly
- ignore production-grade assets at first

### Content phase

- start using `asset-browser`
- collect missing art requests
- review and organize generated assets
- tighten UI, feedback, and readability

### Design polish phase

- add a manual level editing layer if the game depends on tuned layouts
- use `canvas-level-editor` for handcrafted difficulty curves
- combine LLM generation with human-authored balance

### Ship phase

- re-run playtests
- clean prompts and visible text
- make sure public assets are intentional
- deploy with `gf ship`

## Who should use this

GameFactory is a strong fit for:

- solo makers shipping web games quickly
- AI-assisted prototyping workflows
- designers who want prompt-based generation plus manual tuning
- content-heavy small games that need an asset curation layer

## License

MIT for this repo, following the upstream OpenGame direction where applicable.

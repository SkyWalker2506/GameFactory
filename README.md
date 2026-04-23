# GameFactory

LLM-driven web game factory built on [OpenGame](https://github.com/leigest519/OpenGame) — uses **your coding CLIs** (Claude Code, Codex, Gemini, OpenCode) instead of paid API keys.

Tarif et → üret → oto-playtest → yayınla.

## Live examples (public)

| Game | Genre | Made by | Live |
|---|---|---|---|
| smoke-test | grid_logic | Claude (Pro) | https://gamefactory-smoke-test-p6v5luyaq-skywalker2506s-projects.vercel.app |
| tap-reflex | ui_heavy | Codex (ChatGPT Plus) | https://gamefactory-tap-reflex-2i0dvztg2-skywalker2506s-projects.vercel.app |
| word-guess | quiz | Gemini (Advanced) | https://gamefactory-word-guess-bpxz8ttjy-skywalker2506s-projects.vercel.app |

## Quick start

```bash
git clone <this-repo> && cd GameFactory
./scripts/setup.sh                                  # one-shot bootstrap

./scripts/gf genres                                 # list genre presets
./scripts/gf new my-puzzle --genre grid_logic --cli claude
./scripts/gf generate my-puzzle                     # LLM generates index.html
./scripts/gf playtest my-puzzle                     # headless Playwright check
./scripts/gf iterate my-puzzle "add combo counter"
./scripts/gf ship my-puzzle                         # git + GitHub + Vercel prod
./scripts/gf list                                   # status dashboard
```

## What setup.sh does (idempotent)

- Node 20+ check
- Installs `claude`, `codex`, `gemini`, `opencode` CLIs if missing (`npm i -g`)
- Creates `secrets/secrets.env` (gitignored) + links to `~/Projects/claude-config/claude-secrets/`
- Prompts for missing creds (skippable)
- OpenGame `npm install` + `npm run bundle` + `npm link`
- Writes `~/.qwen/settings.json` → `selectedType: claude-cli`
- `xattr -cr` workaround for macOS Gatekeeper killing esbuild install

Switch default CLI via `secrets/secrets.env` → `GF_DEFAULT_AUTH=claude-cli|codex-cli|gemini-cli|opencode-cli`, or per-game with `gf new ... --cli <name>`.

## Architecture

```
GameFactory/
├── factory/opengame/         # OpenGame fork (Qwen-Code CLI) + CliContentGenerator
│   └── packages/core/src/core/cliContentGenerator/
├── games/<name>/             # Each game is its own git repo + Vercel project
│   ├── GAME.md               # Source of truth (prompt)
│   ├── CLAUDE.md
│   ├── .qwen/settings.json   # Per-game CLI override
│   ├── index.html            # Generated
│   └── playtest.png          # From `gf playtest`
├── docs/
│   ├── game-fit-guide.md/png
│   ├── constraint-and-approach.md/png
│   └── genre-presets.json    # 12 genre prompt templates
└── scripts/
    ├── setup.sh              # Bootstrap
    ├── gf                    # Main CLI
    └── playtest.mjs          # Playwright auto-tester
```

### How the CLI adapter works

OpenGame's `ContentGenerator` interface is pluggable. We added `CliContentGenerator` that shells out to your locally-installed subscription CLI and wraps its output into OpenGame's expected response shape.

```
OpenGame → CliContentGenerator → spawn: claude -p --output-format json
                                         ↓  (your Pro subscription)
                                     JSON response
                                         ↓
          OpenGame ← GenerateContentResponse
```

Four CLI `AuthType`s added: `USE_CLAUDE_CLI`, `USE_CODEX_CLI`, `USE_GEMINI_CLI`, `USE_OPENCODE_CLI`.
Trade-offs: no fine-grained tool-use loop, no embeddings, approximate token count. For single-shot game gen it works great.

## Supported genres

Run `gf genres` for the full list. Top picks: `grid_logic`, `hyper_casual`, `idle_clicker`, `card_battle`, `tower_defense`, `quiz`, `top_down`, `platformer`, `visual_novel`, `reflex`, `physics_sandbox`, `educational`.

Deep dive on fit: [docs/game-fit-guide.md](docs/game-fit-guide.md).
How we solved the subscription-vs-API problem: [docs/constraint-and-approach.md](docs/constraint-and-approach.md).

## License

MIT (same as upstream OpenGame).

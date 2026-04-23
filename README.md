# GameFactory

LLM-driven web game factory built on [OpenGame](https://github.com/leigest519/OpenGame).

Tarif et → üret → oyna → iyileştir → yayınla.

## Quick Start

```bash
git clone <this-repo> && cd GameFactory
./scripts/setup.sh                              # tek komut — Node/CLI/secrets/OpenGame hepsi
./scripts/gf new my-puzzle --genre grid_logic
./scripts/gf generate my-puzzle
./scripts/gf playtest my-puzzle
./scripts/gf iterate my-puzzle "add combo system"
```

`setup.sh` şunları yapar (idempotent — istediğin kadar çalıştır):
- Node 20+ kontrol
- `claude`, `codex`, `gemini` CLI'larını eksikse `npm i -g` ile kurar
- `secrets/secrets.env` oluşturur (local, gitignored) + `~/Projects/claude-config/claude-secrets/`'a symlink
- Eksik credential varsa sorar, kaydeder
- OpenGame `npm install` + `npm link`
- `~/.qwen/settings.json` → `authType: claude-cli` yazar

CLI seçimi değiştirmek için `secrets/secrets.env` içinde `GF_DEFAULT_AUTH=claude-cli|codex-cli|gemini-cli`.

## Yapı

- `factory/opengame/` — OpenGame generator (Qwen-Code fork)
- `games/` — üretilen oyunlar (her biri bağımsız Vite+TS projesi)
- `docs/` — genre preset'leri, pipeline dokümanı
- `scripts/gf` — ana CLI

Detay: [CLAUDE.md](CLAUDE.md)

## Desteklenen Türler

Platformer · Top-down shooter · Tower defense · Grid puzzle · Card battle · Quiz · Reflex · Idle · Hyper-casual · Visual novel

## Altyapı

- Node 20+
- OpenAI-compatible API (GPT-4o default)
- Docker sandbox (opsiyonel — headless playtest için)
- Vite + TypeScript + Tailwind + Phaser/three.js/Canvas

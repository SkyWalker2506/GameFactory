# GameFactory — LLM-Driven Web Game Generator

> Genel kurallar: `~/Projects/Codex-config/AGENTS.md`

## Bu proje nedir

GameFactory, **OpenGame** (leigest519/OpenGame) üzerine kurulu bir oyun üretim fabrikasıdır. Doğal dil prompt'undan uçtan uca oynanabilir web oyunu üretir, ardından iteratif olarak geliştirir.

## Yapı

```
GameFactory/
├── factory/
│   └── opengame/          # OpenGame fork — core generator (Qwen-Code CLI tabanlı)
├── games/                 # Üretilen oyunlar — her biri bağımsız proje
│   └── <game-name>/
│       ├── AGENTS.md      # Oyuna özel kurallar
│       ├── GAME.md        # Oyun tasarım dokümanı (mekanik, loop, hedef kitle)
│       └── src/           # Vite + TS + Tailwind + (Phaser|three.js|Canvas)
├── docs/
│   ├── genres.md          # Tür preset'leri (platformer, puzzle, roguelite...)
│   └── pipeline.md        # Üretim akışı
└── scripts/
    ├── gf                 # Ana CLI — new/generate/iterate/playtest
    └── setup.sh           # opengame install + link
```

## OpenGame Altyapısı (öğrenilen)

- **Temel:** Qwen-Code CLI fork, Node 20+, OpenAI-compatible API (varsayılan GPT-4o)
- **Skill'ler:** Template Skill (iskelet) + Debug Skill (sandbox'ta çalıştır → hata bul → onar)
- **Template stack:** Vite + TypeScript + Tailwind (core template)
- **Genre modülleri:** `platformer`, `top_down`, `tower_defense`, `grid_logic`, `ui_heavy`
- **Asset sağlayıcılar:** Tongyi / Doubao / OpenAI (görsel), ayrı video+ses
- **Sandbox:** Docker/Podman, headless browser playtest
- **Komut:** `opengame -p "<açıklama>" --yolo`
- **Config:** `~/.qwen/settings.json` veya proje içinde `.qwen/settings.json`
- **Auth:** `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`

## GameFactory'nin Ek Katkısı

1. **Genre preset'leri** — OpenGame'in 5 modülünü genişletip önerilen prompt + balance parametreleri
2. **Iterative refine loop** — üret → Playwright ile oto-oyna → feedback → patch
3. **Her oyun ayrı Jira + AGENTS.md** — ClaudeHQ `projects.json`'a sub-project olarak kayıt
4. **Codex agent katmanı** — `puzzle-designer`, `balance-tuner`, `juice-polish`, `playtest-bot`
5. **Asset pipeline** — OpenGame'in görsel/ses provider'larını secrets'tan okuyan wrapper

## Workflow

1. `gf new <oyun-adı> --genre <tür>` → `games/<oyun-adı>/` + GAME.md + Jira key
2. `gf generate <oyun-adı>` → OpenGame'i çalıştır, ilk oynanabilir build
3. `gf playtest <oyun-adı>` → Playwright ile oyna, feedback üret
4. `gf iterate <oyun-adı> "<istenen değişiklik>"` → patch + test
5. `gf ship <oyun-adı>` → build, deploy (Vercel/GitHub Pages)

## Uygun Türler

**İyi:** 2D platformer, top-down shooter, tower defense, puzzle (grid), kart savaşı, quiz, reflex/survival, idle/clicker, hyper-casual, text/visual novel  
**Zor:** Unity/Unreal AAA, heavy multiplayer netcode, fizik-ağır 3D, MMO

## Oturum başında

1. `~/Projects/Codex-config/AGENTS.md` oku
2. `games/` tara — aktif oyunları listele
3. Yanıt başında: `(Jarvis | Model)`

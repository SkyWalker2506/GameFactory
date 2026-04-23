# 🎮 GameFactory — Hangi Oyunlar İyi Gider, Hangileri Sıkıntılı?

> LLM-driven web game factory (OpenGame tabanlı) için tür uygunluk rehberi.
> Stack: Vite + TypeScript + Tailwind + Phaser / three.js / Canvas.

---

## ✅ Çok İyi Gider — "Sweet Spot"

Kurallar net, asset yükü düşük, kod üretimi LLM için deterministik.

| Tür | Neden Uygun | Örnek |
|---|---|---|
| **Grid Puzzle** (match-3, sokoban, 2048, minesweeper, picross) | Net kurallar, az asset, mantık LLM-dostu | Snake, Candy Crush lite |
| **Hyper-Casual 1-Tap** (flappy, doodle jump, stack) | 50–200 satır kod, tek mekanik | Flappy Bird klonu |
| **Idle / Clicker** (incremental, prestige, cookie) | Number-crunching + UI, LLM'in güçlü alanı | Cookie Clicker |
| **Turn-Based Kart** (solitaire, uno, basit TCG) | State machine, hafif animasyon | Hearthstone-lite |
| **Tower Defense** (sabit lane/grid) | OpenGame'de hazır modül, balance LLM-dostu | Bloons-lite |
| **Quiz / Trivia / Kelime** (wordle, hangman) | Content üretimi LLM'in doğal alanı | Wordle klonu |
| **Top-Down Shooter / Roguelite 2D** (wave-based) | OpenGame modülü var, Phaser ile temiz | Vampire Survivors-lite |
| **2D Platformer** (tek ekran, kısa level) | OpenGame modülü, fizik basit (AABB) | Celeste mini |
| **Visual Novel / Text Adventure / IF** | Tamamen metin + dallanma — LLM'in doğal alanı | Choose-your-own |
| **Reflex / Reaction** (reaction test, rhythm-lite) | Dar core loop, juice ile zenginleşir | Piano Tiles |
| **Turn-Based Strategy** (hex, chess variant, sabit grid) | Minimax AI deterministik yazılır | Into the Breach mini |
| **Physics Sandbox** (angry birds lite, truss) | Matter.js + basit level editor | Crayon Physics-lite |
| **Educational Mini-Game** (çocuk, matematik, dil) | İçerik üretimi LLM'in zirvesi | Khan Academy mini |

---

## ⚠️ Orta — Uğraştırır Ama Yapılabilir

Ölçek büyüyor, asset/balance iterasyonu uzuyor ya da altyapı ekliyor.

| Tür | Zorluk |
|---|---|
| **Metroidvania / Büyük Platformer** | Çok level + animasyon + kamera — ölçek sorunu |
| **Çok Oyunculu Turn-Based (online)** | Netcode + lobby — WebSocket backend gerekir |
| **3D Third-Person Basit** (three.js) | Asset pipeline zor, model import kırılgan |
| **Ritim Oyunu (karmaşık)** | Tarayıcı ses senkron latency sorunları |
| **Klasik Roguelike** (ASCII + derinlik) | Content balance uzun iterasyon ister |
| **Builder / Tycoon** (factorio-lite) | UI kompleksitesi hızla patlar |
| **Yarış / Driving** | Fizik tuning çok uzun sürer |

---

## ❌ Sıkıntılı — GameFactory'den Uzak Dur

Yanlış araç. Unity/Unreal, custom engine veya ciddi altyapı ister.

| Tür | Neden Olmaz |
|---|---|
| **AAA / Büyük 3D** (Unity/Unreal) | Yanlış stack |
| **MMO / Real-Time Multiplayer Shooter** | Netcode, anti-cheat, sunucu altyapısı |
| **Fizik-Ağır Simülasyon** (BeamNG, KSP tarzı) | Hassas integrator, custom engine gerekir |
| **Açık Dünya** | Asset + world streaming — tarayıcıda pratik değil |
| **VR / AR** | Donanım + WebXR kırılganlığı |
| **eSports-Grade Competitive** | Frame-perfect tuning, LLM iterasyonu yetmez |
| **Foto-Realistik 3D** | Asset + shader zanaatı |
| **Emülatör / Sistem Programlama** | Yanlış alan |
| **Online Casino / Kumar** | Yasal + RNG denetim + lisans |
| **Yüksek Bütçeli Story RPG** | Büyük narrative + VO + cinematic — bütçe işi |

---

## 🎯 Başlangıç Sırası Önerisi

1. **Grid Puzzle** → pipeline'ı en hızlı doğrular (1–2 saat tam loop)
2. **Hyper-Casual** → juice/feel pipeline'ını test eder (tween, particle, SFX)
3. **Idle / Clicker** → uzun-oturum balance + save/load sistemini kurar

Bu üçü çalışınca Tower Defense / Card Battle / Roguelite gibi ağırlara geçmek kolay olur.

---

## 🧱 Teknik Kapsam

**Destekli engine'ler:** Canvas API, Phaser 3, three.js
**Template modülleri (OpenGame):** `platformer`, `top_down`, `tower_defense`, `grid_logic`, `ui_heavy`
**Asset:** LLM text/logic + opsiyonel image provider (Tongyi / Doubao / OpenAI) + SFX
**Deploy:** Vercel, GitHub Pages, Netlify — tek komutla

---

*GameFactory • powered by [OpenGame](https://github.com/leigest519/OpenGame) + Claude Code orchestration*

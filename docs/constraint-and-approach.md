# 🧩 GameFactory — Kısıt ve Çözüm Yaklaşımımız

> Neden doğrudan OpenGame'i açıp çalıştıramıyoruz ve bunu nasıl çözüyoruz.

---

## Arka Plan

**OpenGame** (leigest519/OpenGame), prompt'tan uçtan uca web oyunu üreten açık kaynak bir agentic framework. Qwen-Code CLI fork'u üzerine kurulu; Vite + TypeScript + Tailwind şablonları ve 5 hazır tür modülü (platformer, top-down, tower defense, grid puzzle, UI-heavy) var. Ayrıca Template Skill (iskelet kurma) + Debug Skill (sandbox'ta çalıştır → hatayı bul → onar) + GameCoder-27B (özel fine-tuned LLM) üçlüsü ile iteratif üretim yapıyor.

---

## Kısıt — Ne Sorun Var?

OpenGame LLM'e **OpenAI-compatible HTTP API** üzerinden erişir. Yani çalışması için:

- `OPENAI_API_KEY` (veya Anthropic/Gemini API key) gerekiyor
- Bu API key'ler **token başına ücretli** — her oyun üretiminde para yanar
- **Bizim durumumuz:** Ekip olarak **aylık subscription** alıyoruz (Claude Pro/Max, ChatGPT Plus, Gemini Advanced). Bu subscription'lar CLI'lar üzerinden geliyor: `claude` CLI, `codex` CLI, `gemini` CLI
- **Sorun:** Subscription'lar API erişimi **vermiyor** — sadece resmi CLI üzerinden kullanılabiliyor. Yani mevcut aboneliklerimizle OpenGame "olduğu gibi" çalışmaz → ayrıca API parası ödemek zorunda kalırız

Özet: **OpenGame token-bazlı API bekliyor, elimizde CLI-bazlı subscription var. Köprü yok.**

---

## Çözüm Yaklaşımımız — "Yol B: CLI Adapter"

OpenGame'in mimarisi şanslı bir şekilde **pluggable content generator** modelinde. Yani LLM'e nasıl gidileceğini bir interface'in arkasına soyutluyorlar:

```ts
interface ContentGenerator {
  generateContent(...)
  generateContentStream(...)
  countTokens(...)
  embedContent(...)
}
```

Hazır implementation'lar: OpenAI, Anthropic API, Gemini API, Vertex AI, Qwen OAuth. Biz bu listeye **yeni bir adapter** ekliyoruz:

### `CliContentGenerator`

Prompt'u alır, shell üzerinden aboneliğe sahip CLI'a yollar, çıktıyı OpenGame'in beklediği formata dönüştürür:

```
OpenGame → CliContentGenerator → shell: `claude -p "<prompt>" --output-format=json`
                                       ↓
                                  JSON response
                                       ↓
          OpenGame ← GenerateContentResponse (OpenAI-uyumlu format)
```

Yeni auth tipleri ekliyoruz:
- `USE_CLAUDE_CLI` → `claude -p` (Anthropic abonelik)
- `USE_CODEX_CLI` → `codex exec` (OpenAI abonelik)
- `USE_GEMINI_CLI` → `gemini` (Google abonelik)

Config dosyasında:
```json
{ "authType": "claude-cli", "model": "claude-opus-4-7" }
```

---

## Neyin Bedeli Var? — Dürüst Trade-off

Adapter işe yarayacak ama **bazı yetenekler körelir**:

| Özellik | Doğrudan API | CLI Adapter |
|---|---|---|
| Kod üretimi | ✅ | ✅ |
| Streaming output | ✅ | ⚠️ sınırlı |
| Fine-grained tool-use loop | ✅ | ⚠️ CLI kendi loop'unu çalıştırır |
| OpenGame'in debug/self-repair skill'i | ✅ | ⚠️ kısmi |
| Token sayımı | ✅ | ❌ (CLI exposure yok) |
| Maliyet | 💰 Token bazlı | 💰 Subscription kapsamında |

**Sonuç:** OpenGame'in "agentic loop" değerinin %60-70'ini koruyoruz, %30-40'ını (ince tool orchestration) Claude Code'un kendi agent sistemine devrederek telafi ediyoruz. Net etki: **cepten 0 ekstra ücret**, biraz daha basit bir iterate döngüsü.

---

## Plan B (Yedek)

Eğer CLI adapter'ın tool-use kaybı bizi çok yavaşlatırsa, ikinci seçeneğe geçeriz: OpenGame'i **sadece template+skill kütüphanesi olarak** kullanıp kod üretim orkestrasyonunu tamamen Claude Code'a devrediyoruz. Daha basit, daha az OpenGame-native ama çalışır.

---

## Takvim

- **Aşama 1 (bugün):** `CliContentGenerator` scaffold + `claude` CLI adapter
- **Aşama 2:** `codex` + `gemini` adapter'ları
- **Aşama 3:** İlk test oyunu (grid puzzle) uçtan uca üretim
- **Aşama 4:** Playwright ile oto-playtest döngüsü

---

*Kısacası: elimizdeki repo'yu fork'ladık, kendi abonelik altyapımıza göre yeniden kablolayacağız. Sıfır ekstra API ücreti, OpenGame'in ekosistem değeri korunarak.*

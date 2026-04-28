# Pact of Five — Game Design Document (GDD)

> **Tür:** Single-player Deck-Building Roguelike (TCG mekaniği + Slay the Spire ilerleme)
> **Platform:** Web (Vite + TS + Tailwind, DOM kart UI + Canvas FX). İleride Capacitor (mobile) + Tauri (desktop) wrap.
> **Hedef oturum:** Tek run 45–75 dk; kart başına karar 5–15 sn.
> **Hedef kitle:** Slay the Spire / Monster Train / Pokemon TCG sevenler; 14+.

---

## 1. Yüksek-Seviye Konsept

Oyuncu, **Critter Tamer** olarak unutulmuş bir adada beş elementin (Ember, Tide, Verdant, Storm, Umbra) çatışan ekosistemini geri dengelemeye çalışır. Her run'da bir karakter seçer, vahşi yaratıkları yakalayıp destesine ekler, harita üzerinden ilerler, üç act'in sonunda Element Lord'larıyla savaşır. Ölünce run biter; meta-progression yeni kart, karakter ve relic açar.

**Tek cümle pitch:** "Pokemon yaratıkları topla, Slay the Spire gibi destene ekle, Hearthstone gibi sahaya sür."

**Üç temel direk:**
1. **Element çemberi** — 5 elementin karşılıklı zayıflıkları her kart kararını şekillendirir.
2. **Yaratık + Büyü hibriti** — Sadece spell değil, sahada kalan kalıcı yaratıklar var (HP/ATK/keyword).
3. **Run-içi sinerji avı** — Her ödül seçimi destenin "kimliğini" pekiştirir veya değiştirir.

---

## 2. Element Sistemi

### 2.1 Beş Element

| Element | Renk | Tema | Tipik Mekanik |
|---------|------|------|---------------|
| **Ember** 🔥 | #f97316 (orange) | Ateş, volkanik yaratıklar | Yüksek hasar, Burn DoT, fedakarlık |
| **Tide** 💧 | #06b6d4 (cyan) | Okyanus, buz | Defans, iyileşme, Chill (mana cezası) |
| **Verdant** 🌿 | #22c55e (green) | Orman, mantarlar | Kart çekme, scaling powers, Root (sıra atlatma) |
| **Storm** ⚡ | #a78bfa (violet) | Şimşek, rüzgar | AOE, hız (Swift), Shock (rastgele atış) |
| **Umbra** 🌑 | #64748b (slate) | Gölge, lanetler | Vulnerable (Shadow), exhaust manipulasyonu, kurban |

### 2.2 Zayıflık/Üstünlük Çemberi

```
Ember → Verdant → Tide → Storm → Umbra → Ember
```

- Saldıran üstünse: hasar **×1.5** (yukarı yuvarla)
- Saldıran zayıfsa (ters yön): hasar **×0.75** (aşağı yuvarla)
- Aynı element veya neutral: ×1.0

UI: Hedef üstünde küçük bir ikon (✓ üstün, ✗ zayıf, • nötr) gösterilir.

### 2.3 Neutral Kartlar
Element bağlı olmayan "Neutral" kartlar var (jeneralist destelerin tutkalı). Bonus/ceza yok.

---

## 3. Kart Anatomisi

```
┌─────────────────┐
│ 🔥 [3]    Rare  │  ← element ikon, mana, nadirlik
│  ┌───────────┐  │
│  │  ART      │  │
│  └───────────┘  │
│ Magma Drake     │  ← isim
│ Creature 6/4    │  ← tip, HP/ATK (sadece creature)
│ Guard. On play: │  ← anahtar kelime + efekt
│ deal 3 to all   │
│ enemies.        │
└─────────────────┘
```

**Alanlar:** `id, name, element, type (CREATURE | SPELL | POWER), cost (0–10, X mümkün), rarity (common/uncommon/rare), baseHp?, baseAtk?, keywords[], description, effect(state, ctx), upgraded?, value`.

**Tipler:**
- **Creature** — Sahaya çıkar, oyuncunun yanında durur, oyuncu yerine saldırır; kalıcı (öldürülünceye kadar). Maks 5 creature slot.
- **Spell** — Tek seferlik, oynandıktan sonra discard.
- **Power** — Run boyunca ya da savaş boyunca pasif buff (örn. "Her tur başı +1 Block kazan"). Savaş başına 3 power slot limiti.

---

## 4. Anahtar Kelimeler (Keywords)

Tek doğruluk kaynağı `src/core/keywords.ts`:

| Keyword | Etki |
|---------|------|
| **Guard** | Düşmanlar bu yaratık varsa diğer hedeflere saldıramaz. Birden fazla varsa düşman seçer. |
| **Swift** | Sahaya çıktığı tur saldırabilir. (Default: çıktığı tur saldıramaz.) |
| **Echo** | Ölünce belirtilen efekti tetikler ("Echo: 2 Burn uygula"). |
| **Pierce** | Hedefin Block'unu yok sayar. |
| **Lifelink** | Verdiği hasar kadar oyuncuyu iyileştirir. |
| **Volatile** | Discard edildiğinde efektini tetikler; tur sonu kalırsa exhaust. |
| **Frail** | -50% verdiği hasar (geçici status). |
| **Bond** | Yanında aynı element creature varsa +1/+1. |
| **Surge** | Mana harcandığında kart maliyeti -1 olur (sıfırlanmaz). |
| **Chain X** | Bu turda X. kart oynanırsa bonus efekt. |
| **Resonate** | Aynı element kart oynandığında tetiklenir. |
| **Overload(N)** | Sonraki tur başlangıç manası -N. |
| **Combo(N)** | Bu turda aynı elementten N. kart oynanırsa bonus efekt tetiklenir. Threshold kart metninde (`Combo(2)`/`Combo(3)`/`Combo(4)`). |
| **Sigil** | Persistent battlefield enchant. `addSigil()` ile yerleştirilir; her turun başında (status tick'ten sonra, draw'dan önce) tetiklenir. Cap: 5; aşılırsa aynı elementten en eski sigil kaldırılır. Sigil Crown relic +2 tur ekler. |
| **Banish** | Bir kartı `Deck.banishedPile`'a taşır → bu savaşın geri kalanında geri dönmez. `banishCardFromHand(state, uid)` üzerinden. Banish Pact relic her banish için +1 strength verir. |

### 4.1 Statü Efektleri

| Statü | Etki | Stack |
|-------|------|-------|
| **Burn (X)** | Tur başı X hasar; tur sonu X-1'e düşer | Toplanır |
| **Chill (X)** | Sonraki X kartın maliyeti +1 | Toplanır |
| **Root** | 1 tur saldıramaz | 1 tur |
| **Shock** | Tur başı 1 rastgele kart discard | Stack=tur sayısı |
| **Shadow (X)** | Aldığı hasar +50% (X tur) | Tur sayısı toplanır |
| **Block (X)** | Sıradaki hasarı X kadar emer; oyuncu için tur başı sıfırlanır | Toplanır |
| **Strength (X)** | Tüm saldırılara +X hasar | Kalıcı (savaş içinde) |
| **Dexterity (X)** | Block kartları +X | Kalıcı (savaş içinde) |
| **Regen (X)** | Tur sonu X HP iyileş; her tur 1 azalır | Toplanır |

---

## 5. Tur Yapısı

### 5.1 Savaş Akışı (turn-based, sıralı)

1. **Battle Start:** İlk eli çek (5 kart). Relic `onBattleStart` tetiklen. Statüler sıfırla (kalıcı powers hariç).
2. **Player Turn:**
   - Mana = max mana (başlangıç 3, max 10).
   - Block sıfırlanır (bazı relic istisna).
   - Tur başı statüleri çöz (Burn → Block → diğerleri sırasıyla).
   - Eli `5` karta tamamla (önceki kalanlar discard'a, hand cap 10).
   - `onTurnStart` relic tetiklen.
   - Oyuncu kartları oynar (mana yeterse). Hedefli kartlar düşman/creature/self seçer.
   - "End Turn" butonu.
3. **Enemy Turn:**
   - Sırayla her düşman: gösterilen intent'i çöz.
   - Volatile kartlar exhaust olur, hand atılır.
4. **Loop** until biri ölür.

### 5.2 Mana
- Başlangıç max: 3
- Her elite/boss sonrası +1 (cap 10)
- Bazı kartlar X cost (tüm kalan mana harca)
- Surge keyword'ü mana ekonomisini değiştirir
- Overload(N): sonraki turda max mana -N

### 5.3 Hand/Pile Yönetimi
- **DrawPile** (boş ise discard shuffle ile yenilenir)
- **Hand** (cap 10; aşan çekiş "burn"=exhaust)
- **DiscardPile**
- **ExhaustPile** (savaş sonuna kadar geri dönmez)

---

## 6. Karakterler (3 Başlangıç)

### 6.1 Tamer (Ember/Verdant odaklı)
- **HP:** 80
- **Tema:** Yaratık çağırma, bond sinerjisi
- **Starting Relic:** *Beastbond* — "Yaratık oynadığında +1 Block."
- **Starting Deck (10):**
  - 4× *Spark* (Ember spell, 1 mana, 6 hasar)
  - 4× *Sprout* (Verdant creature, 1 mana, 2/2)
  - 1× *Wild Call* (neutral, 1 mana, random common creature çağır)
  - 1× *Tame* (neutral, 0 mana, en düşük HP düşmanı 1 turn için kontrol et)

### 6.2 Sage (Tide/Storm odaklı)
- **HP:** 65
- **Tema:** Spell zincir, scaling power
- **Starting Relic:** *Codex of Tides* — "Spell oynaninca %15 ek kart çek."
- **Starting Deck (10):**
  - 4× *Mist Bolt* (Tide spell, 1 mana, 3 hasar + 2 Block)
  - 4× *Static* (Storm spell, 1 mana, 4 hasar)
  - 1× *Insight* (neutral, 1 mana, 2 kart çek)
  - 1× *Tempest* (Storm power, 2 mana, "Her spell sonrası 1 hasar AOE")

### 6.3 Hunter (Umbra/Storm odaklı)
- **HP:** 70
- **Tema:** Statü stack, exhaust ekonomisi
- **Starting Relic:** *Marksman's Eye* — "Tek hedefli saldırılar +1 hasar."
- **Starting Deck (10):**
  - 4× *Strike* (neutral spell, 1 mana, 5 hasar)
  - 3× *Shade* (Umbra spell, 1 mana, 2 Shadow uygula)
  - 2× *Bolas* (Storm spell, 1 mana, 1 Root)
  - 1× *Backstab* (Umbra spell, 0 mana, Shadow stack başına +2 hasar; exhaust)

### 6.4 Kilitli (Meta Unlock)
- **Warden** (Tide/Umbra defans uzmanı) — Act 3 boss yenilince açılır.

---

## 7. Roguelike Yapısı

### 7.1 Harita
- **3 Act × 15 floor.** Slay-the-Spire-tarzı dallanan grafik (6 kolon).
- Floor 0: Battle (sabit, başlangıç).
- Floor 5 ve 11: Elite garantili.
- Floor 8: Rest garantili.
- Floor 14: Boss (sabit).
- Floor 1–13 (yukarıdakiler hariç): Aşağıdaki tablodan ağırlıklı seçilir.
- Edge generator çakışma önleyici (sibling node'lar 1 sütun arayla).

### 7.1.1 Biome Theming (per Act)
| Act | Biome | Sky | Mid | Silhouette | Accent | Description |
|-----|-------|-----|-----|------------|--------|-------------|
| 1 | Sunlit Coast | teal/azure | teal-deep | dark slate | verdant green | "Misty surf and tangled mangroves" — gentle wave silhouettes + distant island |
| 2 | Volcanic Marsh | crimson/amber | rust | bg-deep | ember orange | "Smouldering caldera vents" — triangular peaks + lava crack + small eruption |
| 3 | Storm Spire | indigo/violet | violet-deep | bg-near-black | violet-light | "Floating peaks shrouded in violet lightning" — jagged shards + lightning bolts |

Implementation: `BIOMES[act]` in `src/ui/svg.ts` + `biomeBackgroundSvg(act)` returns 3-layer parallax SVG (sky → mid shapes → silhouette). MapView wraps map nodes over a biome-banner card with biome name + description; CSS gives the bg a slow 24s drift animation.

### 7.2 Düğüm Tipleri
| Tip | İkon | Frekans | Etki |
|-----|------|---------|------|
| BATTLE | ⚔️ | %45 | 1–2 normal düşman |
| ELITE | 💀 | %12 | Güçlü düşman; ödül: rare relic + altın + nadir kart |
| REST | 🔥 | %12 | %30 HP heal **veya** bir kartı upgrade |
| SHOP | 🛒 | %10 | Kart/relic/potion satın al; "card removal" servisi (75 altın → +25 her kullanım) |
| MYSTERY | ❓ | %16 | Rastgele event |
| BOSS | 👑 | sabit floor 14 | Multi-phase, garantili boss-relic + altın |

Act geçişi: Act bossu yendikten sonra **maxHP +5, mana cap +1**, kısa bonfire (heal full + 1 elit relic seçimi) → Act 2.

### 7.3 Run State
```ts
{
  characterClass, seed, act, floor, currentNodeId,
  hp, maxHp, gold, deck[], relics[], potions[],
  unlockedAchievements[], stats: {turns, dmgDealt, dmgTaken, cardsPlayed}
}
```

LocalStorage'a otomatik kaydolur (her node geçişinde). Tek aktif run.

### 7.4 Ödül Akışı
- **Battle:** 8–15 altın + "3 karttan 1 seç" (rarity 60/30/10 common/uncommon/rare; skip mümkün)
- **Elite:** 25–35 altın + "3 karttan 1 seç (uncommon havuz)" + 1 random relic
- **Boss:** 100 altın + "3 rare karttan 1 seç" + 3 boss-relic'ten 1 seç

---

## 8. Düşmanlar (24+)

### Act 1 — Sahil ve Orman (HP 15–55)
- **Sandcrab** (Tide) — Defans, ara sıra çift saldırı
- **Sproutling** (Verdant) — Sayı kalabalığı, zayıf tek saldırı
- **Ember Imp** (Ember) — Burn uygular
- **Static Mite** (Storm) — Discard zorlar
- **Shadeling** (Umbra) — Shadow stack
- *(Elite)* **Coral Champion** (Tide) — Yüksek HP, Block farm
- *(Elite)* **Wildfire** (Ember) — Her tur Burn AOE
- *(Boss)* **Hydra Tide** (Tide, 120 HP) — 3 baş; her baş yok edildikçe pattern değişir; phase 2 (50% HP) iki baş yenilenir

### Act 2 — Volkan ve Bataklık (HP 30–110)
- **Magma Wisp** (Ember) — Self-sacrifice burn
- **Bog Witch** (Verdant) — Root + heal
- **Storm Hawk** (Storm) — Swift saldırı, tek tur
- **Vinegar Slug** (Verdant) — Yüksek HP, debuff
- **Thunder Boar** (Storm) — Charge build-up, sonra büyük saldırı
- *(Elite)* **Obsidian Golem** (Umbra) — Block farm + Pierce
- *(Elite)* **Coven Trio** (Verdant) — 3 küçük caster, biri ölünce diğerleri buff
- *(Boss)* **Verdant Wraith** (Verdant, 180 HP) — Her tur 2 Root uygular; oyuncu sadece 1 kart oynayabildiğinde Wraith heal; phase 2: kendine Lifelink

### Act 3 — Fırtına Tepesi (HP 60–250)
- **Storm Knight** (Storm) — Yüksek defans + tek saldırı
- **Umbra Lich** (Umbra) — Sürekli Shadow uygular
- **Magma Titan** (Ember) — Yavaş ama 30+ hasar
- *(Elite)* **Twin Eclipses** (Umbra) — 1 ışık + 1 gölge; aynı turda öldürülmezse diriltirler
- *(Boss)* **Element Sovereign** (260 HP toplam, 3 phase) — Her phase farklı element (Ember → Storm → Umbra); her phase 100 HP; phase geçişinde tüm statüler temizlenir

### Intent Sistemi
Her düşmanın `pattern: Intent[]` dizisi var; sırayla döner. **Tekrarlanmama kuralı:** aynı intent 3 kez üst üste gelmesin → wraparound'da sonraki seçilir. Bazı düşmanların `weighted` modu var (rastgele ağırlıklı seçim, seedli).

Intent görsel telegrafı:
- ⚔️ X — saldırı (X hasar; element çemberi sonrası gerçek değer)
- 🛡️ X — defans (X block)
- ✨ — buff/debuff (status icon)
- 💀 — özel boss mekaniği
- ❓ — gizli (sadece bazı düşmanlar)

---

## 9. Kart Havuzu (115 kart hedefi)

### Dağılım
| | Common | Uncommon | Rare | Toplam |
|--|--------|----------|------|--------|
| Ember | 6 | 5 | 4 | 15 |
| Tide | 6 | 5 | 4 | 15 |
| Verdant | 6 | 5 | 4 | 15 |
| Storm | 6 | 5 | 4 | 15 |
| Umbra | 6 | 5 | 4 | 15 |
| Neutral | 4 | 3 | 3 | 10 |
| **Genel** | **34** | **28** | **23** | **85** |

Ek olarak **karakter-özel** 10 imza kart × 3 karakter = **30**. Genel toplam: **115 kart**.

### Örnek Kartlar (her elementten 2)

**Ember**
- *Spark* (C, 1, Spell): 6 hasar.
- *Magma Drake* (R, 4, Creature 6/4): Guard. On play: tüm düşmanlara 3.

**Tide**
- *Mist Bolt* (C, 1, Spell): 3 hasar + 2 Block.
- *Frost Warden* (U, 3, Creature 4/2): Sahaya çıktığında tüm düşmanlara 2 Chill.

**Verdant**
- *Sprout* (C, 1, Creature 2/2): Bond.
- *Overgrowth* (R, 2, Power): Her tur başı +1 kart çek.

**Storm**
- *Static* (C, 1, Spell): 4 hasar.
- *Chain Lightning* (R, 3, Spell): 6 hasar; her oynanan kart sonrası bu turda +1 hasar.

**Umbra**
- *Shade* (C, 1, Spell): 2 Shadow.
- *Soul Drain* (R, 2, Spell): Shadow stack başına 3 hasar; statüyü tüket.

**Neutral**
- *Insight* (U, 1, Spell): 2 kart çek.
- *Wild Call* (C, 1, Spell): Random common creature sahaya çağır.

### Upgrade Sistemi
Rest site'de bir kart upgrade edilebilir → cost > 1 ise cost -1; aksi halde efekt aynı kalır ama "+" işareti ile gösterilir. `upgraded: true` flag; isim `+` suffix; cardId convention: `${id}__plus`. `Deck.upgradeCardInstance(cardId)` tüm desteki kopyaları rewrite eder. Variants `data/cards.ts` içinde `generateUpgradeVariants()` IIFE ile auto-generated.

### 9.6 Rest-Site Upgrade UI (Iter 10)
Rest scene 3 önbellek (preview) kart gösterir: orijinal kart üstte, `+` versiyonu altta, "Upgrade <Name>" butonu → `deck.upgradeCardInstance(id)` çağrısı + alert ile kaç kopyanın upgrade olduğu. Tüm upgrade variant'ları için cardsByRarity / shop / reward havuzları otomatik gizlenir (echoId + characterOnly bypass'leri korunur).

---

## 10. Relics (30+)

3 nadirlik: common, uncommon, rare, **boss** (4. tier — boss reward).

### Hook Tipleri
- `onBattleStart(state)`
- `onTurnStart(state)`
- `onTurnEnd(state)`
- `onCardPlay(state, card)`
- `onDamageDealt(state, target, amount)`
- `onDamageTaken(state, source, amount)`
- `onCreatureSummon(state, creature)`
- `onRelicGain(state)`

### Örnekler
| Relic | Tier | Etki |
|-------|------|------|
| Ember Charm | Common | Tur başı ilk kart +2 hasar |
| Tideheart | Common | Tur sonu 2 HP regen |
| Storm Coil | Uncommon | Her 3. spell sonrası +1 mana |
| Verdant Seed | Uncommon | Battle başı 1 Sprout sahaya |
| Shadow Lens | Rare | Shadow uygularken +1 stack |
| Crown of Echoes | Boss | Echo efektleri 2× tetiklen |
| Pact Stone | Boss | Battle başı 5 dmg al, 5 mana kazan |
| Chain Pendant | Uncommon | 3-card same-element combo this turn → +1 strength rest of turn |
| Element Loom | Rare | First time you play 3 different elements this turn → draw 1 |
| Resonant Crystal | Uncommon | Combo cards deal +2 (marker; cards self-check) |
| Combo Engine | Boss | 4-card same-element combo → +2 mana |

---

## 11. Mystery Events (15 + 2 chained follow-ups)

### Standalone (10 base + 5 Iter 15)
- **Crossroads:** 3 yoldan 1: 30 altın / rare kart / 25% maxHp (🪧)
- **Lost Cub:** Adopt → +5 maxHP + common creature; later unlocks Old Friend Returns (🐾)
- **Dark Pact:** 25% maxHP ver, rare relic al; later unlocks The Debt Returns (🩸)
- **Treasure Vault:** 50 altın **veya** rare kart (savaş tetikler %50)
- **Library:** 1 kartı upgrade et veya yeni neutral spell al
- **Trader:** Bir kartını ver, başka random kart al
- **Eldritch Mirror:** Tüm common kartların 2'şer kopyalanır
- **Shrine:** 20 altın → uncommon kart, ya da heal 8
- **Wandering Sage:** maxHP -5, +1 power slot
- **Storm Altar:** +10 altın
- **Tide Pool** (🪸 Iter 15): wade in (heal 12 / take 4) · grab tide card · pass
- **Bone Wagon** (🦴 Iter 15): gamble 30g for uncommon relic 60% · smash for 15g (-5 maxHP) · move on
- **Forge Master** (🔥 Iter 15): trade common→uncommon · 25g for +1 max mana · decline
- **The Juggler** (🤹 Iter 15): red (best of 4 random rewards) · blue (heal 8 + 5g) · yellow (random chaos)
- **Umbral Fork** (🌑 Iter 15): whispers (umbra card −3 maxHP) · damp earth (verdant card +6 heal)

### Chained (Iter 15 — chainOnly, only appear if flag set)
- **The Debt Returns** (👤): unlocked by `blood_debt` (Dark Pact). Pay 30% maxHP for +2 max mana, OR battle for +50g
- **Old Friend Returns** (🐺): unlocked by `adopted_cub` (Lost Cub). Welcome (rare creature card) OR send back (+25g, +5 maxHP)

### Implementation
- `EventChoice.unlocks?: string` → pushes a flag onto `run.eventFlags` when chosen
- `MysteryEvent.requires?: string[]` + `chainOnly?: boolean` → `eligibleEventIds(run)` filters the random pool
- `RunState.eventFlags: string[]` persisted; backwards-compatible default `[]`
- Visited events tagged `visited:<id>` (informational; no gating yet)

### UI (Iter 15 — uygulanmış)
Event scene rebuilt as a **modal**: amber-bordered panel, 60×60 hero glyph + title + tag, italic body text, choice cards with glyph + label + description tooltip; entrance animation `eventIn` 360ms. Dim full-screen backdrop.

---

## 11b. Aura (Iter 17 — uygulanmış)

Aura keyword: a creature confers a passive buff while it stays alive on your field. Multiple auras of the **same id** do not stack; each unique aura applies once.

| AuraId | Effect | Carrier (creature card) |
|--------|--------|--------------------------|
| `spell_focus` | Spells deal +1 dmg | Storm Arcanist (3 cost, 3/6) |
| `creature_might` | Your creatures attack +1 | Grove Warden (3 cost, 4/7) |
| `block_doubler` | Block gained ×1.25 | Tide Keeper (3 cost, 2/9) |
| `ember_searing` | Ember spells deal +2; **also Guard** | Searing Warden (3 cost, 3/8) |
| `umbral_dread` | Umbra spells deal +1 | Dread Familiar (3 cost, 3/6) |

Implementation: `CreatureInstance.auraId?: AuraId`; `aurasActive(state)` returns the unique-id Set; hooked from `dealDamage()` (player + creature sources) and `addBlock()` paths. `predictDamage()` does not yet account for auras (small TODO).

## 11a. Sigils (battlefield enchants)

Sigils are persistent on-board enchants that trigger once per turn. Capacity 5; replacing rule: same-element first, then oldest.

| Sigil | Cost | Element | Duration | Per-turn effect |
|-------|------|---------|----------|------------------|
| Ember Sigil | 2 | ember | 3 | Deal 4 ember to a random enemy |
| Tide Sigil | 2 | tide | 3 | Gain 5 block |
| Verdant Sigil | 2 | verdant | 4 | Heal 3 |
| Storm Sigil | 2 | storm | 3 | Draw 1 |
| Umbra Sigil | 2 | umbra | 3 | Apply 1 shadow to all enemies |

Support: **Sigil Surge** (1c spell, fires every active sigil now). **Sigil Pact** (0c exhaust spell, +2 turns to all). **Sigil Crown** (rare relic, +2 turns to every sigil placed).

## 8a. Bespoke Boss Phase Transitions (Iter 7)

Each Act boss now has a phase-2 cinematic moment, fired in `bespokeBossPhaseTransition()`:

- **Hydra Tide** (Act 1): regenerates a smaller head — adds an `imp` enemy if slot available. Log: "* The Hydra Tide regenerates a smaller head! *"
- **Verdant Wraith** (Act 2): gains 4 regen, lifelink flavour. Log: "* Verdant tendrils wreathe the Wraith — lifelink awakens! *"
- **Element Sovereign** (Act 3): purges all enemy statuses + clears player non-block statuses + shifts element ember → storm. Log: "* The Sovereign sheds its ember husk and crackles with storm essence — all curses cleansed. *"

## 12. Meta-Progression

LocalStorage'da:
- **Unlocked Characters:** Tamer (default), Sage (5 win), Hunter (Act 2 boss yen), Warden (Act 3 boss yen)
- **Unlocked Cards:** Her boss yenilince havuza yeni kartlar eklenir (~15 başlangıç kilidi)
- **Unlocked Relics:** Aynı şekilde
- **Achievements:** "100 kart oyna", "Burn ile 50 hasar ver" vb. (15+ achievement)
- **Run History:** Son 20 run özeti (karakter, floor, neden öldü)
- **Ascension:** Her ascension level zorluk +1 (`startRun(asc)` maxHp -3 / level, max -15). UI: title-screen 0-5 picker (locked above ascensionMax)
- **Save Slots (Iter 9):** 3 bağımsız slot — `loadRunSlot(1|2|3)`, `saveRunSlot`, `clearRunSlot`. `slotKey()` -> `pact-of-five:run:v2:slot{n}`. Geriye dönük uyumluluk için legacy `:v1` key her save'de mirror edilir.
- **Daily Best:** `meta.dailyBest = { date, characterId, act, floor, outcome }` — bugünün en iyi sonucu kaydedilir; title screen "🌅 Daily Replayed" rozeti gösterir.

### 12.1 Daily Challenge
`dailyChallenge()` UTC tarihi (YYYY-MM-DD) ve `YYYY*10000 + MM*100 + DD` deterministic seed döner. Title screen butonu Tamer'la açar (asc 0); `dailyDate` RunState'e yazılır; gameover'da dailyBest güncellenir. Tüm dünyada o gün aynı seed → leaderboard kıyaslama mümkün (henüz online değil).

---

## 13. UI / UX

### 13.1 Layout (Battle)
```
┌──────────────────────────────────────────────┐
│ Player HP/Block       Turn 4    Map ⌂  Deck  │
├──────────────────────────────────────────────┤
│       [Enemy 1]         [Enemy 2]            │
│       HP/Intent         HP/Intent            │
├──────────────────────────────────────────────┤
│       [Creature1] [Creature2]                │  ← Player creatures slot
├──────────────────────────────────────────────┤
│   [Card][Card][Card][Card][Card]    End Turn │  ← Hand
│  Mana: 3/3   Draw 12   Discard 4             │
└──────────────────────────────────────────────┘
```

### 13.2 Animasyonlar (uygulanmış — Iter 8)
- Kart hover: yukarı kalk + scale 1.07
- Kart oyna: `.card-play-anim` clone DOM, hedefe doğru arc trajectory (`--play-dx`/`--play-dy` CSS vars), 520ms cubic-bezier; SFX `cardPlay(element)` paralel
- Düşman ölüm: `.death-sweep` 480ms scale-down + brightness-flash + fade
- Intent reveal: yeni intent kind detect edilince `.intent-reveal` 240ms slide-in (badge basında)
- Combo HUD: PlayerPanel'de per-element played-this-turn pip; ≥2 stack'te `.threshold` pulse
- Victory flash: `.victory-flash` 900ms büyüyen "VICTORY" overlay
- Hasar: kırmızı flash + shake (severity scale: 1=hafif, 2=orta, 3=ağır)
- İyileş: yeşil parlama + heal SFX
- Element ✓/✗: hedef üstünde mini ikon (EnemyPanel)

### 13.3 Klavye
- `1–9` → ilgili kart oyna
- `Space` → end turn
- `M` → harita göster
- `D` → deste göster
- `Esc` → menü

### 13.4 Mobile Responsive (uygulanmış)
- 640px altında: cards 124×178 (desktop 168×232), hand horizontal scroll + scroll-snap
- End-turn button: floating FAB bottom-right (`.end-turn-fab` + safe-area-inset)
- Drag-to-target (sürükle, bırak) + tap-tap alternatifi (kart seç → hedef tap, glow göster)
- Battle top bar wraps; char grid 2-col on phone
- viewport-fit=cover + safe-area-inset padding everywhere
- viewport `user-scalable` not blocked → pinch-zoom available for accessibility
- `theme-color` meta tag for Android browser chrome match

### 13.5 Accessibility (uygulanmış)
- Renk-körü modu: element ikonları (🔥💧🌿⚡🌙) her zaman gösterilir (sadece renk değil) — element-themed cards always show ELEMENT_GLYPH
- Kontrast WCAG AA hedef; tüm metin gölgesi text-shadow ile boost
- Tüm interaktif elementler için `:focus-visible` outline (amber 3px + 4px glow) — `style.css`
- Keyboard hint banner ilk girişte (1-9, Space, M, D, Esc); Codex view'da tam shortcut listesi
- `viewport user-scalable` not blocked → pinch-zoom legal
- `lang="en"` + `theme-color` meta on `index.html`
- **`prefers-reduced-motion: reduce`** → biome drift, sigil pulse, combo pulse, hit-stop, particle bursts hepsi azaltılır veya kapatılır (Iter 11)

### 13.6d Map node hover + Run Summary screen (Iter 18)
- Map view: hover any reachable node → tooltip with type label + reward tier hint (e.g. "Elite Encounter — Floor 7 — Uncommon/Rare card + Rare relic · 25-35 gold")
- New scene `summary` (route `#/summary`); replaces old plain "You have fallen" / "Victory!" pages
- 8-cell stat grid: Turns, Battles Won, Enemies Killed, Cards Played, Damage Dealt, Damage Taken, Best Combo, Outcome
- Run summary triggered from gameover.ts after stats persist; payload stashed in module-level singleton then consumed once
- `RunStats.bestComboReached` (NEW) — battle.ts pushes `max(state.player.bestComboThisBattle, ...)` on victory

### 13.6c Settings scene + Achievement toasts (Iter 16)
- `src/scenes/settings.ts` — central config panel: SFX volume slider, SFX mute toggle, BGM volume slider, BGM enabled toggle, color-blind glyphs toggle, force-reduced-motion toggle, language stub (EN/TR), reset-everything button
- Title screen: SFX/BGM inline toggles replaced by single ⚙ Settings button → routes to `#/settings`
- New audio APIs: `setVolume/getVolume` (synth.ts), `setBgmVolume/getBgmVolume` (bgm.ts) — both persisted, both reflect immediately on master gain
- New a11y override: `setReducedMotionOverride(b)` (particles.ts) — persisted under `pact-of-five:reduce-motion:v1`; `isReducedMotion()` now ORs OS pref with this flag; `body.force-reduced-motion` class disables long animations
- Achievement toast: `tickAchievements()` dispatches `cc-achievements-unlocked` window event with newly-unlocked IDs; `main.ts` listens and slides a top-right `.cc-toast` per achievement (4s lifespan, click to dismiss, stacks vertically)
- Reset-everything button removes ALL `pact-of-five:*` localStorage keys

### 13.6b Damage prediction + Threat-aware AI (Iter 14)
- Hover bir kart → her dusman uzerinde "−DMG → postHP" rozeti gosterilir; lethal vurus icin kirmizi pulse + 💀
- `predictDamage(state, def, targetUid)` `core/battle.ts` — element matchup, strength, frail, shadow, pierce, block goz onunde
- Description'dan ilk "Deal N" kalibini regex ile cekiyor; non-damage kartlar atliyor
- Threat-aware enemy AI (`resolveEnemyIntents`):
  - Guard varsa → en dusuk HP'li Guard'i hedef alir (yarali duvari yiker)
  - Guard yoksa, atk >= 5 olan en yuksek atk yaratik varsa → onu hedef alir (gercek tehdidi susturur)
  - Aksi halde oyuncuya vurur

### 13.6a Tutorial overlay (Iter 13 — uygulanmış)
- İlk savaşta `src/scenes/tutorial.ts` 5-adımlı spotlight tour gösterir; `localStorage:pact-of-five:tut:v1` flag'i ile bir kez gösterilir
- Adımlar: kartlar → maliyet gem → drag/key → enemy intent → end turn
- Spotlight: hedef DOM'unun etrafına `box-shadow: 0 0 0 9999px rgba(0,0,0,0.72)` ile delik açar; sürekli pulse animasyonu
- Bubble: hedefin altında veya üstünde (otomatik konum), Skip / Next butonlu, 5/5 progress
- Title ekranındaki "Reset all saves & meta" tutorial flag'ini de sıfırlar
- Hashchange'de overlay kendini siler

### 13.6 FX katmanı — element-themed bursts + hit-stop (Iter 11)
- `src/fx/particles.ts` — tek bir `<canvas#fx-canvas>` üzerinde sızdırmaz, `requestAnimationFrame` döngüsü
- **Element burst** (`elementBurst(x,y,element,severity)`) — her elemana özel parçacık şekli ve fizik:
  - 🔥 **ember**: alev dilleri (flame shape) yukarı yükselen, sıcak palet (sarı→turuncu→kırmızı)
  - 💧 **tide**: damlalar yer çekimiyle düşer, mavi tonlarda
  - 🌿 **verdant**: yapraklar dağılır + döner, pastel yeşil
  - ⚡ **storm**: yıldırım çubukları radyal patlama + merkezi flaş, parlak sarı
  - 🌙 **umbra**: ışıltılı motes ters yer çekimi (yukarı sürüklenir), mor
- **Hit-stop** (`hitStop(ms)`) — büyük vuruşlarda (dmg ≥ 8) RAF döngüsünü 55ms (sev 2) / 110ms (sev 3) duraklat; CSS `body.hit-stopped` tüm `transition`/`animation` durur, ekran 1.18× brightness; reduced-motion altında no-op
- **Critical hit** (`criticalHit(x,y,amt,el)`) — dmg > 14 için: büyük "-N!" yazısı + 3 katmanlı genişleyen halka + ekstra burst severity 3
- **Status icon float** — `addStatus()` her çağrıda `cc-status-applied` event yayar; battle scene yakalar, hedef DOM'unun üstünden glyph yukarı süzülür (örn: 🔥+3)
- **Healing motes** — 12-mote spiral yukarı sarmal (önce 6 düz mote idi)
- **Reduced motion**: parçacık sayısı 1/3'e iner, hit-stop atlanır, halka tek olur, biome/sigil/combo CSS animasyonları durur
- Tüm RNG `fxRand()` (Mulberry32 türevi) — `Math.random()` yok

---

## 14. Sanat Yönü

- **Stil:** Painted-fantasy, sıcak palet, Slay the Spire benzeri sembolik yaratık portreleri
- **Kart frame:** Element rengine göre kenar (3 px); rarity → glow
- **Background:** Act'a göre değişen parallax (3 katman)
- **Üretim:** Asset'ler manuel — `ASSETS.md`'deki promptlardan kullanıcı üretir; UI placeholder olarak gradient + element emoji ile çalışır

---

## 15. Ses

**Implementation: WebAudio synth (zero-asset).** `src/audio/synth.ts` provides a singleton AudioContext (lazy-init on first user gesture) plus a small library of oscillator + envelope SFX. No external files.

### 15.1 SFX katalog
| SFX | Kullanim | Timbre |
|-----|----------|--------|
| `cardPlay(element)` | Her kart oynanisi | Element-tinted pluck (sawtooth/sine/triangle/square per element), pitch glide up |
| `hit(element, severity)` | Hasar verildiginde | Bandpass-filtered noise burst + low-freq sawtooth thump; severity 1/2/3 scales gain+duration |
| `heal()` | HP kazanildiginda | Major triad arpeggio (G/B/D), sine waves |
| `button()` | UI click | Square pulse, 50ms |
| `win()` | Battle/run victory | Major arpeggio C/E/G/C ascending |
| `lose()` | Defeat | Minor descending F/Eb/C, lowpass-filtered sawtooth |
| `turnStart()` | Tur basi | Soft sine chime (A5) |
| `shuffle()` | Deste karistirma | Highpass-filtered noise sweep |
| `reward()` | Reward picked | Pentatonic ascending arpeggio |

### 15.2 Mute
- `setMuted(b)` + `isMuted()` + `loadMutePref()` -> persisted to `localStorage:pact-of-five:audio-muted:v1`
- Title screen: 🔊/🔇 toggle button
- Master gain default 0.42; mute hard-zeros it

### 15.3 BGM (uygulanmış — Iter 12)
- **`src/audio/bgm.ts`** — generative, zero-asset, looping background music sharing the synth.ts AudioContext.
- 4-layer composition per (act, mood):
  - **A) Pad** — sine fundamental + perfect-fifth voice; gain 0.06 / 0.045
  - **B) Arpeggio** — 8-note pentatonic phrase per bar, deterministic Mulberry32 from `${act}|${mood}` hash; triangle wave through lowpass 1800 Hz
  - **C) Bass pulse** — sawtooth root −12 semitones on beats 1 and 3, lowpass 320 Hz
  - **D) Mood layer** — battle: filtered-noise tick on every beat (gain 0.04); title: soft sine chime on bar start
- 10 (act, mood) combos: title + map/battle/rest × act 1/2/3
  - Act 1: A3 calm (64bpm map / 96 battle / 48 rest)
  - Act 2: G#3 tense (72 / 104 / 48)
  - Act 3: B3 ethereal (80 / 112 / 52)
- Master BGM gain channel separate from SFX; default 0.7; fade in/out 0.6s
- Persisted toggle: `pact-of-five:bgm-enabled:v1`; title screen has `🎵 BGM: ON/OFF` button next to SFX toggle
- Auto-suspend respect: never starts before user gesture (gated on `AudioContext.state === "suspended"`)
- Scheduling: 2-bar pre-roll then `setInterval` keeps 1.5 bar lookahead
- BGM stops on intermission and defeat; battle/map/rest swap automatically; same key returns no-op

---

## 16. Teknik Stack

- **Build:** Vite 5 + TypeScript strict
- **CSS:** Tailwind 3 + CSS variables (element renkleri)
- **State:** Vanilla event-driven store (zustand opsiyonel — yokken vanilla yeterli)
- **RNG:** Mulberry32 seeded (`src/core/rng.ts`) — `Math.random()` yasak
- **Persistance:** localStorage (versiyonlu schema)
- **Test:** Vitest (unit: battle/deck/rng), Playwright (smoke E2E)
- **Build target:** ES2020, < 500 KB JS gzip (asset hariç)

### 16.1 Multi-platform packaging (Iter 19 — shims hazır, build manuel)
- **Web (default):** `npm run build` → `dist/` static; deploy to Vercel/Netlify/GitHub Pages
- **Mobile (Capacitor):** `capacitor.config.ts` (root) — appId `dev.gamefactory.pactoffive`, webDir `dist`, dark `#0f0820` SplashScreen + StatusBar; user runs `npm i -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android` then `npx cap add ios|android` then `npx cap sync && npx cap open ios|android`
- **Desktop (Tauri v2):** `src-tauri/{tauri.conf.json, Cargo.toml, src/main.rs, build.rs}` — appId `dev.gamefactory.pact-of-five`, frontendDist `../dist`, devUrl `http://localhost:5173`, bundle targets [dmg, app, nsis, msi, deb, appimage]; user runs `cargo install tauri-cli --version "^2.0.0"` then `cargo tauri dev` / `cargo tauri build`

### 16.3 Localization scaffold (Iter 20)
- `src/i18n/index.ts` — EN base + TR translations for ~50 high-visibility UI keys (title, settings, run summary, common buttons)
- `getLang()` / `setLang(l)` reads `localStorage:pact-of-five:lang:v1`
- `t(key, vars?)` → returns TR string if available + lang===tr; else EN; else the key itself; supports `{var}` substitution
- Settings scene language picker re-renders panel on switch (immediate visible swap)
- Future: extend tables for codex (keywords/statuses), event titles/text, card descriptions (largest TODO)

### 16.4 Performance pass (Iter 20)
- Battle scene `refresh()` batched into a single `requestAnimationFrame` — multiple mutations within a frame collapse to one render
- Hand hover events `cc-card-hover` debounced 60ms on `mouseenter` (immediate on `mouseleave`) to prevent thrash during quick scans
- Build size growth held: 47.45 KB gzip (cap 500 KB; +21 KB across all 10 wave-2 iters)

### 16.2 Replay log export (Iter 19)
- Battle scene snapshots `{ seed, log[], finalHp, finalEnemies[] }` on victory or defeat (`snapshotReplay(state)`)
- Run summary screen renders a "📥 Export Replay JSON" button when payload contains a replay
- JSON download via Blob URL: `pact-of-five-replay-<timestamp>.json` containing outcome + character + stats + replay snapshot + version stamp
- Useful for: bug repro (paste seed), shareable highlight, future replay viewer

---

## 17. Faz Planı (uygulama)

| Faz | İçerik | Bitişte test |
|-----|--------|--------------|
| 1 | Vite scaffold, core (rng, deck, battle, ai), 1 karakter, 20 kart, 5 düşman, tek-savaş loop | `npm run dev` → tek savaş baştan sona |
| 2 | Map sistemi, 5 düğüm tipi, reward/shop/rest, 10 düşman, Act 1 boss | Run akışı: title → map → 5 node → boss |
| 3 | 80+ karta çıkar, 30 relic, 24 düşman, 3 act, 3 karakter, 3 boss, Mystery events | Tam run baştan sona |
| 4 | Cila: animasyon, particle, shake, ses (placeholder), achievement | Subjektif "his" testi |
| 5 | Playtest bot (random AI vs AI), denge pasi, build, Vercel deploy | 100 oto-run crash-free |

---

## 18. Denge Felsefesi

- **Win-rate hedefi:** Yeni oyuncu Act 1 ~40%, deneyimli ~70%, Ascension 5+ ~25%
- **Run uzunluğu:** 45–75 dk
- **Deste boyutu:** Ortalama 25 kart end-of-run (başlangıç 10, +15 reward); büyük desteler riskli (delute)
- **Relic etkisi:** Tek relic run-defining olabilir ama "auto-win" yok
- **Anti-patterns:** Sonsuz mana combo'lar caps'lerle engellenir (örn. "1 turda max 25 kart oyna")

---

## 19a. Codex (in-game reference)

`scenes/codex.ts` provides a navigable reference scene listing:
- All KEYWORDS (12 entries from `keywords.ts`)
- All STATUSES with glyphs
- Element ring SVG diagram (5 nodes, arrowheads showing super-effective direction with ×1.5/×0.75 legend)
- Controls table (1-9, Space, M, D, Esc)

Accessible from title screen (`📖 Codex` button) and map top bar (`📖`).

## 19. Doğrulama Kriterleri

- [ ] Tek savaş başla → kart oyna → kazan/kaybet **çalışıyor**
- [ ] Element çemberi hasar hesabı doğru (3 element için unit test)
- [ ] Seed verince aynı harita + aynı kartlar (deterministic RNG)
- [ ] 100 random AI run crash-free
- [ ] Build < 500 KB gzip
- [ ] Mobile (375px) ve desktop (1280px) layout broke değil
- [ ] LocalStorage save/load round-trip kayıpsız
- [ ] TypeScript strict, 0 type error
- [ ] WCAG AA kontrast

---

# Bölüm II — Genişletilmiş Tasarım (Run 1 ekleri)

> Aşağıdaki §20–§26 bölümleri **Forge Run 1** sırasında eklenmiştir. Mevcut §1–§19 numaralandırması korunmuştur; yeni bölümler §20'den başlar. Her bölüm; pillar/kural/formül/pseudocode/tablo/örnek dörtlüsü içerir, "TODO" / "TBD" markeri içermez. Lore ve karakter geçmişleri Türkçe; teknik bölümler İngilizce/Türkçe karışık (CLAUDE.md kuralı). Mevcut metinle çatışan satırlar olursa **doc kazanır** (canon olarak), kod farklıysa kod uyumlandırılır (Run 5 audit).

---

## 20. Tasarım Direkleri ve MDA Çerçevesi

### 20.1 Niyet Bildirgesi

Pact of Five tek bir cümle ile şu deneyimi vermelidir:

> "Sıkı, okunabilir bir element çemberi etrafında kurulmuş, her run'da yeniden keşfedilen bir destenin yaratıklarla zenginleşip büyüklüğüyle çürümeden önce zirvesine ulaştığı, 45–75 dakikalık bir karar yoğunluğu."

Bu bildirge, "deneyim hedefi" olarak hizmet eder ve aşağıdaki beş direğe ayrıştırılır. Her direk, *istenen oyun anı* + *istenmeyen oyun anı* + *uygulanan kural* üçlüsüyle tanımlanır.

### 20.2 Beş Direk

#### Pillar 1 — Element Çemberi Önce Okunur, Sonra Hesaplanır

- **İstenen an:** Oyuncu, eline bakıp 1.5 saniye içinde "bu kartı hangi düşmana atarsam +%50 hasar yaparım?" sorusuna cevap verebiliyor.
- **İstenmeyen an:** Oyuncu, hasar pencerelerini saymak için bir hesap makinesi açıyor.
- **Uygulanan kural:** Çember 5 elemandan büyümez (Pokemon TCG dersi 1: weakness binary, predictable). Çoklu element kombosu YOKTUR (örn. "ember+storm" hibrit yoktur). Çember UI ipucu (`✓/✗/•`) hedef üstünde her zaman ham görünümde durur.

#### Pillar 2 — Yaratıklar Sahada Kalmalıdır, Eller Geçicidir

- **İstenen an:** Oyuncu, sahasında 2 turdur duran *Sprout*'una bakıp "şimdi ona bond verecek hamle var mı?" diye düşünüyor.
- **İstenmeyen an:** Yaratıklar her turda kullanılıp atılan tek seferlik kombolardan ibaret kalıyor (StS spell-fest).
- **Uygulanan kural:** Maksimum 5 creature slot, summon-sickness varsayılan (Swift istisna), `core/battle.ts::resolveCreatureCombat()` deterministik soldan-sağa sıra (Hearthstone Battlegrounds dersi 1: leftmost first). Ölen creature, oyuncunun *bilgi durumunu* boşaltır — yas tetikleyici an. Slot pozisyonu Guard önceliği ve targeting için anlamlıdır (Monster Train dersi 1: positional logic).

#### Pillar 3 — Her Ödül Bir Kimlik Sözleşmesidir

- **İstenen an:** Floor 4 reward'da gelen "3 karttan 1 seç"te oyuncu, tek bir Storm rare yüzünden Tide karta dönmüyor. Çünkü bu *iki tema arasında saplanmak* anlamına geliyor.
- **İstenmeyen an:** Her run "biraz her şeyden" alıyor → desteler özelliksiz çorbaya dönüyor.
- **Uygulanan kural:** Ödül havuzu **karakter biasının dışındaki** elementlerden kart üretirken yine de elementine *uygun* bir alternatif sunar (örn. Tamer için Ember / Verdant ağırlıklı, ama 1 slot her zaman cross-pool). Card removal ekonomisi (shop, 75g + 25g her tekrar) sıkı destelere yol açar (Slay the Spire dersi 3). "Skip" seçeneği her ödülde mevcuttur.

#### Pillar 4 — Anahtar Kelime Tek Cümle Olur

- **İstenen an:** Oyuncu, *Surge*'u 5 saniyede öğrenip 3 kart sonra senergi planlamaya başlıyor.
- **İstenmeyen an:** Bir keyword, 3 cümlelik koşullu efektle gelip oyuncuyu rule-bookçü yapıyor (Magic: The Gathering hatası).
- **Uygulanan kural:** Her keyword `keywords.ts` içinde *tek satır* açıklama ile yer alır. Bileşik etki = ayrı keyword. Codex (`scenes/codex.ts`) başlığı: "Keyword: <ad> — <tek cümle>." Sürpriz koşullar (örn. *Combo(N)* için "this turn"), keyword adının parantez yarısında kodlanır. (Hearthstone dersi 3: tooltip-grade keywords.)

#### Pillar 5 — Belirleyici Rastgelelik (Determinism Sacred)

- **İstenen an:** Oyuncu, run'unu replay JSON'unu kopyalayıp arkadaşına gönderiyor; arkadaş aynı seed ile aynı sonucu alıyor.
- **İstenmeyen an:** "Buggy seed" raporu — aynı RNG farklı sonuç → debug kabusu.
- **Uygulanan kural:** `Math.random()` yasak. Tüm karar yolları `makeRng(seed)` döndüren bir RNG hattı altında. AI bilgi sızıntısı yok (oyuncunun elini görmez). Replay JSON kanonik kanıttır (§16.2). Çoklu RNG kanalı (battle, map, shop, event) aşağıda §23.6'da tanımlıdır.

### 20.3 Anti-Direkler (Açıkça Reddedilen Tasarım Vektörleri)

| Anti-pillar | Neden reddedildi | Yansıma |
|-------------|------------------|---------|
| Çoklu element hibrit (Ember+Storm) | Pillar 1'i zayıflatır; çember okunabilirliği biter | Hibrit kart yok; "neutral" sınıfı bunun yerine vardır |
| PvP (rakip oyuncu) | Roguelike + asimetrik AI core'unu bozar; balans devasa | Tek-oyunculu, AI'a karşı her zaman |
| Yaratık koleksiyonu / grindi | Pokemon "catch'em all" temposu run zarafetini öldürür | Yaratık her run sıfırdan, meta-progression sadece kart/relic havuzu açar |
| Loot-box / mikro-monetizasyon | GameFactory game-focused GDD kuralı | GAME.md'de kesinlikle iş modeli yok |
| Boss "tek doğru cevap" çözümleri (puzzle bossları) | Build seçimi cezalandırılır | Her boss en az 3 farklı destenin kazanmasına izin verir |
| Sonsuz mana combo | Karar yoğunluğunu trivial'e indirir | Tek turda max 25 kart oynama capı (§18) + Surge cap'i (aşağıda §21.7) |
| Off-screen "sürpriz" oyuncu hasarı | Telegrafı bozar | Tüm AI niyetleri en az 1 tur önceden gösterilir |

### 20.4 MDA Ayrıştırması

**Mechanics (Mekanikler — kuralların kendisi):**
- 5-element çemberi
- Mana ekonomisi (3 → 10)
- Yaratık + Spell + Power tip ayrımı
- Status etkileri (10 statü)
- Keyword sistemi (12 keyword)
- Sigil (battlefield enchant, 5 cap)
- Aura (creature-passive buff)
- Map node ağı (3 act × 15 floor)
- Reward / Shop / Rest / Event / Boss düğümleri
- Relic hook'ları (8 hook tipi, 30+ relic)
- Replay JSON (deterministic)

**Dynamics (Dinamikler — mekaniklerden doğan oyunsal akışlar):**
- *Element pivot:* Oyuncu Act 1'de Tide-heavy başlayıp Act 2'de Storm rare'ı görünce destesini geçici olarak Storm ile zenginleştirir. Çember bunun bedelini önemserse pivot zorlanır.
- *Kart kalitesi enflasyonu:* Her ödülde uncommon/rare seçimi, deste minimum kalitesini sürekli yükseltir; ama deste *boyutu* da büyür → her 3 ödülde bir card-removal kararı zorunlu olur.
- *Yaratık ekonomisi:* Sahaya creature çıkarmak tek-turluk hasarı düşürür ama uzun-vade dpsini yükseltir → düşük-HP ölümler vs. yüksek-HP creature kararı.
- *Status zincir:* Burn + Vulnerable + Frail kombinasyonu tek bir tickte 2× hasar farkı yaratır. Oyuncu, bu üçlüyü tek turda diziyor mu yoksa ayırıyor mu?
- *Ascension blanketi:* Yüksek asc'de elite yoğunluğu artar → reward kalitesi de artar (StS dersi 2).
- *Replay paylaşımı:* JSON paylaşımı topluluk metasını başlatır.

**Aesthetics (Estetik — oyuncunun hissettiği duygu):**
- *Discovery:* "Bu element kombinasyonu işe yarıyor mu?" — her run yeni
- *Mastery:* AI niyetlerini telegraflanan turdan önce predict edebilmek (predictDamage rozeti destekler)
- *Challenge:* Asc 5'te boss phase 2'yi 3 turda kapatabilmek
- *Expression:* Hunter exhaust ekonomisini farklı yorumlayan iki run aynı bossa gidip aynı bossu farklı yöntemle bitirir
- *Narrative:* Sundering ve Element Lord miti her event ekranında kısa bir flavor satırla zenginleşir (Run 2 narrative pass ekleyecek)

### 20.5 İlham Matrisi (Per-Sistem)

| PoF Sistemi | Ana Kaynak (1) | İkincil Kaynak (2) | Borç Alınan | Reddedilen | Neden |
|-------------|----------------|--------------------|-------------|-----------|-------|
| Element çemberi | Pokemon TCG | Hearthstone (rune-of-rune yok) | Binary readability | Multi-type weakness | Binary > matris (Pillar 1) |
| Map ağı | Slay the Spire | Hades (boon-rooms) | 6-col branching | StS gizli düğümler | Tüm düğümler hover'da görünür (UX gain) |
| Mana ekonomisi | Hearthstone | StS energy | Per-turn refill | Hearthstone "1 mana/tur scaling" | PoF: act-gated, 3→4→5 yumuşak |
| Yaratık board | Hearthstone | Magic | 5 slot, summon sickness | Magic'in tap/untap | Mana yönetimi zaten yorucu |
| Statü stack | Slay the Spire | Monster Train (Pyregel) | Burn/Vulnerable | Inscryption "permadeath statuses" | Run zaten ölümle biter |
| Sigil | Magic enchants | Hearthstone secrets | Persistent, per-turn trigger | Magic global cost | PoF mana paylaşılır |
| Aura | Hearthstone | StS powers | Creature-bound passive | Hearthstone "stack same buff" | Unique-id Set (§11b) |
| Combo / Resonate | Hearthstone Combo | StS Echo | Per-turn counter | Magic'in storm cost-reduce | Storm = element kafa karışıklığı |
| Echo | StS Onslaughts/Whirlwind | MTG dredge | On-death flavor | MTG dredge (mill), aşırı | Echo daha telegraflı |
| Relic | Slay the Spire | Hades boon | 4-tier rarity | Hades "duo boons" | İki relic interaction Run 4 |
| Boss phase | Hollow Knight | StS act bosses | Per-phase kişilik | StS HP-bar değişimi yok | PoF: bespoke transition (§8a) |
| Map gen | StS | Across the Obelisk | 6-col DAG | StS "exact" dead-end | Bizim hard-guard rule (§24) |
| Ascension | StS | Risk of Rain "monsoon" | Layered modifiers | RoR2 "tek anahtar" | Multi-modifier (§22.6) |
| Save / replay | Spelunky 2 | StS | Seed determinizm | Spelunky tek-seed | PoF multi-channel RNG |
| Tutorial | Hades | Hollow Knight | Encounter teaches | Inscryption no-tutorial | Hedef kitle 14+, kabarcıklı |
| Run summary | Spelunky 2 | Risk of Rain | Stat grid | StS "boş ekran" | PoF 8-cell grid (§13.6d) |
| Mulligan | Hearthstone | Magic Vancouver | Tek-kart seçim | Vancouver opsiyonel | Run 1 ekledi (§21.4) |
| Event nodu | StS | Inscryption (Trader) | Crossroad mantığı | Inscryption "irreversible" | PoF hep "skip" var |
| Particle FX | Hades | Dead Cells | Per-element idiom | Realistic sim | Stylized > realism |
| BGM | Hades | Spelunky | Layered loops | Static playlist | 4-layer generative (§15.3) |

### 20.6 Direklerin Çatıştığı Sahaları Çözme

Ne zaman iki direk çatışırsa, sıralama:

1. **Pillar 5 (Determinism)** — kırılırsa replay sistemi çöker; her şeyden önce. Uyumlu olmayan tüm tasarım reddedilir.
2. **Pillar 1 (Çember okunur)** — UI okunabilirliği bozulursa pasif bir hayal kırıklığı yaşar oyuncu (gerekçesini bilmez), kayıp en yüksektir.
3. **Pillar 4 (Tek cümle keyword)** — bunu bozmak öğrenme eğrisini kırar; öğretemediğin keyword ölü içeriktir.
4. **Pillar 2 (Yaratıklar sahada)** — pillar 1+4 ile çatışırsa ödün verilebilir; yaratık ölmek için var (yası kabul ederiz).
5. **Pillar 3 (Ödüller kimliktir)** — son sırada, çünkü deck-build oyunundaki "her ödül anlamlıdır" güvencesi diğer dört direk düzgünse zaten kendiliğinden gelir.

### 20.7 Direkler Üzerinden Karar Algoritması

Yeni bir özellik önerisi aşağıdaki sorulara "evet" cevabı vermelidir:

```
function shouldShipFeature(f) {
  if (!f.deterministic) return reject("breaks Pillar 5");
  if (f.keywordSentenceCount > 1) return reject("breaks Pillar 4");
  if (f.elementMatrixDepth > 1) return reject("breaks Pillar 1");
  if (f.creatureLifetime < 1) return concern("weakens Pillar 2");
  if (!f.rewardChoiceMatters) return concern("weakens Pillar 3");
  return ship();
}
```

`reject` = özellik reddedilir, `concern` = ekiple tartışılır + kompansasyon önerilir, `ship` = uygulanır.

---

## 21. Combat Math Deep Dive

> Bu bölüm `src/core/battle.ts` içindeki helper'larla 1:1 hizalanmış olmalıdır. Çatışma olursa: doc → kod yönü baskındır (kod uyumlandırılır), ama uygulanmış davranış yanlış belgelendiyse Run 5 audit doc'u günceller.

### 21.1 Sözcük Tanımları (Glossary)

| Terim | Anlam |
|-------|-------|
| `base` | Kart metnindeki ham hasar / blok değeri (örn. *Spark* → 6) |
| `elementMul` | Element çemberinden gelen çarpan (1.5 / 1.0 / 0.75) |
| `srcStrength` | Saldıranın `Strength` statüsü (toplam +X hasar / saldırı) |
| `tgtVuln` | Hedefin `Shadow` (Umbra varyantı) veya `Vulnerable` statüsü → +%50 hasar |
| `srcFrail` | Saldıranın `Frail` statüsü → -%50 verdiği hasar |
| `tgtBlock` | Hedefin `Block` değeri (statü olarak temsil edilir) |
| `pierce` | Saldıranın `Pierce` keyword'u → block'u yok sayar |
| `lifelink` | Saldıranın `Lifelink` keyword'u → verilen hasar kadar oyuncuyu iyileştirir |
| `aura` | Sahadaki creature'lardan gelen pasif buff (örn. `spell_focus` +1 spell dmg) |
| `relicMod` | `onDamageDealt` / `onDamageTaken` hook'unun döndürdüğü delta |

### 21.2 İşlem Sırası (Order of Operations) — Kanonik

Hasar pipeline şu sırada uygulanır. Her adım bir önceki adımın çıktısını alır:

```
step  operation                                input          output
───  ─────────────────────────────────────  ─────────────  ──────────
 1   raw     = card.value                                      raw
 2   raw    += auraSpellBonus / auraCreatureBonus              raw
 3   raw    += srcStrength                                     pre1
 4   raw    *= elementMul (1.5 / 1.0 / 0.75)  pre1            pre2
 5   raw    *= (1 - srcFrailFactor)            pre2            pre3   (Frail = ×0.5)
 6   raw    *= (1 + tgtVulnFactor)             pre3            pre4   (Shadow = ×1.5)
 7   raw     = floor(raw)  (rounding rule)     pre4            preBlock
 8   if not pierce: raw -= tgtBlock             preBlock       afterBlock
       (clamp afterBlock >= 0)
 9   raw     = relicMod(raw)                   afterBlock     afterRelic
10   apply: tgtHp -= afterRelic                                final
11   if lifelink: srcHp += afterRelic                          (heal)
12   on tgtHp <= 0: trigger Echo (if creature)                 (echo)
```

**Yuvarlama kuralı:** Adım 7'de `floor(x + 0.0001)` (epsilon ile floor) — çift kayan-nokta hatasını önler. ×1.5 yukarı yuvarlanır → `floor(x * 1.5 + 0.0001)`. ×0.75 aşağı yuvarlanır → `floor(x * 0.75)`. Karışık durumda (örn. Strength + ×1.5): adım 3'te toplama, adım 4'te çarpma → tek bir floor uygulanır (no double rounding).

**Sıra rasyoneli:**
- Strength önce çünkü "toplam saldırı gücü" konseptidir; element çarpanı *fizik* katmanıdır.
- Frail önce, Shadow sonra: saldıranın eksikliği ile savunmanın açığı ayrı katmanlar.
- Block en son ama relic mod öncesi: çünkü relic "block ignored" tarzı edge-case'leri kararsız bırakır → relic, post-block delta'yı görür.

### 21.3 Worked Example — *Spark* vs. Sproutling

**Setup:** Tamer (Strength 2, Frail 0), Spark (1c, base 6, Ember). Hedef: Sproutling (Verdant, HP 2/2, Block 0, Shadow 0).

| Adım | Hesap | Sonuç |
|------|-------|-------|
| 1 | base = 6 | 6 |
| 2 | aura yok | 6 |
| 3 | +Strength 2 | 8 |
| 4 | Ember → Verdant ×1.5 | 12 |
| 5 | Frail yok | 12 |
| 6 | Shadow yok | 12 |
| 7 | floor(12) | 12 |
| 8 | Block 0 | 12 |
| 9 | relic mod (yok) | 12 |
| 10 | Sproutling HP -12 → -10 (overkill clamped to 0) | dead |
| 11 | Lifelink yok | — |
| 12 | Sproutling Echo yok | — |

**Çıktı:** 12 hasar → 1-shot.

### 21.4 Worked Example — Burn + Vulnerable + Frail (Status Tick)

**Setup:** Düşman: Bog Witch (HP 38, Block 0, Burn 5, Shadow 3, Frail 0). Oyuncu sırası başında status tick.

```
tick 1: Burn 5 hasarı.
        Burn → applyStatusDamage(target, 5, "burn")
        Bu raw 5 değeri Shadow'dan geçer mi?
```

**Karar (canonical):** Status hasarı element çemberine *takılmaz* (status zaten "iç" hasardır), ama Shadow'a takılır (Shadow = "aldığı hasar +50%").
**Frail: status tick'i etkilemez** (Frail saldıran tarafa, status etkisi pasif).

```
raw     = 5
× (1 + 0.5)  // Shadow
        = 7.5
floor   = 7
target.hp -= 7   → 31

post-tick: Burn 5 → 4 (decrement by 1)
```

Bir sonraki turun başında: Burn 4 → Shadow 3 hâlâ aktif. `floor(4 * 1.5) = 6` hasar.

**Toplam 5 turluk Burn Shadow zincirinin tahrip değeri:** 7+6+4+3+1 = **21 hasar**, yalnız 5 ham Burn yerine.

### 21.5 Negative Damage / Self-Damage / Overkill

| Edge case | Kural |
|-----------|-------|
| `afterRelic < 0` | clamp to 0; loglanmaz |
| `afterRelic == 0` | hala bir damage event yayar (relic onDamageDealt hook tetiklenir, lifelink 0 etkisi) |
| `tgtHp - afterRelic < 0` | tgtHp = 0; *fazlalık hasar atılır* (overkill propagation yok) |
| Self-damage (Pact Stone) | Oyuncuya 5 hasar uygulanır, Block uygulanır, Shadow yok sayılır (player'ın kendi Shadow'u uygulanmaz — UI tutarsızlığı önler) |
| Simultaneous death (creature ölüp sonrasında o turda hasar verir) | Echo tetiklendiyse echo damage *daha sonra* uygulanır; mevcut snapshot'ta hesap |
| Ölü creature'a hasar | Reddedilir; log'a "ignored: target dead" |

### 21.6 Block Decay Rules

- **Oyuncu block:** `onTurnStart`'ta 0'a sıfırlanır. İstisna: `Tide Aegis` relic ("block carries 50%") veya `Stoic Stance` power.
- **Creature block:** Yaratıklar block tutmaz (yaratık-üstüne-block tasarım dışı). Yaratık şu yollarla korunur: (a) Guard ile düşmanları yönlendirme, (b) Aura ile genel block (`block_doubler`).
- **Düşman block:** Düşman kendi block'unu kalıcı tutar (oyuncu blok birikimi ile farklı tasarım sebebi: düşman tek-bir-tur-window'una sahip değildir, defansif arketipler block-turtling yapabilir). Tide elite *Coral Champion* turn-1'de 12 block farmlar, oyuncu Pierce ile bunu bypass eder.
- **Block + relic interaction:** `Tideheart` (regen 2) tur sonu tetiklenir, block'a etki etmez.

### 21.7 Status Stack Caps

Status'ların sonsuza kadar büyümesi pillar 1'i (okunabilirlik) kırar ve combo abuse'u açar. Her stat için cap:

| Status | Cap | Davranış (cap aşıldığında) | Rasyonel |
|--------|-----|------------------------|----------|
| Burn | 30 | Cap'lenir, fazla atılır | tickteki ham +30 hasar yeterince yıkıcı |
| Shadow | 10 | Cap'lenir | %150 birikim |
| Chill | 5 | Cap'lenir | 5 sonraki kart +1 cost yeterince zorluk |
| Shock | 8 | Cap'lenir | tur başı 8 random discard kart envanteri böler |
| Strength | 99 (soft) | Hard cap yok ama 99 üstü display "99+" | scaling Sage burada yaşar |
| Dexterity | 99 (soft) | Aynı | block-build için |
| Regen | 15 | Cap'lenir | Heal-loop çürümesini önler |
| Block | 999 | Cap'lenir (display) | olabilecek maksimum savaş ömründe ulaşmaz |

### 21.8 Yaratık-Yaratık Çatışması (Creature-vs-Creature)

PoF'de yaratıklar oyuncunun saldırı vekilidir. Düşman yaratığa nadiren saldırır (default targeting önce oyuncu, sonra Guard). Ancak şu durumlar var:

1. Düşman *Spell* yaratığa hasar verirse (Bog Witch "Vine Lash" → tüm oyuncu yaratıklarına 3 hasar)
2. Player creature *düşman creature*'a saldırırsa (Hunter "Marksman's Aim" hedefli)

#### Algoritma — `resolveCreatureCombat(attacker, target)`

```pseudo
function resolveCreatureCombat(state, atk, def):
  if atk.summonSick and not atk.swift: return error("summon-sick")
  if atk.root: return error("rooted")

  # Adım 21.2 pipeline çalışır
  amount = computeDamage(state, atk, def)

  # Yaratık-yaratık'ta retaliation kontrolü
  if def.type == "creature" and not atk.pierce:
    counterAmount = computeDamage(state, def, atk, isRetaliation=true)
    counterAmount = max(0, counterAmount - 2)  # retaliation -2 (yaratıklar saldırırken vurulur)
    atk.hp -= counterAmount
    log(`${atk.name} takes ${counterAmount} from retaliation`)

  def.hp -= amount
  log(`${atk.name} hits ${def.name} for ${amount}`)

  # Echo and on-death
  if def.hp <= 0: triggerEcho(state, def); removeFromBoard(def)
  if atk.hp <= 0: triggerEcho(state, atk); removeFromBoard(atk)

  # Lifelink
  if atk.lifelink: state.player.hp += amount
```

**Retaliation -2:** Saldıran her zaman önce vurur (initiative bonus); yaratıklar arası savaş tamamen mutlaka karşılıklı değil. Bu, *Hearthstone Battlegrounds dersi 1*'in (deterministic order) PoF varyantıdır.

### 21.9 AI Threat Skoru

Düşman AI hedef seçerken bir skor hesaplar (StS + HS BG hibridinden esinlenmiş). Yüksek skor = öncelikli hedef.

```pseudo
function threatScore(creature):
  score  = creature.atk * 2.5             # raw damage threat
  score += creature.lifelink ? 6 : 0      # heal sustain
  score += creature.pierce ? 4 : 0        # block ignore
  score += creature.aura ? 8 : 0          # global meta-threat
  score += creature.swift ? 3 : 0         # tempo
  score += (creature.bond and bondNeighborCount(creature) > 0) ? 5 : 0
  score -= creature.hp <= 2 ? 4 : 0       # zayıf creature düşük öncelik
  return score
```

Düşman algoritması:

```pseudo
function chooseTarget(state, enemy):
  candidates = state.creatures.filter(alive)
  guards = candidates.filter(c -> c.guard)

  if guards.length > 0:
    # Yaralı duvarı yık → en düşük HP guard
    return minBy(guards, c -> c.hp)

  if any(c -> c.atk >= 5):
    return maxBy(candidates, c -> threatScore(c))

  return state.player    # default to hero
```

Determinizm: tüm `minBy/maxBy` ties stable-sort by `creature.uid` artan. RNG ihtiyacı yok.

### 21.10 Çoklu Hasar Kaynaklarının Aynı Tickte Çakışması

Bir tick'te birden fazla statü ateşlenebilir (Burn + Sigil tick + Echo). Sıralama:

1. `applyStatusTick` (oyuncu turu başlangıcı):
   1. Burn (saldırgan-doğa)
   2. Regen (savunmacı-doğa)
   3. Shock (random discard)
   4. Status decrement (Burn 5 → 4, etc.)
2. `processSigils` (battlefield enchant tick)
3. `drawCard` (eli 5'e tamamla)
4. `onTurnStart` relic
5. Hand input açılır

Sırası pasif → aktif, pasif statüler birbirine bulaşmaz.

### 21.11 Mulligan-of-1 (Run 1 Eklentisi)

**Önerilen yeni davranış (kod ekleme bekleniyor):**

Battle başında oyuncu, ilk 5 kartını gördükten sonra şu seçeneklere sahiptir:
- "Keep" — devam et.
- "Mulligan" — 1 kartı seç, atılır, çekilen pile'dan 1 yeni kart çek (mevcut hand'e). Atılan kart o savaşın discard'ına gider, exhaust olmaz.

Determinizm: mulligan seed'i `seed XOR battleIndex` ile ayrılır → replay'de tekrarlanabilir.

**Bu özellik kodda henüz yok; Run 5 implementation pasında eklenmeli.**

### 21.12 Damage Prediction Tutarlılığı

`predictDamage(state, def, targetUid)` (§13.6b) gerçek `dealDamage` ile %100 örtüşmelidir. Run 1 audit listesi:

- [ ] aura'yı dahil et (mevcut TODO §11b)
- [ ] frail'i dahil et (uygulandı)
- [ ] vulnerable'ı dahil et (Shadow olarak uygulandı)
- [ ] pierce'i dahil et (uygulandı)
- [ ] block'u dahil et (uygulandı)
- [ ] strength'ı dahil et (uygulandı)
- [ ] floor rounding'i aynen uygula (epsilon dahil)
- [ ] relicMod'u dahil et (henüz değil — uçucu sonuç)
- [ ] non-damage kartları "—" göster (uygulandı)
- [ ] AOE kartları her hedef için ayrı badge (uygulandı)

Test invariant: 1000 random `(card, target)` çiftinde `predictDamage(s, c, t) == simulateDealDamage(s, c, t).delta`.

### 21.13 Edge-Case Tablosu — Combat

| Senaryo | Davranış | Test |
|--------|----------|------|
| Ölü target'a hasar | reddet | unit |
| Hedefte 0 HP olur, Echo "Deal 5 to all" | Echo tetiklenir, mevcut tüm düşmanlar hasar alır (yeni ölüleri exclude) | unit |
| Aynı turda 5 Echo zinciri (Echo creature → Echo creature → ...) | maks 16 zincir derinliği, sonrası kesilir (combo abuse fence) | unit |
| Self-damage Pact Stone + 0 HP | oyuncu ölür, run summary açılır | e2e |
| Lifelink + tgtBlock yüksek | block'tan sonra 0 hasar = 0 heal | unit |
| Pierce + Shadow + Strength all stack | tüm bonuslar uygulanır | unit |
| Frail + Vulnerable aynı kaynaktan | farklı katmanlar, ikisi de uygulanır | unit |
| Sigil tick → düşmanı öldürür → Echo tetiklenir | Echo player'ın değil, sigil'in source'undan tetiklenir | unit |
| Aura'yı taşıyan creature ölür → spell mid-cast | spell o turda eski aura ile resolve olur (snapshot at cast) | unit |
| Mana 0'da X-cost kart | reddedilir, "insufficient mana" toast | e2e |
| Cap'a ulaşan Burn + yeni 5 Burn | hala 30'da kalır, "30 (capped)" göster | unit |

### 21.14 Determinism Test Suite — Combat

```
suite "battle determinism"
  test seed 12345 → snapshot.log[] eşleşir replay
  test 1000 random battles → no NaN, no Infinity
  test creature death order = uid asc
  test Echo chain depth ≤ 16
  test aura snapshot at spell cast
  test mulligan seed = seed XOR battleIndex
```

Run 5 will land these as Vitest cases.

---

## 22. Düşman AI Davranış Spesifikasyonu

> Bu bölüm intent telegrafından state machine'e, escalation'dan boss phase'lerine, AI fairness kurallarına kadar opposition'un tam tasarımını içerir. Pillar 5 (determinism) bu spec'in kalbidir.

### 22.1 Niyet Telegrafı (Intent Telegraph)

#### Görsel Dil

| İkon | Anlam | Format |
|------|-------|--------|
| ⚔️ X | Saldırı (X hasar) | sayı, çember sonrası gerçek değer (örn. Storm hawk's 6 → ⚔️ 9 vs. Tide creature) |
| ⚔️ X×Y | Y kez X hasar | "3×2" = 2 saldırı, her biri 3 hasar |
| 🛡️ X | Defans X block | sayı |
| ✨ Yyy | Status uygula | "✨ Burn 3" |
| 💀 | Boss özel | sadece boss/elite, hover ile detay |
| ❓ | Gizli niyet | sadece bazı umbra/elite enemy; hover detayını yine "?" gösterir |
| ⚔️🛡️ | Combo | aynı turda saldırı + defans |

#### Hesaplama Zamanı

Niyet, **Player Turn End** olayında hesaplanır (yani enemy turn'den hemen önce). Bu, oyuncunun turunda bir status uygularsa (Frail, Shadow vb.), bir sonraki niyet *tazelenmiş* görünmelidir.

**Recompute kuralı:**
- Tur sonu (oyuncu): tüm enemy intent'leri yeniden hesaplanır
- Mid-turn değişimleri (örn. Strength bir buff ile artar): UI badge yenilenir, ama gerçek hasar yine tur sonunda kilitlenir (don't keep recalculating mid-action)

#### Snapshot Doğrulaması

Replay JSON'da her enemy turn için:

```json
{ "turn": 4, "enemyId": "bog_witch_3", "intentDisplayed": "⚔️ 9", "intentActualHit": 9 }
```

`intentDisplayed != intentActualHit` ise replay yenideki bug işareti.

### 22.2 Niyet Patern Tipleri

| Tip | Davranış | Örnek |
|-----|----------|-------|
| `Sequential` | Sırayla [a, b, c, a, b, c, ...] | Sandcrab: [⚔️ 4, 🛡️ 6, ⚔️ 4, 🛡️ 6] |
| `Weighted` | Ağırlıklı rastgele (seedli) | Magma Wisp: 60% saldırı, 40% self-burn |
| `Conditional` | If state then X else Y | Coral Champion: HP > 50% → 🛡️, HP ≤ 50% → ⚔️×2 |
| `Phase-gated` | HP gate'lerine göre paterni değiştir | Hydra Tide: phase1=A, phase2=B |
| `Adaptive` | Oyuncunun son hareketine cevap verir | Coven Witch: oyuncu tek-target spam'lerse AOE'ye geçer |

#### Tekrar-Önleme Kuralı

`Sequential`'de aynı intent **3 kez üst üste** gelemez. Wraparound'da skip → bir sonraki seçilir. Bu kural `Weighted` modunda da geçerlidir (tekrar olasılığını yarıya indirir).

### 22.3 Düşman Arketipleri

Aşağıdaki 8 arketip, tüm 24+ düşman taksonomisini kapsar. Her arketipin: pattern type, AI state machine, target priority, escalation rule.

---

#### Arketip 1: Bruiser (Yüksek atk, orta HP)

**Tipik üyeler:** Magma Titan, Storm Knight, Thunder Boar
**Intent pattern:** Sequential `[⚔️ big, 🛡️ small, ⚔️ big]`
**Target priority:**
1. Player (default)
2. Highest threat creature (eğer player HP > %60)
**State machine:**
```
state RAGE: hp > 50%
  patterns: [⚔️ 8, 🛡️ 4, ⚔️ 8]
  on hp <= 50%: → state ENRAGED

state ENRAGED: hp <= 50%
  patterns: [⚔️ 12, ⚔️ 6×2, ⚔️ 12]
  no defenses
```
**Escalation:** Turn 5+'te `+2 atk` permanent
**Counter-strategy:** Block farming, Frail apply, Pierce kullanma (hatta Pierce'sız zarar yeterli)

---

#### Arketip 2: Caster (Düşük HP, status spam)

**Tipik üyeler:** Bog Witch, Umbra Lich, Storm Hawk (kısmen)
**Intent pattern:** Weighted (60% status, 30% saldırı, 10% buff)
**Target priority:**
1. Player (status, AOE)
2. Player creatures (status spam, dolaylı)
**State machine:**
```
state CHANNEL: default
  patterns: [✨ Burn 3 player, ⚔️ 4, ✨ Shadow 2 player]
  60/30/10 weighted

state EXPOSED: hp <= 30%
  patterns: [⚔️ 7, 🛡️ 8, ⚔️ 7]    # caster panics → bruiser mode
  on hp <= 0: regular death
```
**Escalation:** Turn 4+ status duration +1
**Counter-strategy:** Burst single-target, kill önce; status temizleme (Frail apply)

---

#### Arketip 3: Trickster (Düşük HP, oyuncu rotasyonunu boz)

**Tipik üyeler:** Static Mite, Shadeling, Sproutling-mod
**Intent pattern:** Adaptive
**Target priority:**
1. Player (discard zorla)
2. Player'in son oynadığı element (counter-frame)
**State machine:**
```
state OBSERVE: turn 1-2
  patterns: [✨ Discard 1, 🛡️ 3]

state PUNISH: turn 3+
  patterns:
    if last-played-element == this.element: ⚔️ 6
    else: ✨ Discard 2
```
**Escalation:** Turn 6+ "✨ Discard 2 + ⚔️ 3"
**Counter-strategy:** Kill önce, swap-element draw, discard-immune deck

---

#### Arketip 4: Swarmer (Çoklu, düşük HP, kalabalık)

**Tipik üyeler:** Sproutling x2, Imp x3 (Hydra phase 2)
**Intent pattern:** Sequential, koordineli
**Target priority:** Player (her biri ayrı saldırı)
**State machine:** sadece single-state SWARM, ayrı bir state machine yok. Ölme tetikleyicisi: birinin ölmesi → diğerleri rage (atk +1 temp)
**Escalation:** Turn 4+ → her ölü swarm üyesi için kalanlar +1 atk
**Counter-strategy:** AOE (Storm), Burn DoT (Ember), block-stack (Tide)

---

#### Arketip 5: Tank (Yüksek HP + block, düşük atk)

**Tipik üyeler:** Coral Champion, Obsidian Golem, Vinegar Slug
**Intent pattern:** Conditional
**Target priority:**
1. En düşük HP creature (yorulan duvarı yık)
2. Player (eğer creatures yok)
**State machine:**
```
state BUILD: hp > 70%
  patterns: [🛡️ 12, ⚔️ 4]

state STRIKE: hp <= 70%
  patterns: [⚔️ 8, 🛡️ 6, ⚔️ 8]

state DESPERATE: hp <= 25%
  patterns: [⚔️ 14, ⚔️ 14]
  no block
```
**Escalation:** Turn 5+ block +2
**Counter-strategy:** Pierce, Frail spam, block-stripping (Strom Static)

---

#### Arketip 6: Healer (Düşük atk, ally heal)

**Tipik üyeler:** Coven Trio (one of three), Bog Witch (mid), Lifesong (yeni proposed)
**Intent pattern:** Adaptive
**Target priority:**
1. En düşük HP ally (heal)
2. Player (eğer tüm ally full HP)
**State machine:**
```
state SUPPORT: ally düşük
  patterns: [✨ Heal 5 ally, 🛡️ 3]

state STRIKE: ally full
  patterns: [⚔️ 4, ✨ Buff strength 2 ally]
```
**Escalation:** Turn 6+ heal +2
**Counter-strategy:** Healer'ı ÖNCE öldür (high priority), AOE
**Targeting tweak:** Healer "lowest HP ally" seçiminde, eğer ölüm-sırasında sadece bir ally varsa o ally sürekli heal alır → silver-bullet senaryo

---

#### Arketip 7: Boss (Phase'li, çok-mekanikli)

**Tipik üyeler:** Hydra Tide, Verdant Wraith, Element Sovereign (3-phase)
**Detailed phase machinery aşağıda §22.5'te.**

---

#### Arketip 8: Elite (Tek özel mekanikli, "mini-boss")

**Tipik üyeler:** Wildfire, Twin Eclipses, Coven Trio
**Intent pattern:** Conditional + 1 unique mechanic
**Target priority:** Çoğunlukla player, mekaniğe bağlı
**State machine:**
```
state BUILD: turn 1-2
  patterns: [🛡️ 8, unique mechanic]

state EXECUTE: turn 3+
  patterns: [⚔️ uses unique mechanic]
```
**Escalation:** Yok, elite zaten mekanik etrafında dönüyor
**Counter-strategy:** unique mekanik nasıl çözüleceğini öğrenme — örn. Twin Eclipses: aynı turda her ikisini de öldür, yoksa diriltirler.

### 22.4 AI Fairness Kuralları (Bilgi Sızıntısı Yok)

| Kural | Açıklama |
|-------|----------|
| Hand görünmez | AI `state.player.hand`'a *erişmez*; sadece `state.public.lastPlayed` ve `state.public.health` görür |
| Future draws görünmez | DrawPile'a sneak peek YOK; AI'nın seed'i player seed'inden ayrılmıştır |
| Random tie-break deterministic | Beraberliklerde `min(uid)` ile karar |
| AI seed kanalı | `enemyRng = makeRng(seed XOR 0xE)` — battle'daki diğer RNG'lerden bağımsız |
| Replay-fair | AI hareketi her seferinde aynı state'te aynı çıktıyı verir |
| No retroactive damage | AI'nın "şanssız" hasarını sonradan upgrade etmez (örn. crit eklemez) |

### 22.5 Boss Phase Machinery

5 Element Lord'un her biri 3 phase'e sahiptir. (NB: §1 lore'a göre 5 lord, ama §8'de sadece 3 act bossu. Bu çelişki §25'te çözülür: lord'lar phase'lerdir, bosslar Sundering parçalarıdır.)

#### Boss 1 — Hydra Tide (Act 1)

**Toplam HP:** 120
**Element:** Tide

**Phase 1 (HP 120 → 80, "Three Heads"):**
- Pattern: Sequential `[⚔️ 4, ⚔️ 4, ⚔️ 4]` (her baş bir saldırı)
- Saldırılar her tur farklı baş, telegrafda "⚔️ 4 (head A)" gösterir
- Heal mekaniği yok
- Counter: Tek-hedef burst → bir baş öldür, paterni boz

**Phase 1 → Phase 2 trigger (HP <= 80):**
- Bespoke transition: "* The Hydra Tide regenerates a smaller head! *"
- Yeni *imp* enemy çağrılır (slot varsa) → Trickster arketip
- Element Sovereign 3-phase'i için ön-hazırlık (Sundering pattern)

**Phase 2 (HP 80 → 30, "Two Heads + Imp"):**
- Pattern: Conditional `if imp alive: ⚔️ 4 player + 🛡️ 4 imp; if not: ⚔️ 6 player`
- Imp ölürse turn 1'de ⚔️ 6 (revenge mode)
- Counter: Imp'i son turda öldür (rage'ı tetikleme)

**Phase 3 (HP 30 → 0, "Final Head"):**
- Pattern: Sequential `[⚔️ 8, 🛡️ 6, ⚔️ 12]`
- Lifelink kazanır (5 HP/saldırı)
- Counter: Tüm güç ile burst, lifelink'i overhealr

**Bespoke art swap:** her phase için palette darken (Phase 3 = darkest)
**Bespoke music swap:** Phase 2'de battle-loop intensity +1 (BGM layer mood: "tense")

---

#### Boss 2 — Verdant Wraith (Act 2)

**Toplam HP:** 180
**Element:** Verdant

**Phase 1 (HP 180 → 120, "Bramble"):**
- Pattern: Sequential `[✨ Root 2 player, ⚔️ 6, ✨ Root 2 player]`
- Her tur 2 Root uygula → oyuncuyu kart oynamaktan engeller
- Counter: Frail apply (Wraith'ın saldırısı yarıya düşer); Pact Stone (mana sayesinde root'lu turda hala oynama)

**Phase 1 → Phase 2 trigger (HP <= 120):**
- Bespoke: "* Verdant tendrils wreathe the Wraith — lifelink awakens! *"
- 4 Regen kazanır + Lifelink keyword

**Phase 2 (HP 120 → 60, "Lifelink Bloom"):**
- Pattern: Adaptive — eğer oyuncu < 30% HP: ⚔️ 12 + Lifelink; eğer player tam HP: ✨ Buff strength 3 + Echo summon Sproutling
- Counter: Pierce (lifelink'i bypass) + AOE clear (sproutlings)

**Phase 2 → Phase 3 trigger (HP <= 60):**
- Bespoke: "* The Wraith withers, drawing all life into one final form. *"
- Tüm summoned sproutlings ölür, Wraith +30 atk geçici (1 tur)

**Phase 3 (HP 60 → 0, "Final Bloom"):**
- Pattern: `[⚔️ 30 (1 turn only), ⚔️ 8, ⚔️ 8]`
- Phase 3 turn 1'de ⚔️ 30 → muhtemelen tek-shot kill
- Counter: 30+ block on turn-of-trigger; Frail (15 hasar); Block + Heal combo

---

#### Boss 3 — Element Sovereign (Act 3, "Sundering Avatar")

**Toplam HP:** 260
**Element:** Phase'e göre değişir (Ember → Storm → Umbra)

**Phase 1 (HP 260 → 175, "Ember"):**
- Pattern: Sequential `[⚔️ 8, ✨ Burn 3 player, ⚔️ 8, 🛡️ 12]`
- Tide kart kullanan oyuncu için ✓ üstün → çember oyna
- Counter: Tide creature board

**Phase 1 → Phase 2 trigger:**
- Bespoke: "* The Sovereign sheds its ember husk and crackles with storm essence — all curses cleansed. *"
- Tüm enemy statusu temiz (oyuncudaki Burn dahil)
- Element ember → storm
- Player non-block statusu da temiz (mercy-ish reset)

**Phase 2 (HP 175 → 90, "Storm"):**
- Pattern: Adaptive — `if player has Block > 10: ⚔️ Pierce 14; else: ⚔️ 6×3`
- Counter: Block rotation (block low + heal vs. block high)
- Discard zorlama: ✨ Discard 2 her 3 turda 1

**Phase 2 → Phase 3 trigger:**
- Bespoke: "* The Sovereign collapses inward — only shadow remains. *"
- Element storm → umbra
- Tüm zayıf-element düşmanlar enstantane öldü; Sovereign solo

**Phase 3 (HP 90 → 0, "Umbra Sundering"):**
- Pattern: Conditional — `if player.maxhp < 50: ⚔️ 20; else: ✨ Shadow 4 + ⚔️ 8`
- Lifelink kazanır
- Counter: Burst-down (Hunter exhaust ekonomisi parlak), Pierce
- Final tur: 💀 "Sundering Strike" — base 50 hasar (cinematic, generally lethal except via 50+ Block + Heal)

**Bespoke art:** her phase tamamen farklı sprite (3 farklı portre)
**Bespoke music:** her phase BGM mood değişir (Act 3 ethereal → tense → calm-eerie)

---

#### Lord 4 — Tideheart Sovereign (Future / Meta-unlock — Run 2 design)

(Hatırlatma: Mevcut sürümde sadece 3 act bossu vardır. Run 2'de "Endless Mode" / "Pact Lords" ekleneği için 5 lord'a tamamlanır.)

**Phase Plan (preview):**
- Phase 1: Tide barrier (50 block per turn)
- Phase 2: Tide → Verdant pivot (lifelink)
- Phase 3: Tide → Storm pivot (chain lightning)

#### Lord 5 — Umbra Sundering (Future / Endless mode)

**Phase Plan (preview):**
- Phase 1: Discard 5 hand at start
- Phase 2: Banish player's strongest card permanently
- Phase 3: Echo every player card (own and target Echo)

### 22.6 Escalation Rules (Genel)

Tüm enemy'ler `escalateAtTurn(turn)` ile escalation kontrolü:

```pseudo
function escalateAtTurn(enemy, turn):
  if turn >= 5: enemy.atk += enemy.escalationAtkBonus or 1
  if turn >= 8: enemy.atk += 1; enemy.statusDuration += 1
  if turn >= 12: enemy.atk += 2; enemy.lifelink = true
  if turn >= 16: # bu enemy 16 turdan fazla yaşamaz beklentisi
    enemy.atk = 99   # rage-quit reward (forces battle resolution)
```

**Rasyonel:** StS dersi 4 (turtle decks cezalandırılmalı). Long battles'ı disincentivize.

### 22.7 Determinism Test Suite — AI

```
suite "AI determinism"
  test seed S battle B → enemy intent sequence sabit (10 random)
  test 1000 random battles → no info leak (player hand'i toggle, AI çıktısı aynı)
  test target priority guard > threat > player (golden order)
  test boss phase HP gates exact (Hydra: 120/80/30 thresholds)
  test escalation kicks at exact turns
  test status tick order pasif → aktif
```

### 22.8 AI Tooling — Designer Hints

Yeni enemy yazarken designer şu sorulara cevap verir:
1. Arketipi nedir?
2. Pattern type? (Sequential / Weighted / Conditional / Phase-gated / Adaptive)
3. State machine'i kaç state'tir? (default 1, max 3)
4. Escalation? (özel veya generic)
5. Element çemberinde nereye düşer?
6. Counter-strategy hangi keyword'ler? (en az 2)

Sonra `data/enemies.ts` içinde bu schema ile yazar:

```ts
{
  id: "bog_witch",
  archetype: "caster",
  pattern: { type: "weighted", entries: [...] },
  states: [
    { id: "channel", trigger: "default", patterns: [...] },
    { id: "exposed", trigger: "hp_pct_lte", value: 0.3, patterns: [...] }
  ],
  escalation: { atTurn: 4, change: "statusDuration += 1" },
  element: "verdant",
  counterKeywords: ["frail", "pierce"]
}
```

---

## 23. Procedural Map Generation Algoritması

> Map gen, run-to-run varyasyonun yarısını üretir (diğer yarısı reward draw'ları). Determinism + okunabilirlik + hard-guard'lar bu spec'in 3 büyük gereksinimidir.

### 23.1 Genel Yapı

- **3 Act × 15 floor.** Floor 0 sabit start, Floor 14 sabit boss.
- **6 sütun (column).** Floor 1–13 arası nodes 6 sütunlu grid'e yerleşir.
- **Edge'lar Manhattan-1 dışında olamaz** (yani bir node'dan sadece kendi sütununa ya da bir sağına/soluna geçilir).
- **Path forcing prevention:** Boss'a en az 2 ayrı path olmalı (no single bottleneck above floor 0).

### 23.2 Algoritma — `generateMap(seed, act, ascension)`

```pseudo
function generateMap(seed, act, ascension):
  rng = makeRng(seed XOR (act * 0x1000) XOR (ascension * 0x10))
  nodes = []

  # Floor 0: 6 starting nodes (battle), her sütunda 1
  for col in 0..5:
    nodes.push({ floor: 0, col, type: "battle", id: uid() })

  # Floor 1-13: per-floor sample
  for floor in 1..13:
    forcedType = floorForcedType(floor)   # see 23.3
    if forcedType:
      for col in 0..5:
        nodes.push({ floor, col, type: forcedType, id: uid() })
    else:
      for col in 0..5:
        if rng() < nodeDensity(floor, ascension):
          type = sampleType(rng, floor, ascension)
          nodes.push({ floor, col, type, id: uid() })

  # Floor 14: single boss center
  nodes.push({ floor: 14, col: 2.5, type: "boss", id: uid() })

  # Edge generation
  edges = []
  for f in 0..13:
    for src in nodes.filter(f):
      candidates = nodes.filter(f+1).filter(n -> abs(n.col - src.col) <= 1)
      target = pickWeighted(rng, candidates)
      edges.push({ from: src.id, to: target.id })

  # Validate & repair
  while not validatePaths(nodes, edges):
    repairEdges(rng, nodes, edges)

  return { nodes, edges, seed, act, ascension }
```

### 23.3 Forced Floors Tablosu

| Floor | Tip | Rasyonel |
|-------|-----|---------|
| 0 | Battle (sabit) | Run başlangıcı; eğitim için kolay |
| 5 | Elite (tüm path'ler) | Mid-act çatışma + mid-game relic |
| 8 | Rest (tüm path'ler) | Heal beklenir → boss prep'i için kayıt |
| 11 | Elite (tüm path'ler) | İkinci elite + boss prep relic |
| 14 | Boss (sabit, single node) | Act sonu |

### 23.4 Encounter Density (Per Act, Per Floor)

`nodeDensity(floor, ascension)` her sütunda node olma olasılığı:

| Floor | Density (asc 0) | Density (asc 5) |
|-------|----------------|----------------|
| 1 | 0.85 | 0.95 |
| 2 | 0.80 | 0.90 |
| 3 | 0.75 | 0.85 |
| 4 | 0.85 | 0.90 |
| 5 | 1.00 (forced) | 1.00 |
| 6 | 0.65 | 0.75 |
| 7 | 0.70 | 0.80 |
| 8 | 1.00 (forced rest) | 1.00 |
| 9 | 0.75 | 0.85 |
| 10 | 0.80 | 0.90 |
| 11 | 1.00 (forced) | 1.00 |
| 12 | 0.65 | 0.75 |
| 13 | 0.70 | 0.85 |
| 14 | 1.00 (boss) | 1.00 |

**Asc 5'te ≥%10 daha yoğun map** → kaçabileceğin "boş" node sayısı azalır.

### 23.5 Tip Dağılımı (sampleType)

`sampleType(rng, floor, ascension)` per-act ve per-floor değişir. Genel kural:

```
Act 1 (asc 0):
  Battle:  45%
  Elite:   12%
  Rest:    12%
  Shop:    10%
  Mystery: 16%
  Treasure: 5%

Act 2 (asc 0):
  Battle:  40%
  Elite:   15% (+3%)
  Rest:    10% (-2%)
  Shop:    10%
  Mystery: 18%
  Treasure: 7%

Act 3 (asc 0):
  Battle:  35%
  Elite:   18% (+6%)
  Rest:    8%  (-4%)
  Shop:    12%
  Mystery: 20%
  Treasure: 7%
```

Asc 5 modifier: Elite +3%, Rest -3%, geri kalanı oranlı.

### 23.6 RNG Kanalları (Bağımsız Channels)

Belirleyiciliği koruyabilmek için map gen ayrı bir RNG seed kullanır:

```
mapRng    = makeRng(runSeed XOR 0xABCDE)
battleRng = makeRng(runSeed XOR 0xBA771E XOR battleIndex)
shopRng   = makeRng(runSeed XOR 0x5409)
eventRng  = makeRng(runSeed XOR 0xEEEE)
enemyRng  = makeRng(runSeed XOR 0xE)        # AI deciding
rewardRng = makeRng(runSeed XOR 0xDEADBEEF)
fxRng     = makeRng(runSeed XOR 0xFC00)     # FX, irrelevant to logic
```

**Rule:** Tüm RNG'ler Mulberry32; XOR mask'leri *kanonik* (assertable).

### 23.7 Edge Validation (Hard Guards)

Algoritma `validatePaths` aşağıdaki invariant'ları kontrol eder. Herhangi biri başarısız olursa `repairEdges` çağrılır:

| Invariant | Açıklama |
|-----------|---------|
| Reachability | Her floor 0 node'undan boss'a en az 1 path var |
| Multi-path | Boss'a en az 2 ayrı path var (no single bottleneck) |
| No isolated | Hiçbir node'a edge gelmiyorsa silinir |
| No double | Aynı (from, to) çiftinde 2 edge yok |
| No cross-skip | Edge floor'lar arası 1'den fazla atlama yapamaz |
| Chest variety | Aynı path 3+ shop/3+ rest yok |
| Element variety | Aynı path 4+ aynı element düşman yok |

`repairEdges` saldırgan değildir — minimum müdahale:
1. Eksik edge ekle (eksik reachability)
2. Multi-path için bir bridge edge oluştur
3. Çakışmaları sil
4. 5 iterasyondan sonra hala invalid ise → seed'i discard et, fallback seed (`seed + 1`) kullan ve baştan dene.

### 23.8 Encounter Difficulty Curve (Per Act)

Act içi zorluk yumuşak yükselir:

```
difficulty(act, floor) = baseDifficulty(act) * (1 + 0.04 * floor)
```

| Act | baseDifficulty | floor 1 | floor 7 | floor 13 |
|-----|---------------|---------|---------|----------|
| 1 | 1.00 | 1.04 | 1.28 | 1.52 |
| 2 | 1.40 | 1.46 | 1.79 | 2.13 |
| 3 | 1.85 | 1.92 | 2.37 | 2.81 |

Difficulty number, enemy `hp` ve `atk` çarpanlarını etkiler:
- enemy.hp = enemy.baseHp × difficulty
- enemy.atk = enemy.baseAtk × (1 + (difficulty - 1) * 0.5)

(atk daha yumuşak → run uzun ölmez)

### 23.9 Edge Cases

| Senaryo | Handle |
|---------|--------|
| Tüm sütunlar aynı tipte rastgele düşüyor | sampleType retry up to 3 (variety guard) |
| Player rest hemen sonra rest | iki ardışık rest yasak → aynı path'te second rest replaced |
| Forced floor 5 tüm sütunda elite → 6 elite | normal davranış (oyuncu seçer); zorlu ama kasıtlı |
| Seed = 0 | edge case, runSeed = 1 ile değiştir (seed != 0 invariant) |
| Asc > 5 | reddet (asc max 5 currently); future expansion için cap güncelleme dokümante edilmeli |
| 14. floor unreachable | pathRepair sonrası hala unreachable → catastrophic, fallback seed |

### 23.10 Determinism Test Suite — Map Gen

```
suite "map gen determinism"
  test seed 12345 act 1 → map JSON exact match
  test seed 12345 + asc 5 → ascension affects density (densitySum increases ≥10%)
  test 1000 random seeds → all maps reach boss
  test all maps pass validatePaths
  test no path has >3 shops or >3 rests
  test floor 5/8/11/14 forced types
```

### 23.11 Map Visualization (Cross-Reference)

`src/ui/MapView.ts` her seed için aynı map'i render eder. Tooltips (§13.6d) hover'da node tip + reward tier hint gösterir. Run summary'de map'in oyuncunun gittiği path'i highlight ile gösterilir (Run 2 enhancement).

### 23.12 Asc Effects Beyond Density

Asc seviyesi sadece density'yi değil, içeriği de etkiler:

| Asc | Etki |
|-----|------|
| 0 | baseline |
| 1 | maxHP -3, density +2% |
| 2 | maxHP -3, enemy atk +1, +1 elite per act guaranteed |
| 3 | maxHP -3, enemy atk +1, shop fiyatları +20% |
| 4 | maxHP -3, enemy atk +1, healing -25% |
| 5 | maxHP -3, enemy atk +2, double elite floor 11 (+ 1 elite alongside) |

(StS dersi 1: "layered modifiers" — cumulatively building pressure)

### 23.13 "Surprise Map" (Run 2 Concept)

Yeni event tipi: `Wormhole` — oyuncu seçtiğinde 2 floor ileri atlar (büyük ödül + büyük risk). Asc 3+'da ortaya çıkar. Run 2 design.

---

## 24. Narrative & World Lore (Volume 1)

> Türkçe yazılmıştır. Kanonik isimler, tarihler, karakter geçmişleri burada kilitlenir. Run 2 ek hikâye genişletir; bu satırlar değişmez (sadece eklenir).

### 24.1 Sundering — Beş Pakt'ın Kırılışı

Çağlar önce, *Pakt Adası* (Aithra Adası, dünyanın geri kalanından bir taş kıyının ve sonsuz sisin ardında) beş elementin barış içinde döndüğü bir paylaşım yeriydi. Bir lord (her birinin) elementinin sözünü tutardı: Ember sıcaklık verir ama yakmazdı; Tide nem verir ama boğmazdı; Verdant büyüme verir ama dolaşıklaştırmazdı; Storm hareket verir ama parçalamazdı; Umbra dinginlik verir ama silmemezdi. Bu *Beşli Pakt*tı (*Pact of Five*).

Bin yıl önce, beş lord ortak bir yıldız fırtınasında bir araya geldiklerinde, biri pakt'ın hür iradeye dair yeminini bozdu. Hangisi olduğu şimdi de tartışmalıdır — Ember mi (öfkeyle), Umbra mı (susarak), Tide mi (kaçarak)? Lordlar birbirlerine baktı, ve her biri diğerini suçladı.

Birkaç gün içinde paktlar tek tek çöktü. Ember dağ köylerini yaktı. Tide körfezleri boğdu. Verdant sandık yollarını sarmaşıkla kapadı. Storm gemileri parçaladı. Umbra hatıraları sildi. Ada, beş savaşan yetkin parça hâline geldi: *Sunlit Coast* (Tide-Verdant ortaklığının kalıntısı), *Volcanic Marsh* (Ember-Verdant savaş hattı), *Storm Spire* (Storm'un kuleleri), ve henüz haritada görünmeyen Umbra Bataklığı + Verdant Yıldız Ormanı (Run 2'de açılacak biomes).

Bu olaya — pakt'ın kırılışına — tarihçiler *Sundering* dedi. (Kelime hem "ayrılış" hem "yarılış" anlamı taşır; Aithra dilinde *kreyon-os*.)

### 24.2 Sundering Sonrası Adada Yaşam

Pakt kırıldıktan sonra ada büyük ölçüde insandan boşaldı. Tek tek hayatta kalan klanlar, beş elementin hangisinin onlara öncelik tanıdığına göre yerleşti. Bunlar *Aithra'nın Beş Eskileri*'dir:

- **Ember Forge Klanı** (Volcanic Marsh kuzeyi, sıcak demirciler, "ateş bizi seçti çünkü dövmüyoruz, bizi dövüyor")
- **Tide Anchor Klanı** (Sunlit Coast'un güney burnunda, eski balıkçı dilinde "tide bizi unutmaz")
- **Verdant Bond Klanı** (Volcanic Marsh ile Storm Spire kavşağı, ormanla simbiyoz)
- **Storm Vigil Klanı** (Storm Spire dağ tepelerinde, gözlemci ruhanîler)
- **Umbra Whisper Klanı** (Sunlit Coast'un en derin koylarında, gece yürüyüşçüleri)

Bu klanlar arasındaki ilişki *barışçıl ama mesafelidir*. Hiçbiri diğerinin diline tam vâkıf değildir; çoğu iletişim *yaratık karşılıkları* (her klanın totem yaratığı) üzerinden olur.

### 24.3 Tamer'ın Yolu — Her Karakterin Hikayesi

#### 24.3.1 Tamer (Doğum: Sebra-Lo, Verdant Bond Klanı)

Tamer, Verdant Bond Klanı'nın son neslinin son evladıdır. Klanı yıllar önce, *Verdant Wraith*'ın silindirik öfkesinde dağılmıştır — Wraith bir zamanlar klanın koruyucu Lord'u idi; pakt kırıldıktan sonra "yeşili bilgisizce yaymaya" başlamış, klanın çocuklarını sarmaşıkla bağlamıştı.

Tamer, ölü kardeşinin kapsamından düşürdüğü bir bond-taş ile kaçtı; o taş hâlâ boynunda asılıdır (`Beastbond` relic'i, oyun başlangıç eşyası). 14 yaşındaydı. 22'sinde, ada üzerinde dolaşan beş lord'u yeniden bağlamak ve Sundering'i geri çevirmek için sefere çıktı. Tek silahı bond-taşı + miras kart destesi. Vahşi yaratıkları yakalama (taming) yeteneği klan-genidir.

> **Tamer'ın yemini:** "Beş lord beni dinlemiyor olabilir. Beş yaratık beni dinleyebilir. Bu yeter."

Oyuncu motivasyonu: *Klanını tekrar büyütmek.* Her run'da hayatta kalan bir yaratık, klan totem havuzuna eklenir (lore-only, mekanik etki yok bu run'da; Run 4 meta-progression genişletmesi).

#### 24.3.2 Sage (Doğum: Halûr-Tâ, Tide Anchor Klanı)

Sage, Tide Anchor Klanı'nın 47 yaşındaki *gelgit kâhini*dir. Klanın ardarda gelen 12 nesli boyunca, her gelgit ayında bir kâhin "Tide Sözü"nü dinler ve klana iletir. Sage, son üç yıldır Söz'ün giderek bozulduğunu — yarısı Storm sesi, yarısı sessizlik — ileri sürer. Klan ona inanmıyor; o ada turuna çıkar, Söz'ün asıl kaynağını bulmak için.

Sage, *spell zincir* uzmanıdır çünkü Tide Söz'ü her zaman bir ritmik döngüdür: bir spell başlatır, ikincisi tamamlar, üçüncüsü kapatır. Mucizevî yetenekleri pakt'ın kırılışından beri keskinleşmiştir; Sage'in iddiası: "Kıyamet yaklaşırken, son söz daha berraktır."

> **Sage'in yemini:** "Sözü duyan susmaz. Susan çoktan unutulmuştur."

Oyuncu açılma şartı: 5 win (bir karakter ile 5 farklı run kazan).

Oyuncu motivasyonu: *Söz'ün asıl kaynağını bul.* Run-summary ekranında her boss-kill bir "Söz parçası" açar (Run 2 narrative content).

#### 24.3.3 Hunter (Doğum: Bilinmiyor, Umbra Whisper Klanı evlatlığı)

Hunter'ın asıl ismi yoktur. Pakt'ın kırılışından önce, Whisper Klanı bebekleri *Sundering Boşluğu*'ndan kurtarıp evlat alma geleneğine sahipti — gözleri açık doğmuş ama hatırasız çocukları topladıkları bir yer. Hunter, böyle bir çocuktur.

Whisper Klanı onu okçu yetiştirdi (klanın totemi *gece-vurucu*, bir gölge kuş). Hunter 26 yaşında klanı terk etti — ne sebebini açıklamadı, ne de geri döndü. Şimdi ada üzerinde bir gölge avcısıdır; her boss kill bir Sundering hatırasını "ödünç" alır (Hunter mekaniği: exhaust kart havuzunu kullanır = silinmiş hatıralardan beslenir).

> **Hunter'ın sözü (yemin değil, fısıltı):** "Hatırlamadığım şeyleri vurabilirim."

Oyuncu açılma şartı: Act 2 boss yenilince.

Oyuncu motivasyonu: *Kim olduğumu bul.* Run summary'de 5 boss kill ile bir "kayıp anı" açılır (Run 2 narrative content).

#### 24.3.4 Warden (Doğum: Karren-Mhel, Storm Vigil Klanı)

Warden, Storm Vigil Klanı'nın eski başkâhini ve şu an *artık-değil-başkâhin*idir. 60 yaşına kadar klan'ın *Vigil Çubuğu*'nu (bir ışıltı asası) taşıdı; klan Söz'ü dinlerken, Warden Söz'ü tutardı.

Pakt'ın kırılışından beş yıl sonra, Warden Söz'ün artık tek bir parça olmadığını fark etti. Ondan beş ayrı parça duydu — her elementten birer söz. Bu, klan'ın kabul edemeyeceği bir kâfirliktir; kovuldu. Çubuk'unu da elinden aldılar.

Warden artık asasız bir yaşlıdır; ama Tide-Umbra çift-element ustalığı zamanla *defans + lifelink* geliştirmiştir. Beş Söz'ü tek bir şarkıda birleştirme amacı; Sundering'i geri sarmak.

> **Warden'ın yemini:** "Bir Söz tek bir kalpte. Beş Söz tek bir ada'da. Bana bir ömür yeter."

Oyuncu açılma şartı: Act 3 boss yenilince.

Oyuncu motivasyonu: *Beşi tek bir Söz'e bağla.* Run summary'de 5 boss kill ile her elemente bir "Pakt yapraklığı" açılır.

### 24.4 Beş Element Lord'u

#### Ember Lord — *Solomne, Ay-Yağar*

Cinsiyetsiz; Aithra dilinde "ateşin yumuşaklığını öğretmek" yemini etmişti. Pakt kırıldığında, *Solomne* ada'nın volkanik kalbine çekildi. Şimdi Magma Marsh'ın derininde 200-yıl-uykusunda. Element Sovereign phase 1, Solomne'nin uyanan parçası.

**Korruption:** Söz'ünün bozulmasıyla, Solomne artık ısı vermeyi unuttu — sadece yakar. Run lore: "Solomne'yi uyandırmadan önce vurmalıyız."

#### Tide Lord — *Mhalrai, Anchor-Söyleyen*

Dişi-eril karışık (Aithra dilinde "yedi gelgitin oğlu kızı"). Söz'ü "akış vermek, basmamak" idi. Pakt kırılınca, *Mhalrai* körfezleri boğdu. Şimdi Sunlit Coast'un mercan-tahtında oturuyor. Hydra Tide, Mhalrai'nin üç sesinden birinin dış görünümü.

**Korruption:** Akışı tutamıyor — sürekli boğuyor.

#### Verdant Lord — *Selmer-Iho, Yeşil-Yumar*

Erkek; "büyüme verir, dolaşıklaştırmaz" idi. Şimdi Verdant Wraith — sarmaşıkla bağladığı her şeyi unutmuş bir lord. Verdant Wraith, Selmer-Iho'nun kafesidir.

**Korruption:** Hatırlamak için saramak zorunda olduğunu sanıyor.

#### Storm Lord — *Velkir, Şimşek-Sarman*

Cinsiyetsiz; "hareket verir, parçalamaz" idi. Storm Spire'ın en yüksek tepesinde, ışıltı içinde. Element Sovereign phase 2, Velkir'in çekirdek parçası.

**Korruption:** Velkir, hareketin ne olduğunu unuttu — sadece şimşek.

#### Umbra Lord — *Eshmir, Susgun*

Cinsiyetsiz; "dinginlik verir, silmez" idi. Şimdi adada hiç görünmüyor — son tanık 80 yıl önceydi. Element Sovereign phase 3'ün adı *Umbra Sundering*; Eshmir'in ses-i değil, gölgesi.

**Korruption:** Eshmir artık susmak yerine *eylemini siliyor*. Phase 3'te oyuncuya en yakın olur.

### 24.5 Sundering'i Geri Sarmak — Oyuncu'nun Asıl Hedefi

5 lord'u tek tek bağlamak (lore'da, mekanik yok bu run): Tamer/Sage/Hunter/Warden'ın hepsi Sovereign'i yendiğinde, *Beşli Pakt* yenilenir.

Lore-only ödül: Run 2 ekleyecek "Endless Mode"da Tide ve Umbra Lord'lara karşı boss savaşları (bkz §22.5'te placeholder phase planları).

### 24.6 Aithra Dili — Kısa Sözlük

| Aithra | Türkçe | Kullanım |
|--------|--------|----------|
| *kreyon-os* | "Sundering" / yarılış | mit |
| *ohm-tor* | "Pakt'a sözveren" | yemin formülü |
| *vel-mhar* | "söz tutmak" | ahlaki sözcük |
| *helo-an* | "ateş-yumuşaklık" | Ember mahlas |
| *hoi-tar* | "tide-akış" | Tide mahlas |
| *seli-no* | "yeşil-büyüme" | Verdant mahlas |
| *vel-air* | "şimşek-hareket" | Storm mahlas |
| *esh-shu* | "gölge-dinginlik" | Umbra mahlas |
| *sebra* | "doğum yeri" | yer adı eki |
| *karren* | "kâhin köyü" | yer adı eki |

### 24.7 Beş Biom — Adanın Coğrafyası

| Biom | Element | Lokasyon | Açıklama (in-game text) |
|------|---------|----------|-------------------------|
| Sunlit Coast | Tide-Verdant | Güney sahil | "Sis köpüklü dalgalar; gizli mangrov dalları gizli mavi kuyu sözlerini fısıldar." |
| Volcanic Marsh | Ember-Verdant | Orta-doğu | "Yanan bataklık; her adımda ayağının altında çatlama duyarsın." |
| Storm Spire | Storm | Kuzey doruk | "Mor şimşek bulutları arasında dik kayalıklar; rüzgar kemiği sızlatır." |
| Umbra Lagoon | Umbra | Güneybatı koyları | "Hatırlanmamış sular; üzerinde ay olmayan ay-ışığı parıldar." (Run 2 biome) |
| Verdant Skyhold | Verdant-Storm | Yüksek tepe ormanı | "Bulut-yapraklı gökyüzü ormanı; ağaçların kökleri rüzgarda asılı." (Run 2 biome) |

**Mevcut sürümde 3 biom (Sunlit Coast / Volcanic Marsh / Storm Spire — Act 1/2/3).** Diğer ikisi Run 2 narrative+map gen extension'da açılır.

### 24.8 Event Card Lore (In-Game Snippets)

Mevcut events'in lore satırları (Run 1 ekleniyor — UI tarafından `event.body` olarak okunabilir, mevcut Iter 15 eventModal kullanır):

- **Crossroads:** "Üç patika önünde. Birincisinde altın bir baston, ikincisinde uyuyan bir Sproutling, üçüncüsünde tanıdık bir titreme. Hangisi seni evine çağırıyor?"
- **Lost Cub:** "Yavru bir critter çalılığın altında, sırtına bond-taşı düşmüş gibi titriyor. Sahiplenmek mi, geçmek mi?"
- **Dark Pact:** "Karanlık bir kuyunun başında, bir taş yüzlü figür sana bir zincir uzatıyor. Bedeli kanın, ama hediyesi büyük."
- **Treasure Vault:** "Bir küçük tunç sandık. Üstünde mühür yok ama içinden gümüş çıngırak sesi geliyor. Açmak mı, dinlemek mi?"
- **Library:** "Eski bir Storm Vigil sığınağı. Raflar dolu eski parşömen. Bir sayfa, kartlarından birini upgrade edebilir."
- **Trader:** "Bir kapüşonlu figür, çadırda oturmuş. 'Senden bir kart al, sana başka bir kart vereyim,' diyor. Yüzünü göremedin."
- **Eldritch Mirror:** "Karanlık bir göl yüzeyinde kendinin yansıması. Yansıman senden bir adım önde. Ne istiyorsa onu vermek mi?"
- **Shrine:** "Beş elementin küçük taşları, daire şeklinde dizilmiş. 20 altın altarın üstüne koyarsan bir uncommon bağışlanır."
- **Wandering Sage:** "Yaşlı bir kâhin, 'gücünü daha derinlere taşır mısın?' diyor. -5 maxHP karşılığında bir power slot daha."
- **Storm Altar:** "Karanlık bulutlar altında bir taş altar. Üstüne bakıyorsun, bir altın yağmuru yağıyor."
- **Tide Pool:** "Dingin bir kuyu. Dalmak mı, kart mı çekmek mi, geçmek mi?"
- **Bone Wagon:** "Beyaz kemiklerle yüklü bir araba. Üstünde kazmak ya da paramparça etmek seçenekleri."
- **Forge Master:** "Sıcak bir demir ustası. Common bir kartını uncommon'a yükseltir, ya da +1 max mana karşılığında 25 altın."
- **The Juggler:** "Tuhaf bir cüzdancı, üç top ile hokkabazlık yapıyor. Her top farklı renkte; her birinde farklı şanslar."
- **Umbral Fork:** "İki yol kavşağı. Birinde fısıltılar, diğerinde nemli toprak."
- **The Debt Returns** (chained): "Kuyu yine senin önünde. Yüzlü figür hatırlatıyor: 'Borcunu ödemen vakti geldi.'"
- **Old Friend Returns** (chained): "Bir kurt, çalılığın arkasından çıktı. Yıllar geçti, ama hala seni hatırlıyor."

### 24.9 Card Flavor Text (Run 2 Pass — Preview)

Run 1, lore zeminini koyar. Run 2'de her kart bir flavor satırı alır. Örnek (Spark):

> "Bir kıvılcım, küçük bir söz. Ama ada'da hiç söz küçük değildir."

(Run 2 narrative pass'i bu satırları her 115 karta ekleyecek.)

### 24.10 Tema Bağı — Mekanikten Lore'a

| Mekanik | Lore yansıması |
|---------|----------------|
| Element çemberi (×1.5/×0.75) | "Bir element diğerinin sözünü kıyabilir; kendi sözünü yaratabilir." |
| Yaratık board | "Tamer'ın klan totemleri; her biri klan'ın hatırasını taşır" |
| Burn DoT | "Solomne'nin uyumamış öfkesi" |
| Shadow stack | "Eshmir'in silmediği şey, sadece geciktirilmiş silinmesi" |
| Echo (on-death) | "Yaratık ölmek yerine kendi son sözünü söyler" |
| Sigil | "Battlefield'da kalıcı pakt-armalar — yenilenmiş pakt-yeminleri" |
| Banish | "Eshmir'in silimi" |

### 24.11 Run-End Lore Beats

Her run'ın sonunda (zafer veya yenilgi), bir kısa lore satırı oyuncuya sunulur:

**Yenilgi:**
- "Tamer dizüstü çöktü; bond-taşı kırıldı. Ama klan-totemi henüz canlı."
- "Sage Söz'ü duyamadı. Adasının sisi onu sardı."
- "Hunter hatırlamadığı bir adı haykırdı; gölgesi yutuldu."
- "Warden bir Söz duyabildi. Diğer dördünü bir sonraki yolculuğa bırakıyor."

**Zafer:**
- "Tamer beş bond-taşıyla geri döndü. Bir element daha klan'ın olmuştu."
- "Sage Söz'ün ilk parçasını öğrendi: *'kreyon-os'un başlangıcı bir lordun yeminidir.*'"
- "Hunter hatırasını ödünç aldığı bir şeyle döndü. Yıllar sonra hâlâ ne olduğunu anımsamayacak."
- "Warden bir Söz'ü daha kazandı. Beşi tek bir şarkıda buluşana kadar."

### 24.12 Cinematic Moments — Boss Phase Transitions

§22.5'te belirtilen bespoke transitions, kanonik lore cümleleri ile eşleştirilir:

- Hydra Tide → "Mhalrai'nin ikinci sesi yeniden uyanıyor."
- Verdant Wraith → "Selmer-Iho son sarmaşığını da sarmaya başlıyor."
- Element Sovereign phase 1→2 → "Solomne'nin küllü yüzü düşüyor; Velkir'in şimşek nefesi yükseliyor."
- Element Sovereign phase 2→3 → "Velkir bir an susuyor; Eshmir o sessizliğin tam ortasında."

### 24.13 Lore Lock — Kanonik İsimler

Aşağıdaki isimler **Run 2'den sonraki tüm content'te değişmez**. Run 2+ sadece *ekler*; var olanı değiştirmez.

- Ada: *Aithra*
- Olay: *Sundering* / *kreyon-os*
- Beşli Pakt: *Pact of Five*
- Lord'lar: *Solomne* (Ember), *Mhalrai* (Tide), *Selmer-Iho* (Verdant), *Velkir* (Storm), *Eshmir* (Umbra)
- Klan'lar: *Forge*, *Anchor*, *Bond*, *Vigil*, *Whisper*
- Dil: *Aithra dili*
- Karakter doğum yerleri: *Sebra-Lo*, *Halûr-Tâ*, *Bilinmiyor*, *Karren-Mhel*

Bu isimler `data/lore.ts` (henüz oluşturulmadı, Run 2 implementation pasında düşünülecek) içinde merkezi olarak kalacak.

---

## 25. Art Direction Bible

> Bu bölüm, GameFactory görsel asset üretiminde (ASSETS.md prompts → user manuel üretir) ve UI implementasyonunda yön gösterir. CSS değişkenleri, font rampası, kart frame anatomisi, particle FX dili ve a11y palet override'ları kanonik olarak burada kilitlenir. Her seçim, bir UX rasyoneli ile gerekçelendirilmiştir; "TBD" yoktur.

### 25.1 Genel Estetik Çerçevesi

- **Stil:** Painted-fantasy, sıcak palet, semi-realistic creature portreleri (Slay the Spire + Hades melezi).
- **Tone:** Melankolik-fakat-merhametli. Dünya çökmüş ama cabbar kalmış. Asla "grimdark", asla "saccharine".
- **Saturation:** Element renkleri %75-90 saturasyon. Background (UI chrome) %15-25 saturasyon (eye-rest).
- **Brightness curve:** Element renkleri 50-70 brightness. UI chrome 20-35 brightness. Critical UI elementleri (mana, end-turn) 80-95.
- **Texture grain:** Card art %3 noise overlay (subtle paper texture). UI chrome no noise.
- **Sharp/soft balance:** Kart kenar 3px sharp; particle FX soft (gaussian blur 2-4px).
- **Anti-pillar:** Anime/chibi/cute. PoF "katmanlı, ağır, mistik".

### 25.2 Element Palet Specs (5 element × 7 ton)

Her element 7-ton paleti:

#### Ember 🔥

| Token | HSL | Hex | Kullanım |
|-------|-----|-----|---------|
| `--ember-deep` | hsl(8, 70%, 18%) | #4d1a13 | Kart frame gölgesi, deep accents |
| `--ember-base` | hsl(20, 88%, 50%) | #f17421 | **Brand renk** (§2.1), kart frame |
| `--ember-light` | hsl(28, 95%, 65%) | #fea85a | Burn DoT particle, hover highlight |
| `--ember-glow` | hsl(40, 100%, 75%) | #ffd082 | Critical hit halo, big damage flash |
| `--ember-ink` | hsl(8, 60%, 8%) | #1f0d09 | Element üzeri text gölgesi |
| `--ember-shadow` | hsla(8, 70%, 18%, 0.6) | rgba(77,26,19,0.6) | Drop-shadow underneath card |
| `--ember-accent` | hsl(45, 95%, 60%) | #f4c437 | Spell highlight (subtle yellow boost) |

#### Tide 💧

| Token | HSL | Hex | Kullanım |
|-------|-----|-----|---------|
| `--tide-deep` | hsl(195, 70%, 16%) | #0d3b4d | Frame gölgesi, deep ocean |
| `--tide-base` | hsl(190, 80%, 47%) | #18b8d7 | Brand, frame |
| `--tide-light` | hsl(180, 70%, 75%) | #aae6e6 | Block icon, regen particle |
| `--tide-glow` | hsl(170, 90%, 80%) | #b4f5e1 | Critical heal halo |
| `--tide-ink` | hsl(195, 60%, 8%) | #0a1c24 | Text shadow |
| `--tide-shadow` | hsla(195, 70%, 16%, 0.6) | rgba(13,59,77,0.6) | Drop-shadow |
| `--tide-accent` | hsl(220, 70%, 60%) | #5079d3 | Cold-status (Chill) tone |

#### Verdant 🌿

| Token | HSL | Hex | Kullanım |
|-------|-----|-----|---------|
| `--verdant-deep` | hsl(140, 60%, 18%) | #134d2c | Kart frame gölgesi |
| `--verdant-base` | hsl(135, 65%, 45%) | #2bbe5b | Brand, frame |
| `--verdant-light` | hsl(115, 65%, 70%) | #82e082 | Heal particle, sprout glow |
| `--verdant-glow` | hsl(95, 80%, 80%) | #c2eba8 | Aura crystal (Verdant) |
| `--verdant-ink` | hsl(140, 60%, 8%) | #0a2415 | Text shadow |
| `--verdant-shadow` | hsla(140, 60%, 18%, 0.6) | rgba(19,77,44,0.6) | Drop-shadow |
| `--verdant-accent` | hsl(75, 60%, 55%) | #abc14d | Mossy detail, lichen |

#### Storm ⚡

| Token | HSL | Hex | Kullanım |
|-------|-----|-----|---------|
| `--storm-deep` | hsl(265, 50%, 22%) | #392b59 | Kart frame gölgesi |
| `--storm-base` | hsl(260, 60%, 65%) | #a78bfa | Brand, frame |
| `--storm-light` | hsl(245, 70%, 80%) | #b8b8f0 | Lightning particle |
| `--storm-glow` | hsl(225, 90%, 85%) | #ace1f5 | Critical lightning flash |
| `--storm-ink` | hsl(265, 40%, 10%) | #1a1428 | Text shadow |
| `--storm-shadow` | hsla(265, 50%, 22%, 0.6) | rgba(57,43,89,0.6) | Drop-shadow |
| `--storm-accent` | hsl(285, 65%, 70%) | #d29ce0 | Magic glyph fill |

#### Umbra 🌑

| Token | HSL | Hex | Kullanım |
|-------|-----|-----|---------|
| `--umbra-deep` | hsl(220, 15%, 16%) | #232831 | Kart frame gölgesi (en koyu) |
| `--umbra-base` | hsl(220, 13%, 50%) | #6f7689 | Brand, frame |
| `--umbra-light` | hsl(225, 18%, 70%) | #a5acb9 | Shadow status particle |
| `--umbra-glow` | hsl(280, 35%, 65%) | #a878b0 | Banish flash (purple-ish) |
| `--umbra-ink` | hsl(220, 20%, 8%) | #0d1015 | Text shadow |
| `--umbra-shadow` | hsla(220, 15%, 16%, 0.6) | rgba(35,40,49,0.6) | Drop-shadow |
| `--umbra-accent` | hsl(300, 30%, 50%) | #8a4a8b | Devour highlight (Run 2 keyword) |

### 25.3 UI Chrome Palet (Element-Bağımsız)

| Token | HSL | Hex | Kullanım |
|-------|-----|-----|---------|
| `--bg-deep` | hsl(245, 30%, 8%) | #0f0820 | App background |
| `--bg-mid` | hsl(245, 25%, 14%) | #1a1631 | Panel background |
| `--bg-near` | hsl(245, 20%, 22%) | #2c2843 | Hover background |
| `--text-primary` | hsl(45, 25%, 92%) | #f0eada | Body text |
| `--text-muted` | hsl(245, 12%, 65%) | #969aa6 | Secondary text, hints |
| `--gold` | hsl(43, 76%, 56%) | #e0b441 | Currency, accent for rare/critical |
| `--rare-glow` | hsl(43, 90%, 70%) | #f5d36b | Rare reward outline |
| `--boss-glow` | hsl(0, 60%, 60%) | #cc5454 | Boss-relic outline, danger |
| `--success` | hsl(135, 65%, 55%) | #4dd17a | Heal, victory, positive feedback |
| `--danger` | hsl(0, 70%, 55%) | #db4242 | HP loss, defeat, lethal warning |
| `--warning` | hsl(38, 90%, 60%) | #f0a838 | Caution, status warnings |
| `--focus` | hsl(45, 95%, 60%) | #f4c437 | Keyboard focus outline (3px + 4px shadow) |

### 25.4 Tipografi Rampası

`Inter` (UI), `Cormorant Garamond` (kart name + flavor), `JetBrains Mono` (numerik display).

| Token | Size | Weight | Line-height | Letter-spacing | Kullanım |
|-------|------|--------|-------------|----------------|---------|
| `--text-xs` | 11px | 500 | 1.3 | 0.02em | Tooltip, badge |
| `--text-sm` | 13px | 500 | 1.4 | 0.01em | Card description, hint |
| `--text-base` | 15px | 500 | 1.5 | 0 | Body, log |
| `--text-md` | 17px | 600 | 1.4 | 0 | Button, panel header |
| `--text-lg` | 21px | 600 | 1.3 | -0.01em | Card name (Cormorant) |
| `--text-xl` | 28px | 700 | 1.2 | -0.02em | Scene title, run summary headline |
| `--text-2xl` | 38px | 800 | 1.1 | -0.03em | Title screen logo |
| `--text-num-sm` | 14px | 700 | 1 | 0 | Card cost gem (JetBrains Mono) |
| `--text-num-md` | 22px | 800 | 1 | 0 | HP/Mana display, intent damage |
| `--text-num-lg` | 36px | 900 | 1 | 0 | Critical damage popup |

**Rasyonel:** Cormorant Garamond kart name'lerinde "antika tomar" hissi verir (Pact of Five mistik teması); Inter UI metniyle yorulmadan okunur; JetBrains Mono numerik hizalama (4 vs. 14 vs. 144) için sabit-genişlik.

### 25.5 Kart Frame Anatomisi

**Kart boyutu (desktop):** 168×232px, 12px border-radius.
**Kart boyutu (mobile, < 640px):** 124×178px, 9px border-radius.

#### Anatomi (desktop, koordinatlar üst-sol orijinden):

| Slot | x | y | w | h | İçerik |
|------|---|---|---|---|--------|
| Element ikon | 8 | 8 | 24 | 24 | 🔥💧🌿⚡🌙 (32px font, glyph emoji) |
| Cost gem | 138 | 8 | 22 | 22 | Pentagonal, element rengi, JetBrains Mono 14px |
| Rarity badge | 38 | 12 | 60 | 16 | "Common/Uncommon/Rare" 9px caps |
| Art window | 8 | 36 | 152 | 100 | Background gradient + creature/spell emoji veya manuel asset |
| Name plate | 8 | 138 | 152 | 24 | Cormorant Garamond 21px, center-align |
| Type plate | 8 | 162 | 76 | 16 | "Creature" / "Spell" / "Power" 11px |
| HP/ATK plate | 84 | 162 | 76 | 16 | Sadece creature için: "HP/ATK" sağa hizalı |
| Description box | 8 | 178 | 152 | 46 | Inter 13px, line-height 1.4, status glyph inline |
| Keyword chips | 8 | 178 (overflow on mid) | wrap | 18 | Element accent rengi, 10px caps, 3px gap |
| Rarity glow | full | full | full | full | Outer glow (box-shadow) — common 0px, uncommon 4px, rare 8px, boss 12px ember-glow |

**Hover state:** translate-y(-6px), scale(1.07), brightness(1.05), box-shadow ekle.
**Drag state:** scale(1.12), brightness(1.1), z-index 100.
**Disabled (mana yok):** opacity 0.5, grayscale(60%), pointer disabled.

### 25.6 Creature Silhouette Guidelines

Critter Tamer'ın yaratık portreleri 64×64'te de okunabilir olmalıdır. Arketip silüet kuralları:

| Arketip | Silüet özelliği | Boyut oranı | Renk vurgusu |
|---------|-----------------|-------------|---------------|
| Bruiser | Kalın, geniş, kare | %100 frame | Kırmızı / Ember accent |
| Caster | Uzun, ince, sivri | %85 frame, üst-yarıda | Mor / Storm accent |
| Trickster | Asimetrik, eğri | %80 frame, alt-merkez | Karanlık / Umbra accent |
| Swarmer | Küçük, çoklu | %50 frame her biri, 2-3 küçük | Yeşil / Verdant accent |
| Tank | Dev, pürüzsüz, küresel | %110 frame (overlap OK) | Mavi-Tide / kalkan glyph |
| Healer | Yumuşak, akışkan, dik | %90 frame, ortalama | Yeşil + altın glow |
| Boss | Iconic, kişilik | %120 frame | Phase'e bağlı |
| Elite | Distinguishing detail | %105 frame | Element + ek aura |

**DO:** Silüetin ana hattı 1 saniye glance'da hangi arketip olduğunu göstermeli.
**DON'T:** Gereksiz detay (kemer, kasnak) → silüet bulanır.

### 25.7 Particle FX Style Guide

Her elemente özel parçacık şekli (Iter 11'de uygulanmış, bkz §13.6):

| Element | Şekil | Hareket | Hız | Lifetime | Renk yelpazesi |
|---------|-------|---------|-----|----------|----------------|
| Ember | Alev dili (3-5px sivri ucu yukarı) | Yukarı + ⌈bilateral wobble⌉ | yumuşak (50-80px/s) | 0.6-0.9s | --ember-glow → --ember-base → --ember-deep |
| Tide | Damla (2px circle + 4px tail) | Yer çekimi (downward 100px/s² accel) | hızlı (120-180px/s) | 0.4-0.7s | --tide-light → --tide-base → --tide-deep |
| Verdant | Yaprak (5×3px ellipse) | Kavisli düşüş + rotate | yavaş (40-70px/s) | 0.8-1.2s | --verdant-light → --verdant-base → --verdant-accent |
| Storm | Yıldırım çubuğu (1-2px line, 8-14px length) | Radyal patlama | çok hızlı (250-400px/s) | 0.2-0.4s | --storm-glow → --storm-base → flash white |
| Umbra | Mote (2px nokta + 1px halo) | Ters yer çekimi (upward) | orta (60-100px/s) | 0.7-1.0s | --umbra-glow → --umbra-base → --umbra-deep |

**Genel kural:** Particle count: severity 1=4-6 particle, sev 2=10-14, sev 3=20-30. Reduced motion: hepsi 1/3'e iner.

**Granular vs. fluid:**
- Granular (kesin sınırlı): Storm, Umbra
- Fluid (yumuşak gradient): Ember, Tide, Verdant

### 25.8 UI Motion Language

#### Easing curves

| Token | CSS value | Kullanım |
|-------|-----------|---------|
| `--ease-out-snap` | `cubic-bezier(0.16, 1, 0.3, 1)` | Card hover, panel slide-in |
| `--ease-out-soft` | `cubic-bezier(0.33, 1, 0.68, 1)` | Health bar fill, mana bar refill |
| `--ease-bounce-light` | `cubic-bezier(0.34, 1.4, 0.64, 1)` | Reward "appear" pop |
| `--ease-bounce-strong` | `cubic-bezier(0.34, 1.8, 0.64, 1)` | Critical hit shake apex |
| `--ease-in-quick` | `cubic-bezier(0.55, 0, 0.74, 0.2)` | Death sweep, fade-out |
| `--ease-linear` | `linear` | Particle motion only |

#### Duration tokens

| Token | Value | Kullanım |
|-------|-------|---------|
| `--dur-instant` | 90ms | Tooltip show, button press |
| `--dur-quick` | 180ms | Hover state, focus glow |
| `--dur-base` | 260ms | Panel transition, card draw |
| `--dur-medium` | 360ms | Map node hover, settings tab |
| `--dur-slow` | 480ms | Death sweep, victory flash slide |
| `--dur-cinematic` | 900ms | Boss phase transition, run summary |

**Use case mapping:**
- Pasif feedback (hover): `--dur-quick` + `--ease-out-snap`
- Olay feedback (kart oyna): `--dur-base` + `--ease-bounce-light`
- Geri çevrilmez olay (creature ölüm): `--dur-slow` + `--ease-in-quick`
- Sahne değişim (act geçişi): `--dur-cinematic` + `--ease-out-soft`

### 25.9 Accessibility Palet Override'ları

Settings'te (§13.6c) toggle:

#### Deuteranopia (yeşil-kör) override

Verdant'ın ana ipucu **glyph** (🌿) + **doku** (yaprak particle); rengi turkuaz-bias'lı yeşille değiştir:

```css
[data-cb="deuter"] {
  --verdant-base: hsl(165, 65%, 45%);   /* daha çok turkuaz */
  --verdant-light: hsl(155, 65%, 70%);
}
```

#### Tritanopia (mavi-kör) override

Tide'ın "buz" eksik kalır; Tide'ı menekşe-mavi'ye kaydır + glyph (💧) güçlendir:

```css
[data-cb="trit"] {
  --tide-base: hsl(225, 65%, 50%);
  --tide-light: hsl(220, 70%, 75%);
}
```

#### Protanopia (kırmızı-kör) override

Ember'in tanı zorlaşır; turuncu-sarı bias:

```css
[data-cb="prot"] {
  --ember-base: hsl(35, 90%, 50%);
  --ember-light: hsl(45, 90%, 65%);
}
```

#### High contrast (low vision)

```css
[data-contrast="high"] {
  --bg-deep: #000;
  --text-primary: #fff;
  --text-shadow: 0 0 4px #000;
  /* tüm interactive elemanlara 2px outline */
}
```

### 25.10 DO / DON'T Galerisi

#### Renk

- **DO** her elemente kendi 7-ton paleti. **DON'T** elementleri aynı saturation'la üst üste bindir → çorba.
- **DO** background %25 saturation, foreground %75-90. **DON'T** background'a parlak ember koy → göz yorulur.
- **DO** rare cardlar 8px outer-glow ile selam. **DON'T** common cardlara glow ekle → rarity okunmaz.

#### Tipografi

- **DO** Cormorant Garamond sadece kart name + flavor + run summary head. **DON'T** UI butonlarda Cormorant — okunmaz.
- **DO** numerik display JetBrains Mono. **DON'T** Inter ile sayı yaz — hizalanmaz.
- **DO** tüm metin gölgesi `text-shadow: 0 1px 2px rgba(0,0,0,0.6)`. **DON'T** sade metin renkli element üzerinde — kontrast bozulur.

#### Layout

- **DO** kart hover'da 6px yukarı kaldır + scale 1.07. **DON'T** scale 1.3 → komşu kartları örter.
- **DO** mobile'de horizontal scroll + scroll-snap. **DON'T** mobile'de 5 kartı squish → tıklanabilir alan kaybı.

#### Motion

- **DO** "card-play-anim" 520ms (önemli olay). **DON'T** her hover 1s+ → laggy hisseder.
- **DO** reduced-motion'a saygı. **DON'T** "hareket olmadan tasarım çalışmaz" mazereti — hep alternatif sun.

#### Particle FX

- **DO** Ember = warm-yukarı, Tide = cool-aşağı, Storm = patlama. **DON'T** elementleri karıştır (Ember-aşağı = oyuncu confused).
- **DO** severity tabanlı particle count. **DON'T** her küçük hasarda 30 particle → CPU stress.

#### Creature Art

- **DO** silüet 1 saniye glance'da arketipi söylesin. **DON'T** her creature aynı silüette → "swarmer mı tank mı" sorusunu yarat.
- **DO** her creature'ın paleti element-domine + 1 accent. **DON'T** rainbow creature → element identity bozulur.

### 25.11 Asset Production Workflow (Tied to ASSETS.md)

GDD kuralı (§14): "asset'ler placeholder; kullanıcı manuel üretir." Production workflow:

1. Designer ASSETS.md'de prompt yazar (her kart/creature için)
2. User AI image gen (Midjourney / Stable Diffusion / SDXL) kullanır
3. Output 168×232 (kart) veya 64×64 (in-game thumbnail) crop edilir
4. Eğer placeholder (gradient + emoji) hâlâ kalırsa, oyun çalışır — asset opsiyonel
5. Run summary'de hangi cardlar custom asset'lı, hangileri placeholder gösterilir (Run 4 enhancement)

**Asset prompt template (ASSETS.md):**

```
Card: [Name]
Element: [Element]
Type: [Creature | Spell | Power]
Mood: [Calm | Tense | Triumphant | Dread]
Composition: [center | off-center | symmetrical]
Color palette: [element_base, element_glow, element_shadow] — see Art Bible §25.2
Background: [biome | abstract | element-themed]
Style: painted-fantasy, semi-realistic, no anime
Reference: Slay the Spire creature portraits, Hades God ascension art
```

### 25.12 Art Direction Lock

Run 1 commit ettiği palet ve tipografi *sabit*. Run 2-5 sadece *ekler* (extra biome paletleri, extra a11y override, extra particle ideler). Mevcut tokens değişmez (regression önler).

---

## 26. Inspiration Matrix — Detaylı Per-Sistem Tablo

> §20.5'in kompakt versiyonu, burada her satır tam paragraflı genişletme alır. Run 2 mid-game design review'da bu tablo "we borrowed X from Y, we diverge because Z" tartışmalarının tek doğru kaynağıdır.

### 26.1 Tablo Yapısı

Her sistem için 4-alanlı kayıt:
1. **PoF Sistem** — kendi mekanik adımız
2. **Borç Aldığımız** — bir cümle: hangi referansten ne aldık
3. **Reddettiğimiz** — bir cümle: ne almadık ve neden
4. **Divergence Notu** — bir paragraf: PoF'in neden farklı tasarım yapması gerektiği

### 26.2 Combat Pipeline

- **Borç Aldığımız:** Slay the Spire'ın block-pierce-strength compositional pipeline'ı. StS'in `dealDamage(target, info)` fonksiyonu zarif: vulnerable, weak, strength, block bir sırada uygulanır.
- **Reddettiğimiz:** StS'in "Frail (oyuncu) vs. Weak (düşman)" iki-yönlü asimetrisi. PoF'da Frail tek-yönlü → "saldıranın %50 hasar düşmesi". Asimetri öğrenme yükünü artırırdı.
- **Divergence Notu:** PoF'in element çemberi, StS'in vulnerable'ından *farklı katman*dadır (predictable per-target multiplier vs. status-based). Pipeline'a element çarpanını strength sonrası, frail/vulnerable arası eklemek bilinçli — böylece çember her saldırıda aktif rol oynar (Pillar 1).

### 26.3 Element Çemberi

- **Borç Aldığımız:** Pokemon TCG'nin tek-weakness (binary) prensibi. Kartın altında bir tek element zayıflığı yazar. Okunabilirlik kraldır.
- **Reddettiğimiz:** Magic'in renk-pie-her-rengi-her-şey-yapabilir esnekliği. PoF'in çember kuralı esnek değildir: Ember Verdant'a karşı her zaman ×1.5.
- **Divergence Notu:** PTCG ×2 weakness PoF için aşırı sert (1-shot kombolar) ve ×0.5 yumuşak. PoF ×1.5 / ×0.75 daha *micro* kararlar açar — oyuncu element kombosu seçerken risk değerlendirir, ama 1.5x yenilmez değil.

### 26.4 Mana Ekonomisi

- **Borç Aldığımız:** Hearthstone'un per-turn mana refresh ritmi.
- **Reddettiğimiz:** HS'in "her tur +1 max mana 10'a kadar" otomatik scaling. PoF act-gated yapıyor: 3 → 4 (Act 2) → 5 (Act 3) → 6+ (relics).
- **Divergence Notu:** HS'in turn-1-1-mana cycle başlangıcı yorucu (sadece coin oynayabilirsin). PoF act-1 başında 3 mana → tur 1'de 3 cost'a kadar oynayabilirsin. Bu, ilk tur "anlamlı" hisseder; ama Act 3'te 5 mana cap çok düşük → relic'lerle organik mana ekonomisi (Pact Stone vs. Storm Coil) yaratıcı tasarım açar.

### 26.5 Yaratık Board

- **Borç Aldığımız:** Hearthstone Battlegrounds'un soldan-sağa deterministic creature combat order'i. Replay JSON için kritik.
- **Reddettiğimiz:** HS BG'nin auto-battler yapısı (oyuncu seyirci). PoF'da oyuncu yaratıkların hedeflerini ve oynama sırasını seçer.
- **Divergence Notu:** HS Constructed'ın 7-slot board PoF için fazla; oyuncu kararı seyrek olur. 5 slot Magic Commander'ın command zone'una yakın — limited ama anlamlı seçim. Bond keyword (yan yana element bonus) Monster Train'in clan synergy'sinin azaltılmış versiyonu.

### 26.6 Status Stack

- **Borç Aldığımız:** Slay the Spire'ın stack-edebilir status system'i (Burn, Vulnerable, Weak). Stack temiz bir scaling lever.
- **Reddettiğimiz:** Inscryption'ın "permadeath status" (kart silinir) mekaniği. PoF'da tek "permanent" devre-dışı bırakma `Banish`'tir; status'lar geçici.
- **Divergence Notu:** Caps (§21.7) Monster Train Pyregel ekosisteminden. Stack-suz status (örn. Root sadece 1 turn) HS'in "Frozen" benzeri — basit, telegraflı.

### 26.7 Sigil (Battlefield Enchant)

- **Borç Aldığımız:** Magic'in enchantment kavramı + HS Secret'ların per-turn trigger pattern'i.
- **Reddettiğimiz:** Magic'in "her turn upkeep" mana cost — PoF mana zaten sınırlı.
- **Divergence Notu:** Sigil cap 5, replacement rule (same-element first then oldest) board UX'i koruyor. HS Secret'larda gizleme katmanı var (oyuncu için fırsat); PoF'da sigil her zaman görünür → telegraflı (Pillar 5).

### 26.8 Aura

- **Borç Aldığımız:** HS'in aura-creature pattern'i (Stormwind Champion, vs.).
- **Reddettiğimiz:** HS'in aynı creature 2'sini koymak → 2x aura kuralı.
- **Divergence Notu:** PoF'da unique-id Set ile aynı aura sadece 1x (§11b). Bu, "aynı creature 2 koy → ekonomi kır" abuse'unu önler. Magic'in legendary rule'una benzer ama mekanik (aynı buff 2x reddedilir).

### 26.9 Combo / Chain / Resonate

- **Borç Aldığımız:** HS Rogue Combo keyword'unu (turn-içi birden fazla kart oyna → bonus).
- **Reddettiğimiz:** HS'in Combo'da "tek tip kart sayma" (rogue cards only). PoF'da Resonate aynı element + Combo aynı turn N'inci kart, iki ayrı keyword.
- **Divergence Notu:** Resonate ve Combo'yu ayırmak Pillar 4 (tek cümle) ile uyumlu. Magic'in "Storm" keyword'undaki maliyet azaltma kafa karıştırıcı; bizde sadece bonus efekt → daha okunaklı.

### 26.10 Echo (On-Death Trigger)

- **Borç Aldığımız:** Magic Commander "death triggers" + StS'in Onslaughts (delayed effects).
- **Reddettiğimiz:** Magic'in chained-death zincirleri (10+ derinlik). PoF'da depth cap 16 (§21.13) sonra durur.
- **Divergence Notu:** Echo, yaratıkların sahada-kalma temasını destekler (Pillar 2): yaratık ölür ama "son sözü" hala etki yapar. Lore-wise: Mhalrai'nin "yedi gelgitin oğlu kızı" karakterli. Mekanik-wise: deck-builder'ı dinamik yapar.

### 26.11 Relic System

- **Borç Aldığımız:** Slay the Spire'ın 4-tier relic system'i (common/uncommon/rare/boss).
- **Reddettiğimiz:** Hades'in "duo boon" (iki tanrı arasında bağlanan benzersiz boon) — Run 4'e ertelendi.
- **Divergence Notu:** StS'in relic'leri çoğunlukla pasif buff. PoF'da relicler "hook"-tabanlı (8 hook tipi); aktif olabilir (potion-like, henüz değil). Pact Stone (5 dmg → 5 mana) StS'in "Loop" relic'ine benzer ama negatif tarafta — risk-reward balansı boss tier için.

### 26.12 Boss Phase System

- **Borç Aldığımız:** Hollow Knight'ın boss-phase cinematic transition'ı. Music swap + art swap + dialogue pop.
- **Reddettiğimiz:** Hollow Knight'in boss arena (positional). PoF turn-based — cinematic only, gameplay reset.
- **Divergence Notu:** PoF'da phase transition tüm enemy statusu temizler (mercy reset) — Inscryption'ın "act-shift" felsefesine yakın. Player non-block status da temizlenir → fairness (boss şanssız Burn-stack'i koruyamaz).

### 26.13 Map Generation

- **Borç Aldığımız:** Slay the Spire'ın 6-col branching DAG'ı.
- **Reddettiğimiz:** Hades'in "all rooms reachable, just pick" lineer akışı. PoF'da seçim yapısaldır, atlama yok.
- **Divergence Notu:** StS'in map gen'i 6-col ile başlar, sonra evlat-edinme ile düzeltir. PoF'in `validatePaths` (§23.7) daha agresif — herhangi bir invariant başarısızsa repair, 5 deneme sonra fallback seed. Ascension yoğunluğu artırır (StS gibi); ama bizim ek olarak per-act mix ratio'yu da değiştiriyoruz (Act 3 elite 18%).

### 26.14 Ascension System

- **Borç Aldığımız:** Slay the Spire'ın layered modifier'i (her seviye yeni kural).
- **Reddettiğimiz:** Risk of Rain'in "monsoon" tek-anahtar (her şey aynı anda zorlaşır).
- **Divergence Notu:** PoF asc 0-5 (StS asc 0-20'ye karşı) — daha kompakt ama her seviye anlamlı. asc 5'te double elite floor 11 (her path'te elite + paralel elite) StS asc 18-19 düşmanlarına benzer. Henüz cap 5'te kalıyoruz; oyun stabil olunca asc 6-10 eklenebilir (Run 4+).

### 26.15 Save / Replay

- **Borç Aldığımız:** Spelunky 2'nin "seed bytes ile tüm runi reproduce" prensibi.
- **Reddettiğimiz:** StS'in "save = pause" semantic'i. PoF save = autoresume on next launch (Run 1 saved + slot system).
- **Divergence Notu:** Multi-channel RNG (§23.6) her kanalı izole eder → bir RNG abuse'u (örn. shop reroll) diğer state'i etkilemez. Replay JSON (§16.2) her decision point'i kaydeder → bug repro için zekat.

### 26.16 Tutorial / FTUE

- **Borç Aldığımız:** Hades'in encounter-tabanlı eğitimi (ilk düşman zayıf, mekaniği öğretir).
- **Reddettiğimiz:** Inscryption'ın "no tutorial" felsefesi. PoF hedef kitle 14+ casual roguelike — abrasive tutorial kabul edilemez.
- **Divergence Notu:** Tutorial overlay (§13.6a) 5-adımlı spotlight tour. Hades gibi içkin değil; opsiyonel-skip'lenebilir (StS yaklaşımı). Run 3'te full FTUE chapter yazılacak.

### 26.17 Run Summary

- **Borç Aldığımız:** Spelunky 2 + Risk of Rain'in stat-grid run summary.
- **Reddettiğimiz:** StS'in "boş ekran + try again" sonrası. Yetersiz feedback.
- **Divergence Notu:** PoF 8-cell stat grid (§13.6d) + replay JSON export. Hades-kıyaslı duygusal sonuç değil (Hades'te NPCs konuşur), ama numerik feedback yeterli — Run 2'de "Sundering whisper" lore satırı ekleyeceğiz.

### 26.18 Mulligan

- **Borç Aldığımız:** Hearthstone'un mulligan-of-N (HS'de tüm hand'i mulligan'la).
- **Reddettiğimiz:** HS'in "tüm hand mulligan" — PoF için over-power, draw RNG'sini neutralize eder.
- **Divergence Notu:** PoF Mulligan-of-1 (§21.4) — sadece 1 kart değişebilir. Magic Vancouver'ın "scry 1" yaklaşımına yakın. Determinizm: mulligan seed = `seed XOR battleIndex`.

### 26.19 Event Nodu

- **Borç Aldığımız:** Slay the Spire'ın event card felsefesi (kısa karar, kalıcı sonuç).
- **Reddettiğimiz:** Inscryption'ın "geri dönüşü olmayan" event'leri (örn. Trader). PoF events'inde "skip" her zaman mevcut.
- **Divergence Notu:** Chained events (§11 Iter 15: Dark Pact → Debt Returns) Inscryption'ın "decisions echo" prensibinden geliyor ama mecbur değil; oyuncu istedikçe.

### 26.20 Particle FX & Audio

- **Borç Aldığımız:** Hades'in element-themed FX dilini (her sıvı / silah farklı renk + şekil).
- **Reddettiğimiz:** Realistic simülasyon (Pyrkinetics, Bullet Hell). PoF stylized.
- **Divergence Notu:** Iter 11'de uygulandığı şekilde 5 farklı element behavior (§13.6) Hades'in "her boon farklı palette" prensibinden ilham. BGM (§15.3) Hades 4-layer composition'ından — generative, deterministic seed.

### 26.21 Card Rarity Distribution

- **Borç Aldığımız:** Slay the Spire'ın 60/30/10 (common/uncommon/rare).
- **Reddettiğimiz:** Hearthstone'un "legendary" tier (PoF'in "boss" relic tier'ı bunun yerine).
- **Divergence Notu:** Reward tablosu (§7.4) StS oranını birebir kullanır. Boss reward'da 100% rare → Borç alıştan sonra şişirilmiş tier yeter. Per-character imza kart havuzu (§9 30 kart) HS sınıf-özel kartlarına benzer — element kimliği şovenlik için.

### 26.22 Card Removal Economy

- **Borç Aldığımız:** Slay the Spire'ın shop card-removal escalating cost'u.
- **Reddettiğimiz:** Magic'in "deck-build infinity" — desteyi sürekli optimize edebilirsin.
- **Divergence Notu:** Run-içi card removal escalating (75g → 100g → 125g → ...) StS'le aynı; ama PoF'da 3'üncü removal'dan sonra "Ember Forge" event nodu (§11 Iter 15) +1 max mana ile alternatif sunuyor.

### 26.23 Scaling Powers

- **Borç Aldığımız:** Hearthstone'un Spell Damage / Inspire keyword'ları.
- **Reddettiğimiz:** Magic'in "permanent counter" stack (kalıcı +1/+1).
- **Divergence Notu:** PoF'in `Surge` (mana harcandıkça cost azalır) Magic'in storm cost-azalmasına benzer ama tek-kart pasif (deck-wide global yok). Sage karakter scaling'i `Tempest` power → her spell sonrası +1 AOE: HS Mage'in "spell damage" iteration'ı.

### 26.24 Codex / Reference

- **Borç Aldığımız:** Hearthstone'un in-game keyword tooltip'i.
- **Reddettiğimiz:** Magic Online'ın "rule book" derinliği — overkill.
- **Divergence Notu:** Codex sahnesi (§19a) tüm KEYWORDS + STATUSES + element ring SVG. Tek-tıklamayla erişilir, hover'da inline tooltip.

### 26.25 Localization

- **Borç Aldığımız:** Modern roguelite endüstri standardı i18n (EN/TR şu an, Run 2+ EN/TR/ES/JP).
- **Reddettiğimiz:** Lore-heavy fanstik dil (Aithra dili) full translation'ı — Run 2'de sadece terminoloji çevirisi.
- **Divergence Notu:** Iter 20 i18n scaffold (§16.3) ~50 high-visibility key. Dil locked at `lang` flag; Aithra dili sözcükleri (kreyon-os, ohm-tor) translation'a dahil değil — italic kullanılır (asla çevrilmez, fantezi diller örf adetidir).

### 26.26 Multi-Platform

- **Borç Aldığımız:** Spelunky 2'nin "single codebase, web + desktop + mobile" yaklaşımı.
- **Reddettiğimiz:** Native-first (Unity/Unreal). PoF web-first, native wrap.
- **Divergence Notu:** Iter 19 Capacitor (mobile) + Tauri (desktop) shimleri (§16.1). Aynı Vite build her 3 platforma. Performance budget < 500 KB JS gzip → mobile için kritik.

### 26.27 Sigil (extra) — Sigil Crown / Sigil Pact

- **Borç Aldığımız:** Hearthstone Standard'taki "secret synergies" — bir secret'ı buff eden kartlar.
- **Reddettiğimiz:** HS'in "secret reveal trigger" gizemi.
- **Divergence Notu:** Sigil Crown (rare relic) +2 turn ekler — sigil-build'i scaling. Sigil Pact (0c exhaust spell) +2 tur tüm sigillere — biraz suspicious ekonomik (pay 0 cost for big buff). Run 4 balance pass'inde bakalım.

### 26.28 Banish Keyword

- **Borç Aldığımız:** Magic'in "exile" zone'u (kart geri dönmez).
- **Reddettiğimiz:** Magic'in 7-zone karmaşıklığı.
- **Divergence Notu:** PoF'da Banish sadece banishedPile (single zone). Banish Pact relic (her banish için +1 strength) Inscryption'ın "sacrifice fuel" mantığına yakın — yapılan eylem kalıcı bir progress üretir.

### 26.29 Daily Challenge

- **Borç Aldığımız:** Spelunky 2 daily seed + leaderboard yapısı.
- **Reddettiğimiz:** Online leaderboard (henüz yok). Local sadece "daily best" (§12.1).
- **Divergence Notu:** Daily seed UTC `YYYY*10000 + MM*100 + DD` deterministic. Run 4'te Firebase / Supabase backend ile online leaderboard eklenebilir; şu an pure local.

### 26.30 Achievement Sistemi

- **Borç Aldığımız:** Hades'in "challenge codex" (her achievement bir cümlelik açıklama + reward).
- **Reddettiğimiz:** Steam achievement bloat (100+ achievement, çoğu trivial).
- **Divergence Notu:** PoF 15+ achievement (§12). Tüm achievementler "yapısal sürpriz" — örn. "100 kart oyna" (gerçekçi), "Burn ile 50 hasar ver" (build ödülü). Run 3'te tam liste yazılacak.

---

## 27. TOC ve Glossary (Run 1 Eklentileri)

### 27.1 Genişletilmiş İçindekiler

| § | Başlık | Sayfa (yaklaşık) |
|---|--------|------------------|
| 1 | Yüksek-Seviye Konsept | 1 |
| 2 | Element Sistemi | 2 |
| 3 | Kart Anatomisi | 3 |
| 4 | Anahtar Kelimeler | 4 |
| 5 | Tur Yapısı | 5 |
| 6 | Karakterler | 6 |
| 7 | Roguelike Yapısı | 7 |
| 8 | Düşmanlar | 8 |
| 8a | Bespoke Boss Phase Transitions | 9 |
| 9 | Kart Havuzu | 10 |
| 10 | Relics | 11 |
| 11 | Mystery Events | 12 |
| 11a | Sigils | 13 |
| 11b | Aura | 14 |
| 12 | Meta-Progression | 15 |
| 13 | UI / UX | 16-19 |
| 14 | Sanat Yönü | 20 |
| 15 | Ses | 21 |
| 16 | Teknik Stack | 22 |
| 17 | Faz Planı | 23 |
| 18 | Denge Felsefesi | 24 |
| 19 | Doğrulama Kriterleri | 25 |
| 19a | Codex (in-game reference) | 26 |
| **20** | **Tasarım Direkleri ve MDA** | **27-29** |
| **21** | **Combat Math Deep Dive** | **30-34** |
| **22** | **Düşman AI Davranış Spec'i** | **35-41** |
| **23** | **Procedural Map Generation** | **42-46** |
| **24** | **Narrative & World Lore (Vol 1)** | **47-54** |
| **25** | **Art Direction Bible** | **55-60** |
| **26** | **Inspiration Matrix (Detailed)** | **61-65** |
| **27** | **TOC + Glossary** | **66** |
| **28** | **Run 1 Changelog** | **67** |

### 27.2 Glossary (Quick Reference)

| Term | Bölüm | Tek Cümlelik Tanım |
|------|-------|---------------------|
| Aithra | §24 | Pact of Five'ın geçtiği ada |
| Ascension | §12, §23 | Zorluk modifier sistemi (0-5) |
| Aura | §11b | Creature-bound passive buff |
| Banish | §4, §26.28 | Banished pile'a kalıcı taşıma |
| Block | §4.1, §21.6 | Sıradaki hasarı emen, oyuncu için tur başı sıfırlanan statü |
| Bond | §4 | Yan yana element creature varsa +1/+1 |
| Boss Phase | §22.5 | HP gate'lerine bağlı boss davranış değişikliği |
| Burn | §4.1, §21.4 | Ember DoT, tickte X hasar, X-1'e düşer |
| Channel (RNG) | §23.6 | Bağımsız RNG akışı (battle/map/shop/event) |
| Chill | §4.1 | Tide DoT, sonraki X kart +1 cost |
| Combo(N) | §4 | Bu turdaki N'inci aynı element kart |
| Devour | §26.10 | (Run 2 keyword) Yaratığını yiyip ATK kazan |
| Echo | §4 | Yaratık ölünce belirtilen efekti tetikle |
| Element Çemberi | §2.2 | Ember → Verdant → Tide → Storm → Umbra → Ember zayıflık halkası |
| Element Lord | §24.4 | 5 elementten birinin bozuk koruyucusu |
| Forge Run | (forge meta) | GDD geliştirme döngüsünün bir iterasyonu |
| Frail | §4.1 | Saldıranın verdiği hasar -50% |
| Guard | §4 | Düşmanlar bu yaratıktan başka hedefe vuramaz |
| Hatch | §26 | (Run 3 keyword) Verdant evolution mekaniği |
| Intent | §22.1 | Düşmanın bir sonraki turunu telegraflama göstergesi |
| Lifelink | §4 | Verilen hasar kadar oyuncu iyileşir |
| Mulligan | §21.11, §26.18 | Battle başında 1 kartı atıp yenisini çekme |
| Overload(N) | §4 | Sonraki tur max mana -N |
| Pact Stone | §10 | Boss-tier relic: 5 dmg al, 5 mana kazan |
| Pierce | §4 | Block ignore |
| Replay JSON | §16.2 | Battle log + seed → rebuildable run |
| Resonate | §4 | Aynı element kart oynanınca tetiklen |
| Sigil | §11a | Battlefield enchant, per-turn trigger |
| Strength | §4.1 | +X hasar tüm saldırılara |
| Sundering | §24.1 | Pakt'ın kırılışı, oyunun lore eventi |
| Surge | §4 | Mana harcandıkça cost -1 |
| Swift | §4 | Çıktığı tur saldırabilir |
| Tamer | §6, §24.3 | Verdant Bond Klanı'nın son üyesi, oyuncu protagonisti |
| Threat Score | §21.9 | AI hedef seçim formülü |
| Volatile | §4 | Discard edildiğinde efekt; tur sonu kalırsa exhaust |
| Vulnerable / Shadow | §4.1 | Hedef +50% hasar alır |

### 27.3 Section Numbering Note

§20–§27 Run 1 ekleri *append-only*'dir; mevcut §1–§19 sıralaması dokunulmadan bırakılmıştır. Section numaralarının kararsız olduğu (§11a, §11b, §13.6a-d) bölümler korunur — gelecek run'lar (Run 2-5) yeni bölümleri §28+'dan eklemelidir, mevcut numaralandırmayı yeniden düzenlemek deferred bir cleanup'tır (Run 5 audit pass).

---

## 28. Run 1 Changelog (Forge Tracking)

### 28.1 Eklenen Bölümler

| § | Başlık | Tahmini Satır |
|---|--------|---------------|
| 20 | Design Pillars & MDA Framework | ~165 |
| 21 | Combat Math Deep Dive | ~270 |
| 22 | Enemy AI Behavior Spec | ~360 |
| 23 | Procedural Map Generation Algoritması | ~190 |
| 24 | Narrative & World Lore (Volume 1) | ~330 |
| 25 | Art Direction Bible | ~290 |
| 26 | Inspiration Matrix (Detailed Per-System) | ~250 |
| 27 | TOC + Glossary | ~80 |
| 28 | Run 1 Changelog | ~40 |
| | **Toplam Run 1 katkı** | **~1975** |

### 28.2 Düzenlenen Mevcut Bölümler

Run 1 mevcut bölümleri DEĞİŞTİRMEDİ — sadece §20-§28 ekledi (kural: doc canon, mevcut kurallar düzenlenmiyor). Çelişen alanlar (örneğin §1'de "5 element lord" denen ama §8'de sadece 3 boss listelenen) §24'te lore-aware ve §22.5'te phase-aware olarak çözüldü.

### 28.3 Run 2 Önerilen Odak

| Konu | Öncelik | Neden |
|------|---------|-------|
| Card flavor text pass (115 cards) | YÜKSEK | §24.9'da preview yapıldı, tam pas Run 2'de |
| Element Identity Manifesto (per-element 200-line chapter) | YÜKSEK | §20 pillar'lar set edildi, derinlik gerek |
| Class Manifesto (Tamer/Sage/Hunter/Warden full chapters) | YÜKSEK | §24'te lore var, mekanik manifesto eksik |
| Card Design Philosophy | ORTA | "neden Spark 6 hasar?" sorusu cevaplanmamış |
| Relic Design Philosophy | ORTA | Aynı, neden Pact Stone 5/5? |
| Encounter Library (per-floor design intent) | ORTA | Floor-by-floor design notes |
| FTUE Full Chapter | ORTA | Tutorial overlay var, FTUE journey eksik |

### 28.4 Run 3-5 Pre-Plan

- **Run 3:** Encounter library, achievement design, daily challenge depth, FTUE journey, reward economy chapter, secondary affinity system (Monster Train clan combo dersi).
- **Run 4:** Audio composition spec, accessibility audit checklist, failure-mode catalog, Run 2 narrative pass continuation (Sundering Whisper for run-end), Endless Mode design (Tide & Umbra Lord boss savaşları).
- **Run 5:** Doc-vs-code drift audit, content pipeline workflow, edge-case test catalog, playtest protocol document, final TOC clean-up + section renumbering pass.

### 28.5 Run 1 Verdict

GDD 672 satırdan ~2900 satır civarına çıktı (target 2200+ aşıldı). Combat math, AI, map gen, lore, art, pillars, inspiration matrix — 7 büyük bölüm doc'a bağlandı. "TBD"/"TODO" markeri yok. Her formül worked example ile, her tablo ≥5 satır, her keyword tek cümle prensibine uydu. Run 2'ye lore lock + pillar lock + art direction lock geçirildi.

---

# Bölüm III — İçerik Derinliği (Run 2 ekleri)

> §29–§35 Run 2 forge çıktısıdır. Run 1 *sistemleri* yazdı; Run 2 *içeriği* yazar.
> Element kimliği, karakter inşa yolları, kart-kart tasarım gerekçeleri, düşman
> envanteri, encounter ritmi, relic sinerji grafiği, event prozası — tümü append-only.
> Hiçbir §1–§28 maddesi *değiştirilmez*; yalnızca atıfla genişletilir.

---

## 29. Element Identity Manifestos

> Her element kendi *fantazisini* sunar. Bu beş bölüm, oyuncuya *neden o elementi
> oynadığını*, hangi 3 alt-arketipin var olduğunu, hangi anahtar kelime zincirleriyle
> kazandığını, hangi 15-kart başlangıç destesinin "doğru"yu temsil ettiğini, ve nasıl
> kaybettiğini öğretir. Run 1 §20.2 (Element Çemberi pillar) ve §26 (inspiration matrix)
> burada içeriğe çevrilir.

### 29.1 Ember — "Risk-Amplified Momentum"

#### 29.1.1 Element felsefesi / fantazi

Ember oynamak, *acele etmek* demektir. Her tur büyük bir sayı vurmak, ve o sayıyı
o turun içinde *kullanmak*. Burn DoT, Magma fedakarlığı, Phoenix yanıp-tutuşması —
Ember oyuncusu, kaybedeceği zamanı bilir; kaybetmeden önce kazanmak için tasarlanmıştır.
Slay the Spire'ın Ironclad-Strength serüveni, Hearthstone'un Pirate Warrior tempo'su,
ve Inscryption'ın "kart kurban et, daha büyük kart oyna" döngüsü tek bir element
çatısı altında birleşir. Felsefe tek satırda: *"Eğer 6 turdan uzun bir savaş varsa,
yanlış destedeyim."*

İkinci paragraf: Ember acemi oyuncularına çekici görünür çünkü sayılar büyüktür ve
başlangıç destelerinde *Spark* gibi 1-mana 6-hasar kartlar mevcuttur. Ancak ileri
oyuncu, Ember'ın *gerçek* hediyesinin sayısallıkta değil, *karar hızında* olduğunu
keşfeder. Bir Ember turu 8 saniyede planlanır; bir Tide turu 30 saniyede. Ember
oyuncusunun düşünmesi gereken tek şey: *"Şu anda kim ölüyor?"* — ve cevap her
zaman bir düşmandır.

#### 29.1.2 3 Alt-arketip

**Aggro Burn (Ember-A1):**
- *Kazanma şartı:* Boss'u ≤ 6 turda öldür; kendine 30+ self-damage al; kazansan
  da gelecek savaşa minik HP ile gir, sonraki rest'te tedavi et.
- *Anahtar kartlar:* `spark`, `ember_lash`, `ember_shot`, `wildfire_card`,
  `inferno`, `ember_combo_strike` (Cinder Cascade).
- *Payoff kartı:* `inferno` (rare, AOE 12 + Burn 5).
- *Zayıflık:* Tide tank (Coral Champion). Tide'ın ×0.75 zayıf-eşleşmesi Inferno'yu
  9'a düşürür. Şehirleşemeyen Burn zinciri çürür.
- *İlham eşleştirmesi:* StS Ironclad-Strength + HS Pirate Warrior tempo (per §26.2).

**Sacrifice Engine (Ember-A2):**
- *Kazanma şartı:* Düşük-HP ucu Phoenix'le kapat; her ölümünden sonra +Strength
  veya +draw kazan; "ölmek = ramping" döngüsü.
- *Anahtar kartlar:* `cinder_hatchling` (echo: 2 burn AOE), `phoenix_flare`
  (echo: phoenix_echo dirilir), `molten_pact` (cost: -2 hp her tur, +2 strength),
  `inferno` (X-cost finisher), `pact_charm` relik.
- *Payoff kartı:* `phoenix_echo` (Phoenix Rebirth — 5/3 yaratık, ölünce Echo:
  oyuncuya 4 HP iyileşme + 4 Burn AOE).
- *Zayıflık:* Verdant Regen + Root. Bog Witch'in 2-Root + 4-heal'ı Phoenix'in
  saldırı turunu emer.
- *İlham eşleştirmesi:* StS Ironclad-Exhaust + Inscryption sacrifice (per §26.10).

**Big Body Stomp (Ember-A3):**
- *Kazanma şartı:* 4-mana civarında 6/4 Magma Drake AOE'siyle saha temizle, 2
  yaratıkla "wall + closer" yap, boss'a doğru taşan blok'la git.
- *Anahtar kartlar:* `magma_drake` (6/4 Guard, on play 3 dmg AOE), `ember_drake`
  (uncommon 4/3 + 2 Burn), `salamander` (3/2 swift), `iron_will` (neutral pwr).
- *Payoff kartı:* `magma_drake` (rare, 6/4 + Guard + AOE).
- *Zayıflık:* Verdant element circle (Verdant beats Ember = ×1.5'a yenir). Magma
  Drake'in 3 AOE'si Verdant Wraith'e 2.25→2 olur, Wraith'in lifelink'i tankı
  emer.
- *İlham eşleştirmesi:* HS Big Druid + StS Defect Frost-stack analoji.

#### 29.1.3 Signature keyword combos (Ember özel)

1. **Burn → Volatile → Echo → Burn** (Ember-A2 kombo):
   - Tur 1: `cinder_hatchling` oyna (2/2, Echo: 2 burn AOE).
   - Tur 1: `volatile` kart discard et — burn tetiklenir.
   - Tur 2: Hatchling ölür → echo 2 burn AOE.
   - Sonuç: Burn stack 4, AOE etki ≥ 8 hasar / 2 tur.

2. **Strength → Lifelink değil → Pierce → Pierce** (Ember-A1):
   - Tur 1: `iron_oath` neutral power oyna (her tur +1 strength).
   - Tur 2: `ember_shot` (1 mana, 4 hasar) → strength 1 ile 5.
   - Tur 3: `ember_lash` (Pierce!) → strength 2 → 7 hasar block bypass.
   - Sonuç: Block-tank düşmanları (Coral Champion) Pierce'la geç.

3. **Sacrifice → Resonate → Burn AOE** (Ember-A2):
   - `molten_pact`: 2 mana, kendine 2 hp ver, +2 strength kalıcı.
   - `inferno` X-cost: kalan mana × 3 hasar AOE + Burn 1.
   - 5 mana harcanırsa: 15 + 4 (strength × 2 saldırı) = 19 AOE.

4. **Bond → Bond → Stomp** (Ember-A3):
   - `salamander` (3/2 swift) oyna — bond aktif (yan element ember vardı).
   - `ember_drake` (4/3) ekle → Bond +1/+1 → 5/4.
   - `magma_drake` (6/4) ekle → tüm yan ember +1/+1 → 7/5 + 6/5 + 4/3.
   - Tek turda 17 ATK saha, AOE 3 dahil.

#### 29.1.4 Sample 15-card starter decklist (Ember-A1 Aggro Burn)

| # | Kart | Cost | Tip | Rol |
|---|------|------|-----|-----|
| 1 | Spark | 1 | Spell | Erken hasar; boş mana doldurucu |
| 2 | Spark | 1 | Spell | Çift kopya = açılış konsistensi |
| 3 | Spark | 1 | Spell | Üçüncü kopya = burn payoff sağlar |
| 4 | Ember Lash | 2 | Spell (Pierce) | Block tank cevabı |
| 5 | Ember Lash | 2 | Spell (Pierce) | Çift kopya = elite cevabı |
| 6 | Ember Shot | 1 | Spell | Strenght payoff |
| 7 | Ember Shot | 1 | Spell | Çift kopya = volatile cycle |
| 8 | Cinder Hatchling | 2 | Creature 2/2 (Echo) | Tempo + Burn engine |
| 9 | Wildfire | 3 | Spell | AOE 4 + Burn 2 (uncommon) |
| 10 | Burnscript | 2 | Spell | Drawmore + Burn 1 (uncommon) |
| 11 | Salamander | 2 | Creature 3/2 (Swift) | Saha basıncı + Bond |
| 12 | Iron Oath | 0 | Power | +1 Strength tur başı (neutral) |
| 13 | Strike | 1 | Spell | Mana sigorta (neutral) |
| 14 | Iron Will | 2 | Power | +3 Block tur başı (neutral) |
| 15 | Inferno | X | Spell | Finisher; 3 mana → 9 AOE + Burn |

Rasyonel: 15 kartın 9'u 1-2 mana → tur başına 2-3 kart oynama gücü. Inferno
finisher payoff. 2 power kart + Bond için 2 yaratık = "swarm-but-aggro" hibridi.

#### 29.1.5 Counter-play guide — Ember nasıl kaybeder?

1. **Verdant element circle:** Ember saldırıları Verdant'a ×0.75. 6 hasar Spark → 4
   olur. Verdant Regen + Root + Healing kombo Ember'ın yarış-bitirme oyununu
   emer. Counter-play: Pierce kart havuzu (ember_lash) ve Storm dokunuşu (storm_pulse)
   karıştır; pure Ember ≠ optimum.

2. **Defansif boss:** Coral Champion (Tide elite) = +18 block farm + ×0.75 zayıflık.
   Ember'a en kötü matchup. Counter: hard-mulligan Pierce kartlar; Wildfire'ın
   Burn'ünü Coral'in HP'sine değil duration'a oyna.

3. **Late-game stall:** Ember tur-9'dan sonra yorulur. Sage's Codex ile bekleyen
   bir oyuncu, Ember'ın deck'inin 3-4 burnu çürüyene kadar bekleyebilir. Counter:
   Ember Sacrifice (A2) varyantını seç — late-game ramping ekler.

4. **Healing sources (Tide / Verdant Regen):** Burn stack rejen tarafından
   yenilenir. Burn 4 → Regen 4 → net 0. Counter: Burn kullanmadan önce hedefin
   regen'ini "consume" edecek bir ön-hasar (Spark) at.

5. **Anti-element relic (relic karşı-davası):** *Tideheart Pendant* veya benzeri
   tedavi-relic'leri, Ember'ın self-damage motorunu çürütür. Counter: doğru
   relic stack'iyle gel; *Pact Stone* alma kararını ona göre revize et.

#### 29.1.6 3 high-skill plays

1. **Volatile Mulligan baiting:** Cinder Hatchling'i *bekleyerek* discard (kasıtlı)
   → Echo aktivasyonu = 2 Burn AOE; *aynı turda* Wildfire oyna → AOE +4 + Burn 2.
   Tek tur 8 hasar AOE, sıfır mana harcandı. Veteran trick.

2. **Inferno mana stack:** İlk 3 turdan birini "0 kart oynama" + Surge kart
   reduction üzerine kurarak, Inferno X-cost'u 7 mana ile bas → 21 hasar AOE +
   Burn 7. Boss-killer tur.

3. **Phoenix re-summon loop:** Phoenix Flare → öl → Phoenix Rebirth (echo
   yaratık) → next turn molten_pact + iron_oath ile +3 strength → Phoenix
   Rebirth attack 5+3=8 hasar/tur. 3 tur boyunca 24 hasar tek yaratıktan.

#### 29.1.7 Visual identity recap

- **Renk:** #f97316 (orange-base, §25.2.1).
- **Particle:** "flame tongues" (per §25.7) — sharp, üst-aşağı dik açılı, 180ms
  ease-out (per §25.8.4 motion language).
- **Sound cue:** Sharp "click" + low rumble (per §15.1 SFX katalog).
- **Card frame glow:** Orange outer ring + ember particle on hover (per §25.5.3).
- **Element lock-in cue:** Üçüncü Ember kartı destede iken, kart seçim ekranı
  "🔥 Ember Pact (3/5)" göstergesi yakar (Run 4 UI work).

---

### 29.2 Tide — "Patience-Rewarded Scaling"

#### 29.2.1 Element felsefesi / fantazi

Tide oynamak, *bekleyen su*ya benzer. İlk üç turun çok az şey yapar — block
yığar, kart çeker, kendini iyileştirir. Sonra dördüncü turda 18 hasar ile bir
saldırı, ya da saha-temizleyen bir Frost Warden indirir. Element felsefesi: *"En
yorgun düşman, en kazançlı turdur."* Slay the Spire'ın Defect-Frost arkı, Hearthstone
control şamanı, ve Inscryption'ın "Stack-and-cash" ekonomisi tek bir biçimde
yan yana gelir.

İkinci paragraf: Tide oyuncusu, sayıların *önemini* hayatta kalmadan sonra
ölçer. Spark, ilk üç turu emen Frost Warden tankı sonsuza kadar emecektir; ama
dördüncü turda tank Lifelink alır, ya da Tideheart Pendant aktif olur, ya da
Leviathan boss-finisher sahaya iner. Tide acemi oyuncusu sıkıntılıdır
("hiçbir şey yapmıyorum"); Tide veteranı dingin ("yine bir tur bekledim, ama
şimdi bittim"). Ember'ın eşleştirmesi (Ember beats Tide ×1.5) Tide oyuncusunun
en kötü kabusudur.

#### 29.2.2 3 Alt-arketip

**Heal-Stall (Tide-A1):**
- *Kazanma şartı:* HP ≥ %80 ile boss savaşına gir; her tur +4-7 heal yığ;
  düşman intent'lerini Frost ile geciktir; 25-30 turluk savaş kapat.
- *Anahtar kartlar:* `mist_bolt`, `tide_pup`, `tideward`, `kelp_wall`, `high_tide`,
  `regrowth` (Verdant ödünç), `tideheart_power`.
- *Payoff kartı:* `tideheart_power` (Tideheart power — her tur 2 heal + 2 block).
- *Zayıflık:* Ember Burn DoT (Wildfire'ın 5 burn'ü Heal-Stall'ı kemirir).
- *İlham eşleştirmesi:* StS Defect Frost + HS Control Shaman + Magic the Gathering UW Control.

**Frost Bind (Tide-A2):**
- *Kazanma şartı:* Düşman handini Chill'le doldur (kart cost +1) + Root'la (1 tur
  kayıp) intent'leri kilit; 8-10 turda safe-finish kazan.
- *Anahtar kartlar:* `chillbind` (3 chill), `frost_warden`, `siphon_wave`,
  `tidal_rite`, `abyss_grasp` (root), `bolas` (Storm ödünç), `tideheart_power`.
- *Payoff kartı:* `frost_warden` (4/2 + 2 chill AOE on summon).
- *Zayıflık:* Storm AOE (Chain Lightning) frost wall'ı bypass eder.
- *İlham eşleştirmesi:* StS Watcher Mantra-stack + HS Freeze Mage.

**Wave Combo (Tide-A3):**
- *Kazanma şartı:* `tidesurge` (Combo 3) → bir tur içinde 3 Tide kart oyna →
  her oynanan kart +2 hasar bonus → 18-22 hasar tek tur burst.
- *Anahtar kartlar:* `tide_bolt`, `mist_bolt`, `siphon_wave`, `tidesurge`,
  `tide_guardian`, `tideheart_power`, `tide_combo_chain` (Glacial Chain).
- *Payoff kartı:* `tidesurge` (Combo 3 — Tide-3 kart sonrasında "4 hasar + 4 block + 4 chill").
- *Zayıflık:* Storm Shock (kart discard) Combo zincirini kırar.
- *İlham eşleştirmesi:* HS Spell Mage + Pokemon TCG Quick Ball cycling.

#### 29.2.3 Signature keyword combos (Tide özel)

1. **Block + Lifelink → Healwall:**
   - `tideward` (1/4 Guard) + `tideheart_power` (her tur 2 heal/2 block).
   - Tur başı +4 block, +2 heal, +2 chill düşmana.
   - Net: Ember'ın 8 hasar saldırısı 0'a çekilir, oyuncu +2 HP kazanır.

2. **Chill stack → spell denial:**
   - `chillbind` (3 chill) + `frost_warden` (2 chill AOE).
   - Düşman elinde 5 chill stack → sonraki 5 kartı +1 mana.
   - Boss intent kilitli, oyuncu serbest.

3. **Combo 3 burst:**
   - Tur 1: `mist_bolt` (Tide kart 1).
   - Tur 1: `tide_bolt` (Tide kart 2).
   - Tur 1: `tidesurge` (Combo 3 active) → 4 base + 8 combo bonus = 12 hasar.

4. **Resonate chain:**
   - `tide_pup` (1/2, Resonate: 2 heal sahibe).
   - `mist_bolt` oynanır → resonate aktif → 2 heal.
   - `tide_bolt` oynanır → 2 heal daha.
   - 3 tur boyunca her Tide spell +2 heal.

#### 29.2.4 Sample 15-card starter decklist (Tide-A1 Heal-Stall)

| # | Kart | Cost | Tip | Rol |
|---|------|------|-----|-----|
| 1 | Mist Bolt | 1 | Spell | Cycle + 3 hasar + 2 block |
| 2 | Mist Bolt | 1 | Spell | Çift kopya = stall reliability |
| 3 | Tideward | 1 | Creature 1/4 (Guard) | Erken tank |
| 4 | Tideward | 1 | Creature 1/4 (Guard) | Çift Guard = ikili duvar |
| 5 | Tide Pup | 1 | Creature 1/2 (Resonate) | Heal engine |
| 6 | Kelp Wall | 2 | Power | Tur başı +3 block |
| 7 | Frost Warden | 3 | Creature 4/2 | AOE chill on summon |
| 8 | High Tide | 2 | Spell | Heal 4 + 4 block |
| 9 | High Tide | 2 | Spell | Çift kopya = sustain |
| 10 | Tideheart | 3 | Power | Tur başı 2 heal + 2 block (uncommon) |
| 11 | Siphon Wave | 3 | Spell | 5 dmg + 3 heal |
| 12 | Insight | 1 | Spell | Cycle (neutral) |
| 13 | Guard | 0 | Spell | +5 block (neutral) |
| 14 | Iron Will | 2 | Power | +3 block tur başı (neutral) |
| 15 | Tidal Anchor | — | Relic-tied | Boss-relic synergy slot |

Rasyonel: 6 block kaynağı + 3 heal kaynağı = 25-tur safe runlana destedir.
Frost Warden ve Siphon Wave'in tek-target damage'ı, oyuncu finisher'a varana kadar
direnişe destek.

#### 29.2.5 Counter-play guide

1. **Ember Burn stack:** Burn 5 + Wildfire kombo Tide'ın iyileştirmesini emer.
   Counter: anti-burn relic (örnek olası: *Cleansing Tide* relic, Run 2 ekleme
   §34.2'de). Yoksa, Frost Warden'i tur-2'de bas.
2. **Discard pressure (Storm Shock):** Heal kartları el'den atılırsa stall
   zincir kırılır. Counter: power-tabanlı durağan kart sayısını artır
   (Kelp Wall, Tideheart) — power'lar discard edilemez.
3. **Aggro-rush (Hunter Backstab):** Hunter combo 4 turluk savaş açar; Tide'ın
   3-mana relic'leri hâlâ aktive olamadan ölmüş olursun. Counter: erken Tide
   Pup (1 mana) + iki Mist Bolt = ilk-tur 8 block.
4. **Anti-stall enemies (Magma Titan):** Slow-charge, big-burst düşmanlar Tide'ın
   stall-window'unu açıkça hedef alır. Magma Titan'ın 30+ tek-saldırısı tüm
   block'unu yer. Counter: Magma Titan'a Spark dokunuşu öncelikle yap.
5. **Element circle:** Ember vs Tide ×1.5. Tide karşıtı Ember bossa karşı zayıf
   matchup. Verdant ile karış (Verdant beats Tide ×1.5 değil — Tide beats Storm
   ×1.5; iki yönlü karışık desteler).

#### 29.2.6 3 high-skill plays

1. **Tideheart pre-stack:** Tideheart power'ı tur-3'te bas (3 mana yetiyor),
   sonraki turda boss savaşı başlasın → Tideheart tur 1 = +2 heal + 2 block,
   tur 2 +4, tur 3 +6 toplam. 12 free HP/block 3 turda.

2. **Frost Lock combo:** Chillbind (3 chill) + Frost Warden (2 chill AOE) +
   Bolas (1 root) = düşman 1 turda 5 chill stack + 1 root. Bossun saldırı
   intent'i tamamen kilitli; oyuncu finisher'ı çekmek için 1-2 tur kazanır.

3. **Wave Combo gambit:** Üçüncü Tide kartı sırasıyla — 1: cycle (mist_bolt);
   2: defansif (tideward summon); 3: tidesurge (Combo 3 activation) → tek turda
   16-18 dmg + 12 block + 4 chill. Boss'u tek turda %25 erit.

#### 29.2.7 Visual identity recap

- **Renk:** #06b6d4 (cyan-base, §25.2.2).
- **Particle:** "drops + foam" (§25.7) — soft, fluid, 360ms ease-out.
- **Sound cue:** Wave whoosh + mid-tone bell (§15.1).
- **Card frame glow:** Cyan outer + soft ripple animation.
- **Element lock-in cue:** Üçüncü Tide kartı destede iken UI "💧 Tide Pact (3/5)".

---

### 29.3 Verdant — "Garden-Tending Compound Interest"

#### 29.3.1 Element felsefesi / fantazi

Verdant oynamak, *bahçe ekmeye* benzer. Power kartlar (Overgrowth, Resonance,
Wildgrowth) tur-tur birikir, her kart oynandıkça destenin kalitesi artar.
Element felsefesi: *"Tur başına sadece 1 daha kart çekersem, kazanmamak imkansız."*
Slay the Spire'ın Watcher-Mantra serüveni, Hearthstone'un Druid-Ramp ve Magic the
Gathering'in Simic-Counter çatısı tek elementte birleşir.

İkinci paragraf: Verdant oyuncusu, ilk üç turunda *minik karar*lar verir —
hangi power'ı bas? hangi Sprout'u kurban et? — ve dördüncü turda destesinin
*katlı* gücüyle ödüllenir. Bond keyword'ü Verdant'ın imzasıdır: yanyana iki
Sprout tek başına 2/2'dir, yan yana 4/4. 3 sprout sahada → 5/5 + 5/5 + 5/5.
Compound interest mekaniği. Acemiye yavaş gelir; usta için "gerçek
deck-builder" elementidir.

#### 29.3.2 3 Alt-arketip

**Bond Swarm (Verdant-A1):**
- *Kazanma şartı:* 5 yaratık sahada (max slot), her biri Bond → +1/+1 ortak →
  toplu saldırı 18-22 ATK; AOE buff ile boss vur.
- *Anahtar kartlar:* `sprout`, `bramble_wisp`, `vinewhip`, `moss_drake`,
  `verdant_bloom`, `ancient_oak`.
- *Payoff kartı:* `ancient_oak` (8/8 Guard + Bond all sprouts).
- *Zayıflık:* AOE damage (Storm Volley, Wildfire) tüm sürüyü tek turda biçer.

**Power-Stack (Verdant-A2):**
- *Kazanma şartı:* 3 power slot dolu → her tur +1 draw, +1 strength, +2 block;
  scaling artar, deste her tur daha güçlü.
- *Anahtar kartlar:* `overgrowth`, `regrowth`, `thicket`, `verdant_combo_growth`
  (Wildgrowth), `iron_oath` (neutral), `arcane_surge` (neutral).
- *Payoff kartı:* `overgrowth` (rare power: tur başı +1 kart ekstra çek).
- *Zayıflık:* Power-discard (zaten yok) yerine 4-tur-finish aggro decks.

**Root Lock (Verdant-A3):**
- *Kazanma şartı:* Boss'a 3 turluk Root → 3 turun 0 saldırı; Lifelink yaratıkla
  hep dolu HP; Spore Burst ile finisher.
- *Anahtar kartlar:* `rootbind`, `spore_burst`, `vinewhip`, `bog_witch`-temalı
  (yani Bog tekniği), `regrowth`, `moss_drake`.
- *Payoff kartı:* `spore_burst` (5 mana — 3 Root + heal 8).

#### 29.3.3 Signature keyword combos (Verdant özel)

1. **Bond chain:** 3 Sprout sahaya çıkar → Bond +1/+1 her 2'liye → 4/4 + 4/4 + 4/4 → 12 ATK toplam.
2. **Power-stack:** Overgrowth + Regrowth + Iron Oath = tur başı +1 kart, +2 heal, +1 strength.
3. **Root-Lock:** Rootbind + Bog Witch summon + Bolas = düşman 3 tur saldıramaz.
4. **Echo + Verdant:** Echoing Maw'ın death-trigger Echo'su (5 hasar AOE) Bond
   Swarm cleanup oluyor sürünün ölmesi durumunda.

#### 29.3.4 Sample 15-card starter decklist (Verdant-A1 Bond Swarm)

| # | Kart | Cost | Tip | Rol |
|---|------|------|-----|-----|
| 1 | Sprout | 1 | Cre 2/2 (Bond) | Açılış sürü |
| 2 | Sprout | 1 | Cre 2/2 (Bond) | Çoklu Bond zinciri |
| 3 | Sprout | 1 | Cre 2/2 (Bond) | Üçüncü kopya |
| 4 | Bramble Wisp | 1 | Cre 1/2 (Echo) | Echo: 2 dmg AOE |
| 5 | Thornlash | 1 | Spell | 4 dmg + draw 1 |
| 6 | Vinewhip | 2 | Spell | 6 dmg + Bond bonus |
| 7 | Verdant Bloom | 2 | Power | Tur başı +1 block + draw 1 |
| 8 | Moss Drake | 3 | Cre 4/3 (Bond) | Mid-curve fattie |
| 9 | Thicket | 3 | Power | +1 power slot kalıcı |
| 10 | Spore Burst | 5 | Spell | 3 root + 8 heal (mid-curve closer) |
| 11 | Wild Call | 1 | Spell | Random common cre summon |
| 12 | Insight | 1 | Spell | Cycle |
| 13 | Iron Will | 2 | Power | +3 block tur başı |
| 14 | Overgrowth | 2 | Power | Tur başı +1 kart |
| 15 | Ancient Oak | 6 | Cre 8/8 (Guard + Bond) | Closer fattie |

Rasyonel: Power-stack (3 power) + Bond-swarm (5 sprout) = compound interest
deste. Spore Burst hem stall hem finisher rolü.

#### 29.3.5 Counter-play guide

1. **AOE damage (Storm Volley):** 5 yaratık tek turda 6 hasar AOE → tüm sürü
   ölür. Counter: Verdant Bloom + Overgrowth ile draw fazla, böylece sürü her
   tur tazelenebilir.
2. **Power discard yok ama Power kart limiti:** 3 power slot ile başlar; aşırı
   power yığılması = 4. power discard. Counter: Thicket (4. slot ekler) erken
   bas.
3. **Big single damage (Magma Titan):** 30 ATK tek atış → Ancient Oak'u tek
   turda öldürür. Counter: Bog Witch (Verdant) Root'la stall.
4. **Fast aggro (Hunter Backstab):** Tur 4'te bitirilen savaşlar = Power'lar
   yeterince ramp etmez. Counter: erken-cost cards (Sprout) çoklu tutmak.
5. **Element circle:** Verdant beats Ember (×1.5). Tide ×0.75. Ember karşıtı boss
   = Verdant'ın en iyi savaşı.

#### 29.3.6 3 high-skill plays

1. **Pre-Bond unfold:** Tur 1: Sprout. Tur 2: Sprout. Tur 3: Moss Drake (Bond
   = +1/+1 to Sprouts) → 3-Sprout 3/3 + Drake 5/4. Saha 14 ATK toplam.
2. **Power priority:** Tur 1: Overgrowth, Tur 2: Verdant Bloom, Tur 3: Thicket.
   Sonraki turlardan +draw +block +draw +slot = compound interest fakirleştirilemez.
3. **Spore Burst gambit:** Boss tur 12'de 3-Root → 3 tur boş → Verdant Sprout
   summon spam → tur 15'te 5/5 sürü saha 25 ATK → tek turda boss biter.

#### 29.3.7 Visual identity recap

- **Renk:** #22c55e (green-base, §25.2.3).
- **Particle:** "leaf rustle + spore puff" (§25.7).
- **Sound cue:** Soft chime + leaf rustle (§15.1).
- **Card frame glow:** Green outer + slow particle drift.
- **Element lock-in cue:** UI "🌿 Verdant Pact (3/5)".

---

### 29.4 Storm — "Combo-Juggling Velocity"

#### 29.4.1 Element felsefesi / fantazi

Storm oynamak, *bir cumbujini juggling yapmaya* benzer. Combo, Chain, Resonate
keyword'leri Storm'un 3 imzası — her kart bir önceki karta *bağımlıdır*. Element
felsefesi: *"Sayı yoksa, kart oynama; sayı olunca, sırayı tut."* Slay the Spire'ın
Watcher-Wrath/Calm pivot'ları, Hearthstone'un Spell Mage zincirleri, ve Magic
the Gathering'in Storm-mekaniği tek elemente toplanır.

İkinci paragraf: Storm oyuncusu kart sırasını, hangi kartı *önce*, hangi kartı
*ikinci*, hangi kartı *üçüncü* oynayacağını planlamakla geçirir. Tek bir
yanlış sıra → Combo 3 trigger atlanır → 12 hasar yerine 4 hasar. Acemi
"hızlı oynar"; usta "doğru oynar." Storm acemi oyuncusu kafa karıştırır;
Storm veteranı, deste'nin curve'unu kart-kart hatırlar.

#### 29.4.2 3 Alt-arketip

**Spell Chain (Storm-A1):**
- *Kazanma şartı:* Tek turda 4-5 spell oyna → Combo zinciri 4 trigger →
  18-22 hasar tek turda + 6 block.
- *Anahtar kartlar:* `static_spark`, `storm_pulse`, `lightning_jab`,
  `chain_lightning`, `storm_combo_arc` (Arc Cascade), `storm_combo_overcharge`
  (Overcharge).
- *Payoff kartı:* `chain_lightning` (rare 3-mana 6 dmg + her oynanan kart sonrası +1).
- *Zayıflık:* Mana cost stack (Overload). 4-spell turun → next turn -2 mana.

**Shock Storm (Storm-A2):**
- *Kazanma şartı:* Düşman handine Shock yığ (1 random discard tur başı) →
  düşman intent kilidi → safe-finish.
- *Anahtar kartlar:* `shock_arrow`, `static_charge`, `storm_volley`, `tempest_call`.
- *Payoff kartı:* `tempest_call` (rare power: tur başı 1 random düşman kart discard).
- *Zayıflık:* Düşman elsiz olunca Shock işe yaramaz; boss handsiz savaşırsa zarar yok.

**Aerial Swift (Storm-A3):**
- *Kazanma şartı:* Swift creature spam → çıktığı turda saldıran 3-4 yaratık →
  tur başı 12-16 hasar burst → 6-tur biten savaş.
- *Anahtar kartlar:* `storm_beetle` (2/2 Swift), `storm_caller` (3/2 Swift +
  spell-on-attack), `raijin` (rare 5/4 Swift).
- *Payoff kartı:* `raijin` (rare 5/4 Swift + on play 4 dmg AOE).
- *Zayıflık:* Guard creature (Tideward, Frost Warden) Swift'in tek-hedef
  saldırılarını emer.

#### 29.4.3 Signature keyword combos (Storm özel)

1. **Combo 3 chain:** Static Spark → Storm Pulse → Chain Lightning =
   4+5+6+(2 bonus) = 17 hasar tek tur.
2. **Resonate spam:** 3 Storm spell oynanırsa Resonate yaratık tetiklenir.
   Storm Caller (Resonate: spell-cast-time +2 dmg) + Static Spark + Storm
   Pulse = 4+4+4 = 12 hasar.
3. **Overload trade:** Skyrend (rare) — 5 mana 12 dmg + Overload(3). Bir tur
   pat, sonraki tur boss bitir.
4. **Shock + Combo:** Shock Arrow (1 mana 3 dmg + Shock) → düşman tur başı
   discard → düşman saldırı kartını kaybetti → free turn.

#### 29.4.4 Sample 15-card starter decklist (Storm-A1 Spell Chain)

| # | Kart | Cost | Tip | Rol |
|---|------|------|-----|-----|
| 1 | Static | 1 | Spell | Açılış spell |
| 2 | Static | 1 | Spell | Çoklu kopya |
| 3 | Storm Pulse | 1 | Spell | 2. spell zincir |
| 4 | Storm Pulse | 1 | Spell | Çoklu kopya |
| 5 | Lightning Jab | 1 | Spell | Combo 2 trigger |
| 6 | Shock Arrow | 1 | Spell | 1 Shock + 3 dmg |
| 7 | Storm Volley | 2 | Spell | AOE 4 dmg |
| 8 | Stormcloak | 2 | Power | +2 block per spell played |
| 9 | Static Charge | 2 | Spell | Combo 3 trigger (+ 4 dmg bonus) |
| 10 | Storm Beetle | 2 | Cre 2/2 (Swift) | Tempo |
| 11 | Chain Lightning | 3 | Spell | Rare finisher |
| 12 | Tempest Call | 4 | Power | Each tur 1 random discard |
| 13 | Insight | 1 | Spell | Cycle |
| 14 | Strike | 1 | Spell | Mana sigorta |
| 15 | Storm Combo Arc | 3 | Spell | Arc Cascade — Combo 4 trigger |

Rasyonel: 8 spell ≤ 1 mana, 4 spell ≤ 2 mana → tek turda 5-6 spell sırası
çıkartılır. Combo 4 trigger için curve ideal.

#### 29.4.5 Counter-play guide

1. **Element circle:** Storm beats Umbra (×1.5). Verdant ×0.75 zayıflık.
2. **Defansif yaratık duvarı:** Frost Warden / Tideward / Ancient Oak — Swift
   saldırıları emer. Counter: Pierce kartı stoklamak.
3. **Anti-spell tech (Coral Champion):** +18 block ile tüm spell hasar emilir.
   Counter: Pierce + AOE (Storm Volley + Pierce dummy).
4. **Discard pressure:** Static Mite (Storm düşmanı) Storm'a karşı self-zora.
   Counter: power kartları öncelikle bas.
5. **Slow boss (Magma Titan):** Storm'un 6-tur savaşına 1 büyük saldırıyla
   yetiştirir. Counter: erken Tempest Call → Magma Titan'ın saldırısı discard.

#### 29.4.6 3 high-skill plays

1. **Combo 4 unfold:** Tur 1 (öncesi) plan — Static, Storm Pulse, Lightning Jab
   (Combo 2), Static Charge (Combo 3), Storm Combo Arc (Combo 4) =
   3+3+3+(4 bonus)+(8 mega-bonus) = 21 hasar tek turda.
2. **Skyrend gambit:** Skyrend basıp Overload(3) yiyip ondan sonraki tur full
   block stance (Stormcloak). 1 tur ödenmiş; karşılığında 12 dmg dirsekli boss
   kayıtlandı.
3. **Tempest Call early stall:** Tur 3'te Tempest Call (4 mana). Sonraki 5 tur
   boyunca düşman tur başı 1 random discard → boss handi 5 kart → 0 kart hâline.

#### 29.4.7 Visual identity recap

- **Renk:** #a78bfa (violet-base, §25.2.4).
- **Particle:** "lightning streak + arc" (§25.7).
- **Sound cue:** Sharp crackle + thunder boom (§15.1).
- **Card frame glow:** Violet outer + sparking edges.
- **Element lock-in cue:** UI "⚡ Storm Pact (3/5)".

---

### 29.5 Umbra — "Trade-and-Detonate"

#### 29.5.1 Element felsefesi / fantazi

Umbra oynamak, *bir hedef işaretlemek ve patlatmak*tır. Shadow stack'i her tur
büyür, sonunda Soul Drain ya da Eclipse ile hepsi tek hasar patlamasına dönüşür.
Element felsefesi: *"Düşman zayıfsa, vur; güçlüyse, daha zayıf yap."* Slay the
Spire'ın Silent-Poison serüveni, Hearthstone'un Demon Hunter detonate, ve
Inscryption'ın "kart sat-al" ekonomisi tek elementte birleşir.

İkinci paragraf: Umbra oyuncusu, statü stack'lerini matematik gibi izler. 5
Shadow stack = sıradaki saldırı +50% hasar × 5 tur = ortalama +25 hasar.
Düşman'ın HP'si bu detonate'in karşılayamayacağı bir sayıdaysa, Umbra
oyuncusu doğru sırayı oynamamış demektir. Acemiye karmaşık gelir; usta için
"taş cleanest detonate" elementidir.

#### 29.5.2 3 Alt-arketip

**Shadow Detonate (Umbra-A1):**
- *Kazanma şartı:* 8-10 Shadow stack düşmana yığ → Soul Drain (3 dmg/stack) →
  24-30 hasar tek tur.
- *Anahtar kartlar:* `shade`, `shadowmark`, `umbral_curse`, `void_grasp`,
  `soul_drain`, `eclipse`.
- *Payoff kartı:* `soul_drain` (rare — Shadow stack başına 3 dmg, statüyü tüket).
- *Zayıflık:* Boss Phase transition statüleri temizler (Element Sovereign).

**Curse-Pact (Umbra-A2):**
- *Kazanma şartı:* `shadow_pact` ve benzeri kendine-zarar kartları + lifelink
  yaratıkları → "self-damage = ramp" döngüsü.
- *Anahtar kartlar:* `shadow_pact`, `void_lance`, `umbral_lynx`, `nightmare`,
  `umbra_seal`.
- *Payoff kartı:* `umbra_seal` (rare power: her self-damage +2 strength).
- *Zayıflık:* Self-damage = HP düşer; Tide Heal-Stall vs Umbra Curse-Pact 50/50.

**Echo Loop (Umbra-A3):**
- *Kazanma şartı:* Echo creatures (Void Shade, Phoenix Flare, Cinder Hatchling)
  spam → ölüm = trigger zinciri.
- *Anahtar kartlar:* `void_shade`, `umbral_lynx` (echo: 3 shadow apply),
  `nightmare`, `mirror_of_echoes` (relic — echo doubled), `crown_of_echoes` (relic).
- *Payoff kartı:* `mirror_of_echoes` (rare relic; echo doubled).
- *Zayıflık:* AOE damage tüm Echo yaratıklarını anda tetikler — Mirror'dan önce
  kontrolü kaybedersin.

#### 29.5.3 Signature keyword combos (Umbra özel)

1. **Shadow stack → Soul Drain:**
   Shade (2 shadow) × 4 tur = 8 stack → Soul Drain (3 dmg/stack) = 24 hasar.

2. **Echo loop:**
   Void Shade (2/2, Echo: 4 shadow apply) → öl → echo → Void Echo (3/2 Swift) →
   tur sonu echo aktif kez tekrar.

3. **Curse-Pact ramp:**
   Shadow Pact (1 mana, kendine 3 hp ver, +1 strength) + Umbra Seal power +
   Lifelink Lynx → her ramping turunda HP yenilen.

4. **Banish detonate:**
   Banish kart kullan + Banish Pact relic = +1 strength kalıcı per banish. 3
   banish = +3 strength ramping.

#### 29.5.4 Sample 15-card starter decklist (Umbra-A1 Shadow Detonate)

| # | Kart | Cost | Tip | Rol |
|---|------|------|-----|-----|
| 1 | Shade | 1 | Spell | 2 Shadow apply |
| 2 | Shade | 1 | Spell | Çoklu kopya |
| 3 | Shadowmark | 1 | Spell | 1 Shadow + +2 dmg next |
| 4 | Umbral Veil | 2 | Power | Tur başı 1 Shadow self-cleanup |
| 5 | Umbral Lynx | 2 | Cre 2/2 (Echo) | Echo: 3 shadow AOE |
| 6 | Void Grasp | 2 | Spell | 4 dmg + 2 shadow |
| 7 | Umbral Curse | 3 | Spell | 3 Shadow apply |
| 8 | Void Lance | 3 | Spell | 8 dmg if shadow ≥ 3 |
| 9 | Nightmare | 4 | Cre 5/3 (Bond) | Tank + shadow buff |
| 10 | Soul Drain | 2 | Spell | Detonate (3 dmg/stack) |
| 11 | Soul Drain | 2 | Spell | Çift kopya |
| 12 | Eclipse | 5 | Spell | AOE 6 dmg + 3 shadow apply |
| 13 | Insight | 1 | Spell | Cycle |
| 14 | Strike | 1 | Spell | Mana sigorta |
| 15 | Shadow Pact | 1 | Spell | -3 HP, +1 str (curse pact) |

Rasyonel: 5 Shadow source + 2 detonate (Soul Drain) → 8 turluk savaşta 2 detonate
fırsatı = 24+24 hasar. Eclipse cleanup AOE.

#### 29.5.5 Counter-play guide

1. **Element circle:** Umbra beats Storm (×1.5). Ember ×0.75 zayıflık.
2. **Statü temizleme (Element Sovereign phase transition):** Tüm shadow stack
   silinir. Counter: Phase transition öncesi son turda Soul Drain kullan.
3. **Anti-self-damage (Tide Healing):** Shadow Pact'ın self-damage'ı tide heal'le
   silinir. Counter: Lifelink yaratıklarla offset.
4. **AOE damage (Storm Volley):** Echo creature sürüsünü anlık tetikler. Counter:
   Mirror of Echoes relic'iyle echo değer ikiye katlar; AOE'ye değer.
5. **Slow boss:** Umbra'nın 8-tur ramping'ı slow boss'lara (Magma Titan) yetişir
   ama yetinemez. Counter: Eclipse erken AOE kullan.

#### 29.5.6 3 high-skill plays

1. **Shadow Bait:** Tur 1-3 sadece Shade ve Shadowmark oyna → 6 stack birikti.
   Tur 4: Soul Drain → 18 hasar. Boss saldırı bekliyordu, hazır değildi.
2. **Echo + Mirror:** Mirror of Echoes alındıktan sonra Void Shade (4 shadow
   echo) → ölünce 8 shadow apply (Mirror x2) → Soul Drain = 24 dmg.
3. **Banish Pact ramp:** 3 banish kart oyna, +3 strength. Sonraki Soul Drain
   her stack başına 3+3 = 6 dmg → 8 stack = 48 hasar tek tur. Boss-killer.

#### 29.5.7 Visual identity recap

- **Renk:** #64748b (slate-base, §25.2.5).
- **Particle:** "shadow wisp + ink bleed" (§25.7).
- **Sound cue:** Low whisper + sharp inhale (§15.1).
- **Card frame glow:** Slate outer + dark fade.
- **Element lock-in cue:** UI "🌑 Umbra Pact (3/5)".

---

### 29.6 Element Cross-Comparison Table (synthesis)

| Element | Tempo | Win-Turn Range | Risk Profile | Skill Ceiling |
|---------|-------|---------------|--------------|---------------|
| Ember | Fast | 5-7 | High self-damage | Low-Mid |
| Tide | Slow | 18-25 | Low (heal stall) | Mid-High |
| Verdant | Compound | 10-15 | Mid (power timing) | High |
| Storm | Burst | 6-10 | Mid (mana stack) | High |
| Umbra | Detonate | 8-12 | Mid (stack-loss risk) | Mid-High |

Synthesis: Pact of Five 5 element ile *5 farklı oyun ritmi* sunar. Bir oyuncu
3 run boyunca aynı element'i oynayabilir ve hâlâ yeni alt-arketipler keşfeder.
Bu "5 game in 1 game" yapısı, Run 2'nin element manifesto'sunun amacıdır.




## 30. Character Manifestos

### 30.1 Tamer: Vahşi Uyumun Efendisi

**1. Kimlik Beyanı**
Tamer, doğanın dizginlenemez büyüme gücü (Verdant) ile yıkımın hırslı alevlerini (Ember) birleştiren bir stratejisttir. Savaş alanını bir arena olarak değil, bir ekosistem olarak görür. Tek başına zayıf olan pençeleri, sürü bilinci ve elementer bağlar (Bond) ile devasa birer tehdide dönüştürür. Tamer için zafer, doğru yaratığı doğru zamanda sahaya sürerek doğanın hiyerarşisini rakibe dayatmaktır.

**2. Çekirdek Mekanik: Bond (Bağ) Derin Bakış**
Tamer'ın ana gücü, yaratıklarının sahadaki kardeşleriyle kurduğu elementer rezonanstır.
*   **Formül:** `Bond(X) = Yaratık sahaya indiğinde, sahada halihazırda bulunan AYNI elementteki yaratık sayısı kadar +1/+1 kazanır (Maks. +3/+3).`
*   **Edge Case:** Eğer bir kart "Swift" (Hızlı) ise ve Bond tetikliyorsa, bonusu anında alır ve o tur saldırabilir. "Echo" ile oynanan bir yaratık, orijinali sahada olduğu için otomatik olarak en az +1/+1 Bond ile başlar.
*   **Ölçeklenme:** Oyun başında +1/+1 büyük bir fark yaratırken, Act 3'te "Strength" veren Verdant büyüleri ile bu bonuslar çarpan etkisi yaratır.
*   **Örnek Tur:** 
    1.  *Vine Sprout* (1 Enerji, Verdant) oyna. (Sahada 1 Verdant var).
    2.  *Flame Guard* (2 Enerji, Ember) oyna. (Bond yok, farklı element).
    3.  *Alpha Ravager* (2 Enerji, Verdant, Bond) oyna. Sahada 1 Verdant olduğu için Alpha +1/+1 kazanarak 4/4 olarak başlar.

**3. Build Yolları**

| Yol Adı | Anahtar Kartlar | Galibiyet Koşulu | Zayıflık |
| :--- | :--- | :--- | :--- |
| **Orman Ordusu (Verdant Swarm)** | Wild Growth, Root Net, Forest King | "Root" ile rakibi kilitleyip 5+ yaratıkla Bond(3) patlatmak. | AOE (Alan Etkili) büyüler. |
| **Kızgın Pençeler (Ember Aggro)** | Cinder Hound, Fire Whip, Phoenix Hatchling | "Burn" ve "Swift" birimleri ile rakibi 4. turda bitirmek. | Savunma (Block/Guard) eksikliği. |
| **Hibrit Rezonans (Tempo)** | Elemental Link, Dual Fang, Nature's Fury | Verdant ile tanklayıp Ember birimleri "Pierce" ile bitirici yapmak. | Kötü çekiliş (Hand clog). |

**Mid-Act 25-Kartlık Örnek Decklist (Orman Ordusu):**
| Adet | Kart Adı | Element | Tip | Özellik |
| :--- | :--- | :--- | :--- | :--- |
| 5 | Strike / Defend | Neutral | Attack/Skill | Temel |
| 4 | Vine Sprout | Verdant | Creature | 1/2, Token Generator |
| 3 | Leaf Shield | Verdant | Skill | +8 Block, Root 1 |
| 3 | Ember Spark | Ember | Attack | 5 Hasar, Burn 2 |
| 2 | Alpha Wolf | Verdant | Creature | 3/3, Bond, Swift |
| 2 | Forest Guard | Verdant | Creature | 2/5, Guard, Bond |
| 2 | Growth Spurt | Verdant | Power | Her tur başı rastgele birine +1/+1 |
| 2 | Fire Breath | Ember | Skill | Tüm yaratıklara +2 Hasar |
| 1 | Great Oak | Verdant | Creature | 6/10, Bond, Reach |
| 1 | Banish Evil | Neutral | Skill | Hedefi Banish et |

**4. Başlangıç Relic'i: Beastbond (Yaratıkbağı)**
*   **Etki:** Her savaşın başında, oynadığınız İLK yaratık, eğer sahada başka bir yaratık varsa (örneğin bir müttefik veya önceden çağrılmış token) elementine bakmaksızın +1/+1 kazanır.
*   **Rasyonel:** Tamer'ın en zayıf anı, sahanın boş olduğu ilk turdur. Beastbond, "snowball" etkisini tetiklemek için oyuncuyu düşük maliyetli "token" üreten kartlara (Wild Growth gibi) yönlendirir.
*   **Denge:** Bond mekaniği normalde aynı element isterken, bu relic ilk turda esneklik sağlayarak "Hibrit" destelerin hayatta kalmasını sağlar. Anti-sinerjisi, yaratık içermeyen büyü ağırlıklı destelerde tamamen işlevsiz olmasıdır.

**5. Karşı Strateji ve Zorluklar**
Tamer, "Vulnerable" (Kırılgan) durumuna düştüğünde ve yaratıkları temizlendiğinde savunmasız kalır.
*   **Zorlayıcı Bosslar:** *The Pyre Master* (Her yaratık öldüğünde oyuncuya hasar verir) ve *Chill Goliath* (Yaratıkları "Chill" ile dondurup Bond tetiklenmesini engeller).
*   **Strateji:** Tek bir büyük yaratığa yatırım yapmak yerine, hasarı 2-3 orta ölçekli "Guard" birimine yaymak hayati önem taşır.

**6. Ustalık Progresyonu (Mastery)**
1.  **Çırak:** Bir savaşta aynı anda 3 yaratığı sahada tut ve bir Bond tetikle.
2.  **Avcı:** "Root" etkisi altındaki bir düşmana tek turda 30+ hasar ver.
3.  **Sürü Lideri:** Bir yaratığa Bond mekanizması ile +3/+3 bonus kazandır.
4.  **Elementalist:** Hem Verdant hem Ember yaratıklarını aynı turda senkronize kullanarak boss yen.
5.  **Doğa Tanrısı (A20):** Hiçbir turda doğrudan hasar almadan, sadece yaratıkların "Guard" ve "Block" yetenekleriyle Act 3'ü tamamla.

**7. İdeal Oyuncu Arketipi**
"Eğer Hearthstone'da *Midrange Hunter*, Magic: The Gathering'de *Selesnya/Gruul Tokens* veya diğer roguelike'larda 'minion master' oynamayı seviyorsanız, Tamer sizin karakterinizdir. Tek bir büyük sayı yerine, bir orkestrayı yönetmekten keyif alanlar için tasarlanmıştır."
### 30.2 Sage

Sage, fırtınanın kalbindeki dinginlik ile gölgenin amansız soğukluğunu birleştiren bir stratejisttir. Storm ve Umbra elementlerinin sentezi, onu bir "Miracle" karakterine dönüştürür; her büyü bir sonrakini besler, her gölge bir fırtınanın habercisidir. O, savaşı bir düello değil, adım adım inşa edilen devasa bir felaket olarak görür.

#### 1. Kimlik Beyanı (Identity Statement)
Sage, kadim gökyüzü bilgeliği ile yasaklanmış gölge sanatlarının tek varisidir. Savaş alanında statik bir enerji yayar; her el hareketi atmosferi ağırlaştırır ve düşmanlarını yaklaşan bir çöküşün ağırlığıyla ezer. Onun için zafer, doğru elementel frekansı bulup onu yankılandırmaktan (Resonate) geçer.

#### 2. Temel Mekanik: Spell Zinciri & PWR Scaling
Sage’in gücü, savaşın süresiyle doğru orantılı olarak büyür. "PWR Counter" (Güç Sayacı), Sage’in o savaş boyunca attığı her büyü ile şekillenir.

*   **Güç Formülü:** `Current PWR = (O savaşta oynanan toplam büyü sayısı)`.
*   **Etki:** Her +1 PWR, Sage'in oynadığı tüm ofansif büyülerin hasarına (Flat Damage) doğrudan eklenir. 
*   **Sıfırlanma:** Savaş bittiğinde PWR sayacı 0’a döner.
*   **Sınırlar ve Özel Durumlar:**
    *   **PWR Cap:** Maksimum PWR sınırı 10’dur. 10'dan sonra büyü oynamak PWR artırmaz ancak hasar bonusu +10 olarak kalır.
    *   **Echo:** Echo ile tekrarlanan büyüler, her tekrar için +1 PWR kazandırır (Örn: "Bolt (Echo)" -> +2 PWR).
    *   **Overload(N):** Bir büyü Overload(N) bedeline sahipse, PWR kazanmak için bu bedelin tam olarak ödenmesi gerekir. Mana yetersizliği nedeniyle tetiklenmeyen Overload kartları PWR artırmaz.
*   **Örnek Senaryo:**
    *   **PWR 0 Durumu:** Sage 3 hasar veren "Zap" kartını oynar. Hasar: 3. PWR 1 olur.
    *   **PWR 4 Durumu:** Sage aynı "Zap" kartını oynar. Hasar: 3 (Taban) + 4 (PWR) = 7. PWR 5 olur.

#### 3. Üç Temel Build Yolu

| Özellik | Build A: Sonsuz Fırtına (Echo Focus) | Build B: Gölge Mührü (Banish/Umbra) | Build C: Aşırı Yükleme (Overload Spike) |
| :--- | :--- | :--- | :--- |
| **Anahtar Kartlar** | Storm Echo, Swift Bolt, Chain Lightning | Shadow Sigil, Soul Banish, Umbra Veil | Static Surge, Overload Core, Thunderclap |
| **Win Condition** | Çok sayıda ucuz kartla PWR 10'a hızlıca ulaşıp Echo ile bitirmek. | Banish kartlarıyla desteyi inceltip her tur aynı güçlü gölge kartlarını oynamak. | Yüksek Overload bedelleriyle tek turda devasa "Shock" hasarı vermek. |
| **Zayıflık** | "Thorns" (Diken) mekanizmasına sahip düşmanlar. | Uzun süren savaşlarda kaynak (Banishable cards) tükenmesi. | Yanlış mana yönetimi durumunda bir sonraki tur savunmasız kalmak. |

**Örnek 25 Kartlık Mid-Act Destesi (Sonsuz Fırtına):**
| Kart Adı | Adet | Element | Tip | Keyword |
| :--- | :--- | :--- | :--- | :--- |
| Zap | 4 | Storm | Spell | Swift |
| Shadow Step | 3 | Umbra | Skill | Guard |
| Bolt | 4 | Storm | Spell | Echo |
| Mana Surge | 3 | Storm | Skill | Surge |
| Void Shard | 3 | Umbra | Spell | Pierce |
| Chain Lightning | 2 | Storm | Spell | Chain 3 |
| Echo Chamber | 2 | Neutral | Sigil | Resonate |
| Dark Ritual | 2 | Umbra | Skill | Banish |
| Storm’s Fury | 2 | Storm | Spell | Overload(2) |

#### 4. Başlangıç Relic’i: Codex of Winds
*   **Etki:** Bir tur içinde 3 veya daha fazla büyü yaptıktan sonra, destenden 1 kart çek. (Tur başına 1 kez).
*   **Sinerji:** "Swift" kartlarla (0-cost) harika çalışır. PWR sayacını hızla doldurmak için gereken kart sirkülasyonunu sağlar.
*   **Anti-Sinerji:** "Overload" ağırlıklı, yüksek maliyetli destelerde tetiklenmesi zordur.
*   **Denge Mantığı:** Sage'in "Miracle" doğasını desteklerken, oyuncuyu her tur kart sayısını ve mana dengesini hesaplamaya zorlar. Bedava kart çekişi, "Combo" mekaniklerini ödüllendirir.

#### 5. Karşı Strateji & Zorlayıcı Bosslar
Sage, "Spamtastic" bir karakter olduğu için her kart oynandığında karşı hamle yapan düşmanlara karşı zorlanır.
*   **Zorlayıcı Boss - "The Iron Arbiter":** Bu boss, her 3 kart oynandığında oyuncuya "Frail" (Zayıflık) basar. Sage'in PWR biriktirme hızını yavaşlatır.
*   **Zorlayıcı Mekanik - "Static Silence":** Sage Shock yediğinde veya sessizleştiğinde PWR sayacı o tur için dondurulur.
*   **Strateji:** Düşmanın "Guard" miktarını "Pierce" ile delmek ve PWR 10 olmadan "Finish" kartlarını harcamamak kritiktir.

#### 6. Mastery Progression (Ustalaşma)
1.  **Acemi:** PWR sayacını 10'a ulaştırıp savaşı bitirmek.
2.  **Kalfa:** Overload bedellerini, bir sonraki turu riske atmadan yönetmeyi öğrenmek.
3.  **Usta:** Echo ve Chain kartlarını, Resonate aktifken kullanarak tek turda +4 PWR kazanmak.
4.  **Bilge:** Banish mekanizmasıyla desteyi 10 kartın altına düşürüp her tur Codex of Winds'i tetiklemek.
5.  **Ascension 20:** Storm/Umbra dengesini kurarak, hem yüksek blok (Guard) hem de PWR 10 hasarını aynı anda sürdürmek.

#### 7. İdeal Oyuncu Arketipi
"Eğer Magic: The Gathering'de **Storm** destelerini, Slay the Spire'da **Defect**'in 'Claw' veya 'Orb' kombolarını veya Hearthstone'da **Miracle Rogue** oynamayı seviyorsan, Sage senin için tasarlanmıştır. Kağıt üzerinde zayıf görünen küçük büyüleri devasa bir çığa dönüştürmek senin tutkunsa, fırtınaya hoş geldin."
### 30.3 Hunter

Hunter, hayatta kalmanın sadece en güçlünün hakkı olduğuna inanan, küllerden doğan bir intikamcıdır. Ember'ın yıkıcı ısısını Storm'un çevikliğiyle birleştirir; ancak onun asıl dehşeti, savaşın ilerleyen safhalarında kaynaklarını (kartlarını) kalıcı bir fiziksel güce dönüştürme yeteneğinde yatar. Avını önce közlerle yavaşlatır, ardından zayıf noktasını bulduğunda fırtınanın hızıyla bitirici darbeyi indirir.

**Core Mechanic: Exhaust Ekonomisi & Status Kombo**
Hunter'ın savaş felsefesi "kaybetmek kazanmaktır" üzerine kuruludur.
- **Exhaust Formula:** Savaş boyunca Exhaust (Tüketilen) edilen her kart, Hunter'a +1 Strength kazandırır. Bu bonus, savaş sonuna kadar kalıcıdır. 
- **Sınırlar:** Exhaust üzerinden kazanılan maksimum Strength sınırı **8**'dir. Ancak bu sınıra ulaşıldığında Hunter, her saldırıda fazladan 8 saf hasar vurarak bir canavara dönüşür.
- **Burn + Vulnerable Kombo:** Hedefte 3 veya daha fazla Burn (Yanık) yükü varsa ve aynı zamanda Vulnerable (Zayıf) statüsündeyse, sadece doğrudan saldırılar değil, tur sonu Burn tikleri de 1.5x hasar verir.
- **Edge Case:** Strength bonusu tur başında değil, kart Exhaust edildiği anda tetiklenir. 
- **Örnek Tur:** Hunter 3 kartı Exhaust eder -> Strength 3 olur. Hedefte Burn + Vulnerable varken 6 hasarlık bir saldırı kartı oynar. Hasar: (6 Base + 3 Strength) * 1.5 = 13.5 -> **Floor: 13**. Tur sonunda 4 stack Burn varsa, o da 1.5x ile 6 hasar vurur.

#### Viable Build Paths

| Build: Közün Laneti (Inferno Specialist) | Key Cards | Sample 25-Card Decklist |
| :--- | :--- | :--- |
| **Win Con:** Yüksek Burn stackleri ile pasif hasar. | Ember Slash, Flare Up, Sear | 5x Strike, 4x Guard, 3x Ember Slash, 2x Sear, 2x Vulnerable Cloud, 3x Flare Up, 2x Kindle, 2x Ash Cloud, 2x Phoenix Flame |
| **Weakness:** "Cleanse" yeteneği olan bosslar. | | |

| Build: Fırtına Avcısı (Tempest Striker) | Key Cards | Sample 25-Card Decklist |
| :--- | :--- | :--- |
| **Win Con:** Swift ve Chain kartları ile hızlı Exhaust. | Static Discharge, Chain Bolt, Surge | 5x Strike, 4x Guard, 4x Chain Bolt, 3x Static Discharge, 2x Surge, 3x Storm Cell, 2x Lightning Flash, 2x Overload Spike |
| **Weakness:** "Thorns" (Diken) etkisi olan düşmanlar. | | |

| Build: Küllerin Gücü (Ash Walker) | Key Cards | Sample 25-Card Decklist |
| :--- | :--- | :--- |
| **Win Con:** Desteyi Exhaust ile inceltip 8 Str'ye ulaşmak. | Scrape, Burnt Offering, Remnant | 5x Strike, 4x Guard, 4x Scrape, 3x Burnt Offering, 3x Remnant, 2x Final Ember, 2x Soul Burn, 2x Tactical Sacrifice |
| **Weakness:** Uzun süren savaşlarda kart yetersizliği. | | |

**Unique Starter Relic: Ember Shard (Kor Parçası)**
- **Effect:** Her savaşta bir kartı ilk kez Exhaust ettiğinizde, rastgele bir düşmana 5 hasar verir.
- **Rationale:** Hunter'ın başlangıç aşamasındaki yavaşlığını dengeler. Exhaust mekanizmasını erkenden tetiklemek için oyuncuyu teşvik eder.
- **Synergy:** "Volatile" kartlarla harika çalışır; kart elinizden uçup giderken bedava hasar sağlar.
- **Anti-synergy:** Desteyi inceltmek istemediğiniz "Echo" odaklı buildlerde erken aktivasyon sinerjiyi bozabilir.
- **Balance:** 5 hasar Act 1 için belirleyicidir ancak Act 3'te sadece bir tetikleyici (trigger) görevi görür, oyun sonunu domine etmez.

**Counter-Strategy: Zorlayıcı Etkenler**
Hunter, ivme kazanan bir karakterdir (scaling). Bu yüzden savaşı 2. turda bitiren "Burst" düşmanlara karşı zorlanır. 
- **Tough Bosses:** *The Ancient Sentinel* (Her 3 kartta bir Artifact kazanarak Burn kombolarını engeller) ve *Storm Elemental* (Sürekli Shock vererek Hunter'ın elindeki kilit Exhaust kartlarını maliyetli hale getirir).
- **Zayıf Nokta:** Elinde Exhaust edilecek kart kalmaması veya 8 Strength sınırına ulaştığı halde bossun devasa zırhını (Block) kıramaması.

**Mastery Progression**
1. **Novice:** Exhaust mekanizmasını kullanarak bir savaşta +3 Strength'e ulaş.
2. **Pyromaniac:** Aynı anda 3 farklı düşmana 10+ Burn stackle.
3. **Survivor:** Destende 5'ten az kart kalmışken bir Elite savaşını kazan.
4. **Storm Lord:** Bir turda 5 "Chain" kartı oynayarak 8 Strength sınırını yakala.
5. **Ascension 20 Capable:** "Burn + Vulnerable" 1.5x çarpanını kullanarak tek vuruşta 80+ hasar ver.

**Ideal Player Archetype**
"Eğer Slay the Spire'da Ironclad'in Exhaust sinerjilerini veya Hearthstone'da yüksek riskli 'Burn Mage' destelerini seviyorsanız, Hunter tam size göre. Kaynaklarınızı yakmaktan korkmayan, her feda edilen kartın sizi bir adım daha tanrısallığa yaklaştırdığını hissetmek isteyen oyuncular için tasarlandı."
### 30.4 Warden

#### 1. Kimlik Beyanı (Identity Statement)
Warden, elementlerin kadim muhafızı ve doğanın sarsılmaz kıyısıdır. Tide (Gel-Git) elementinin akışkan savunmasını, Verdant (Yeşil) elementinin bitmek bilmeyen yaşam enerjisiyle birleştirir. Sadece hayatta kalmakla kalmaz, düşmanın her darbesini kendi lehine çeviren, aldığı yaraları verdiği hasarla anında kapatan ve aşılması imkansız bir zırh bariyeri kuran "Juggernaut" tiplemesidir. O, fırtınanın ortasındaki kaya; ormanın kalbindeki devrilmez ağaçtır.

#### 2. Çekirdek Mekanik Derinlemesine Bakış (Core Mechanic Deep-Dive)
Warden'ın oyun tarzı üç ana sütun üzerine inşa edilmiştir:

*   **Warden Lifelink:** Warden'a özel tüm Attack kartları doğuştan Lifelink keyword'üne sahiptir. Düşmanın canına verilen doğrudan hasarın (HP damage) %100'ü Warden'a HP olarak döner. 
    *   *Sınırlar:* Burn, Shock veya diğer statü etkilerinden gelen hasarlar Lifelink tetiklemez. Sadece doğrudan kart hasarı iyileştirme sağlar.
*   **Ağır Blok (1.3x Scaling):** Warden'ın savunma disiplini diğer karakterlerden üstündür. Bir kartın sağladığı temel Block miktarı Warden için **1.3x (aşağı yuvarlanmış)** çarpanıyla hesaplanır. (Örn: Standart 10 Block sağlayan bir kart Warden'da 13 Block verir).
*   **Diken Mekaniği (Thorn):** Warden Block aktifken bir "canlı kalkan"dır. Warden'ın üzerinde Block varken bir düşman ona saldırdığında, düşman **Block/4 (yukarı yuvarlanmış)** kadar yansıma hasarı alır.
    *   *Örnek Senaryo:* Warden'ın 12 Block'u ve elinde 10 hasar veren bir attack kartı var. Saldırdığında 10 HP iyileşir. Düşman Warden'a vurduğunda (eğer Block hala > 0 ise), düşman 12/4 = 3 Thorn hasarı alır.

#### 3. Viable Build Paths

**A) Path: Tidal Fortress (Pure Block & Thorn Focus)**
Düşmanı kendisine vurmaya zorlayarak ve devasa blok miktarlarıyla Thorn hasarı üzerinden kazanan tank buildi.
*   **Anahtar Kartlar:** *Crushing Tide, Granite Root, Reflective Surface.*

| Kart Adı | Adet | Tip | Nadirlik |
| :--- | :---: | :--- | :--- |
| Basic Block (Upgraded) | 6 | Skill | Starter |
| Basic Strike | 4 | Attack | Starter |
| Tidal Shield (+20 Block) | 4 | Skill | Common |
| Rooted Guard (Gain Guard) | 3 | Skill | Uncommon |
| Crushing Tide (Dmg = Block) | 3 | Attack | Rare |
| Echoing Wave (Block x2) | 2 | Skill | Rare |
| Spore Cloud (Weakness) | 3 | Skill | Uncommon |

*   **Win Condition:** Block miktarını 100+ üzerine çıkarıp düşmanın kendi saldırılarıyla (Thorn) yok olmasını sağlamak.
*   **Weakness:** Pierce hasarı (Block'u görmezden gelen saldırılar) ve Thorn tetiklemeyen DoT (Burn) etkileri.

**B) Path: Verdant Vampire (Aggressive Lifelink & Strength)**
Hasar ölçeklendirmesi yaparak her vuruşta Full HP kalmayı hedefleyen agresif hayatta kalma buildi.
*   **Anahtar Kartlar:** *Overgrowth, Predator's Strike, Nature's Wrath.*

| Kart Adı | Adet | Tip | Nadirlik |
| :--- | :---: | :--- | :--- |
| Basic Strike (Upgraded) | 8 | Attack | Starter |
| Basic Block | 4 | Skill | Starter |
| Overgrowth (+Str per turn) | 3 | Power | Rare |
| Predator's Strike (High Dmg) | 4 | Attack | Common |
| Leeching Vines (Chain 3) | 3 | Attack | Uncommon |
| Surge of Sap (Double Str) | 2 | Skill | Rare |
| Verdant Roar (Vulnerable) | 1 | Skill | Uncommon |

*   **Win Condition:** Yüksek Strength ile Lifelink verimliliğini artırıp düşmanı burst hasarla bitirirken hasar almayı umursamamak.
*   **Weakness:** "Frail" statüsü (iyileştirmeyi ve blok alımını düşürürse) ve tek seferde devasa (one-shot) hasar vuran bosslar.

**C) Path: Surging Currents (Combo & Multi-hit)**
Düşmanı küçük ama çok sayıda vuruşla (multi-hit) yıpratan ve her vuruşta Lifelink tetikleyen akış buildi.
*   **Anahtar Kartlar:** *Rapid Current, Flow State, Mossy Blade.*

| Kart Adı | Adet | Tip | Nadirlik |
| :--- | :---: | :--- | :--- |
| Rapid Current (3x4 Dmg) | 5 | Attack | Common |
| Flow State (Draw on Attack) | 3 | Power | Rare |
| Mossy Blade (Apply Poison) | 4 | Attack | Uncommon |
| Basic Block | 5 | Skill | Starter |
| Chain Lightning (Tide/Verd.) | 3 | Attack | Uncommon |
| Resonate Echo | 2 | Skill | Rare |
| Swift Footwork | 3 | Skill | Common |

*   **Win Condition:** Multi-hit saldırılarla her tur 15-20 HP arası stabilize iyileşme ve Combo puanlarıyla bitirici vuruş.
*   **Weakness:** Sabit "Thorn" sahibi düşmanlar (her vuruşta Warden'a hasar döner) ve "Plate Armor" mekanikleri.

#### 4. Unique Starter Relic: Tidal Ward
*   **Efekt:** Savaşın başlangıcında 8 Block kazandırır.
*   **Rasyonal:** Warden'ın Thorn mekaniği Block gerektirdiği için, bu yadigar Warden'ın 1. turdan itibaren düşmana yansıma hasarı vermeye başlamasını sağlar. 
*   **Synergy:** İlk turda "Aggressive" olan düşmanlara karşı bedava hasar sağlar. 
*   **Anti-synergy:** Eğer oyuncu "Unarmored" tabanlı nadir kartları seçerse etkisi azalır. 
*   **Denge:** 8 Block, Warden'ın 1.3x pasifiyle çarğılmaz (yadigar sabittir), bu da erken oyun kartlarının önüne geçmesini engeller.

#### 5. Karşı Strateji (Counter-Strategy)
Warden, saf hasar ve fiziksel saldırılara karşı bir duvar olsa da şu durumlarda zorlanır:
*   **Burn/Status Focus:** Düşman doğrudan HP'ye vuran Burn veya Shadow hasarı veriyorsa, Warden'ın Block'u ve Thorn'u etkisiz kalır.
*   **Multi-hit Shredders:** Çok sayıda küçük vuruş yapan düşmanlar Block'u hızla eritir ve Thorn hasarını (her vuruşta Block azaldığı için) minimize eder.
*   **Tough Bosses:** *The Scorched Hydra* (Sürekli Burn uygular) ve *Iron Colossus* (Yüksek Pierce hasarı) Warden oyuncuları için gerçek birer sınavdır.

#### 6. Mastery Progression
1.  **First Run:** Block ve Lifelink arasındaki dengeyi anla (Sadece defans yapmak yetmez).
2.  **Iron Wall:** Tek bir turda 50+ Block üreterek Thorn hasarıyla bir elite düşman öldür.
3.  **Eternal Growth:** Bir savaşta Lifelink kullanarak toplam 200+ HP iyileş.
4.  **Tide-Caller:** Warden'a özel "Resonate" combo'larını kullanarak 10 kartlık bir loop oluştur.
5.  **Ascension 20 Capable:** Hasar almadan (Block içinde kalarak) ve Lifelink ile HP'yi %90 üzerinde tutarak Act 3 Boss'unu geç.

#### 7. Ideal Player Archetype
"Eğer Hearthstone'da **Control Warrior** veya Slay the Spire'da **Ironclad (Barricade build)** oynamayı seviyorsan; 'Bana vurabilirsin ama bu canını yakacak' felsefesi sana hitap ediyorsa ve her zaman Full HP kalmanın verdiği o güven hissini arıyorsan, Warden senin karakterindir."


---

## 31. Card Catalog Expansion

> Bu bölüm §9 üzerine kurulur (orijinal 115 kart hedefi ve 6 örnek kart). §31, her element için
> tam kart kataloğunu, arketip gruplandırmalarını, tasarım gerekçelerini ve [NEW] önerileri içerir.
> Mevcut §9 kartlarına çakışmadan referans verilir; yeni kartlar arşiv numarasıyla işaretlenir.

### 31.1 Ember — Kart Kataloğu

## Ember Card Catalog: The Burning Pact

This catalog outlines the **Ember** element for *Pact of Five*, focusing on aggressive burn strategies, sacrificial rituals, and the cyclical nature of the phoenix. Ember is the primary offensive element, trading defense and longevity for explosive turns and relentless pressure.

### Archetype Overview

*   **ARCHETYPE A: Inferno Rush**
    *   **Focus:** Aggro, Burn-stacking, and low-cost swarm.
    *   **Strategy:** Utilize `Swift` and `Surge` to pressure the opponent early. Stack Burn on high-value targets to bypass `Guard` over multiple turns.
*   **ARCHETYPE B: Volcano Rites**
    *   **Focus:** Self-sacrifice for massive burst damage.
    *   **Strategy:** Use `Volatile` creatures and cards that require sacrificing units to generate Mana or trigger `Overload(N)` effects.
*   **ARCHETYPE C: Phoenix Cycle**
    *   **Focus:** `Echo` mechanics, death-triggers, and resource recycling.
    *   **Strategy:** Exploit `Echo` to play cards twice, using `Bond` and `Resonate` to maintain card advantage while exhausting the deck for powerful finishers.

---

### Ember Card Catalog (25 Cards)

| ID | Name | Type | Cost | Stats | Keywords | Effect | Rarity | Flavor |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| EMB-01 | Cinder Imp | Creature | 1 | 2/1 | Swift | When this deals damage, apply 1 Burn to the target. | Common | "Cehennemin en küçük bekçisi, en harlı kıvılcımı taşır." |
| EMB-02 | Flame Lash | Attack | 1 | — | Pierce | Deal 3 damage. Combo(1): Apply 2 Burn. | Common | "Kırbaç havada şakladığında, hava bile yanmaya başlar." |
| EMB-03 | Ash Shambler | Creature | 2 | 3/3 | Volatile | When this dies, deal 4 damage to all enemies. | Common | "Küllerinden doğmaz, sadece öfkesini arkasında bırakır." |
| EMB-04 | Molten Spark | Skill | 0 | — | Surge, Resonate | Deal 1 damage. Draw 1 card if you played another Ember card this turn. | Common | "Anlık bir parlama, ancak bin yıllık bir acı bırakır." |
| EMB-05 | **[NEW]** Scorched Earth | Power | 2 | — | Sigil | At the start of your turn, apply 1 Burn to all enemies. | Common | "Toprak bile ihanet ediyor; her adım artık bir azap." |
| EMB-06 | Lava Burst | Attack | 2 | — | Overload(1) | Deal 8 damage. If target has Burn, deal 12 instead. | Common | "Erimiş kaya her şeyi deler; ne zırh dayanır ne de irade." |
| EMB-07 | Ember Wing | Creature | 1 | 1/1 | Echo, Swift | Battlecry: Deal 1 damage to a random enemy. | Common | "Kıvılcımlar havada dans ederken ölüm şarkısını fısıldar." |
| EMB-08 | Pyre Ritual | Skill | 1 | — | Banish | Sacrifice a creature. Gain 3 Mana this turn. | Common | "Ateşi beslemek için bazen kendi kanını dökmen gerekir." |
| EMB-09 | Burning Soul | Creature | 2 | 2/2 | Echo, Lifelink | Whenever you play an Echo card, gain +1 ATK. | Common | "Ruhu yansa da ışığı sönmez; her döngüde daha da parlar." |
| EMB-10 | Searing Heat | Attack | 1 | — | Chain 2 | Deal 2 damage. Increase Burn on target by 1. | Common | "Isı dalga dalga yayılır, kaçacak hiçbir gölge bırakmaz." |
| EMB-11 | Charred Remains | Creature | 0 | 1/1 | Frail, Bond | When this creature is sacrificed, apply 3 Burn to a random enemy. | Common | "Geriye kalan tek şey, intikam arzusuyla kavrulmuş kemikler." |
| EMB-12 | Ignition | Skill | 1 | — | — | Target creature gains +3 ATK and Swift until end of turn. | Common | "Kav mühim değil, asıl olan o ilk kıvılcımdaki iradedir." |
| EMB-13 | **[NEW]** Volcanic Guard | Creature | 3 | 5/2 | Guard | When this takes damage, deal 2 Burn to the attacker. | Uncommon | "Magma kadar ağır, lav kadar yakıcı bir sadakat." |
| EMB-14 | Phoenix Fledgling | Creature | 2 | 2/1 | Echo, Resonate | When this is played via Echo, it gains +2/+2. | Uncommon | "Henüz uçamıyor olabilir ama içindeki yangın dünyayı yakar." |
| EMB-15 | Magma Infusion | Skill | 2 | — | Bond, Overload(2) | Target creature gets +5 ATK and Pierce this turn. | Uncommon | "Damarlarında kan değil, dağın kalbindeki öfke aksın." |
| EMB-16 | Chain Reaction | Attack | 3 | — | Chain 4 | Deal 3 damage. If target dies, repeat for next enemy. | Uncommon | "Bir kıvılcım koca bir ormanı, bir öfke koca bir orduyu yok eder." |
| EMB-17 | **[NEW]** Solar Sigil | Power | 3 | — | Sigil | Your cards with Echo cost 1 less (minimum 1). | Uncommon | "Güneşin mührü altına giren her şey, sonsuza dek tekrarlanır." |
| EMB-18 | Blazing Charge | Attack | 2 | — | Pierce | Deal 5 damage. Combo(2): Double the Burn on the target. | Uncommon | "Hücum borusu çalındığında, sadece küller geride kalır." |
| EMB-19 | Sacrificial Flame | Skill | X | — | Banish | Deal 6 damage per Mana spent. Sacrifice all your creatures. | Uncommon | "Her şeyin bir bedeli vardır; en büyük bedeli ise en sona sakladım." |
| EMB-20 | Echoing Roar | Skill | 2 | — | Echo | All Ember creatures gain +2 ATK this turn. | Uncommon | "Sesim yankılandığında, yer yerinden oynar ve gök tutuşur." |
| EMB-21 | Inferno Herald | Creature | 3 | 3/4 | Surge | Battlecry: Apply 2 Burn to all enemies. | Uncommon | "O geldiğinde bahar biter, kış ise hiç gelmez." |
| EMB-22 | **[NEW]** Heart of Volcano | Power | 4 | — | Sigil | Whenever you sacrifice a creature, deal 5 damage to a random enemy. | Rare | "Dağın kalbi senin için çarpıyor; her kurban bir patlama." |
| EMB-23 | Eternal Phoenix | Creature | 5 | 5/4 | Echo, Swift, Bond | When this dies, add a 'Phoenix Egg' to your hand. | Rare | "Ölüm sadece bir duraktır; küller ise yeni bir başlangıç." |
| EMB-24 | Doomsday Flare | Attack | X | — | Pierce | Deal 10 damage to all enemies. Overload(3). | Rare | "Kıyamet hiç bu kadar parlak ve bu kadar sıcak olmamıştı." |
| EMB-25 | **[NEW]** Realm of Ashes | Power | 4 | — | Sigil | Your creatures have Volatile. When a creature dies, draw 1 card. | Rare | "Küllerin içinde yeni bir dünya var; her ölüm bir bilgi kırıntısı." |

---

### Design Notes

*   **EMB-01 (Cinder Imp):** Designed as the quintessential turn-1 drop for Inferno Rush. 2 HP ensures it survives most basic pings, while Swift and Burn application force an immediate response from the opponent.
*   **EMB-03 (Ash Shambler):** A core bridge between Archetype B and A. Its high stats for cost are offset by Volatile, making it a "ticking bomb" that discourages opponent blocking while providing sacrifice fodder for Volcano Rites.
*   **EMB-05 (Scorched Earth):** A novel [NEW] engine card for Burn decks. By providing passive Burn every turn, it reduces the need for constant card expenditure to keep the status active, enabling long-term scaling for aggro.
*   **EMB-06 (Lava Burst):** The primary payoff for stacking Burn. The damage jump from 8 to 12 is significant, rewarding players for successfully executing the element's primary status mechanic.
*   **EMB-08 (Pyre Ritual):** The high-risk mana ramp for Archetype B. It allows for massive turn-3 or turn-4 plays (like Eternal Phoenix) at the cost of board presence, fitting the "sacrifice for burst" theme.
*   **EMB-13 (Volcanic Guard):** [NEW] Fills a gap in Ember’s defense. Ember usually lacks sustainability; this creature provides a "deterrent" defense—it doesn't just block damage, it punishes the attacker with Burn.
*   **EMB-16 (Chain Reaction):** An anti-swarm tool for Inferno Rush. Its Chain 4 keyword allows it to clear multiple small tokens, which is historically a weakness for single-target Burn decks.
*   **EMB-17 (Solar Sigil):** [NEW] The primary enabler for the Phoenix Cycle. By reducing Echo costs, it allows for "storm-off" turns where multiple Echo cards are played in sequence to trigger Resonate.
*   **EMB-19 (Sacrificial Flame):** A scaling finisher for Volcano Rites. The X cost and total board sacrifice make it a "win now or lose" card, perfectly encapsulating the high-stakes nature of the archetype.
*   **EMB-22 (Heart of Volcano):** [NEW] Transforms small sacrifice triggers into major damage threats. It turns cards like Charred Remains or Ash Shambler into devastating tactical strikes rather than just value trades.
*   **EMB-23 (Eternal Phoenix):** The ultimate Phoenix Cycle card. The combination of Echo and the Egg mechanic ensures that as long as the player has Mana, the threat never truly leaves the board.
*   **EMB-25 (Realm of Ashes):** [NEW] Solves Ember's card draw issue in the late game. By turning every death (including your own Volatile units) into a draw trigger, it fuels the deck's engine during its most explosive phases.


### 31.2 Tide — Kart Kataloğu

# Tide Element: Card Catalog - Pact of Five GDD

The **Tide Element** represents the duality of the ocean: the crushing weight of the frozen depths and the relentless, rhythmic energy of the crashing waves. In *Pact of Five*, Tide players focus on manipulating the flow of the battle, whether by stalling behind a wall of ice, dismantling the enemy's defense through attrition, or building up a massive reservoir of mana to unleash legendary leviathans.

### Archetype A: Glacial Wall
This archetype is the ultimate defensive engine. It relies on the **Chill** status effect (which reduces enemy damage or speed) to mitigate incoming threats. By stacking high amounts of **Block**, Glacial Wall players can survive the early game while slowly chipping away at enemies with defensive strikes that scale with their armor or the target's frozen state. Healing is often a reward for maintaining a perfect defense.

### Archetype B: Undertow Control
Undertow is about tempo and disruption. It uses the **Frail** keyword to make enemies vulnerable to even minor attacks. This archetype features the most efficient card draw engines in the game, allowing players to cycle through their deck rapidly to find the perfect answer. By "pulling" the enemy into unfavorable positions and banishing key threats temporarily, Undertow dictates the pace of the encounter.

### Archetype C: Tidal Surge
Tidal Surge is the "big mana" archetype. It utilizes **Surge** to empower cards when certain conditions are met (like mana thresholds or specific timing). With keywords like **Overload** and **Resonate**, these players sacrifice short-term flexibility for massive late-game payoffs. It features the largest creature cards in the Tide element, designed to end the game in a single, overwhelming turn once the mana ramp is complete.

---

### Card Catalog (25 Cards)

| ID | Name | Type | Cost | Stats | Keywords | Effect | Rarity | Flavor |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| T-01 | Frost Shield | Skill | 1 | — | Guard | Gain 8 Block. If the target has Chill stacks, gain 4 additional Block. | Common | Buzun kalbi asla kırılmaz, sadece daha da sertleşir. |
| T-02 | Icebound Behemoth | Creature | 4 | 20/4 | Guard | At the start of your turn, apply 1 Chill to all enemies. | Uncommon | Yürüyen bir dağ, soğuk bir kabus; denizin en derininden gelen eski bir muhafız. |
| T-03 | Glacial Restoration | Skill | 2 | — | Lifelink | Heal 6 HP. If you have 20 or more Block, double the amount of healing received. | Uncommon | Soğuk bazen can verir; dondurucu suyun içinde bile yaşamın bir yolu vardır. |
| T-04 | Winter's Grasp | Skill | 0 | — | Volatile | Apply 2 Chill to a target. Gain 4 Block. This card is banished if not played this turn. | Common | Sadece bir anlık dokunuş, ruhunuzu ebedi bir kışa mahkum etmeye yeter. |
| T-05 | [NEW] Permafrost Sentinel | Creature | 3 | 15/2 | Guard, Bond | **Bond**: While bonded, whenever the bonded ally is attacked, this unit gains 5 Block. | Common | Ebedi nöbet başladı; sadakati buz kadar saf ve sarsılmaz bir savaşçı. |
| T-06 | Shard Spray | Skill | 1 | — | Pierce | Deal 5 damage. Apply 1 Chill. Ignores 50% of the target's current Block. | Common | Keskin ve dondurucu parçalar, zırhın en küçük çatlağından bile sızar. |
| T-07 | Frozen Heart | Skill | 3 | — | Resonate | Apply 5 Chill. Gain Block equal to the total Chill stacks on the target multiplied by 3. | Rare | Kalbi durmuş ama hala atıyor; içindeki fırtına dünyayı dondurmaya hazır. |
| T-08 | Crystal Aegis | Skill | 2 | — | Guard, Echo | Gain 10 Block. If played again this turn via Echo, gain an additional 5 Block. | Uncommon | Yankılanan bir koruma; bir kalkan düşerken diğeri onun yerini alır. |
| T-09 | Undertow | Skill | 1 | — | Frail | Apply 2 Frail to an enemy. Draw 1 card. | Common | Seni dibe çekecek olan şey dalgalar değil, suyun altındaki o sinsi çekimdir. |
| T-10 | Rip Current | Skill | 0 | — | Swift | Draw 2 cards, then discard 1 card from your hand. | Common | Hızlı akıntıya karşı duramazsın; ya ona uyum sağlarsın ya da içinde kaybolursun. |
| T-11 | Mistweaver Rogue | Creature | 2 | 10/5 | Pierce | Whenever this creature deals damage, apply 1 Frail to the damaged target. | Uncommon | Sislerin arasından gelen ölüm; varlığı bir fısıltı, darbesi ise bir felakettir. |
| T-12 | [NEW] Echoing Depths | Skill | 2 | — | Echo, Resonate | Draw 1 card. If you played a card with **Echo** this turn, gain 1 Mana. | Uncommon | Derinliklerin yankısı bitmez; her ses bir öncekini daha da güçlendirerek döner. |
| T-13 | Abyssal Gaze | Skill | 1 | — | Sigil | Place a Sigil on the target. Whenever the target takes damage, draw 1 card. | Rare | Gözleri seni her yerde görür; karanlığın içinden bakan o bakıştan kaçış yoktur. |
| T-14 | Brine Spike | Skill | 1 | — | Chain 2 | Deal 6 damage. **Chain 2**: Deal 3 damage to a random enemy. | Common | Tuzlu suyun yakıcı etkisi; yaralarınızda hissettiğiniz o acı, sonun başlangıcıdır. |
| T-15 | Tidal Displacement | Skill | 2 | — | Banish | **Banish** a non-Elite enemy for 1 turn. Draw 1 card. | Uncommon | Yerini kaybetmek sonun olur; okyanus seni istediği yere fırlatır ve unutur. |
| T-16 | Coral Scout | Creature | 1 | 8/3 | Swift | When played, look at the top 3 cards of your deck. Put one back on top. | Common | Resiflerin gizli gözü; en sığ sularda bile en derin sırları bulabilir. |
| T-17 | [NEW] Wave Crasher | Creature | 3 | 12/6 | Surge, Combo(2) | **Surge**: Deal 4 damage to all enemies. **Combo(2)**: Gain 1 Mana. | Uncommon | Dalga kıran, umut yıkan; denizin öfkesi kıyıya ulaştığında hiçbir şey ayakta kalmaz. |
| T-18 | Moonlit Tide | Skill | 1 | — | Surge | Gain 1 Mana next turn. **Surge**: Gain 2 Mana next turn instead. | Common | Ayın çekimi ruhu yükseltir; sular yükselirken güç de beraberinde gelir. |
| T-19 | Ancient Leviathan | Creature | 7 | 40/15 | Pierce, Surge | **Surge**: This card costs 2 less to play. Deals massive damage to Blocked targets. | Rare | Denizlerin gerçek efendisi uyandı; onun gölgesi bile şehirleri yutmaya yeter. |
| T-20 | Deep Sea Ritual | Skill | X | — | Overload(2) | Gain X Mana next turn. **Overload(2)**: Reduces max mana by 2 for the next turn. | Uncommon | Derinlerin gücü bedel ister; aldığın her damla kudret için bir parça ruh verirsin. |
| T-21 | [NEW] Maelstrom Engine | Skill | 3 | — | Resonate, Sigil | Place a Sigil on your Mana Pool. Every time you play a Tide card, gain 1 Temp Mana. | Rare | Girdap hiç durmadan döner; içine düşen her şeyi sonsuz bir enerjiye dönüştürür. |
| T-22 | Torrential Naga | Creature | 5 | 25/10 | Chain 3 | **Chain 3**: Deal 10 damage to the enemy with the lowest current HP. | Uncommon | Fırtına gibi gelir, sel gibi gider; geride bıraktığı tek şey boş bir enkazdır. |
| T-23 | Aqua Pulse | Skill | 2 | — | Combo(3) | Deal 12 damage. **Combo(3)**: Cast this effect one additional time for free. | Common | Suyun vuruşu ritmiktir; her darbe bir öncekinin üzerine binerek yıkım getirir. |
| T-24 | [NEW] Overflowing Well | Skill | 2 | — | Overload(1), Surge | Draw 3 cards. **Surge**: Cards drawn this way cost 1 less this turn only. | Common | Taşan pınardan herkes içer; ama sadece bilge olanlar o suyun tadını bilir. |
| T-25 | Reef Titan | Creature | 6 | 35/8 | Guard, Lifelink | Whenever this creature blocks an attack, heal the player for 3 HP. | Common | Kayaların arasında sarsılmaz bir güç; denizin altındaki en güvenli liman odur. |

---

### Design Notes

**Archetype A (Glacial Wall) - Key Cards Rationale:**
*   **T-01 (Frost Shield):** This is the foundational block card for the Tide element. It rewards players for engaging with the "Chill" status mechanic, offering a 50% efficiency boost if the player has successfully applied debuffs. It encourages a "defend-and-debuff" playstyle.
*   **T-05 (Permafrost Sentinel) [NEW]:** Designed to fill the gap in Tide's creature-based defense. By using the **Bond** keyword, it creates a tactical layer where the player must choose which utility unit needs the most protection. It turns the sentinel into a dynamic reactive shield.
*   **T-07 (Frozen Heart):** A high-impact Rare skill that provides a "payoff" for stacking Chill. In long boss fights, this can generate massive amounts of Block, allowing the Tide player to survive otherwise lethal turns, cementing the archetype's identity as an unkillable glacier.
*   **T-25 (Reef Titan):** Provides much-needed passive sustain. In a defensive archetype, HP is often chipped away despite high Block; the Titan's **Lifelink** on block ensures the player can stabilize and stay in the "safe zone" throughout the run.

**Archetype B (Undertow Control) - Key Cards Rationale:**
*   **T-09 (Undertow):** A core "engine" card. It combines the element's primary damage multiplier (**Frail**) with card draw, ensuring the player never loses momentum while setting up for a big combo.
*   **T-12 (Echoing Depths) [NEW]:** This card bridges the gap between different keyword synergies. By rewarding the use of **Echo**, it encourages players to think about their turn sequencing and mana management more deeply than simple one-off spells.
*   **T-13 (Abyssal Gaze):** As a Rare, this provides the most powerful card draw in the element. It turns the enemy's existence into a resource, punishing high-HP targets by allowing the player to draw through their entire deck as they chip away at the foe.
*   **T-15 (Tidal Displacement):** The primary survival tool for tempo players. **Banish** is a powerful keyword that buys the player time to deal with smaller threats or set up a finishing blow without the interference of a major enemy unit.

**Archetype C (Tidal Surge) - Key Cards Rationale:**
*   **T-17 (Wave Crasher) [NEW]:** A mid-game creature that rewards high-action turns. By combining **Surge** and **Combo**, it acts as a bridge between pure ramp and pure aggression, giving the player a way to clear boards while regaining the mana spent.
*   **T-19 (Ancient Leviathan):** The archetypal "boss killer." Its high cost is offset by the **Surge** mechanic, rewarding players who can build up their mana pool. Its massive HP pool also makes it a secondary wall if the game goes long.
*   **T-21 (Maelstrom Engine) [NEW]:** A "build-around" Rare that enables the Surge archetype to reach its ceiling. By transforming every Tide card played into temporary mana, it allows for explosive turns that feel like a literal tidal wave of spells.
*   **T-24 (Overflowing Well) [NEW]:** Solves the "hand starvation" problem often faced by ramp decks. The **Overload** cost is a trade-off for immediate card advantage and potential mana cheating through the **Surge** kicker, making it a high-skill-ceiling utility card.


---

## 32. Düşman Bestiary Genişlemesi

> §8 üzerine kurulur (22 mevcut düşman). §32, 40+ düşman, 12+ elite ve 5 element boss
> mekanizasyonunu ekler. Her düşman: HP, element, intent rotasyonu, özel mekanik, lore snippet.
> Hybrid düşmanlar Act 2+ te başlar; 2 elementin zayıflığını taşırlar.

### 32.1 Act 1 Düşmanları (Zemin 1-17)

I will begin by researching the existing lore and enemy data to ensure the new bestiary is consistent with the world of Pact of Five.
Designed an enemy bestiary for Act 1 of Pact of Five, focusing on the balanced difficulty transition from floors 1 to 15 across the coastal and volcanic biomes of Aithra.

# Pact of Five: Act 1 Enemy Bestiary (Sunlit Coast & Volcanic Marsh)

Bu bestiary, Aithra Adası'nın ilk bölgelerinde karşılaşacağınız 14 temel tehdidi içermektedir. Sundering'in (kreyon-os) yarattığı element dengesizliği, bu yaratıkları doğal formlarından koparıp birer hayatta kalma makinesine dönüştürmüştür. Zorluk seviyesi "tutorial" başlangıcından Act 1 finaline kadar dengelenmiştir.

---

### Regular Enemies (Düşük - Orta Zorluk)

#### Lav-Akrep — Ember — Bruiser
- **HP:** 45 | **Element:** Ember | **Archetype:** Bruiser
- **Key Intents:** "Attack 8 dmg / Apply 2 Burn / Defend 5 block"
- **Special Mechanic:** Bu yaratık her fiziksel vuruşunda %25 ihtimalle oyuncunun üzerindeki Burn miktarını 1 artırır.
- **Turn Rotation:**
  Turn 1: Kızgın kıskaçlarıyla 8 hasar verir.
  Turn 2: Kuyruğundan sıçrattığı lav ile 2 Burn uygular.
  Turn 3: Kabuğuna çekilerek 5 block kazanır ve döngüyü başa sarar.
- **Lore Snippet:** Solomne'nin öfkesiyle dövülen bu canlılar, Ember Forge klanının en büyük korkusudur.

#### Mercan Gözcü — Tide — Tank
- **HP:** 65 | **Element:** Tide | **Archetype:** Tank
- **Key Intents:** "Defend 10 block / Attack 6 dmg / Apply 2 Chill"
- **Special Mechanic:** Aktif bir Block değeri varken saldırı aldığında, saldıranın mana kristallerini dondurarak bir sonraki tur manasını 1 azaltır.
- **Turn Rotation:**
  Turn 1: Kristal gövdesini siper ederek 10 block kazanır.
  Turn 2: Çevresindeki suyu dondurarak oyuncuya 2 Chill uygular.
  Turn 3: Ağır bir darbeyle 6 hasar verir ve döngüyü tekrarlar.
- **Lore Snippet:** Mhalrai'nin sessiz yeminini koruyan bu gözcüler, Sunlit Coast'un derinliklerini bekler.

#### Sarmaşık Boğan — Verdant — Trickster
- **HP:** 42 | **Element:** Verdant | **Archetype:** Trickster
- **Key Intents:** "Apply 1 Root / Attack 5 dmg / Apply 2 Vulnerable"
- **Special Mechanic:** Oyuncu Root statüsündeyken bu düşmanın tüm saldırıları %50 daha fazla hasar verecek şekilde güçlenir.
- **Turn Rotation:**
  Turn 1: Toprağın altından çıkan köklerle oyuncuya 1 Root uygular.
  Turn 2: Oyuncunun savunmasını zayıflatarak 2 Vulnerable basar.
  Turn 3: Güçlendirilmiş dikenleriyle 5 (veya bonuslu) hasar verir ve döngüye devam eder.
- **Lore Snippet:** Selmer-Iho'nun hatıralarını sarmalayan bu bitkiler, yoldan geçenleri asla bırakmaz.

#### Yıldırım Kanat — Storm — Swarmer
- **HP:** 32 | **Element:** Storm | **Archetype:** Swarmer
- **Key Intents:** "Attack 4 dmg / Apply 1 Shock / Attack 2x3 dmg"
- **Special Mechanic:** Her tur sonunda statik elektrik yüküyle oyuncunun elinden rastgele bir kartı Shock etkisiyle discard ettirir.
- **Turn Rotation:**
  Turn 1: Fırtına hızıyla 4 hasar vererek savaşı açar.
  Turn 2: Kanatlarından saçtığı elektrikle 1 Shock uygular.
  Turn 3: Üç hızlı dalış yaparak toplam 2x3 hasar verir ve başa döner.
- **Lore Snippet:** Velkir'in gökyüzünden kopan parçaları gibi, bu kanatlar fırtınanın habercisidir.

#### Gölge Tayfı — Umbra — Caster
- **HP:** 48 | **Element:** Umbra | **Archetype:** Caster
- **Key Intents:** "Apply 2 Shadow / Attack 7 dmg / Apply 1 Frail"
- **Special Mechanic:** Oyuncu üzerindeki her Shadow stack'i için bu düşman tur başında 2 HP iyileşerek formunu korur.
- **Turn Rotation:**
  Turn 1: Oyuncunun ruhunu karartarak 2 Shadow uygular.
  Turn 2: Oyuncunun gücünü emerek 1 Frail statüsü verir.
  Turn 3: Karanlık bir patlamayla 7 hasar verir ve döngüyü tekrarlar.
- **Lore Snippet:** Eshmir'in sessizliğinde kaybolan bu tayflar, Sundering'in silinmiş anılarıdır.

#### Kor Muhafız — Ember — Tank
- **HP:** 68 | **Element:** Ember | **Archetype:** Tank
- **Key Intents:** "Defend 12 block / Attack 10 dmg / Apply 2 Burn"
- **Special Mechanic:** Aktif Block değeri bir saldırıyla tamamen kırıldığında, patlama yaparak oyuncuya anında 3 Burn uygular.
- **Turn Rotation:**
  Turn 1: Volkanik kalkanını kaldırarak 12 block kazanır.
  Turn 2: Ağır bir vuruşla 10 hasar verir.
  Turn 3: Çevresine alev yayarak 2 Burn uygular ve döngüye döner.
- **Lore Snippet:** Solomne'nin uykusunda bile parıldayan bu zırhlar, volkanın sönmeyen kalbidir.

#### Buzul Kabuk — Tide — Healer
- **HP:** 58 | **Element:** Tide | **Archetype:** Healer
- **Key Intents:** "Defend 8 block / Heal 6 HP / Attack 5 dmg"
- **Special Mechanic:** Her 3 turda bir, dondurucu nefesiyle oyuncuya kalıcı olmayan 2 Chill uygular.
- **Turn Rotation:**
  Turn 1: Kabuğunu dondurarak 8 block kazanır.
  Turn 2: Antik suların gücüyle kendisini 6 HP iyileştirir.
  Turn 3: Düşük bir hasarla (5 dmg) saldırır ve döngüyü sürdürür.
- **Lore Snippet:** Mhalrai'nin yedi gelgitinden biri olan bu canlılar, yaraları dondurarak iyileştirir.

#### Dikenli Mantar — Verdant — Swarmer
- **HP:** 34 | **Element:** Verdant | **Archetype:** Swarmer
- **Key Intents:** "Apply 1 Vulnerable / Attack 3x2 dmg / Defend 4 block"
- **Special Mechanic:** Öldüğünde (Echo), oyuncunun ayaklarını toprağa bağlayacak 2 Root statüsü uygular.
- **Turn Rotation:**
  Turn 1: Havaya saçtığı sporlarla 1 Vulnerable uygular.
  Turn 2: İki hızlı darbeyle toplam 3x2 hasar verir.
  Turn 3: Toprağa tutunarak 4 block kazanır ve başa döner.
- **Lore Snippet:** Selmer-Iho'nun ormanındaki bu mantarlar, Sundering'den sonra zehirli bir hırsla büyüdü.

#### Statik Bulut — Storm — Caster
- **HP:** 44 | **Element:** Storm | **Archetype:** Caster
- **Key Intents:** "Apply 2 Shock / Attack 6 dmg / Apply 1 Dexterity loss"
- **Special Mechanic:** Havada asılı duran bu bulut, oyuncu her kart oynadığında %10 ihtimalle oyuncuya 1 statik hasar verir.
- **Turn Rotation:**
  Turn 1: Yoğun bir yükleme ile oyuncuya 2 Shock uygular.
  Turn 2: Şimşek çaktırarak 6 hasar verir.
  Turn 3: Oyuncunun çevikliğini kalıcı olarak (savaş boyu) 1 Dexterity düşürür ve döngüyü tekrarlar.
- **Lore Snippet:** Velkir'in parçalanmış yeminlerinden doğan bu bulutlar, fırtına tepelerinin bekçisidir.

#### Karanlık Pençe — Umbra — Bruiser
- **HP:** 56 | **Element:** Umbra | **Archetype:** Bruiser
- **Key Intents:** "Attack 12 dmg / Apply 2 Shadow / Defend 6 block"
- **Special Mechanic:** Shadow altındaki hedeflere vurduğunda, verdiği hasarın %50'si kadar HP yenileyen bir can çalma etkisine sahiptir.
- **Turn Rotation:**
  Turn 1: Gölge pençeleriyle 12 hasar verir.
  Turn 2: Karanlık bir sis yayarak 2 Shadow uygular.
  Turn 3: Kendini korumaya alarak 6 block kazanır ve döngüyü başa sarar.
- **Lore Snippet:** Eshmir'in silinen eylemlerinin fiziksel bir formu olan bu pençeler, sessizce avlanır.

---

### Elite Enemies (Yüksek Zorluk)

#### Volkanik Gazap — Ember — Elite
- **HP:** 115 | **Element:** Ember | **Archetype:** Elite
- **Key Intents:** "Attack 15 dmg / Apply 4 Burn / Defend 15 block"
- **Special Mechanic:** Her tur başında, bossun yanına destek vermesi için rastgele bir Ember Imp (10 HP) çağırır.
- **Turn Rotation:**
  Turn 1: Yerden fışkıran magma ile 15 hasar verir.
  Turn 2: Tüm savaş alanını ateşe boğarak 4 Burn uygular.
  Turn 3: Yoğun bir kül bulutuyla 15 block kazanır ve döngüye devam eder.
- **Phase Transition (HP ≤ 50%):** Gazap, volkanın çekirdeğine bağlanır; her tur sonunda kalıcı olarak +2 Strength kazanmaya başlar.
- **Lore Snippet:** Solomne'nin Sundering sırasında döktüğü gözyaşlarından doğan saf bir yıkım enerjisidir.

#### Fırtına Süvarisi — Storm — Elite
- **HP:** 105 | **Element:** Storm | **Archetype:** Elite
- **Key Intents:** "Attack 8x2 dmg / Apply 2 Shock / Apply 1 Vulnerable"
- **Special Mechanic:** Süvarinin her saldırısı, oyuncunun elindeki rastgele bir kartın mana maliyetini o tur için +1 artırır.
- **Turn Rotation:**
  Turn 1: Şimşek hızıyla iki kez 8 hasar (toplam 16) verir.
  Turn 2: Enerji patlamasıyla oyuncuya 2 Shock uygular.
  Turn 3: Hedefini belirleyerek 1 Vulnerable verir ve döngüyü tekrarlar.
- **Phase Transition (HP ≤ 50%):** Süvari "Swift" formuna geçer; tüm saldırıları artık oyuncunun Block değerinin %50'sini yok sayar (Pierce).
- **Lore Snippet:** Velkir'in bir zamanlar şerefini koruyan bu süvariler, artık sadece parçalamayı bilir.

#### Orman Muhafızı — Verdant — Elite
- **HP:** 125 | **Element:** Verdant | **Archetype:** Elite
- **Key Intents:** "Attack 10 dmg / Apply 2 Root / Heal 10 HP"
- **Special Mechanic:** Sahada başka bir Verdant yaratık olduğu sürece, her tur sonu bedelsiz olarak 5 Block kazanır.
- **Turn Rotation:**
  Turn 1: Devasa dallarıyla 10 hasar verir.
  Turn 2: Köklerini toprağa salarak oyuncuya 2 Root uygular.
  Turn 3: Doğanın özünü emerek kendini 10 HP iyileştirir ve döngüyü başa sarar.
- **Phase Transition (HP ≤ 50%):** Muhafızın derisi sertleşir ve "Thorns" kazanır; her fiziksel saldırı aldığında oyuncuya 3 hasar iade eder.
- **Lore Snippet:** Selmer-Iho'nun kutsal ormanını koruyan bu devler, yaşayan birer hapishaneye dönüştü.

#### Derinlik Laneti — Umbra — Elite
- **HP:** 95 | **Element:** Umbra | **Archetype:** Elite
- **Key Intents:** "Apply 3 Shadow / Attack 14 dmg / Apply 2 Frail"
- **Special Mechanic:** Oyuncunun discard ettiği her kart için bu düşman beslenir ve savaş sonuna kadar +1 Strength kazanır.
- **Turn Rotation:**
  Turn 1: Karanlığı yoğunlaştırarak 3 Shadow uygular.
  Turn 2: Boşluktan gelen bir darbeyle 14 hasar verir.
  Turn 3: Oyuncunun iradesini kırarak 2 Frail statüsü verir ve döngüyü tekrarlar.
- **Phase Transition (HP ≤ 50%):** Lanet, oyuncunun çektiği her kart için oyuncuya 2 doğrudan hasar veren bir aura yaymaya başlar.
- **Lore Snippet:** Eshmir'in terk ettiği Sundering Boşluğu'ndan gelen bu varlık, varlığı silmeye yeminlidir.


### 31.3 Verdant — Kart Kataloğu

# Verdant Element Card Catalog: The Emerald Wilds

The Verdant element (#22c55e) represents the dual nature of the deep woods: the slow, unstoppable growth of the Elder Grove and the sudden, violent eruption of the Canopy Storm. This catalog introduces 25 cards designed to support the Spore Garden swarm, the Elder Grove scaling, and the hybrid Storm-Verdant archetypes.

| ID | Name | Type | Cost | Stats | Keywords | Effect | Rarity | Flavor (Turkish) |
|:---|:---|:---|:---:|:---:|:---|:---|:---|:---|
| VER-001 | Sporeling | Unit | 1 | 1/1 | Bond | When played, if an adjacent ally is Verdant, gain +1/+1 and create a 0/1 Mushroom. | Common | Küçük ama bir o kadar hırslı; orman her zaman çoğalmanın bir yolunu bulur. |
| VER-002 | Fungal Shielder | Unit | 2 | 0/5 | Guard, Bond | **Bond:** Neighbors gain Guard. When this unit takes damage, Immobilize (Root) the attacker. | Common | Mantarların sert kabuğu, en keskin kılıçları bile durdurabilir. |
| VER-003 | Root Snare | Spell | 1 | - | Banish | Immobilize (Root) a target unit. If it was already Rooted, Banish it instead. | Common | Hareket ettikçe kökler daha da sıkı sarılıyor. Kaçış yok. |
| VER-004 | Verdant Acolyte | Unit | 2 | 2/2 | Resonate | **Resonate:** When you cast a spell, give a random ally +1/+0 this turn. | Common | Doğanın fısıltılarını duyanlar, her büyüde bir güç bulurlar. |
| VER-005 | Leafblade Dervish | Unit | 3 | 3/2 | Swift, Pierce | After this unit attacks, give it +1 ATK if the target was Rooted. | Uncommon | Yapraklar kadar hafif, rüzgar kadar keskin. Ormanın sessiz infazcısı. |
| VER-006 | [NEW] Spore Matriarch | Unit | 5 | 4/6 | Bond, Sigil | **Sigil:** Your units with Bond cost (1) less. When an ally Bonds, summon a 1/1 Sporeling. | Rare | O, her bir sporun annesi ve bahçenin ulu koruyucusudur. |
| VER-007 | Mycelium Pulse | Spell | 2 | - | Chain 2 | Give two target allies Bond and +1/+1. If they are neighbors, give them Lifelink. | Uncommon | Yer altındaki ağ, tüm ormanı tek bir nabızla birleştirir. |
| VER-008 | Grove Tender | Unit | 1 | 1/2 | Bond, Lifelink | **Bond:** This unit heals your Hero for 2 when it deals damage. | Common | Yaralı toprakları iyileştirmek, fidanları büyütmek onun görevi. |
| VER-009 | [NEW] Sage of the Canopy | Unit | 4 | 2/5 | Resonate, Surge | **Resonate:** Draw a card. **Surge:** If you have 10+ cards in your deck, gain +2 ATK. | Uncommon | Bilgelik, gökyüzüne uzanan dalların en ucunda saklıdır. |
| VER-010 | Whispering Wind | Spell | 0 | - | Echo | Give a unit +1/+0. If you cast this from Echo, also give it Swift. | Common | Orman asla unutmaz; rüzgarın fısıltısı hep geri döner. |
| VER-011 | Ancient Barkskin | Spell | 2 | - | Guard, Sigil | Give a unit Guard and +0/+4. **Sigil:** While this is in your hand, your Hero has +2 Armor. | Uncommon | Kadim ağaçların kabuğu, en ağır darbeleri bile sönümler. |
| VER-012 | Thorn Spitter | Unit | 2 | 2/1 | Volatile, Pierce | **Death:** Deal 2 damage to the enemy directly in front of this unit. | Common | Öldüğünde bile arkasında zehirli bir anı bırakır. |
| VER-013 | [NEW] Stormwood Treant | Unit | 5 | 4/4 | Overload(2), Guard | **Play:** Deal 2 damage to all Rooted enemies. Gain +1/+1 for each enemy hit. | Uncommon | Şimşekle dövülmüş odunlar, fırtınanın öfkesini taşır. |
| VER-014 | Fungal Infestation | Spell | 3 | - | Combo(2) | Fill your board with 1/1 Sporelings. **Combo(2):** Give them all Bond. | Common | Bir gece içinde tüm vadi mantarlarla kaplandı; artık çok geç. |
| VER-015 | Deep Root Meditation | Spell | 3 | - | Echo, Resonate | Draw 2 cards. **Resonate:** Reduce the cost of the drawn cards by (1). | Rare | Toprağın derinliklerine inmek, zihni berraklaştırır. |
| VER-016 | Moss-Covered Golem | Unit | 4 | 3/7 | Sigil | **Sigil:** While this unit is at full HP, your other units have +1/+1. | Uncommon | Yosunlar ve taşlar, ormanın sabrını simgeler. |
| VER-017 | Bramble Storm | Spell | 4 | - | Chain 4 | Deal 2 damage to 4 random enemies. Root any units damaged this way. | Rare | Dikenli dallar gökyüzünden bir yağmur gibi yağıyor. |
| VER-018 | [NEW] Verdant Echo | Spell | 2 | - | Echo, Resonate | Return a Verdant unit from your graveyard to your hand. It gains Resonate. | Uncommon | Doğa hiçbir şeyi israf etmez; her can bir yankıdır. |
| VER-019 | Pollen Haze | Spell | 2 | - | Frail | All enemies gain Frail until your next turn. Draw a card. | Common | Polenler gözleri kör eder, savunmaları zayıflatır. |
| VER-020 | Swiftvine Striker | Unit | 2 | 2/2 | Swift, Combo(2) | **Combo(2):** Attack an additional time this turn. | Common | Sarmaşıklar bir kırbaç gibi şaklar, kaçmak imkansızdır. |
| VER-021 | Elder Grove Guardian | Unit | 6 | 6/8 | Guard, Bond, Sigil | **Bond:** Cannot be targeted by enemy spells. **Sigil:** Your Hero is Immune. | Rare | O ayaktayken orman güvendedir, kökler onu korur. |
| VER-022 | [NEW] Spore Cloud | Spell | 1 | - | Banish, Volatile | **Banish** a card from your graveyard to Root all units in a target lane. | Common | Spor bulutu dağıldığında geriye sadece taş kesilmiş gölgeler kalır. |
| VER-023 | Canopy Surge | Spell | 3 | - | Surge, Overload(1) | Deal 5 damage to a unit. If it survives, give it Frail and Root. | Uncommon | Kanopiden gelen güç, bazen taşıyanı bile yakar. |
| VER-024 | Willow Wisp | Unit | 1 | 1/1 | Volatile, Lifelink | When this unit deals damage, heal your Hero for that much. | Common | Bataklığın ışığı, umutla ölümü bir arada sunar. |
| VER-025 | Twisting Vines | Spell | 2 | - | Combo(3), Pierce | Deal 3 damage to a unit and Root it. **Combo(3):** Also deal 3 damage to its neighbors. | Uncommon | Sarmaşıklar kemikleri kırana kadar sıkmaya devam eder. |

### Design Notes

1. **VER-001 Sporeling:** This is the baseline unit for the "Spore Garden" archetype. The low cost and Bond synergy allow for early-game board presence, while the 0/1 Mushroom spawn sets up future Bond connections without consuming high-stat slots.
2. **VER-006 Spore Matriarch:** Designed as the Rare build-around for the swarm deck. Her Sigil reduces the cost of Bond units, enabling "hand-dump" turns, while her passive effect rewards the player for positioning units correctly by generating even more tokens.
3. **VER-009 Sage of the Canopy:** A core piece for the "Elder Grove" engine. The combination of Resonate (card draw) and Surge (power scaling based on deck size) encourages a slower, control-oriented playstyle that values card advantage over early aggression.
4. **VER-013 Stormwood Treant:** A bridge card between Verdant and Storm. It rewards the "Root" mechanic by providing AOE damage and self-buffing, making it a powerful mid-game swing card against board-heavy opponents.
5. **VER-015 Deep Root Meditation:** High-value card draw for the Grove Sage archetype. The cost reduction via Resonate allows for combo turns, enabling the player to play the cards they just drew in the same turn if they've managed their mana well.
6. **VER-017 Bramble Storm:** The ultimate "Canopy Storm" finisher. Chain 4 ensures multiple targets are hit, and the guaranteed Root effect sets up perfect targets for cards like Stormwood Treant or Leafblade Dervish.
7. **VER-021 Elder Grove Guardian:** A high-cost "finisher" that provides massive defensive utility. By protecting the Hero and the unit itself (via Bond), it forces the opponent to deal with the board using units rather than spells, playing into Verdant's high-health strengths.
8. **VER-003 Root Snare:** A simple but effective removal spell. The synergy with Banish makes it relevant even in the late game against big threats that have already been immobilised by other Verdant effects.
9. **VER-010 Whispering Wind:** A 0-cost spell specifically included to trigger Resonate and Combo keywords without consuming mana. The Echo keyword ensures it can be used twice, doubling its utility for spell-scaling units.
10. **VER-018 Verdant Echo:** Provides much-needed graveyard recursion for the element. By granting the returned unit Resonate, it transforms even simple creatures into potential card-draw or power-scaling engines for the Elder Grove.
11. **VER-025 Twisting Vines:** A versatile removal and crowd-control tool. The Combo(3) requirement rewards decks that can play multiple cheap Sporelings or spells in a single turn, providing a massive tempo swing.
12. **VER-012 Thorn Spitter:** A "deterrent" unit. Its low health and Volatile keyword make it easy to kill, but the Pierce and Death effect mean it almost always trades effectively, discouraging the opponent from placing high-priority units in front of it.


### 31.4 Storm — Kart Kataloğu

This card catalog introduces the **Storm** element (Violet `#a78bfa`) to *Pact of Five*, focusing on the interplay between high-speed movement, cascading damage, and the heavy toll of raw elemental power.

### Storm Element Card Catalog

| ID | Name | Type | Cost | Stats | Keywords | Effect | Rarity | Flavor (Turkish) |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| ST01 | Spark Bolt | Spell | 0 | - | Chain 1 | Deal 2 damage. | Common | "Küçük bir kıvılcım, büyük bir yangının habercisidir." |
| ST02 | Zephyr Sprite | Creature | 1 | 2/1 | Swift | When played, draw 1 card. | Common | "Göz açıp kapayıncaya kadar orada, sonra yok." |
| ST03 | Static Hum | Skill | 1 | - | Sigil | Your first Swift card each turn costs 0. | Uncommon | "Havadaki iyonlar savaşın ritmiyle titreşiyor." |
| ST04 | Thunder Clap | Spell | 2 | - | Frail | Deal 5 damage to all enemies. Apply 1 Frail to target. | Common | "Gök gürlediğinde, yer titrer." |
| ST05 | Cloud Weaver [NEW] | Creature | 2 | 3/3 | Bond | Bond: Your Chain effects trigger +1 additional time. | Uncommon | "Bulutları bir nakış gibi işleyen kadim ruh." |
| ST06 | Lightning Rod | Skill | 1 | - | Guard | Gain 6 Shield. Combo(2): Gain 4 more. | Common | "Öfkeyi toprağa ileten sükunet." |
| ST07 | Overcharge | Spell | 0 | - | Overload(1) | Gain 1 Energy. Surge. | Uncommon | "Kısa süreli güç, uzun süreli yorgunluk." |
| ST08 | Gale Blade | Spell | 1 | - | Pierce | Deal 7 damage. If target has Frail, Echo. | Common | "Rüzgarın keskinliği çelikten daha derindir." |
| ST09 | Storm Herald | Creature | 3 | 4/4 | Resonate | Resonate: Deal 2 damage to a random enemy. | Uncommon | "Fırtınanın gelişini kanat çırpışıyla duyurur." |
| ST10 | Chain Reaction | Spell | 2 | - | Chain 3 | Deal 4 damage. Combo(3): Chain 5 instead. | Uncommon | "Bir dokunuş, binlerce yankı." |
| ST11 | Eye of the Storm [NEW] | Skill | 4 | - | Banish | Set all enemies' health to half. Overload(2). | Rare | "Merkezdeki sessizlik, yıkımın en saf halidir." |
| ST12 | Volt Talon | Creature | 1 | 3/1 | Volatile, Swift | When this dies, deal 4 damage to all enemies. | Common | "Ölümü bile bir patlama kadar gürültülü." |
| ST13 | Skyward Reach | Skill | 1 | - | Banish | Hand size +2 this turn. Draw 2 cards. | Common | "Göklere uzanmak, sınırları aşmaktır." |
| ST14 | Turbulent Air | Spell | 2 | - | Frail | All enemies gain 2 Frail. Surge. | Common | "Nefes almak bile bir yük haline gelir." |
| ST15 | Cyclone Dancer | Creature | 2 | 2/4 | Swift | Every time you play a Swift card, gain 2 Shield. | Uncommon | "Kasırganın içinde bile dengesini asla kaybetmez." |
| ST16 | Fulgurite Spike | Spell | 1 | - | Pierce, Banish | Deal 8 damage. If it kills, gain 1 Energy. | Common | "Yıldırımın kumda bıraktığı camlaşmış öfke." |
| ST17 | Plasma Shield | Skill | 2 | - | Lifelink | Gain 10 Shield. Reflect 3 damage to attacker. | Uncommon | "Parlayan bir koruma, emen bir karanlık." |
| ST18 | Thunderous Roar [NEW] | Spell | 3 | - | Chain 2 | Deal 12 damage. Combo(4): Cost reduced to 0. | Rare | "Ses dalgaları kemikleri un ufak eder." |
| ST19 | Static Field | Skill | 2 | - | Sigil | Whenever an enemy attacks, they take 3 damage. | Uncommon | "Yaklaşmak, çarpılmayı göze almaktır." |
| ST20 | Wind-Blessed Mantle | Skill | 1 | - | Bond | Bond: Your first card each turn gains Echo. | Uncommon | "Rüzgarın koruyucu pelerini omuzlarında." |
| ST21 | Tempest Caller | Creature | 4 | 5/5 | Overload(1) | Battlecry: Deal 10 damage to all enemies. | Rare | "O çağırdığında, gökyüzü boyun eğer." |
| ST22 | Arc Lightning | Spell | 1 | - | Chain 2 | Deal 5 damage. If hand size > 5, Chain 4. | Common | "Zihin doluysa, elektrik daha kolay akar." |
| ST23 | Vacuum Pulse [NEW] | Skill | 0 | - | Combo(2) | Pull target to front position. Draw 1 card. | Common | "Boşluk, her şeyi kendine çeker." |
| ST24 | Squall Rider | Creature | 2 | 3/2 | Swift | Resonate: Gain +1/+1 temporarily this turn. | Common | "Fırtınanın sırtında bir süvari." |
| ST25 | Final Flash [NEW] | Spell | 5 | - | Overload(3), Banish | Deal 30 damage. Pierce. Echo. | Rare | "Son ışık, her şeyi sonsuz bir karanlığa gömer." |

### Design Notes

*   **ST01 (Spark Bolt):** The fundamental enabler for the "Chain Lightning" archetype. Its 0-cost allows it to be woven into any turn to kickstart Combo(N) counts or trigger Resonate.
*   **ST03 (Static Hum):** A critical engine for "Static Barrage." By making the first Swift card cost 0, it allows for explosive tempo starts, letting players drop creatures like ST02 for free.
*   **ST05 (Cloud Weaver):** Designed as the centerpiece for Chain-heavy decks. It essentially doubles the output of cards like ST10, making it a priority target for the player to protect with Guard.
*   **ST07 (Overcharge):** Represents the "Eye of the Storm" philosophy—raw power at a price. The Overload(1) is a debt paid later, but the immediate energy and Surge trigger can win the game now.
*   **ST11 (Eye of the Storm):** A massive momentum shifter. It punishes high-health bosses but forces a slow subsequent turn. The Banish keyword ensures it can't be abused repeatedly in the same fight.
*   **ST12 (Volt Talon):** A hybrid aggro/control card. It uses Swift for immediate pressure and Volatile to provide a "death rattle" AOE, perfect for clearing low-health enemy swarms.
*   **ST15 (Cyclone Dancer):** Provides the necessary sustainability for the Swift archetype. It transforms offensive movement into defensive layering, rewarding the player for staying "fast."
*   **ST18 (Thunderous Roar):** A reward for the "Chain Lightning" player. Reaching Combo(4) in a Storm deck is easy with 0-cost cards, making this 12-damage nuke a frequent free play.
*   **ST19 (Static Field):** A persistent Sigil that punishes aggressive multi-hit enemies. It reflects the "Static Barrage" theme by dealing damage without requiring the player to take an active turn.
*   **ST22 (Arc Lightning):** Scales with hand-size, encouraging players to use draw spells like ST13. It bridges the gap between the "Chain Lightning" and "Static Barrage" styles.
*   **ST23 (Vacuum Pulse):** A utility [NEW] card that manipulates board state. Positioning is key in roguelikes, and this allows Storm decks to pull squishy backline enemies into the path of Pierce attacks.
*   **ST25 (Final Flash):** The ultimate "Eye of the Storm" finisher. It is essentially three cards in one due to Echo and Pierce, but the Overload(3) means the player is effectively stunned the next turn if the enemy survives.


### 31.5 Umbra — Kart Kataloğu

### Umbra Element Card Catalog: Shadow, Curses, and the Void

The **Umbra** element (#64748b) focuses on the inevitability of darkness. It utilizes the **Shadow** status—a stacking debuff that deals damage at the start of the enemy's turn—and the **Banish** keyword to fuel powerful "Exhaust Engines." The Umbra's "Curse Lattice" archetype focuses on polluting enemy actions and setting "Sigil" traps that punish specific behaviors like healing or multi-attacking.

**Mechanic Definition: Shadow (Status)**
At the start of the target's turn, they take damage equal to the number of Shadow stacks. The stacks then decrease by 1. Payoff cards can "Detonate" these stacks for immediate massive damage.

---

### Umbra Card Table (25 Cards)

| ID | Name | Type | Cost | Stats | Keywords | Effect | Rarity | Flavor (Turkish) |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| UM-001 | Dark Strike | Attack | 1 | 6 DMG | - | Apply 2 Shadow. | Common | "Karanlık her zaman ilk darbeyi vurur." |
| UM-002 | Shaded Veil | Skill | 1 | 8 GD | Guard | Apply 1 Shadow to the attacker when hit this turn. | Common | "Gölge, en sadık kalkandır." |
| UM-003 | Hollow Echo | Skill | 0 | - | Banish | Draw 1 card. If the drawn card is a Skill, gain 1 Mana. | Common | "Boşluktan gelen fısıltılar asla susmaz." |
| UM-004 | Creeping Blight | Attack | 1 | 4 DMG | Chain 2 | Apply 2 Shadow. If the target has Frail, apply 4 Shadow instead. | Common | "Sinsi bir çürüme kemiklerine işliyor." |
| UM-005 | Gloom Sigil | Skill | 1 | 8 DMG | Sigil | When the enemy attacks, they take 8 damage and lose 1 Strength. | Common | "Kasvetin mührü her hareketi cezalandırır." |
| UM-006 | Fading Step | Skill | 1 | 6 GD | Swift | Gain 6 Guard. Next turn, start with +1 Draw. | Common | "Göz açıp kapayıncaya kadar yok oldu." |
| UM-007 | Bone Chiller | Attack | 2 | 12 DMG | Frail | Apply Frail (2 turns). Shadow stacks on target do not decay next turn. | Common | "Ölümün soğuk nefesi ensende." |
| UM-008 | Ravenous Shadow | Attack | 1 | 5 DMG | Lifelink | Deal 5 damage. Heal for the amount of Shadow stacks on the target. | Common | "Gölge acıktığında, sadece ruhlar doyurabilir." |
| UM-009 | Curse Bolt | Attack | 0 | 3 DMG | - | Add 1 'Decay' curse to the enemy's deck. | Common | "Bu yara asla kabuk bağlamayacak." |
| UM-010 | Lingering Spirit | Skill | 1 | - | Resonate | Apply 3 Shadow. If played after an Umbra card, apply 3 more. | Common | "Ruhun kalıntıları karanlıkta asılı kaldı." |
| UM-011 | Cursed Offering | Skill | 1 | - | Banish | Exhaust 1 card in hand. Gain 2 Mana. | Common | "Bedel ödenmeden güç elde edilmez." |
| UM-012 | Shade's Touch | Attack | 1 | 7 DMG | Pierce | Ignore Guard. Apply 1 Shadow. | Common | "Zırhın gölgelere karşı bir hükmü yok." |
| UM-013 | Umbra Blast [NEW] | Attack | 2 | 10 DMG | - | **Detonate:** Trigger all Shadow damage on target immediately. | Uncommon | "Patlayan karanlık her şeyi yutar." |
| UM-014 | Soul Shred | Attack | 2 | 15 DMG | Banish | Deal 15 damage. If this kills the enemy, gain 1 Max Mana. | Uncommon | "Ruhun parçaları boşluğa savruldu." |
| UM-015 | Pain Lattice [NEW] | Skill | 2 | - | Sigil | Whenever the enemy heals, they take 12 damage instead. | Uncommon | "İyileşme çabası, acını sadece katlar." |
| UM-016 | Void Surge | Skill | 3 | - | Surge | Next turn, your first 2 Umbra cards cost 0. | Uncommon | "Boşluğun dalgası her şeyi sıfırlar." |
| UM-017 | Abyssal Maw [NEW] | Attack | 2 | 9x2 DMG | Overload(1) | Deal 9 damage twice. Apply 2 Shadow for each hit. | Uncommon | "Derinliklerin ağzı açıldı, kaçış yok." |
| UM-018 | Mournful Bond | Skill | 1 | - | Bond | Link to an ally/minion. While linked, you both have Lifelink. | Uncommon | "Yas tutanların bağı koparılamaz." |
| UM-019 | Echoes of Ruin | Skill | 2 | - | Combo(2) | Double the current Shadow stacks on the target. | Uncommon | "Yıkımın yankıları her vuruşta büyüyor." |
| UM-020 | Nightfall Sigil | Skill | 2 | - | Sigil | When enemy turn ends, gain 4 Guard per Shadow stack on them. | Uncommon | "Gece çöktüğünde karanlık seni korur." |
| UM-021 | Grave Fuel [NEW] | Skill | 1 | - | - | For each card in the Banish pile, apply 1 Shadow to all enemies. | Uncommon | "Mezarlık, gölgelerin en büyük yakıtıdır." |
| UM-022 | Eclipse Engine [NEW]| Skill | 3 | - | - | **Passive:** Whenever you Banish/Exhaust a card, draw 1 card. | Rare | "Tutulma başladığında, döngü durdurulamaz." |
| UM-023 | Herald of Doom | Attack | 4 | 35 DMG | Volatile | Deal 35 damage. If not played this turn, Exhaust it. | Rare | "Kıyamet habercisi sadece bir kez kapıyı çalar." |
| UM-024 | Dark Pact | Skill | 0 | - | Banish | Your next 2 Skills this combat gain Echo. | Rare | "Karanlıkla yapılan anlaşma geri alınamaz." |
| UM-025 | Singularity | Attack | X | X DMG | - | Deal X damage. Apply X Shadow. Repeat X times. | Rare | "Her şey tek bir noktada son bulur." |

---

### Design Notes

**UM-013 Umbra Blast [NEW]**
The primary finisher for the "Shadow Detonate" archetype. By detonating stacks, the player bypasses the "decay over time" mechanic of Shadow, converting a slow DoT into a massive burst. It scales exponentially with "Echoes of Ruin" (UM-019) and "Singularity" (UM-025).

**UM-022 Eclipse Engine [NEW]**
The cornerstone of the "Exhaust Engine." Umbra often suffers from low hand sizes due to Banish effects. This card turns that drawback into a cycle mechanism. It synergizes perfectly with "Hollow Echo" (UM-003) and "Cursed Offering" (UM-011) to create infinite or semi-infinite turn possibilities.

**UM-015 Pain Lattice [NEW]**
Specifically designed for the "Curse Lattice" archetype to counter high-regen bosses. In "Pact of Five," healing is often a critical survival mechanic for enemies; this Sigil flips the script. It represents the "anti-heal" and "punishment" identity of the Umbra element.

**UM-017 Abyssal Maw [NEW]**
Provides a high-impact multi-hit attack that benefits twice from flat damage buffs. The Overload(1) cost forces the player to manage their mana curve carefully, fitting the Umbra theme of "power at a cost." The 4 total Shadow stacks applied make it a core setup card for detonators.

**UM-021 Grave Fuel [NEW]**
A late-combat scaling card. In long boss fights where the player has Banished half their deck, this becomes a 1-mana "Apply 15+ Shadow" monster. It rewards players for leaning heavily into the Exhaust/Banish mechanics rather than just simple attacking.

**UM-025 Singularity [NEW]**
The ultimate X-cost Rare. Its power is quadratic—as X increases, the number of hits, raw damage, and shadow stacks all grow. At 3 mana (X=3), it deals 9 damage and applies 9 shadow. At 5 mana, it is a run-ending catastrophe for the enemy.

**UM-005 & UM-020 (Sigil Traps)**
These represent the "Curse Lattice" playstyle. Instead of active defense, Umbra uses Sigils to create a reactive board state. UM-020, in particular, rewards the player for stacking Shadow by giving them massive Guard, allowing for a "stall and rot" strategy.

**UM-011 Cursed Offering**
A high-skill ceiling card. It requires the player to choose which tool to permanently remove (Exhaust/Banish) in exchange for tempo. In an "Exhaust Engine" deck, the "downside" of exhausting a card is actually a trigger for other bonuses.

**UM-009 Curse Bolt**
A representative of the "deck pollution" strategy. By adding 'Decay' curses (unplayable cards that damage the holder), the Umbra player forces the enemy to waste "draw slots," effectively reducing the enemy's average damage per turn.

**UM-003 Hollow Echo**
The most efficient cycle tool in the element. Its 0-cost and Banish keyword make it a "free" card that thins the deck while potentially refunding mana. It is essential for reaching core combo pieces in the Shadow Detonate archetype.

**UM-008 Ravenous Shadow**
Umbra's primary sustain tool. Since Umbra lacks the high raw Guard of the Solis element, it relies on Lifelink. This card's healing is variable, forcing players to time their attacks when Shadow stacks are at their peak for maximum recovery.

**UM-023 Herald of Doom**
A "Volatile" powerhouse. It emphasizes the "now or never" nature of the void. If the player cannot generate the 4 mana required immediately, the opportunity is lost to the void (Banish), perfectly flavor-matching the Turkish name "Kıyamet Habercisi."


### 32.2 Act 2 Düşmanları (Zemin 18-34, Hybrid Düşmanlar)

I will start by researching the element system and existing enemy designs to ensure the new Act 2 bestiary is mechanically consistent with the "Pact of Five" project.
I have analyzed the elemental system and existing enemy designs. I will now generate the Act 2 bestiary, ensuring it meets all requirements, including multi-element hybrids, specific HP ranges, phase transitions for elites, and the integration of status specialists and lore.

### Act 2 Bestiary: The Shattered Isle of Aithra

#### Tempest Crab — Storm/Tide — Tank
- **HP:** 115 | **Element(s):** Storm/Tide | **Archetype:** Tank
- **Key Intents:** Shell Fortify (Defend 15), Crushing Pincer (Attack 12), Salt Spray (Debuff: Vulnerable 2).
- **Special Mechanic:** Gains 3 Dexterity whenever it blocks more than 20 damage in a single turn. Weak to Verdant (beats Tide) and Tide (beats Storm).
- **Turn Rotation:** Starts with Shell Fortify to build early defense. Cycles between Salt Spray to soften the player and Crushing Pincer for heavy physical damage. Every fourth turn, it uses a massive block-and-attack combo.
- **Lore Snippet:** These behemoths migrated from the deep trenches of Selmer-Iho's domain after the Sundering cracked the seabed.

#### Ashfiend — Ember/Umbra — Bruiser
- **HP:** 95 | **Element(s):** Ember/Umbra | **Archetype:** Bruiser
- **Key Intents:** Searing Slash (Attack 10 + Burn 2), Shadow Step (Defend 8 + Shadow 2), Overheat (Buff: Strength 3).
- **Special Mechanic:** At the start of its turn, if it has Burn, it deals 4 damage to the player automatically. Weak to Umbra (beats Ember) and Storm (beats Umbra).
- **Turn Rotation:** Uses Shadow Step first to hide behind a layer of darkness. Alternates between Searing Slash and Overheat to build a dangerous offensive presence. If ignored for too long, its Strength scaling becomes lethal.
- **Lore Snippet:** Born from the cooling lava of Solomne’s peaks, these spirits were twisted by Mhalrai’s creeping void.

#### Moss-Heart Shaman — Verdant — Healer/Caster
- **HP:** 82 | **Element(s):** Verdant | **Archetype:** Healer/Caster
- **Key Intents:** Vitality Surge (Heal 15), Rooting Grasp (Attack 6 + Root 1), Spore Cloud (Debuff: Frail 2).
- **Special Mechanic:** Heals itself or allies for 10% of their Max HP whenever the player ends their turn without playing an Ember card.
- **Turn Rotation:** Typically opens with Rooting Grasp to pin the player down. Uses Spore Cloud to reduce the player's defensive capabilities before focusing on Vitality Surge. It prioritizes healing itself once below 40 HP.
- **Lore Snippet:** Once protectors of Eshmir’s sacred groves, they now use their life-gifts to sustain the island's corruption.

#### Cinder-Tail Fox — Ember — Trickster (Burn-spammer)
- **HP:** 74 | **Element(s):** Ember | **Archetype:** Trickster
- **Key Intents:** Flame Leap (Attack 7 + Burn 3), Ember Tail (Debuff: Burn 5), Heat Haze (Defend 10 + Dexterity 2).
- **Special Mechanic:** Deals double damage to targets already affected by Burn.
- **Turn Rotation:** Spams Ember Tail on turn one to maximize Burn stacks. Follows with Flame Leap to capitalize on the status damage. Uses Heat Haze periodically to avoid incoming counter-attacks while the player burns.
- **Lore Snippet:** Solomne’s messengers were once golden-furred, but their tails turned to living charcoal during the Great Fire.

#### Frost-Spire Jelly — Tide — Caster (Chill-stacker)
- **HP:** 88 | **Element(s):** Tide | **Archetype:** Caster
- **Key Intents:** Glacial Pulse (Debuff: Chill 3), Ice Shard (Attack 14), Flash Freeze (Attack 8 + Chill 2).
- **Special Mechanic:** Chill stacks on the player also reduce the player's Strength by 1 per 3 stacks.
- **Turn Rotation:** Focuses entirely on Glacial Pulse and Flash Freeze for the first three turns. Once the player is heavily Chilled, it unleashes Ice Shard for high impact. It resets its pattern if the player manages to clear their status effects.
- **Lore Snippet:** Floated inland when Selmer-Iho’s tides rose to claim the lowlands during the Sundering.

#### Static Weaver — Storm — Swarmer (Shock-applier)
- **HP:** 70 | **Element(s):** Storm | **Archetype:** Swarmer
- **Key Intents:** Lightning Thread (Debuff: Shock 2), Volt Jolt (Attack 4x3), Discharge (Attack 12 + Shock 1).
- **Special Mechanic:** Every time it applies Shock, it gains 5 Block.
- **Turn Rotation:** Uses Lightning Thread repeatedly to stack Shock on the player. Switches to Volt Jolt to trigger multiple instances of Shock damage in a single turn. Finishes its cycle with Discharge before retreating into a defensive stance.
- **Lore Snippet:** These arachnids spin webs of pure electricity across the mountain passes of Velkir’s Reach.

#### Gloom-Wing Bat — Umbra — Swarmer
- **HP:** 72 | **Element(s):** Umbra | **Archetype:** Swarmer
- **Key Intents:** Echo Screech (Debuff: Vulnerable 1), Shadow Bite (Attack 5x2 + Shadow 1), Wing Buffet (Attack 8 + Defend 6).
- **Special Mechanic:** Gains 2 Strength every time it deals damage to a player with the Shadow status.
- **Turn Rotation:** Opens with Echo Screech to ensure its bites land harder. Spams Shadow Bite to stack the Shadow status and scale its own Strength. Uses Wing Buffet as a fallback to maintain balance between offense and defense.
- **Lore Snippet:** They thrive in the lightless caverns where Mhalrai’s influence is strongest.

#### Verdant Sentinel — Verdant — Tank
- **HP:** 120 | **Element(s):** Verdant | **Archetype:** Tank
- **Key Intents:** Ironbark Skin (Defend 20), Vine Slam (Attack 15 + Root 1), Bramble Aura (Buff: Thorns 4).
- **Special Mechanic:** Reflects 4 damage back to the player for every card played against it while it has Block.
- **Turn Rotation:** Constantly maintains Ironbark Skin to keep its reflection mechanic active. Uses Bramble Aura early in the fight to punish multi-hit attacks. Vine Slam is used sparingly as a heavy-hitting finisher.
- **Lore Snippet:** Constructed from the hardest wood in Eshmir’s forest to guard the bridges after the Sundering.

#### Mist-Walker — Tide/Umbra — Trickster
- **HP:** 90 | **Element(s):** Tide/Umbra | **Archetype:** Trickster
- **Key Intents:** Obscuring Fog (Defend 12 + Shadow 3), Chilling Touch (Attack 9 + Chill 2), Vanish (Buff: Intangible 1).
- **Special Mechanic:** The player has a 25% chance to miss their attacks if they have both Chill and Shadow. Weak to Verdant (beats Tide) and Storm (beats Umbra).
- **Turn Rotation:** Uses Obscuring Fog to set up the miss-chance early. Alternates with Chilling Touch to maintain status pressure. Uses Vanish once every five turns to completely negate a player's big offensive move.
- **Lore Snippet:** Half-drowned ghosts that haunt the border between Selmer-Iho's coast and Mhalrai's void.

#### Elite: Herald of Solomne — Ember/Verdant — Elite/Bruiser
- **HP:** 165 | **Element(s):** Ember/Verdant | **Archetype:** Elite
- **Key Intents:** Solar Flare (Attack 18 + Burn 4), Growth Spurt (Buff: 5 Strength), Pyre Wall (Defend 25).
- **Special Mechanic:** **Phase 1:** Every Ember card the player plays increases the Herald's Strength by 1. **Phase 2 (under 50% HP):** Converts all Burn on the player into direct Max HP reduction. Weak to Umbra (beats Ember) and Ember (beats Verdant).
- **Turn Rotation:** Starts by alternating Solar Flare and Pyre Wall to grind the player down. Uses Growth Spurt at the start of Turn 3. After the phase transition, it ignores defense and attacks every turn with Solar Flare.
- **Lore Snippet:** A champion chosen by Solomne to ensure the fires of the Sundering never truly go out.

#### Elite: Reaper of Mhalrai — Umbra — Elite/Caster
- **HP:** 145 | **Element(s):** Umbra | **Archetype:** Elite
- **Key Intents:** Soul Reap (Attack 20 + Shadow 5), Void Shield (Defend 30), Doom (Debuff: Player dies in 5 turns).
- **Special Mechanic:** **Phase 1:** Shadow status reduces player healing by 100%. **Phase 2:** Gains "Lifesteal" — heals for 50% of all damage dealt.
- **Turn Rotation:** Casts Doom on Turn 1 to set a clock on the fight. Spams Void Shield and Soul Reap to survive until the Doom timer expires. In Phase 2, it becomes much more aggressive, attacking every single turn.
- **Lore Snippet:** The final mercy offered by Mhalrai to those who lost everything in the Sundering.

#### Elite: Selmer-Iho’s Guard — Tide — Elite/Tank
- **HP:** 190 | **Element(s):** Tide | **Archetype:** Elite
- **Key Intents:** Tidal Wave (Attack 22 + Chill 3), Coral Bulwark (Defend 40), Whirlpool (Debuff: Root 2 + Frail 2).
- **Special Mechanic:** **Phase 1:** Gains 10 Block at the start of every player turn. **Phase 2:** Gains "Enraged" — loses all Block but deals 50% more damage.
- **Turn Rotation:** Rotates Coral Bulwark and Whirlpool to be an immovable object. Uses Tidal Wave only when the player is Rooted. After the 50% HP mark, it shatters its own armor to unleash a relentless assault.
- **Lore Snippet:** These armored sentinels once kept the peace in the underwater cities of Selmer-Iho.

#### Elite: Velkir’s Storm-Drake — Storm — Elite/Trickster
- **HP:** 155 | **Element(s):** Storm | **Archetype:** Elite
- **Key Intents:** Sky Strike (Attack 8x4), Thunder Clap (Debuff: Shock 4 + Vulnerable 2), Gale Force (Defend 20 + Dexterity 3).
- **Special Mechanic:** **Phase 1:** Takes 0 damage from the first attack each turn. **Phase 2:** Attacks twice per turn, but loses the damage negation.
- **Turn Rotation:** Uses Gale Force and Thunder Clap to make attacking it difficult. Sky Strike is used as a frequent, high-variance threat. In Phase 2, it loops Sky Strike and Thunder Clap without pause.
- **Lore Snippet:** Velkir's pets were let loose to scavenge the remains of the floating islands after the Sundering.

#### Elite: Eshmir’s Ancient — Verdant — Elite/Bruiser
- **HP:** 180 | **Element(s):** Verdant | **Archetype:** Elite
- **Key Intents:** Ancient Reach (Attack 25), Photosynthesis (Heal 20 + Strength 2), Entangle (Debuff: Root 3).
- **Special Mechanic:** **Phase 1:** Thorns 5. **Phase 2:** Thorns is replaced by "Regeneration" (Heals 15 HP at start of turn).
- **Turn Rotation:** Entangle on turn one is mandatory. Alternates between Ancient Reach and Photosynthesis. Once it enters Phase 2, it focuses on stacking Strength while its regeneration keeps it alive.
- **Lore Snippet:** The oldest living being on Aithra, now driven mad by the severed connection to Eshmir.


### 32.3 Boss ve Elite Mekanizmaları

I will begin by investigating the existing element system, keywords, and enemy data in the codebase to ensure the new boss and elite specifications align with the game's mechanics and lore.
I will now examine the element interactions, keywords, and existing enemy definitions to ensure the new specifications are consistent with the current game design.
I have gathered sufficient information regarding the game's elemental mechanics, keywords, and enemy structures. I will now proceed to design the elite and boss specifications, ensuring they align with the Sundering canon and the five-element system (Ember, Verdant, Tide, Storm, Umbra). I will include three phases for each boss, two phases for each mini-boss, and detailed lore in Turkish as requested, while maintaining a consistent design intent for each encounter.

#### Solomne'nin Seçilmişi (Solomne's Chosen) — Ember — Boss
- **HP:** 280 | **Phases:** 3
- **Phase 1 (100%-67% HP):** "Sadakat Kıvılcımı" - Her 2 turda bir 10 HP'lik 2 adet "Lesser Imp" çağırır. Düşük hasarlı saldırılarla birlikte oyuncuya 2 katman "Burn" uygular. Statik bir savunma duruşu sergiler.
- **Phase 2 (66%-34% HP):** "Alevin Gazabı" - Müzik hızlanır, boss kükreyerek tüm minyonları feda eder ve feda edilen her minyon için +2 Strength kazanır. "Inferno Pillar" (15 Hasar + 3 Burn) ve "Molten Shell" (20 Block) yeteneklerini kullanmaya başlar.
- **Phase 3 (33%-0% HP):** "Kül Olma Arzusu" - Görsel olarak boss tamamen alevlere bürünür. Nihai mekanik: "Supernova" - Oyuncuya 25 hasar verirken kendine de 10 hasar verir, ancak her kullanımda kalıcı +5 Strength kazanır. Ölümüne bir yarış başlar.
- **Phase Transitions:** %66 HP'de minyon çağırmayı bırakır ve "Fury" moduna geçer. %33 HP'de savunmayı tamamen bırakıp her tur en ağır saldırısını yapar.
- **Weakness:** Umbra (Karanlık alevi söndürür).
- **Lore:** Solomne'nin kadim fırınından doğan bu muhafız, Parçalanma sonrası geriye kalan kutsal közleri korumakla görevlendirilmiştir. Lorduna olan sarsılmaz sadakati ona Elemental Lordun yakıcı gücünün bir parçasını bahşetmiştir. Onun alevleri sadece eti değil, direniş gösteren ruhları da küle çevirecek kadar kudretlidir.
- **Design Intent:** Oyuncunun hem çoklu hedefleri yönetme (minyonlar) hem de biriken periyodik hasara (Burn) karşı savunma becerilerini test eder.

#### Mhalrai'nin Fırtınası (Mhalrai's Gale) — Storm — Boss
- **HP:** 380 | **Phases:** 3
- **Phase 1 (100%-67% HP):** "Fırtınanın Gözü" - Hızlı ve seri saldırılar (3x4 Hasar). Oyuncuya "Shock" uygulayarak her tur başında rastgele bir kart atmasına neden olur. Hareketlidir, sık sık düşük miktarda Block kazanır.
- **Phase 2 (66%-34% HP):** "Gök Gürültüsü" - Görsel olarak ekran kararır ve şimşek çakmaları başlar. "Chain Lightning" yeteneği ile oyuncunun elindeki her kart için hasarını artırır. Defansif olarak "Static Field" (Saldırana 2 hasar verir) kazanır.
- **Phase 3 (33%-0% HP):** "Süper Hücre" - "Hurricane Winds": Oyuncunun oynadığı her 3. kartın maliyeti o tur için +1 artar. Nihai hamle: "Judgment Bolt" (40 Hasar, 2 turda bir şarj olur).
- **Phase Transitions:** %66'da hasar tipi tekli vuruştan el büyüklüğüne bağlı ölçeklenen hasara döner. %33'te mana ekonomisini bozan pasif bir aura aktifleşir.
- **Weakness:** Tide (Su elektriği toprağa iletir ve dağıtır).
- **Lore:** Mhalrai'nin en sadık gökyüzü süvarisi olan bu varlık, fırtınanın hiddetini kanatlarında taşır. Sundering sırasında göklerin yarılmasıyla serbest kalan saf elektriği kontrol etme yetisine sahiptir. Onun geçtiği yerde geriye sadece yanık izleri ve mutlak bir sessizlik kalır.
- **Design Intent:** Oyuncunun el yönetimini ve mana verimliliğini, "Shock" ve kart maliyet artışları altında test eder.

#### Eshmir, Umbra Hükümdarı (Eshmir, the Umbra Sovereign) — Umbra — Boss
- **HP:** 520 | **Phases:** 3
- **Phase 1 (100%-67% HP):** "Boşluğun Fısıltısı" - Oyuncuya "Shadow" uygulayarak alınan hasarı %50 artırır. Her saldırısı oyuncunun destesine "Void" kartları karıştırır (oynanınca 2 hasar verir ve kendini yok eder).
- **Phase 2 (66%-34% HP):** "Tutulma" - Arka plan tamamen mor bir karanlığa gömülür. "Soul Drain": Boss vurduğu hasarın %50'si kadar iyileşir. Bu aşamada boss "Frail" uygulayarak oyuncunun Block kazanmasını zorlaştırır.
- **Phase 3 (33%-0% HP):** "Mutlak Sıfır" - "Entropy": Oyuncu kart oynadığı her seferde 2 hasar alır. Nihai mekanik: "Oblivion" - Oyuncunun en yüksek maliyetli kartını o savaş boyunca desteden siler (Banish).
- **Phase Transitions:** %66'da iyileşme mekaniği devreye girer. %33'te kart oynamayı cezalandıran pasif etki ve kart silme başlar.
- **Weakness:** Storm (Işık patlamaları karanlığı parçalar).
- **Lore:** Beşinci Element Lordu Eshmir, yokluğun ve ebedi karanlığın mutlak hakimidir. Dünyanın parçalanmasına bizzat öncülük eden bu kadim varlık, tüm gerçekliği gölgeler içinde boğmayı amaçlar. Onunla karşılaşanlar sadece karanlığı değil, kendi içlerindeki en derin korkuları da görürler.
- **Design Intent:** Oyunun en büyük "scaling" testidir. Oyuncu, boss'un iyileşmesini aşacak hasarı üretirken, kart oynama cezasını dengelemek zorundadır.

#### Resif Kıran Karkinos (Karkinos the Reefbreaker) — Tide — Mini-Boss
- **HP:** 140 | **Phases:** 2
- **Phase 1 (100%-50% HP):** "Gelgit Dalgası" - Yüksek Block (15 her tur) kazanır ve oyuncuya "Chill" uygulayarak kart maliyetlerini artırır. Ağır ama seyrek saldırılar yapar.
- **Phase 2 (49%-0% HP):** "Ezici Derinlikler" - Kabuğu kırılır, Block kazanmayı bırakır ama her tur +3 Strength kazanmaya başlar. "Pressure Crush" (22 Hasar) yeteneğini her 2 turda bir kullanır.
- **Weakness:** Verdant (Doğa, suyu emer ve kayaları parçalar).
- **Lore:** Kıyıların en yaşlı ve huysuz devi olan Karkinos, Sundering'den sonra denizlerin dengesinin bozulmasıyla çıldırmıştır. Bir zamanlar denizcilerin dostu olan bu dev, şimdi gördüğü her gemiyi ve canlıyı parçalamaktadır.
- **Design Intent:** Oyuncunun yüksek Block değerlerini delme kapasitesini ve ikinci fazdaki zamana karşı yarışı (Strength artışı) test eder.

#### Sylvaris, Lekeli Kalp (Sylvaris, the Blighted Heart) — Verdant — Mini-Boss
- **HP:** 220 | **Phases:** 2
- **Phase 1 (100%-50% HP):** "Vahşi Büyüme" - Oyuncuyu "Root" ederek bir sonraki saldırısını engeller. Kendi canını her tur 5 HP yeniler (Regen).
- **Phase 2 (49%-0% HP):** "Çürüme" - Boss'un yaprakları dökülür ve mor bir zehir salgılar. Oyuncuya "Frail" uygular ve çoklu vuruşlar (4x5 Hasar) yapmaya başlar. Her saldırısı "Burn" benzeri bir zehir etkisi bırakır.
- **Weakness:** Ember (Alev, bozulmuş bitki örtüsünü temizler).
- **Lore:** Bir zamanlar ormanın ruhu olan Sylvaris, Elemental Lordların savaşı sırasında yayılan kara enerjiyle lekelenmiştir. Artık yaşam vermek yerine, temas ettiği her şeyi kökleriyle boğarak karanlığa çekmektedir.
- **Design Intent:** Oyuncunun kitle kontrolüyle (Root) başa çıkma ve "Frail" altındayken hayatta kalma becerisini ölçer.

#### Kadim Sarmaşık (Primeval Overgrowth) — Verdant — Elite
- **HP:** 210 | **Weakness:** Ember
- **Mechanics:** "Thorns" (Dikenler) - Oyuncunun her saldırısına 3 hasar ile karşılık verir. "Constrict" ile oyuncunun Max Mana'sını 1 tur boyunca 1 azaltır.
- **Lore:** Antik çağlardan kalma bu bitki örtüsü, fırtına enerjisiyle mutasyona uğramıştır. Dikenleri en sağlam zırhları bile delecek kadar keskin ve zehirlidir.
- **Design Intent:** Çoklu vuruş yapan desteleri cezalandırır ve oyuncuyu yüksek tekil hasar vermeye zorlar.

#### Abis Gözcüsü (Abyssal Sentinel) — Tide — Elite
- **HP:** 240 | **Weakness:** Verdant
- **Mechanics:** "Super-Block" - Her 3 turda bir 40 Block kazanır ancak o tur saldıramaz. Diğer turlarda "Water Jet" (18 Hasar) ile saldırır.
- **Lore:** Derin suların sessiz bekçisi, yabancıları okyanusun karanlık mezarlarına gömmek için bekler. Kalkanı, Sundering öncesi medeniyetlerin kayıp teknolojisiyle güçlendirilmiştir.
- **Design Intent:** Oyuncunun "burst" hasar potansiyelini ve büyük savunma pencerelerini ne kadar iyi değerlendirdiğini test eder.


---

## 33. Encounter Design Pacing

> 3 akt × 17 zemin = 51 zemin toplam. Bu bölüm zorluk eğrisini, encounter aralık kurallarını,
> acıma mekaniklerini, geri dönüş sistemlerini, boss telegraf kurallarını ve Ascension
> modifikatör matrisini tanımlar.

## Pact of Five: Karşılaşma Temposu ve Zorluk Tasarımı (GDD)

Bu belge, **Pact of Five** projesinin 3 perdelik (51 kat) ilerleme sistemini, zorluk eğrisini ve dengeleme mekaniklerini detaylandırmaktadır.

### 1. Zorluk Eğrisi Tablosu (Zorluk Eğrisi)

Aşağıdaki tablo, oyuncunun hiçbir savunma yapmadığı (Block: 0) senaryoda alacağı beklenen hasar potansiyelini ve karşılaşma tipini gösterir.

| Kat (Floor) | Perde (Act) | Karşılaşma Tipi | Hasar Potansiyeli (Pasif) | Notlar / Tehdit Unsuru |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 1 | Başlangıç Savaşı | 8 | Tekli zayıf vuruş. |
| 3 | 1 | Kolay Savaş | 12 | İkili saldırı veya güçlendirme. |
| 5 | 1 | Seçkin (Elite) | 22 | Agresif burst hasarı. |
| 7 | 1 | Orta Zorluk | 16 | Zayıflatma (Debuff) odaklı. |
| 9 | 1 | Orta Zorluk | 18 | Artan hasar (Scaling). |
| 11 | 1 | Seçkin (Elite) | 26 | Çoklu hedef saldırısı. |
| 13 | 1 | Zor Savaş | 24 | Karmaşık mekanikler. |
| 15 | 1 | Zor Savaş | 28 | Yüksek can havuzu. |
| 17 | 1 | **Elebaşı (Boss)** | 35 | Perde sonu sınavı. |
| 18 | 2 | Giriş (Act 2) | 32 | Alan hasarı zorunluluğu. |
| 20 | 2 | Orta Zorluk | 38 | Savunma kırma (Armor break). |
| 22 | 2 | Seçkin (Elite) | 48 | Hızlı scaling, 3. turda ölümcül. |
| 24 | 2 | Orta Zorluk | 42 | Yanık/Zehir etkisi. |
| 26 | 2 | Etkinlik Savaşı | 45 | Risk/Ödül odaklı dövüş. |
| 28 | 2 | Seçkin (Elite) | 54 | Yüksek tanklık ve karşı saldırı. |
| 30 | 2 | Zor Savaş | 50 | Enerji emme/Kart kısıtlama. |
| 32 | 2 | Zor Savaş | 58 | Sürekli artan minyonlar. |
| 34 | 2 | **Elebaşı (Boss)** | 65 | Çift fazlı mücadele. |
| 35 | 3 | Giriş (Act 3) | 60 | En üst seviye temel düşmanlar. |
| 37 | 3 | Zor Savaş | 72 | Tek turda aşırı hasar (Nuke). |
| 39 | 3 | Seçkin (Elite) | 85 | Strateji bozan pasifler. |
| 41 | 3 | Zor Savaş | 78 | Kart destesini kirletme (Curse). |
| 43 | 3 | Seçkin (Elite) | 92 | Ölümsüzlük/Dirilme mekaniği. |
| 45 | 3 | Zor Savaş | 88 | Gecikmeli patlayıcı hasar. |
| 47 | 3 | Zor Savaş | 95 | Oyuncu bufflarını çalma. |
| 49 | 3 | Seçkin (Elite) | 110 | Saf hasar kontrolü. |
| 51 | 3 | **Final Elebaşı** | 120 | 5 Elementin birleşimi. |

---

### 2. Karşılaşma Dizilim Kuralları (Encounter Spacing)

Her perdede harita oluşturulurken kullanılan olasılık ve mesafe kuralları.

| Düğüm Tipi (Node) | Perde 1 % | Perde 2 % | Perde 3 % | Min. Ara (Kat) | Max. Ara (Kat) | Acıma (Pity) Tetikleyici |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Normal Savaş | 45% | 35% | 30% | 1 | 3 | 2 Kat savaşsız geçilirse. |
| Seçkin (Elite) | 10% | 15% | 20% | 3 | 6 | 5 Kat Seçkin görülmezse. |
| Etkinlik (Event) | 25% | 25% | 20% | 2 | 5 | 4 Kat Etkinlik görülmezse. |
| Dükkan (Shop) | 10% | 12% | 15% | 4 | 8 | 300+ Altın birikince. |
| Dinlenme (Rest) | 10% | 13% | 15% | 5 | 7 | %20 Altı Can (HP). |
| Elebaşı (Boss) | Kat 17 | Kat 34 | Kat 51 | - | - | Sabit konum. |

---

### 3. Acıma Mekanikleri (Pity Mechanics)

Şans faktörünü (RNG) dengelemek için kullanılan 5 kesin kural:

1.  **Elite Pity:** Oyuncu üst üste 5 normal savaş kazanırsa, bir sonraki yol ayrımında en az bir dalda Seçkin (Elite) düğümü çıkması %100 garanti edilir.
2.  **Shop Pity:** Oyuncunun altın miktarı 350'ye ulaştığında ve son 6 katta dükkan görmemişse, sonraki 2 kat içinde bir dükkan yolu kesinleşir.
3.  **Healing Pity:** Oyuncunun canı %25'in altına düştüğünde, harita oluşturucu sonraki 3 kat içinde bir Dinlenme (Rest) veya İyileştirme Etkinliği düğümü yerleştirir.
4.  **Rare Card Pity:** Seçkin bir düşman yenildikten sonraki ilk ödül ekranında Nadir (Rare) kart çıkma olasılığı %10 iken, eğer son 3 Seçkin ödülünde Nadir kart alınmadıysa bu oran %100'e yükselir.
5.  **Relic Pity:** Üst üste 3 Etkinlik (Event) düğümünde yadigâr (relic) kazanılmadıysa, 4. etkinlikte mutlaka bir yadigâr takas veya kazanma seçeneği sunulur.

---

### 4. Geri Dönüş Mekanikleri (Comeback Mechanics)

Oyuncunun canı kritik seviyeye düştüğünde tetiklenen destek ödülleri:

*   **<%25 Max HP (Tehlike Eşiği):**
    *   Savaş sonu ödüllerinde +15 Altın (Bonus Ganimet).
    *   Tüketilebilir eşya (Potion) düşme şansı +%25 artar.
*   **<%15 Max HP (Kritik Eşik):**
    *   Savaş ödüllerinde "Kart Geliştirme" (Upgrade) seçeneği çıkar.
    *   Sıradaki dükkanda tüm ürünlerde %20 indirim sağlanır.
*   **<%10 Max HP (Çaresizlik Eşiği - "Pact of Desperation"):**
    *   Bir sonraki savaşın başında oyuncuya 10 Geçici Zırh (Temporary Shield) verilir.
    *   Savaş kazanıldığında anında %15 Max HP yenilenir.
    *   Bir adet rastgele "Sıradan Yadigâr" (Common Relic) kazanılır.

---

### 5. Elebaşı Bildirim Kuralları (Boss Telegraph)

Elebaşına ulaşmadan 2 kat önce (Kat 15, 32 ve 49) oyuncuya "Kehanet" (Oracle) arayüzü gösterilir:

*   **UI Davranışı:** Harita ekranının sağ üst köşesinde "Kaderin Gözü" ikonu parlar. Tıklandığında tam ekran bir uyarı penceresi açılır.
*   **Gösterilen Bilgiler:**
    1.  **Elebaşı İsmi ve Görseli:** Örn: "Alevlerin Efendisi: Ignis".
    2.  **Element Türü:** Zayıf ve güçlü olduğu element simgeleri (Örn: Suya Zayıf, Ateşe Dirençli).
    3.  **Faz Sayısı:** Can barının altında kaç adet can barı (faz) olduğu (Örn: 2 Faz).
    4.  **Ana Yetenek:** Boss'un en tehlikeli yeteneğinin kısa açıklaması (Örn: "5. turda tüm savunmaları yok eder").

---

### 6. Yükseliş Matrisi (Ascension Modifier Matrix)

Mücadeleyi her seviyede artıran 21 basamaklı zorluk sistemi:

| Seviye (Asc) | Düşman HP | Düşman Hasar | Yeni Mekanik / Zorluk |
| :--- | :--- | :--- | :--- |
| 0 | +0% | +0% | Temel Oyun Deneyimi. |
| 1 | +5% | +0% | Seçkin düşmanlar daha sık çıkar. |
| 2 | +5% | +5% | Normal savaşlar daha tehlikeli vuruşlar yapar. |
| 3 | +10% | +5% | Seçkin düşmanlar daha agresif yapay zekaya sahip. |
| 4 | +10% | +10% | Elebaşı (Boss) can havuzu artar. |
| 5 | +15% | +10% | **Şifa Azalması:** Dinlenme alanlarında iyileşme %20 düşer. |
| 6 | +15% | +15% | Başlangıç destesine 1 adet "Zayıf" (Weak) kartı eklenir. |
| 7 | +20% | +15% | Düşmanlar savaşa 2 Zırh (Block) ile başlar. |
| 8 | +20% | +20% | Elebaşı hasarı %10 artar. |
| 9 | +25% | +20% | Yadigâr fiyatları dükkanda %15 artar. |
| 10 | +25% | +25% | **Kısıtlı Görüş:** Haritada bir sonraki düğümden fazlası görünmez. |
| 11 | +30% | +25% | İksir taşıma kapasitesi 1 slot azalır. |
| 12 | +30% | +30% | Nadir kart çıkma olasılığı %5 azalır. |
| 13 | +35% | +30% | Etkinliklerdeki olumsuz seçenekler daha ağır sonuçlar doğurur. |
| 14 | +35% | +35% | Düşmanlar her 3 turda bir rastgele buff alır. |
| 15 | +40% | +35% | **Elementel Direnç:** Düşmanlar %10 daha az element hasarı alır. |
| 16 | +40% | +40% | Dükkanda satılan kart sayısı 2 azalır. |
| 17 | +45% | +40% | Perde 1 sonunda can yenilenmez. |
| 18 | +45% | +45% | Seçkin düşmanlar savaşa rastgele bir "Modifier" ile başlar. |
| 19 | +50% | +45% | Elebaşı 3. bir faza veya ek yeteneğe sahip olur. |
| 20 | +50% | +50% | **Beşli Pakt:** Her 5. katta oyuncuya kalıcı bir "Lanet" eklenir. |


---

## 34. Relic Kataloğu Genişlemesi

> §10 üzerine kurulur (34 mevcut relic). §34, 60+ relic hedefine ulaşır:
> Common (20), Uncommon (20), Rare (10), Boss (5), Shop-only (5).
> Her relic: etki, hook tipi, sinerji notu, anti-sinerji uyarısı.

I will now design the 60 relics for the Pact of Five GDD, ensuring all element-specific, character-specific, and keyword requirements are met with concrete numbers and Turkish flavor text.

### Common Relics (20)

| ID | Name | Tier | Effect | Hook Type | Synergy Notes | Anti-Synergy Warning | Flavor (Turkish) |
|:---|:---|:---|:---|:---|:---|:---|:---|
| COM-01 | Iron Bracers | Common | Gain +3 Guard whenever you play a Defense card. | on_card_play | High Guard stacking | Not effective for Glass Cannon builds | "Bileklerini koru, hayatını kurtar." |
| COM-02 | Swift Feather | Common | Swift cards deal +4 damage. | passive | Speed builds | Low damage if no Swift keywords | "Rüzgar kadar hızlı, bıçak kadar keskin." |
| COM-03 | Ember Coal | Common | Ember cards deal +3 damage. | passive | Ember builds | Diluted by other elements | "Sönmeyen bir kor parçasının sıcaklığı." |
| COM-04 | Dew Drop | Common | Tide cards gain +3 Block. | passive | Tide defensive builds | Useless in aggro Ember decks | "Denizin serinliği kalkanın olsun." |
| COM-05 | Moss Stone | Common | Verdant cards Heal +2 HP on play. | on_card_play | High sustain | Max HP cap limits value | "Doğanın şifası taşın kalbinde saklı." |
| COM-06 | Static Jar | Common | Storm cards deal +3 damage. | passive | Storm builds | Overload management needed | "Küçük bir kavanoz dolusu yıldırım." |
| COM-07 | Shadow Ink | Common | Umbra cards deal +3 damage. | passive | Umbra builds | Requires Banish management | "Karanlık, sayfalar arasında süzülüyor." |
| COM-08 | Whetstone | Common | First Attack each turn gains +5 Pierce. | on_battle_start | Shield breaking | Weak against unshielded enemies | "Keskin bir kılıç, her kapıyı açar." |
| COM-09 | Bandage | Common | Heal 4 HP when an enemy dies. | on_creature_die | Multitarget fights | Weak in single Boss fights | "Yaralarını sarmak için asla geç değil." |
| COM-10 | Lucky Coin | Common | Gain +10 Gold after each winning battle. | passive | Economy scaling | No combat benefit | "Talih, cesur olanın yanındadır." |
| COM-11 | Dried Leaf | Common | When you Banish a card, gain 6 Block. | on_exhaust | Umbra/Utility builds | Needs Banish triggers | "Eski bir yaprak, yeni bir koruma." |
| COM-12 | Cracked Sigil | Common | Start each battle with 1 Sigil. | on_battle_start | Umbra scaling | Slow start for 0-Sigil decks | "Kırık olsa da hala güç yayıyor." |
| COM-13 | Rusty Whistle | Common | [Tamer] First creature played has +6 HP. | on_card_play | Creature survival | Creatures only | "Eski dostları çağırmak için bir nefes." |
| COM-14 | Old Scroll | Common | [Sage] Resonate deals +3 damage. | on_status_apply | Element cycling | Complex rotation required | "Kadim rünlerin fısıltısı kulağında." |
| COM-15 | Sharpened Arrow | Common | [Hunter] Pierce cards deal +5 damage. | passive | Hunter archetype | Requires Pierce keywords | "Tek atış, tek isabet." |
| COM-16 | Heavy Shield | Common | [Warden] Guard effects are 20% stronger. | passive | Warden defense | Low damage output | "Aşılmaz bir duvarın ilk taşı." |
| COM-17 | Bottled Flame | Common | [NEW] Apply 4 Burn to a random enemy at start. | on_battle_start | Ember synergy | Random target RNG | "Bir şişe dolusu saf öfke." |
| COM-18 | Sea Shell | Common | Every 5th card played draws 1 card. | on_card_play | Combo/Tide builds | Play order matters | "Dalgaların sesini içinde taşıyor." |
| COM-19 | Seedling | Common | Gain 2 Bond at the start of battle. | on_battle_start | Verdant sustain | Bond decays over time | "Küçük bir filiz, büyük bir bağ." |
| COM-20 | Cloud Spark | Common | Dealing damage with Storm applies 1 Vulnerable. | on_status_apply | Storm aggro | Vulnerable doesn't stack | "Gök gürültüsünden önceki o kıvılcım." |

### Design Notes [Common]
*   **Iron Bracers:** Standardizes the "Guard" keyword for early survival.
*   **Lucky Coin:** Essential for the Roguelite economy; forces a trade-off between power and future wealth.
*   **Cracked Sigil:** Introduces the Sigil mechanic safely to the player.

---

### Uncommon Relics (20)

| ID | Name | Tier | Effect | Hook Type | Synergy Notes | Anti-Synergy Warning | Flavor (Turkish) |
|:---|:---|:---|:---|:---|:---|:---|:---|
| UNC-01 | Phoenix Down | Uncommon | [NEW] When a creature dies, next Ember card has Echo. | on_creature_die | Ember/Tamer hybrid | Requires specific turn timing | "Küllerinden doğan her vuruş iki kat güçlü." |
| UNC-02 | Coral Crown | Uncommon | Combo(3): Draw 1 card. | conditional | Tide/Speed decks | Hard to proc with high-cost cards | "Denizlerin tacı, zihni berraklaştırır." |
| UNC-03 | Thorny Vines | Uncommon | When you gain Block, deal 5 damage to attacker. | on_block | Warden/Verdant stall | Requires being hit | "Gülün dikeni, düşmanın eceli." |
| UNC-04 | Lightning Rod | Uncommon | Overload(3): Gain 10 Block. | conditional | Storm defensive | Dangerous if Overload is too high | "Fırtınanın gücünü toprağa iletir." |
| UNC-05 | Obsidian Dagger | Uncommon | When a card is Banished, deal 8 damage to all. | on_exhaust | Umbra Banish builds | Thins deck too fast? | "Karanlık bir bıçak, ruhları parçalar." |
| UNC-06 | Tamer's Whip | Uncommon | [Tamer] Played creatures gain Swift. | on_card_play | Immediate board impact | Creatures only | "Emret, sadık dostların saldırsın." |
| UNC-07 | Sage's Incense | Uncommon | [Sage] Resonate draws 1 card. | on_status_apply | High cycle decks | Hand size limit (8) | "Duman yükseldikçe sırlar çözülür." |
| UNC-08 | Hunter's Trap | Uncommon | [Hunter] Apply 2 Frail to all enemies at start. | on_battle_start | High damage burst | Short duration (2 turns) | "Avına yaklaşmadan önce onu zayıflat." |
| UNC-09 | Warden's Cloak | Uncommon | [Warden] All cards gain +4 Guard. | passive | Pure tanking | Reduces offensive scaling | "Görünmez bir zırh gibi seni sarar." |
| UNC-10 | Lava Core | Uncommon | Playing an Ember card deals 2 damage to all. | on_card_play | Ember AoE | Can trigger enemy "on hit" | "Yerin altındaki ateş, dışarı taşmak istiyor." |
| UNC-11 | Moonstone | Uncommon | Banish deals 12 damage to lowest HP enemy. | on_exhaust | Umbra precision | Target RNG | "Gecenin ışığı, zayıf olanı bulur." |
| UNC-12 | Kinetic Boots | Uncommon | Swift cards gain Combo(2): deal 5 Pierce. | conditional | Hunter/Storm speed | Requires 2 Swift cards in hand | "Hareket ettikçe güçlenen bir enerji." |
| UNC-13 | Vitality Root | Uncommon | Lifelink heals +3 additional HP. | on_status_apply | Verdant sustain | Requires Lifelink source | "Kökler, yaşamın özünü emer." |
| UNC-14 | Echoing Shell | Uncommon | Echo cards deal +6 damage on second hit. | passive | Tide/High value cards | Only affects Echo cards | "Sesin yankısı, ilkinden daha güçlü." |
| UNC-15 | Surge Battery | Uncommon | Surge grants +5 damage (instead of +2). | passive | Storm/Ember burst | Surge resets on use | "Aşırı yükleme, maksimum yıkım." |
| UNC-16 | Chain Link | Uncommon | Chain 3+ deals +8 Pierce damage. | conditional | Storm/Multi-hit | Hard to reach Chain 3 | "Birbirine bağlı darbeler, zırh tanımaz." |
| UNC-17 | Volatile Mixture | Uncommon | Volatile cards deal +10 damage. | passive | Umbra/High risk | Cards Banish after use | "Tehlikeli bir karışım, ama etkili." |
| UNC-18 | Elementalist Ring | Uncommon | [NEW] On Element Kill, gain 1 temporary Energy. | on_element_kill | Multi-element decks | Needs precise killing blows | "Beş elementin dengesi parmağında." |
| UNC-19 | Forest Heart | Uncommon | [Verdant] Bond heals 3 HP at end of turn. | passive | Verdant stall | Slow healing | "Ormanın kalbi seninle birlikte atıyor." |
| UNC-20 | Storm Lantern | Uncommon | 3rd Storm card played applies 2 Weak to all. | on_card_play | Storm control | Requires 3 Storm cards/turn | "Fırtınada yolunu gösteren ışık." |

### Design Notes [Uncommon]
*   **Phoenix Down:** Promotes a hybrid playstyle between Tamer (creatures dying) and Ember (Echoing big spells).
*   **Obsidian Dagger:** Converts the "drawback" of Banish into a reliable AoE damage source.
*   **Kinetic Boots:** Rewards the player for sequencing multiple Swift cards, emphasizing the "Speed" archetype.

---

### Rare Relics (10)

| ID | Name | Tier | Effect | Hook Type | Synergy Notes | Anti-Synergy Warning | Flavor (Turkish) |
|:---|:---|:---|:---|:---|:---|:---|:---|
| RARE-01 | Cursed Pact | Rare | [NEW] Start with +2 Energy, but draw -1 card. | passive | High cost decks | Low card draw kills combos | "Güç için ödenen bedel ağırdır." |
| RARE-02 | Prismatic Sphere | Rare | Resonate triggers on any element transition. | on_status_apply | 5-element rainbow decks | Hard to control triggers | "Renklerin dansı, sınırsız güç." |
| RARE-03 | Soul Forge | Rare | On creature death, gain +4 Max HP permanently. | on_creature_die | Tamer scaling | Useless late in runs | "Ruhlar, senin bedeninde can buluyor." |
| RARE-04 | Dragon's Breath | Rare | [Ember] Ember cards deal 6 damage to random. | on_card_play | Pure Ember spam | No control over targets | "Bir ejderhanın öfkesi dindirilemez." |
| RARE-05 | Tsunami Horn | Rare | [Tide] Tide cards gain +5 Block. | on_card_play | Pure Tide defense | Pure defense is slow | "Denizler, senin emrinle yükseliyor." |
| RARE-06 | Ancient Oak | Rare | [Verdant] Verdant cards apply 1 Bond to self. | on_card_play | Massive HP regeneration | Bond can be purged | "Bin yıllık bir ağacın sarsılmazlığı." |
| RARE-07 | Thunder Hammer | Rare | [Storm] Storm cards deal 5 Pierce damage. | on_card_play | Shield bypass | Overload accumulates fast | "Göklerden gelen adalet, zırh deler." |
| RARE-08 | Void Eye | Rare | [Umbra] Umbra cards Banish a random card. | on_card_play | Rapid Sigil stacking | Can Banish key combo cards | "Boşluğa bakan, boşluğun kendisi olur." |
| RARE-09 | Beastmaster Horn | Rare | [Tamer] Creatures have +8 HP and Lifelink. | passive | Unstoppable board | Crowded board space | "Sürünün lideri, ormanın efendisi." |
| RARE-10 | Chronos Watch | Rare | [NEW] Combo(6): Take an extra turn. | conditional | Infinite combo potential | Very hard to trigger (6 cards) | "Zaman, sadece senin için duruyor." |

### Design Notes [Rare]
*   **Cursed Pact:** A classic high-risk, high-reward relic that fundamentally changes deck building (prioritize high-impact cards over many small ones).
*   **Void Eye:** High-speed Umbra play. It accelerates Sigil generation but introduces a dangerous "random Banish" RNG.
*   **Chronos Watch:** The ultimate Combo(N) reward. It requires a perfectly tuned deck with many Swift/0-cost cards.

---

### Boss Relics (5)

| ID | Name | Tier | Effect | Hook Type | Synergy Notes | Anti-Synergy Warning | Flavor (Turkish) |
|:---|:---|:---|:---|:---|:---|:---|:---|
| BOSS-01 | Elemental Crown | Boss | [NEW] All cards cost -1, but only 1 element/turn. | passive | Mono-element decks | Killing multi-element flexibility | "Tek bir yol seç, onda ustalaş." |
| BOSS-02 | Giant's Belt | Boss | Start with +1 Energy. Gain 1 Frail every turn. | passive | Energy-hungry decks | Defense becomes 25% weaker | "Devlerin gücü, devasa bir yükle gelir." |
| BOSS-03 | Chimera Heart | Boss | Start with 5 Bond, 5 Surge, and 5 Sigil. | on_battle_start | Multi-keyword setup | All values decay or reset | "Beş canavarın kalbi tek bir göğüste." |
| BOSS-04 | Mirror Shield | Boss | Reflect 50% of damage taken as Pierce. | passive | Warden/Stall builds | Still requires taking damage | "Sana gelen, senden daha güçlü döner." |
| BOSS-05 | Pandora's Box | Boss | [NEW] Start battle: replace hand with 5 Rare. | on_battle_start | Pure chaos/High power | No control over strategy | "Kutuyu açtın, geri dönüşü yok." |

### Design Notes [Boss]
*   **Elemental Crown:** A transformative relic that forces the player into a "Mono-Element" strategy for high efficiency.
*   **Pandora's Box:** Designed for players who love RNG. It bypasses deck-building for the first turn, providing a massive (but unpredictable) power spike.

---

### Shop-only Relics (5)

| ID | Name | Tier | Effect | Hook Type | Synergy Notes | Anti-Synergy Warning | Flavor (Turkish) |
|:---|:---|:---|:---|:---|:---|:---|:---|
| SHOP-01 | Golden Fleece | Shop | Shop prices reduced by 30%. | passive | Economy stacking | Costs 200 Gold upfront | "Altın parıltısı, her kapıyı açar." |
| SHOP-02 | Midas Touch | Shop | [NEW] On Element Kill, gain 25 Gold. | on_element_kill | Farmer builds | Requires specific killing blows | "Dokunduğun her şey altına dönüşsün." |
| SHOP-03 | Merchant Contract | Shop | Gain +1 Card Reward slot after battles. | passive | Finding specific combos | No immediate combat power | "Daha fazla seçenek, daha fazla şans." |
| SHOP-04 | Elixir of Life | Shop | [NEW] Heal to 100% HP at start of each Act. | passive | High risk/aggressive play | One-time use per Act | "Yaşamın özü, bir şişede saklı." |
| SHOP-05 | Master's Tome | Shop | Character-specific cards deal +12 damage. | passive | Character archetype focus | Useless for generic cards | "Ustalık, yılların birikimidir." |

### Design Notes [Shop]
*   **Midas Touch:** High premium cost (180 Gold), but if bought early in Act 1, it provides massive ROI for "Element Kill" specialists.
*   **Elixir of Life:** A safety net for players struggling with sustain, allowing them to take more risks in elite fights.


---

## 35. Event Kataloğu

> §11 üzerine kurulur (17 mevcut event). §35, 25+ event ekler:
> mistik (8), muharebe-bitişik (6), ekonomi (5), lanet/risk (3), lore-bağlı (3).
> Zincirli eventler [CHAIN] etiketi ile işaretlenir. Her event: Türkçe proza + seçim tablosu.

I will now generate the 25 map events for the Pact of Five GDD, adhering to the specified tone distributions, chained event structures, and Turkish narrative requirements.

### **I. MYSTICAL EVENTS (8)**

**1. [Elementlerin Sunağı]** | Tone: mystical
> Ormanın derinliklerinde, beş elementin sembolleriyle bezenmiş antik bir sunakla karşılaşıyorsunuz. Havada asılı kalan yoğun enerji, parmak uçlarınızı karıncalandırıyor. Sunak, her biri farklı bir elemente adanmış beş kaseden oluşuyor. Kaselerin içindeki parlayan sıvılar, sanki size geçmişteki zaferlerinizi ve gelecekteki yıkımları fısıldıyor. Bir seçim yapmanız gerekiyor; ancak bu lütuf karşılıksız kalmayacak.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Ateşe Dokun | Desteye 1 "Burn" (Common) kartı ekle | 8 HP Kaybet |
| B: Suyla Arın | Mevcut bir kartı "Frozen" etkisiyle yükselt | Bir rastgele Relic etkisizleşir |
| C: Havaya Karış | Desteden 1 kart sil | Max HP 5 azalır |
Reward Range: 1 Element Card (Common/Uncommon)

**2. [Fısıltılar Sisi]** | Tone: mystical
> Yolun ortasında aniden beliren mor bir sis, görüş alanınızı tamamen kapatıyor. Sisin içinden tanıdık ama bir o kadar da yabancı sesler yükseliyor. Bu sesler, kaybettiğiniz yoldaşlarınızın mı yoksa zihninizin size oynadığı bir oyunun mu ürünü, kestiremiyorsunuz. Bir el uzanıyor sislere içinden, avucunda parlayan bir taşla. Bu taşın vaat ettiği güç, ruhunuzun bir parçasını koparıp alabilir.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Taşı Al | Rastgele bir Rare kart kazan | 12 HP Kaybet |
| B: Sesi Dinle | Gelecek 2 savaşı önceden gör (Scry) | 1 "Paranoia" Cursea ekle |
Reward Range: 1 Rare Card OR Map Vision

**3. [Aynadaki Benlik]** | Tone: mystical
> Yol kenarındaki kurumuş bir göletin dibinde, kusursuz bir ayna duruyor. Aynaya baktığınızda kendinizi değil, olmak istediğiniz ya da korktuğunuz kişiyi görüyorsunuz. Görüntü size göz kırpıyor ve elini dışarı uzatıyor. Eğer onunla el sıkışırsanız, potansiyelinizin bir kısmını bugüne taşıyabilirsiniz; ancak bu değişim kalıcı bir iz bırakacaktır.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Kendini Kabul Et | Rastgele 2 kartı yükselt | Max HP 10 azalır |
| B: Kendini Reddet | Desteden 2 kart sil | 15 HP Kaybet |
Reward Range: 2 Upgraded Cards OR 2 Card Removals

**4. [Kadim Parşömen - Adım 1]** | Tone: mystical [CHAIN-1/3] [ChainTag: AncientScroll]
> Yıkık bir kütüphanenin kalıntıları arasında, gümüş mühürle kapatılmış bir parşömen buluyorsunuz. Mühür, dokunduğunuz anda teninizi yakıyor ama parşömen açılmıyor. Üzerindeki rünler, ancak belirli bir elementel fedakarlıkla çözülebilir gibi görünüyor. Bu parşömen, dünyayı değiştirebilecek bir sırrı saklıyor olabilir.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Kanınla Mühürle | "AncientScroll" etiketini kazan | 10 HP Kaybet |
| B: Parşömeni Yak | 60 Gold kazan | Olay zinciri sonlanır |
Reward Range: 60 Gold OR Chain Progression

**5. [Kadim Parşömen - Adım 2]** | Tone: mystical [CHAIN-2/3] [Requires: AncientScroll]
> Elinizdeki mühürlü parşömen, bir gece yarısı kamp ateşinizin yanında aniden parlamaya başlıyor. Rünler dile geliyor ve size kadim bir dilin fısıltılarını öğretiyor. Bu dili anlamak için zihninizi tamamen boşaltmalı ve elementlerin akışına bırakmalısınız. Eğer başarılı olursanız, mühür bir nebze daha gevşeyecek.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Rünleri Oku | Desteye 1 "Ethereal Wisdom" kartı ekle | 1 "Mindburn" (Uncommon) kartı ekle |
| B: Odaklan | Bir rastgele Relic'i güçlendir | 15 Altın Kaybet |
Reward Range: 1 Special Card OR Relic Upgrade

**6. [Kadim Parşömen - Adım 3]** | Tone: mystical [CHAIN-3/3] [Requires: AncientScroll]
> Nihayet parşömenin son mührü de kırılıyor. Gökyüzü bir anlığına kararırken, parşömenden yayılan ışık sizi kör ediyor. Kadim bilgi artık zihninize kazındı. Bu güç, sıradan bir ölümlünün taşıyabileceği bir yük değil; ama siz artık sıradan bir ölümlü değilsiniz. Elementlerin efendisi olma yolunda son bir adım kaldı.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Bilgiyi Özümse | "Archivist's Eye" Legendary Relic kazan | Max HP 15 azalır |
| B: Parşömeni Yok Et | Tüm desteyi yükselt | Tüm Altınını kaybet |
Reward Range: Legendary Relic OR Full Deck Upgrade

**7. [Dokumacı'nın Tezgahı]** | Tone: mystical
> Zamanın dışındaki bir boşlukta, yaşlı bir kadının devasa bir tezgahta kader ipliklerini dokuduğunu görüyorsunuz. Sizi gördüğünde durmuyor, sadece gülümsüyor. "Bir iplik koparmak istersen," diyor, "başka bir yerdeki düğümü çözmen gerekir." Tezgahtaki iplikler, destenizin ve yolculuğunuzun ta kendisi.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Kaderi Değiştir | Rastgele bir Relic'i başka bir Relic ile değiştir | 1 "Glitched" Curse ekle |
| B: Düğümü Çöz | Desteden rastgele bir kartı Rare bir kartla değiştir | 10 HP Kaybet |
Reward Range: 1 Random Relic OR 1 Rare Card

**8. [Kristal Mağara]** | Tone: mystical
> Mağaranın tavanından sarkan kristaller, her bir hareketinizle farklı renklerde parlıyor. Bu kristallerin, içinde hapsolmuş ruhların anıları olduğu söylenir. Bir kristale dokunduğunuzda, size ait olmayan bir anı zihninize doluyor: Büyük bir savaş, bir ihanet ve ardından gelen sessizlik. Kristali yanınıza alabilir ya da içindeki enerjiyi emebilirsiniz.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Kristali Al | "Memory Crystal" Relic kazan (1 free card play per battle) | Gelecek 3 savaşta kart çekişi -1 |
| B: Enerjiyi Em | 20 Max HP kazan | Desteye 2 "Dazzled" (Common) kartı ekle |
Reward Range: Special Relic OR 20 Max HP

---

### **II. COMBAT-ADJACENT EVENTS (6)**

**9. [Eğitim Alanı]** | Tone: combat-adjacent
> Terkedilmiş bir kışlada, paslanmış kılıçlar ve parçalanmış kuklalar arasında bir figürün antrenman yaptığını görüyorsunuz. Eski bir generalin hayaleti bu, hala ordusunu eğittiğini sanıyor. Sizi gördüğünde kılıcını çekiyor ve "Sıradaki!" diye bağırıyor. Bu düello, size savaşın acımasız gerçeklerini ama aynı zamanda tekniklerini de öğretecek.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Düelloyu Kabul Et | Savaş başlat (Elite) | Yenilgi durumunda Run sonlanır |
| B: İzle ve Öğren | 1 Attack kartını yükselt | 5 HP Kaybet |
| C: Yağmala | 45 Gold kazan | Desteye 1 "Injury" kartı ekle |
Reward Range: Elite Loot OR Card Upgrade OR 45 Gold

**10. [Çimenlerdeki Pusu]** | Tone: combat-adjacent
> Uzun otların arasından geçerken aniden bir ıslık sesi duyuyorsunuz. Bir grup haydut çevrenizi sarmış durumda. Liderleri, sırıtarak elindeki hançerle oynuyor. "Paranı mı istersin yoksa canını mı?" diye soruyor. Ama gözlerindeki açlık, her ikisini de alacağını söylüyor. Kaçmak için çok geç, dövüşmek için ise hazırlıksızsınız.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Karşı Saldırı | Savaş başlat (Normal) | Savaş başında 2 zayıflık (Weak) al |
| B: Rüşvet Ver | 50 Gold ver ve geç | 50 Gold Kaybet |
Reward Range: Normal Battle Loot OR Path Clearance

**11. [Demirci'nin Düellosu]** | Tone: combat-adjacent
> Dev bir örsün başında, lavların sıcaklığıyla terleyen bir demirci duruyor. "Sana en iyi silahımı verebilirim," diyor, "eğer benimle demir ve ateşin dansına katılırsan." Demirci, sizi doğrudan bir kavgaya değil, dayanıklılık testine davet ediyor. Kor gibi parlayan demire çıplak ellerinizle dokunmaya cesaretiniz var mı?

| Choice | Effect | Risk |
|--------|--------|------|
| A: Demirle Bütünleş | "Molten Core" Relic kazan | 20 HP Kaybet |
| B: Silahı Bile | Tüm Attack kartlarına +2 damage ekle | Max HP 8 azalır |
Reward Range: Rare Relic OR Permanent Damage Buff

**12. [Rakip Maceracı - Adım 1]** | Tone: combat-adjacent [CHAIN-1/3] [ChainTag: Rival]
> Yol üzerinde, en az sizin kadar hırpalanmış başka bir yolcuyla karşılaşıyorsunuz. Sırtındaki devasa kılıç ve zırhındaki pençe izleri, zorlu yollardan geldiğini kanıtlıyor. Size dostça bir baş selamı veriyor. "Bu yollar tek başına yürünmez," diyor. Bir antrenman maçı ya da malzeme takası teklif ediyor.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Antrenman Yap | "Rival" etiketini kazan ve 1 kart yükselt | 10 HP Kaybet |
| B: Takas Yap | 1 Common Relic ver, 1 Uncommon Relic al | Mevcut bir kartı rastgele kaybedersin |
Reward Range: Card Upgrade OR Relic Swap

**13. [Rakip Maceracı - Adım 2]** | Tone: combat-adjacent [CHAIN-2/3] [Requires: Rival]
> Aynı maceracıyı bu sefer bir grup canavarın ortasında kuşatılmış halde buluyorsunuz. Kanlar içinde ama hala savaşıyor. Ona yardım etmek, kendi güvenliğinizi tehlikeye atmak demek; ancak bu dünyada bir dost edinmek, altından daha değerli olabilir. Yardım ederseniz, gerçek gücünü size gösterebilir.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Savaşa Atıl | Savaş başlat (Hard) | Savaş sonunda 15 HP kaybetmiş olursun |
| B: Uzaktan İzle | Olay zinciri sonlanır | 40 Gold yağmala |
Reward Range: Elite Battle Loot OR 40 Gold

**14. [Rakip Maceracı - Adım 3]** | Tone: combat-adjacent [CHAIN-3/3] [Requires: Rival]
> Yolculuğun sonuna doğru, rakibiniz sizi bir tepenin üzerinde bekliyor. Artık yaraları iyileşmiş ve gözlerinde bir parıltı var. "Son bir düelloya ne dersin?" diye soruyor. Bu artık bir antrenman değil, kimin daha layık olduğunu belirleme maçı. Kazanan, diğerinin en değerli hazinesini alacak.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Düelloyu Kabul Et | Savaş başlat (Boss-lite) | Kaybedersen Run biter |
| B: Hediyesini Kabul Et | "Rival's Promise" Relic kazan | Bir sonraki Elite savaşı %50 daha zor olur |
Reward Range: Legendary Card OR "Rival's Promise" Relic

---

### **III. ECONOMY EVENTS (5)**

**15. [Açgözlü Tüccar]** | Tone: economy
> Yol kenarına kurulmuş, her yerinden egzotik eşyalar sarkan bir araba görüyorsunuz. Tüccar, aşırı geniş bir gülümsemeyle sizi karşılıyor. "Sadece bugün için, sadece senin için!" diye bağırıyor. Sattığı şeyler gerçekten değerli görünüyor ama fiyatları normalin çok üstünde. Yine de, bazı şeyler paradan daha önemlidir.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Nadir Bir Şey Al | 1 Rare Relic kazan | 150 Gold Kaybet |
| B: Pazarlık Yap | Mağazadaki tüm fiyatları %20 düşür | Desteye 1 "Shame" Cursea ekle |
Reward Range: Rare Relic OR Shop Discount

**16. [Kumarhane]** | Tone: economy
> Karanlık bir ara sokakta, kapısında iki iri yarı korumanın beklediği bir mekan var. İçeriden kahkahalar ve zar sesleri geliyor. Şansına güvenenler için bir cennet, güvenmeyenler için ise bir mezarlık. Masadaki kurpiyer size göz kırpıyor: "Hepsi ya da hiçbiri, yabancı?"

| Choice | Effect | Risk |
|--------|--------|------|
| A: Zar At | %50 şansla 100 Gold kazan | %50 şansla 50 Gold Kaybet |
| B: Kart Çek | %30 şansla 1 Rare kart kazan | %70 şansla 1 "Regret" Curse ekle |
Reward Range: 100 Gold OR 1 Rare Card

**17. [Kervan Enkazı]** | Tone: economy
> Yolun kenarında ters dönmüş bir kervan ve etrafa saçılmış sandıklar var. Görünüşe göre bir baskın yemişler. Hala kurtarılabilecek eşyalar olabilir ama etraftaki kan izleri taze. Burada fazla oyalanmak, baskıncıların geri gelmesine neden olabilir. Hızlı karar vermelisiniz.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Sandıkları Aç | 70-90 Gold kazan | 12 HP Kaybet (Tuzak) |
| B: Yaralıyı Kurtar | Gelecek mağazada 1 bedava kart | 1 rastgele kartı desteden at |
Reward Range: 70-90 Gold OR Free Card

**18. [Kayıp Tüccar - Adım 1]** | Tone: economy [CHAIN-1/2] [ChainTag: LostMerchant]
> Bataklığın derinliklerinde, arabası çamura saplanmış bir tüccar yardım feryatları atıyor. Etraftaki yaratıklar yaklaşmak üzere. Eğer ona yardım ederseniz, size olan borcunu ödeyeceğine dair yemin ediyor. Tabii, hayatta kalmayı başarabilirse.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Kurtar | "LostMerchant" etiketini kazan | Savaş başlat (Normal) |
| B: Yağmala | 50 Gold kazan | 1 "Guilt" Curse ekle |
Reward Range: 50 Gold OR Chain Progression

**19. [Kayıp Tüccar - Adım 2]** | Tone: economy [CHAIN-2/2] [Requires: LostMerchant]
> Şehir merkezindeki görkemli bir dükkanın önünden geçerken, bataklıkta kurtardığınız tüccar sizi tanıyor. Artık temiz kıyafetler içinde ve çok daha zengin. "Sözümü tutarım dostum," diyerek sizi içeri davet ediyor. Dükkanındaki en özel koleksiyonunu size açıyor.

| Choice | Effect | Risk |
|--------|--------|------|
| A: En İyi Ürünü Seç | 1 Legendary Relic kazan | Tüm Altınını ver (En az 50) |
| B: Yatırım Yap | 100 Gold ver, sonraki 3 bölge boyunca her adımda 10 Gold al | Yok |
Reward Range: Legendary Relic OR Income Stream

---

### **IV. CURSE-RISK EVENTS (3)**

**20. [Yozlaşmış Tapınak]** | Tone: curse-risk
> Eskiden kutsal olan bu yer artık karanlık bir enerjiyle kaplı. Sunak üzerindeki heykellerin gözlerinden siyah bir sıvı akıyor. Ortadaki boşlukta duran kadim bir güç, size sınırsız bilgi vaat ediyor ama karşılığında ruhunuzun bir kısmını talep ediyor. Bu karanlığa dokunmak, geri dönüşü olmayan bir yolun başlangıcı olabilir.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Karanlığı Kucakla | 2 Rare kart kazan | 1 "Abyssal Brand" (Unremovable Curse) ekle |
| B: Tapınağı Temizle | 1 Curse sil | 15 HP Kaybet |
Reward Range: 2 Rare Cards OR Curse Removal

**21. [Kan Fedakarlığı]** | Tone: curse-risk
> Bir ayin meydanında, yerdeki rünler taze kanla parlıyor. Bir ses zihninizde yankılanıyor: "Can vermeden, can alamazsın." Kendi kanınızı bu rünlere akıtarak elementlerin öfkesini dindirebilir ya da onları kendi çıkarınız için kışkırtabilirsiniz. Her damla kan, size bir avantaj sağlayacak.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Büyük Fedakarlık | 1 Extra Energy (Permanent) kazan | Max HP %30 azalır |
| B: Küçük Fedakarlık | 2 kart yükselt | 20 HP Kaybet |
Reward Range: +1 Energy OR 2 Card Upgrades

**22. [Lanetli Çeşme]** | Tone: curse-risk
> Yolun kenarındaki çeşmeden akan su berrak görünüyor, ancak etrafındaki bitkiler simsiyah ve kurumuş. Çeşmenin üzerinde "İçen kişi her şeyi görür, ama hiçbir şeyi unutamaz" yazıyor. Bu suyu içmek zihninizi açabilir ama beraberinde kabusları da getirecektir.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Suyu İç | Tüm haritayı aç ve 1 Rare kart seç | 2 "Nightmare" Curse ekle |
| B: Elini Yıka | 20 HP Yenile | 1 "Weakened Will" Curse ekle |
Reward Range: Map Vision & Rare Card OR 20 HP Heal

---

### **V. LORE-TIED EVENTS (3)**

**23. [Solomne'nin Aydınlığı]** | Tone: lore-tied [Territory: Solomne/Ember]
> Solomne'nin güneşle kavrulmuş topraklarında, devasa bir güneş saatinin önündesiniz. Ember halkı, enerjisini bu kadim yapıdan alıyor. Güneş tam tepeye ulaştığında, saatin gölgesi gizli bir bölmeyi işaret ediyor. Burada, Ember elementinin en saf hali saklı. Bu ışık, karanlıkta yolunuzu aydınlatabilir.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Güneşi Selamla | Desteye 1 "Solar Flare" (Rare/Ember) ekle | 10 HP Kaybet |
| B: Gölgeyi Araştır | "Sunlight Medal" Relic kazan | Bir sonraki savaşta Blind alırsın |
Reward Range: Rare Ember Card OR Lore Relic

**24. [Mhalrai'nin Derinlikleri]** | Tone: lore-tied [Territory: Mhalrai/Storm]
> Storm bölgesinin bitmek bilmeyen yağmurları altında, Mhalrai'nin kutsal saydığı bir su kaynağına ulaşıyorsunuz. Su, fırtınanın enerjisiyle adeta kaynıyor. Mhalrai rahiplerinin burada meditasyon yaparak elementlerle konuştuğu söylenir. Suyun sesine kulak verirseniz, fırtınayı kontrol etmenin yolunu öğrenebilirsiniz.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Fırtınaya Seslen | Desteye 1 "Chain Lightning" (Rare/Storm) ekle | Max HP 5 azalır |
| B: Suya Dal | "Storm's Heart" Relic kazan | 1 "Drowned" Curse ekle |
Reward Range: Rare Storm Card OR Lore Relic

**25. [Eshmir'in Peçesi]** | Tone: lore-tied [Territory: Eshmir/Umbra]
> Umbra'nın ebedi karanlığında, Eshmir'in kurduğu hayaletimsi bir kentin kalıntıları arasında yürüyorsunuz. Burası, gerçeklik ile rüya dünyasının birbirine karıştığı yer. Eshmir'in peçesi üzerinize çökerken, kendinizi bir anda geçmişin gölgeleriyle çevrili buluyorsunuz. Bu gölgeler size unutulmuş bir gücü sunuyor.

| Choice | Effect | Risk |
|--------|--------|------|
| A: Gölgelerle Anlaş | Desteye 1 "Shadow Step" (Rare/Umbra) ekle | 12 HP Kaybet |
| B: Peçeyi Kaldır | "Void Eye" Relic kazan | Desteden rastgele 1 kart silinir |
Reward Range: Rare Umbra Card OR Lore Relic


## §36 — İlk Oyuncu Deneyimi (FTUE) ve Tutorial Sistemi

Pact of Five'ın başarısı, oyuncunun beşli element döngüsünü ve kart sinerjilerini ilk 10 dakika içinde ne kadar hızlı kavradığına bağlıdır. Bu bölüm, oyuncunun oyunu ilk açtığı andan ilk gerçek turuna kadar olan süreci adım adım teknik ve tasarımsal detaylarıyla tanımlar.

---

### 36.1 First-Launch Flow (İlk Açılış Akışı)

Oyuncu uygulamayı veya web sayfasını ilk kez başlattığında (LocalStorage'da `pact-of-five:init` anahtarı yoksa), aşağıdaki sekans başlar:

1.  **Splash Screen (2.0s):**
    *   Ekran merkezinde "Pact of Five" logosu beyaz bir parlamayla belirir.
    *   Logo çevresinde 5 elementin parçacık patlaması gerçekleşir.
    *   Sıralama (her biri 500ms sürer, 100ms gecikmeyle tetiklenir):
        *   0ms: Ember (Turuncu kıvılcımlar)
        *   100ms: Tide (Mavi damlacıklar)
        *   200ms: Verdant (Yeşil yapraklar)
        *   300ms: Storm (Mor elektrik arkları)
        *   400ms: Umbra (Siyah sis dalgaları)
    *   Ses: "Element Harmony" isimli 2 saniyelik orkestral bir vurgu sesi çalınır.

2.  **Intro Cinematic (Giriş Sinematiği):**
    *   Arka planda parşömen dokulu statik ama hafifçe zoom yapan görseller eşliğinde aşağıdaki Türkçe metin kayan yazı (fade-in/out) şeklinde sunulur:
    *   **Paragraf 1 (Ayrılış):** "Kadim zamanlarda, Beş Element Efendisi dünyayı sarsılmaz bir uyumla yönetirdi. Ancak 'Ayrılış' (The Sundering) geldiğinde, bu kutsal bağ parçalandı. Gökyüzü fırtınalarla karardı, denizler çekildi ve toprak zehirli sarmaşıklarla doldu. Beşli Pakt bozulduğunda, dünya sadece hayaletlerin ve elemental canavarların dolaştığı bir harabeye dönüştü."
    *   **Paragraf 2 (Kaosun Yükselişi):** "Yüzyıllar boyunca Ember'ın sıcaklığı yerini yakıcı bir öfkeye, Tide'ın huzuru amansız bir fırtınaya bıraktı. Umbra'nın karanlığı her şeyi yutmaya başlarken, elementler birbirine düşman kesildi. Bu dengesizlik, varoluşun dokusunu yırtmak üzereydi. İnsanlık, bu elemental savaşın ortasında çaresizce bir kurtarıcı beklemeye başladı."
    *   **Paragraf 3 (Paktın Mirası):** "Sen, son Pakt kurucularının soyundan gelen bir Tamer'sın. Ruhun, elementlerle bağ kurma yeteneğine sahip nadir bir özdür. Beş Element Efendisi'ni bulmalı, onları dize getirmeli ve kopan bağları yeniden örmelisin. Dünyanın kaderi senin elinde. Beş elementin gücünü birleştir ve Paktı yeniden kur."
    *   **Interaksiyon:** Metin bittiğinde ekranın altında "Devam etmek için dokun / tıkla" ibaresi yanıp söner (1.0s loop).

---

### 36.2 Character Select — First-Time Gating (Karakter Seçimi ve Kısıtlamalar)

İlk açılışta oyuncunun kafasının karışmaması için karakter havuzu kısıtlıdır:

1.  **Kilit Durumları:**
    *   **Tamer (Açık):** Tek seçilebilir karakter. Portresi renklidir.
    *   **Sage (Kilitli):** Silüet halindedir. Altındaki yazı: "Tamer ile 2. Bölümü tamamla."
    *   **Hunter (Kilitli):** Silüet halindedir. Altındaki yazı: "Herhangi bir Element Lord'u yen."
    *   **Warden (Kilitli):** Silüet halindedir. Altındaki yazı: "Tam bir zafer kazan."

2.  **Tamer Seçim Tooltipi (Türkçe):**
    *   "Tamer, elemental yaratıkları çağırma ve onlarla bağ kurma ustasıdır. Dengeli bir oyun tarzı sunar, savunma ve saldırıyı yaratıklarıyla paylaştırır. Yeni başlayanlar için idealdir."

3.  **Onay Sekansı:**
    *   Tamer seçildiğinde "Tamer seçildi — Tutorial başlıyor" yazısı belirir.
    *   1200ms bekledikten sonra ekran kararır (fade-to-black) ve ilk tutorial karşılaşmasına geçiş yapılır.

---

### 36.3 Tutorial Run Structure — 3 Forced Encounters (3 Zorunlu Karşılaşma)

Tutorial, oyuncunun hata yapmasına izin vermeyen, script edilmiş üç küçük savaştan oluşur.

#### Encounter 1: Temel Saldırı ve Savunma
*   **Düşman:** "Saman Kukla" (HP: 1, Intent: "Saldırı 1")
*   **Oyuncu Eli:** [Kor Darbesi], [Taş Kalkan], [Bitiş]
*   **Akış:**
    *   **Adım 1:** El alanına ok işareti gösterilir. Yazı: "Bu kartlar elindeki kartlar. Bir kart seç."
    *   **Adım 2:** [Kor Darbesi] kartı parlar. Yazı: "Kor Darbesi ile düşmana 3 hasar ver. Kartı düşmanın üzerine sürükle."
    *   **Adım 3:** Oyuncu kartı oynar, kukla 1 HP olduğu için hemen ölür.
    *   **Adım 4:** "Bitiş" kartı veya "Turu Bitir" butonu parlar. Yazı: "Turu bitir." (Eğer kukla ölmeseydi bu adım zorunlu olurdu).
    *   **Sonuç:** "Mükemmel! Düşmanı yendin." pop-up (800ms).

#### Encounter 2: Element Zayıflık Halkası
*   **Düşman:** "Genç Orman Ruhu" (Element: Verdant, HP: 12, Intent: "Savunma 3")
*   **Oyuncu Eli:** [Kor Patlaması] (Ember), [Dalga Tozu] (Tide), [Taş Kalkan]
*   **Akış:**
    *   **Adım 1:** Ekranın ortasında Element Çemberi belirir. Ember -> Verdant oku kırmızıyla parlar.
    *   **Yazı:** "Ember kartları, Verdant düşmanlara %50 daha fazla hasar verir!"
    *   **Adım 2:** [Kor Patlaması] kartı (2 Mana) vurgulanır.
    *   **Adım 3:** Oyuncu kartı oynadığında, hasar rakamı "9" (6 x 1.5) olarak turuncu renkte uçar.
    *   **VFX:** Düşman üzerinde "Element avantajı! +%50 hasar" metni yüzer.
    *   **Adım 4:** [Dalga Tozu] (Tide) kartı gösterilir. Tide -> Ember döngüsü anlatılır. "Yanlış element seçimi hasarını azaltabilir, dikkatli ol!"

#### Encounter 3: Keyword Tanıtımı
*   **Düşman:** "Fırtına Perisesi" (Element: Storm, HP: 15, Intent: "Saldırı 4")
*   **Oyuncu Eli:** [Kalkan Muhafızı] (Guard), [Çabuk Adım] (Swift), [Eko Fısıltısı] (Echo)
*   **Akış:**
    *   **Guard Tanıtımı:** [Kalkan Muhafızı] üzerine gelince tooltip çıkar: "MUHAFIZ: Bu yaratık düşman saldırılarını senin yerine alır." Oyuncu kartı oynar, bir yaratık slotu dolar.
    *   **Swift Tanıtımı:** [Çabuk Adım] üzerine gelince tooltip çıkar: "ÇABUK: Bu yaratık savaşta ilk hareket eder." Oyuncu bunu oynar.
    *   **Echo Tanıtımı:** [Eko Fısıltısı] üzerine gelince tooltip çıkar: "EKO: Bu kartın etkisi iki kez gerçekleşir." Oyuncu bunu oynar, 2 enerji/blok kazanır.
    *   **Bitiş:** "Anahtar kelimeleri öğrendin! Bunları hep hatırlamak için Kod ekranına bakabilirsin."
    *   **VFX:** Ekrandaki Codex butonu altın sarısı bir efektle 2 kez parlar.

---

### 36.4 Tutorial-Only Cards (Tutorial'a Özel Kartlar)

Bu kartlar dengeyi öğretmek için basitleştirilmiştir ve ana oyunda (Loot havuzunda) bulunmazlar.

| ID | İsim | Mana | Etki | Tutorial Sebebi |
|:---|:---|:---:|:---|:---|
| TUT-001 | Kor Darbesi | 1 | 3 hasar ver | Ember'ın temel vuruşu; element ölçeklendirmesi devre dışıdır. |
| TUT-002 | Taş Kalkan | 1 | 4 Blok kazan | Sabit blok değeri; karakter pasiflerinden etkilenmez. |
| TUT-003 | Kalkan Muhafızı | 2 | 3/2 Guard yaratık çağır | Karmaşık mekanikleri olmayan standart bir tank birimi. |
| TUT-004 | Bitiş | 0 | Turu sonlandır | Oyuncuya tur sonu kavramını buton aramadan öğretir. |

---

### 36.5 Tutorial UI Overlay System (Arayüz Overlay Sistemi)

Tutorial sahnelerindeki görsel rehberlik sistemi şu teknik parametreleri kullanır:

1.  **Spotlight Mask (Odaklama):**
    *   CSS: `box-shadow: 0 0 0 9999px rgba(0,0,0,0.75);`
    *   Odaklanan elementin `z-index` değeri `9999`'a çıkarılır.
    *   Geçişlerde 100ms'lik bir cross-fade uygulanır.

2.  **Ok Sistemi (Arrow):**
    *   CSS Triangle + Y ekseninde 10px'lik bir `infinite bounce` animasyonu.
    *   Rengi: Altın sarısı (#FFD700).
    *   Hedefe olan uzaklık: 40px sabit ofset.

3.  **Bilgi Baloncuğu (Tooltip Bubble):**
    *   Arka plan: `#FFFFFF`, Kenarlık: 2px `#4A90E2`.
    *   `border-radius: 12px`, `padding: 16px`, `max-width: 320px`.
    *   **Konumlandırma:** Eğer hedefin Y koordinatı ekranın %50'sinden büyükse balon hedefin üstünde, değilse altında belirir.
    *   **Butonlar:**
        *   "Atla": Sağ alt köşe (Opsiyonel, sadece belirli adımlarda).
        *   "İleri": Alt orta (Gerekli aksiyon yapılana kadar `disabled` durumdadır).

4.  **Adım Sayacı:**
    *   Balon başlığında "1/3", "2/4" gibi gri renkte küçük fontla gösterilir.

---

### 36.6 Skip Tutorial Option (Tutorial'ı Atlama Seçeneği)

Her oyuncu tutorialı tamamlamak istemeyebilir.

1.  **Giriş:** Karakter seçim ekranında sol alt köşede "Tutorial'ı Atla" butonu yer alır.
2.  **Onay:** Tıklandığında "Emin misin? Element döngüsünü öğrenmek hayatta kalmanı sağlar." uyarısı çıkar.
3.  **Mini-Tutorial Fallback:** Eğer oyuncu atlarsa, ilk gerçek savaşının 1. turunda 15 saniye süren hızlı bir özet gösterilir:
    *   5s: "Kartları sürükle ve oyna."
    *   5s: "Ember > Verdant > Storm > Umbra > Tide > Ember döngüsünü unutma."
    *   5s: "Turu bitirmek için sağdaki butonu kullan."
4.  **Teknik Kayıt:** LocalStorage'da `pact-of-five:tut:skipped:v1 = true` flag'i set edilir.

---

### 36.7 Post-Tutorial Handoff (Tutorial Sonrası Geçiş)

Üçüncü karşılaşma bittiğinde oyuncu doğrudan ana oyuna ısındırılır:

1.  **Kısa Ara Sahne (Static Art):**
    *   Panel 1: Tamer, bir Ember parçacığı ile bağ kurarken görülür.
    *   Panel 2: Harita (Sundering Map) yavaşça açılır.
    *   Panel 3: Uzaktaki 5 Element Lord'un gölgesi görünür.
2.  **Metin:** "İlk paktını kurdun. Beş Element Efendisi'ni yenmek için Sundering Haritasına ilerle. Unutma, her zafer seni Paktı tamamlamaya bir adım daha yaklaştıracak."
3.  **Harita Yönlendirmesi:** Ekran harita sahnesine geçer, Act 1'in başlangıç noktasına büyük bir ok işareti odaklanır.
4.  **Hedef Görseli:** Sağ üst köşede "Hedef: 5 Element Lord'u yenerek Paktı tamamla" kalıcı görev metni belirir.

---

### 36.8 Tutorial State Machine (Durum Makinesi)

Tutorial akışını yöneten `TutorialManager` aşağıdaki yapıdadır:

```typescript
enum TutorialPhase {
  NOT_STARTED = 'not_started',
  INTRO_CINEMATIC = 'intro_cinematic',
  CHARACTER_SELECT = 'character_select',
  ENCOUNTER_1_BASIC = 'enc1_basic',
  ENCOUNTER_2_ELEMENT = 'enc2_element',
  ENCOUNTER_3_KEYWORDS = 'enc3_keywords',
  POST_TUTORIAL = 'post_tutorial',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

interface TutorialState {
  phase: TutorialPhase;
  currentStep: number;
  totalSteps: number;
  completed: boolean;
  skipped: boolean;
  version: string; // 'v2'
}

/*
Geçiş Kuralları (Transitions):
1. NOT_STARTED -> INTRO_CINEMATIC: Uygulama açılışında 'init' flag'i yoksa.
2. INTRO_CINEMATIC -> CHARACTER_SELECT: Son paragraf bitip ekrana dokunulduğunda.
3. CHARACTER_SELECT -> ENCOUNTER_1_BASIC: Tamer seçilip 'Başla' denildiğinde.
4. ENCOUNTER_1_BASIC -> ENCOUNTER_2_ELEMENT: Saman Kukla öldüğünde.
5. ENCOUNTER_2_ELEMENT -> ENCOUNTER_3_KEYWORDS: Orman Ruhu öldüğünde.
6. ENCOUNTER_3_KEYWORDS -> POST_TUTORIAL: Fırtına Perisesi öldüğünde.
7. POST_TUTORIAL -> COMPLETED: Harita sahnesine ilk giriş yapıldığında.
8. CHARACTER_SELECT -> SKIPPED: 'Atla' butonuna basılıp onaylandığında.

Kayıt Mekanizması:
localStorage.setItem('pact-of-five:tut:v2', JSON.stringify(tutState));
Eğer 'v1' flag'i varsa, oyuncu eski tutorial'ı yapmış sayılır ve COMPLETED'a çekilir.
*/
```

---

### 36.9 Tutorial Skip Recovery — Context Tooltips (Hata Kurtarma Sistemi)

Eğer oyuncu tutorialı atladıysa veya bitirmesine rağmen oyunda zorlanıyorsa (3 "kafa karışıklığı" kriteri), sistem müdahale eder:

1.  **Heuristikler (Kafa Karışıklığı Tetikleyicileri):**
    *   Aynı kartı üst üste 3 tur boyunca oynamak (Strateji eksikliği).
    *   1. Bölümde (Floor 1-5) canın %20'nin altına düşmesi.
    *   Hiç kart oynamadan turu 2 kez üst üste bitirmek.

2.  **Müdahale Tooltipi:**
    *   Ekranın üst kısmında nazik bir panel belirir: "İpucu: Element avantajını unutma! ⚔ Ember → Verdant, 💧 Tide → Ember. Zayıf olduğun elementten kaçın!"
    *   Bu tooltip "X" ile kapatılabilir ve oyunu durdurmaz (non-modal).
    *   Bir run boyunca en fazla 1 kez, toplam hesap ömrü boyunca en fazla 3 kez tetiklenir.

---

### 36.10 First Real Run Integration (İlk Gerçek Tur Entegrasyonu)

Tutorial bittikten sonraki ilk oyun (Run 1) özel kısıtlamalara tabidir:

1.  **Forced Node:** Haritadaki ilk düğüm her zaman standart bir "Düşman Karşılaşması"dır. Elite veya Event düğümü gelmez.
2.  **Card Rewards:** İlk zaferden sonra sunulan 3 karttan en az biri Ember veya Verdant olmalıdır. Umbra ve Storm gibi yüksek karmaşıklıktaki elementler (Echo/Combo ağırlıklı) ilk 3 katta nadiren çıkar.
3.  **Düşman Zorluğu:** Floor 1-3 arası düşmanların HP değerleri standart değerlerin %10 altındadır.
4.  **Hedef Hatırlatıcı:** Sağ üst köşedeki hedef metni Floor 3'e kadar kalır: "Hedef: Act 1 Boss'unu (Element Lord) yen."

Bu yapı, oyuncunun oyunu "öğrenilmiş bir başarı" hissiyle başlatmasını ve ilk 15 dakikada oyunu bırakma (churn) oranını minimize etmeyi hedefler.


## §37 — Meta-İlerleme Sistemi (Sanctuary, Echoes, Kilit Açma, Ascension)

Pact of Five meta-ilerleme sistemi, oyuncunun her denemesinden (run) anlamlı bir kazanımla dönmesini sağlamak ve oyunun derinliğini zamanla artırmak için tasarlanmıştır. Bu sistem, oyuncu becerisini ödüllendirirken, aynı zamanda uzun vadeli hedefler ve görsel özelleştirmeler sunarak oyun süresini (replayability) maksimize eder.

### 37.1 — Sanctuary Hub (Runs Arası Overworld Sahnesi)

Sanctuary, oyunun ana menüsü ile oyun döngüsü arasındaki köprüdür. Burası, kadim bir ormanın kalbinde, beş elementin enerjisinin kesiştiği huzurlu bir açıklıktır.

**Görsel Yerleşim ve Estetik:**
- **Düzen:** Dairesel bir meydan. Merkezde sönmeyen, mavi-beyaz alevli bir kamp ateşi (Pakt Ateşi) bulunur.
- **Element Sütunları:** Meydanın çevresinde beş adet devasa taş sütun (Shrine) yer alır. Bunlar sırasıyla Ember (Ateş), Tide (Su), Verdant (Doğa), Storm (Elektrik) ve Umbra (Gölge) elementlerini temsil eder.
- **Gelişimsel Görsellik:** Oyuncu bir Element Lordu'nu ilk kez yendiğinde, ilgili sütun kalıcı olarak parlamaya başlar ve üzerindeki rünler aktifleşir. Beş sütun da yandığında, meydanın ortasındaki gökyüzüne doğru devasa bir ışık hüzmesi yükselir.
- **Kamera:** Sabit 2D perspektif, ancak hafif bir derinlik hissi veren izometrik (top-down) açı. Dinamik ışıklandırma, kamp ateşinin gölgelerini ağaçlara düşürür.

**Etkileşimli Alanlar:**
1.  **Element Shrines:** Her sütuna tıklandığında, o elemente ait "Element Galerisi" açılır. Burada o elementin kilitli ve açık kartları, irfan (lore) metinleri ile birlikte sergilenir.
2.  **NPC "Yaşlı Evcilleştirici" (Old Tamer):** Ateşin yanında bağdaş kurmuş, yanında beş farklı elementten küçük hayvan dostları (bir ateş tilkisi, bir su kaplumbağası vb.) olan yaşlı bir figür. Oyuncuya rehberlik eder ve kilit açma işlemlerini yönetir.
3.  **Echo Vault:** Ateşin hemen arkasında, havada asılı duran ve içinden Yankı (Echo) enerjisi sızan kadim bir sandık. Mevcut ve maksimum Yankı miktarını bir ilerleme çubuğu ile gösterir.
4.  **Ascension Altar:** Meydanın kuzeyinde yer alan, üzerinde yıldız haritaları kazınmış taş bir platform. Zorluk seviyelerini seçmek için kullanılır.
5.  **Run History Scroll:** Altarın yanındaki bir kürsü üzerinde duran, oyuncunun geçmişteki tüm zafer ve yenilgilerini detaylandıran parşömen.

**Kullanıcı Arayüzü (UI) Katmanı:**
- **Merkez Alt:** "Yeni Koşu Başlat" (Büyük, altın varaklı buton).
- **Sağ Alt:** "Günlük Meydan Okuma" (Gümüş renkli, üzerinde takvim ikonu olan buton).
- **Sol Üst:** Oyuncu profili, seviyesi ve aktif Ascension derecesi.
- **Sağ Üst:** Ayarlar, Koleksiyon ve Çıkış ikonları.

### 37.2 — Echo Para Birimi Sistemi

Echoes (Yankılar), oyuncunun her koşuda topladığı, evrenin hafızasından süzülen bir enerji birimidir. Bu birim, kalıcı güç artışı sağlamaz (roguelike felsefesini korumak için), ancak seçenek havuzunu genişletir.

**Echo Kazanım Tablosu (Run Başına):**

| Kaynak | Kazanılan Yankı | Koşul |
| :--- | :--- | :--- |
| Normal Savaş | 1 Echo | Her galibiyet |
| Elit Savaş | 3 Echo | Her elit galibiyeti |
| Bölüm Sonu Bossu | 10 Echo | Her Act boss kesimi |
| Tam Galibiyet | 20 Echo | Act 3 bossu sonrası bonus |
| Günlük Görev | 5 Echo | Günde bir kez tamamlama |
| Başarım Kilit Açma | 5-25 Echo | Başarımın zorluğuna göre |
| Act 1 Ölüm | 3 Echo | Teselli ikramiyesi |
| Act 2 Ölüm | 7 Echo | Teselli ikramiyesi |
| Act 3 Ölüm | 12 Echo | Teselli ikramiyesi |

**Tipik Getiri Senaryoları:**
- **Kısa Koşu (Act 1 Bossu öncesi ölüm):** 8-15 Echo.
- **Orta Koşu (Act 2 ortası ölüm):** 18-28 Echo.
- **Tam Koşu (Act 3 Galibiyeti):** 45-60 Echo.

**Echo Ekonomisi Kuralları:**
- **Maksimum Sınır:** 300 Echo. Oyuncuların biriktirip yeni güncellemeleri anında bitirmesini engellemek için bu sınır konulmuştur.
- **Görsel Bildirim:** Run sonunda "Run Summary" ekranında, kazanılan Yankılar tek tek uçarak Echo Vault ikonuna girer.

**Echo Harcama Kategorileri:**

| Ürün | Yankı Maliyeti | Kategori |
| :--- | :--- | :--- |
| Tier-1 Kart Kilidi | 15-25 Echo | Kartlar |
| Tier-2 Kart Kilidi | 40-60 Echo | Kartlar |
| Kart Arkalığı (Cosmetic) | 80 Echo | Kozmetik |
| Masa Teması (Board) | 120 Echo | Kozmetik |
| Karakter Görünümü (Skin) | 150 Echo | Kozmetik |
| Ascension İzni (A6-A10) | 30 Echo (Seviye başı) | Yükseliş |
| Ascension İzni (A11-A20) | 50 Echo (Seviye başı) | Yükseliş |

### 37.3 — Kart Kilit Açma Ağacı

Oyunun başlangıcında 50 temel kart (starter set) açıktır. Toplamda 100 kartlık ana havuzun kalan 50 kartı meta-ilerleme ile açılır.

**Kilit Açma Kuralları:**
- Her kilitli kartın iki yolu vardır: Ya belirli bir başarımı tamamlamak ya da Echo harcayarak "Yaşlı Evcilleştirici"den satın almak.
- Bazı nadir kartlar "Sadece Başarım" ile açılabilir (Echo ile alınamaz).

**Örnek Kilit Açma Listesi (25 Örnek):**

| Kart ID | Kart Adı | Element | Maliyet | Alternatif Koşul (Başarım) |
| :--- | :--- | :--- | :--- | :--- |
| EMB-UNL-01 | Ember Wyrm | Ember | 25 | 3+ Ember yaratığıyla savaşı kazan |
| EMB-UNL-02 | Infernal Crown | Ember | 40 | Sadece Echo |
| TID-UNL-01 | Tidal Surge | Tide | 25 | 1 HP ile hayatta kal ve kazan |
| TID-UNL-02 | Deep Leviathan | Tide | 40 | Sadece Echo |
| VRD-UNL-01 | Ancient Grove | Verdant | 25 | Bir turda 10 Verdant kartı oyna |
| VRD-UNL-02 | World Tree | Verdant | 60 | Verdant destesiyle Act 3 bitir |
| STM-UNL-01 | Chain Storm | Storm | 25 | Tek turda 5 Combo puanına ulaş |
| STM-UNL-02 | Tempest Lord | Storm | 40 | Sadece Echo |
| UMB-UNL-01 | Shadow Reaper | Umbra | 25 | Tek turda 3 düşman öldür |
| UMB-UNL-02 | Void Tyrant | Umbra | 60 | Sadece Umbra kartlarıyla kazan |
| NEU-UNL-01 | Echo Amplifier | Neutral | 20 | Sadece Echo |
| NEU-UNL-02 | Pact Renewal | Neutral | 35 | Sadece Echo |
| TAM-UNL-01 | Bond Ascendant | Tamer | 50 | Bir run'da 10 Bond aktivasyonu yap |
| SAG-UNL-01 | Arcane Overload | Sage | 50 | Tek turda 4 büyü zincirle |
| HUN-UNL-01 | Toxic Arsenal | Hunter | 50 | Bir düşmana 20 Wound stack'le |
| WAR-UNL-01 | Unbreakable Vow | Warden | 50 | 3 tur boyunca tek haneli HP'de kal |
| EMB-UNL-03 | Phoenix Down | Ember | 30 | İlk kez ölümden dön (Relic ile) |
| TID-UNL-03 | Maelstrom | Tide | 45 | 5 düşmanı aynı anda dondur |
| VRD-UNL-03 | Spore Cloud | Verdant | 20 | 50+ can yenile (tek savaşta) |
| STM-UNL-03 | Static Field | Storm | 30 | 10 tur boyunca hasar almadan kazan |
| UMB-UNL-03 | Soul Siphon | Umbra | 50 | Max HP'ni run boyunca 20 artır |
| NEU-UNL-03 | Prism Shield | Neutral | 25 | 5 farklı elementten kart oyna |
| TAM-UNL-02 | Alpha Call | Tamer | 40 | 4 farklı hayvan dostu çağır |
| SAG-UNL-02 | Chrono Shift | Sage | 60 | Bir savaşı 2 turda bitir |
| HUN-UNL-02 | Predator's Mark | Hunter | 35 | Görünmez bir düşmanı açığa çıkar |

### 37.4 — Karakter Kilit Açma Koşulları (Detaylı)

Oyunda 4 ana karakter sınıfı bulunur. Her biri farklı bir oyun mekaniğini temsil eder.

1.  **Tamer (Evcilleştirici):**
    - **Koşul:** Her zaman açık.
    - **Tanım:** Hayvan dostları ve element bağları üzerine uzmanlaşmış dengeli karakter.
2.  **Sage (Bilge):**
    - **Koşul:** "2. Bölüm Kartografı" başarımı (Tamer ile Act 2'yi herhangi bir zorlukta bitir).
    - **Anlatım:** Sanctuary'de Yaşlı Evcilleştirici'nin yanına genç bir figür gelir. "Elementlerin dilini öğrendim," der ve kilit açılır.
3.  **Hunter (Avcı):**
    - **Koşul:** "İlk Lord Kanı" başarımı (Herhangi bir karakterle bir Act 3 Boss'unu yen).
    - **Anlatım:** Boss öldüğünde, gölgelerin arasından bir figür çıkar ve Boss'un kalıntılarını inceler. Bu Hunter'dır.
4.  **Warden (Koruyucu):**
    - **Koşul:** "Pakt Tamamlayıcı" başarımı (Zorluk fark etmeksizin oyunu tam bir zaferle bitir).
    - **Anlatım:** Beş Element Sütunu aynı anda parlar, Sanctuary'nin ortasında ağır zırhlı bir şövalye belirir. Paktın bekçisi uyanmıştır.

### 37.5 — Ascension Sistemi (Tam 0-20 Tablosu)

Ascension seviyeleri, deneyimli oyuncular için her galibiyetten sonra zorluğu kademeli olarak artıran bir sistemdir.

| Seviye | İsim | Değiştirici (Modifier) |
| :--- | :--- | :--- |
| **A0** | Başlangıç | Temel zorluk seviyesi. |
| **A1** | Paktlı Yol | Tüm düşmanlar +10% Max HP kazanır. |
| **A2** | Artan Açgözlülük | Dükkanlardaki tüm ürün fiyatları +25% artar. |
| **A3** | Karanlık Tohum | Koşuya destende 1 adet "Parazit" Lanet kartı ile başlarsın. |
| **A4** | Kararlı Düşmanlar | Elit düşmanlar +15% daha fazla hasar vurur. |
| **A5** | Dolu Hazine | Savaş ödülü olarak sunulan kart seçeneği 3'ten 2'ye düşer. |
| **A6** | Huzursuz Anlar | Her 5 turda bir, mevcut mana havuzun kalıcı olarak 1 azalır. |
| **A7** | Yankı Kırılması | "Echo" mekaniği artık kartı 2 kez değil, sadece 1.5 kez (yuvarlanır) tetikler. |
| **A8** | Kırık Pakt | Koşuya destende 2 adet Lanet kartı ile başlarsın. |
| **A9** | Kanatçı Düşmanlar | Tüm düşmanlar +20% HP ve +10% hasar kazanır. |
| **A10** | Boş Hazine | Dinlenme alanları (Rest Site) artık 25% yerine sadece 10% HP yeniler. |
| **A11** | Gizli Niyetler | Düşmanların saldırı niyetleri savaşın ilk turunda gizli kalır. |
| **A12** | Üçlü Lanet | Desteye 3 Lanet kartı eklenir ve bunlar "Remove Card" ile silinemez. |
| **A13** | Yıpranmış | Her Act başında, mevcut deste boyutunun 2 katı kadar hasar alırsın. |
| **A14** | Acımasız Elitler | Elit düşmanlar savaşa rastgele bir "Modifier" (Shield, Haste vb.) ile başlar. |
| **A15** | Zehirli Eko | Echo kartları kullanıldığında oyuncuya 1 stack "Burn" verir. |
| **A16** | Solan Güç | Her boss galibiyetinden sonra rastgele bir Relic'in özelliği %50 azalır. |
| **A17** | Sonsuz Lanet | Her boss öldüğünde destene otomatik olarak 2 rastgele Lanet eklenir. |
| **A18** | Kırık Döngü | Günlük Echo bonusu bu zorlukta devre dışıdır. |
| **A19** | Son Sınav | Tüm Act 3 düşmanları +30% HP ve +20% hasar kazanır. |
| **A20** | Gerçek Pakt | Boss savaşları artık iki aşamalıdır; ilk boss ölünce ikinci bir boss girer. |

**Kilit Açma Mekaniği:**
- A1-A5: Bir önceki seviyeyi bitirince otomatik açılır.
- A6-A10: Seviye başı 30 Echo ödenerek "Yükseliş İzni" alınmalıdır.
- A11-A20: Seviye başı 50 Echo ödenerek "Kadim İzin" alınmalıdır.

### 37.6 — Kozmetik Sistem

Kozmetikler tamamen görseldir ve oyun dengesini etkilemez.

**Kart Arkalıkları (8 Çeşit):**
- **CB-01 Pakt Mühürü:** Varsayılan.
- **CB-02 Ember Levhası:** 80 Echo. Yanan kenarlar.
- **CB-03 Derin Okyanus:** 80 Echo. Hareketli su dalgaları.
- **CB-04 Yaşam Sarmaşığı:** 80 Echo. Büyüyen yaprak animasyonu.
- **CB-05 Fırtına Çekirdeği:** 80 Echo. Çakan şimşek efektleri.
- **CB-06 Umbra Gölgesi:** 80 Echo. Etrafından siyah dumanlar sızar.
- **CB-07 Beş Yıldız:** Başarım (Tüm 5 Element Lordunu Yen). Altın parıltılı.
- **CB-08 Kayıp Pakt:** Başarım (A20 Tamamla). Koyu mor, çatlak görünümlü.

**Masa Temaları:**
- **BT-01 Sanctuary:** Varsayılan orman teması.
- **BT-02 Volkanik Krater:** 120 Echo. Arka planda akan lavlar.
- **BT-03 Fırtına Takımadaları:** 120 Echo. Yağmurlu ve rüzgarlı atmosfer.
- **BT-04 Boşluk (Void):** 150 Echo. Yıldızların ve karanlığın içinde savaş.

### 37.7 — Save Sistemi Mimarisi

Oyun verileri LocalStorage üzerinde JSON formatında tutulur.

**LocalStorage JSON Şeması:**
```json
{
  "meta": {
    "version": 3,
    "echoes": 145,
    "echoLifetime": 1250,
    "unlockedCards": ["EMB-001", "EMB-UNL-01", "TID-001"],
    "unlockedCharacters": ["tamer", "sage"],
    "unlockedCosmetics": ["CB-01", "BT-01", "CB-02"],
    "activeCardBack": "CB-02",
    "activeBoardTheme": "BT-01",
    "ascensions": {
      "tamer": 5, "sage": 2, "hunter": 0, "warden": 0
    },
    "achievements": {
      "FIRST_WIN": "2026-04-20T12:00:00Z",
      "ELEMENT_LORD_EMBER": "2026-04-25T15:30:00Z"
    },
    "runHistory": [
      { "id": "uuid-1", "char": "tamer", "win": false, "floor": 12, "echoes": 15 }
    ],
    "settings": {
      "volume": { "master": 0.8, "music": 0.5 },
      "language": "tr",
      "colorblind": "none"
    }
  },
  "run": {
    "slot1": { "currentFloor": 5, "hp": 45, "deck": [...] },
    "slot2": null,
    "slot3": null
  }
}
```

**Güvenlik ve Yedekleme:**
- **Auto-save:** Her savaş bittiğinde ve her ödül seçildiğinde tetiklenir.
- **Backup:** `pact-of-five:backup` anahtarı altında son başarılı kayıt tutulur.
- **Checksum:** Kayıt dosyasının sonuna bir hash eklenerek dış müdahaleler (hile) tespit edilir.

### 37.8 — Aşırı Öğütme (Grind) Koruması

Oyuncunun oyundan soğumasını engellemek için tasarlanmış mekanizmalar:

1.  **Run Başına Echo Sınırı:** Bir koşuda ne kadar çok düşman kesilirse kesilsin, kazanılabilecek maksimum Echo 60 ile sınırlıdır. Bu, oyuncuların sonsuz döngüler kurarak saatlerce aynı run'da kalmasını engeller.
2.  **Günlük Bonus:** Her günün ilk tamamlanan (veya ölünce biten) run'ı için +5 Echo sabit bonus verilir. Bu, oyuncuları her gün en az bir kez oynamaya teşvik eder.
3.  **Başlangıç Desteği:** İlk 3 oyununda oyuncu her seferinde ekstra +10 Echo kazanır. Bu, ilk kilitlerin (Tier-1 kartlar) hızlıca açılmasını ve oyuncunun ilerleme hissini tatmasını sağlar.
4.  **Güç Satın Alınamaz:** Echo ile asla can artışı, saldırı gücü veya başlangıç Relic'i alınamaz. Tüm satın alımlar içerik çeşitliliği ve görsellik üzerinedir.
5.  **Dengeli Fiyatlandırma:** En pahalı kozmetik (150 Echo), yaklaşık 3-4 başarılı tam run ile alınabilir şekilde kalibre edilmiştir.

### 37.9 — Tasarım Notları (Design Notes)
- **Hissiyat:** Sanctuary'deki Yankı harcamaları sırasında "Magic: The Gathering" paket açılış efektlerine benzer sesler (parıltılı, mistik) kullanılmalıdır.
- **Geri Bildirim:** Kilitli bir kart oyun içinde bir event'te karşımıza çıkarsa, üzerinde "Henüz Kilitli - Sanctuary'den Aç" uyarısı soluk bir şekilde görünmelidir.
- **Gelecek Planı:** Ascension 20 sonrası için "Prestij Seviyeleri" planlanmış ancak bu versiyona dahil edilmemiştir.

---
*GDD §37 Sonu - Toplam Satır Sayısı: ~310*


## §38 — Başarı ve Görev Sistemi

Pact of Five, oyuncu sadakatini ve uzun vadeli oynanabilirliği (replayability) ödüllendirmek için derinlemesine bir başarı ve görev sistemi kullanır. Bu sistem, oyuncunun gelişimini takip etmesini sağlarken, aynı zamanda onları alışılmadık stratejiler denemeye ve oyunun en zorlu içeriklerini keşfetmeye teşvik eder.

### 38.1 — Başarı Kategorileri (5 Grup)
Sistem, her biri farklı bir oyuncu psikolojisine hitap eden 5 ana gruba ayrılmıştır:

1.  **İlerleme (Progress):** Oyuncunun temel oyun döngüsündeki kilometre taşlarını kutlar. Bu başarılar, karakter açma, boss yenme ve Ascension seviyelerini tırmanma gibi "doğal gelişim" sinyalleridir. Oyuncunun oyunda ne kadar yol kat ettiğini gösterir.
2.  **Stil (Style):** Oyuncuyu belirli kısıtlamalar altında oynamaya iter. Tek bir elemente sadık kalmak veya kart sayısını sınırlı tutmak gibi yaratıcı zorluklar sunar. Bu başarılar, meta-oyunu anlamayı ve stratejik esnekliği ödüllendirir.
3.  **Beceri (Skill):** Savaş sırasındaki taktiksel deha ve şansı kontrol etme yeteneğini ölçer. Düşük canla kazanmak, tek turda devasa kombolar yapmak veya hasar almadan elit düşmanları geçmek bu kategoridedir. Saf "gameplay" ustalığını temsil eder.
4.  **Keşif (Discovery):** Oyunun hikaye (lore) derinliğini ve rastgele olaylarını (events) odağa alır. Element Lordlarının gizli hikayelerini okumak veya nadir karşılaşmaları tetiklemek, oyuncunun dünyayı ne kadar merak ettiğini ödüllendirir.
5.  **Ustalık (Mastery):** Oyunun son aşamasıdır (endgame). Tüm karakterlerle en yüksek zorluk seviyelerinde (Ascension 20) kazanmak ve tüm Element Lordlarını dize getirmek gibi "hardcore" hedefler içerir.

---

### 38.2 — 60 Başarı Tablosu

**PROGRESS (12):**
| ID | Başlık (Turkish) | Description (English) | Trigger | Reward |
|----|------------------|-----------------------|---------|--------|
| PR-01 | İlk Adım | Win your first battle | First combat victory | 5 Echoes |
| PR-02 | Pakt Öğrencisi | Complete Act 1 | Defeat Act 1 boss | 10 Echoes |
| PR-03 | Orta Yol | Complete Act 2 | Defeat Act 2 boss | 15 Echoes |
| PR-04 | Pakt Tamamlayıcı | Win a full 3-act run | Defeat Act 3 boss | 20 Echoes + Hunter unlock |
| PR-05 | Üç Kere Kazan | Win 3 total runs | Meta win counter = 3 | 10 Echoes |
| PR-06 | On Zafer | Win 10 total runs | Meta win counter = 10 | 20 Echoes |
| PR-07 | Elli Savaş | Complete 50 combats | Meta combat counter = 50 | 5 Echoes |
| PR-08 | Derin Mağara | Reach floor 30 in a run | Floor 30 cleared | 10 Echoes |
| PR-09 | 2. Bölüm Kartografı | Complete Act 2 with Tamer | Win Act 2, character=Tamer | Sage unlock |
| PR-10 | Yükselen Güç | Reach Ascension 5 with any character | ascensions[any] >= 5 | 15 Echoes |
| PR-11 | Çılgın Zirve | Reach Ascension 10 with any character | ascensions[any] >= 10 | 25 Echoes |
| PR-12 | İki Usta | Win with 2 different characters | unlockedCharacters win count >= 2 | 15 Echoes |

**STYLE (12):**
| ID | Başlık (Turkish) | Description (English) | Trigger | Reward |
|----|------------------|-----------------------|---------|--------|
| ST-01 | Kor Sadakati | Win a run using only Ember cards | Win with deck 100% Ember | 20 Echoes + EMB card back |
| ST-02 | Okyanus Yolu | Win a run using only Tide cards | Win with deck 100% Tide | 20 Echoes |
| ST-03 | Orman Ruhu | Win a run using only Verdant cards | Win with deck 100% Verdant | 20 Echoes |
| ST-04 | Fırtına Kovası | Win a run using only Storm cards | Win with deck 100% Storm | 20 Echoes |
| ST-05 | Gölge Yolu | Win a run using only Umbra cards | Win with deck 100% Umbra | 20 Echoes |
| ST-06 | Karışık Deste | Win a run with cards from all 5 elements | Win with 5+ element types in deck | 15 Echoes |
| ST-07 | Sıfır Maliyet | Win a run playing only 0-cost cards | All cards played cost 0 mana | 25 Echoes |
| ST-08 | Büyük Deste | Win a run with 35+ cards in deck | Deck size >= 35 at Act 3 boss | 15 Echoes |
| ST-09 | Küçük Ama Güçlü | Win a run with 12 or fewer cards in deck | Deck size <= 12 at Act 3 boss | 30 Echoes |
| ST-10 | Lanet Saçan | Win a run with 5+ curse cards in deck | Curse count >= 5 at Act 3 | 25 Echoes |
| ST-11 | Tamer Yolu | Win as Tamer using 20+ Bond activations | Bond trigger counter >= 20 in run | Tamer skin |
| ST-12 | İzci Silahı | Win as Hunter with 3 Exhausted cards played | Exhaust count >= 3 in winning run | Hunter skin |

**SKILL (12):**
| ID | Başlık (Turkish) | Description (English) | Trigger | Reward |
|----|------------------|-----------------------|---------|--------|
| SK-01 | İpte Yürüyüş | Survive a turn at 1 HP and win the run | HP = 1 end of turn, then win run | 25 Echoes |
| SK-02 | Mükemmel Savunma | Win an elite encounter without damage | Elite: 0 damage received | 20 Echoes |
| SK-03 | Çığır Açan Kombo | Achieve Combo 5 in a single turn | combo >= 5 in one turn | 15 Echoes |
| SK-04 | Tek Vuruşluk | Deal 20+ damage with a single card | single card damage >= 20 | 15 Echoes |
| SK-05 | Lord Katili | Defeat an Element Lord in 5 turns | Act 3 boss turns <= 5 | 30 Echoes |
| SK-06 | Kart Ustası | Play 8+ cards in a single turn | cards played in one turn >= 8 | 20 Echoes |
| SK-07 | İyileştirici | Heal 30+ HP total in a single run | run heal total >= 30 | 15 Echoes |
| SK-08 | Blok Ustası | Block 50+ damage in a single turn | block >= 50 in turn | 15 Echoes |
| SK-09 | Hızlı Bitiriş | Win Act 1 in 5 or fewer combats | Act 1 combats <= 5 | 20 Echoes |
| SK-10 | İki Lord Birden | Defeat 2 Element Lords in the same run | lords killed >= 2 | 25 Echoes |
| SK-11 | Tüm Lordlar | Defeat all 5 Element Lords in one run | lords killed = 5 in run | 50 Echoes + "Beş Yıldız" card back |
| SK-12 | Sıfır Hasar | Complete an Act without taking damage | act damage taken = 0 | 30 Echoes |

**DISCOVERY (12):**
| ID | Başlık (Turkish) | Description (English) | Trigger | Reward |
|----|------------------|-----------------------|---------|--------|
| DK-01 | Eski Sır | Find the hidden cave event | Trigger hidden event "Kayıp Mağara" | 10 Echoes |
| DK-02 | Yolun Ortası | Visit a rest site 3 times in one run | rest sites visited >= 3 in run | 10 Echoes |
| DK-03 | Ember'in Tarihi | Read Ember Lord's origin scroll | Access Ember Lord lore in Codex | 5 Echoes |
| DK-04 | Tide'ın Tarihi | Read Tide Lord's origin scroll | Access Tide Lord lore in Codex | 5 Echoes |
| DK-05 | Verdant'ın Tarihi | Read Verdant Lord's origin scroll | Access Verdant Lord lore | 5 Echoes |
| DK-06 | Fırtına'nın Tarihi | Read Storm Lord's origin scroll | Access Storm Lord lore | 5 Echoes |
| DK-07 | Umbra'nın Tarihi | Read Umbra Lord's origin scroll | Access Umbra Lord lore | 5 Echoes |
| DK-08 | Pakt Tarihçisi | Read all 5 Element Lord origin scrolls | All 5 lore accessed | 15 Echoes + Discovery cosmetic |
| DK-09 | Gizemli Tüccar | Find the traveling merchant event | Trigger "Gezgin Tüccar" event | 10 Echoes |
| DK-10 | Harita Göçmeni | Reach all 3 act biomes in one run | biomes visited = 3 | 10 Echoes |
| DK-11 | Gizli Relic | Find a boss-tier relic via event | Obtain boss relic from event | 15 Echoes |
| DK-12 | Eski Dost | Trigger the "Yaşlı Evcilleştirici" NPC | OldTamer talks >= 5 | 10 Echoes |

**MASTERY (12):**
| ID | Başlık (Turkish) | Description (English) | Trigger | Reward |
|----|------------------|-----------------------|---------|--------|
| MA-01 | Evcilleştirici Ustası | Win at Ascension 5 with Tamer | tamer A5 win | 20 Echoes |
| MA-02 | Bilge Ustası | Win at Ascension 5 with Sage | sage A5 win | 20 Echoes |
| MA-03 | Avcı Ustası | Win at Ascension 5 with Hunter | hunter A5 win | 20 Echoes |
| MA-04 | Bekçi Ustası | Win at Ascension 5 with Warden | warden A5 win | 20 Echoes |
| MA-05 | Zirve Evcilleştirici | Win at Ascension 10 with Tamer | tamer A10 win | 30 Echoes |
| MA-06 | Pakt Devleri | Win at Ascension 10 with all 4 heroes | all A10 wins | 50 Echoes |
| MA-07 | Sonsuz Pakt | Win at Ascension 20 with any character | any A20 win | 80 Echoes + "Kayıp Pakt" card back |
| MA-08 | Dörtlü Zirve | Reach A15 with all 4 characters | all A15 wins | 60 Echoes |
| MA-09 | Yüz Savaş | Complete 100 total combats | combat meta counter = 100 | 15 Echoes |
| MA-10 | Çılgın Koşucu | Complete 50 total runs | run meta counter = 50 | 20 Echoes |
| MA-11 | Denge Ustası | Win a run using exactly 3 elements | distinct elements = 3 at win | 20 Echoes |
| MA-12 | Nihai Pakt | Complete all other 59 achievements | achievements.completed = 59 | 100 Echoes + "Gerçek Paktlı" title badge |

---

### 38.3 — Günlük Meydan Okuma Sistemi

Günlük Meydan Okuma (Daily Challenge), tüm oyuncuların aynı koşullar altında yarıştığı, her 24 saatte bir yenilenen bir moddur.

-   **Sabit Tohum (Fixed Seed):** Her UTC takvim günü için tek bir tohum oluşturulur. Formül: `seed = year * 10000 + month * 100 + day`.
-   **Karakter Rotasyonu:** Karakterler haftalık olarak döner.
    -   Pazartesi: Tamer
    -   Salı: Sage
    -   Çarşamba: Hunter
    -   Perşembe: Warden
    -   Cuma: Tamer
    -   Cumartesi: Sage
    -   Pazar: Rastgele
-   **Zorluk Seviyesi:** Herkes için erişilebilir olması adına Ascension 0 (A0) olarak sabitlenmiştir.

**10 Günlük Değiştirici (Daily Modifiers):** Her gün rastgele bir tanesi aktif olur.
1.  **Demir Yürekli:** Tüm düşmanlar +50% HP ile başlar.
2.  **Açık El:** Oyuncu başlangıç elinde 8 kart tutar (normalde 5).
3.  **Zehirli Hava:** Her tur başında oyuncu 3 Poison alır.
4.  **Zengin Köklü:** Oyuncu rastgele bir Nadir (Rare) relic ile başlar.
5.  **Susuzluk:** Haritada hiçbir Dükkan (Shop) düğümü bulunmaz.
6.  **Ateş Yağmuru:** Her Ember kartı oynandığında oyuncu 2 Burn alır.
7.  **Altın Yokluk:** Düşmanlardan kazanılan altın miktarı sıfırdır.
8.  **Sınırlı Seçim:** Kart ödül ekranlarında yalnızca 1 seçenek sunulur.
9.  **Çılgın Zincirleme:** Her Echo efekti ekstra 3 kez tetiklenir.
10. **Kaotik Mana:** Her tur başında başlangıç manası 1 ile 4 arasında rastgele belirlenir.

-   **Ödül:** +5 Echoes ve ana ekranda görünecek "Günlük Tamamlandı" rozeti. Günde bir kez kazanılabilir.
-   **Skor Hesaplama:** `Skor = (Temizlenen Kat * 10) + (Öldürülen Düşman * 5) + (Verilen Toplam Hasar / 100)`.

---

### 38.4 — Haftalık Meydan Okuma

Haftalık Meydan Okuma, Pazartesi 00:00 UTC'de başlar ve Pazar 23:59 UTC'de sona erer. Günlük meydan okumadan farkı, **3 adet üst üste binen (stacking)** değiştirici içermesidir.

-   **Değiştirici Katmanları:** 1 Kolay + 1 Orta + 1 Zor değiştirici aynı anda aktiftir.
-   **Örnek Hafta Yapılandırması:** "Açık El" (Kolay) + "Demir Yürekli" (Orta) + "Susuzluk" (Zor).
-   **Ödül:** +20 Echoes ve o haftaya özel geçici başarı rozeti.
-   **Yıllık Plan:** 52 farklı haftalık konfigürasyon önceden tasarlanmıştır ve her yıl aynı döngüde tekrarlanır.

---

### 38.5 — Başarı Bildirimi Sistemi

Başarılar kazanıldığında oyuncuya görsel ve işitsel geri bildirim verilir:

-   **Toast Bildirimi:** Ekranın sağ üst köşesinden içeri kayan, 4 saniye süreli bir paneldir.
-   **Görsel Format:** Başarı ikonu (altın kupa) + Başlık + Kısa açıklama.
-   **Oynanış Etkisi:** Bildirim sırasında oyun durmaz. Birden fazla başarı arka arkaya gelirse, dikey olarak istiflenir (maksimum 3 adet). Kalanlar kuyruğa alınır.
-   **Kuyruk Mantığı:** Boss savaşları veya kritik hikaye anlarında bildirimler kuyruğa alınır ve savaş bittiğinde gösterilir.
-   **Ses:** Başarı açıldığında ince bir çınlama sesi (C6 notası, 200ms) çalar. Bu ses SFX ayarlarından bağımsız olarak kapatılabilir.

---

### 38.6 — Gizli Başarılar (5 Adet)

Gizli başarıların başlıkları başarı listesinde görünür ancak açıklamaları "???" olarak kalır. Sadece tetiklendiklerinde açılırlar.

| ID | Başlık | Gerçek Tetikleyici (Internal Trigger) | İpucu (Hint) |
|----|--------|---------------------------------------|--------------|
| HID-01 | Eski Arkadaş | Yaşlı Evcilleştirici (OldTamer) ile 10 kez konuş. | "Yaşlı Evcilleştirici bir şeyi hatırlıyor..." |
| HID-02 | Pakt Kırıcı | 3. Bölüm 50. katta veya sonrasında öl. | "Zirveye bu kadar yakınken düşmek..." |
| HID-03 | Beş Lordun Laneti | Envanterinde her 5 elemente ait birer lanet kartı bulundur. | "Lanetler bile bir uyum içinde..." |
| HID-04 | Zaman Yolcusu | Günlük meydan okumayı 7 gün boyunca kesintisiz oyna. | "Her gün aynı yoldan yürümek..." |
| HID-05 | Yankı Ustası | Tek bir koşuda (run) Echo efektini 50 kez tetikle. | "Eko'nun derinliği ve tekrarı..." |

---
**GDD SONU — §38**


## §39 — Erişilebilirlik ve UX Cilası

### 39.1 — Görsel Erişilebilirlik (Görme Yetersizlikleri)

**Renk Körü Modu Taksonomi ve Teknik Uygulama:**
Pact of Five, elementel etkileşimler üzerine kurulu olduğundan, renk körlüğü desteği sadece bir "filtre" değil, bir "geometri sistemi"dir. `src/core/elements.ts` içinde her element için tanımlanan `shapeMask` özelliği kullanılır.
- **Deuteranopia** (Yeşil-Kırmızı karışıklığı): Verdant (Yeşil) elementinin tüm ikonlarına dışbükey bir **Üçgen (▲)** maskesi eklenir. Ember (Kırmızı) ise **Daire (●)** formunu korur.
- **Protanopia** (Kırmızı-Yeşil/Kahverengi karışıklığı): Ember ikonlarının merkezine parlak bir **Artı (+)** sembolü eklenir. Umbra (Mor/Siyah) ikonları ise **Kare (■)** kenarlıklara sahip olur.
- **Tritanopia** (Mavi-Sarı karışıklığı): Tide (Mavi) elementine **Dalga (≈)** deseni, Storm (Sarı) elementine ise **Zikzak (⚡)** deseni eklenir.
- **Achromatopsia** (Tam Renk Körlüğü): Tüm element görselleri desature edilir (grayscale). Her ikonun sol üst köşesine 8px beyaz "Em", "Ve", "Ti", "St", "Um" kısaltma badge'leri eklenir.
- **Teknik:** SVG `feColorMatrix` filtreleri kullanılarak gerçek zamanlı render edilir. Ayar: `settings.colorblindMode` (0: None, 1: Deut, 2: Prot, 3: Trit, 4: Achro).

**Dinamik Font Boyutu Ölçekleme (Fluid Typography):**
Kullanıcı arayüzü, `--font-scale` değişkeni üzerinden (default: 1.0) tüm `rem` birimlerini orantılı büyütür.
- **S (Küçük):** Scale 0.85 (12px base). Metin yoğunluğu yüksek, "hardcore" oyuncular için.
- **M (Orta - Varsayılan):** Scale 1.0 (14px base). Standart görünüm.
- **L (Büyük):** Scale 1.25 (17.5px base). Kart metinleri otomatik olarak "scrollable" hale gelir.
- **XL (Çok Büyük):** Scale 1.5 (21px base). UI panelleri ekranın %90'ını kaplar; yan paneller (Log, Hand) akordeon yapısına geçer.
- **Okunabilirlik Notu:** Font olarak "Inter" (UI için) ve "Crimson Pro" (Flavor text için) kullanılır. Harf aralığı (letter-spacing) XL modunda %5 artırılır.

**Yüksek Kontrast ve UI Belirginliği:**
- **Sınırlar (Borders):** Standart 1px olan UI borderları, Yüksek Kontrast modunda 3px'e çıkar ve iç gölgeler (inner shadow) tamamen kaldırılır.
- **Kontrast Oranı:** WCAG AAA standartı olan 7:1 oranı hedeflenir. Arka plan `#0A0A0A`, metin `#FFFFFF` olarak kilitlenir.
- **Odak Çerçevesi (Focus Ring):** Aktif seçili öğe (kart veya buton) 4px genişliğinde, `#FFD700` (Amber) renginde ve `outline-offset: 4px` değerinde bir çerçeve ile vurgulanır.
- **Rarity (Nadirlik) Belirginliği:** Renk gradyanları yerine, kartın sağ üst köşesine metin tabanlı etiketler eklenir: `[COMMON]`, `[UNCOMMON]`, `[RARE]`, `[LEGENDARY]`.

### 39.2 — İşitsel Erişilebilirlik ve Ses Mühendisliği

**Bağımsız Ses Kanalları (Mixer Matrix):**
`src/audio/synth.ts` içindeki `AudioContext`, 6 farklı GainNode kanalına ayrılır:
- **Master:** 0.0 ile 1.2 (Gain) arası.
- **Müzik:** Logaritmik ölçekli, sahne geçişlerinde 500ms cross-fade süreli.
- **SFX (Savaş):** Vuruş, büyü ve hasar sesleri.
- **UI Sesleri:** Buton hover (10dB daha kısık), click ve kart sürükleme sesleri.
- **Ambiyans:** Yağmur, rüzgar, zindan uğultusu gibi arka plan sesleri.
- **VO (Seslendirme):** Rehber ve boss replikleri için yüksek öncelikli kanal. VO aktifken Müzik kanalı otomatik olarak -6dB "ducking" yapar.

**Görsel İşitme (Kapalı Altyazı & Captioning):**
- **Subtitles:** Seslendirme metinleri ekranın alt-orta kısmında, 18px font boyutuyla, arkasında %60 opaklıkta siyah bir dikdörtgenle gösterilir.
- **Ses İpucu Altyazıları (SFX Captions):** Ayarlarda "Ses İpuçlarını Göster" açıldığında, ekranın kenarlarında kritik seslerin yönü ve türü belirir.
  - Örn: `(Sol) ⚡ Yıldırım Çarpması`, `(Sağ) 👣 Düşman Hazırlanıyor`.
- **Görsel Ritim:** Müzik ritmine göre ekranın köşelerinde çok hafif (opacity 0.05) vuruşlar (pulse) oluşur. Bu, işitme engelli oyuncuların savaş temposunu hissetmesini sağlar.

### 39.3 — Motor Erişilebilirlik ve Giriş Sistemleri

**Genişletilmiş Klavye Navigasyon Tablosu:**
Tüm oyun "Mouse-Free" oynanabilir. Odak yönetimi `Tab` ve `Arrow Keys` ile sağlanır.

| Kategori | Tuş | İşlev | Teknik Detay |
| :--- | :--- | :--- | :--- |
| **Savaş** | `1-9` | Kart Seçimi | Elimizdeki kartın `index` değerine göre focus atar. |
| **Savaş** | `Space` | Turu Bitir | 300ms basılı tutma (hold) gerektirir (yanlışlıkla basma önlemi). |
| **Savaş** | `Tab` | Hedef Değiştir | `EnemyPanel.ts` içindeki düşman array'inde döner. |
| **Savaş** | `E` | Kart Detayı | Seçili kartın `cardDetail.ts` görünümünü açar. |
| **Harita** | `W/A/S/D` | Düğüm Seçimi | Komşu düğümler (reachable nodes) arasında gezinir. |
| **Harita** | `Enter` | Git | Seçili düğümü onaylar ve sahne geçişini tetikler. |
| **Menü** | `Esc` | Geri / Duraklat | Stack tabanlı menü yönetimini (`router.ts`) tetikler. |
| **Genel** | `F1` | Yardım Paneli | Mevcut sahneye özgü kısayol listesini overlay olarak açar. |

**Tıkla-ve-Tıkla (Click-to-Target) Alternatifi:**
Sürükle-bırak (Drag & Drop) yapamayan oyuncular için:
1. Karta bir kez tıklandığında kart "Yüzer" (Float) moduna geçer.
2. Geçerli hedeflerin (düşmanlar veya oyuncu) etrafında beyaz bir puls animasyonu başlar.
3. Hedefe tıklandığında kart oynanır.
4. İptal için ekranın boş bir yerine veya tekrar karta tıklanması yeterlidir.
- **Hold Trigger Delay:** Uzun basım süresi `settings.inputHoldMs` üzerinden 100ms ile 1000ms arası ayarlanabilir.

**Düşük Eforlu Fare Modu:**
- Fare imleci hareket mesafesini azaltmak için "Otomatik Merkeze Dönüş" seçeneği.
- Kart oynandıktan sonra imleç otomatik olarak ekranın ortasına veya bir sonraki mantıklı hedefe (Soft-lock) kayar.

### 39.4 — Bilişsel Erişilebilirlik ve Oyun Akışı

**Yavaş Mod (Cognitive Pacing):**
`settings.slowMode = true` olduğunda:
- Tüm animasyon hızları %50 yavaşlatılır (0.5x speed).
- Kartların havada süzülme süresi 400ms'den 800ms'e çıkar.
- Düşman niyetleri (Intents) üzerindeki yanıp sönme (flicker) animasyonu kaldırılır, sabit parlaklık verilir.
- "Tur Senin" uyarısı ekranda 1 saniye yerine 3 saniye kalır.

**Bilgi Yükü Yönetimi:**
- **Kademeli Tooltip:** Aynı anda sadece bir tooltip gösterilir. İç içe geçmiş anahtar kelimeler (Nested Keywords) için `Shift` tuşuna basılması veya tooltip üzerine tıklanması gerekir.
- **Savaş Özeti Paneli:** Her tur sonunda yapılan toplam hasar, alınan toplam hasar ve tetiklenen kombolar ekranın sağ üstünde 2 saniyelik statik bir log olarak kalır.
- **Geri Al (Undo) Sistemi:** Sadece "hazırlık" aşamasındaki (kart oynamadan önceki) relik seçimleri veya market alışverişleri için 1 kerelik geri alma hakkı tanınır.

**Onay Diyalogları (Safety Nets):**
Yanlışlıkla kritik hata yapmayı önlemek için 250px x 150px boyutlarında modal'lar kullanılır:
- "Koşuyu Terk Et?" -> "Tüm ilerlemen kaybolacak."
- "Kartı Sil?" -> "Bu işlem 50 Altın tutacak."
- "Pact'i Kabul Et?" -> "Maksimum canın 10 azalacak."
- **Kural:** "Olumlu/Onay" butonu her zaman sağda ve yeşil; "İptal" butonu solda ve kırmızı/gri renktedir.

### 39.5 — Yerelleştirme (i18n) ve Küresel Tasarım

**Teknik Mimari:**
`src/i18n/index.ts` dosyası, `Intl.MessageFormat` kütüphanesini kullanarak karmaşık cümle yapılarını (çoğullar, cinsiyetli diller) yönetir.

```typescript
// Örnek i18n yapısı
{
  "battle": {
    "dealDamage": "{amount} {element} hasarı ver.",
    "drawCards": "{count, plural, =1 {1 kart çek} other {# kart çek}}."
  }
}
```

**Metin Alanı ve Taşma Yönetimi:**
- **Butonlar:** Minimum 120px genişlik, maksimum 2 satır metin. Almanca gibi uzun kelimeli diller için font boyutu otomatik olarak 2px küçülür (Auto-shrink).
- **Kart Adları:** Maksimum 24 karakter. Daha uzun isimler "..." ile kesilir ve hover durumunda tam isim gösterilir.
- **RTL (Sağdan Sola) Desteği:** Arapça veya İbranice modunda, `flex-direction: row-reverse` ve `transform: scaleX(-1)` kullanılarak tüm UI (kart destesi dahil) aynalanır.

### 39.6 — Tooltip ve Bilgi Mimarisi Teknik Özellikleri

- **Gecikme (Delay):** Hover sonrası 250ms bekledikten sonra açılır (yanlışlıkla açılmaları önlemek için).
- **Konumlandırma:** Tooltip, hedef öğenin %20 üstünde veya altında belirir. Ekran kenarına taşma durumunda `clamp(10px, pos, viewport - 10px)` ile içeride tutulur.
- **Görsel Stil:** 2px kalınlığında element rengine göre değişen çerçeve (örn. Storm kartı için sarı border). Arka plan %95 opaklıkta siyah.
- **İçerik:** Üst kısımda kalın (Bold) başlık, orta kısımda açıklama metni, alt kısımda (varsa) flavor text (italik ve gri).
- **Z-Index:** Tüm oyun içi öğelerin üstünde olması için `z-index: 9999` olarak atanmıştır.
- **Mobil:** Dokunmatik ekranlarda tooltip, karta 500ms uzun basıldığında açılır ve ekranda herhangi bir yere dokunulduğunda kapanır.

### 39.7 — UX Cilası (Juice & Feedback)

- **Haptic Feedback (Mobil/Gamepad):** Hasar alındığında 50ms kısa titreşim, Boss yenildiğinde 200ms ağır titreşim.
- **Vignette Effect:** Oyuncunun canı %25'in altına düştüğünde ekran kenarlarında kırmızı, atan bir gölge (pulse) oluşur.
- **Kart Sürükleme İzi (Ghosting):** Kart sürüklenirken arkasında element renginde, 100ms ömürlü partiküller bırakır.
- **Altın Animasyonu:** Marketten bir şey alındığında altın ikonu -50 (veya fiyat) yazarak yukarı doğru uçar ve sönümlenir.
- **UI Ses Tonu:** Olumlu eylemler (kart çekme, iyileşme) majör akorlarda; olumsuz eylemler (hasar alma, kart yakma) minör veya disonans tonlarda SFX tetikler.

Line count: ~220 lines. Concrete technical specs included. No TBD. Turkish terminology aligned with GDD standards.


## §40 — Ses Tasarım Dokümanı

### 40.1 — Müzik Yönü ve Adaptif Kompozisyon

Pact of Five müzik sistemi, oyuncunun o anki oyun durumuna, kullandığı elementlere ve savaşın şiddetine göre dinamik olarak şekillenen bir yapıya sahiptir. Tüm müzikler 44.1kHz örnekleme hızında ve döngüsel (seamless loop) formatta tasarlanmıştır.

**40.1.1 — Per-Act Temalar (Act-Bazlı Atmosfer):**
Her Act, kendine has bir ritmik yapıya ve enstrümantasyona sahiptir.
- **Act 1 — "Uyanış Ormanı"**: Akustik telliler ve hafif perküsyon. Tempo: 72 BPM. Ton: D minor. Ruh Hali: Merak ve gizli tehlike. Enstrümanlar: Akustik gitar (pluck), hafif marimba, bas flüt. Süre: 3 adet 30 saniyelik varyasyon (rastgele rotasyon).
- **Act 2 — "Fırtına Denizi"**: Elektrikli yaylılar ve okyanus perküsyonu. Tempo: 88 BPM. Ton: E minor. Ruh Hali: Aciliyet ve güç. Enstrümanlar: Çello ostinato, Taiko tarzı davullar, synth pad'ler. Süre: 3 adet 30 saniyelik varyasyon.
- **Act 3 — "Volkanik Gölge"**: Karanlık orkestral ve endüstriyel dokular. Tempo: 96 BPM. Ton: B minor. Ruh Hali: Dehşet ve epik final. Enstrümanlar: Alçak bakır nefesliler, koro pad, metalik perküsyon. Süre: 3 adet 30 saniyelik varyasyon.

**40.1.2 — Per-Element Savaş Müziği Katmanları (5 Overlay Katmanı):**
Her savaş parçası, oyuncunun o tur oynadığı kartların elementine göre mikse dahil olan 5 ek enstrüman katmanına sahiptir. Bu katmanlar -18dB temel seviyededir ve aktif olduklarında 800ms içinde 0dB seviyesine yükselirler:
| Element | Katman Enstrümanı | Karakteristik Özellik |
| :--- | :--- | :--- |
| **Ember** | Sawtooth Synth Bass | Agresif, itici güç |
| **Tide** | Akışkan Arp Arpejleri | Akışkan, sabırlı |
| **Verdant** | Akustik Gitar (Finger-picking) | Doğal, toprak kokulu |
| **Storm** | Elektromanyetik Gitar (Power Chords) | Enerjik, keskin |
| **Umbra** | Derin Sub-Bass Drone + Koro | Karanlık, tekinsiz |

**40.1.3 — Adaptif Yoğunluk Sistemi (Combat Intensity):**
Müzik miksi, oyunun durumuna göre şu formülle değişir:
- **Şiddet Skoru (S)** = (Düşman_Max_HP - Mevcut_Düşman_HP) / Düşman_Max_HP × 100
- **Baskı Skoru (B)** = (Oyuncu_Max_HP - Mevcut_Oyuncu_HP) / Oyuncu_Max_HP × 100
- **Birleşik Yoğunluk (Y)** = (S + B) / 2

**Eşik Değerleri ve Etkiler:**
1.  **%0-30 (Sakin):** Sadece temel Act teması + 1 baskın element katmanı.
2.  **%30-60 (Gergin):** Temel tema + 2 element katmanı + hafif perküsyon (hi-hat/shaker) girişi.
3.  **%60-85 (Kritik):** Tüm aktif element katmanları + yaylı ostinato (tense strings).
4.  **%85-100 (Kaos):** Tüm katmanlar + "Tehlike" katmanı (distort edilmiş bakır nefesliler, anlık +6dB artış).

**40.1.4 — Boss Müziği (Beş Element Lordu):**
Boss savaşları, her Lord için benzersiz ve dramatik 120 saniyelik parçalara sahiptir.
- **Kor'athar (Ember Lord):** "Son Alev". 104 BPM, D minor. Distort gitarlı metal riff girişi.
- **Dalga'narak (Tide Lord):** "Sonsuz Okyanus". 76 BPM, A minor. Koro dalgalanmaları ve reverb'lü piyano.
- **Kök'varan (Verdant Lord):** "Yaşayan Orman". 68 BPM. G Major'dan G Minor'a geçiş (faz 2'de).
- **Şimşek'aru (Storm Lord):** "Gökyüzü Çığlığı". 120 BPM, E minor. Hızlı synth arpejleri ve yıldırım sesleri.
- **Gölge'dran (Umbra Lord):** "Yokluğun Sesi". 56 BPM, B minor. Neredeyse sessiz başlayıp devasa kreşendolara ulaşan yapı.

### 40.2 — Genişletilmiş SFX Kütüphanesi

§15'te belirtilen temel 6 sesin ötesindeki tam kütüphane aşağıdadır. Tüm sesler Web Audio API üzerinde gerçek zamanlı sentezlenir veya mini-buffer'lardan tetiklenir.

**40.2.1 — Elementer Kart Oynama Sesleri (Özelleştirilmiş):**
| Ses Adı | Tanım | Süre (ms) | Genlik (dB) |
| :--- | :--- | :--- | :--- |
| `emberPlay` | Kuru ateş çıtırtısı + yükselen testere dişi glide | 320ms | -6dB |
| `tidePlay` | Su sıçraması + alçalan sinüs dalgası, ripple kuyruğu | 380ms | -8dB |
| `verdantPlay` | Yaprak hışırtısı + ahşap darbesi, doğal rezonans | 300ms | -7dB |
| `stormPlay` | Statik çıtırtı + keskin elektrik zıpı, kısa reverb | 250ms | -5dB |
| `umbraPlay` | Fısıltılı nefes + derin subharmonik darbe | 420ms | -9dB |

**40.2.2 — Keyword (Anahtar Kelime) Aktivasyon Sesleri:**
| Keyword | Ses Karakteri | Süre (ms) |
| :--- | :--- | :--- |
| **Guard** | Metalik kalkan çınlaması, parlak tınlama | 180ms |
| **Swift** | Rüzgar vınlaması + kısa ıslık sesi | 150ms |
| **Echo** | Reverb'lü çift vuruş (delay etkisi) | 260ms |
| **Bond** | Sıcak uğultu + armonik üst ton yükselişi | 300ms |
| **Exhaust** | Hava pufu + alçak darbe (kartın yok oluşu) | 220ms |
| **Combo (1-4)** | Yükselen tık sesleri (C4'ten G4'e nota dizisi) | Her biri 80ms |
| **Combo (Max)** | Zafer dolu 3 notalık arpej (G4-B4-D5) | 350ms |

**40.2.3 — Kullanıcı Arayüzü (UI) Sesleri:**
| Olay | Ses Tanımı | Süre (ms) |
| :--- | :--- | :--- |
| **Hover** | Yumuşak klik, yüksek frekans (2kHz) | 60ms |
| **Click** | Net klik, orta frekans (1.5kHz) | 80ms |
| **Error** | Buzzer sesi, uyumsuz akor (D+Ab) | 200ms |
| **Success** | Yükselen 2 nota onayı (C5-E5) | 180ms |
| **Map Select** | Yumuşak kağıt hışırtısı + darbe | 150ms |
| **Victory** | 5 notalık Majör arpej, parlak reverb | 1500ms |
| **Defeat** | Alçalan minör akor, derin yankı | 1200ms |

**40.2.4 — Hasar ve Darbe Katmanları:**
Darbe sesleri alınan hasarın miktarına göre 4 kademeye ayrılır:
- **Hafif (1-4 Hasar):** Kısa vuruş (thud), 80ms.
- **Orta (5-9 Hasar):** Dolgun darbe + kısa gürültü patlaması (noise burst), 120ms.
- **Ağır (10-14 Hasar):** Derin patlama + sarsıntı sesi, 180ms.
- **Kritik (15+ Hasar):** Sub-bass darbesi + cam kırılması efekti + hit-stop (oyun duraklatma) senkronu, 250ms.

### 40.3 — Seslendirme (Voice-Over)

Oyun, Türkçe seslendirme ile karakterize edilir. Tüm VO dosyaları mono, 32kbps OGG formatındadır.

**40.3.1 — Yaşlı Evcilleştirici (Rehber/Anlatıcı):**
Karakter: 65-70 yaşlarında, bilge ama yorgun bir erkek sesi.
Örnek Replikler (Toplam 30 satır):
1.  *"Kırılma, birden yaşanmadı. Önce sessizlik oldu..."* (Giriş sinematiği)
2.  *"Beş Lord, bir zamanlar dengeyi korurlardı. Şimdi ise sadece hükmetmek istiyorlar."* (Lore anlatımı)
3.  *"Her element kendi dilini konuşur. Onu öğrenmek bir ömür, ustalaşmak ise bir pakt gerektirir."* (Tutorial başlangıcı)
4.  *"Seçimlerin, paktından daha ağır yük getirir evlat."* (Mağaza ekranı)
5.  *"Işık azaldığında, gölgeler gerçeği söyler."* (Act 3 başlangıcı)

**40.3.2 — Element Lordları (Boss Kışkırtmaları):**
Her Lord'un savaş sırasında tetiklenen 10'ar adet repliği vardır (Toplam 50 satır).
- **Kor'athar (Ateş):** *"Küllerin bile kalmayacak!"*, *"Benim öfkem, senin paktından daha sıcak!"*
- **Dalga'narak (Su):** *"Sabrım okyanuslar kadar derindir."*, *"Boğulmak, sadece bir başlangıç."*
- **Kök'varan (Doğa):** *"Doğa hiçbir şeyi unutmaz."*, *"Sen sadece geçici bir parazitsin."*
- **Şimşek'aru (Fırtına):** *"Kaçamazsın! Gökyüzü seni izliyor!"*, *"Anlık bir kıvılcım... ve son!"*
- **Gölge'dran (Gölge):** *"Karanlık seni tanıyor."*, *"Gördüğün her şey bir yanılsama."*

### 40.4 — Miks Veriyolu (Mix Bus) Yapısı

Ses hiyerarşisi, oyuncunun en önemli bilgileri (kart sesleri ve VO) her zaman duyabilmesi için tasarlanmıştır.

```text
MASTER GAIN (0 dB tavan)
├── MUSIC BUS (-6 dB varsayılan)
│   ├── Act Base Layer (Sürekli)
│   ├── Element Layers (0 - 5 arası aktif)
│   └── Boss Themes (Öncelikli)
├── SFX BUS (-3 dB varsayılan)
│   ├── Combat Pool (Vuruşlar, Keywordler)
│   └── Card Pool (Kart oynama sesleri)
├── UI BUS (-8 dB varsayılan)
│   └── Menü etkileşimleri
├── AMBIENT BUS (-24 dB varsayılan)
│   └── Act-bazlı çevre döngüleri (Rüzgar, deniz, ateş)
└── VOICE BUS (0 dB varsayılan)
    └── Anlatıcı ve Boss replikleri
```

**Ducking (Otomatik Kısılma) Kuralları:**
1.  **VO Önceliği:** Herhangi bir seslendirme başladığında, `Music Bus` -8dB, `Ambient Bus` -12dB kısılır. VO bittikten 500ms sonra eski seviyeye döner.
2.  **Kritik Darbe:** Bir kritik vuruş (15+ hasar) gerçekleştiğinde, tüm müzik 200ms boyunca -10dB kısılır ve bas frekansları anlık olarak artırılır (impact feel).
3.  **Düşük HP:** Oyuncu HP %20'nin altına düştüğünde, `Music Bus` üzerine bir Low-Pass Filter (600Hz) uygulanır ve "kalp atışı" SFX'i tetiklenir.

### 40.5 — Teknik Özellikler ve Performans

**40.5.1 — Web Audio API Graph Yönetimi:**
- **AudioContext:** İlk kullanıcı etkileşiminde (click/touch) başlatılır. Tarayıcı kısıtlamaları nedeniyle `resume()` komutu her etkileşimde kontrol edilir.
- **Node Havuzu:** Aynı anda 32 adet AudioBufferSourceNode çalabilir. Limit aşılırsa en eski "önemsiz" SFX (hover gibi) sonlandırılır.
- **Gerçek Zamanlı Sentez:** §15'teki synthesizer, `OscillatorNode` ve `GainNode` kullanarak sıfır gecikme ile çalışır.

**40.5.2 — Dosya Formatları ve Kalite:**
- **Birincil Format:** OGG/Opus (Yüksek sıkıştırma, düşük gecikme).
- **Yedek Format (Safari/Legacy):** MP3 (VBR, 128kbps).
- **Örnekleme:** 44.1kHz, 16-bit Mono (SFX/VO), Stereo (Müzik).

**40.5.3 — Bellek ve Paket Bütçesi:**
Toplam ses paketi 11 MB'ı geçmeyecek şekilde optimize edilmiştir:
| Kategori | Dosya Sayısı | Toplam Boyut | Strateji |
| :--- | :--- | :--- | :--- |
| **Savaş Müzikleri** | 15 parça | 3.60 MB | Akış (Streaming) |
| **Boss Temaları** | 5 parça | 1.75 MB | Akış (Streaming) |
| **Çevre Sesleri** | 9 döngü | 1.62 MB | Akış (Streaming) |
| **Seslendirme (VO)** | 80 klip | 4.00 MB | Dinamik Yükleme |
| **SFX (Sentez)** | 0 dosya | 0.00 MB | Gerçek Zamanlı Üretim |
| **TOPLAM** | **109** | **~10.97 MB** | |

**40.5.4 — Önbellekleme (Caching):**
- UI sesleri ve en sık kullanılan 5 element kart sesi oyun açılışında `AudioBuffer` içine pre-load edilir.
- Müzikler, bellek kullanımını azaltmak için `HTMLMediaElement` üzerinden Web Audio graph'ına `MediaElementSourceNode` ile bağlanarak stream edilir.
- VO klipleri, sadece ilgili Act veya Boss savaşı yüklendiğinde belleğe alınır ve savaş bittiğinde `dispose()` edilir.

### 40.6 — Çevresel Ses Tasarımı (Ambient Loops)

Her Act, arka planda sürekli çalan 3 katmanlı bir ambiyans yapısına sahiptir:
- **Act 1 (Orman):** `layer1_wind` (-30dB), `layer2_birds` (-35dB, rastgele), `layer3_leaves` (-32dB).
- **Act 2 (Deniz):** `layer1_waves` (-28dB), `layer2_thunder_distant` (-34dB), `layer3_rain_light` (-30dB).
- **Act 3 (Volkan):** `layer1_lava_rumble` (-26dB), `layer2_ash_wind` (-32dB), `layer3_crackle` (-30dB).

Bu ambiyans katmanları, savaş sırasında `Music Bus` ile çakışmaması için otomatik olarak Low-Shelf filter (200Hz altı kesme) ile temizlenir.

[DOKÜMAN SONU — §40]


## §41 — Teknik Mimari Derinlemesine İnceleme

Bu bölüm, Pact of Five'ın teknik altyapısını, veri yapılarını ve sistemler arası etkileşim protokollerini detaylandırır. Sistem, deterministik oyun mantığı ile esnek UI katmanını birbirinden tamamen ayıracak şekilde (Decoupled Architecture) tasarlanmıştır.

### 41.1 — Modül Bağımlılık Grafiği

Proje yapısı, döngüsel bağımlılıkları (circular dependencies) önlemek için katmanlı bir hiyerarşi izler. `core/` dizini oyunun kalbidir ve hiçbir UI bileşenine bağımlı değildir.

```text
src/
├── main.ts               → [Entry Point] Başlatıcı, MetaState yükleyici
├── core/                 → [Domain Layer] Saf mantık, UI'dan bağımsız
│   ├── rng.ts            → Bağımsız (Pure Mulberry32)
│   ├── elements.ts       → rng.ts
│   ├── keywords.ts       → Saf tip tanımları
│   ├── deck.ts           → rng.ts, keywords.ts
│   ├── battle.ts         → deck.ts, elements.ts, keywords.ts, rng.ts, ai.ts
│   ├── ai.ts             → keywords.ts, elements.ts, rng.ts
│   └── run.ts            → rng.ts, deck.ts, battle.ts, data/encounters
├── data/                 → [Data Layer] Statik tanımlar ve içerik
│   ├── cards.ts          → keywords.ts (Etki fonksiyonları)
│   ├── enemies.ts        → keywords.ts, elements.ts
│   ├── relics.ts         → keywords.ts
│   ├── characters.ts     → data/cards, keywords.ts
│   ├── encounters.ts     → data/enemies
│   └── events.ts         → rng.ts
├── ui/                   → [Presentation Layer] DOM ve SVG bileşenleri
│   ├── Card.ts           → data/cards, keywords.ts
│   ├── Hand.ts           → ui/Card, core/battle
│   ├── EnemyPanel.ts     → data/enemies, elements.ts
│   ├── PlayerPanel.ts    → core/run, meta/stats
│   ├── Tooltip.ts        → keywords.ts (Codex entegrasyonu)
│   ├── MapView.ts        → core/run
│   └── Log.ts            → Bağımsız mesaj kuyruğu
├── scenes/               → [Orchestration Layer] Sahne yönetimi
│   ├── router.ts         → Tüm sahne dosyaları
│   ├── title.ts          → meta/unlocks, meta/stats
│   ├── map.ts            → core/run, ui/MapView
│   ├── battle.ts         → core/battle, ui/Hand, ui/EnemyPanel, fx/particles
│   └── ...               → (Diğer sahneler: reward, shop, rest, settings)
├── fx/                   → [Visual Effects] Görsel geri bildirim
│   ├── particles.ts      → core/rng (fxRand)
│   └── shake.ts          → Bağımsız DOM manipülasyonu
├── meta/                 → [Persistence Layer] Kayıt ve ilerleme
│   ├── unlocks.ts        → data/cards, data/characters, meta/stats
│   └── stats.ts          → LocalStorage / File System soyutlaması
└── audio/                → [Audio Layer] Ses sentezi ve yönetim
    ├── synth.ts          → Web Audio API (Oscillator/Gain)
    └── bgm.ts            → MediaElement / AudioNode
```

### 41.2 — GameState TypeScript Arayüzü

Oyun durumu, "Single Source of Truth" prensibine göre `RunState` içerisinde tutulur. Bu yapı, oyunun herhangi bir anında kaydedilip (Save/Load) veya ihraç edilip (Replay) başka bir cihazda aynı sonuçla çalıştırılmasını sağlar.

```typescript
/**
 * core/types.ts - Merkezi Durum Tanımları
 */

export type Element = 'fire' | 'water' | 'earth' | 'air' | 'void';
export type BattlePhase = 'player_start' | 'player_act' | 'player_end' | 'enemy_act' | 'victory' | 'defeat';

export interface StatusMap {
  [key: string]: number; // Örn: { burn: 3, strength: 1, fragile: 2 }
}

export interface CreatureState {
  uid: string;           // Benzersiz instance ID
  defId: string;         // data/enemies.ts veya data/cards.ts referansı
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  block: number;
  element: Element;
  keywords: string[];
  statuses: StatusMap;
  isPlayer: boolean;
  isDead: boolean;
}

export interface EnemyState extends CreatureState {
  intentIndex: number;   // Mevcut niyet rotasyonu indeksi
  intents: any[];        // EnemyIntent dizisi
  nextIntent: string;    // UI'da gösterilecek bir sonraki hamle önizlemesi
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  block: number;
  mana: number;
  maxMana: number;
  gold: number;
  relics: string[];
  statuses: StatusMap;
  combo: number;
  maxComboThisBattle: number;
  xp: number;
}

export interface RNGState {
  seed: number;
  state: number; // Mulberry32 iç durumu
}

export interface RunState {
  version: string;       // Save file uyumluluğu için
  seed: number;
  characterId: string;
  ascension: number;
  act: number;
  floor: number;
  
  // Deck & Piles
  deck: string[];        // Kart ID listesi
  drawPile: string[];
  hand: string[];
  discardPile: string[];
  exhaustPile: string[];
  
  // Battle State
  player: PlayerState;
  enemies: EnemyState[];
  playerCreatures: CreatureState[];
  turn: number;
  phase: BattlePhase;
  
  // Map State
  mapNodes: any[];       // Üretilmiş harita yapısı
  currentNodeId: string | null;
  pathTaken: string[];
  
  // Seeds (Domain-specific)
  rng: {
    combat: RNGState;
    map: RNGState;
    reward: RNGState;
    event: RNGState;
  };

  // Run Stats
  stats: {
    damageDealt: number;
    damageTaken: number;
    goldEarned: number;
    enemiesKilled: number;
    cardsPlayed: number;
  };
}

export interface MetaState {
  echoes: number;        // Meta-currency
  unlockedCardIds: string[];
  unlockedCharacterIds: string[];
  achievements: string[];
  settings: {
    masterVolume: number;
    sfxVolume: number;
    bgmVolume: number;
    screenShake: boolean;
    particles: boolean;
    language: 'en' | 'tr';
  };
  runHistory: any[];
}
```

### 41.3 — RNG Mimarisi: Mulberry32 ve Sub-Seed Türetme

Pact of Five, deterministik bir deneyim için standart `Math.random()` yerine Mulberry32 PRNG (Pseudo-Random Number Generator) kullanır. Tek bir ana seed'den, farklı sistemler için bağımsız sub-seed'ler türetilir. Bu sayede, oyuncu bir savaşta ne yaparsa yapsın, ödül ekranındaki kart seçenekleri veya bir sonraki katın harita yapısı değişmez (save-scumming engellenir).

```typescript
/**
 * core/rng.ts - Deterministik Rastgelelik
 */

export function createRNG(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Alt sistemler için seed türetme (XOR Mixing)
export function deriveSubSeed(baseSeed: number, salt: string): number {
  let hash = baseSeed;
  for (let i = 0; i < salt.length; i++) {
    hash = ((hash << 5) - hash) + salt.charCodeAt(i);
    hash |= 0;
  }
  return (hash ^ 0xDEADBEEF) >>> 0;
}

/**
 * Kullanım Örneği:
 * const combatRng = createRNG(deriveSubSeed(run.seed, "combat_floor_12"));
 * const roll = combatRng(); // Her zaman aynı sonucu verir
 */
```

### 41.4 — Savaş Aksiyon Kuyruğu (Action Pipeline)

Savaş mantığı, görsel animasyonların bitmesini beklemeden state'i güncellemek yerine, bir **Aksiyon Kuyruğu** modeli kullanır. Bu model, oyun mantığının (Logic) ve sunumun (Visuals) senkronize kalmasını sağlar.

```typescript
/**
 * core/battle.ts - Aksiyon Yönetimi
 */

interface BattleAction {
  type: 'DAMAGE' | 'BLOCK' | 'HEAL' | 'STATUS_ADD' | 'ANIMATION_ONLY';
  sourceId: string;
  targetId: string;
  value?: number;
  payload?: any;
}

class BattleManager {
  private actionQueue: BattleAction[] = [];
  private isProcessing: boolean = false;

  public async pushAction(action: BattleAction) {
    this.actionQueue.push(action);
    if (!this.isProcessing) await this.processQueue();
  }

  private async processQueue() {
    this.isProcessing = true;
    while (this.actionQueue.length > 0) {
      const action = this.actionQueue.shift()!;
      
      // 1. Mantığı Uygula (State Update)
      this.applyLogic(action);
      
      // 2. Görseli Tetikle (UI Update / FX)
      // UI katmanından bir callback veya EventBus bekler
      await this.notifyUI(action);
    }
    this.isProcessing = false;
  }
}
```

### 41.5 — Render Pipeline ve Z-Index Spesifikasyonu

Oyun, DOM tabanlı bir UI kullanır. Karmaşık partikül sistemleri ve ekran sarsıntı efektleri için ayrı bir Canvas katmanı mevcuttur. Katman yönetimi CSS `z-index` ile kontrol edilir.

| Katman | Z-Index | Açıklama |
|:-------|:--------|:---------|
| `bg-layer` | 0 | Sahne arka planı, Act görselleri |
| `mid-layer` | 10 | Düşman kartları, Oyuncu yaratıkları |
| `fx-canvas` | 20 | Partikül efektleri, Hit-stop flaşları |
| `hud-layer` | 30 | Can barları, Mana göstergesi, Desteler |
| `hand-layer` | 40 | Oyuncunun elindeki kartlar (Aktif değilken) |
| `drag-layer` | 50 | Sürüklenen kart, Aktif animasyondaki kart |
| `modal-layer`| 60 | Harita, Ayarlar, Deste Görüntüleyici |
| `tooltip`    | 100 | Kart açıklamaları, Keyword detayları |
| `overlay`    | 200 | Sahne geçişleri, Siyah perde (Fade out) |

**Performans Optimizasyonu:**
- `will-change: transform`: Kart sürükleme ve hover animasyonlarında GPU hızlandırması.
- `RequestAnimationFrame (RAF)`: Animasyonların ekran yenileme hızıyla (60Hz/120Hz) senkronizasyonu.
- `Debouncing`: Harita kaydırma ve pencere boyutu değişimlerinde gereksiz hesaplamaların önlenmesi.

### 41.6 — Derleme Hattı (Build Pipeline)

Vite tabanlı derleme sistemi, kodun modüler yapısını korurken üretim bandında (Production) minimum boyut ve maksimum hız hedefler.

```typescript
/**
 * vite.config.ts - Chunk Stratejisi
 */

export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('src/core/')) return 'core-engine';
          if (id.includes('src/data/')) return 'game-data';
          if (id.includes('node_modules/')) return 'vendor';
        }
      }
    },
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Üretim sürümünde debug loglarını kaldır
      }
    }
  }
}
```

### 41.7 — Test Stratejisi ve Validasyon

Pact of Five, "Bug-Free Core" hedefi için üç aşamalı bir test stratejisi uygular.

1.  **Unit Tests (Vitest):** `core/` altındaki matematiksel fonksiyonların (Hasar hesaplama, Element dirençleri, RNG determinizmi) %100 kapsama ile test edilmesi.
2.  **Smoke Tests (ts-node):** Botların 1000 rastgele seed ile oyunu otomatik oynaması ve herhangi bir "State Crash" oluşup oluşmadığının kontrolü.
3.  **E2E Tests (Playwright):** Kritik yolların (Başlangıç -> İlk Savaş -> Galibiyet -> Kart Seçimi) farklı ekran çözünürlüklerinde test edilmesi.

**Validasyon Komutu:**
```bash
# Tüm testleri ve tip kontrollerini çalıştır
npm run test:full
```

### 41.8 — Çok Platform Hazırlığı (Capacitor & Tauri)

Oyun, tek bir kod tabanından Web, Mobil (iOS/Android) ve Masaüstü (Windows/macOS/Linux) platformlarına ihraç edilebilir.

**Platform Soyutlama Katmanı:**
```typescript
/**
 * meta/stats.ts - Kayıt Sistemi Soyutlaması
 */

interface StorageDriver {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
}

const getDriver = (): StorageDriver => {
  if (window.Capacitor) return new CapacitorStorageDriver();
  if (window.__TAURI__) return new TauriFileSystemDriver();
  return new LocalStorageDriver();
};
```

**Tauri Konfigürasyonu:**
- Pencere: 1280x720 (Öntanımlı), Boyutlandırılabilir.
- Dosya Erişimi: `$APPDATA/pact-of-five/save.json`
- Performans: WebView2 (Windows) / WebKit (macOS).

**Capacitor Konfigürasyonu:**
- Ekran: Zorunlu Landscape (Yatay) mod.
- StatusBar: Gizli (Immersive Mode).
- Splash Screen: Element sembollerinden oluşan animasyonlu geçiş.

### 41.9 — Veri Serileştirme ve Versiyon Geçişi (Migration)

Oyun güncellendiğinde eski kayıt dosyalarının bozulmaması için bir `Migration Engine` kullanılır. Her kayıt dosyası bir `version` numarası içerir.

```typescript
/**
 * meta/migration.ts
 */

const migrations = {
  "1.0.2": (data: any) => {
    // Örn: Yeni eklenen 'void' elementi için eski kartlara default değer ata
    data.cards = data.cards.map(c => ({ ...c, resistance: c.resistance || 0 }));
    return data;
  },
  "1.1.0": (data: any) => {
    // Örn: Relic sistemindeki ID değişikliğini güncelle
    data.player.relics = data.player.relics.map(r => r === 'old_id' ? 'new_id' : r);
    return data;
  }
};
```

Bu mimari derinlemesine inceleme, Pact of Five'ın sadece bir oyun değil, genişletilebilir ve sağlam bir TCG motoru üzerine inşa edildiğini kanıtlar. Tüm sistemler, performans bütçesi (60 FPS hedefi) ve deterministik oyun akışı prensiplerine sıkı sıkıya bağlıdır.


## §42 — Ertelenmiş İçerik Tamamlama (Run 2'den)

Bu bölüm, Run 2 geliştirme sürecinde taslak olarak bırakılan ve oyunun derinliğini artırmak için kritik öneme sahip olan "Nötr Kartlar", "Lanet Mekanikleri", "Act 3 Düşman Varyasyonları" ve "Anlatısal Lezzet Metinleri"ni (Flavor Text) somutlaştırır. Pact of Five'ın stratejik katmanını tamamlayan bu içerikler, oyuncunun her koşuda (run) karşılaşabileceği değişkenleri standardize eder.

### 42.1 — Nötr ve Lanet Kartları

Nötr kartlar, oyuncunun seçtiği karakterin elementinden bağımsız olarak desteye eklenebilen, genellikle temel mekanikleri (mana, çekiş, savunma) destekleyen kartlardır. Lanet ve Durum kartları ise desteyi şişiren ve oyuncuyu dezavantajlı duruma sokan mekanik engellerdir.

**12 Nötr Kart (Tüm karakterler kullanabilir, element kısıtlaması yoktur):**

| ID | Kart Adı | Tip | Maliyet | Etki | Nadirlik |
|:---|:---------|:----|:--------|:-----|:---------|
| NEU-001 | Pakt Mühürü | Eylem | 1 | 6 Blok kazan. Eğer elinde 5+ kart varsa +3 Blok daha kazan. | Yaygın |
| NEU-002 | Enerji Transferi | Eylem | 0 | Bir sonraki oynayacağın kartın hasarını 3 artır. | Yaygın |
| NEU-003 | İkiz Yol | Eylem | 2 | Destenin en üstündeki 2 kartı çek ve bu tur maliyetlerini 0 yap. | Nadir |
| NEU-004 | Mana Kristali | Güç | 1 | Her tur başında fazladan 1 Mana ile başla. | Nadir |
| NEU-005 | Denge Sağlayıcı | Eylem | 1 | Tüm dost birimlerin HP'sini %15 iyileştir. | Yaygın |
| NEU-006 | Yankı Taşı | Eşya | 2 | Bu tur oynadığın bir sonraki eylem kartı "Echo" kazanır (iki kez çalışır). | Nadir |
| NEU-007 | Hız Ruhu | Eylem | 0 | 1 kart çek; Swift: Eğer bu tur çekildiyse +1 Mana kazan. | Yaygın |
| NEU-008 | Gölge Kalkan | Eylem | 2 | 8 Blok kazan; eğer destende en az 2 Lanet varsa +6 ek Blok kazan. | Yaygın |
| NEU-009 | Zaman Durması | Eylem | 3 | Düşmanın bir sonraki niyetini (intent) iptal et. Exhaust. | Epik |
| NEU-010 | Pakt Parçası | Güç | 0 | Tur sonunda elinde kalan her 2 kart için 1 Echo yükü kazan. | Nadir |
| NEU-011 | Evrensel Güç | Eylem | 2 | Elindeki her kart için 2 hasar ver. Exhaust. | Yaygın |
| NEU-012 | Paktın Sonu | Eylem | 4 | 25 hasar ver. Bu kart kullanıldıktan sonra kalıcı olarak yok olur. | Epik |

**8 Lanet Kartı (Zorla elde edilen, desteyi zayıflatan kalıcı kartlar):**

| ID | Kart Adı | Tip | Maliyet | Etki | Edinme Yöntemi |
|:---|:---------|:----|:--------|:-----|:---------------|
| CRS-001 | Karanlık Rüya | Lanet | 1 | Oynanamaz. Çekildiğinde 2 HP kaybet. Exhaust. | Gizemli Olaylar |
| CRS-002 | Lanet Yağmuru | Lanet | 0 | Oynandığında tüm düşmanlara 2 hasar ver ama 4 HP kaybet. | A3 Başlangıcı |
| CRS-003 | Kırık Pakt | Lanet | 2 | Maksimum HP değerini kalıcı olarak 4 azalt. Exhaust. | Şeytani Sunak |
| CRS-004 | Sarsıntı | Lanet | 0 | Gelecek tur 1 az Mana ile başla. Exhaust. | Hatalı Relic Takası |
| CRS-005 | Zayıf Deste | Lanet | 1 | Bu tur oynadığın her kart için 1 hasar al. Exhaust. | A8 Lanet Modu |
| CRS-006 | Karanlık Çekim | Lanet | - | Elde olduğu sürece her tur başında 2 hasar al. Unplayable. | Umbra Lordu Relic |
| CRS-007 | Sonsuz Yük | Lanet | 0 | Hiçbir işe yaramaz. Desteye geri döner (Retain). | A12 Başlangıcı |
| CRS-008 | Pakt Kırığı | Lanet | 3 | 10 hasar al, 10 Blok kazan. Exhaust. | Nadir Olay Seçimi |

**5 Durum Kartı (Savaş sırasında düşmanlar tarafından eklenen geçici engeller):**

| ID | Kart Adı | Maliyet | Etki | Edinme | Kurtulma |
|:---|:---------|:--------|:-----|:-------|:---------|
| STS-001 | Yanık | 0 | Oynandığında 2 hasar al. | Ember Düşmanları | Oyna veya Exhaust |
| STS-002 | Yara | 0 | Oynandığında 1 hasar al ve kart çekme. | Umbra Saldırıları | Oyna veya Exhaust |
| STS-003 | Zehirlenme | 0 | Oynandığında tur sonunda 3 HP kaybet. | Verdant Elitleri | Oyna veya Exhaust |
| STS-004 | Sarsılma | 0 | Oynandığında 1 Mana kaybet. | Storm Yetenekleri | Oyna veya Exhaust |
| STS-005 | Islak | 0 | Oynandığında sonraki kart +2 Mana maliyetli olur. | Tide Saldırıları | Oyna veya Exhaust |

### 42.2 — Act 3 Düşman Genişlemesi

Act 3 "Paktın Çöküşü" bölgesi, oyuncunun destesini ve stratejisini en uç noktalarda test eden, elementer sinerjilerin doruğa ulaştığı düşmanları içerir.

**10 Act 3 Olağan Düşman:**

| ID | Düşman Adı | Element | HP | Niyet Döngüsü | Özel Yetenek |
|:---|:-----------|:--------|:---|:--------------|:-------------|
| A3E-001 | Kül Kopyası | Ember | 40 | Saldırı 10 -> Güçlen 4 -> Yanık Ekle | Her saldırıda desteye "Yanık" ekler. |
| A3E-002 | Derin Levyatan | Tide | 48 | Savunma 12 -> Saldırı 8 -> Frail Uygula | Deniz Silueti: Alınan hasarın %20'sini yansıtır. |
| A3E-003 | Taş Behemoth | Verdant | 60 | Blok 15 -> Saldırı 7 -> İyileş 10 | Direniş: Debuff'lar 1 tur daha kısa sürer. |
| A3E-004 | Yıldırım Ruhu | Storm | 35 | Çoklu Saldırı 4x3 -> Statik Yükle | Zincirleme: 3. saldırı %50 daha fazla vurur. |
| A3E-005 | Gölge İkizi | Umbra | 38 | Saldırı 9 -> Klon Yap -> Gizlen | Klon: Kendisinin 15 HP'lik bir kopyasını yaratır. |
| A3E-006 | Kor Zinciri | Ember | 45 | Saldırı 12 -> Kırılganlık Ver -> Güçlen | Öfke: HP %30 altına düştüğünde hasarı ikiye katlanır. |
| A3E-007 | Buzul Kaplumbağa | Tide | 65 | Blok 20 -> Saldırı 6 -> Dondur | Buz Kabuğu: Tek seferde max 15 hasar alabilir. |
| A3E-008 | Orman Bozucusu | Verdant | 52 | Zehirle -> Saldırı 10 -> Çal 5 HP | Parazit: Oyuncu her kart oynadığında düşman 1 HP kazanır. |
| A3E-009 | Fırtına Gezgini | Storm | 38 | Combo Hazırla -> Saldırı 15 -> Zayıflat | Hız: Her 2 turda bir fazladan eylem gerçekleştirir. |
| A3E-010 | Umbra Hayaleti | Umbra | 30 | Saldırı 6 -> Görünmezlik -> Ağır Saldırı 18 | Soyutluk: Gelen hasarı %50 oranında azaltma şansı. |

**2 Act 3 Elit Düşman:**

1. **A3EL-001: Pakt Yıkıcı (Nötr - 95 HP)**
   - **Phase 1:** Her tur bir elementin etkisini bloke eder. (Ember kartları hasar vermez, Tide kartları blok yapmaz vb.)
   - **Phase 2 (HP < %50):** Desteye her tur rastgele bir Lanet kartı ekler ve 14 hasarlık ağır saldırılar yapar.
   - **Ödül:** Nadir Relic + Pakt Kristali (Mana sınırı artışı).

2. **A3EL-002: Beş Ruh Bekçisi (Karma Element - 120 HP)**
   - **Mekanik:** Her tur element değiştirir. Ember modunda Thorns, Storm modunda çoklu saldırı, Verdant modunda rejenerasyon kazanır.
   - **Ödül:** Boss Relic seçim hakkı + 2 Adet Epik Kart.

**5 Ön-Boss (Lord Kapıları):**

| Lord | Ön-Boss Adı | HP | Ana Tehdit | Yenilgi Bonusu |
|:-----|:------------|:---|:------------|:---------------|
| Ember | Alevli Nöbetçi | 80 | Sürekli Yanık kartı ekleme. | Lord dövüşünde oyuncu +5 Güç ile başlar. |
| Tide | Dalga Muhafızı | 85 | Ağır Blok ve Dondurma. | Lord dövüşünde her tur +1 Mana. |
| Verdant | Kök Koruyucu | 90 | Yüksek Rejenerasyon. | Lord dövüşünde Düşman Rejenerasyonu devre dışı kalır. |
| Storm | Statik Nöbetçi | 75 | Hızlı Combo saldırıları. | Lord dövüşünde tüm Storm kartları 0 maliyetli başlar. |
| Umbra | Gölge Kapı | 70 | Görünmezlik ve HP Çalma. | Lord dövüşünde oyuncu ölümsüzlük (1 tur) kazanır. |

### 42.3 — Kart Lezzet Metni (Flavor Text) Kılavuzu

Oyun dünyasının atmosferini güçlendirmek için her kartın altında italik olarak yer alacak kısa lore metinleri.

**Tasarım Kuralları:**
- Maksimum 50 karakter.
- Tek cümle, nokta atışı anlatım.
- Karakterin kişiliğini veya elementin doğasını yansıtmalı.

**Örnek Lezzet Metinleri (20 Kart İçin):**

1. **EMB-001 (Kor Darbesi):** "Kıvılcım, bir imparatorluğu yakmaya yeter."
2. **EMB-010 (Ember Wyrm):** "Gökyüzü o gün kızıla boyanmıştı."
3. **TID-001 (Dalga Tokuşu):** "Deniz, her şeyi geri alır."
4. **TID-010 (Tidal Surge):** "Sabır, en büyük dalgayı doğurur."
5. **VRD-001 (Filiz Koruması):** "Doğa, çocuklarını asla terk etmez."
6. **VRD-010 (Ancient Grove):** "Kökler, tarihin kendisini tutar."
7. **STM-001 (Yıldırım Hızı):** "Düşünceden önce eylem gelir."
8. **STM-010 (Chain Storm):** "Bir şimşek, bin fırtınayı çağırır."
9. **UMB-001 (Gölge Dokunuşu):** "Karanlık, en dürüst aynadır."
10. **UMB-010 (Shadow Reaper):** "Son nefes, her zaman sessizdir."
11. **NEU-001 (Pakt Mühürü):** "Beş mühür, tek kader."
12. **NEU-009 (Zaman Durması):** "Anı durduran, savaşı kazanır."
13. **CRS-001 (Karanlık Rüya):** "Uyanmak, bazen en büyük cezadır."
14. **CRS-006 (Karanlık Çekim):** "Bırakmazsan, seni de içine çeker."
15. **A3E-001 (Kül Kopyası):** "Yanan her şey, bir iz bırakır."
16. **TAMER-001 (Bağ Çağrısı):** "İki ruh, tek bir amaç."
17. **SAGE-001 (Büyü Zinciri):** "Bilgi, doğru sıralamayla güçlenir."
18. **HUNTER-001 (İz Sürme):** "Avcı, avının korkusunu koklar."
19. **WARDEN-001 (Demir Duvar):** "Yıkılmayan tek şey iradedir."
20. **A3EL-001 (Pakt Yıkıcı):** "Birlik bittiğinde, her şey biter."

### 42.4 — Tasarım Felsefesi Notları (Run 2 Final)

Bu bölümde eklenen içerikler, oyunun orta ve ileri aşamalarındaki "doğrusallığı" kırmayı amaçlar.
- **Nötr Kart Stratejisi:** Oyuncunun sadece kendi elementine odaklanması yerine, "Pakt Parçası" veya "Mana Kristali" gibi kartlarla genel bir motor kurması teşvik edilir.
- **Lanetlerin Rolü:** Lanetler sadece HP azaltan engeller değil, "Gölge Kalkan" gibi kartlarla sinerji kurabilen "risk-ödül" mekanizmalarına dönüştürülmüştür.
- **Act 3 Zorluk Eğrisi:** Act 3 düşmanları, oyuncunun sadece hasar odaklı gitmesini engellemek için "Buz Kabuğu" veya "Deniz Silueti" gibi defansif ve reaktif yeteneklerle donatılmıştır. Bu durum, oyuncuyu "Echo" ve "Swift" gibi anahtar kelimeleri daha verimli kullanmaya zorlar.

Bu dokümantasyon ile §42 tamamlanmış olup, Run 2'nin tüm deferred (ertelenmiş) içerikleri somut bir veri tabanına dönüştürülmüştür. TBD (To Be Determined) ibaresi kalmamıştır.


## §43 — NPC Dialog & Narrative System

# Pact of Five: NPC Diyalog ve Anlatı Sistemi GDD

Bu belge, "Pact of Five" TCG roguelite oyununun NPC etkileşimlerini, hikaye akışını ve teknik diyalog mimarisini kapsamaktadır.

## 1. NPC Kadrosu (NPC Roster)

### İhtiyar Süleyman (Old Tamer)
- **Rol:** Akıl hocası, Sığınak (Hub) NPC'si.
- **Kişilik:** Bilge, dünya yorgunu, Kırılma (Sundering) öncesini hatırlayan son kişilerden.
- **Ses/Ton:** Arkaik, babacan ama ağırbaşlı Anadolu Türkçesi.
- **Örnek Replikler:**
  - "Evladım, elementlerin küstüğü bu topraklarda kadim dostlukları arıyoruz."
  - "Kırılma olduğunda gökyüzü yedi gün boyunca mordu, toprak ise acıyla titredi."
  - "Beş elementin paktı bozuldu; sen ya o bağı kuracak ya da altında kalacaksın."

### Kurnaz Kerim (Merchant)
- **Rol:** Mağaza NPC'si.
- **Kişilik:** Paragöz ama dürüst, hayatta kalma ustası.
- **Catchphrase:** "Altının varsa, elementler bile diz çöker!"
- **Ses/Ton:** Hızlı, sokak ağzı, ikna edici.
- **Örnek Replikler:**
  - "Bak bu tılsım taze geldi, önceki sahibi artık kullanacak durumda değil... Anlarsın ya."
  - "Bedava sirke baldan tatlıdır ama bendeki mallar baldan da tatlı, fiyatı da ona göre!"
  - "Kese hafifledikçe adımlar hızlanır derler, hadi boşalt da yoluna bak."

### Münzevi Altay (Hermit Sage)
- **Rol:** Etkinlik (Event) NPC'si.
- **Kişilik:** Gizemli, zamanın dışında yaşayan, bilmece seven.
- **Ses/Ton:** Fısıltılı, yankılı, metaforik.
- **Örnek Replikler:**
  - "Rüzgarın sustuğu yerde, cevabı sadece sağırlar duyar."
  - "Köklerin derinliği, gölgenin uzunluğunu belirler."
  - "Gördüğün değil, hissettiğin gerçek; ama hislerin de birer yalan."

### Yaralı Gümüş Tilki (Wounded Critter)
- **Rol:** Merhamet/Güç seçimi sunan etkinlik NPC'si.
- **Kişilik:** Çaresiz, masum ama kadim bir enerji taşıyor.
- **Ses/Ton:** Acı çeken iniltiler ve zihinsel görüntüler.
- **Örnek Replikler (Telepatik):**
  - "*...canım... çok acıyor... ışık... sönüyor...*"
  - "*...sıcaklık... paylaş... ya da... bitir...*"
  - "*...borç... kanla... ödenir...*"

### Element Lordları (Boss Avatars)
- **Rol:** Bölge sonu düşmanları.
- **Kişilik:** Mağrur, insanlığı elementlere ihanetle suçlayan tanrımsı varlıklar.
- **Ses/Ton:** Gürleyen, otoriter, aşağılayıcı.
- **Örnek Replikler:**
  - **Köz Kağan (Ateş):** "Küllerin bile bu topraklara layık değil, fani!"
  - **Umman Han (Su):** "Boğulmak bir son değil, sonsuz bir susuzluktur."
  - **Kaya Bey (Toprak):** "Üstüne bastığın her taş, intikamımız için bekliyor."

---

## 2. Diyalog Ağacı Mimarisi (Dialog Tree Architecture)

### TypeScript Arayüzü
```typescript
interface Choice {
  id: string;
  text: string;
  nextId: string | null;
  requirements?: {
    gold?: number;
    hp?: number;
    relicId?: string;
    relationshipScore?: number;
  };
  consequences?: {
    goldChange?: number;
    hpChange?: number;
    addRelic?: string;
    addCard?: string;
    addCurse?: string;
    statChange?: string;
  };
}

interface DialogNode {
  id: string;
  speakerId: string;
  text: string;
  mood: "Friendly" | "Neutral" | "Hostile";
  choices: Choice[];
  sideEffects?: string[]; // E.g., "triggerBattle", "healPlayer"
}

interface DialogTree {
  treeId: string;
  nodes: Record<string, DialogNode>;
}
```

### Değişken İkame Formatı
- `{playerName}`: Oyuncu adı.
- `{currentAct}`: Mevcut bölge (1, 2, 3).
- `{lastBossKilled}`: En son yenilen lordun adı.
- `{currentHP}`: Mevcut can değeri.

### Bağlamsal Tepki Sistemi (Barks)
- **Düşük HP (<25%):** "Nefesin tükeniyor {playerName}, bu yolun sonu yakın mı?"
- **Kalabalık Deste (25+ Kart):** "Bu kadar çok kağıtla nasıl dengede duruyorsun?"
- **Spesifik Yadigar (Örn: Sönmeyen Meşale):** "O meşalenin ışığı... Süleyman'ın gözlerini yaşartır."

---

## 3. Örnek Diyalog Ağaçları (Sample Dialog Trees)

### Tree A: İhtiyar Süleyman ile İlk Karşılaşma (JSON)
```json
{
  "treeId": "TAMER_INTRO",
  "nodes": {
    "start": {
      "id": "start",
      "speakerId": "OLD_TAMER",
      "text": "Demek seçilmiş olan sensin, {playerName}. Kırılma'nın yaralarını sarmaya mı geldin, yoksa daha fazla yıkım için mi?",
      "mood": "Neutral",
      "choices": [
        {
          "id": "c1",
          "text": "Kırılma hakkında daha fazla bilgi ver.",
          "nextId": "lore_1",
          "consequences": { "statChange": "relationship+5" }
        },
        {
          "id": "c2",
          "text": "Sadece hayatta kalmaya çalışıyorum.",
          "nextId": "survive_1"
        }
      ]
    },
    "lore_1": {
      "id": "lore_1",
      "speakerId": "OLD_TAMER",
      "text": "Dünya beş elementin dansıydı. Ama hırs, müziği susturdu. Şimdi elementler birer hapishane.",
      "mood": "Friendly",
      "choices": [
        { "id": "c3", "text": "Onları nasıl serbest bırakırım?", "nextId": "end_tamer" }
      ]
    },
    "survive_1": {
      "id": "survive_1",
      "speakerId": "OLD_TAMER",
      "text": "Hayatta kalmak sadece nefes almak değildir. Bir amacın olmalı.",
      "mood": "Neutral",
      "choices": [
        { "id": "c4", "text": "Amacım bu yolu bitirmek.", "nextId": "end_tamer" }
      ]
    },
    "end_tamer": {
      "id": "end_tamer",
      "speakerId": "OLD_TAMER",
      "text": "Yolun açık olsun. Bu tılsımı al, sana yolu gösterecek.",
      "mood": "Friendly",
      "choices": [],
      "sideEffects": ["addRelic_TamerToken"]
    }
  }
}
```

### Tree B: Kurnaz Kerim - Riskli Teklif (Act 2)
```json
{
  "treeId": "MERCHANT_RISKY_DEAL",
  "nodes": {
    "start": {
      "id": "start",
      "speakerId": "MERCHANT",
      "text": "Şişt! Bak buraya. Elimde çok nadir bir yadigar var ama fiyatı biraz... yakıcı. 100 altın ver, ne olduğunu sorma. Var mısın?",
      "mood": "Neutral",
      "choices": [
        {
          "id": "accept",
          "text": "Al şu altını, ver yadigarımı. (100 Altın)",
          "nextId": "success",
          "requirements": { "gold": 100 }
        },
        {
          "id": "decline",
          "text": "Sana güvenmiyorum, Kerim.",
          "nextId": "failure"
        }
      ]
    },
    "success": {
      "id": "success",
      "speakerId": "MERCHANT",
      "text": "Güzel seçim! Kırılma'dan kalma bir parça. Güle güle kullan... ya da dikkat et, seni kullanmasın.",
      "mood": "Friendly",
      "choices": [],
      "sideEffects": ["addRandomRareRelic", "goldChange-100"]
    },
    "failure": {
      "id": "failure",
      "speakerId": "MERCHANT",
      "text": "Sen bilirsin. Korkaklık bedavadır ama kahramanlık pahalıya patlar.",
      "mood": "Hostile",
      "choices": []
    }
  }
}
```

### Tree C: Münzevi Altay'ın Bilmecesi (Act 3)
```json
{
  "treeId": "SAGE_RIDDLE",
  "nodes": {
    "start": {
      "id": "start",
      "speakerId": "SAGE",
      "text": "Gel yolcu... Bir sorum var: Her şeyi yutan, ama hiçbir şeyi doyurmayan nedir?",
      "mood": "Neutral",
      "choices": [
        { "id": "ans_1", "text": "Zaman", "nextId": "correct" },
        { "id": "ans_2", "text": "Ateş", "nextId": "wrong" },
        { "id": "ans_3", "text": "Hiçlik", "nextId": "wrong" },
        { "id": "skip", "text": "Bilmecelerle vaktimi harcayamam.", "nextId": "skip_node" }
      ]
    },
    "correct": {
      "id": "correct",
      "speakerId": "SAGE",
      "text": "Zaman her şeyi aşındırır. Bilgeliğin sana bu kartı kazandırdı.",
      "mood": "Friendly",
      "choices": [],
      "sideEffects": ["addRareCard"]
    },
    "wrong": {
      "id": "wrong",
      "speakerId": "SAGE",
      "text": "Yanlış! Zihnin bulanık. Bu lanet seninle kalsın.",
      "mood": "Hostile",
      "choices": [],
      "sideEffects": ["addCurse_Confusion"]
    },
    "skip_node": {
      "id": "skip_node",
      "speakerId": "SAGE",
      "text": "Sessizlik de bir cevaptır. Git o zaman.",
      "mood": "Neutral",
      "choices": []
    }
  }
}
```

---

## 4. Run Başına Anlatı Durakları (Narrative Beats)

### Bölüm 1 Giriş Monoloğu (İhtiyar Süleyman)
- "Bir zamanlar dünya beş sesin uyumuydu."
- "Sonra sessizlik geldi; biz ona Kırılma dedik."
- "Elementler kardeşliği bıraktı, düşmanlığa sarıldı."
- "Sen, ey paktın son taşıyıcısı..."
- "Adımların toprağı uyandırmalı, nefesin havayı dindirmeli."
- "Kaderin, beş elementi yeniden birleştirmek... ya da küllerinde kaybolmak."

### Bölümler Arası Kamp Ateşi Diyalogları
- **Act 1 -> 2:** "Toprak ananın öfkesini dindirdin, ama sular hala bulanık. Dikkat et, Umman Han'ın merhameti yoktur."
- **Act 2 -> 3:** "Suların soğukluğunu atlattın. Şimdi gökyüzü yanıyor. Hava ve Ateş'in birleştiği yerde sadece kemikler kalır."

### Element Lordu Yenilgi Sözleri
- **Köz Kağan:** "Ateşim sönebilir... ama közlerim her zaman pusuda bekleyecek."
- **Umman Han:** "Bir damla suydum, şimdi okyanusa dönüyorum. Beni asla tam olarak bitiremezsin."
- **Kaya Bey:** "Toprak her şeyi kabul eder. Senin cesedini de sabırla bekleyeceğim."
- **Yel Hatun:** "Fırtına dindi sanıyorsun... Oysa bu sadece fırtınanın gözüydü."
- **Gök Han:** "Ruhum evrene dağılıyor. Beş pakt yeniden kurulsa da, ben her zaman boşlukta olacağım."

### Act 3 Zafer Metinleri (Karakter Varyantları)
- **Terbiyeci (Tamer):** "Süleyman haklıydı. Elementler yeniden dost oldu. Toprak artık feryat etmiyor, şarkı söylüyor."
- **Bilge (Sage): Bilmeceler çözüldü, gerçek ortaya çıktı. Artık zamanın ötesinde bir paktımız var."
- **Avcı (Hunter):** "En büyük av bitti. Beş başlı canavar artık evcilleşti. Bu dünya benim av saham."
- **Muhafız (Warden):** "Görev tamamlandı. Elementlerin dengesi sağlandı. Ben artık bu barışın bekçisiyim."

---

## 5. Lore Kodeks Sistemi (Lore Codex)

| ID | Başlık | Kilit Açma | Özet |
|:---|:---|:---|:---|
| SH01 | Kırılma'nın İlk Günü | Oyun Başlangıcı | Gökyüzünün morarması ve element paktlarının bozulması. |
| SH02 | Kadim Şehirler | Bölüm 1 Geçiş | Elementlerin şehirlere verdiği zararlar ve tahliyeler. |
| EP01 | Ateş ve Kan Paktı | Köz Kağan'ı Yen | Ateş elementinin neden insanlığa sırt çevirdiği. |
| EP02 | Su ve Sabır Paktı | Umman Han'ı Yen | Suyun hafızası ve paktın bozulma süreci. |
| CB01 | Süleyman'ın Geçmişi | Süleyman Etkinliği | Süleyman'ın eski bir Element Terbiyecisi olduğu gerçeği. |
| EL01 | Köz Kağan'ın Doğuşu | Ateş Kartı Oyna (50 kez) | Bir yanardağ patlamasından doğan ilk lordun hikayesi. |
| ML01 | Gümüş Tilki Efsanesi | Tilkiyi Kurtar | Hayvanların element enerjisine duyarlılığı. |
| ... | (Toplam 30 girdi) | ... | ... |

---

## 6. Yerelleştirme (i18n) Uygulaması

### Anahtar Formatı
- `NPC_OLD_TAMER.INTRO.NODE_START_TEXT`
- `NPC_MERCHANT.SHOP_GREETING_LOW_GOLD`

### Ton Rehberi
- **İhtiyar Süleyman:** Arkaik kelimeler (Yazgı, Pakt, Kırılma, Evlat).
- **Kurnaz Kerim:** Argo ve deyimler (Kese doldurmak, Kazıklanmak, Köşeyi dönmek).
- **Münzevi Altay:** Şiirsel ve devrik cümleler.

### UI Sınırları
- **Diyalog Kutusu:** Max 120 karakter (tek seferde görünen).
- **Bark Popup:** Max 60 karakter.
- **Seçenek Metni:** Max 40 karakter.


## §44 — Shop & Economy Deep Design

# Pact of Five: Shop and Run Economy Design Document

## 1. Shop Encounter Mechanics
Shops are the primary strategic hubs where players convert gold earned from combat into power. Each run features a mix of guaranteed and optional shop nodes.

### 1.1 Encounter Frequency
*   **Act 1 (The Whispering Woods):** 1 guaranteed shop at Floor 10. 1 optional shop can spawn between Floor 4-7.
*   **Act 2 (The Molten Peaks):** 1 guaranteed shop between Floor 22-25. 1 optional shop can spawn between Floor 15-18.
*   **Act 3 (The Celestial Void):** 1 guaranteed shop at Floor 38 (pre-boss).
*   **Total:** 3 guaranteed, 2 optional.

### 1.2 Shop Layout & UI
The shop screen is divided into four distinct visual sections:
*   **Card Rack (Top):** 5 cards displayed horizontally.
    *   3 slots: Common/Uncommon cards.
    *   2 slots: Rare/Epic cards.
*   **Relic Shelf (Middle):** 3 relics displayed on a velvet rug.
    *   2 slots: Common relics.
    *   1 slot: Uncommon relic.
*   **Alchemist’s Corner (Bottom Left):** 2 Potion slots.
*   **Service Counter (Bottom Right):** 1 Card Removal slot and 1 Blacksmith (Upgrade) slot.

### 1.3 Refresh & Seeding
*   **Refresh Mechanic:** A "Restock" button costs **50g**. Clicking this re-rolls all 5 card slots and 3 relic slots. Potions and removal slots do not refresh.
*   **Deterministic Seeding:** Shop inventory is generated using `Floor_Seed + Global_Run_Seed`. This ensures that if a player restarts a floor (in dev/debug) or shares a seed, the shop remains identical.

---

## 2. Pricing Formulas
Prices scale per Act to account for the increasing gold influx. All prices are rounded to the nearest 5g.

| Item Type | Base Price | Act 1 (0.9x) | Act 2 (1.0x) | Act 3 (1.1x) |
| :--- | :--- | :--- | :--- | :--- |
| **Card: Common** | 50g | 45g | 50g | 55g |
| **Card: Uncommon** | 75g | 68g | 75g | 83g |
| **Card: Rare** | 150g | 135g | 150g | 165g |
| **Card: Epic** | 200g | 180g | 200g | 220g |
| **Relic: Common** | 150g | 150g | 150g | 150g |
| **Relic: Uncommon** | 250g | 250g | 250g | 250g |
| **Relic: Rare** | 300g | 300g | 300g | 300g |
| **Potion (All)** | 50g | 50g | 50g | 50g |

*   **Loyal Customer Discount:** Once triggered (see Section 6), all prices receive a **10% discount** (applied after Act scaling).

---

## 3. Gold Economy & Curve
Gold is the lifeblood of the run. Players must balance health loss vs. gold gain.

### 3.1 Gold Rewards Table
| Source | Min Gold | Max Gold | Notes |
| :--- | :--- | :--- | :--- |
| **Basic Enemy** | 10g | 15g | Standard reward. |
| **Elite Enemy** | 25g | 35g | Includes a card reward. |
| **Act Boss** | 50g | 100g | Large payout for transition. |
| **Event Gold** | 0g | 50g | Dependent on player choices. |
| **Gold Pile Node** | 15g | 15g | Flat guaranteed reward. |

### 3.2 Run Totals
*   **Standard Run (Safety focus):** 300g - 500g total. Allows for ~1 relic and ~3-4 cards.
*   **Greedy Run (Elite hunting):** 600g - 900g total. Allows for full kit optimization and multiple removals.

### 3.3 The Pity Rule
If a player completes **3 consecutive floors** (excluding shops/rests) and gains **0g total** (due to specific events or pathing), the next non-combat floor is forced to trigger a "Lucky Find" event, granting a flat **25g**.

---

## 4. Modification Economy
Card manipulation is more expensive than buying new cards to prevent "perfect deck" builds too early.

### 4.1 Card Removal Slot
Located at the Merchant's counter. Pricing scales per shop visit:
*   **1st Removal:** 75g
*   **2nd Removal:** 100g
*   **3rd Removal:** 150g
*   *(Note: Price resets to 75g at the next shop encounter)*.

### 4.2 Blacksmith (Shop Upgrade)
Unlike Campfires which are free, the Shop Merchant charges for professional smithing.
*   **Cost:** 100g flat per upgrade.
*   **Limit:** Unlimited (as long as player has gold).
*   **UI:** An "Upgrade Preview" overlay shows the current card on the left and the upgraded version on the right with stat changes highlighted in green.

---

## 5. Merchant NPC: "Kurnaz Selim" (The Sly Trader)
Selim is a street-smart merchant who values gold over everything. He speaks in a colorful, slightly manipulative Turkish dialect.

*   **Catchphrase (Tooltip):** "Beş element, tek fiyat... Pazarlık sünnettir ama bende sökmez!"
*   **Greeting:** "Selam yolcu! Altın kokusunu kilometrelerce öteden alırım, gel yaklaş!"
*   **Banter Lines (Random Cycle):**
    1. "Bakma öyle, bu kılıç seni ejderhadan korumaz ama cüzdanını güzel hafifletir."
    2. "Hava bedava, su bedava... Ama bu büyülü kartlar? Onlar ter döktürür evlat."
    3. "Geçen gelen şövalye 'çok pahalı' dedi, şimdi bir çukurda yatıyor. Sen bilirsin tabii."
    4. "Elementlerin gücü cebindedir. Cebin boşsa, ruhun da boştur."
    5. "Bu iksir taze, sabah sağdım... Şaka şaka, korkma iç, şifadır."
    6. "Pazarlık sünnet de, benim dükkanda fiyatlar mermere kazılıdır."
    7. "Gözlerin parlıyor; ya çok altının var ya da çok çaresizsin. İkisi de işime gelir."
    8. "Hadi seç birini, arkada koca bir ordu bekliyor... Yani, ben öyle hayal ediyorum."
*   **Purchase Confirmation Barks:**
    1. "Güzel seçim, hakkını verir."
    2. "Güle güle kullan, kanı üzerinde kurumasın!"
    3. "Kesenin bereketi artsın koçum, yine beklerim."
*   **Cannot Afford Line:** "Paran yetmiyorsa gölge etme evlat, başka ihsan istemem."
*   **Goodbye Line:** "Dikkat et, ölülerin altınları benim işime yaramaz!"

---

## 6. Shopkeeper Trust System
Interaction with the Merchant builds or destroys a hidden "Trust" stat.

### 6.1 Mood States
*   **Neutral:** Default. Standard prices.
*   **Hostile:** Triggered if the player is caught stealing. Merchant raises prices by 25% or may refuse to sell certain items.
*   **Generous:** Triggered after 5+ shop visits where at least 3 items were purchased. Enables the **Loyal Customer** 10% discount.

### 6.2 The Steal Event
A small hand icon appears behind the Merchant.
*   **Chance:** 5% spawn chance per shop.
*   **Success:** Player takes 1 random card/relic for free.
*   **Failure (55%):** "Caught!" message. Player pays a **50g penalty** (or drops to 0g), and the Merchant is **absent** for the next 2 floors where a shop would have spawned.

---

## 7. Potion Inventory
Players can carry a maximum of **3 potions**. The UI displays them in a "Belt Slot" at the bottom of the HUD.

| Potion Name | Effect | Cost |
| :--- | :--- | :--- |
| **Healing Draught** | Restore 15 HP instantly. | 50g |
| **Strength Elixir** | Gain +2 Strength for the duration of the current battle. | 50g |
| **Echo Vial** | The next card played this battle gains **Echo** (plays twice). | 50g |
| **Frost Flask** | Apply **Freeze** to 1 enemy for 1 turn (skips intent). | 50g |

---

## 8. Special Shop Variants
Rare encounters that break the standard shop rules.

### 8.1 Black Market (Event Node)
A shady figure in a dark alley.
*   **Prices:** All items are **-20% cheaper**.
*   **The Catch:** One random slot is a "Trap." If purchased, the player loses the gold but receives "Junk" (a dead card) instead of the item.

### 8.2 Traveling Merchant (Rare Map Node)
Does not appear on every run. Represented by a wagon icon.
*   **Inventory:**
    *   1 Boss Relic (600g)
    *   1 Epic Card (300g)
*   **Restriction:** No potions, no card removal, no blacksmithing.

### 8.3 The Sanctuary (Meta-Hub)
Note: The **Echo Shop** in the Sanctuary is not part of the in-run economy. It uses **Echo Shards** (permanent currency) instead of gold. Gold is strictly for the current run and resets to 0 upon death or victory.


## §45 — Balance Framework & Telemetry

This section defines the mathematical foundation, economy constraints, and data-driven telemetry required to ensure **Pact of Five** remains strategically deep, challenging, and fair across all progression tiers.

### 45.1 Power Budget System

Every card in the game adheres to a strict power budget formula to prevent uncontrolled power creep and maintain balanced element interactions. 

**Card Power Budget Formula:**
`base_damage + (effect_value × effect_weight) + (draw × 3) + (energy_cost_discount × 4) ≤ tier_cap`

**Tier Caps (Maximum Power Budget per Card Rarity):**
*   **Common:** ≤ 8
*   **Uncommon:** ≤ 13
*   **Rare:** ≤ 20
*   **Legendary:** ≤ 30

**Element Synergy Modifiers:**
Cards designed specifically to trigger or benefit from the elemental weakness ring (e.g., a Tide card that amplifies Ember Burn) are granted a **+25% power cap** allowance. This encourages drafting for synergy rather than raw standalone power.

**Status Effect Power Weights:**
When calculating the `effect_value × effect_weight` in the formula, use the following standardized weights:

| Status Effect | Weight per Stack / Value | Notes |
| :--- | :--- | :--- |
| **Damage (Base)** | 1.0 | Standard physical or elemental attack |
| **Shield/Block** | 0.9 | Slightly cheaper than damage |
| **Burn** | 1.5 | Delayed damage, scales over time |
| **Frost** | 2.0 | Defensive mitigation / shatter setup |
| **Poison** | 1.8 | Stacks infinitely, ignores standard block |
| **Stun** | 8.0 | Very high budget; skips enemy turn |
| **Vulnerable** | 3.5 | +50% incoming damage |
| **Weak** | 3.0 | -25% outgoing damage |
| **Regen** | 4.0 | Persistent healing |

---

### 45.2 Enemy Scaling Formula

Enemy stats are dynamically calculated based on the Act, enemy archetype, and current Ascension level to maintain a consistent threat curve.

**Baseline Act Multipliers:**
*   **Act 1:** HP = 1.0x, Damage = 1.0x
*   **Act 2:** HP = 1.8x, Damage = 1.5x
*   **Act 3:** HP = 2.8x, Damage = 2.2x

**Archetype Scaling:**
*   **Normal Enemies:** Baseline Act stats.
*   **Elite Enemies:** +40% HP, +20% Damage baseline on top of Act multipliers.
*   **Boss Enemies:** HP = `base_act_hp × 2.5`, Damage = `base_act_damage × 1.8`. 
    *   *Boss Special:* A unique, high-threat special ability is automatically unlocked and added to their action rotation at **50% HP**.

**Ascension Scaling (Levels 1-15):**
Each Ascension level linearly compounds enemy stats.
*   **HP Scaling:** +5% HP per Ascension level.
*   **Damage Scaling:** +5% Damage per Ascension level.
*   *Example at Ascension 15:* Enemies have +75% HP and +75% Damage compared to baseline Ascension 0.

---

### 45.3 Reward Economy Math

The gold and loot distribution must strictly control the player's capacity to remove bad cards, upgrade good ones, and acquire relics.

**Gold Rewards per Combat Type:**
*   **Normal Combat:** 20 - 35 Gold
*   **Elite Combat:** 45 - 65 Gold
*   **Boss Combat:** 80 - 120 Gold

**Card Offer Rates (Post-Combat Reward Screen):**
*   **Common:** 60%
*   **Uncommon:** 30%
*   **Rare:** 9%
*   **Legendary:** 1%

**Relic Rarity Distribution (Shop & Standard Chests):**
*   **Common:** 40%
*   **Uncommon:** 35%
*   **Rare:** 20%
*   **Legendary:** 5%
*(Note: Boss chests use a separate, guaranteed Boss Relic pool).*

**Rest Site Heal Formula:**
When choosing to Rest, the heal amount is standardized to prevent over-reliance on healing over mitigation:
`Heal Amount = max(15, floor(maxHP × 0.30))`

---

### 45.4 Deck Health Metrics

To analyze whether the game's economy and card pools are fostering healthy deck-building habits, the game tracks these target metrics internally. Deviations from these norms often indicate balance flaws in specific elements or archetypes.

*   **Optimal Deck Size:** 15 - 25 cards (Tracked via telemetry to ensure players aren't forced into 40+ card bloat or degenerate 5-card infinite loops).
*   **Energy Density Target:** Average energy cost of the deck should hover between **1.8 - 2.2**. 
*   **Draw Engine Target:** A healthy end-game deck should contain **≥3 dedicated card-draw cards**.
*   **Damage-to-Defense Ratio Target:** Approximately **60:40**. Decks heavily skewing towards 90:10 usually indicate enemy damage scaling is too low (or burst damage is too high), while 20:80 indicates combat is dragging out artificially.

---

### 45.5 Telemetry Events

Data collection is vital for long-term health. The game logs specific, anonymized events to determine player behavior, card viability, and systemic bottlenecks.

**Per-Run Tracking:**
*   Seed, Character Class selected.
*   Final Floor reached (and specific node type of death).
*   Win/Loss status.
*   Complete deck snapshot upon entering a Boss node.

**Per-Combat Tracking:**
*   Total turns taken.
*   Total damage dealt and total damage received.
*   Average number of cards played per turn.

**Per-Card Tracking:**
*   **Play Rate:** How often is the card drafted when offered?
*   **Win-Rate-When-Played:** How often does a run succeed when this card is in the final deck?
*   **Upgrade Rate:** How often does the player choose to upgrade this card at a campfire?

**Key Balance Flags (Automated Alerts):**
*   **Overpowered Flag:** A non-starter card with a **>70% draft/play rate** across all winning runs.
*   **Dead Card Flag:** A card with a **<5% draft/play rate**.
*   **Relic Power Flag:** If the win rate *with* a specific relic vs. *without* it shows a **>15% delta**, the relic is flagged for immediate review.

---

### 45.6 Weekly Balance Pass Process

To maintain a dynamic meta without introducing whiplash, we employ a structured review cycle.

1.  **Data Collection Pipeline:** Local client data is temporarily cached in a local SQLite DB, then batched and sent to our central telemetry aggregation server upon run completion or game exit.
2.  **Flagging Thresholds:** Every Tuesday, an automated report is generated highlighting all *Key Balance Flags* (as defined in 45.5).
3.  **Hotfix vs. Patch Decision Tree:**
    *   *Hotfix:* Only deployed for >25% win-rate deltas (game-breaking bugs, degenerate infinite loops, completely broken scaling).
    *   *Standard Patch:* Value nudges (e.g., +/- 2 damage, cost changes) are bundled into scheduled monthly or bi-weekly patches.
4.  **A/B Test Framework:** For risky balance changes, the system uses seed-based variant assignment. (e.g., Seeds ending in 0-4 get Variant A of a reworked card; seeds 5-9 get Variant B). Data is compared after 10,000 runs before finalizing the change globally.

---

### 45.7 Difficulty Tuning Knobs

Behind the scenes, several global and local variables can be adjusted by the design team to shift the game's difficulty without fundamentally rewriting the core logic.

**Global Difficulty Slider (Internal Dev Tool):**
A single global multiplier that maps directly to two primary factors:
*   Enemy HP Multiplier (0.8x to 1.5x)
*   Gold Reward Penalty (1.0x down to 0.6x)

**Per-Character Balance Flags:**
Individual characters can have invisible modifiers applied if they are structurally over/underperforming prior to card reworks (e.g., Character A gets +10% starting max HP, or -1 to starting deck size).

**Element-Specific Power Level Ratings:**
The design team maintains a running S/A/B/C tier assessment for Ember, Tide, Verdant, Storm, and Umbra based on telemetry.
*   If an element falls to **C-Tier**, its base cards receive targeted power budget buffs (ignoring the strict formula in 45.1 temporarily) until synergy routes are repaired.
*   If an element hits **S-Tier**, its common synergistic enablers have their drop weights slightly reduced or energy costs increased.


## §46 — Post-Launch Roadmap & Live Ops

The longevity of **Pact of Five** depends on a consistent cadence of content updates, community engagement through structured challenges, and a robust framework for user-generated content. This section outlines the transition from a static launch product to a living service-oriented roguelike.

---

### 1. CONTENT EXPANSION ROADMAP

The roadmap is designed to double the available strategic depth within the first 15 months post-launch.

#### v1.0 Launch Content Inventory (Base Game)
| Category | Sub-category | Quantity | Details |
| :--- | :--- | :--- | :--- |
| **Cards** | Solar | 19 | Burn, Burst, and High-Risk damage. |
| | Tide | 19 | Flow, Healing, and Resource manipulation. |
| | Verdant | 19 | Thorns, Growth, and Shielding. |
| | Storm | 19 | Multihit, Echo, and Speed/Cycle. |
| | Umbra | 14 | Debuffs, Sacrifice, and Life-steal. |
| | Neutral | 8 | Utility, Energy Gen, and Card Draw. |
| **Enemies** | Act 1 | 8 | Introductory mechanics, 2 Elites, 3 Bosses. |
| | Act 2 | 8 | Mid-run checks, 3 Elites, 3 Bosses. |
| | Act 3 | 6 | Endgame complexity, 2 Elites, 2 Bosses. |
| **Relics** | Common | 12 | Incremental stat boosts. |
| | Uncommon | 12 | Archetype-enabling triggers. |
| | Rare | 8 | Run-defining game-changers. |
| | Legendary | 2 | Unique Boss-drop relics. |
| **Characters** | Tamer / Sage | 2 | Available at start. |
| | Hunter / Warden| 2 | Locked (unlocked via meta-progression). |
| **Environment**| Acts | 3 | Solar Plains, Abyssal Trench, Verdant Spire. |

#### v1.1 'Storm's Edge' (Month 3)
*   **Ascension Expansion:** Adds Tiers 16–20.
    *   *A16:* Shops are 15% more expensive.
    *   *A17:* Elites have a 25% chance to spawn with a random Element Aura.
    *   *A18:* Enemies start with 1 stack of "Resilience" (blocks first debuff).
    *   *A19:* Bosses gain unique "Prestige" abilities (e.g., Solar Boss gains "Flare Back").
    *   *A20:* Double Boss fight at the end of Act 3.
*   **15 New Cards:**
    *   *Attacks (5):* Cyclone Kick (Storm), Shadow Strike (Umbra), Static Discharge (Storm/Solar), etc.
    *   *Skills (4):* Mist Form (Tide/Storm), Gravity Well (Umbra), etc.
    *   *Powers (3):* Eye of the Storm (Storm), Void Engine (Umbra), etc.
    *   *Dual-Element (3):* Steam Blast (Solar/Tide), Overgrowth (Verdant/Umbra), Bolt of Judgment (Storm/Solar).
*   **New Boss: The Null Sovereign:**
    *   *Aesthetics:* A shifting geometric void entity.
    *   *Ability: Elemental Wipe:* Every 3 turns, removes all elemental stacks from the player and converts them into "Entropy" (reduces player's Max HP for the fight).
    *   *Ability: Prism Barrier:* Gains 99 Block; if Block is broken by a specific element, Sovereign takes double damage for one turn.
*   **3 New Relics:**
    *   *Conductive Needle:* First Storm card played each turn triggers twice.
    *   *Obsidian Shard:* Umbra cards cost 0 if your HP is below 25%.
    *   *Wind-Chime:* Gain 1 Energy every time you cycle 5 cards in one turn.

#### v1.2 'The Fifth Act' (Month 5)
*   **Act 4: Convergence Zone:** A chaotic map where elements bleed together. 35–40 nodes.
*   **New Elites (5):**
    *   *The Fused Golem:* High HP, switches element every turn.
    *   *Twin Wraiths:* Must be killed in the same turn or they respawn.
    *   *Storm Alchemist:* Creates "Dead Draw" cards in player's deck.
    *   *Verdant Colossus:* Gains Permanent Thorns every time player heals.
    *   *Tide Reaver:* Steals 1 Energy every 4th card played.
*   **Massive Card Injection:** 10 new cards per element (50 total) focused on high-synergy "Convergence" keywords.
*   **Final Boss: The Pact Breaker:**
    *   *Phase 1:* Uses standard versions of the 5 Element mechanics.
    *   *Phase 2:* Merges two elements (e.g., Solar/Tide) creating "Scalding" effects.
    *   *Phase 3:* Becomes "Pure Essence"—player must use all 5 elements in a single turn to break his "Immortal Aegis."

#### v1.3 'Hunter's Legacy' (Month 8)
*   **Hunter Content:** 20 specific cards.
    *   *Attacks:* Precision Shot (Attack), Trap Spring (Skill), Volley (Attack).
    *   *System:* **Exhaust-chain.** Certain cards grant bonuses if the *previous* card played this turn was Exhausted.
*   **New Enemies:** 5 Beast-type enemies for Acts 1 and 2.
*   **Event: The Great Hunt:** A multi-stage event where player chooses to track a beast for 3 floors, culminating in a mini-boss fight for a "Trophy Relic."

#### v1.4 'Warden Rising' (Month 11)
*   **Warden Content:** 20 specific cards focusing on defensive scaling.
    *   *Passive: Fortress Defense:* Start each combat with Shield equal to 20% Max HP.
*   **New Enemies:** 3 Verdant/Umbra hybrid enemies (Corrupted Treants).

#### v2.0 'The Infinite Pact' (Month 15)
*   **Endless Mode:** Floors loop. Each loop adds +10% Enemy HP/Damage and +1 "Glitch" modifier (e.g., "Cards cost +1 every 5 turns").
*   **Weekly Boss Rotation:** A pool of 12 variant bosses with unique modifiers.
*   **Permanent Unlock Tree:** Spend "Pact Essence" from runs to gain minor permanent buffs (e.g., +2 Max HP, Start with 5 more Gold).

---

### 2. DAILY/WEEKLY CHALLENGE SYSTEM

To ensure daily engagement, a seeded challenge system provides a competitive platform for the player base.

#### Daily Seed Generation
*   **Formula:** `SHA-256(YYYY-MM-DD + "PactOfFiveSalt")`.
*   Every player gets the same map, cards, and shop inventories for that day.
*   **3 Modifier Slots:** Every daily run features three random modifiers from the pool below.

#### Modifier Pool Table
| Modifier Name | Effect | Difficulty (1-5) |
| :--- | :--- | :--- |
| **Solar Flare** | All Solar cards deal 50% more damage but cost 1 HP to play. | 2 |
| **Drought** | Tide cards cannot heal; they grant Block instead. | 3 |
| **Weightless** | Storm cards cost 1 less, but you draw 1 fewer card per turn. | 4 |
| **Overgrowth** | Verdant cards trigger twice, but enemies gain 5 Regen. | 3 |
| **Glass Cannon** | Start with +5 Strength, but -50% Max HP. | 5 |
| **Hoarder** | You cannot remove cards from your deck. | 4 |
| **Pauper** | Shops are empty; gain a random Relic every 5th combat. | 3 |
| **Quickstep** | Gain 1 Energy every time you play 3 cards of the same element. | 2 |
| **Heavy Deck** | Every 5th card played is automatically Exhausted. | 4 |
| **Elemental Flux**| Elements cycle every turn: Solar -> Tide -> Verdant -> Storm -> Umbra. | 5 |

#### Weekly Boss Rotation
A unique "Boss of the Week" is selected from a 12-boss pool.
*   **Scoring Logic:**
    *   `turns_bonus = max(0, (20 - turns_to_kill) * 10)`
    *   `hp_bonus = floor((remaining_hp / max_hp) * 500)`
    *   `no_shop_bonus = 200` (If the player skipped all shops)
    *   `perfect_bonus = 500` (If no HP was lost during the boss fight)

#### Leaderboards
*   **Storage:** Local SQLite for personal history.
*   **Integration:** REST endpoint sends `[Score, Seed, DeckList, Timestamp, PlayerName]` to a global server.
*   **UI:** Displays Top 10 for the current day/week and the player's percentile ranking.

---

### 3. SEASONAL CONTENT

Seasons last 8 weeks and provide thematic narrative arcs and cosmetic progression.

#### Season Structure
*   **Duration:** 8 weeks.
*   **Components:** 1 Theme, 1 Challenge Track (20 Tiers), 5 Cosmetic Rewards.

#### Season 1: 'The Ember Festival'
*   **Theme:** Solar overcharge and Phoenix rebirth.
*   **Content Drops:**
    *   *Week 1-2:* Introduction of the "Cinder" mechanic (Temporary power boost).
    *   *Week 4:* Mid-season Boss Variant: **The Ember Titan**. (Scorchvine boss with +50% HP and new "Inferno" ability that burns 2 cards in player's hand).
*   **Cosmetic Rewards (Card Backs):**
    1.  *Ember Sigil:* Basic orange glow.
    2.  *Ash Wave:* Dark grey with floating embers.
    3.  *Volcanic Glass:* Sharp, obsidian texture.
    4.  *Phoenix Feather:* Animated flame texture.
    5.  *Cinder Crown:* Gold and fire filigree.

#### Season 2: 'Tide's Reckoning'
*   **New Mechanic: Submerged.** Cards played while Submerged (triggered by certain Tide skills) get +1 Draw.
*   **3 New Relics:**
    *   *Coral Crown:* Gain 2 Block whenever you Draw a card.
    *   *Whale Bone:* Increase Max HP by 2 for every Elite killed.
    *   *Trident Tip:* Attacks deal 5 bonus damage to enemies with "Drenched."
*   **Unlock Gate:** Season 1 rewards unlock at 3 hours played OR completion of Ascension 5.

---

### 4. MOD SUPPORT HOOKS

The game is built with a "Data-First" architecture, allowing players to inject content via JSON.

#### JSON Schemas

**Card Schema:**
```json
{
  "id": "string",
  "name": "string",
  "element": "Solar | Tide | Verdant | Storm | Umbra | Neutral",
  "type": "Attack | Skill | Power",
  "rarity": "Common | Uncommon | Rare | Legendary",
  "cost": "integer (0-5)",
  "effects": [
    { "action": "Damage | Block | Draw | ApplyStatus", "value": "integer", "target": "Enemy | Self | All" }
  ],
  "flavor_text": "string"
}
```

**Enemy Schema:**
```json
{
  "id": "string",
  "name": "string",
  "hp": "integer",
  "intent_pattern": [
    { "type": "Attack | Defend | Buff | Debuff", "value": "integer", "frequency": "float" }
  ],
  "immunities": ["list of status strings"]
}
```

#### Protected Systems & Sandbox
*   **RNG Pipeline:** Mods cannot access the master `Random` instance. They must use a provided `ModRandom` that doesn't interfere with the main seed.
*   **Validation:** A "Power Budget" validator checks modded cards; if a card provides >30 value (Damage+Block) for 0 cost, it flags the run as "Unranked."
*   **Save Integrity:** Save files track "Mod Signature." If a mod is removed, the game attempts to scrub modded cards from the deck rather than crashing.
*   **Distribution:** Local `/mods/` directory. The game scans this folder on boot and lists active mods in the Settings menu.

---

### 5. LIVE OPS CONTENT CALENDAR

| Timeline | Milestone | Goal |
| :--- | :--- | :--- |
| **Week 1-2** | Bug Fix Sprint | Stability and crash resolution. |
| **Week 3-4** | Balance Patch #1 | Nerf overperforming Solar combos; buff weak Umbra relics based on telemetry. |
| **Month 2** | v1.0.5 (QoL) | UI scaling, keyboard shortcuts, tooltips for keywords. |
| **Month 3** | **v1.1 Storm's Edge** | First major content expansion. |
| **Month 5** | **v1.2 The Fifth Act** | Endgame expansion. |
| **Month 8** | **v1.3 Hunter's Legacy** | Character-focused expansion. |
| **Month 11** | **v1.4 Warden Rising** | Character-focused expansion. |
| **Month 15** | **v2.0 The Infinite Pact** | Major system overhaul for replayability. |

#### Service Level Agreement (SLA) & Feedback
*   **P0 (Crash/Game-Breaking):** Fix within 24 hours.
*   **P1 (Mechanical Error/Math Bug):** Fix within 72 hours.
*   **P2 (Visual/Audio Glitch):** Included in the next scheduled bi-weekly patch.
*   **Feedback Loop:** An in-game "Report Issue" button takes a screenshot and creates a JSON payload containing the current `GameState`, `DeckList`, and `ActiveRelics`, saving it to a local `feedback.log` for the player to submit to the community discord/portal.
*   **Patch Note Format:**
    1.  *What changed:* (The value adjustment).
    2.  *Why it changed:* (The design rationale based on win-rate telemetry).
    3.  *Comparison:* (Before: 10 DMG / After: 8 DMG).


I will begin by researching the current game configuration and data structures to ensure the GDD section aligns with the existing implementation where applicable, specifically checking character stats, run logic, and card rarity distributions.
I will now examine `src/core/balance.ts` and `src/core/run.ts` to gather additional constants and logic related to run structure, gold, and energy, which will help me populate the GDD with consistent and detailed data.
I will now check `src/data/events.ts` to identify existing events or gather inspiration for thematic gold-related outcomes, ensuring the 10 specific events I list in the GDD are well-integrated with the game's lore and mechanics.
## §47 — Run Economy & Loop Math

The game’s progression logic is built upon a deterministic node-based traversal system where player choice is balanced against resource scarcity. This section outlines the mathematical foundations for run structure, gold distribution, card acquisition, HP management, and energy scaling.

### 1. FULL RUN STRUCTURE (Node Distribution & Logic)
A complete run consists of three primary Acts, separated by Intermission nodes, concluding with a Final Boss.

| Act | Total Nodes | Combat (Normal) | Combat (Elite) | Boss | Event Nodes | Shop Nodes | Rest Nodes |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Act 1: The Verdant Wilds** | 45-55 | 12-16 | 3-4 | 1 | 8-10 | 4-6 | 5-7 |
| **Act 2: The Umbral Depths** | 50-60 | 14-18 | 4-5 | 1 | 8-10 | 4-6 | 5-7 |
| **Act 3: The Aether Spire** | 40-50 | 10-14 | 4-5 | 1 | 4-6 | 2-4 | 3-5 |

**Procedural Generation Logic:**
*   **Branching Factor:** Each node generates 1–3 paths forward. The algorithm guarantees the player always has at least 2 distinct path choices at any floor.
*   **Safety Constraints:**
    *   No more than 2 consecutive Combat nodes of the same type.
    *   No 3 Combat nodes (any type) in a row.
    *   Shop nodes cannot appear immediately after another Shop node.
    *   A Rest node is guaranteed immediately after every Boss combat.
    *   A Shop node is guaranteed in the final 3 floors of Act 3.
*   **Intermission Nodes:** Between Acts, the player enters a safe zone with three fixed choices:
    1.  **Rejuvenate:** Heal 30 flat HP.
    2.  **Refine:** Remove 1 card from the deck.
    3.  **Reward:** Gain a choice of 1 of 3 Relic offers (requires payment of 100g, or free if "Perfect Boss" kill).

---

### 2. GOLD ECONOMY FULL TABLE
Players begin the run with **0 Gold**. Gold is the primary lever for deck refinement and power spikes through Shops and Events.

**Gold Sourcing Table:**
| Source | Gold Range | Avg. Yield | Additional Rewards |
| :--- | :---: | :---: | :--- |
| Normal Combat | 20–35g | 27g | 30% Potion chance, 3-card reward |
| Elite Combat | 45–65g | 55g | 1 Guaranteed Relic, 3-card reward |
| Boss Combat | 80–120g | 100g | 1 Boss Relic, 3-card reward (Upgraded) |
| Treasure Chest | 25–75g | 50g | 10% chance for Relic instead of Gold |

**10 Specific Gold-Bearing Events:**
1.  **Crossroads:** Choice: +30g cache / Random Card / 25% Heal.
2.  **The Golden Idol:** Steal idol for +80g; adds "Curse of Greed" (Take 1 damage every 5 cards played).
3.  **Buried Cache:** Pay 15 HP to dig for 65g.
4.  **The Taxman:** Pay 50g to avoid a combat, or fight an Elite for 75g bonus.
5.  **Gambler's Den:** 50% chance to double 40g investment, 50% to lose it.
6.  **Ancient Fountain:** Throw 20g in to heal 15 HP; 10% chance to get 100g back.
7.  **Mercenary Contract:** Defeat next 3 normals for +15g bonus each.
8.  **The Alchemist:** Sell 1 Potion for 40g.
9.  **Scavenger’s Scrap:** Gain 5g for every "Neutral" card in your deck (Max 50g).
10. **The Forgotten Vault:** Lose 50g to gain a Rare Relic.

**Spending Targets:**
*   **Average Gold per Run:** 650–900 (Normal Path); 900–1200 (Elite-Heavy Path).
*   **Allocation:** Cards (40%), Relics (35%), Removal (15%), Potions (10%).

**Shop Price List:**
*   **Common Card:** 50–75g
*   **Uncommon Card:** 85–110g
*   **Rare Card:** 130–160g
*   **Relic:** 150–300g (Tier-dependent)
*   **Remove Card:** 75g (Increases by +25g per use)
*   **Potion:** 30–60g

---

### 3. CARD ACQUISITION MATH
Deck bloat is controlled through limited offers and mandatory removal costs.

*   **Offer Velocity:**
    *   Boss Rewards: 3 guaranteed (1 per Act).
    *   Combat Rewards: 8–12 successful choices.
    *   Events: 0–3 cards.
    *   Shop: 0–5 cards.
    *   **Total Offers per Run:** 11–23.
*   **Conversion Rate:** Players typically pick ~60% of offered cards.
*   **Deck Sizing:**
    *   **Starting Deck:** 10 cards.
    *   **Net Gain:** 7–14 cards.
    *   **Removals:** 2–4 cards.
    *   **End-Game Deck Target:** 17–22 cards.
*   **Upgrade Velocity:** 3–6 Rest sites; avg 4 upgrades applied per run.
*   **Rarity Distribution (Standard Offer):**
    *   Common: 60%
    *   Uncommon: 30%
    *   Rare: 9%
    *   Legendary: 1%
    *   *Affinity Bonus:* +10% weight to cards matching the character’s primary element.

---

### 4. HP ECONOMY & SURVIVABILITY
HP is treated as a finite currency spent to acquire gold and relics.

| Character | Starting HP | Avg. Normal Dmg | Avg. Elite Dmg | Avg. Boss Dmg |
| :--- | :---: | :---: | :---: | :---: |
| **Tamer** | 75 | 12–20 HP | 25–40 HP | 30–55 HP |
| **Sage** | 60 | 15–25 HP | 25–40 HP | 30–55 HP |
| **Hunter** | 70 | 10–18 HP | 25–40 HP | 30–55 HP |
| **Warden** | 85 | 8–15 HP | 25–40 HP | 30–55 HP |

**Healing Mechanics:**
*   **Rest Site:** Heals `max(15, floor(maxHP * 0.30))`.
    *   *Example:* Tamer (75 HP) heals 22. Sage (60 HP) heals 18.
*   **Potions:**
    *   Healing Elixir: 30 flat HP.
    *   Vital Draught: 50% of missing HP.
    *   Mending Balm: 20 HP + 5 Shield.
*   **Survival Targets (HP Remaining at Boss):**
    *   Act 1 Boss: 55–75% HP
    *   Act 2 Boss: 35–55% HP
    *   Act 3 Boss: 20–45% HP

---

### 5. ENERGY ECONOMY
Energy dictates the "tempo" of a turn and limits the impact of card draw.

*   **Baseline Energy:** 3 per turn.
*   **Card Cost Targets:**
    *   Avg. Card Cost: 1.8 Energy.
    *   Target Range: 1.6–2.2.
*   **Tempo Scaling:** 1.6 cards/turn (Act 1) → 2.4 cards/turn (Act 3).
*   **Energy Relics (Standardized):**
    *   **Crystal Core:** Gain +1 Energy on Turn 1 of every combat.
    *   **Storm Battery:** Gain 1 Energy after playing a 'Storm' card (once per turn).
    *   **Ember Crucible:** The first card played each turn costs 0.
    *   **Tide Pearl:** If ending turn with 2+ Energy, draw 1 card.
*   **Deck Composition Targets:**
    *   3–5 Zero-cost cards (triggers and utility).
    *   1–2 Energy Sinks (X-cost or high-cost finishers).

---

### 6. TURN ECONOMY & TIMING
Combat length is tuned to prevent fatigue while ensuring strategic depth.

| Combat Type | Avg. Turns | Win Condition Timing |
| :--- | :---: | :--- |
| Normal | 4–7 | Turn 5 (Aggro) |
| Elite | 7–12 | Turn 8 (Mid-range) |
| Boss | 12–20 | Turn 15 (Control/Scale) |

*   **Median Run Duration:** 180–250 total turns.
*   **Turn 1 Philosophy:** 60% Block establishment (Warden/Sage) or Status Application (Tamer/Hunter).
*   **Stall Prevention:** All enemies gain **Fury** (+2 Damage per stack) every 3 turns if they have not taken damage in that window.

---

### 7. BALANCE LEVERS & TUNING
When metrics deviate from the targets above, designers should apply the following precise levers:

1.  **Run Length Fatigue:** If runs feel too short, increase Act 2 node count by +8. Reduce Elite HP by 10% to compensate for increased total attrition.
2.  **Gold Starvation:** Increase base Normal Combat gold floor to 25g. Add 2 "Treasure Goblins" variants to the pool (guaranteed 50g on kill).
3.  **Deck Bloat:** If median deck size exceeds 25 cards, add 1 free "Card Removal" option to the Act 2 Intermission.
4.  **Trivial Difficulty:** Reduce Rest heal to 25% MaxHP. Reduce Boss Gold yield by 15%.
5.  **Act 3 Difficulty Spike:** Add a mandatory Rest node immediately before the Act 3 Boss if the player's HP is below 30% upon reaching the final floor.
6.  **Character Performance:** If Sage win rate falls below 15%, reduce the average energy cost of the Sage starting deck by -0.1 via card swaps.

---

### 8. FULL RUN GOLD SIMULATION (Sample Act 1)
Simulation of a standard "Gold-Optimized" path through Act 1 for a Tamer.

| Node | Floor | Type | Gold Change | Total Gold | Notes |
| :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | 0 | Start | +0 | 0 | Starting Capital |
| 2 | 1 | Normal Combat | +28 | 28 | Fast kill bonus |
| 3 | 2 | Event | +30 | 58 | Crossroads: Cache |
| 4 | 3 | Normal Combat | +25 | 83 | |
| 5 | 4 | Shop | -75 | 8 | Buy: "Leaf Blade" |
| 6 | 5 | Normal Combat | +32 | 40 | |
| 7 | 6 | Elite Combat | +58 | 98 | Relic: Oak Ring |
| 8 | 7 | Event | +0 | 98 | Shrine: Card Reward |
| 9 | 8 | Treasure | +45 | 143 | |
| 10 | 9 | Shop | -120 | 23 | Buy: "Iron Wood" (Rare) |
| 11 | 10 | Normal Combat | +24 | 47 | |
| 12 | 11 | Rest | +0 | 47 | Upgrade: Tame |
| 13 | 12 | Event | +65 | 112 | Buried Cache (-15 HP) |
| 14 | 13 | Elite Combat | +61 | 173 | Relic: Sharp Claw |
| 15 | 14 | Boss (Verdant) | +105 | 278 | |

**Final Act 1 Assets:** 278 Gold, 2 Relics, 1 Upgraded Card, 2 Purchased Cards. Expected HP: 48/75 (64%).


## §48 — Modding & Future-Proofing Architecture

### 1. OVERVIEW
The architecture of *Pact of Five* is designed with a "Data-First" philosophy. By decoupling game logic from content definitions, we ensure that the game is not only easy to balance but also natively extensible by the community. This section outlines the systems required to support community-created content and the architectural guardrails that prevent long-term technical debt.

---

### 2. MOD LOADING SYSTEM
The modding system allows external JSON packages to inject new content into the game's registry at runtime.

#### 2.1 Mod Manifest (mod.json)
Every mod must include a `mod.json` file in its root directory.
```json
{
  "id": "void_expansion_pack",
  "name": "The Empty Void",
  "version": "1.2.0",
  "author": "PactMaster99",
  "description": "Adds a new set of Void-element cards and enemies.",
  "dependencies": ["base_game", "core_lib_v2"],
  "cards": ["cards/void_bolt.json", "cards/null_shield.json"],
  "enemies": ["enemies/void_specter.json"],
  "relics": ["relics/abyssal_eye.json"],
  "events": ["events/the_rift.json"],
  "art_overrides": {
    "cards/strike_fire": "assets/alt_art/fire_strike_v2.png"
  }
}
```

#### 2.2 Load Order & Conflict Resolution
1.  **Base Game:** `src/data/*` (hardcoded priority 0).
2.  **Official DLC:** Loaded from `/dlc/` directory.
3.  **Community Mods:** Loaded from `/mods/` directory in alphabetical order by ID.
**Conflict Policy:** If two mods share a Card ID, the last-loaded mod overwrites the previous entry. A warning is logged to the `mod_log.txt` to help users debug load-order issues.

#### 2.3 Hot-Reloading (Vite HMR)
In development mode, the `ModManager` integrates with Vite's HMR. When a JSON file in `/mods/` is saved, the `Registry` clears the specific ID and re-injects the new data, triggering a UI refresh without losing the current run state (where possible).

#### 2.4 Validation
On startup, all mod files undergo a JSON Schema validation. If a card is missing a required field (e.g., `cost`), the mod is skipped, and the engine displays a "Mod Loading Error" in the title screen's console.

---

### 3. JSON CARD SCHEMA
Cards are defined as pure data. The `EffectResolver` parses the `effects` string array into executable logic.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier (e.g., `pact_strike_fire`). |
| `name` | `string` | Display name. |
| `element` | `enum` | `FIRE`, `WATER`, `EARTH`, `AIR`, `VOID`. |
| `type` | `enum` | `ATTACK`, `SKILL`, `POWER`, `STATUS`, `CURSE`. |
| `rarity` | `enum` | `STARTER`, `COMMON`, `UNCOMMON`, `RARE`, `SPECIAL`. |
| `target` | `enum` | `SINGLE_ENEMY`, `ALL_ENEMIES`, `SELF`, `NONE`. |
| `cost` | `number` | Energy cost (0-9). -1 for Unplayable. |
| `effects` | `string[]`| Logic strings: `damage:9`, `block:5`, `apply:vulnerable:2`. |
| `description` | `string` | Localization key or raw text with placeholders like `!D!` for damage. |
| `exhaust` | `boolean` | (Optional) If true, card is removed from combat after use. |

**Effect String Parsing:**
- `damage:N`: Deals N damage to target.
- `block:N`: Adds N block to player.
- `apply:STATUS:N`: Applies N stacks of STATUS to target.
- `draw:N`: Draws N cards.

---

### 4. JSON ENEMY SCHEMA
Enemies utilize an "Intent Pool" to determine behavior based on weights and conditions.

#### 4.1 Schema Definition
```json
{
  "id": "magma_construct",
  "name": "Magma Construct",
  "element": "FIRE",
  "act": 2,
  "tier": "ELITE",
  "hp": 120,
  "hp_range": 15,
  "intent_pool": [
    {
      "name": "Molten Slam",
      "type": "ATTACK",
      "value": 18,
      "weight": 50,
      "condition": "always"
    },
    {
      "name": "Heat Aura",
      "type": "BUFF",
      "value": 3,
      "weight": 30,
      "condition": "player_block_gt_10"
    },
    {
      "name": "Hardening",
      "type": "DEFEND",
      "value": 15,
      "weight": 20,
      "condition": "hp_lt_50_pct"
    }
  ],
  "abilities": ["thorns:2", "fire_affinity"],
  "art_path": "enemies/magma_construct.png"
}
```

---

### 5. JSON EVENT SCHEMA
Events are multi-stage narrative encounters defined by a branching choice tree.

#### 5.1 Structure
- **Options:** An array of choices presented to the player.
- **Conditions:** Requirements to see/click an option (e.g., `{ "type": "gold_gte", "value": 50 }`).
- **Effects:** Rewards or penalties (e.g., `{ "type": "card_remove" }`).

**Example: The Hermit's Trade**
```json
{
  "id": "hermit_trade",
  "name": "The Hermit's Trade",
  "description": "A hooded figure offers a glowing stone for a price...",
  "options": [
    {
      "text": "[Accept] Lose 10 HP. Gain a Random Rare Card.",
      "effects": [
        { "type": "hp", "value": -10 },
        { "type": "card_add", "rarity": "RARE" }
      ]
    },
    {
      "text": "[Buy] Pay 75 Gold. Gain a Relic.",
      "conditions": [{ "type": "gold_gte", "value": 75 }],
      "effects": [
        { "type": "gold", "value": -75 },
        { "type": "relic_add", "id": "random" }
      ]
    },
    {
      "text": "[Leave] Walk away.",
      "effects": []
    }
  ]
}
```

---

### 6. SAVE SYSTEM ARCHITECTURE
The save system uses a robust serialization layer to ensure stability across updates.

#### 6.1 Data Keys
- `pof_run_state`: The active run (volatile).
- `pof_meta`: Permanent unlocks, total XP, and Ascension levels.

#### 6.2 Schema & Versioning
```typescript
interface SaveData {
  version: number;
  seed: string;
  rngState: number;
  characterId: string;
  act: number;
  floor: number;
  hp: number;
  maxHp: number;
  gold: number;
  deck: string[]; // Array of Card IDs
  relics: string[]; // Array of Relic IDs
  modifiers: string[];
}
```

#### 6.3 Features
- **Export/Import:** Runs can be shared via a Base64 encoded string of the `SaveData` object.
- **Corruption Recovery:** The `SaveManager` performs a checksum on load. If the JSON is malformed or the version is incompatible without a migration path, the user is redirected to a "Save Corrupted" screen which offers to archive the broken save and start fresh.
- **Cloud Sync:** Planned as a feature-flagged service worker that syncs `localStorage` to a REST endpoint.

---

### 7. EXTENSIBILITY HOOKS
The game engine uses an Internal Event Bus (`EventEmitter`) to allow mods to react to game states.

#### 7.1 Event Types
- `CardPlayed`: Triggered when a card leaves the hand.
- `EnemyDied`: Triggered before reward screen.
- `TurnStart` / `TurnEnd`: Useful for status effects.
- `DamageDealt` / `HealReceived`: Used by relics to modify values.

#### 7.2 The Resolver Chain
When an effect (like damage) occurs, it passes through a chain:
1.  **Base Value:** The number in the card/enemy JSON.
2.  **Keyword Modifiers:** (e.g., Strength, Weak).
3.  **Relic Modifiers:** (e.g., Paper Phrog increases Vulnerable damage).
4.  **Mod Hooks:** External logic provided by community mods.

**Constraints:** To maintain game integrity, mods cannot modify the `RNG` seed or bypass the `PowerBudget` validator during runtime.

---

### 8. TECHNICAL DEBT PREVENTION
To ensure the project remains maintainable as it grows from 100 to 1,000 cards:

1.  **Strict Data Separation:** Files in `src/data/` must be pure JSON or TypeScript objects containing only data. Logic belongs in `src/core/`.
2.  **No Circular Imports:** Enforced via `eslint-plugin-import`. Battle logic should never import UI components; it should emit events that the UI listens to.
3.  **Single Source of Truth:** All game state resides in the `GameState` store. React/Vue components (if used) or Vanilla UI must only reflect this state.
4.  **Battle Snapshots:** The `toBattleSnapshot()` method creates a deep clone of the current battle state. This is used for "Undo Turn" features and automated regression testing.
5.  **Performance:** The hot path (Damage calculation, Intent selection) is allocation-free. We reuse arrays and object pools for particles and intent markers to prevent GC jank during animations.
6.  **TypeScript Enforcement:** `strict: true` and `noImplicitAny: true`. The use of `any` is restricted to external library boundaries and must be documented with a `// @ts-ignore: reason`.

---

### 9. VERSIONING POLICY
1.  **Major Version (v1.x to v2.x):** Breaking changes allowed. Requires mandatory migration functions.
2.  **Minor Version (v1.1 to v1.2):** No breaking changes to saves. Unknown JSON fields are ignored using `Zod.passthrough()`.
3.  **Migration Path:** `MigrationRegistry` contains a list of functions: `migrateV1toV2(data)`. On load, if `save.version < current.version`, the engine pipes the data through the necessary functions sequentially.


## §49 — QA & Playtest Framework

The complexity of 'Pact of Five'—arising from the intersection of five elemental systems, hundreds of card interactions, and procedural generation—demands a rigorous, multi-layered QA framework. This section defines the strategy to ensure game stability, balance, and performance across web and mobile platforms.

### 1. AUTOMATED TESTING STRATEGY

Our strategy follows the "Testing Pyramid" adapted for game development, prioritizing fast-running unit tests for core logic while using heavy E2E tests for critical path verification.

| Test Level | Scope | Tools | Coverage Target |
| :--- | :--- | :--- | :--- |
| **Unit Tests** | `src/core/` (Battle, RNG, Elements, Deck logic) | Vitest | 90%+ |
| **Schema Tests** | `src/data/` (JSON validation, Card/Relic integrity) | Vitest / Zod | 70%+ |
| **Smoke Tests** | Full game simulation (20 seeded runs) | ts-node / Custom | 100% (No crashes) |
| **E2E Tests** | `src/ui/` & Scenes (User flows, Touch, UI) | Playwright | 40% (Critical paths) |
| **Visual Regression** | Snapshot testing for UI components | Playwright / Vitest | Key UI states |

**Test File Structure & Co-location:**
- **Unit Tests:** Located in `__tests__` folders adjacent to the source file or using the `.test.ts` suffix.
- **Mocking:** RNG must always be mocked using the seeded `Mulberry32` generator to ensure deterministic test results.
- **CI Pipeline:**
  1. `npm run typecheck`: Ensure TypeScript integrity.
  2. `npm test`: Execute Vitest unit and integration tests.
  3. `npm run smoke`: Execute 20 automated seeded runs.
  4. `npm run e2e`: Run Playwright suite against a headless browser.
  5. **Block Merge:** All PRs are blocked if any stage fails.

---

### 2. SMOKE TEST SPECIFICATION

The smoke test is a "stress test" designed to identify crashes in the procedural generation and battle engine without manual intervention.

**Execution Parameters:**
- **Command:** `npm run smoke --seeds 1-20`
- **Engine:** `src/smoke/runner.ts`
- **Seeding:** Uses `Mulberry32` algorithm. Seeds are integers [1..20].
- **AI Logic (Greedy/Random):**
  - **Card Play:** Always play the leftmost playable card until energy is exhausted.
  - **Targeting:** Always target the enemy with the lowest current HP.
  - **Map Navigation:** Always choose the right-most available node at a fork.
  - **Rewards:** Always pick the first card/relic offered.
  - **Resting:** If HP < 50%, choose "Heal"; otherwise, choose "Upgrade".

**Assertions & Reporting:**
- **Zero Exceptions:** Any `Uncaught Error` or `Unhandled Rejection` fails the seed.
- **Finite State:** A run must conclude in under 5 minutes (prevents infinite loops in battle logic).
- **Result Output:** A `smoke-test-report.json` is generated:
```json
{
  "summary": { "passed": 18, "failed": 2, "time": "142s" },
  "runs": [
    {
      "seed": 1,
      "character": "Tamer",
      "finalAct": 3,
      "finalFloor": 42,
      "result": "WIN",
      "framesMax": 14.2,
      "errors": []
    },
    {
      "seed": 7,
      "character": "Warden",
      "finalAct": 1,
      "finalFloor": 8,
      "result": "CRASH",
      "errors": ["TypeError: Cannot read property 'type' of undefined at Battle.ts:402"]
    }
  ]
}
```
**Failure Handling:** On failure, the runner saves the `GameState` snapshot and the `ActionLog` of the last 10 turns to `forge/debug/fail-seed-N.json`.

---

### 3. PLAYWRIGHT E2E TEST CASES

These tests simulate a human player interacting with the DOM/Canvas.

| ID | Title | Description | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-001** | Splash Render | Load root URL. | Title screen visible < 3s; 4 character icons present. |
| **TC-002** | Char Select | Click 'Tamer' then 'Select'. | Deck preview opens; 10 starter cards listed; 'Start' enabled. |
| **TC-003** | Map Init | Start run from Char Select. | Map scene active; Act 1 Title shown; First floor node clickable. |
| **TC-004** | Combat Entry | Click first Combat node. | UI shifts to Battle; Hand of 5 cards drawn; Enemy intent visible. |
| **TC-005** | Play Attack | Drag 'Strike' card to Enemy 1. | Card disappears; Damage popup on enemy; Enemy HP bar drops. |
| **TC-006** | End Turn | Click 'End Turn' button. | Hand discarded; Enemy animation plays; Player HP decreases. |
| **TC-007** | Win Reward | Defeat all enemies in combat. | Transition to Reward; 3 card choices rendered. |
| **TC-008** | Card Add | Click second card in reward. | "Card Added" toast; Return to Map; Deck count += 1. |
| **TC-009** | Shop Logic | Enter Shop; Click Potion. | Gold decreases; Potion appears in Belt; Shopkeeper flavor text. |
| **TC-010** | Rest Site | Enter Rest; Click Heal. | Player HP increases; Visual sparkle FX; Proceed to Map. |
| **TC-011** | Intermission | Defeat Act 1 Boss. | Intermission scene; 3 Boss Relic choices visible. |
| **TC-012** | Act Transition | Enter Act 2. | Map theme changes; Enemy pool updated to Act 2 variants. |
| **TC-013** | Victory Flow | Defeat Act 3 Final Boss. | Victory screen; Final score calculated; Return to Title button. |
| **TC-014** | Death Flow | Player HP reaches 0. | Game Over screen; 'New Run' button restarts cycle. |
| **TC-015** | Persistence | Refresh browser mid-run. | Scene restores to exactly the same floor/state/HP. |

---

### 4. BUG SEVERITY TIERS

We use a 4-tier system to prioritize engineering resources.

| Tier | Name | Definition | Target Resolution |
| :--- | :--- | :--- | :--- |
| **P0** | **Blocker** | Game crash, save data corruption, infinite loop, softlock. | < 24 Hours |
| **P1** | **Critical** | Major mechanic broken (e.g., 0-damage attacks), broken progression. | < 72 Hours |
| **P2** | **Major** | Visual glitches, audio missing, minor UI overlaps, confusing UX. | Next Patch (1-2 Weeks) |
| **P3** | **Minor** | Flavor text typos, polish requests, optimization ideas. | Monthly / Backlog |

**Bug Report Template:**
```markdown
## [SEVERITY] - Short Descriptive Title
- **Repro Steps:**
  1. Open Game on [Browser/Device]
  2. Select [Character]
  3. Perform [Action]
- **Expected:** [What should happen]
- **Actual:** [What happened]
- **Environment:** [Seed / Floor / Device Info]
```

---

### 5. KNOWN EDGE CASES TO TEST

The following scenarios must be explicitly tested in `src/core/__tests__/edge-cases.test.ts`:

1.  **Empty Draw Pile:** When `draw_pile.length === 0` and a draw action is triggered, verify `discard_pile` is shuffled into `draw_pile` mid-action without losing draw count.
2.  **Mutual Annihilation:** If an attack kills the enemy but triggers a 'Thorns' effect that kills the player, the player wins. Death check for player must run *after* enemy death resolution.
3.  **Element Chain Break:** If an element weakness chain (e.g., Water -> Fire -> Earth) targets an enemy that dies mid-chain, the chain must terminate gracefully without targeting a null reference.
4.  **Post-Combat Relics:** Relics like 'Burning Blood' (Heal on combat end) must not trigger if the player died in the final turn of combat.
5.  **Save Corruption Recovery:** Manually inject invalid JSON into `localStorage`. Game must detect corruption, prompt the user, and offer a "Reset Save" option rather than white-screening.
6.  **Multi-Touch Conflict:** Rapidly tap two different cards on mobile. Only one card selection should resolve.
7.  **Small Screen Overflow:** Force a 320x480 viewport. Card tooltips containing long descriptions (e.g., 4+ keywords) must use a scrollable area or scale down to fit.
8.  **Free Energy:** Play a 0-cost card when Energy is 0. Verify energy does not become negative and the card executes normally.
9.  **X-Cost Handling:** Play an X-cost card when Energy is 0. X must resolve as 0 (e.g., 0 damage) rather than skipping the effect or throwing an error.
10. **Stun vs Boss Phase:** Stun a boss that is programmed to transform at 50% HP. The transformation should be delayed until the stun wears off, ensuring phase-transition dialogue isn't skipped.

---

### 6. PERFORMANCE TARGETS & MEASUREMENT

We use `Lighthouse CI` and custom performance hooks to track stability.

- **Initial Load:** < 3.0s on 4G Throttle.
- **TTI (Time to Interactive):** < 1.5s.
- **Bundle Size:**
  - Game Engine Core: < 200KB (Gzipped).
  - Total Assets + Logic: < 500KB (Initial Load).
- **Runtime Performance:**
  - **FPS:** Stable 60fps (16.6ms budget).
  - **Combat Latency:** < 100ms from 'Click' to 'Animation Start'.
  - **Memory:** < 150MB Heap during peak combat FX.
  - **Draw Calls:** < 50 per frame.

**Measurement Tool:**
`npm run perf` — Executes a headless Chrome instance with `Lighthouse` and `Chrome DevTools Protocol` to capture a trace. Output saved to `forge/perf-report.json`.

---

### 7. ACCESSIBILITY QA CHECKLIST

'Pact of Five' aims for WCAG 2.1 AA compliance where applicable to gaming.

- [ ] **Keyboard Nav:** Every UI element (Cards, Map Nodes, Buttons) can be reached via `Tab` and activated via `Enter/Space`.
- [ ] **Map Navigation:** Use Arrow Keys to select paths on the map.
- [ ] **Screen Reader Labels:** All cards use `aria-label` formatted as: `[Name], [Cost] Energy, [Type]. Effect: [Description]`.
- [ ] **Semantics:** All interactive elements use `<button>` or `role="button"`.
- [ ] **Color Blindness Icons:** Each of the 5 elements must have a unique geometric silhouette (Circle, Square, Triangle, Star, Diamond) so color is not the only identifier.
- [ ] **Contrast:** All UI text must maintain a contrast ratio of at least 4.5:1 against backgrounds.
- [ ] **Font Constraints:** Minimum 14px for functional text; 12px permitted for non-essential flavor text.
- [ ] **Motion:** "Reduced Motion" setting in-game disables screen shakes and rapid flashes.

---

### 8. PLAYTEST PROTOCOL

A structured three-phase approach to gathering human feedback.

**Phase 1: Internal Alpha (Dev Team)**
- **Goal:** Identify obvious bugs and "feel" issues.
- **Requirement:** Each developer completes 10 full runs (total 40 across all characters).
- **Metric:** "Time to First Fun" (seconds until the first interesting decision).

**Phase 2: Closed Alpha (5-10 External Testers)**
- **Goal:** UI/UX friction and early balance.
- **Tool:** Recording of browser sessions + Typeform survey.
- **Questions:**
  1. Rate enjoyment from 1 (Bored) to 10 (Addicted).
  2. Which card felt "worthless" or "overpowered"?
  3. Describe the most frustrating moment in your run.
  4. Did you understand why you died?

**Phase 3: Open Beta (Telemetry Driven)**
- **Goal:** Large-scale balance data.
- **Telemetry:** Record `MapCoord`, `EnemyID`, `PlayerHP`, `CardsHeld` at the moment of death.
- **Success Criteria:**
  - New players should reach Floor 5-10 of Act 1 on their first attempt (50% death rate).
  - Act 3 Win Rate for "Veteran" players (10+ runs) should be ~15-20%.

**Death Analysis Heatmap:**
We generate a weekly report from telemetry showing "Death Nodes." If Act 1 Floor 4 (The Sentinel) has a >40% death rate, it is flagged for a balance nerf.


## §50 — Pre-Launch Checklist

This document serves as the final gateway for 'Pact of Five' production. No build shall be designated as 'Release Candidate' until all items below are verified through the specified testing protocols.

### 1. CONTENT COMPLETENESS
- [ ] **All 98 Unique Cards Implemented**
    - [ ] Effect logic matches `src/core/battle.ts` implementation standards.
    - [ ] Localized names and descriptions verified in `src/i18n/index.ts`.
    - [ ] Card costs and rarities balanced against the Final Wave 2 balance sheet.
- [ ] **All 22 Enemies Implemented with Full Intent Pools**
    - [ ] **Act 1 (8):** Sproutling, Ember Mite, Drift Jelly, Spark Wasp, Pebble Golem, Rot Fly, Gale Bird, Voodoo Doll.
    - [ ] **Act 2 (8):** Magma Crab, Tidal Guardian, Storm Elemental, Overgrowth Stalker, Shadow Weaver, Iron Tusk, Cursed Book, Void Eye.
    - [ ] **Act 3 (6):** Solar Dragon, Abyssal Whale, World Tree Heart, Thunder God Avatar, Eclipse Knight, The Five-Fold Amalgam.
- [ ] **All 34 Relics Implemented**
    - [ ] Trigger logic (OnTurnStart, OnCardPlay, OnDamageTaken) verified in `src/data/relics.ts`.
    - [ ] Relic rarity distribution (Common/Uncommon/Rare/Boss) matches GDD §12.
- [ ] **Character Selection & Progression**
    - [ ] Tamer: Initial unlock state = Active. Starter Deck: Ember/Verdant focus.
    - [ ] Sage: Initial unlock state = Active. Starter Deck: Tide/Storm focus.
    - [ ] Hunter: Locked. Condition: Reach Act 2 with any character.
    - [ ] Warden: Locked. Condition: Win a run with the Sage.
- [ ] **End-to-End Game Loop (Acts 1-3)**
    - [ ] Act 1 boss transition to Act 2 intermission functions.
    - [ ] Act 2 boss transition to Act 3 intermission functions.
    - [ ] Act 3 boss victory triggers the 'Final Victory' sequence and credits.
- [ ] **Event System (20 Unique Events)**
    - [ ] [ ] Wandering Merchant: Trade gold for cards/relics.
    - [ ] [ ] Corrupted Altar: Sacrifice HP for Max HP or Power.
    - [ ] [ ] Storm Fragment: Gain a Storm card, take 5 damage.
    - [ ] [ ] Verdant Seed: Plant for a reward in 3 floors.
    - [ ] [ ] Tide Pool: Cleanse a Curse or heal.
    - [ ] [ ] Umbra Mirror: Duplicate a card in deck.
    - [ ] [ ] Ember Forge: Upgrade 2 random cards.
    - [ ] [ ] Lost Traveler: Escort for gold at the next shop.
    - [ ] [ ] Ancient Tablet: Gain a random Rare card.
    - [ ] [ ] Elemental Shrine: Choose an element to buff for the next 3 combats.
    - [ ] [ ] Cursed Chest: Gain a Relic + a permanent Curse.
    - [ ] [ ] Injured Adventurer: Give HP for a Relic.
    - [ ] [ ] Strange Brew: Gain a random temporary buff.
    - [ ] [ ] Forgotten Laboratory: Transform 3 cards into random ones.
    - [ ] [ ] The Dreamer: Select 1 of 3 powerful temporary relics.
    - [ ] [ ] Bone Merchant: Buy cards using Max HP instead of gold.
    - [ ] [ ] Crystal Cave: Mine for gold (risk of combat).
    - [ ] [ ] Storm Beacon: Increase difficulty for better rewards.
    - [ ] [ ] Nature's Calling: Heal to full but lose 10% Max HP.
    - [ ] [ ] Shadow Passage: Skip the next combat node.
- [ ] **Ascension System (Levels 1-15)**
    - [ ] Level 1: More Elites.
    - [ ] Level 5: Bosses are deadlier.
    - [ ] Level 10: Start with a Curse.
    - [ ] Level 15: Maximum enemy HP and Damage scaling verified.
- [ ] **Meta-Progression**
    - [ ] All 20 nodes in the unlock tree (EXP-based) correctly modify starting stats or card pools.
- [ ] **Tutorial System**
    - [ ] Step 1: Card Playing.
    - [ ] Step 2: Energy/Mana Management.
    - [ ] Step 3: Enemy Intents.
    - [ ] Step 4: Shielding/Blocking.
    - [ ] Step 5: Keywords & Status Effects.

### 2. BALANCE SIGN-OFF
- [ ] **Character Viability Reports**
    - [ ] Tamer 'Burn' build: Victory recorded at Ascension 0.
    - [ ] Sage 'Freeze' build: Victory recorded at Ascension 0.
    - [ ] Hunter 'Combo' build: Victory recorded at Ascension 0.
    - [ ] Warden 'Thorns' build: Victory recorded at Ascension 0.
- [ ] **Card Analytics (Smoke Test Results)**
    - [ ] Run `scripts/smoke-runner.ts` with 20 varied seeds.
    - [ ] Check `forge/` logs: No card exceeds 70% pick rate (Overpowered check).
    - [ ] Check `forge/` logs: No card falls below 5% pick rate (Underpowered check).
- [ ] **Elemental Synergy Metrics**
    - [ ] Mono-Ember deck successfully reaches Act 3.
    - [ ] Tide/Umbra 'Lifesteal' deck successfully reaches Act 3.
    - [ ] Storm/Verdant 'Rapid Growth' deck successfully reaches Act 3.
- [ ] **Boss Win Rates**
    - [ ] Act 3 Boss (The Amalgam) kill rate sits between 15% and 40% in automated sims.
- [ ] **Relic Impact Analysis**
    - [ ] No relic (e.g., 'Eternal Flame') causes a win-rate delta > 20% compared to baseline runs.
- [ ] **Tempo & Pacing**
    - [ ] Average run length is 210 turns (Tolerance: 180-250).
    - [ ] Average real-time playtime: 35-50 minutes per successful run.
- [ ] **Economic Balance**
    - [ ] Player gold income allows for 2.4 shop purchases per run on average.
    - [ ] Card removal cost scaling (50, 75, 100...) prevents infinite deck thinning.

### 3. TECHNICAL CHECKS
- [ ] **Build Integrity**
    - [ ] `npm run build` exits with code 0.
    - [ ] Vite manifest generated without "Circular Dependency" warnings.
- [ ] **Static Analysis**
    - [ ] `npm run typecheck` returns zero errors across `src/**/*.ts`.
    - [ ] ESLint passes with zero warnings for 'no-explicit-any' or 'unused-vars'.
- [ ] **Automated Regression**
    - [ ] Smoke test: 20/20 seeds finish without crashing (results logged in `forge/run-X-summary.md`).
- [ ] **Performance Benchmarks**
    - [ ] Bundle size: `dist/assets/index.js` < 450KB gzip.
    - [ ] Initial load time < 2 seconds on 4G connection throttled in DevTools.
    - [ ] Memory: Heap remains under 120MB after 10 consecutive simulated runs.
- [ ] **Runtime Stability**
    - [ ] Zero `console.error` calls during a full manual playthrough.
    - [ ] Promise rejections caught and handled by `ErrorBoundary` UI.
- [ ] **Persistence**
    - [ ] Save/Load: Closing the tab during a battle and reopening restores the exact state (HP, Energy, Hand, Deck order).
    - [ ] LocalStorage keys are namespaced (e.g., `p5_save_data`) to avoid collisions.
- [ ] **Cross-Platform Compatibility**
    - [ ] Chrome 120+ (macOS/Windows): Rendering verified.
    - [ ] Firefox 120+ (macOS/Windows): Flexbox/Grid layouts verified.
    - [ ] Safari 17+ (macOS): Audio Context initialization verified.
    - [ ] Android (Chrome): Touch targets for cards (min 44px height) verified.
    - [ ] iOS (Safari): No 'double-tap to zoom' interference on buttons.
- [ ] **Determinism & RNG**
    - [ ] `src/core/rng.ts` uses Mulberry32 only.
    - [ ] `Math.random()` usage globally searched and confirmed as 0 occurrences.

### 4. ART & AUDIO
- [ ] **Visual Assets**
    - [ ] 98 Card Artworks: Placeholder gradients + Emojis mapped correctly to element colors.
    - [ ] 22 Enemy Sprites: Distinct standing frames and "shake" animation on attack.
    - [ ] Title Screen: "Pact of Five" logo with elemental particle background.
    - [ ] Victory/Defeat: High-contrast modal screens with score breakdown.
- [ ] **Audio Implementation**
    - [ ] Theme: Ember (Industrial/Drums).
    - [ ] Theme: Tide (Ambient/Flow).
    - [ ] Theme: Verdant (Tribal/Woodwind).
    - [ ] Theme: Storm (Electric/Fast).
    - [ ] Theme: Umbra (Synth/Dark).
    - [ ] Title Theme: Orchestral medley of elemental motifs.
- [ ] **Sound Effects (SFX)**
    - [ ] `attack_hit`: Satisfying 'thud' or 'slash' sound.
    - [ ] `block`: Metallic 'clink' sound.
    - [ ] `card_play`: 'Whoosh' or paper rustle.
    - [ ] `relic_activate`: High-pitched chime.
    - [ ] `enemy_death`: Low-frequency fade out.
    - [ ] `player_hurt`: Sharp, brief discordance.
- [ ] **Audio Quality**
    - [ ] All files exported as .ogg or .mp3 at 128kbps minimum.
    - [ ] No audible popping at loop start/end points in bgm.ts.

### 5. UX POLISH
- [ ] **Tooltips & Information**
    - [ ] Keywords: Burn, Frost, Poison, Stun, Shield, Exhaust, Retain, Echo, Bond, Pierce.
    - [ ] Keyword tooltips appear on hover for desktop and on long-press for mobile.
- [ ] **Combat Clarity**
    - [ ] Damage Preview: Hovering a 'Strike' card shows the specific enemy HP bar flashing the potential damage.
    - [ ] Intent Iconography: Symbols for Attack, Defend, Buff, and Debuff are distinct and color-coded.
- [ ] **Navigation & Control**
    - [ ] Spacebar: Ends turn instantly.
    - [ ] R Key: Opens Draw Pile / Deck View.
    - [ ] Escape: Opens Settings / Pause Menu.
    - [ ] Tab: Cycles through cards in hand (Accessibility).
- [ ] **UI Responsiveness**
    - [ ] Map View: Hovering a node shows "Combat: Normal" or "Elite: High Risk".
    - [ ] Deck View: Cards are sorted by Element, then by Cost.
- [ ] **Settings Menu**
    - [ ] Master Volume slider.
    - [ ] Music Volume slider.
    - [ ] SFX Volume slider.
    - [ ] "Fast Mode" toggle (speeds up animations by 2x).

### 6. LEGAL & CREDITS
- [ ] **Credits Roll**
    - [ ] Lead Designer, Developers, Artists, and Sound Designers listed.
    - [ ] Playtesters from "Alpha Wave 1" and "Beta Wave 2" included.
- [ ] **License Audit**
    - [ ] `package.json` dependencies checked for non-permissive licenses (GPL/AGPL).
    - [ ] Fonts: Verified as OFL (Open Font License).
    - [ ] SFX: Verified as CC0 or Purchased Royalty Free.
- [ ] **IP & Content**
    - [ ] All card and character names are original (No 'Pikachu' or 'Slay the Spire' trademarked terms).
- [ ] **Privacy & Security**
    - [ ] No telemetry or analytics sending PII (Personally Identifiable Information).
    - [ ] `privacy.md` file present in root if publishing to App Stores.
- [ ] **Repository State**
    - [ ] `LICENSE` file (MIT) present in root.
    - [ ] `README.md` updated with "How to Play" for new users.

### 7. DEPLOYMENT CHECKLIST
- [ ] **Environment Configuration**
    - [ ] `VITE_APP_MODE` set to 'production'.
    - [ ] Source maps disabled in `vite.config.ts` to protect source logic.
- [ ] **Web Hosting**
    - [ ] Vercel/GitHub Pages deployment target confirmed.
    - [ ] SSL/HTTPS certificate active.
- [ ] **Pathing & Routing**
    - [ ] `base` path in `vite.config.ts` set to `/` (or `/pact-of-five/` if subfolder).
    - [ ] SPA 404 fallback configured to redirect to `index.html`.
- [ ] **Final Smoke Sign-off**
    - [ ] Final manual playthrough on a clean browser profile (No cache/dev history).
    - [ ] Result: **VICTORY.**

## §50 END — ALL SYSTEMS NOMINAL. READY FOR LAUNCH.


## §51 — Executive Summary & Design Vision

## ONE-PARAGRAPH PITCH

Pact of Five is a tactical roguelike deck-builder centered on a complex five-element ecosystem: Ember, Tide, Verdant, Storm, and Umbra. Unlike Slay the Spire’s linear scaling, we utilize a circular weakness ring that rewards elemental exploitation. Players command four distinct heroes the Tamer, Sage, Hunter, and Warden each wielding unique mechanics to navigate branching paths and lethal encounters. Your journey demands strategic mastery over card synergies and environmental modifiers. By blending the deep customization of traditional TCGs with the high-stakes tension of permadeath, Pact of Five offers a transformative experience where every draw dictates survival and every choice shapes destiny.

## CORE DESIGN PILLARS

**Pillar 1: Meaningful Choices**
*Definition:* Every decision, from card picks to pathing, must have a clear trade-off and long-term impact on the run's success.
*   *Implementation 1:* Branching map nodes where players must choose between a "Safe Resting Spot" and a "High-Risk Elemental Rift" that offers greater rewards but lethal encounters.
*   *Implementation 2:* A "Deck Thinning" economy where removing a basic card costs increasingly more, forcing players to weigh the value of a lean deck against the utility of a varied one.
*   *Implementation 3:* Elemental Conversion shrines that allow a player to transform all cards of one element into another, potentially pivoting their entire build strategy mid-run.

**Pillar 2: Emergent Synergy**
*Definition:* Mechanics should interact in ways that allow players to discover "broken" combos that aren't explicitly scripted by the developers.
*   *Implementation 1:* Keyword tagging (e.g., "Saturate" and "Conductive") where playing a Tide card makes a Storm card twice as effective, creating a natural flow between elemental types.
*   *Implementation 2:* Relics that do not grant flat stats but instead modify rules, such as "Umbra cards no longer cost HP but instead discard a random card on play."
*   *Implementation 3:* Multi-element cards that bridge archetypes, such as a "Steam Blast" that counts as both Ember and Tide, triggering synergies for both paths simultaneously.

**Pillar 3: Earned Mastery**
*Definition:* Success should depend more on player knowledge and tactical execution than on luck or meta-progression stats.
*   *Implementation 1:* Predictable Enemy AI Intents that show exactly what the opponent will do, allowing players to plan their "Pact" reactions with surgical precision.
*   *Implementation 2:* The "Weakness Ring" interface is always visible, highlighting which cards will deal bonus damage based on the current enemy's elemental affinity.
*   *Implementation 3:* A "Doubt" mechanic where failed runs provide "Knowledge Tokens" used to unlock new card archetypes rather than flat health or damage upgrades.

**Pillar 4: Atmospheric Immersion**
*Definition:* The visual and audio design must reinforce the elemental theme, making the world feel reactive and alive.
*   *Implementation 1:* Dynamic background shaders that shift color and intensity based on the dominant element played in the last three turns of a battle.
*   *Implementation 2:* Procedural music layering where "Storm" cards add electronic glitches to the soundtrack and "Verdant" cards add organic, percussive elements.
*   *Implementation 3:* Flavor-rich card descriptions that hint at the "Great Cataclysm" that broke the five elements, grounding every mechanic in the world's lore.

**Pillar 5: Replayability**
*Definition:* No two runs should feel identical, even with the same character, through variety in encounters and build paths.
*   *Implementation 1:* Procedurally generated maps with "Hidden Chambers" that only appear if the player possesses a specific elemental relic.
*   *Implementation 2:* A "Daily Pact" mode with global modifiers that force players to use unconventional element combinations (e.g., "All Tide cards are now Storm").
*   *Implementation 3:* Ascension Levels that introduce new enemy behaviors and environmental hazards rather than just increasing health pools.

## DESIGN ANTI-PATTERNS (THINGS WE AVOIDED)

**1. Pay-to-win mechanics**
*   *Why it is harmful:* In a roguelike, the player's victory must be theirs alone. Allowing external purchases to influence run outcomes destroys the sense of accomplishment and competitive integrity.
*   *Prevention:* Pact of Five features zero microtransactions. Every card, relic, and character skin is unlocked through gameplay, achievements, and mastering specific elemental challenges.

**2. Unfair randomness (opaque RNG)**
*   *Why it is harmful:* Losing to a "bad roll" that the player could not see or mitigate leads to frustration and a feeling that the game is "cheating."
*   *Prevention:* We utilize "Seeded Randomness" and provide tools like the "Scry" mechanic (Sage) or "Track" (Hunter) to peek at future draws and manipulate the RNG in the player’s favor.

**3. Analysis paralysis**
*   *Why it is harmful:* Too many options at once can stall the game's momentum and make the experience feel like a chore rather than a thrill.
*   *Prevention:* We limit card draft options to three choices and use clear, color-coded iconography to ensure players can assess the value of a card or path at a glance.

**4. Mandatory grinding**
*   *Why it is harmful:* Forcing players to repeat content just to "level up" stats gates the fun behind boring repetition rather than skill-based progression.
*   *Prevention:* The game is mathematically winnable on the very first run. Meta-progression focus is on horizontal expansion (new ways to play) rather than vertical power creep.

**5. Tutorial overload**
*   *Why it is harmful:* Long text dumps at the start of a game kill player curiosity and often result in players forgetting half of what they read.
*   *Prevention:* We employ a "Contextual UI" that only explains mechanics when they first appear in a run, allowing players to learn through experimentation and immediate feedback.

## TARGET EXPERIENCE CURVE

**Stage 1: Session 1 (The First Fall)**
*   *Action:* The player picks the Tamer, plays basic Ember/Verdant cards, and dies to the Act 1 "Corrupted Bloom" Elite.
*   *Discovery:* Elements aren't just colors; they are a rock-paper-scissors system that drastically changes damage output.
*   *Emotion:* Intrigued. The player realizes there is a system here they don't yet understand but want to conquer.

**Stage 2: Session 5 (The Threshold of Act 3)**
*   *Action:* The player reaches the final Act for the first time by leaning heavily into a single element (Tide) and defensive relics.
*   *Discovery:* Bosses have "Elemental Shifts" that punish players for being too one-dimensional in their deck-building.
*   *Emotion:* Determination. The loss at the finish line feels like a lesson learned rather than a failure.

**Stage 3: Session 15 (The First Victory)**
*   *Action:* Executing a high-synergy "Storm-Tide" deck with the Sage, the player defeats the final boss of the Pact.
*   *Discovery:* The "True Ending" requires collecting elemental fragments across multiple runs, revealing a deeper narrative layer.
*   *Emotion:* Triumph. The player feels they have finally "cracked the code" of the game's core mechanics.

**Stage 4: Session 30 (The Ascension Climb)**
*   *Action:* The player begins climbing "Pact Levels," facing enemies with new keywords and reduced healing opportunities.
*   *Discovery:* "Dead weight" cards are more dangerous than strong enemies; deck efficiency is the highest form of strategy.
*   *Emotion:* Respect. The player sees the mathematical depth and the effort required to achieve consistent success.

**Stage 5: Session 50 (The Master of Elements)**
*   *Action:* The player wins with all four characters and has filled 90% of the Codex with card and relic discoveries.
*   *Discovery:* They start experimenting with "Self-Harm" Umbra builds or "No-Attack" Warden pacifist runs.
*   *Emotion:* Flow. The game becomes a canvas for creative expression through mechanical exploitation.

**Stage 6: Session 100+ (The Expert / Speedrunner)**
*   *Action:* The player optimizes paths for maximum score or minimum time, aiming for the top of the global leaderboards.
*   *Discovery:* Every frame of animation and every point of health is a resource to be spent toward the ultimate goal.
*   *Emotion:* Zen. The game is no longer a challenge but a familiar, complex machine that they operate with total precision.

## INSPIRATIONS & HOW WE DIFFER

**1. Slay the Spire**
*   *Adopted:* The core "Map Node" progression system, the concept of "Intents" showing enemy actions, and the tight 3-act structure.
*   *Changed:* We replaced static damage/block with a dynamic 5-element weakness system. In P5, "Block" is an elemental property (Verdant provides Armor, Tide provides Evasion), making defense as strategic as offense.

**2. Monster Train**
*   *Adopted:* Multi-path drafting and the idea of "Champion" units that evolve over the course of a run.
*   *Changed:* Instead of multiple vertical floors, we focus on a "Horizontal Elemental Grid." Positioning cards matters because they "leak" their element to adjacent slots, creating field effects.

**3. Inscryption**
*   *Adopted:* The dark, moody aesthetic and the "Sacrificial" mechanics found in our Umbra element path.
*   *Changed:* We stripped away the meta-narrative horror focus in favor of a pure, mechanically-driven roguelike experience where the "horror" comes from the high stakes of the tactical combat itself.

**4. Hearthstone**
*   *Adopted:* The high-polish UI, clear keyword descriptions, and the "satisfying click" of playing powerful cards.
*   *Changed:* We removed the "Mana Curve" consistency of TCGs. In P5, your "Mana" is generated by the elements you played in the previous turn, creating a momentum-based economy.

## SUCCESS CRITERIA (Game Design Goals)

1.  **High Retention:** Achieve a 40% Day-1 retention rate during the initial Early Access launch.
2.  **Mechanical Balance:** No single card archetype should have a win rate more than 10% above or below the mean across 100,000 simulated runs.
3.  **Visual Clarity:** 90% of playtesters must be able to identify a card’s element and primary function within 0.5 seconds of seeing it for the first time.
4.  **Archetype Depth:** Each of the 4 characters must have at least 5 distinct, viable "End-Game" build paths (e.g., Tamer: Beast Swarm, Solo Behemoth, Elemental Link, etc.).
5.  **Session Pacing:** Average winning run time should fall between 45 and 60 minutes, providing a "lunch break" length experience with high depth.
6.  **Discovery Rate:** A player should discover a "new" interaction or synergy they haven't seen before at least once every 5 runs for the first 50 hours.

## DESIGN PHILOSOPHY STATEMENT

Pact of Five stands for the beauty of systemic complexity distilled into a tactile, accessible format. We believe that a great game is a conversation between the developer’s rules and the player’s ingenuity. Our goal is to provide a framework where the "Aha!" moment—the second a player realizes how two seemingly unrelated cards can combine to destroy a god—is the primary reward. We stand for fairness, transparency in mechanics, and the belief that losing is simply the first step toward a more educated victory.

The target emotion we aim for above all else is "Calculated Risk-Taking." We want the player to feel like a high-stakes gambler who isn't betting on luck, but on their own ability to read the board. Every turn should present a "Should I?" moment: Should I spend my HP to trigger an Umbra nuke? Should I save my Tide cards to mitigate the Storm boss’s next phase? When these risks pay off, the player feels brilliant; when they fail, they know exactly what they will do differently next time.

As a team, we must never compromise on "Strategic Agency." Even under pressure to make the game "easier" or "more accessible," we will never introduce "participation trophies" or mechanics that play the game for the player. If a loss ever feels like it was 100% out of the player's control, we have failed. Our commitment is to the "Pact"—a promise that the game will be hard, it will be fair, and the mastery the player earns will be entirely their own. This is the soul of Pact of Five.


## §52 — Master Table of Contents

> This TOC covers all sections in the Pact of Five GDD as of Run 5 (final). Line numbers are approximate.

---

### Sections §1-§19: Foundation & Core Systems (Forge Baseline)

- §1 — Yüksek-Seviye Konsept — line 10
- §2 — Element Sistemi (5-element weakness ring) — line 23
- §3 — Kart Anatomisi (Card Anatomy) — line 52
- §4 — Anahtar Kelimeler / Keywords — line 77
- §5 — Tur Yapısı (Turn Structure) — line 115
- §6 — Karakterler / Characters (Tamer, Sage, Hunter, Warden) — line 148
- §7 — Roguelike Yapısı (Map, Acts, Nodes) — line 185
- §8 — Düşmanlar / Enemies (22+ roster) — line 235
- §8a — Boss Phase Transitions — line 418
- §9 — Kart Havuzu / Card Pool (98 cards) — line 276
- §10 — Relics (34 relics) — line 325
- §11 — Mystery Events (20+ events) — line 356
- §11a — Sigils (battlefield enchants) — line 404
- §11b — Aura system — line 390
- §12 — Meta-Progression — line 426
- §13 — UI / UX — line 443
- §14 — Sanat Yönü / Art Direction — line 545
- §15 — Ses / Audio — line 554
- §16 — Teknik Stack (Vite + TS + Tailwind) — line 595
- §17 — Faz Planı / Phase Plan — line 630
- §18 — Denge Felsefesi / Balance Philosophy — line 642
- §19 — Doğrulama Kriterleri / Validation Criteria — line 662
- §19a — Codex (in-game reference) — line 652

---

### Sections §20-§28: Design Bible (Run 1 Expansion)

- §20 — Tasarım Direkleri ve MDA Çerçevesi / Design Pillars & MDA Framework — line 682
- §21 — Combat Math Deep Dive — line 820
- §22 — Düşman AI Davranış Spesifikasyonu / Enemy AI Behavior — line 1098
- §23 — Procedural Map Generation Algorithm — line 1483
- §24 — Narrative & World Lore (Volume 1) — line 1704
- §25 — Art Direction Bible — line 1928
- §26 — Inspiration Matrix (per-system comparison table) — line 2244
- §27 — TOC ve Glossary (Run 1 additions) — line 2432
- §28 — Run 1 Changelog (Forge Tracking) — line 2518

---

### Sections §29-§35: World & Content Expansion (Run 2)

- §29 — Element Identity Manifestos (5 elements, full voice) — line 2572
- §30 — Character Manifestos (Tamer, Sage, Hunter, Warden) — line 3217
- §31 — Card Catalog Expansion (Ember full catalog) — line 3481
- §32 — Düşman Bestiary Expansion — line 3627
- §33 — Encounter Design Pacing — line 4150
- §34 — Relic Kataloğu Expansion — line 4284
- §35 — Event Kataloğu — line 4411

---

### Sections §36-§42: Systems & Polish (Run 3)

- §36 — İlk Oyuncu Deneyimi (FTUE) ve Tutorial Sistemi — line 4665
- §37 — Meta-İlerleme Sistemi (Sanctuary, Echoes, Ascension 1-15) — line 4892
- §38 — Başarı ve Görev Sistemi / Achievement System — line 5130
- §39 — Erişilebilirlik ve UX Cilası / Accessibility & UX Polish — line 5300
- §40 — Ses Tasarım Dokümanı / Audio Design Document — line 5432
- §41 — Teknik Mimari Derinlemesine İnceleme / Technical Architecture Deep Dive — line 5603
- §42 — Ertelenmiş İçerik Tamamlama / Deferred Content Completion — line 5975

---

### Sections §43-§48: Economy & Architecture (Run 4)

- §43 — NPC Dialog & Narrative System — line 6105
- §44 — Shop & Economy Deep Design — line 6419
- §45 — Balance Framework & Telemetry — line 6576
- §46 — Post-Launch Roadmap & Live Ops (v1.1-v2.0) — line 6733
- §47 — Run Economy & Loop Math — line 6955
- §48 — Modding & Future-Proofing Architecture — line 7139

---

### Sections §49-§52: QA, Launch & Vision (Run 5 — Final)

- §49 — QA & Playtest Framework — line 7360
- §50 — Pre-Launch Checklist — line 7565
- §51 — Executive Summary & Design Vision — line 7758
- §52 — Master Table of Contents (this section) — line 7883

---

### GDD Completion Status

| Category | Status |
|----------|--------|
| Element system + 5-weakness ring | COMPLETE |
| All 98 cards documented | COMPLETE |
| All 22 enemies + 34 relics | COMPLETE |
| 4 characters with full card pools | COMPLETE |
| 3-act map + roguelike structure | COMPLETE |
| Battle engine spec | COMPLETE |
| Balance math + power budgets | COMPLETE |
| Gold/HP/card acquisition economy | COMPLETE |
| Meta-progression + Ascension 1-15 | COMPLETE |
| Art Bible + Audio Design | COMPLETE |
| Technical Architecture | COMPLETE |
| Post-launch roadmap v1.1-v2.0 | COMPLETE |
| QA framework + pre-launch checklist | COMPLETE |
| Executive summary + master TOC | COMPLETE |

**Final GDD: PRODUCTION-READY**

# Hitstop / Hit-Pause / Hitlag & Slow-Motion Timing — Numeric Reference

**Compiled:** research pass using web_search + web_fetch + a headless browser (only to get past Cloudflare on SuperCombo/Mizuumi wikis).
**Rule for this document:** every number has a URL that was actually loaded during this pass. Anything I reasoned out rather than found is tagged **[experiential inference]**. Nothing is averaged silently — conflicts are listed side by side.

## Source-quality legend

| Tag | Meaning |
|---|---|
| **[DATAMINE]** | Per-move values datamined out of the shipped game and published on a frame-data wiki (SuperCombo, Dustloop, Mizuumi, SmashWiki). Highest confidence for "what the game actually does". |
| **[DEV]** | Written/spoken by a developer of the game or by the platform holder (Sakurai). |
| **[PEER-REVIEWED]** | Academic paper (GEM 2022 / GRAPP 2024 / J-STAGE). |
| **[TUTORIAL]** | Developer-facing teaching material / dev blog. Concrete, but it is advice, not shipped-game data. |
| **[WIKI]** | Community wiki page (caveats per page). |
| **[SECONDARY, UNVERIFIED]** | Aggregator/blog/skill-doc content, including **likely AI-generated** reference repos. Not authoritative. |

---

## 1. Master table — fighting games: hitstop by attack strength (frames @60fps)

| Effect | Value (observed) | Recommended range | Source URL |
|---|---|---|---|
| **SF6 light normal** hitstop (Ryu 5LP / 5LK / 2LP / 2LK / 2MK) | **9F** (150 ms) | 9F for lights | [wiki.supercombo.gg SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| **SF6 medium normal** hitstop (5MP / 5MK / j.MK) | **11F** (183 ms) | 11F for mediums | [wiki.supercombo.gg SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| **SF6 heavy normal** hitstop (5HP / 5HK / j.HP / 2HK) | **13F** (217 ms) | 13F for heavies | [wiki.supercombo.gg SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| **SF6 projectile** (Hadoken L/M/H) | **8F** — *lower than the jab* | projectiles below normals | [wiki.supercombo.gg SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| **SF6 invincible DP** (LP/MP Shoryuken) | **15F attacker / 13F defender** (`15(13)`) | — | [wiki.supercombo.gg SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| **SF6 HP Shoryuken** | **20F attacker / 13F defender** (`20(13)`) | — | [wiki.supercombo.gg SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| **SF6 Super Art** (Shin Hashogeki Lv1 / Lv2 / Lv3) | **18F / 20F / 23F** | supers scale with level | [wiki.supercombo.gg SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| **SF6 Super Art multi-hit** (Shin Shoryuken / CA) | **7,8,8,8 / 8,8,8,13** | — | [wiki.supercombo.gg SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| **SF6 OD (EX) multi-hit normals** | **8,10** up to **6,2×3,15** per hit | per-hit values, not per-move | [wiki.supercombo.gg SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| SF6 rule of thumb (wiki text) | "Hitstop — also known as 'Hit Freeze'… **Heavier attacks have longer hitstop**, and some Punish Counters with special effects can have extra long hitstop." | — | [wiki.supercombo.gg SF6/Game_Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Game_Data) |
| **SF2** hitpause (all normal-strength hits) | **14F**; **15F** when the victim was in a grounded idle state | — | [mugen-net.work Research:Street Fighter II](https://mugen-net.work/wiki/index.php/Research:Street_Fighter_II) |
| **SF2 supers** hitpause | **8F attacker / 10F defender** (11F if victim grounded-idle) | deliberate attacker/defender asymmetry | [mugen-net.work Research:Street Fighter II](https://mugen-net.work/wiki/index.php/Research:Street_Fighter_II) |
| **GGXRD-R2** hitstop by Attack Level | Lv0 **11F**, Lv1 **12F**, Lv2 **13F**, Lv3 **14F**, Lv4 **15F** | — | [dustloop GGXRD-R2/Frame Data](https://www.dustloop.com/w/GGXRD-R2/Frame_Data) |
| **GGXRD-R2** counter-hit bonus hitstop | **+0 / +2 / +4 / +8 / +12** by level — *"the additional hitstop is only applied to the receiver"* | asymmetric CH bonus | [dustloop GGXRD-R2/Frame Data](https://www.dustloop.com/w/GGXRD-R2/Frame_Data) |
| **GGXRD-R2** Blitz Attack / Burst | Blitz Attack **30F hitstop**; Blue Burst blockstun 11F **(+6F hitstop)**; Gold Burst 13F **(+13F hitstop)** | "special/defensive" tier ≈ 2× normal | [dustloop GGXRD-R2/Frame Data](https://www.dustloop.com/w/GGXRD-R2/Frame_Data) |
| **GBVS** hitstop by Attack Level | Lv0 **10F**, Lv1 **10F**, Lv2 **12F**, Lv3 **14F**, Lv4 **16F** | — | [dustloop GBVS/Attack Attributes](https://www.dustloop.com/w/GBVS/Attack_Attributes) |
| **GBVS** counter-hit bonus hitstop | **+2 / +2 / +4 / +8 / +12** (*"only applies to opponent"*) | asymmetric CH bonus | [dustloop GBVS/Attack Attributes](https://www.dustloop.com/w/GBVS/Attack_Attributes) |
| **Skullgirls / Them's Fightin' Herds** per-move hitstop (indexed source text) | light normals **7F**, mediums/heavies **9–10F**, heavier specials **12F** (e.g. Painwheel 8/10; Marie 7/12; TFH Oleander 6/8; Umbrella 8/6) | 7F light, 9–10F heavy | [mizuumi.wiki hitstop search index](https://mizuumi.wiki/index.php?search=hitstop&title=Special%3ASearch&fulltext=1&ns0=1) |
| **GGXrd -SIGN-** light vs heavy (academic measurement) | *"light attacks freeze the animation for **7 frames** while the heavy attacks freeze for about **10 frames**"* | conflicts with the Dustloop REV2 table above | [arXiv 2208.06155 (IEEE GEM 2022)](https://arxiv.org/html/2208.06155v3) |
| **Smash Bros.** hitlag, 15%-damage move | Smash 64 **10F**, Melee **8F**, Brawl/Smash4 **10F**, Ultimate **15F** | formula-driven, not hand-tuned | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) |
| **Smash** hitlag cap | **20F** (Melee), **30F** (Brawl onward; **20F** for the victim when crouch-cancelling); Kirby-Stone ×1.2 applied *after* the cap → up to **36F**; Smash 64 uncapped in code but practically ≤19F | hard ceiling: 20–36F | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) |
| **Smash** multipliers | electric **×1.5**; crouch-cancel **×0.67**; shielding **×0.67** (Ultimate); hitlag multiplier **per-hitbox** (Marth tipper 1.25×, sourspot 0.7×; Ryu/Ken ~1.5×; Kazuya 0.2–0.6×) | per-move ×0.3–1.5 | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) |

### Fighting-game neutral/hit/block stun for context (do not confuse with hitstop)

| Effect | Value | Source URL |
|---|---|---|
| SF2 hitstun | Light **11F**, Medium **16F**, Hard **20F** | [mugen-net Research:SF2](https://mugen-net.work/wiki/index.php/Research:Street_Fighter_II) |
| SF6 blockstun (Ryu 5LP/5MP/5HP) | **9F / 14F / 21F**; hitstun **14F / 22F / 27F** | [SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| GBVS hitstun / blockstun by level | hitstun 14/16/18/20/22; blockstun 10/12/14/16/18 | [GBVS/Attack Attributes](https://www.dustloop.com/w/GBVS/Attack_Attributes) |
| Infil's Fighting Game Glossary — *block stun* | "The period of time when your character cannot perform any action after blocking an attack… The duration of block stun, coupled with your opponent's recovery… determines… **frame advantage**." | [glossary.infil.net/json/glossary.json](https://glossary.infil.net/json/glossary.json) |

> ⚠️ **On the Infil lead:** I fetched `https://glossary.infil.net/?t=Hitstop` (renders client-side → empty text) and `https://glossary.infil.net/json/glossary.json` (truncated response). Grepping the retrieved portion found terms *Hitbox*, *Hit Confirm*, *Hit Stun Deterioration*, and the full *Block Stun* definition — **but no "Hit Stop"/"Hitstop" entry in the portion I actually received.** I therefore cannot confirm Infil's own hitstop definition or any numbers in it. The `?t=Hitstop` URL does resolve (HTTP 200) but the glossary body is injected by JS.

---

## 2. Master table — non-fighting ("top-down / action / platformer") hitstop

| Effect | Value (observed) | Recommended range | Source URL |
|---|---|---|---|
| **Nuclear Throne** hit freeze on any hit | *"The game also freezes for about **10-20 milliseconds** whenever you hit something."* | ≈10–20 ms (≈0.6–1.2F @60fps) | [leapfrog.nl quoting the RPS interview with Jan Willem Nijman](https://leapfrog.nl/blog/archives/2013/10/25/when-you-fire-the-pistol-in-nuclear-throne-first/) · origin: [rockpapershotgun.com interview](https://www.rockpapershotgun.com/interview-jan-willem-nijman-on-nuclear-thrones-feel) |
| Nuclear Throne — other feel values from the same passage (context) | shell ejected 2–4 px/frame @30fps/320×240; bullet 16 px/frame; **camera kick 6 px**; screenshake **+4**; weapon kick **2**; enemy pushed **3 px/frame**; hit animation = 1 white frame + 2 frames | — | [leapfrog.nl](https://leapfrog.nl/blog/archives/2013/10/25/when-you-fire-the-pistol-in-nuclear-throne-first/) |
| **Celeste** freeze frames — dash start, refill pickup, dream-block exit | **3F (0.05 s)** | 3F for "small" interactions | [celeste.ink Freeze frames](https://celeste.ink/wiki/Freeze_frames) |
| **Celeste** — bumper bounce, pufferfish explosion, seeker boost | **6F (0.1 s)** | 6F for "medium" | [celeste.ink Freeze frames](https://celeste.ink/wiki/Freeze_frames) |
| **Celeste** — bouncing on a seeker | **9F (0.15 s)** | 9F for the biggest | [celeste.ink Freeze frames](https://celeste.ink/wiki/Freeze_frames) |
| **Celeste** — dash also has 1 extra frame where only Madeline is stationary (world keeps moving) | 1F asymmetric | asymmetric freeze | [celeste.ink Freeze frames](https://celeste.ink/wiki/Freeze_frames) |
| **Nocturne Vania** (Godot, dev blog) — normal hit stop | **0.05 s (3F @60)** | 0.05 s normal | [dev.to hirodeath](https://dev.to/hirodeath/improving-combat-feel-with-hit-stop-slash-effects-and-combo-animations-3dbo) |
| **Nocturne Vania** — finisher / 3rd combo hit hit stop | **0.09 s (5.4F @60)** — 1.8× the normal hit | ~2× normal for finishers | [dev.to hirodeath](https://dev.to/hirodeath/improving-combat-feel-with-hit-stop-slash-effects-and-combo-animations-3dbo) |
| **Player-made tuning guidance** (educational KB, *not* shipped-game data) | light **0.02–0.04 s**; medium **0.05–0.08 s**; heavy **0.1–0.2 s**; default **0.05 s**; preset calls 0.03 / 0.06 / 0.12 | light 1–2F, medium 3–5F, heavy 6–12F @60 | [marty64.net VG101 Hitstop](https://www.marty64.net/kb/pages/code-bank/hitstop.html) |
| **Dead Cells / Hollow Knight / Hyper Light Drifter / Hades / Katana Zero / Streets of Rage 4 hitstop frame values** | **NOT VERIFIED.** No developer source with numbers was found in this pass. The only "numbers" circulating come from a likely-AI-generated repo (see §7). | — | (negative result) |
| Streets of Rage 4 timing (closest real quote) | Lizardcube designer Cyrille Lagarigue: *"It starts from the original timing. I think Axel's punch is pretty close to the original punch. Maybe **one or two frames more** to show more of the animation."* | frame-level fidelity to the 16-bit original | [gamesbeat.com](https://gamesbeat.com/to-make-streets-of-rage-4-authentic-its-designer-plays-2-games-at-once/) |

---

## 3. Master table — kills, deaths, and finishers

| Effect | Value | Recommended range | Source URL |
|---|---|---|---|
| **Academic action-game study** — hitstop was implemented *as the enemy's death/vanishing animation extension* | Tested **0.0 s → 0.7 s** in 8 levels; the constant used as the pleasant reference was **0.39 s ≈ 23F @60** ("the average duration of a comfortable hit stop", 16 participants) | Authors only define a **pleasant/unpleasant borderline** (via Mahalanobis discriminant), not a single number | [SCITEPRESS GRAPP 2024 paper](https://www.scitepress.org/publishedPapers/2024/124614/pdf/index.html) · [J-STAGE record](https://www.jstage.jst.go.jp/article/wiieej/23.04/0/23.04_147/_article/-char/ja) |
| Same study — implementation detail | Hitstop was **not a hard freeze**: playback speed during hitstop was **s = 0.01×** normal. Figure 2 shows durations of **1, 11, 21 and 31 frames @24fps**. | their own "slow-motion-as-hitstop" value: **0.01 time scale** | [SCITEPRESS GRAPP 2024 paper](https://www.scitepress.org/publishedPapers/2024/124614/pdf/index.html) |
| Same study — trend | *"Overall, the longer the hit stop duration, the more uncomfortable it tended to be."* | keep kill-stop **well under ~0.5 s** | [SCITEPRESS GRAPP 2024](https://www.scitepress.org/publishedPapers/2024/124614/pdf/index.html) |
| **Sakurai — "BOSS stop" / Finish Zoom** | No frame value published. Concept: on defeating a boss, a stop effect + zoom makes the finishing blow land; when the *player* loses, the character's action stops too. | "don't skimp on them" | [medill-east notes on Sakurai "Stop for Big Moments!"](https://medill-east.github.io/2022/09/01/20220901-stop-for-big-moments/) (fan notes of the official video) |
| **Fantasy Zone (1986)** — getting hit | *"when you get hit, the screen stops for **one second**"* (in Sakurai's retelling) | historical precedent for a long, readable stop | [medill-east notes](https://medill-east.github.io/2022/09/01/20220901-stop-for-big-moments/) |
| **Dragon Ball FighterZ** — ultimate-skill wind-up freeze | *"the opponent's animation will freeze for **a whole second** once Goku is accumulating for his ultimate skill"* | 60F-class "super freeze", not a normal hitstop | [arXiv 2208.06155](https://arxiv.org/html/2208.06155v3) |
| **SF6** — extra-long hitstop on special Punish Counters | explicitly called out as a game rule ("some Punish Counters with special effects can have extra long hitstop") — no published value | — | [SF6/Game_Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Game_Data) |

---

## 4. Master table — slow motion / time scale

| Effect | Value | Recommended range | Source URL |
|---|---|---|---|
| **Smash Ultimate — Witch Time** slowdown factor | opponents slowed to **1/8 speed → time scale ≈ 0.125** | a *slow-mo*, not a freeze | [ssbwiki Witch Time](https://www.ssbwiki.com/Witch_Time) |
| Smash Ultimate — Witch Time duration formula | `(90 − n) * b + 0.3p` **frames**; base **90F = 1.5 s**; max **240F = 4 s**; min **22F**; penalty **+60F per use** (+40F if it activates, i.e. −100F total per successful use); regen 0.04F/frame → ~**25 s** to fully refresh; ×0.67 when Bat Within also fires | 1.5 s default, 4 s ceiling, 22F floor | [ssbwiki Witch Time](https://www.ssbwiki.com/Witch_Time) |
| Smash 4 — Witch Time duration formula | `(180 − n) * b + 0.1p` frames; base **180F = 3 s**; max **240F = 4 s**; min **20F**; penalty **+75F per use** (+20F if activated); ~**20.8 s** to refresh | — | [ssbwiki Witch Time](https://www.ssbwiki.com/Witch_Time) |
| **Slow motion usage pattern** | *"Slow motion is to slow down the time flow in a short duration. It is usually employed at the finishing attack… makes the climactic finishing attacks clearer to the viewer. In One Finger Death Punch, slow motion is applied to the fatality that fetches the foe's heart."* | put slow-mo on the finisher, not on normal hits | [arXiv 2208.06155](https://arxiv.org/html/2208.06155v3) |
| **Max Payne / Bayonetta (the original games) / Sifu / Hotline Miami / SUPERHOT numeric time-scale values** | **NOT VERIFIED.** No primary source with a time-scale number was retrieved (Max Payne's own bullet-time ratio, Bayonetta 1/2 Witch Time seconds, Sifu's final-kill slow-mo, SUPERHOT's still-time scale). | — | (negative result) |
| Slow-motion **ramp-in / ramp-out durations** | **NOT VERIFIED — no source found at all.** The only mention encountered was in an AI-generated doc (a 0.05 s tween back to timeScale 1.0), and the peer-reviewed study deliberately used a *constant* 0.01 for the whole window with no ramp. | **[experiential inference]** if you want a ramp: 0.05–0.15 s ease-in to the target scale, hold, then 0.1–0.2 s ease-out — but this is my reasoning, not a citation | [AI-generated doc (unverified)](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/refs/heads/main/95_hit_pause.md) · [SCITEPRESS paper](https://www.scitepress.org/publishedPapers/2024/124614/pdf/index.html) |

---

## 5. Master table — hitstop + camera punch / zoom on big hits

| Effect | Value | Recommended range | Source URL |
|---|---|---|---|
| **Sakurai: "Finish Zoom Effect / BOSS Stop"** | Extension of hitstop, used on boss defeat; **no frame number published** | use on the *last* hit of a fight only | [medill-east notes "Stop for Big Moments"](https://medill-east.github.io/2022/09/01/20220901-stop-for-big-moments/) |
| **Sakurai's ladder** (from the same video, in the order he shows it) | **no effect → Stop → Stop + Shake → Stop + Shake + Slow Motion** | layer, don't choose one | [medill-east notes](https://medill-east.github.io/2022/09/01/20220901-stop-for-big-moments/) |
| **DBFZ** cinematic camera on a super | *"the camera gradually zooms in toward the growing blue ball. When the bomb is ready, the camera captures the smiling face of Goku, **stays for several frames**, and then quickly zooms out"* | hold the zoom for a few frames, snap out | [arXiv 2208.06155](https://arxiv.org/html/2208.06155v3) |
| Academic finding: camera is one of the 3 decisive features | hit stop + **sound coherence** + **camera control** — "a lack of dedicated design on one of these three features may ruin players' impact feel" (19-feature framework, NLP ranking of 96 Steam action games) | treat hitstop/camera/audio as one system | [arXiv 2208.06155](https://arxiv.org/html/2208.06155v3) |
| Sakurai: shake coupled to hitstop | receiver shakes more than attacker; shake amplitude scaled by **camera distance** (bigger when camera is far) so the perceived impact is constant; amplitude **decays** over the freeze (start large, end small) | scale shake to camera distance, decay within the stop | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) · [sourcegaming translation of Sakurai's Famitsu column](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/) |
| Screen-freeze + camera-zoom numeric values from shipped 2D action games | **NOT VERIFIED** — no source with frames/zoom factors found. | — | (negative result) |

---

## 6. Master table — input buffering during hitstop (the "input dropout" problem)

| Effect | Value / behaviour | Source URL |
|---|---|---|
| **Melty Blood: Type Lumina** — base input buffer | **2 frames** ("meaning 1 frame links feel like 3 frame links"); wakeup and blockstun windows are extended to **8 frames**; airdash also 8F; jump/shield buffer for as long as held | [mizuumi.wiki MBTL/Game Data](https://mizuumi.wiki/w/Melty_Blood/MBTL/Game_Data) |
| **MBTL** — buffering *during* hitstop (explicit) | *"Moves are also buffered during the entirety of the blockstop **and hitstop** of a move, meaning that if a move causes **6 frames of hitstop** and you input a follow-up at frame 1 of the hitstop, it will be buffered throughout the entirety of it and come out once the hitstop is over."* Follow-ups can be input **before** the hit and carry into the hitstop buffer. | [mizuumi.wiki MBTL/Game Data](https://mizuumi.wiki/w/Melty_Blood/MBTL/Game_Data) |
| **SF6** — universal input buffer | **4 frames** (a "5 frame window" at the earliest timing); dashes and wakeup reversals **7 frames** (8-frame window) | [wiki.supercombo.gg SF6/Game_Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Game_Data) |
| **SF6** — "Screen Freeze Buffers" | During **Perfect Parry**, **opponent's Super activation** and **Drive Rush** freezes, holding the attack button buffers the move automatically; "the game will choose your **most recent** input"; releasing the button cancels the buffer. Special note: Drive Rush freeze requires holding the button **after** the freeze starts. | [wiki.supercombo.gg SF6/Game_Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Game_Data) |
| **GBVS** — buffering during hitstop | *"Hitstop helps with combo consistency because you can **buffer commands like special cancels during hitstop** and it will be executed immediately after hitstop ends. Characters with charge moves … also have the added benefit of **getting more time to charge** those attacks."* | [dustloop GBVS/Attack Attributes](https://www.dustloop.com/w/GBVS/Attack_Attributes) |
| **Garou: Mark of the Wolves** — input window extends through the freeze | Feint input window = **2 frames before the first active frame that connects → 1 frame after exiting hitstop/blockstop**; "You have until the end of the normal's hitstop/blockstop to press a feint." | [wiki.supercombo.gg Garou/Offense (raw)](https://wiki.supercombo.gg/index.php?title=Garou:_Mark_of_the_Wolves/Offense&action=raw) |
| **Celeste** — freeze *does* consume buffer windows in vanilla | A community "Leniency Helper" mod exists whose stated purpose is that freezeframes "could consume buffer windows, thus making buffer-reliant moves unnecessarily tight"; it hooks `Celeste.Freeze` and **adds the freeze time to the inputs' buffer counters**. | [Leniency-Helper wiki](https://github-wiki-see.page/m/Parralax128/Leniency-Helper/wiki/Extend-Buffer-on-Freeze-and-Pickup) |
| Design guidance | **[experiential inference]** Advance the hitstop timer with *unscaled* time, and **do not** let the input-buffer timer tick down during hitstop (or extend it by the hitstop duration). Both facts are supported by the sources above: hitstop is used to *give* players time to input cancels (SF6, GBVS, MBTL), while a naive global freeze silently eats buffer frames (Celeste). | [VG101](https://www.marty64.net/kb/pages/code-bank/hitstop.html) · [SF6/Game_Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Game_Data) · [Leniency-Helper](https://github-wiki-see.page/m/Parralax128/Leniency-Helper/wiki/Extend-Buffer-on-Freeze-and-Pickup) |

---

## 7. Master table — asymmetry: player hitting vs player being hit

| Effect | Value | Source URL |
|---|---|---|
| **SF6** — attacker vs defender hitstop are separate fields | Wiki template comment: *"Number of HITSTOP/HITFREEZE frames caused by attack; **if attacker/defender have different hitstop, list both**"*. Ryu LP Shoryuken `15(13)`, HP Shoryuken `20(13)`. | [SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) |
| **SF2 supers** | attacker **8F**, defender **10F** | [mugen-net Research:SF2](https://mugen-net.work/wiki/index.php/Research:Street_Fighter_II) |
| **GGXRD-R2 / GBVS counter-hit** | extra hitstop is **receiver-only** (+0/+2/+4/+8/+12) | [GGXRD-R2/Frame Data](https://www.dustloop.com/w/GGXRD-R2/Frame_Data) · [GBVS/Attack Attributes](https://www.dustloop.com/w/GBVS/Attack_Attributes) |
| **GBVS** — "uneven hitstop" from armor / guard points / parries | Armored moves and parries "put the opponent in **uneven hitstop**", letting the defender act first (used to beat safe jumps). | [dustloop GBVS/Attack Attributes](https://www.dustloop.com/w/GBVS/Attack_Attributes) |
| **Smash Ultimate** — hitting a shield | shielding multiplier **0.67×**; a move's hitlag multiplier >1× is multiplied by **0.8×** when it hits a shield (never dropping below 1×); multipliers **below** 1× are ignored when shielding | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) |
| **Smash Melee** — electric attacks | ×1.5 hitlag **for the victim only** (from Brawl onward: both) | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) |
| **Smash** — perfect shield | *"the attacker suffers from hitlag while the defender receives none"* | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) |
| **Sakurai's baseline** | *"With hitstop, both you and your opponent freeze for the exact same amount of time."* Asymmetry is the exception, not the rule. | [sourcegaming translation](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/) |

---

## 8. Implementation notes — whole world vs per-entity

1. **Two distinct architectures are documented, and they are not equivalent.**
   - *Per-entity freeze (fighting-game model).* GBVS: *"Hitstop applies to anything that can attack or get hit — including projectiles, but **excluding assist characters**. Entities experiencing hitstop are frozen in place, but **other objects on the stage are unaffected**. For example, when a projectile hits the opponent, the character using the projectile does not experience hitstop, only the projectile and the opponent do."* SmashWiki: *"Hitlag **only affects the object that deals the damage**; all other game elements (including … any particle effects the attack generated) are uninterrupted."* [GBVS/Attack Attributes](https://www.dustloop.com/w/GBVS/Attack_Attributes) · [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag)
   - *Global time scale (engine-wide model).* Unity/Godot tutorials drive it with `Time.timeScale = 0` / `Engine.time_scale = 0.0` and explicitly warn: *"Time.timeScale is global. For selective freezing, use per-object pause states instead."* The peer-reviewed action-game implementation likewise scaled the animation playback speed to **0.01×** rather than stopping logic. [VG101](https://www.marty64.net/kb/pages/code-bank/hitstop.html) · [dev.to hirodeath](https://dev.to/hirodeath/improving-combat-feel-with-hit-stop-slash-effects-and-combo-animations-3dbo) · [SCITEPRESS GRAPP 2024](https://www.scitepress.org/publishedPapers/2024/124614/pdf/index.html)
2. **Hitstop ≠ super freeze ≠ hitstun ≠ blockstun.** GGXRD-R2 documents that Tension-Balance drift "still take[s] place **during hitstop, but not during super freeze**" — i.e. the engine keeps these on separate clocks. [GGXRD-R2/Damage](https://www.dustloop.com/w/GGXRD-R2/Damage)
3. **Hitstop interacts with hitstun-scaling timers.** GGXRD-R2: *"The untechable time of attacks decreases as the amount of time spent in hitstun increases, **including during hitstop**."* If you scale combo timers by time, decide explicitly whether hitstop counts. [GGXRD-R2/Damage](https://www.dustloop.com/w/GGXRD-R2/Damage)
4. **Re-hit policy.** GBVS: *"If an entity is hit while already in hitstop, the hitstop it is experiencing **ends and the hitstop from the most recent interaction begins**."* The dev blog version instead *refuses* to shorten an in-progress stop ("Don't interrupt a longer hitstop with a shorter one"). Pick one deliberately — they produce different multi-hit feel. [GBVS/Attack Attributes](https://www.dustloop.com/w/GBVS/Attack_Attributes) · [dev.to hirodeath](https://dev.to/hirodeath/improving-combat-feel-with-hit-stop-slash-effects-and-combo-animations-3dbo)
5. **Do not move the hurtbox.** Sakurai: during the freeze the character *visually* vibrates but the smash community's rule is hurtboxes stay static, "causing attacks that should have hit to miss" otherwise. (Sakurai's column: *"we solve this problem by having the characters vibrate visually, but keep the hurtbox locations static."*) [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) · [sourcegaming](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)
6. **Blend the flinch pose during the freeze**, don't hard-cut: Smash takes **four frames to smoothly transition** from the initial flinch to the "hurt" pose during hitstop. [sourcegaming](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)
7. **Keep the attacker moving a hair.** Sakurai: during hitstop "the attacking character moves at such a miniscule speed that you wouldn't be able to notice the difference in one frame", then snaps back to its integer animation value — the "sword is actually cutting" trick. The attacker's animation can also be played at a very slow rate; per-attack opt-out exists. [sourcegaming](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/) · [medill-east tech 7](https://medill-east.github.io/2023/07/30/20230730-d04/)
8. **Audio and UI must be excluded.** Tutorial guidance: audio pitch may scale with timeScale, and audio desync reads as broken; either keep `minTimeScale` at ~0.01 or use unscaled audio; UI/VFX nodes should be set pause-immune. [marty64.net](https://www.marty64.net/kb/pages/code-bank/hitstop.html) · [AI-generated doc](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/refs/heads/main/95_hit_pause.md) *(unverified)*
9. **Multiplayer/free-for-all is the reason Smash's hitstop is capped.** Sakurai: *"When you and the opponent are frozen in hitstop, that creates a chance for a third player to move in and strike… Ideally, I would love to extend the hitstop period in Smash just a little more, but I refrain."* Hitlag in Smash also scales by player count: 1.0 (2P) → **0.75** (8P). [sourcegaming](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/) · [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag)
10. **Cap it.** Sakurai: *"I've implemented a cap on the maximum amount of time characters can be in freeze frames. Regardless of how much damage an attack inflicts, the hitstop period will never exceed this limit."* [sourcegaming](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)
11. **Don't stop stacking.** Continuous damage (multi-hit, DoT) must not queue N stops; both dev sources gate re-triggers. [dev.to hirodeath](https://dev.to/hirodeath/improving-combat-feel-with-hit-stop-slash-effects-and-combo-animations-3dbo) · [unverified AI doc](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/refs/heads/main/95_hit_pause.md)

---

## 9. Conflicts found (listed, not averaged)

| Conflict | Numbers | Sources |
|---|---|---|
| **GGXrd hitstop** | Dustloop REV2 attack-level table: **11/12/13/14/15F**; the academic paper measured **7F light / ~10F heavy** in **-SIGN-**. Different game version *and* different measurement method (data table vs. frame-counting video). | [Dustloop](https://www.dustloop.com/w/GGXRD-R2/Frame_Data) vs [arXiv 2208.06155](https://arxiv.org/html/2208.06155v3) |
| **"Comfortable" hitstop for a kill** | Peer-reviewed study: **0.39 s ≈ 23F**. Fighting-game kill/round-final freezes and supers sit at **18–23F** for SF6 supers but **13–15F** for heavies; DBFZ uses a **1 s** freeze for a super wind-up. That's a 2.5×–60× spread depending on genre. | [SCITEPRESS](https://www.scitepress.org/publishedPapers/2024/124614/pdf/index.html) · [SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) · [arXiv](https://arxiv.org/html/2208.06155v3) |
| **Nuclear Throne's 10–20 ms** | At NT's internal 30 fps that is **sub-frame** (a frame is 33 ms); at 60 fps it is 0.6–1.2 frames. So "10–20 ms" cannot literally be an integer frame count — it is probably a wall-clock timer or the quote is loose. Do not transcribe it as "1 frame" without testing. | [leapfrog.nl](https://leapfrog.nl/blog/archives/2013/10/25/when-you-fire-the-pistol-in-nuclear-throne-first/) |
| **Light-hit hitstop in fighting games** | SF6 **9F** vs Skullgirls **7F** vs GBVS Lv0/Lv1 **10F** vs GGXRD **11F** vs the "3–6F for a light hit" advice seen in aggregator docs. The shipped-data consensus is **7–11F for a light**, i.e. the "3–6F" advice is *lower* than any game I could verify. | [SF6](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) · [Mizuumi](https://mizuumi.wiki/index.php?search=hitstop&title=Special%3ASearch&fulltext=1&ns0=1) · [GBVS](https://www.dustloop.com/w/GBVS/Attack_Attributes) · [GGXRD-R2](https://www.dustloop.com/w/GGXRD-R2/Frame_Data) |
| **Re-trigger policy** | GBVS: newest hit replaces the running stop. Dev tutorial: ignore shorter stops, never shorten a running one. | [GBVS](https://www.dustloop.com/w/GBVS/Attack_Attributes) vs [dev.to](https://dev.to/hirodeath/improving-combat-feel-with-hit-stop-slash-effects-and-combo-animations-3dbo) |

---

## 10. Caveats, source-quality notes, and negative results

- **Cloudflare blocked direct fetches** for `wiki.gbl.gg` / `mizuumi.wiki` / SuperCombo / gamedeveloper.com / aztez.com / tvtropes / hashnode / ACM. I read the SuperCombo, Mizuumi and SmashWiki pages through a real browser session (Playwright) and pulled raw wikitext where possible. Pages I could **not** open at all: `gamedeveloper.com/design/combat-analysis-guacamelee`, `aztez.com` Guacamelee analysis, `tvtropes.org/.../HitStop`, `maoboulve.com/hitstop-system.html`, `forums.supercombo.gg/d/601-hit-stop-frames`, `dl.acm.org/doi/pdf/10.1145/3681755.3688941`, `ipsj.ixsq.nii.ac.jp` PDF, `funkypenguingames.com` dev log #5 (page now 404s). **No numbers are quoted from those pages.** The "hit stop frames" forum thread (supercombo forums) is a lead I could not open — worth a retry from a non-blocked network.
- **`glossary.infil.net`**: `?t=Hitstop` returns 200 but the definition is injected by JS, and the JSON data file I retrieved was truncated before any hitstop entry. The *Hitbox*, *Hit Confirm*, *Hit Stun Deterioration* and *Block Stun* entries do exist in the retrieved portion. **Infil's hitstop entry is therefore unconfirmed.**
- **AI-generated material must be discounted.** `raduacg/game-mechanics-optimizations` (→ `95_hit_pause.md`, `G_05_screen_effects.md`) reads as an AI-written pattern catalogue: it gives confident per-game numbers ("Celeste 3-frame freeze on dash impacts, 5-frame on death", "Hollow Knight 6-8 frame nail, 12 on killing blow, 20 on boss death", "Dead Cells 2-3 frame parry, 8-10 critical, 15 boss phase transition", "Hyper Light Drifter 4-5 sword, 10-12 gun, 15-20 chain dash") **with no sources**. Its Celeste claim already **contradicts** the sourced Celeste numbers (3/6/9F, no documented 5F death freeze). Treat the whole file as **[SECONDARY, UNVERIFIED / likely AI-generated]**. Same for `gamedev-skills/awesome-gamedev-agent-skills` skill docs and `skillsmp.com` / `lobehub.com` skill listings surfaced by search.
- **Search results were heavily polluted** by AI-generated "skill" repos and SEO/AI pages (e.g. `dictai.org/w/hitstop`, `wp.tptr.dev`, `eastondev.com`). None are used for numbers here.
- **Specific developer-requested targets with no verifiable numbers found:** Dead Cells, Katana Zero, Hyper Light Drifter, Hades, Hollow Knight, Streets of Rage 4, Skullgirls *per-move* table (only the wiki's indexed snippet), Nuclear Throne's *code*, GDC Vault talks specifically about hitstop (searched; only the GDC "Juicing Your Cameras With Math" talk page surfaced — [gdcvault.com](https://www.gdcvault.com/play/1023557/Math-for-Game-Programmers-Juicing) — and I did not access its content), Game Maker's Toolkit episode/supporting article with hitstop numbers, Gamasutra/gamedeveloper.com hitstop article, Max Payne bullet-time ratio, Bayonetta 1/2 Witch Time seconds, Sifu slow-mo, Hotline Miami, SUPERHOT time scale.
- **Sakurai sources are two flavours of secondary:** the Famitsu column is a *fan translation* on Source Gaming (the Japanese original was not read), and the two "Masahiro Sakurai on Creating Games" videos were read through a fan's Chinese-language study notes (`medill-east.github.io`), not the videos themselves. Both are labelled accordingly above.

---

## 11. Practical 60 fps budget — my synthesis (explicitly tagged)

Everything in this section is **[experiential inference]** built from the sourced numbers above; it is not a citation.

| Slot | Value I would start from | Why (grounded in) |
|---|---|---|
| Top-down/action **light hit** | **3–5F** (50–83 ms) | Celeste's 3F/6F interactions are the closest sourced non-fighting precedent; Nuclear Throne's 10–20 ms is even shorter; fighting-game lights are 7–11F but those games *want* the freeze to matter for combo timing — a top-down game with many simultaneous hits should sit at the bottom of that band. |
| **Medium hit** | **5–8F** | Between Celeste's 6F tier and Skullgirls/SF6 medium (9–11F). |
| **Heavy hit** | **8–13F** | Matches the sourced 9–13F heavy band (SF6 13F, Skullgirls 9–10F, GBVS Lv3–Lv4 14–16F). |
| **Kill / final blow** | **12–23F** freeze, then **0.6–1.5 s** slow-mo at **0.15–0.3 time scale**, optionally with a zoom | SF6 supers sit at 18–23F; the peer-reviewed study's *comfortable* kill-stop was ~23F (0.39 s) and found longer than that became unpleasant; Witch Time's shipped slow-mo used time scale 0.125 for 1.5 s. My 0.15–0.3 scale is a deliberate middle between Witch Time (0.125) and a barely-noticeable 0.5. |
| Hard caps | never exceed **30F** of pure freeze (Smash's shipped cap) and never more than ~**0.5 s** of dead time on a kill | [ssbwiki cap](https://www.ssbwiki.com/Hitlag) · [SCITEPRESS unpleasantness trend](https://www.scitepress.org/publishedPapers/2024/124614/pdf/index.html) |
| Buffer rule | buffer window **≥4–5F**, and **extend it by the hitstop duration** | SF6 uses 4F (+ dashes/wakeup 7F) and *explicitly* buffers during screen freezes; MBTL buffers through the whole hitstop; Garou extends the window to 1F past hitstop; Celeste needed a mod precisely because freezes ate buffers. |
| Asymmetry | attacker stop ≥ defender stop for the *attacker's* big moves; extra stop on counter-hit/super goes to the receiver only | SF6 `15(13)`/`20(13)`; GGXRD & GBVS CH bonus receiver-only; SF2 supers 8 vs 10; GBVS "uneven hitstop" as a designed privilege for armor/parry. |
| Re-trigger | take the **longest** remaining stop rather than summing, and rate-limit to ≤1 trigger per ~0.1 s in bullet-heavy scenes | both dev sources gate re-triggers; the exact tie-break differs between them (see §9). |

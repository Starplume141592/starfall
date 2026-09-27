# Game Feel / "Juice" — Numeric Research Brief for a 2D Top-Down Action Game

**Purpose:** production art-direction reference. Every number is either **sourced with a URL** or explicitly tagged `[EI]` (`[experiential inference]` — my reasoning, not a source).

**Companion files (full detail, more citations):**
- `particles-and-postfx.md` — VFX/particles/post-processing, 4 documented evidence gaps
- `accessibility-limits.md` — 82 cited URLs: WCAG, Xbox XAG, HardingFPA, GAG, shipped-game settings
- `knockback-and-canon.md` — knockback physics + the canonical talks, with the "what I could not read" list

**Source-quality labels:**
- `[ENGINE-OFFICIAL]` — shipped engine source/example or engine asset-library entry
- `[DEV]` — a working developer's blog/tutorial or plugin README
- `[PRIMARY-IMPL]` — source code or a wiki of record (frame data, formulas)
- `[ACADEMIC]` — peer-reviewed or survey literature
- `[SECONDARY]` — human-written summary, community wiki, blog
- `[AI-GENERATED]` — agent skill docs / LLM course notes. **Plausible and internally consistent, but uncited.** Use the *ranges* as hypotheses; never cite a per-game claim from these. Several specific per-game figures in these docs (`"Celeste dash 0.15 trauma"`, `"Nuclear Throne 0.3–0.8"`, `"Hyper Light Drifter CA 0.6"`) appear to be **fabricated**.

---

## Quick-reference master table

| # | Effect | Value | Recommended (2D top-down, 60 fps) | Source |
|---|---|---|---|---|
| 1 | **Trauma shake** — model | `shake = trauma^2`; `offset = max * shake * noise(t)`; linear decay; events **add** | exponent **2.0** | [Bevy official](https://raw.githubusercontent.com/bevyengine/bevy/main/examples/camera/2d_screen_shake.rs) (credits Eiserloh, GDC 2016) |
| 1 | decay / second | real code: **0.5, 0.5, 0.8, ~2.1, 4.0, 4.0** | **2–4 /s** (combat-heavy) · 0.5–0.8 /s (cinematic) | [Bevy](https://raw.githubusercontent.com/bevyengine/bevy/main/examples/camera/2d_screen_shake.rs), [kidscancode](https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/), [sajmoni](https://raw.githubusercontent.com/sajmoni/screen-shake/main/README.md), [trauma-gd](https://raw.githubusercontent.com/filipbasara/trauma-gd/main/README.md), [dev.to](https://dev.to/saltmire/godot-4-screen-shake-and-hit-stop-in-one-script-11eh) |
| 1 | max offset | 12 / 20 / 50 / 70 / 100×75 / 100 px | **8–16 px** normal · **≤24 px** boss | `[EI]` + [secondary](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/references/feedback-recipes.md) |
| 1 | max roll | 3° / 10° / 12° / 0.1 rad | **0.05–0.10 rad (2.9–5.7°)** | [kidscancode](https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/) ("**use sparingly**") |
| 1 | per-event trauma | — | light **0.10–0.20** · med **0.30–0.40** · heavy **0.60–0.80** · boss **0.9–1.0** | [97_camera_trauma](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/97_camera_trauma.md) `[AI-GENERATED]` |
| 2 | **Hitstop** — uncited advice | "50–100 ms (3–6 F)" | ⚠️ **BELOW every verified shipped game — use with care** | [eastondev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/) `[SECONDARY]` |
| 2 | **Hitstop** — shipped fighting games | light **6–9 F** (SF6 9 · GGXRD 11 · GBVS 10 · Skullgirls 7 · SF2 14) · heavy **13–16 F** · supers 18–23 F | light **3–5 F** top-down · **7–9 F** if combo-driven · heavy 8–13 F | [SF6](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data), [GGXRD](https://www.dustloop.com/w/GGXRD-R2/Frame_Data), [GBVS](https://www.dustloop.com/w/GBVS/Attack_Attributes), [SF2](https://mugen-net.work/wiki/index.php/Research:Street_Fighter_II) `[DATAMINE]` |
| 2 | **Hitstop** — Celeste (datamined) | **3 F / 6 F / 9 F** tiers | closest non-fighting precedent | [celeste.ink](https://celeste.ink/wiki/Freeze_frames) `[DATAMINE]` |
| 2 | **Hitstop** — Nuclear Throne | **10–20 ms** (sub-frame at its 30 fps) | fastest end of the band | [leapfrog.nl](https://leapfrog.nl/blog/archives/2013/10/25/when-you-fire-the-pistol-in-nuclear-throne-first/) `[DEV]` |
| 2 | **Hitstop** — input buffer | MBTL buffers **through** the whole hitstop; SF6 buffer **4 F**; Celeste needed a mod because freezes ate buffers | **window ≥4–5 F, extended by the hitstop duration** | [Mizuumi MBTL](https://mizuumi.wiki/w/Melty_Blood/MBTL/Game_Data), [SF6](https://wiki.supercombo.gg/w/Street_Fighter_6/Game_Data) `[DATAMINE]` |
| 2 | hitstop — Smash *ships* | **15 F (250 ms)** for a 15% move; cap **30 F (500 ms)** | kill/finisher tier only | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) `[DATAMINE]` |
| 2 | hitstop — peer-reviewed | **0.39 s (≈23 F)** comfortable (tested 0–0.7 s, at 0.01× playback) | a *finisher* effect, not combat hitstop | [GRAPP/VISIGRAPPA 2024](https://www.scitepress.org/publishedPapers/2024/124614/pdf/index.html) `[ACADEMIC]` |
| 2 | **hitstop + audio + camera** | peer-reviewed: these **3** of 19 features are decisive — "a lack of dedicated design on one may ruin players' impact feel" | design them as **one system**, not three polish passes | [arXiv 2208.06155 (IEEE GEM 2022)](https://arxiv.org/html/2208.06155v3) `[ACADEMIC]` |
| 2 | hitstop — pose blend | Sakurai: interpolate the hit pose over **~4 F (67 ms)** | blend, don't hard-freeze | [Sakurai notes](https://en.senkohome.com/sakurai-game-dev-specification/) `[SECONDARY]` |
| 3 | **Hit flash** | code defaults **120 ms** & **150 ms**; rule "0.1–0.2 s" | **~120 ms**; ceiling **200 ms** | [dev.to](https://dev.to/saltmire/6-godot-4-game-feel-tricks-each-just-a-few-lines-of-gdscript-jmm), [cursogame.dev](https://cursogame.dev/blog/godot-shader-hit-flash-dano) |
| 3 | flash blend | `mix(rgb, white, t)`; `modulate` **multiplies, fails on dark sprites** | **mix()**; additive only for sparks, over a dark core | [cursogame.dev](https://cursogame.dev/blog/godot-shader-hit-flash-dano) |
| 4 | **Scale pop** | `(1.3, 0.7)`→0.18 s; ×1.25 over 0.25 s | **1.1–1.3×, 150–200 ms**, BACK/ELASTIC ease-out | [feedback-recipes](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/references/feedback-recipes.md), [dev.to](https://dev.to/saltmire/6-godot-4-game-feel-tricks-each-just-a-few-lines-of-gdscript-jmm) |
| 4 | volume preservation | width ×1.5 → height ×0.67 | **mandatory** for non-uniform squash | [96_squash_and_stretch](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/96_squash_and_stretch.md) `[AI-GENERATED]` |
| 5 | **Knockback** | Smash: `launch speed = KB × 0.03`, decay **0.051/frame** | light **250 px/s**, heavy **780 px/s** (walk = 240) | [ssbwiki](https://www.ssbwiki.com/Knockback) `[PRIMARY-IMPL]`, [EVEngine](https://raw.githubusercontent.com/EVEngine/EVEngine/refs/heads/main/examples/metroidvania/tuning.nut) |
| 5 | knockback in tiles | DRL: **12 dmg/tile** ranged, **7** shotgun/explosion, **14** BFG, **2** rocket-jump | derive tiles from damage, then cap | [DRL wiki](https://drl.chaosforge.org/w/index.php?title=Knockback) `[PRIMARY-IMPL]` |
| 5 | KB chance by size | D2: Large **25%** / Medium **50%** / Small **100%** / boss **0%** | cap distance, don't scale it | [Basin wiki](https://d2.lc/AB/wiki/indexdd6b.html) `[SECONDARY]` |
| 6 | **Small enemy death** | — | **12–20 particles, 0.4 s**, 90–320 px/s | `[EI]` + [sources](#6-particle-counts-lifetime-size) |
| 6 | mid enemy death | — | **30 particles** + 10 debris, 0.6 s | same |
| 6 | boss death | — | **120 particles**, 3 staggered emitters, 1.0–1.5 s | same |
| 6 | particle budget (hard) | **≤50 particles / ≤10 draw calls** per effect; **≤3–4 emitters**; overdraw fill **<3**, never **>5** | budget *emitters* and *fill rate*, not counts | [UWA](https://blog.uwa4d.com/archives/TechSharing_169.html) |
| 6 | readability lever | "in a 2D game **raise the character's display priority above the effect**" | sprites on a higher z-layer than VFX | [Sakurai Effects](https://en.senkohome.com/sakurai-game-dev-effect/) |
| 7 | **UI durations** | M3: 50/100/150/200 · 250/300/350/400 · 450/500/550/600 ms | level-up banner **250–450 ms**; dismiss **150 ms** | [M3 tokens](https://pub.dev/documentation/material_design/1.8.0/material_design/M3MotionDuration-class.html) |
| 7 | response-time limits | **0.1 s** instant · **1.0 s** flow · **10 s** attention | 0.1 s = input→feedback budget | [Nielsen](https://www.nngroup.com/articles/response-times-3-important-limits/) `[PRIMARY]` |
| 7 | chromatic aberration | **no engine-documented safe value** | **intensity 0.25–0.4, 3–6 px, ≤150 ms**; zero under reduced-motion | [Unity URP](https://docs.unity3d.com/6000.1/Documentation/Manual/urp/post-processing-chromatic-aberration.html) + `[EI]` |
| 7 | bloom pulse | Unity 0–1 (default 0); Godot glow **default 0.3**, threshold **1.0 → use 0.9 in 2D** | **×1.3–1.8 for 100–300 ms** | [Unity](https://docs.unity3d.com/6000.1/Documentation/Manual/urp/post-processing-bloom.html), [Godot](https://raw.githubusercontent.com/godotengine/godot/master/doc/classes/Environment.xml) |
| 8 | **Slow-motion** | `time_scale 0.05` for **0.15 s real**, ramp back **0.2 s** | **0.1–0.4× for 0.15–0.5 s** | [dev.to](https://dev.to/saltmire/6-godot-4-game-feel-tricks-each-just-a-few-lines-of-gdscript-jmm) |
| 9 | **Player damage vignette** | red, "crank up suddenly then gradually fade out" | **alpha 0.2–0.5**; spike **40–60 ms**, fade **300–500 ms** | [80.lv](https://80.lv/articles/using-unity-to-effectively-polish-your-gameplay) + `[EI]` |
| 9 | low-health vignette | `lerp(0.8, 0.2, health%)` | **0.2 → 0.6**; pulse **1–1.5 Hz** | [99_screen_effects](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/99_screen_effects.md) `[AI-GENERATED]` |
| 10 | **HARD LIMIT — flashing** | **≤3 flashes/sec**; general flash = **≥10% relative-luminance change**, darker state **<0.80**; red flash **R/(R+G+B) ≥ 0.8**; area **≤0.006 sr in 10°** | rate-limit the **aggregate** flash channel | [WCAG 2.2 SC 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) |

---

## 0. Corrections to the brief's premises

The task brief contains four assumptions that the research contradicted. These matter because they are the kind of thing that gets quoted onward as fact.

1. **"Juice it or lose it" is NOT Squirrel Eiserloh.** It is **Martin Jonasson + Petri Purho** (originally Nordic Game Jam 2012, ~8 min, [video](https://www.youtube.com/watch?v=Fy0aCDmgnxg)). Eiserloh's talk is a **different, camera-focused** session: *"Math for Game Programmers: Juicing Your Cameras With Math"*, **GDC 2016** ([GDC Vault](https://www.gdcvault.com/play/1023557/Math-for-Game-Programmers-Juicing), video `tu-Qe66AvtY`). **The trauma model comes from Eiserloh; the "juice" checklist demo comes from Jonasson/Purho.** Its Vault overview confirms it covers "framing techniques, types and characteristics of smoothed motion, camera shake, and dynamic split-screen" — it is **not** a generic hitstop/particle talk.
2. **Xbox guideline numbering is stale.** The brief cites "XAG 115 (photosensitivity)". Guideline **115 is now "Error messages and destructive actions"**; **118 is "Photosensitivity"**; **117 is "Visual distractions and motion settings"** ([Xbox guidelines index](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines)).
3. **The peak photosensitive frequency band is 16–25 Hz, not 15–25 Hz.** The "15–25" figure traces to Fisher et al. 2005 (*Epilepsia* 46(9):1426–1440) which **could not be fetched**. The clinician-reviewed figure actually retrieved is "**between 16 and 25 times a second are the most likely to trigger seizures**" ([Epilepsy Society](https://epilepsysociety.org.uk/understanding-epilepsy/photosensitive-epilepsy)).
4. **The requested "trauma decay ≈ 1.0–1.5/s" and "max angle ≈ 0.1 rad / 5–6°" are not Eiserloh's published constants.** They trace to an **uncited AI-generated skill doc**. Real implementations of his model span **0.5–4.0/s** for decay and **3°–12°** for roll. **No talk constant in this brief could be verified against a talk** — YouTube is unfetchable from this environment, GDC Vault serves mismatched sessions for wrong play-IDs, archive.org and gamedeveloper.com are unreachable/403, and PDFs are unsupported while the sandbox blocks outbound network from the shell. **Every "talk constant" here is implementation-derived.**

Also worth flagging: **a talk arguing the opposite of this brief exists.** GDC Vault hosts **"Don't Juice It or Lose It"** ([abstract](https://gdcvault.com/play/1021398/contactUs)):

> "Indies have to wear many hats, including artist and art director. The past few years, these hats have been painted with a brush dipped in what is now known as 'juice,' or polish. But hats aren't just ornamental, they have a function. **Gradients on limited palettes, dust clouds kicked up in places where there is no dust, bouncy tweens on hard rocks** — through the idea that adding polish makes a game feel more alive, **we're actually losing a level of immersion.** There has been such a tremendous focus on putting eye candy in our games that **the context doesn't get considered.**"

Read that against §4's recommendation of a 1.3× squash-pop with overshoot: the counter-talk's own example of the failure mode is exactly **"bouncy tweens on hard rocks."** The reconciliation is *material-appropriateness* (§11).

---

## 0b. Reference implementation: Nuclear Throne (the closest shipped analogue to this project)

`Nuclear Throne` is a 2D top-down action game whose feel is the direct product of these knobs, and the values were published in a developer interview. **This is the single most transferable dataset in the brief** because it is the same genre and the same camera. Note the internal resolution is **320×240 at 30 fps**, so pixel values are in that space.

| Effect | Value | Source |
|---|---|---|
| **Hit freeze (hitstop)** | *"the game also freezes for about **10–20 milliseconds** whenever you hit something"* | [leapfrog.nl quoting the RPS interview](https://leapfrog.nl/blog/archives/2013/10/25/when-you-fire-the-pistol-in-nuclear-throne-first/) · origin [RPS interview](https://www.rockpapershotgun.com/interview-jan-willem-nijman-on-nuclear-thrones-feel) `[DEV]` |
| **Camera kick** | **6 px** | same |
| **Screenshake** | **+4** | same |
| **Weapon kick** | **2** | same |
| **Enemy knockback** | pushed **3 px/frame** | same |
| **Hit animation** | **1 white frame + 2 frames** | same |
| **Shell casings** | **2–4 px/frame** @30fps | same |
| Bullet speed | **16 px/frame** | same |

**Two things to take from this:**

1. **The hit freeze is tiny — ~10–20 ms, which at NT's own 30 fps is *sub-frame*.** `[EI]` That cannot be a literal integer frame count; it is a wall-clock timer (or a loose quote). **Do not transcribe it as "1 frame" without testing.** It is, however, strong evidence that a **fast, high-hit-rate top-down game wants the *short* end** of the hitstop range — consistent with §2.2's 3–5 F recommendation for light hits.
2. **The feel comes from five small coupled values (freeze, camera kick, shake, weapon kick, knockback), not from one big one.** Knockback at 3 px/frame and camera kick at 6 px are *small* numbers. This is the same "layered micro-feedback" thesis as Nijman's talk, now with actual magnitudes attached.

---


---

## 1. Trauma-based screen shake

### 1.1 The model

```
trauma ∈ [0, 1]                        # one scalar for the whole camera
add(x)  → trauma = min(trauma + x, 1)  # events ADD; they never reset
shake   = trauma ^ exponent            # 2 (standard) or 3 (sharper)
offset.x = max_offset_x * shake * noise(t + o1)
offset.y = max_offset_y * shake * noise(t + o2)
roll     = max_angle    * shake * noise(t + o3)
trauma  -= decay_per_second * dt       # LINEAR decay, once per frame
```

Three properties worth defending in the art-direction doc:

- **Squaring is what makes it feel good.** Bevy's in-code comment: "Camera shakes don't feel punchy when they go up linearly, so we use an exponent of 2.0." ([Bevy source](https://raw.githubusercontent.com/bevyengine/bevy/main/examples/camera/2d_screen_shake.rs)). kidscancode: "square (2) or cube (3)… typically the best" ([kidscancode](https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/)).
- **Use continuous noise, not per-frame `rand()`.** "Sample a noise function or summed sines across time — never a fresh `rand()` per frame, which produces a harsh buzz instead of a shake." ([feedback-recipes.md](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/references/feedback-recipes.md) `[AI-GENERATED]`). Note [dev.to/saltmire](https://dev.to/saltmire/godot-4-screen-shake-and-hit-stop-in-one-script-11eh) *does* use `randf_range` per frame — treat it as a good source for constants and a **poor** source for this detail.
- **Shake the camera/visual transform, never the simulated body.** "Shaking the player/body instead of the camera offset desyncs collision and aim" ([game-feel SKILL.md](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/SKILL.md)). Bevy enforces this in code: restore the original transform at `PreUpdate`, apply shake only just before render.

### 1.2 The constants — six implementations, and they do not agree

Every implementation below credits or reproduces Eiserloh's model. This spread **is** the finding: these are taste parameters, and a production doc must *choose and record* rather than inherit.

| Implementation | decay /s | max offset (px) | max angle | exponent | noise speed | per-event trauma |
|---|---|---|---|---|---|---|
| **Bevy** official example (credits talk) | **0.5** | **20** (x,y) | **10°** | **2.0** | **20.0** | +0.4 / press |
| **kidscancode** Godot recipe (credits talk) | **0.8** | **Vector2(100, 75)** | **0.1 rad ≈ 5.73°** ("use sparingly") | **2**, "use [2,3]" | `period=4, octaves=2`, cursor +=1/frame | `add_trauma(0..1)` |
| **sajmoni/screen-shake** JS (credits talk) | ≈**2.1** (28 updates for 1→0) | **70** | **12°** | not exposed | **0.4** | +0.1 / projectile |
| **bones_lib** Rust (same model) | **0.5** | **100** | `90.0` — almost certainly an unconverted-degrees bug | **2** hard-coded | **1.5** | event queue |
| **trauma-gd** Godot plugin (example profile) | **4.0** | **50** | **3°** | profile-driven | **30.0** | 0.25 / bullet (4 = full) |
| **dev.to/saltmire** Godot | **4.0** | **12** | — | 2.0 | per-frame random | 0.3–0.4 / hit |
| `[AI-GENERATED]` `97_camera_trauma.md` | 1.5 (range 1.0–3.0) | 100 (range 50–150) | 0.1 rad (range 3–9°) | 2.0 (range 2–3) | 50.0 | 0.2 / 0.4 / 0.6 / 1.0 |
| `[AI-GENERATED]` `feedback-recipes.md` | 1.0–1.5 | (8–16, 6–10) | 0.05–0.12 rad | 2 (or 3) | — | 0.15 light → 0.8 heavy |

Sources: [Bevy](https://raw.githubusercontent.com/bevyengine/bevy/main/examples/camera/2d_screen_shake.rs) · [kidscancode](https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/) · [sajmoni](https://raw.githubusercontent.com/sajmoni/screen-shake/main/README.md) · [bones_lib](https://docs.rs/bones_lib/0.2.0/i686-pc-windows-msvc/src/bones_lib/camera.rs.html) · [trauma-gd](https://raw.githubusercontent.com/filipbasara/trauma-gd/main/README.md) + [Godot Asset Library](https://godotengine.org/asset-library/asset/4933) · [dev.to](https://dev.to/saltmire/godot-4-screen-shake-and-hit-stop-in-one-script-11eh) · [97_camera_trauma](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/97_camera_trauma.md) · [feedback-recipes](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/references/feedback-recipes.md).

### 1.3 Recommended values for a 2D top-down action game

| Value | Recommended | Rationale |
|---|---|---|
| `exponent` | **2.0** (3.0 only for a deliberately spiky feel) | Modal across all real implementations |
| `decay_per_second` | **2–4 /s** for combat-heavy play; **0.5–0.8 /s** for a cinematic feel | The real-code distribution is **bimodal** (0.5/0.5/0.8 vs 2.1/4.0/4.0). At 4/s a full-trauma hit settles in **0.25 s**; at 0.5/s it takes **2 s**. `[EI]`: in a game with 6–20 hits/second, the fast cluster is correct — slow decay accumulates into shake soup. Bevy's 0.5/s is a demo with no UI to keep stable. |
| `max_offset` | **8–16 px** normal, **≤24 px** boss | `[EI]`. A top-down game has a UI and off-screen threats; large translation moves both. Bevy's 20 px and kidscancode's 100×75 px are presentation-scale, not gameplay-scale. **Constraint: keep the offset below the screen-edge margin so shake never reveals letterbox/black edges** ([Sakurai](https://en.senkohome.com/sakurai-game-dev-effect/)). |
| `max_angle` (roll) | **0.05–0.10 rad (2.9–5.7°)** | kidscancode annotates 0.1 rad "**use sparingly**"; Bevy's 10° is annotated "somewhat high but still reasonable". **Roll is the main nausea driver — cut it first under reduced-motion.** |
| `noise_speed` | **1.5–20** | Enormous spread in real code. `[EI]`: pick per-effect — low (~2) for rumbles/earthquakes, high (~20) for sharp impacts. |
| per-event trauma | light **0.10–0.20** · medium **0.30–0.40** · heavy **0.60–0.80** · boss **0.9–1.0** | Modal across sources |
| **shake events/second** | **< 5–10** | [97_camera_trauma](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/97_camera_trauma.md) `[AI-GENERATED]` — but it independently matches the WCAG 3-flash ceiling (§10) and the 3–5 feedbacks/s ceiling (§7.3). Three unrelated sources agreeing is a good sign it is the real budget. |

**Distance falloff** (explosions): `falloff = 1 - (distance / radius)`, then `add_trauma(max_trauma * falloff)` ([same](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/97_camera_trauma.md) `[AI-GENERATED]`).

**Accessibility:** every production source recommends a **0–100% trauma multiplier** with default around **60–80%** ([feedback-recipes](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/references/feedback-recipes.md)), and cutting **roll and zoom punches** first. Note there is **no public numeric maximum for shake amplitude anywhere** — not W3C, not Microsoft, not any platform doc (§10.7).

---

## 2. Hitstop / freeze-frame

### 2.1 The advice and the shipped reality differ by 2–5× — and the advice is *below* every verified game

**This table is the most important correction in the brief.** The widely repeated "light hit = 3–6 F" budget appears **only in AI-generated / uncited docs**. Every fighting game whose per-move data could be datamined sits at **7–16 F for a light hit**:

| Game | Light | Medium | Heavy | Special / other | Source |
|---|---|---|---|---|---|
| **Street Fighter 6** (datamined per-move) | **9 F** (150 ms) | **11 F** | **13 F** | projectile (Hadoken) **8 F** — *below the jab*; LP/MP Shoryuken **15 F attacker / 13 F defender**; HP Shoryuken **20 / 13**; supers **18 / 20 / 23 F** by level | [SuperCombo SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) `[DATAMINE]` |
| **Guilty Gear Xrd REV2** (by attack level) | Lv0 **11 F**, Lv1 **12 F** | Lv2 **13 F** | Lv3 **14 F**, Lv4 **15 F** | Blitz Attack **30 F**; Burst +6 F / +13 F; counter-hit bonus **+0/+2/+4/+8/+12**, *"only applied to the receiver"* | [Dustloop GGXRD-R2](https://www.dustloop.com/w/GGXRD-R2/Frame_Data) `[DATAMINE]` |
| **Granblue Fantasy Versus** (by attack level) | Lv0/Lv1 **10 F** | Lv2 **12 F** | Lv3 **14 F**, Lv4 **16 F** | counter-hit bonus **+2/+2/+4/+8/+12**, *"only applies to opponent"* | [Dustloop GBVS](https://www.dustloop.com/w/GBVS/Attack_Attributes) `[DATAMINE]` |
| **Skullgirls / Them's Fightin' Herds** | **6–7 F** | 9–10 F | **9–10 F** | heavy specials **12 F** | [Mizuumi wiki](https://mizuumi.wiki/index.php?search=hitstop&title=Special%3ASearch&fulltext=1&ns0=1) `[WIKI]` |
| **Street Fighter II** | **14 F** flat (15 F if victim grounded-idle) | — | — | supers **8 F attacker / 10 F defender** | [mugen-net Research: SF2](https://mugen-net.work/wiki/index.php/Research:Street_Fighter_II) `[WIKI]` |
| **Smash Ultimate** | — | — | — | a **15%-damage move = 15 F (250 ms)**; Brawl/Sm4sh **10 F**, Melee **8 F**, Smash 64 **10 F (9 F JP)** | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) `[DATAMINE]` |
| **SF6 rule (wiki text)** | — | — | — | "**Heavier attacks have longer hitstop**" — and "some Punish Counters with special effects can have extra long hitstop" | [SF6/Game_Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Game_Data) |

**Shipped non-fighting precedents — the closest analogues to a top-down action game:**

| Game | Value | Source |
|---|---|---|
| **Celeste** (datamined freeze-frame tiers) | **3 F (0.05 s)** dash start / refill pickup / dream-block exit · **6 F (0.1 s)** bumper / pufferfish / seeker boost · **9 F (0.15 s)** bouncing on a seeker · dash has **1 extra frame where only Madeline is stationary** | [celeste.ink Freeze frames](https://celeste.ink/wiki/Freeze_frames) `[DATAMINE]` |
| **Nuclear Throne** | *"the game also freezes for about **10–20 milliseconds** whenever you hit something"* | [leapfrog.nl quoting the RPS Nijman interview](https://leapfrog.nl/blog/archives/2013/10/25/when-you-fire-the-pistol-in-nuclear-throne-first/) `[DEV]` |
| **Nocturne Vania** (shipped Godot game) | **0.05 s (3 F)** normal · **0.09 s (5.4 F)** finisher = 1.8× normal | [dev.to/hirodeath](https://dev.to/hirodeath/improving-combat-feel-with-hit-stop-slash-effects-and-combo-animations-3dbo) `[DEV]` |
| Tutorial guidance (not shipped data) | light **0.02–0.04 s** · medium **0.05–0.08 s** · heavy **0.1–0.2 s** · default **0.05 s** | [marty64.net VG101](https://www.marty64.net/kb/pages/code-bank/hitstop.html) `[TUTORIAL]` |
| Uncited advice cluster | "**50–100 ms (3–6 F)**"; "too long makes players think the game is **lagging**" | [eastondev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/) `[SECONDARY]`; "light 2–3 F / heavy 5–8 F" from [feedback-recipes](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/references/feedback-recipes.md) `[AI-GENERATED]` |
| Nijman's live demo | "**2–4 frames**" | [Art of Screenshake checklist](https://github.layabox.com/xuhaodong/awesome-skills/-/blob/7cb809f72f89a918178d602f0544ebf7c8eaa20f/plugins/product-manager/skills/prd-creator/references/patterns/game-feel/screenshake.md) — **retranslated secondary source; NOT verified against the video** |
| Published code default | `hit_stop(duration := 0.08, scale := 0.05)`; "**60–120 ms is plenty**" | [dev.to/saltmire](https://dev.to/saltmire/godot-4-screen-shake-and-hit-stop-in-one-script-11eh) |
| **Smash hitlag formula (Ultimate)** | `hitlag_frames = ⌊⌊⌊(d × 0.65 + 6) × h × e × s⌋ × p⌋ × c⌋` | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) `[DATAMINE]` |
| Smash multipliers & caps | Marth tipper **1.25×** vs **0.7×**; Ryu/Ken **1.5×**; Kazuya **0.2–0.6×**; electric **×1.5**; crouch-cancel **0.667**; **shield ×0.67**; player-count 1.0 → **0.75** for 2→8. **Cap 20 F Melee / 30 F Brawl+** (36 F vs Stone Kirby). "No damage → zero hitlag." | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) `[DATAMINE]` |
| **Peer-reviewed** | **0.39 s (≈23 F)** = "the average duration of a **comfortable** hit stop", tested 0.0–0.7 s, implemented as **0.01× playback speed**; "**the longer the hit stop duration, the more uncomfortable it tended to be**" | [Tomizawa & Ishikawa, GRAPP/VISIGRAPPA 2024](https://www.scitepress.org/publishedPapers/2024/124614/pdf/index.html) `[ACADEMIC]` |

**Three different effects are being conflated in the "how long should hitstop be" question.** Do not average them:

1. **Whole-world / per-entity combat freeze** — the fighting-game model. Shipped data: **7–16 F**, scaling with attack weight.
2. **Slow-motion death prolongation** — the academic study's model (0.01× playback). Comfortable value **~23 F equivalent (0.39 s)**; longer is progressively unpleasant. This is a *finisher* effect.
3. **Long cinematic freezes** — *Fantasy Zone* (1986) stops the screen for **one second** when you are hit; DBFZ freezes the opponent for **a whole second** on an ultimate wind-up. These are 60 F-class *super freeze*, not combat hitstop.

### 2.2 Recommendation (corrected)

| Event | Hitstop | Grounded in |
|---|---|---|
| **Light / ordinary hit** | **3–5 F (50–83 ms)** | `[EI]`. Deliberately **below** the fighting-game band (7–11 F): those games *want* the freeze to matter for combo timing and have a low hit rate. A top-down game with 6–20 simultaneous hits belongs at the bottom of the band. Celeste's closest analogues (3 F, 6 F) and Nuclear Throne's 10–20 ms support the short end. **If your game is low-hit-rate and combo-driven, move up to 7–9 F** and match SF6/Skullgirls. |
| **Medium hit** | **5–8 F (83–133 ms)** | between Celeste's 6 F tier and Skullgirls/SF6 mediums (9–11 F) |
| **Heavy hit** | **8–13 F (133–217 ms)** | matches the sourced heavy band (SF6 13 F, Skullgirls 9–10 F, GBVS Lv3–4 14–16 F) |
| **Crit** | **10–14 F** | Smash's 15-F-for-15% tier |
| **Kill / final blow** | **12–23 F (200–380 ms)**, then **0.6–1.5 s** slow-mo at **0.15–0.3** scale | SF6 supers 18–23 F; the peer-reviewed comfortable kill-stop was **~23 F (0.39 s)** with longer becoming unpleasant |
| **Hard caps** | **never exceed 30 F** of pure freeze (Smash's shipped cap); **never more than ~0.5 s** of dead time on a kill | [ssbwiki](https://www.ssbwiki.com/Hitlag) + the study's monotonic discomfort trend |

**Rationale** `[EI]`: position on the **hit-rate axis** first, then pick the number. Position matters more than the value: the same 13 F that feels weighty in a fighting game feels broken in a bullet-hell. **>150 ms on a repeatable attack reads as *lag*** — two independent sources warn of this, and the peer-reviewed data shows discomfort climbing monotonically with duration.

Also adopt Smash's **damage × per-move-multiplier** approach rather than hand-authoring every attack: hitstop should scale with damage *and* carry a per-attack multiplier so a weak-spot/tipper can feel different beyond its damage number.

### 2.2b Input buffering — the hard constraint nobody mentions

**This is the most commonly shipped bug in hitstop systems.** A naive whole-world freeze *eats the input buffer*.

| Evidence | Detail | Source |
|---|---|---|
| **Melty Blood: Type Lumina** buffers *through* hitstop | *"Moves are also buffered during the entirety of the blockstop **and hitstop** of a move, meaning that if a move causes **6 frames of hitstop** and you input a follow-up at frame 1 of the hitstop, it will be buffered throughout the entirety of it and come out once the hitstop is over."* Input can even be made **before** the hit and carry in. Base buffer **2 F**. | [Mizuumi MBTL/Game Data](https://mizuumi.wiki/w/Melty_Blood/MBTL/Game_Data) `[WIKI]` |
| **SF6** has explicit "screen freeze buffers" | Universal buffer **4 F** (5-frame window); dashes & wakeup reversals **7 F** (8-frame window). During Perfect Parry, opponent super activation and Drive Rush freezes, holding the button buffers the move; it picks your **most recent** input. | [SF6/Game_Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Game_Data) `[DATAMINE]` |
| **GBVS** buffers during hitstop | *"you can **buffer commands like special cancels during hitstop** and it will be executed immediately after hitstop ends"* — and charge-move characters *"get more time to charge"* | [Dustloop GBVS](https://www.dustloop.com/w/GBVS/Attack_Attributes) `[DATAMINE]` |
| **Garou: Mark of the Wolves** extends a window through the freeze | Feint window = **2 F before the first active frame → 1 F after exiting hitstop/blockstop** | [SuperCombo Garou/Offense](https://wiki.supercombo.gg/index.php?title=Garou:_Mark_of_the_Wolves/Offense&action=raw) `[DATAMINE]` |
| **Celeste needed a mod** because its freezes ate buffers | Freezeframes "could consume buffer windows, thus making buffer-reliant moves unnecessarily tight"; the mod hooks `Celeste.Freeze` and **adds freeze time to buffer counters** | [Leniency-Helper wiki](https://github-wiki-see.page/m/Parralax128/Leniency-Helper/wiki/Extend-Buffer-on-Freeze-and-Pickup) `[DEV]` |

**→ Rule** `[EI]`, corroborated by both shipped-code and shipped-game evidence: **run the hitstop timer on unscaled time, and do NOT let the input-buffer timer tick during hitstop — or extend it by the stop's duration.** Fighting games use hitstop to *give* input time; a naive freeze takes it away. Minimum buffer window **4–5 F**, extended by the hitstop.

### 2.3 Freeze the attacker+target, not the world

- "Optionally **freeze only the attacker+target, not the whole world**." ([feedback-recipes](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/references/feedback-recipes.md) `[AI-GENERATED]`)
- "**Freeze + shake = maximum impact**" — and shake must be multiplied by `Engine.time_scale` if you use a global hitpause, or the freeze silently kills the shake. ([97_camera_trauma](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/97_camera_trauma.md) `[AI-GENERATED]`)

**Implementation trap — this will break your game.** A hitstop implemented with a *scaled* timer never resumes: at `time_scale = 0` it never advances.

```gdscript
# Godot: 4th arg ignore_time_scale=true → the wait runs in real time
Engine.time_scale = 0.05
await get_tree().create_timer(0.08, true, false, true).timeout
Engine.time_scale = 1.0
```
```csharp
// Unity: WaitForSecondsRealtime ignores Time.timeScale. WaitForSeconds would never resume.
Time.timeScale = 0.05f;
yield return new WaitForSecondsRealtime(0.08f);
Time.timeScale = 1f;
```

Also: "**Hit-stop on every frame of a held attack locks the game. Trigger it once per impact.**" ([game-feel SKILL.md](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/SKILL.md))

**Architecture: per-entity freeze is the fighting-game model, and it is not equivalent to a global time scale.**

- **GBVS:** *"Hitstop applies to anything that can attack or get hit — including projectiles, but **excluding assist characters**. Entities experiencing hitstop are frozen in place, but **other objects on the stage are unaffected**. When a projectile hits the opponent, the character using the projectile does not experience hitstop, only the projectile and the opponent do."* ([Dustloop GBVS](https://www.dustloop.com/w/GBVS/Attack_Attributes) `[DATAMINE]`)
- **Smash:** *"Hitlag **only affects the object that deals the damage**; all other game elements (including… any particle effects the attack generated) are uninterrupted."* ([ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) `[DATAMINE]`)
- **Tutorials using a global time scale** warn: *"Time.timeScale is global. For selective freezing, use per-object pause states instead."* ([marty64.net VG101](https://www.marty64.net/kb/pages/code-bank/hitstop.html))
- Hitstop is **not** the same as super freeze, hitstun or blockstun: in GGXRD-R2, Tension-Balance drift *"still take[s] place **during hitstop, but not during super freeze**"* ([Dustloop GGXRD-R2/Damage](https://www.dustloop.com/w/GGXRD-R2/Damage) `[DATAMINE]`).

`[EI]` For a top-down game with projectiles, per-entity freeze is usually the better model — freezing the whole world also freezes unrelated enemies mid-telegraph, which **hides the telegraphs** you need for readability (see §11).

### 2.3b Asymmetry: the attacker and the defender need not stop for the same time

Sakurai's baseline is symmetry — *"With hitstop, both you and your opponent freeze for the exact same amount of time"* ([sourcegaming translation of the Famitsu column](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)). Divergence is a deliberate, documented design lever:

| Asymmetry | Value | Source |
|---|---|---|
| **SF6** lists attacker/defender as separate fields | LP/MP Shoryuken `15(13)`; HP Shoryuken `20(13)` — the **attacker** freezes longer | [SF6/Ryu/Data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data) `[DATAMINE]` |
| **SF2 supers** | attacker **8 F**, defender **10 F** — the **defender** freezes longer | [mugen-net SF2](https://mugen-net.work/wiki/index.php/Research:Street_Fighter_II) `[WIKI]` |
| **Counter-hit bonus** (GGXRD / GBVS) | extra hitstop is **receiver-only** (+0/+2/+4/+8/+12 GGXRD; +2/+2/+4/+8/+12 GBVS) | [Dustloop GGXRD-R2](https://www.dustloop.com/w/GGXRD-R2/Frame_Data), [GBVS](https://www.dustloop.com/w/GBVS/Attack_Attributes) `[DATAMINE]` |
| **GBVS "uneven hitstop"** | armour / guard-point / parry moves deliberately put the **opponent** into uneven hitstop so the defender can act first (beats safe jumps) | [Dustloop GBVS](https://www.dustloop.com/w/GBVS/Attack_Attributes) `[DATAMINE]` |
| **Smash shield interaction** | shield **×0.67**; multipliers >1× become ×0.8 against shield (never below 1×); multipliers **below** 1× are ignored while shielding | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) `[DATAMINE]` |
| **Smash perfect shield** | *"the attacker suffers from hitlag while the defender receives none"* | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) `[DATAMINE]` |
| **Smash Melee electric** | ×1.5 hitlag on the **victim only** (both from Brawl on) | [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) `[DATAMINE]` |

`[EI]` **Rule of thumb for this project:** attacker stop ≥ defender stop on the attacker's big moves (SF6's shape, which makes a heavy feel committed); give extra stop to the **receiver** on counter-hits/parries (so a punish reads as the defender's privilege).

### 2.4 What to do *during* the freeze — the part most games get wrong

Sakurai's Smash Ultimate hitstop spec ([notes](https://en.senkohome.com/sakurai-game-dev-specification/), cross-checked against [independent class notes](https://medill-east.github.io/2023/07/30/20230730-d04/)):

| # | Technique | Rule |
|---|---|---|
| 1 | **Shake the victim more** | "Make the receiving character shake more." Some games shake the attacker not at all, or neither. **Asymmetric shake sells who got hit.** |
| 2 | **Don't move the hitbox** | Shaking the victim would drag their hurtbox with it, "which **breaks combos that should be possible**. In Smash, **only the model shakes; the hitbox stays put.**" — the sharpest readability constraint in this brief |
| 3 | **Direction depends on ground/air** | Horizontal on the ground, all directions in the air. Reason: vertical ground-shake makes legs **clip through the floor** — which he notes is *not* a problem in 2D. |
| 4 | **Resolve the shake gradually** | "The shake amount is not constant — it starts larger and gets smaller," smoothed to end when hitstop does. |
| 5 | **Control the amount with a multiplier** | Hitstop scales with attack power **× a multiplier**. Same damage can have different hitstop per character (Ryu vs Kazuya) to match their source games. |
| 6 | **Interpolate into the damage pose** | Most games hold one frozen pose. Smash blends into the damage pose over **~4 frames (67 ms)** — "smoother and more satisfying". |
| 7 | **Keep the attacker moving very slightly** | The attacker's animation plays at a **very slow rate, sometimes not changing every frame**; on hitstop end it snaps back as if nothing happened. Purpose: makes the blade read as *actually cutting*. **Toggleable per attack** — some attacks are better with it off. |
| 8 | **Scale shake by camera distance** | "When the camera is farther away, the shake is larger than usual — so the hitstop feels similar regardless of camera distance." Directly applicable to any top-down game with zoom variation. |

**Sakurai's framing:** hitstop is "very important for getting sufficient feel", traceable to *Defender* (1980) and *Fantasy Zone* (1986).

---

## 3. Hit flash (white flash on enemy)

| Value | Recommended | Source |
|---|---|---|
| Duration | **~120 ms** | Two published *code defaults*: **120 ms** ([dev.to/saltmire](https://dev.to/saltmire/6-godot-4-game-feel-tricks-each-just-a-few-lines-of-gdscript-jmm)) and **150 ms** ([cursogame.dev](https://cursogame.dev/blog/godot-shader-hit-flash-dano)) |
| Design rule (quoted) | "**0.1–0.2 s covers most cases.** Shorter than that you can barely see it. Longer and it starts to look like the character is **catching fire** rather than taking a hit." | [cursogame.dev](https://cursogame.dev/blog/godot-shader-hit-flash-dano) |
| Hard ceiling | **200 ms** | derived from the above |
| Two-step variant (heavy hits) | tween **up to 1.0 in 50 ms**, then **down to 0.0 in 100 ms** (= 150 ms total) — "more organic" | [cursogame.dev](https://cursogame.dev/blog/godot-shader-hit-flash-dano) |
| Nijman's technique | flashing the enemy sprite **"white for a frame or two"** | [Pichlmair & Johansen, *Designing Game Feel: A Survey*](https://ar5iv.labs.arxiv.org/html/2011.09201) `[ACADEMIC]` — note this is 17–33 ms, i.e. a **hard snap with no fade**, vs the 120 ms tween. Different look, both valid. |
| Shader | `COLOR.rgb = mix(COLOR.rgb, flash_color.rgb, flash_modifier);` | [cursogame.dev](https://cursogame.dev/blog/godot-shader-hit-flash-dano) |
| Flash colour | white default; red for player damage; cyan/blue-white for sci-fi | [cursogame.dev](https://cursogame.dev/blog/godot-shader-hit-flash-dano) |

### 3.1 Additive vs multiply vs screen — resolved

| Approach | Verdict | Why |
|---|---|---|
| **`mix(rgb, flash_rgb, t)`** in a fragment shader | ✅ **Use this** | "To force pure white regardless of the original colour you need a `mix` in the fragment shader." |
| `modulate` / multiply | ❌ **Does not work** | "You can approximate it by only changing `modulate`, but that **multiplies** the colour and does not paint the sprite truly white. **A dark sprite with white modulate stays dark.**" |
| Additive | ⚠️ **Hazard** | Sakurai: "Relying on additive alone makes the whole thing go **hazy** and loses feel and contrast. Worse, **it only stands out where the screen is dark.**" Smash instead puts a **shadow at the hit point** so the flash has both light and dark. |
| Screen blend | — | **No fetched source recommends it for enemy hit flash.** Screen appears in Godot only as the default *glow* blend mode. |

Sources: [cursogame.dev](https://cursogame.dev/blog/godot-shader-hit-flash-dano), [Sakurai Effects](https://en.senkohome.com/sakurai-game-dev-effect/).

### 3.2 Two implementation traps

1. **Shared-material trap:** "If several enemies use the same on-disk `ShaderMaterial`, they share uniforms: when one flashes, **all of them flash together**. Duplicate the material at runtime in `_ready()`." ([cursogame.dev](https://cursogame.dev/blog/godot-shader-hit-flash-dano)) **Budget one material instance per enemy.**
2. **Alpha trap:** take alpha from the texture; do **not** force `COLOR.a = 1.0`, or you paint a white rectangle around the sprite. ([same](https://cursogame.dev/blog/godot-shader-hit-flash-dano))

### 3.3 The layering rule that makes the flash readable on a bright floor

Sakurai: "Effects tend to get bright, so **deliberately mixing in dark ones** makes them visible even on bright screens... setting things off with their opposite."

**Layer order for a hit: (1) white flash on the sprite → (2) dark-cored shockwave ring behind → (3) spark particles on top → (4) scale pop.** The dark core is what makes the white flash readable on a bright floor. ([Sakurai Effects](https://en.senkohome.com/sakurai-game-dev-effect/))

Also: reserve **white** for damage and **one other colour** (yellow) for i-frames/immunity, so the two never confuse ([same](https://en.senkohome.com/sakurai-game-dev-effect/)). And "zooming out strengthens the degree of reflection — large areas flashing up close is no good", i.e. **scale flash area by camera zoom** if you zoom.

---

## 4. Scale-pop / squash & stretch ("the punch")

| Value | Recommended | Source |
|---|---|---|
| Pop shape (published code) | `(1.3, 0.7)` set instantly → tween to `(1,1)` over **0.18 s**, `TRANS_BACK`/`EASE_OUT` (overshoot) | [feedback-recipes](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/references/feedback-recipes.md) |
| Pop (published code, other) | `pop(node, amount := 0.25, duration := 0.25)` → **×1.25 over 250 ms**, `TRANS_ELASTIC`/`EASE_OUT` | [dev.to/saltmire](https://dev.to/saltmire/6-godot-4-game-feel-tricks-each-just-a-few-lines-of-gdscript-jmm) |
| Hit scale-up factor | **1.1–1.5×** | [96_squash_and_stretch](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/96_squash_and_stretch.md) `[AI-GENERATED]` |
| Max stretch | **1.2–1.5×** subtle / **1.5–2.0×** cartoony | same |
| Max squash | **0.5–0.7×** realistic / **0.3–0.5×** exaggerated | same |
| Impact squash duration | **0.05–0.15 s (3–9 F)** | same |
| Overshoot on settle | **1.05–1.15×** | same |
| Spring-back stiffness | **10–30** (lower = bouncier) | same |
| Retro/pixel-art clamp | limit to **0.8–1.2×** | same |

**→ Recommendation for a fast top-down action game:** **1.15–1.3× up, settling back over 150–200 ms**, with `BACK`/`ELASTIC` ease-out. 250 ms reads slightly slow when hits are frequent; the code defaults bracket the range.

**Volume preservation (the one hard rule).** "If width scales by 1.5x, height scales by ~0.67x (1/1.5)." Breaking it is the most visible way to make a pop look amateurish. In 2D: `height_scale = 1.0 / width_scale`. ([96_squash_and_stretch](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/96_squash_and_stretch.md) `[AI-GENERATED]` — but this is classical animation law, not a game-specific invention.)

**Non-uniform vs uniform.** Every concrete code sample reacting to an *impact* uses **non-uniform** squash (`(1.3, 0.7)`); the "hit pop" samples use **uniform** scale-up (`×1.25`). `[EI]`: **in a top-down game the visual axis of an impact is ambiguous**, so uniform pop is safer for hits; reserve non-uniform squash for landing/ground-slam and for squash along the knockback vector.

**Pixel-art caveat (critical for this project).** "**Pixel art:** Quantize scale to whole pixels to avoid artifacts" and "use integer scale increments or shader-based squash" ([same](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/96_squash_and_stretch.md) `[AI-GENERATED]`, but mechanically obvious): a 1.3× pop on a 16×16 sprite produces fractional pixels and shimmer. Either snap to integer scales, do the squash **in the shader as a vertex deformation of an upscaled sprite**, or accept sub-pixel only if the whole game already renders at a non-integer-friendly scale. **This deserves an explicit art-direction decision.**

**Collider caveat.** "**Precise hitbox games:** Fighting games where hitbox must match visual exactly" ([same](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/96_squash_and_stretch.md)). If enemies have a physical body, a 1.3× visual pop makes the **visual silently outgrow the collision body** for 150–200 ms. Scale only the *sprite* node, never the collider (and see §2.4 TECH 2 — same principle as the hurtbox).

**Additional juice beat from *Juice It Or Lose It*:** "While being destroyed, a block **becomes smaller**… and **should spin**… and **become darker**." ([written summary of the talk](https://devblog.heisarzola.com/gdcr-juice-it-or-lose-it/)). **Die → shrink + spin + darken**; the *darken* doubles as contrast against the hit flash. And Sakurai: shift the rotation axis **off-centre** so a death corpse tumbles — "rotate at the centre looks inorganic" ([Sakurai specs](https://en.senkohome.com/sakurai-game-dev-specification/)).

---

## 5. Knockback: impulse → velocity → pixels

### 5.1 The conversion chain

`impulse` → `velocity` → `distance`, mediated by drag. Two decay laws:

- **Exponential drag** (Godot `linear_damp`, Unity `Rigidbody2D.linearDamping`, `vel *= 0.96`/frame): `v(t) = v₀ · e^(−kt)` ⇒ **total distance = v₀ / k**, time-to-95% = **3/k**. Self-limiting, never overshoots. `[EI]`
- **Linear decay — this is what Smash ships, with published constants:** `launch speed = knockback × 0.03`, then `launch speed decays by 0.051 every frame` ⇒ `time = v₀/0.051` frames, `distance = v₀² / (2 × 0.051)` units. ([ssbwiki Knockback](https://www.ssbwiki.com/Knockback) `[PRIMARY-IMPL]`)

Worked examples at 60 fps `[EI — arithmetic on the published constants]`:

| Knockback value | v₀ (units/frame) | Time to stop | Distance (units) |
|---|---|---|---|
| 10 (≈1 stage-builder block/sec) | 0.30 | 5.9 F = **98 ms** | 0.88 |
| 80.0001 (tumbling threshold) | 2.40 | 47 F = **784 ms** | 56.5 |
| 186 (KO from centre of Final Destination) | 5.58 | 109 F = **1.82 s** | 305 |

**No source argues for one decay law over the other.** `[EI]` Use exponential (`d = v₀/k`) as the default — it is self-limiting and stable — and switch to linear only if you want long, *readable* launches (Smash's model).

### 5.2 Published magnitudes

| Effect | Value | Source |
|---|---|---|
| 2D metroidvania attack impulse X (light/mid/heavy) | **250 / 360 / 780 px·s⁻¹** | [EVEngine tuning.nut](https://raw.githubusercontent.com/EVEngine/EVEngine/refs/heads/main/examples/metroidvania/tuning.nut) `[PRIMARY-IMPL]` (single unverified project) |
| upward launch pop | **−25 / −55 / −330 px·s⁻¹** | same |
| player walk speed / dash (scale reference) | **240 / 650 px·s⁻¹** | same |
| knockdown / getup lockout | **1.15 s / 0.34 s** | same |
| attack timing | startup 55/70/105 ms; active 100/110/140 ms; total 270/300/400 ms; combo grace 320 ms | same |
| Smash KB → launch speed | **× 0.03** | [ssbwiki](https://www.ssbwiki.com/Knockback) `[PRIMARY-IMPL]` |
| Smash launch decay | **0.051 / frame (linear)** | same |
| Smash **screen-flash threshold** | flash white at **≥160 units** of knockback | same |
| Smash bounce knockback reduction | 20% (Melee, Sm4sh), 15% (Brawl), **5% (Ultimate)** | same |
| Smash launch auto-speed-up | above **32 frames of hitstun** | same |
| **DRL / DoomRL — damage required per tile of knockback** | ranged **12** · shotgun & most explosions **7** · BFG **14** · rocket-jump explosions **2** · **melee never knocks back** | [DRL wiki](https://drl.chaosforge.org/w/index.php?title=Knockback) `[PRIMARY-IMPL]` |
| DRL knockback modifiers | Cleaver / Longinus Spear / Dragonslayer **halve** it; Badass trait **−1 tile per rank**; armour a **percentage**, rounded to nearest tile | same |
| **Diablo 2 — knockback chance by target size** | Large **25%** · Medium **50%** · Small **100%** · Act bosses/stationary/golems **0%** | [Basin wiki](https://d2.lc/AB/wiki/indexdd6b.html), [FAQtoids](http://www.mannm.org/d2library/faqtoids/kb_eng.html) `[SECONDARY]` (two independent pages agree) |
| **Diablo 2 — knockback distance** | "up to **three sub-tiles** when unobstructed… **This distance cannot be increased.**" | [Basin wiki](https://d2.lc/AB/wiki/indexdd6b.html) |
| Diablo 2 distance — **conflicting source** | "set to the limits of a **7×7 square of subtiles**… distance varies between approximately **2 yards and 2.66 yards**" | [FAQtoids](http://www.mannm.org/d2library/faqtoids/kb_eng.html) |

**The two Diablo 2 sources conflict** on the knockback volume's *shape*. Not averaged: both agree the magnitude is **small, fixed and non-scalable**, which is the design lesson.

### 5.3 Recommended values for a 60 fps 2D top-down game

`[EI]` — synthesis. **Decide distance first, then solve for `v₀`.**

| Hit | Knockback distance | `v₀` (px/s) | With `k = 15.6 /s` exponential |
|---|---|---|---|
| Light | **8–16 px** | **~250** (≈ walk speed) | `d = 250/15.6 = 16 px`; settles in **0.19 s** |
| Heavy | **32–64 px** | **~780** (3.25× walk) | `d = 780/15.6 = 50 px`; settles in **0.19 s** |
| Kill/launcher | **80–150 px** | 1200–1800 | Slower `k` (~8) for a longer slide |

The exponential constant `k` sets **how long** the slide lasts independently of how far it goes — tune `k` for feel (higher = snappier stop) and `v₀` for distance. The numbers above land inside the requested 8–16 px / 32–64 px envelope, which is a good consistency check.

**Express knockback in tiles in the design doc.** Tile-denominated knockback is **real, published practice** (DRL derives tiles from damage; Diablo 2 works in sub-tiles). Use DRL's pattern: **derive tiles from damage, then cap tiles.** This is cleaner than a hand-authored px table and lets designers balance in the same units they think in.

**Do NOT expect a "0.5 body widths" convention — it does not exist in any reachable source.** Tiles do; body-widths do not.

**Cap the distance; don't scale it.** Diablo 2's "cannot be increased" is the cleanest expression of this: knockback is a *fixed, small* displacement, and its gameplay role is to interrupt, not to reposition.

**No hitstun↔knockback pairing rule exists** (e.g. "hitstun = 1.2 × knockback duration", "player knockback = 0.5 × enemy knockback"). That premise is **unverified**. `[EI]` In practice: lock input for the knockback duration for light hits (so the hit *reads* as landing) and let input buffering through for heavy hits (so it does not feel like a stun-lock).

**Asymmetry:** knockback the player **less** than enemies for ordinary hits (a pushed player loses positional control, which is expensive in a top-down game), but **more** for a boss slam, where being thrown is the point. Nijman's version: "firing of a bullet **shakes the screen while also pushing the player character a few pixels back**" ([Pichlmair & Johansen survey](https://ar5iv.labs.arxiv.org/html/2011.09201) `[ACADEMIC]`) — recoil on the *shooter* is part of the same system.

---

## 6. Particle counts, lifetime, size

### 6.1 Recommended tiers

| Tier | Count | Lifetime | Velocity | Source |
|---|---|---|---|---|
| Hit spark | **6–20** | **0.25–0.6 s** | 90–320 px/s | `[EI]` |
| Small/common enemy death | **12–20** | **0.4 s** | 90–320 px/s | `[EI]` |
| Mid enemy death | **30** + a sub-emitter of 10 debris | **0.6 s** | — | `[EI]` |
| Boss death | **120** across 3 staggered emitters | **1.0–1.5 s** | — | `[EI]` |
| Independent corroboration | "**20–30 particles is sufficient for one hit**" | 0.5–1 s | **200–400 px/s**, `gravityModifier` 0.5 | [eastondev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/) `[SECONDARY]` |
| Three-tier scheme | small **0–4** · medium **6–12** · large **20–40** | — | — | [feedback-recipes](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/references/feedback-recipes.md) `[AI-GENERATED]` |
| LOD ladder worth stealing | **300 / 150 / 80** across LOD0/1/2 | — | — | [2ds.cn](https://www.2ds.cn/商业游戏特效规范：手游与端游的特效制作标准差异-16/) `[SECONDARY]` |

**Particle size:** no source publishes an absolute pixel size — it must scale with the sprite. Godot's `scale_min`/`scale_max` default to **1.0**; use **0.5–1.5 random scale** with a `scale_curve` shrinking debris to 0 over life ([Godot ParticleProcessMaterial](https://raw.githubusercontent.com/godotengine/godot/master/doc/classes/ParticleProcessMaterial.xml)). **Enforce a maximum particle sprite size** — see overdraw below.

### 6.2 The production budget that matters — and it is not particle count

> **"The number of particles matters very little on the CPU side compared with the number of particle *systems*."** The expensive calls are `ParticleSystem.Update` and `ParticleSystem.ScheduleGeometryJobs`. On the GPU, **"overdraw is the particle system's biggest killer."**
> — [UWA production Q&A](https://blog.uwa4d.com/archives/TechSharing_169.html)

| Budget | Value |
|---|---|
| Per-effect ceiling (older strict standard) | **≤ 50 particles, ≤ 10 draw calls** |
| "Too many no matter what" | **400+ particles in one effect** |
| Emitters per effect | **5–60 emitters inside one effect is "already the wrong approach" → keep to 3–4** |
| Concurrent particle systems on screen | **< 50** on low/mid-end devices |
| **Overdraw / fill multiplier** | Warn at average fill **> 3** (**> 4** without skybox) or single frame **> 5**. Measured bad case: **12×**. Good case: 90 overlapping layers, total fill **2** |

All from [UWA](https://blog.uwa4d.com/archives/TechSharing_169.html).

**Consequence:** a 12-particle burst of 64×64 additive sprites is **worse** than a 60-particle burst of 8×8 sprites. **Budget emitters and fill rate, not counts.**

**Engine enforcement:** Unity's **Max Particles** hard-caps alive particles, and **Ring Buffer Mode** recycles oldest-first ([Unity docs](https://docs.unity3d.com/Manual/PartSysMainModule.html)); use **Pause** or Automatic culling, never Pause-And-Catch-Up for explosions (it "can cause performance spikes"). In Godot, `GPUParticles2D.amount` allocates up front — **"higher values will increase GPU requirements even if not all particles are visible,"** and lowering `amount_ratio` at runtime buys **nothing** ([Godot docs](https://raw.githubusercontent.com/godotengine/godot/master/doc/classes/GPUParticles2D.xml)). **Size `amount` to the true peak once, and pool emitters rather than instancing per death.**

### 6.3 The explosion structure worth copying (Sakurai, 4 stages)

1. **Flash** — lights up instantly, "tells something happened" (**mix in black** to avoid blowout)
2. **Blast smoke** — "bursts grandly from the centre; **the key to the explosion's quality**"
3. **Black smoke** — takes over from the flame, gives aftermath
4. **Settle** — "you want it gone fast, but too short lacks feel"

([Sakurai Effects](https://en.senkohome.com/sakurai-game-dev-effect/))

`[EI]` Mapping to 2D at 60fps: white flash **1 F** → colourful burst **3 F** → dark debris/smoke **10–20 F** → settle **10 F** ≈ **0.4–0.6 s total**.

**Granularity rule:** a death effect larger than the enemy must have *granularity* (many small elements), not just a scaled-up version of the small effect — "a flame the same size or bigger than the character looks like a candle or torch... The problem is **insufficient granularity**." This is why the boss burst needs more than a scaled common-enemy burst.

### 6.4 The strongest readability lever in this brief

> **"For the sake of impact, the character can get buried in the effect and become hard to see. Fairly common. In a 2D game it's easy: raise the character's display priority above the effect. No issue with the look either."**

**Put the player and enemy sprites on a higher z-layer than the death and hit VFX.** Explicitly recommended for 2D by a first-party source; costs nothing to implement.

### 6.5 Godot particle defaults that are wrong for a death burst

| Property | Default | Set to | Why |
|---|---|---|---|
| `explosiveness` | **0.0** | **0.9–1.0** | "The single most important knob for 'explosion' vs 'hose'" |
| `lifetime` | **1.0 s** | 0.3–0.5 (hit/small), 0.6–1.0 (mid), 1.0–1.5 (boss) | Unity's default 5 s is 10× too long for 2D |
| `lifetime_randomness` | **0.0** | **0.3–0.5** | Stops all debris vanishing on one frame, hiding the emitter-end "pop" |
| `gravity` | `(0, -9.8, 0)` | `(0, ~200, 0)` | Godot 2D particles are in **pixel** units; 9.8 px/s² is effectively zero |
| `damping` | **0.0** | **150–400** sparks; 0–100 debris | "100 means the particle goes from 100 velocity to 0 in 1 second" — high damping reads as *impact* |
| `spread` | **45.0°** | **180°** radial burst | Default gives a cone, not a burst |
| `visibility_rect` | `Rect2(-100,-100,200,200)` | grow to max burst radius | Otherwise particles vanish at screen edges |
| `scale_min`/`scale_max` | **1.0** | 0.5–1.5 random | plus `scale_curve` → 0 |

Sources: [GPUParticles2D.xml](https://raw.githubusercontent.com/godotengine/godot/master/doc/classes/GPUParticles2D.xml), [ParticleProcessMaterial.xml](https://raw.githubusercontent.com/godotengine/godot/master/doc/classes/ParticleProcessMaterial.xml), [Godot 2D particle docs](https://raw.githubusercontent.com/godotengine/godot-docs/master/tutorials/2d/particle_systems_2d.rst).

**Cheapest big win (Sakurai):** "draw several on one strip" — one atlas strip holding 4 sparks, emitted with staggered timing and positions, gives the *look* of 4 emitters for **1 draw call**. He notes Kirby's Adventure drew its stars frame-by-frame from coordinate data with **no movement program at all**.

**Cheapest QC tool (Sakurai):** "Effects flood you with all sorts of information in an instant, so they're **hard to catch with the eye**… **observing well is the shortcut**." **Build a debug key that plays your hit effect at 0.1× speed on a plain background.**

---

## 7. UI / level-up / post-processing flash timings

### 7.1 Material Design — the authoritative UI motion source

Verbatim from [Material Design — Duration & easing](https://m1.material.io/motion/duration-easing.html):

| Context | Duration |
|---|---|
| Mobile transition (typical) | **300 ms** |
| Large / complex / full-screen | **375 ms** |
| Element **entering** screen | **225 ms** |
| Element **leaving** screen | **195 ms** |
| Upper bound | **"Transitions that exceed 400 ms may feel too slow."** |
| Desktop | **150–200 ms** |
| Tablet | **+30% vs mobile** (300 → 390 ms) |
| Wearables | **−30% vs mobile** (300 → 210 ms) |

**Exact easing curves** (CSS, directly usable as Godot `Curve`/Unity `AnimationCurve` control points):

| Curve | CSS | Use |
|---|---|---|
| Standard (ease in-out) | `cubic-bezier(0.4, 0.0, 0.2, 1)` | most common; growing/shrinking material |
| Deceleration (ease-out) | `cubic-bezier(0.0, 0.0, 0.2, 1)` | elements **entering** |
| Acceleration (ease-in) | `cubic-bezier(0.4, 0.0, 1, 1)` | elements **leaving** |
| Sharp | `cubic-bezier(0.4, 0.0, 0.6, 1)` | quick accel + decel |

### 7.2 Material Design 3 duration tokens — the cleanest scale

All in **ms** ([M3 tokens](https://pub.dev/documentation/material_design/1.8.0/material_design/M3MotionDuration-class.html), citing `m3.material.io/styles/motion/easing-and-duration/tokens-specs`):

**Raw:** short1 **50** · short2 **100** · short3 **150** · short4 **200** · medium1 **250** · medium2 **300** · medium3 **350** · medium4 **400** · long1 **450** · long2 **500** · long3 **550** · long4 **600** · extraLong1 **700** · extraLong2 **800** · extraLong3 **900** · extraLong4 **1000**

**Named:** `emphasized` **500** (on-screen at start and end) · `emphasizedIncoming` **450** · `emphasizedOutgoing` **150** · `standard` **300** · `standardIncoming` **250** · `standardOutgoing` **200** · `linear` **150**

`[EI]` Map to the HUD: **50 ms** micro-interaction (button press), **100–200 ms** component transition (a damage number appearing), **250–400 ms** content transition (level-up banner entering), **500 ms+** full-screen celebration.

**Nielsen's response-time limits** — the only solid *primary* citable latency threshold found: **0.1 s** = feels instantaneous / direct manipulation; **1.0 s** = uninterrupted flow of thought; **10 s** = attention limit ([Nielsen, citing Miller 1968 and Card et al. 1991](https://www.nngroup.com/articles/response-times-3-important-limits/)). This is **HCI, not games** — but it is the defensible source for "input→feedback must land within 100 ms." The game-specific claims ("players notice >100 ms", "pros notice >50 ms") were **not verifiable**: the Yale latency thesis (Banatt 2017) now 404s.

**Related UI values:** damage number rises **+32 px over 0.5 s** while fading ([dev.to/saltmire](https://dev.to/saltmire/6-godot-4-game-feel-tricks-each-just-a-few-lines-of-gdscript-jmm)); button press scale **0.92–0.9 over 80–120 ms** ([eastondev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/) `[SECONDARY]`).

### 7.3 Level-up — composition, not citation

**No published breakdown of a game's level-up celebration timing exists.** The concrete guidance is generic UI motion timing. `[EI]` A defensible recipe from the M3 tokens:

- banner scale-in with overshoot over **250 ms** (`standardIncoming`)
- glow pulse **×1.4 over 200 ms**, then decay over **400 ms**
- hold the celebration **1.2–2.0 s** (this exceeds M3's 400 ms "transition" bound deliberately — a level-up is a *cutscene*, so it must be skippable/interruptible)
- dismiss over **150 ms** (`emphasizedOutgoing`)

### 7.4 Staggering the feedback channels

`[SECONDARY]` but coherent and cheap to test: rather than firing every channel on one frame, offset them — **vibration + sound simultaneously → flash 20 ms later → particles 50 ms later → floating damage text 100 ms later.** An all-sequential 12 ms-interval alternative tested *worse*. ([eastondev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/))

`[EI]` The value is the principle, not the offsets: **layered on the same frame they read as one muddy pose; staggered by 20–100 ms they read as a burst with duration.** Staggering also spreads per-frame particle and overdraw cost.

**Related ceiling:** "Normal attacks max **3–5 feedbacks per second**" ([same](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/) `[SECONDARY]`). Together with the shake cap (**<5–10/sec**) and the WCAG **3 flashes/sec** limit, three unrelated sources converge on the same budget — a good sign it is the real one.

### 7.5 Chromatic aberration & bloom — a real evidence gap

**Neither engine documents a "safe duration" or "safe pixel offset" for a CA impact pulse, because neither exposes a pixel offset.**

| Engine | What is exposed |
|---|---|
| **Unity URP — Chromatic Aberration** | **Only a 0–1 Intensity.** "Values range between 0 and 1... **The default value is 0, which disables the effect.**" ([Unity docs](https://docs.unity3d.com/6000.1/Documentation/Manual/urp/post-processing-chromatic-aberration.html)) |
| **Godot** | **No built-in chromatic aberration at all** — absent from the `Environment` class. Any CA is a custom shader. ([Godot Environment.xml](https://raw.githubusercontent.com/godotengine/godot/master/doc/classes/Environment.xml)) |
| Unity URP — Bloom | Threshold default **0.9**; Intensity 0–1, **default 0 (disabled)**; Scatter **0.7** ([Unity docs](https://docs.unity3d.com/6000.1/Documentation/Manual/urp/post-processing-bloom.html)) |
| Godot — glow | `glow_enabled` **false**, `glow_intensity` **0.3**, `glow_bloom` **0.0**, `glow_hdr_threshold` **1.0**, blend **SCREEN** ([Godot Environment.xml](https://raw.githubusercontent.com/godotengine/godot/master/doc/classes/Environment.xml)) |
| **Godot glow in 2D — critical** | "This value also needs to be **decreased below 1.0 when using glow in 2D, as 2D rendering is performed in SDR.**" — **set `glow_hdr_threshold ≈ 0.9`.** The 1.0 default shows you *nothing*. |

The only published CA-flash figures come from one `[AI-GENERATED]` repo: offset **2–10 px @1080p**, intensity **0–0.5 subtle / 0.5–1.0 extreme**, duration **0.1–0.3 s**, decay 1.5–3.0 ([99_screen_effects.md](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/99_screen_effects.md)). **Its per-game attributions ("Hyper Light Drifter 0.6 on dash", "Celeste 0.2 on dash") are almost certainly fabricated — use the ranges, never the game names.**

**Recommended** `[EI]`:
- **CA: intensity 0.25–0.4, ~3–6 px @1080p, ≤150 ms, on the hit frame only.** 10 px will smear pixel art. **Zero it (not halve it) under reduced-motion.** It is the most headache-adjacent effect in the toolkit and the least load-bearing.
- **Bloom: multiply intensity ×1.3–1.8 for 100–300 ms** (a *multiplier*, since Unity's max is 1.0). In Godot animate `glow_intensity` 0.3 → ~0.5 → 0.3, or `glow_bloom` 0.0 → 0.15. **Do not pulse `glow_hdr_threshold`** — it reads as a gamma shift.
- **Keep glow blend mode SCREEN (Godot's default).** Additive glow blows out whites and destroys the white hit-flash's readability.
- **Budget total luminance per event, not per effect** — flash + bloom + screen flash stack additively and are governed by §10.

---

## 8. Hit-pause vs slow-motion (time scale 0.1–0.4)

### 8.1 Two different tools, not two settings of one knob

| | **Hitstop** | **Slow-motion** |
|---|---|---|
| What changes | Time nearly **stops** for a few frames | Time **runs slowly** for a noticeable span |
| Duration | 3–15 F (**50–250 ms**) | **0.15–2 s** |
| Time scale | **0.0–0.05** | **0.1–0.5** |
| Triggered by | *Every* hit — the per-hit impact channel | *Rare* events: killing blow, perfect parry, last enemy, finisher |
| Cost of overuse | Feels **laggy/sticky**; breaks input and rapid-fire | Feels like the game **lost focus**; not special if common |
| Player control | Must **not** block input buffering | Deliberately takes control briefly — so must be short and rare |

### 8.2 Recommended values

| Value | Recommended | Source |
|---|---|---|
| Time scale | **0.1–0.4×** (0.05× only for a 1–3 s finisher) | `[EI]`; [G_05](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/refs/heads/main/G_05_screen_effects.md) says 0.1–0.5× `[AI-GENERATED]`. **Verified shipped value: Smash Ultimate's Witch Time runs opponents at 1/8 speed ≈ `0.125`.** ([ssbwiki Witch Time](https://www.ssbwiki.com/Witch_Time) `[DATAMINE]`) |
| Kill | **0.15–0.5 s**, with a **0.2 s ramp back to 1.0** | [dev.to/saltmire](https://dev.to/saltmire/6-godot-4-game-feel-tricks-each-just-a-few-lines-of-gdscript-jmm): `time_scale 0.05` for **0.15 s real**, ramp back over **0.2 s** |
| Boss / ultimate | **0.5–1.5 s** | `[EI]`; [G_05](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/refs/heads/main/G_05_screen_effects.md) gives 0.5–2 s. **Verified shipped: Witch Time base `90 F = 1.5 s`, max `240 F = 4 s`, min `22 F` — with a `+60 F` penalty per use and ~25 s to fully refresh**, i.e. a deliberate anti-spam economy. ([ssbwiki Witch Time](https://www.ssbwiki.com/Witch_Time) `[DATAMINE]`) |
| "Last enemy killed" beat | **0.5–1.0 s** | `[EI]`; canonical trigger per [G_05](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/refs/heads/main/G_05_screen_effects.md) |

**Where slow-motion belongs.** The academic survey is explicit: slow-mo is *"usually employed at the finishing attack… makes the climactic finishing attacks clearer to the viewer"* ([arXiv 2208.06155, IEEE GEM 2022](https://arxiv.org/html/2208.06155v3) `[ACADEMIC]`). `[EI]` **Put it on finishers; never on ordinary hits** — that is the difference between slow-mo reading as *weight* and reading as *lag*.

**The ramp matters more than the scale.** `[EI]` A hard cut from 0.05× back to 1.0× reads as a *stutter*; a 0.2 s ease-out reads as *release*. Ramp **in** fast (or instantly, as part of the hitstop); ramp **out** over ~0.2 s.

**⚠️ Honest gap on ramps:** **no source with ramp-in/ramp-out durations was found at all.** The only mention came from an AI-generated doc. The peer-reviewed study deliberately used a **constant 0.01× for the whole window with no ramp** ([SCITEPRESS](https://www.scitepress.org/publishedPapers/2024/124614/pdf/index.html)). The 0.05–0.15 s in / 0.1–0.2 s out figures I gave in §8.2 for the kill case are taken from one published Godot code default (the 0.2 s ramp-out); **treat the rest as `[EI]`, not citation.**

### 8.2b Long freezes have shipped precedent — but they are a different class

For calibration, two documented 60 F-class freezes: ***Fantasy Zone* (1986)** stops the screen for **one full second** when you are hit, and **DBFZ** freezes the opponent for **a whole second** on an ultimate wind-up ([medill-east notes](https://medill-east.github.io/2022/09/01/20220901-stop-for-big-moments/), [arXiv 2208.06155](https://arxiv.org/html/2208.06155v3)). These are **super freeze / cinematic punctuation**, an order of magnitude above combat hitstop — do not let them pull your per-hit numbers up.

Sakurai's ladder for a finishing blow is a **layering** pattern, not a choice: **no effect → Stop → Stop + Shake → Stop + Shake + Slow Motion** ([medill-east notes](https://medill-east.github.io/2022/09/01/20220901-stop-for-big-moments/)). DBFZ's cinematic camera holds the zoom for *"several frames"* then **snaps out** ([arXiv 2208.06155](https://arxiv.org/html/2208.06155v3)).

### 8.2c The finding that should shape the whole feedback system

A peer-reviewed NLP analysis of **96 Steam action games** ranked 19 impact-feel features and concluded that **three** are decisive:

> **hit stop + sound coherence + camera control** — *"a lack of dedicated design on one of these three features may ruin players' impact feel."*
> — [arXiv 2208.06155 (IEEE GEM 2022)](https://arxiv.org/html/2208.06155v3) `[ACADEMIC]`

`[EI]` **This is the most useful structural result in the entire brief.** It means hitstop, **audio**, and **camera** should be designed and budgeted as **one system**, not as three independent polish passes — and that a game can have excellent particles and flashes and still feel bad if the audio doesn't cohere with the hit or the camera doesn't respond. It also licenses spending art-direction budget on *sound* rather than on more VFX, which is the opposite of what a juice checklist usually implies.

**Related findings on what "coherence" means for audio:** audio pitch may scale with `timeScale`, but keep `minTimeScale ≈ 0.01` or use unscaled audio; UI and VFX nodes should be pause-immune ([marty64.net](https://www.marty64.net/kb/pages/code-bank/hitstop.html)). Smash quantifies the scale-side of the same principle: shake amplitude is scaled by **camera distance** and **decays over the freeze** ([ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag), [sourcegaming](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)).

### 8.3 Implementation notes

- **Never use a time-scaled timer to end it** — at low `time_scale` it takes proportionally longer in real time and at 0 it never fires. Same trap as §2.3.
- **Multiply camera shake by `time_scale`** or shake visibly keeps running at full speed while the world is frozen ([97_camera_trauma](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/97_camera_trauma.md)).
- **Audio and VFX must follow the slowdown** (pitch-shifted / low-passed audio, extended particle trails). If they stay at normal speed the effect reads as a frame-rate bug ([G_05](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/refs/heads/main/G_05_screen_effects.md)).
- **Never slow down UI or input sampling** with the world, or slow-motion becomes input lag.

### 8.4 Pairing rule

`[EI]` These effects stack multiplicatively in perceived intensity — use both only at the top of the hierarchy:

| Event | Hitstop | Slow-mo | Shake (trauma) | Flash |
|---|---|---|---|---|
| Ordinary hit | 3–4 F | — | 0.10–0.20 | 120 ms white |
| Heavy hit | 5–6 F | — | 0.30–0.40 | 120 ms + scale pop |
| Crit | 8–10 F | — | 0.5 | 120 ms + zoom punch |
| **Kill** | 10–15 F | **0.3× for 0.15–0.3 s** | 0.6 | 150 ms + particles |
| **Boss / ultimate** | 20–30 F | **0.2× for 0.5–1.5 s** | 0.9–1.0 | full suite + bloom + CA |

Keeping this as the single source of truth is what prevents the "everything is maxed" failure in §11.

---

## 9. Screen flash / vignette on player damage

### 9.1 The canonical pattern: vignette, not full-screen flash

The clearest sourced description, from a named designer ([80.lv](https://80.lv/articles/using-unity-to-effectively-polish-your-gameplay)):

> "Unity has a 'post processing stack'... 'Vignette'... is normally used to darken the screen's edges to approximate a physical camera lens. **But we will tint it red to give the impression of pain or damage. On impact, a script will crank up the intensity suddenly and then gradually fade it out.**"

Two more transferable ideas from the same source:
- **No health bar.** Low HP maps to a **red emission** value on the player sprite — "both input and output are analog values."
- **Asymmetry:** small shake on destroying an enemy, **big shake when getting attacked**. Player explosion = a larger version of the enemy explosion, and "because this is an infrequent and important event, we can feel free to crank up the intensity."

### 9.2 Recommended values

| Value | Recommended | Basis |
|---|---|---|
| Damage vignette — attack | **spike 40–60 ms** | `[EI]`; the sourced figure is only "crank up suddenly then fade" |
| Damage vignette — fade | **300–500 ms** | `[EI]`; the `[AI-GENERATED]` source says 100–300 ms total. **A hard 100 ms cut on the player's own damage reads as a bug — the fade is what sells "you got hurt."** |
| Damage vignette alpha | **0.2–0.5** | `[EI]` |
| Low-health vignette | **0.2 at 100% HP → 0.6 at 0%** | `[AI-GENERATED]` source proposes up to 0.8. **0.8 is too heavy for top-down** — with a red tint you lose peripheral visibility, which is where off-screen threats live. `[EI]` |
| Vignette smoothness | **0.4–0.6** for tight "tunnel vision" (Unity default 0.2 is photographic/soft) | [Unity URP Vignette](https://docs.unity3d.com/6000.1/Documentation/Manual/urp/post-processing-vignette.html) |
| Low-health pulse | **1–1.5 Hz** (heartbeat), must stay under the WCAG **3 Hz** ceiling | `[EI]` + §10 |
| Damage-scaled intensity | `intensity = clamp(damage / 50.0, 0, 1)` | [99_screen_effects](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/99_screen_effects.md) — adjust the 50 to your typical hit |
| Directional camera punch | offset camera **away** from impact: **8 px, 0.12 s** | [dev.to/saltmire](https://dev.to/saltmire/6-godot-4-game-feel-tricks-each-just-a-few-lines-of-gdscript-jmm). "Punch the camera away from the hit and the brain fills in the force" — **this substitutes for a directional damage indicator** |
| Directional damage arc | reuse the vignette's **250–500 ms** decay | `[EI]` so the two read as one event |

**Gap:** no fetched source gives numbers for **damage-direction indicators** or a **low-health heartbeat frequency**. The camera-punch trick and the WCAG <3 Hz ceiling are the only citable things here.

### 9.3 Red is the risky colour — a spec issue, not a taste issue

A red damage vignette interacts with the WCAG **red-flash** rule, which has **no luminance floor**: the test is `R/(R+G+B) ≥ 0.8` plus a CIE 1976 UCS difference > 0.2, and a *pair* of opposing transitions counts as a flash. The spec also notes "**People are even more sensitive to red flashing than to other colours.**" ([SC 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html))

`[EI]` Practical rules:
1. **Use a deep, desaturated red.** A bright saturated red sits on the trigger ratio, and a *pulsing* low-health vignette then literally produces red flashes.
2. **Pulsing a red vignette is the highest-risk effect in this brief.** Keep the luminance swing small, pulse ≤1.5 Hz, and disable the pulse under "reduce flashing."
3. **Redundant encoding** — red is also the most common colour-blindness axis, so pair the red vignette with the camera punch and (ideally) rumble. Never let colour be the only channel.

---

## 10. Accessibility — the hard limits

**These are the only numbers in this brief that are not a matter of taste.** Read verbatim from the spec.

### 10.1 WCAG 2.2 SC 2.3.1 — Three Flashes or Below Threshold (**Level A**)

> "Web pages do not contain anything that flashes more than **three times in any one second period**, or the flash is below the general flash and red flash thresholds."

A sequence *passes* if **either**:
> - "there are no more than **three general flashes** and / or no more than **three red flashes** within any one-second period; **or**
> - the combined area of flashes occurring concurrently occupies no more than a total of **.006 steradians within any 10 degree visual field** on the screen (**25% of any 10 degree visual field**) at typical viewing distance"

where:
> - "A **general flash** is defined as a pair of opposing changes in relative luminance of **10% or more** of the maximum relative luminance (1.0) where the relative luminance of the darker image is **below 0.80**; and
> - A **red flash** is defined as **any pair of opposing transitions involving a saturated red**"

**The 10° field, concretely:** "using a **341 x 256 pixel rectangle** at 1024 x 768 will provide a good estimate of a 10 degree visual field" = **341 × 256 = 87,296 CSS pixels**.

**WCAG 2.2's numeric "saturated red":** "a pair of opposing transitions where one transition is either to or from a state with a value **R/(R + G + B) ≥ 0.8**, and the difference between states is **more than 0.2** (unitless) in the CIE 1976 UCS chromaticity diagram." \[ISO 9241-391\]

**Practical escape hatch (Note 4):** "no tool is necessary to evaluate for this condition **if flashing is less than or equal to 3 flashes in any one second**" — content automatically passes.

**Fine-pattern exception:** white noise, or a checkerboard with squares **smaller than 0.1 degree** per side, does not violate the thresholds.

Source: [W3C, Understanding SC 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html).

### 10.2 SC 2.3.2 — Three Flashes (**AAA**, much stricter)

> "Web pages do not contain anything that flashes more than **three times in any one second period**."

**No brightness or size exemption:** "this criterion does not allow any flashing that occurs at a frequency greater than 3 per second, **regardless of brightness or size**. As a result, **even a single flashing pixel would violate this criterion.**" ([SC 2.3.2](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes.html))

### 10.3 Video/HDR variant — ITU-R BT.1702

For non-sRGB colour spaces (i.e. essentially any HDR game): "the industry standard definition of a general flash is **a change in luminance of 20 cd/m² or more where the darker image is below 160 cd/m²**... For HDR content when the darker state is **160 cd/m² or more**, a general flash is one where the **Michelson contrast is 1/17 or greater**." ([SC 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html))

### 10.4 The "25%" trap — three different quantities sharing one number

**This is the most likely place an internal spec silently goes wrong.**

| Source | What "25%" means | Verbatim |
|---|---|---|
| WCAG 2.2 | 25% of a **10° visual field** (= 0.006 sr) | "no more than a total of .006 steradians within any 10 degree visual field" |
| Game Accessibility Guidelines | 25% **of the screen** | "more than 3 flashes in a single second covering **25%+ of the screen**" ([GAG](https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/)) |
| HardingFPA | 25% of the **video frame** | "The flashing area must exceed **25% of the video frame** to generate a flash failure" ([HardingFPA](https://www.hardingfpa.com/technical-support/how-to-interpret-hardingfpa-results/)) |
| Xbox XAG 118 | **"approximately 20 percent or more"** | ([XAG 118](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118)) |

The WCAG rule is **not** "a quarter of the screen": the 341×256 block is only **~4.2% of a 1920×1080 frame** (11.1% of 1024×768, 7.1% of 1280×960). GAG itself flags the discrepancy, warning its figures assume "a typical screen display, not a display that takes up 100% of your field of view." **Any internal spec must state which definition it uses.**

### 10.5 Other sourced limits

| Limit | Value | Source |
|---|---|---|
| Auto-starting motion/blink/scroll needing pause control | **> 5 seconds** | [WCAG 2.2 SC 2.2.2 (A)](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) |
| Interaction-triggered motion must be disableable | (AAA) | [SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) |
| Photosensitive epilepsy prevalence | **~1 in 4,000** of the general population; **~3%** of people with epilepsy | [Epilepsy Society](https://epilepsysociety.org.uk/understanding-epilepsy/photosensitive-epilepsy), [XAG 118](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118) |
| Common trigger band | **3–30 Hz** (some up to **60 Hz**; below 3 Hz uncommon) | [Epilepsy Society](https://epilepsysociety.org.uk/understanding-epilepsy/photosensitive-epilepsy) |
| **Peak band** | **16–25 Hz** (not 15–25) | [Epilepsy Society](https://epilepsysociety.org.uk/understanding-epilepsy/photosensitive-epilepsy) |
| XAG 118 luminance/area failure | **10% luminance change**, darker value **<0.8**, **> ~3/sec**, area **~20%+** | [XAG 118](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118) |
| XAG 118 red-flash test | change in **(R−G−B) × 320 > 20** | [XAG 118](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118) |
| HardingFPA extended failure | flash in **≥80% of the most recent 5 seconds** | [HardingFPA](https://www.hardingfpa.com/technical-support/how-to-interpret-hardingfpa-results/) |
| WCAG 3.0 | Adds **no new numeric flash threshold**; copies WCAG 2's and states they "are likely to change", with a literal `[X]` placeholder | [WCAG 3.0 draft](https://www.w3.org/WAI/WCAG3/informative/animation-and-movement/avoid-physical-harm/no-flashing-over-threshold/) |

### 10.6 A settings toggle is not sufficient mitigation

WCAG's own rationale:

> "**This cannot be allowed even for a second or it could cause a seizure. And turning the flash off is also not an option since the seizure could occur faster than most users could turn it off.**"
> — [SC 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)

`[EI]` Therefore the **default build must already be under threshold**. The accessibility menu is for comfort and for the *other* effects, not the flash-safety mechanism. Copy the **DOOM + DOOM II** pattern: "Screen Flash Effects are **disabled (not displayed) by default** when you select Customize Accessibility Settings" ([Bethesda](https://slayersclub.bethesda.net/en-AU/news/doom-doomii-accessibility-guide)).

### 10.7 No public numeric limit on screen-shake amplitude exists

Not in W3C, not in the Xbox guidelines, not in any platform doc retrievable. **XAG 117 requires only** "avoid the use of camera shake... **or provide an option to turn off these behaviors**" ([XAG 117](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117)). **That absence is itself the finding:** screen shake is governed by *disclosure + control*, not a dose ceiling. §1.3's ranges are therefore **our own taste call and must be documented as such**, never presented as a standard.

### 10.8 Actionable rules

1. **The 3-flashes/second ceiling is a hard design budget.** A game hit by 20 enemies/sec generating a white hit-flash *and* a red vignette trivially exceeds three luminance oscillations per second **even if each effect is tasteful**. Fix architecturally: **rate-limit the aggregate flash channel** (e.g. one flash "ticket" per ~340 ms; coalesce or drop lower-priority flashes rather than queueing).
2. **Size is the escape hatch.** A flash confined to **one enemy sprite** is far more likely to pass than a **full-screen** flash — which independently supports §3's sprite-local flash and argues for reserving full-screen flashes for rare, non-oscillating events.
3. **Budget total luminance per event, not per effect.**
4. **Every effect gets an independent control that can reach zero.** Halo Infinite ships separate 0–100% sliders for screen shake, radial blur, full-screen effects and speed lines; Directive 8020 ships 0–10 scales where 0 removes the effect ([XAG 117](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117), [Directive 8020](https://www.thedarkpictures.com/news/directive-8020-accessibility-features)).
5. **Never name a setting "epilepsy safe."** GAG: "the term 'epilepsy safe' must never be used... you risk harming players and risk legal action being brought against yourself" ([GAG](https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/)). Use literal names: "screen flash effects", "effects intensity".
6. **Validate with HardingFPA** — the tool console manufacturers require. The binding console specs exist but are **NDA'd** ("Proprietary Guidelines provided by the console manufacturers"), so **no public Sony/Nintendo developer numeric spec exists.**

---

## 11. Readability & the danger of over-use

Every numeric table above is an invitation to over-apply. This is the counterweight.

**Nijman's own stated failure modes** (from the Art of Screenshake checklist):
- Screenshake too large → "屏幕摇晃到看不清敌人,玩家晕" (screen shakes so much you can't see enemies; players get dizzy)
- Hit-pause too long → "操作黏滞,连发武器变得'卡顿'而不是'有力'" (controls feel sticky; rapid-fire weapons become *laggy* rather than *powerful*)
- Uncleaned blood particles → long-session performance collapse (this happened in early Nuclear Throne)
- **His governing test:** "每打开一条,都要问'它是在增加信息量还是在增加噪音?'" — for each effect, ask **does it add information or add noise?** Keep what informs (knockback tells the player the hit registered); cut what only adds noise.

Source: [Art of Screenshake checklist (secondary mirror)](https://github.layabox.com/xuhaodong/awesome-skills/-/blob/7cb809f72f89a918178d602f0544ebf7c8eaa20f/plugins/product-manager/skills/prd-creator/references/patterns/game-feel/screenshake.md). **Caveat: retranslated secondary summary — verify before quoting verbatim in a published doc.**

**The production rules that follow from it** ([game-feel SKILL.md](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/SKILL.md)):
- "Permanent exaggeration (scale never returns, shake never decays) becomes the new normal and stops reading as feedback. **Juice must return to rest.**"
- "Over-juicing routine actions (full shake + hit-stop on every footstep) causes nausea and hides real impacts."
- "Feedback that blocks input (long freeze, un-cancelable animation) hurts responsiveness. Keep juice short and let input buffer through it."

**Nijman's technique list, recovered independently** (a practitioner re-implementation of the talk) gives the *order* he added the tricks, which is itself a priority ranking: baseline → animation → lower TTK → higher rate of fire → bigger bullets → muzzle flash → faster bullets → lower accuracy → impact effect → **hit reaction** → **enemy knockback** → **permanence** → camera lerp → **screenshake** → **player knockback** → **hit pause** → **weapon recoil** → random enemy explosion. ([Chosen Concept devlog](https://blog.chosenconcept.dev/posts/2022/11/0012-the-art-of-screenshake/) `[SECONDARY]`, no numbers.)

**The counter-talk.** GDC's **"Don't Juice It or Lose It"** argues the polish itself is the problem — see the verbatim abstract in §0. Its example failure mode, **"bouncy tweens on hard rocks,"** is precisely §4's recommendation applied to the wrong material. The reconciliation is **material-appropriateness**: squash-and-stretch on flesh, cloth, slimes and gel; **none** on stone, metal, armour-plate or rigid projectiles (§4).

**Sakurai's TECH 2 is the sharpest readability constraint found, and it is about hitboxes:** shaking the victim drags the hurtbox, "which **breaks combos that should be possible.** In Smash, **only the model shakes; the hitbox stays put.**" (§2.4)

**The best-*sourced* readability argument** does not come from a game designer — it comes from Microsoft and GAG, and it is about **background motion behind text**:

> "Background animation can distract greatly from elements that are important to gameplay, particularly for **attention related cognitive conditions such as ADHD**. It can sometimes be so distracting that it can make **essential information and interactive elements difficult to see at all**." — [GAG](https://gameaccessibilityguidelines.com/provide-an-option-to-turn-off-hide-background-movement/)
>
> "Even when the text itself is stationary, if there are background animations or other visual distractions present on the UI screen behind the stationary text, players with **attention deficit disorders or cognitive disabilities** might find these movements distracting... providing players the option to enable an **opaque background behind the text** itself can be helpful." — [XAG 117](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117)

`[EI]` This gives a defensible, *cited* argument for reducing VFX load without needing designer quotes: the platform holder and the industry guidance body both state that moving background visuals measurably impair access to essential information, and both prescribe a kill switch plus an opaque text backing.

**Three cheap guardrails to adopt:**
1. **The 3-second test:** show the effect to a non-artist for 3 seconds; if they cannot say what happened, the visual information is overloaded ([2ds.cn](https://www.2ds.cn/商业游戏特效规范：手游与端游的特效制作标准差异-16/) `[SECONDARY]`).
2. **Slow-motion QC:** play every hit effect at 0.1× on a plain background (§6.5, Sakurai).
3. **One importance-tier table as the single source of truth** (§8.4), so nothing gets hand-tuned to maximum in isolation.

---

## 11b. Consolidated conflicts — reported, never averaged

These are places where credible sources disagree. **Do not average them**; each has a reason for the divergence, and picking a side is a design decision to record.

| # | Conflict | Values | Why it differs |
|---|---|---|---|
| 1 | **Hitstop duration** | uncited advice **50–100 ms** · shipped fighting games **7–16 F (117–267 ms)** · peer-reviewed comfortable kill-stop **390 ms** · DBFZ/Fantasy Zone **1 s** | Four different effects and hit rates: ordinary combat freeze / combat freeze at fighting-game weight / slow-motion death prolongation / cinematic super-freeze |
| 2 | **Light-hit hitstop** | SF6 **9 F** · Skullgirls **7 F** · GBVS **10 F** · GGXRD **11 F** · SF2 **14 F** vs advice docs' **2–6 F** | The advice is below **every** verified shipped game. Fighting games want the freeze to matter for combo timing; that may not transfer to a 20-hits-per-second top-down game |
| 3 | **GGXrd hitstop** | Dustloop datamined table **11–15 F** vs academic video frame-count **7 F light / ~10 F heavy** | Different game version *and* different method (data table vs counting frames in video) |
| 4 | **Hit-flash duration** | **1–3 F (17–50 ms)** vs **50–100 ms** vs **100–200 ms**; shipped code defaults **120 ms** and **150 ms** | A hard snap with no fade vs a tween. Both are real techniques with different looks |
| 5 | **Big-effect particle counts** | UWA production standard **≤50/effect**, "400+ excessive" vs a training doc's **200–300 mobile / 2000–5000 PC** | UWA = single hit/skill on mobile-era hardware; the larger figures = ultimate/boss-cinematic on PC |
| 6 | **Bloom defaults** | Unity URP **0** ("disabled") vs Godot glow **0.3** ("on but subtle") | Incompatible scales — never copy numbers between engines |
| 7 | **Camera shake amplitude** | Bevy official example **20 px** vs secondary sources **2–10 px** | Bevy's is a demo with no UI to keep on-screen |
| 8 | **Diablo 2 knockback geometry** | "3 sub-tiles" vs "7×7 box ≈ 2–2.66 yd" | Different Wiki sources. Both agree it is small, fixed and **non-scalable** — that is the lesson |
| 9 | **Hitstop re-trigger policy** | GBVS: the **newest** hit replaces the running stop vs a shipped Godot dev blog: never **shorten** a longer running stop | Deliberate design choice. Pick one and document it |
| 10 | **Bloom in 2D** | Godot's `glow_hdr_threshold` default **1.0** vs Godot's own docs saying it **must be < 1.0 in 2D** | Godot's docs contradict their own default. Set **0.9** |

---

## 12. Evidence gaps — do not let anyone fill these with guesses

This brief deliberately leaves gaps rather than inventing numbers. Read this before quoting anything.

| Gap | Status |
|---|---|
| **No talk constant verified against a talk.** YouTube unfetchable; GDC Vault serves mismatched sessions for wrong play-IDs; archive.org and gamedeveloper.com unreachable/403; PDFs unsupported and the shell has no outbound network | Every Eiserloh/Nijman/Swink constant here is **implementation-derived or secondary** |
| **Chromatic-aberration duration/offset** | **No engine-documented value.** Unity exposes only 0–1 intensity; Godot has none. The only px/ms figures are from one `[AI-GENERATED]` repo |
| **Hit-spark sprite frame counts** | **Unpublished in every reachable source.** SRK and VirtuaFighter returned HTTP 403. The brief's "2–4 frames" premise is **unconfirmed** |
| **Level-up celebration timing** | **No published breakdown exists.** §7.3 is composition from generic UI tokens |
| **Damage-direction indicators / low-health pulse frequency** | **No numbers found** (only an unfetchable patent snippet) |
| **Motion-sickness prevalence %** | The on-point peer-reviewed paper (MuC 2024, DOI `10.1145/3670653.3677494`) is **PDF-only and unfetchable**. A "60–95% of VR users" figure appears only in a search snippet and **was never fetched — do not use it** |
| **Screen-shake amplitude/duration limit** | **Does not exist** in any normative or platform source (§10.7) |
| **"Body widths" knockback convention** | **Does not exist** in any reachable source. Tile-based does |
| **Hitstun↔knockback pairing rule** | **Unverified.** No source gives "hitstun = k × knockback duration" |
| **Swink's own latency numbers and Mario tuning values** | **Not obtained.** The Rutgers-hosted chapter PDF is unfetchable |
| **Fisher et al. 2005 (*Epilepsia*)** — origin of "15–25 Hz" | Unfetchable. Verified figure is **16–25 Hz** per Epilepsy Society |
| **Infil's fighting-game glossary hitstop entry** | The page is JS-rendered (empty text) and the `glossary.json` came back **truncated before any hitstop entry**. **Not confirmed.** Retry from an unthrottled network — `glossary.infil.net` remains the best single glossary lead |
| **Per-move hitstop for top-down/roguelite games** (Dead Cells, Hades, Katana Zero, Hollow Knight, Hyper Light Drifter, Streets of Rage 4) | **No primary source with numbers exists publicly.** The numbers circulating online are unsourced AI output, and one (a claimed Celeste "5-frame death freeze") **already contradicts the datamined Celeste values** (3/6/9 F). Only route: datamining or asking the devs |
| **Max Payne / SUPERHOT / Bayonetta / Sifu slow-motion time-scale ratios** | **Not found.** Only non-numeric commentary. (Smash's Witch Time `0.125` is the one verified slow-mo ratio) |
| **Slow-motion ramp-in/ramp-out durations** | **No source found at all.** The peer-reviewed study used a constant `0.01×` with no ramp |
| **`forums.supercombo.gg/d/601-hit-stop-frames`** | Cloudflare-blocked. A promising community thread of per-game hitstop frame lists |
| **Guacamelee combat analysis** (`gamedeveloper.com/design/combat-analysis-guacamelee` and its original at `aztez.com`) | Both blocked. A frame-by-frame combat analysis by a shipped action-game developer |

**Worth obtaining (identified but unread):**
1. **Unity VFX Artist Guide** (official PDF) — particle/frame-time budgets. `https://unity3d.jp/wp-content/uploads/2025/08/VFX-Artist-Guide_FINAL-en_us-ja_jp.pdf` — likely the single best unread source on particle budgets.
2. **Seki & Ishikawa, "Quantifying Hit Feedback Preferences in 2D Action Games: A User-Adjustment Study of Visual and Temporal Parameters"** (ACM 2025, [DOI 10.1145/3772363.3798911](https://dl.acm.org/doi/full/10.1145/3772363.3798911)) — *precisely* the missing 2D-action-game hitstop study. Paywalled/Cloudflare-blocked.
3. **realtimevfx.com** profiling and mobile-VFX threads — unreachable from this sandbox.
4. **Sakurai's Effects videos** for the hit-mark and particle-limit episodes: `4D-Lw7lFuD0`, `tnwib5xUptc`; Specifications: `Edmd2xs9rZ4`.
5. YouTube auto-captions for `Fy0aCDmgnxg` (Juice it or lose it), `AJdEqssNZ-U` (Art of Screenshake), `tu-Qe66AvtY` (Eiserloh) would resolve every "talk constant" gap at once.

**On source quality, read this before quoting an `[AI-GENERATED]` row.** The `game-mechanics-optimizations` and `awesome-gamedev-agent-skills` repos are structured like reference docs and are internally consistent, which makes them seductive. Their **parameter ranges** are usable as starting hypotheses; their **per-game attributions are not** and in several cases appear fabricated. A name check: `Celeste`, `Nuclear Throne` and `Hyper Light Drifter` do not have the trauma systems or CA values these docs attribute to them as far as any primary source retrievable here shows.

---

## Appendix — quick production defaults (all `[EI]` synthesis of the above)

```
TRAUMA:    exponent 2.0 | decay 3.0/s | max_offset 12px | max_roll 0.06 rad | noise_speed 15
           trauma: light .15  medium .35  heavy .70  boss 1.0     shake-events/sec cap: 6
HITSTOP:   light 3-5F | medium 5-8F | heavy 8-13F | crit 10-14F | kill 12-23F (+slow-mo)
           HARD CAP 30F pure freeze; never >0.5s dead time on a kill
           per-entity freeze (not global time scale) | pose blend 4F
           attacker micro-moves | hitbox NEVER moves | attacker stop >= defender stop
           BUFFER: window >=4-5F and EXTENDED BY the hitstop duration (do not let it tick during)
FLASH:     120ms | mix(rgb, white, t) | 1 material instance per enemy | 200ms hard ceiling
           white = damage, yellow = i-frames
SQUASH:    uniform 1.2x up, settle 180ms, BACK ease-out | collider untouched | integer scales for pixel art
KNOCKBACK: k = 15.6/s exponential | light v0 250px/s (16px) | heavy v0 780px/s (50px)
           express in tiles in the design doc; cap the distance, don't scale it
PARTICLES: small 12 @0.4s | mid 30 @0.6s | boss 120 @1.2s, 3 emitters
           explosiveness 0.9 | damping 200 | spread 180 | lifetime_randomness 0.4
           cap 3-4 emitters/effect, fill multiplier <3 | sprites above VFX in z-order
UI:        use M3 tokens only | level-up banner 250ms in / 150ms out / hold 1.2-2.0s
SLOWMO:    0.3x for 0.2s on kill | ramp out 0.2s | scale shake by time_scale | audio follows
           verified shipped: Witch Time = 0.125x for 1.5s base (4s max) with a +60F/use penalty
           FINISHERS ONLY -- never on ordinary hits
FEEL TRIAD: design hitstop + AUDIO + CAMERA as ONE system (peer-reviewed: the 3 decisive
           of 19 impact-feel features). Budget art-direction money on sound, not more VFX.
VIGNETTE:  alpha 0.35 | spike 50ms | fade 400ms | deep desaturated red
           low-health 0.2 -> 0.6 | pulse 1.2 Hz | directional camera punch 8px/0.12s
HARD LIMIT: <= 3 flashes/sec AGGREGATE | rate-limit the flash channel | sprite-local not full-screen
            default build must already pass | never label anything "epilepsy safe"
```

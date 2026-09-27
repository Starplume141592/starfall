# Knockback impulse → pixels, and the canonical game-feel talks

**Research brief · compiled from live web fetches only.** Every number below is tagged with its provenance.

**Provenance legend**
- `[PRIMARY-IMPL]` — actual source code / engine example / wiki of record I fetched directly.
- `[SECONDARY]` — a human-written summary, community wiki, academic survey, or blog describing the talk/game.
- `[AI-GENERATED]` — agent skill docs / LLM-written course notes. **Not authoritative.** Numbers here are unverified and in one case almost certainly invented.
- `[INFERENCE]` — my own reasoning or derivation, **not** sourced. Treat as "[experiential inference]".

**Access limitations (read this before trusting anything about the talks)**
- `youtube.com`, `youtu.be`, `m.youtube.com` **all fail to fetch** from this environment (`TypeError: fetch failed`), and every transcript service I tried either 403s (Cloudflare) or renders client-side (`youtubetranscript.com` returns only its own chrome). **I never read a transcript of "Juice it or lose it" or "The Art of Screenshake".**
- `gdcvault.com` **does** fetch, but serves a *mismatched* session when the play-ID is wrong. `…/play/1019234/The-Art-of-Screenshake` returned "Math for the Masses: How Edugaming Reached the Top of the App Store"; `…/play/1023301/…Juicing` returned "The Environment Pipeline of CSR Racing 2". Only `https://www.gdcvault.com/play/1023557/Math-for-Game-Programmers-Juicing` returned the correct session overview. **I could not retrieve the Art of Screenshake Vault record at all.**
- `archive.org` / `web.archive.org` are unreachable (all fetches fail), so no Wayback copies of the Gamasutra/Game-Developer articles. `gamedeveloper.com` returns 403 (Cloudflare) on every URL tried.
- **PDFs are unreadable by my fetch tool** (`unsupported content type "application/pdf"`), and the file sandbox blocks outbound network from `pwsh`/`curl` (`curl: (7) Failed to connect`, `schannel: SEC_E_NO_CREDENTIALS`), so I could not download-then-OCR anything. This killed several high-value primaries: the Rutgers-hosted **Steve Swink chapter PDF**, the Bayreuth *Game Feel* lecture PDF, the ACM hit-feedback paper, the SCITEPRESS eye-gaze hitstop paper, and the Yale "Input Latency Detection in Expert-Level Gamers" thesis (also now 404 at its indexed URL).
- **Net effect:** Part A's structural numbers (Smash, Diablo 2, DoomRL) are solid and primary. Part B's *talk constants* (Eiserloh, Nijman, Swink) are **implementation-derived and secondary at best — I could not verify a single constant against the talks themselves.**

---

## PART A — Knockback: impulse → velocity → pixels

### A.0 The conversion chain, and the two decay laws

The chain the user asked about is: `impulse (N·s or engine units)` → `velocity` → `distance`, mediated by drag/friction.

- **Exponential drag** (Godot `linear_damp`, Unity `Rigidbody2D.linearDamping`, `vel *= 0.96` per frame): `v(t) = v₀·e^(−k·t)`, so **total distance = v₀/k** and time-to-95% = 3/k. This is self-limiting and never overshoots. `[INFERENCE]`
- **Linear decay** — *this is what Smash actually ships, and it is documented with exact constants*: `launch speed = knockback × 0.03`, then `launch speed decays by 0.051 every frame`. Therefore `time to stop = v₀/0.051` frames and `distance = v₀²/(2 × 0.051)` units. `[PRIMARY-IMPL]` [SmashWiki Knockback](https://www.ssbwiki.com/Knockback)

Worked examples at 60 fps from those two constants `[INFERENCE — my arithmetic on PRIMARY-IMPL constants]`:

| Knockback value | v₀ (units/frame) | Time to stop | Distance (units) |
|---|---|---|---|
| 10 (wiki: ≈1 stage-builder block/sec) | 0.30 | 5.9 frames = **98 ms** | 0.88 |
| 80.0001 (wiki: tumbling threshold) | 2.40 | 47 frames = **784 ms** | 56.5 |
| 186 (wiki: KO from center of Final Destination) | 5.58 | 109 frames = **1.82 s** | 305 |

**Decay-curve guidance (what the sources actually support):** Smash = linear, and the *hard constant is published*. Every trauma/screen-shake implementation I found = exponential (trauma decays linearly and the shake is `trauma^k`, which is a polynomial falloff, not a velocity falloff). **I found no source that argues for one knockback decay law over the other.** `[INFERENCE]`

### A.1/A.2/A.4 Knockback magnitudes — `effect | value | recommended range | source`

| Effect | Value (as published) | Recommended range | Source URL | Provenance |
|---|---|---|---|---|
| 2D metroidvania attack impulse X, 3-tier combo (light/mid/heavy) | **250 / 360 / 780 px·s⁻¹** | — (single repo, un-playtested by me) | [EVEngine metroidvania tuning.nut](https://raw.githubusercontent.com/EVEngine/EVEngine/refs/heads/main/examples/metroidvania/tuning.nut) | `[PRIMARY-IMPL]` but single, unverified project |
| Same, upward component (launch pop) | **−25 / −55 / −330 px·s⁻¹** | — | same | same |
| Same, timed kick impulse | **720 px·s⁻¹ X**, −105 px·s⁻¹ Y | — | same | same |
| Same, ground friction coefficient | 0.75 terrain / 0.45 crate / 0.85 rock | — | same | same |
| Same, player move speed for scale | 240 px·s⁻¹ (dash 650) | knockback ≈ 1.0–3.25× base move speed | same | same |
| Same, knockdown / getup lockout | 1.15 s / 0.34 s | — | same | same |
| Smash knockback → launch speed | `× 0.03` | — | [ssbwiki Knockback](https://www.ssbwiki.com/Knockback) | `[PRIMARY-IMPL]` |
| Smash launch-speed decay | `0.051 / frame` (linear) | — | same | `[PRIMARY-IMPL]` |
| Smash knockback → on-screen flash threshold | flash white at **≥160 units** | — | same | `[PRIMARY-IMPL]` |
| Smash bounce-off-surface knockback reduction | 20% (Melee, Smash 4), 15% (Brawl), **5% (Ultimate)** | — | same | `[PRIMARY-IMPL]` |
| Smash hitstun → auto speed-up of the launch | triggers above **32 frames of hitstun** | — | same | `[PRIMARY-IMPL]` |
| **DoomRL/DRL: damage required per tile of knockback** | ranged **12 dmg/tile**; shotgun & most explosions **7 dmg/tile**; BFG **14 dmg/tile**; rocket-jump explosions **2 dmg/tile**; melee **never** knocks back | — | [DRL Wiki Knockback](https://drl.chaosforge.org/w/index.php?title=Knockback) | `[PRIMARY-IMPL]` (game wiki of record) |
| DRL knockback modifiers | Butcher's Cleaver / Longinus Spear / Dragonslayer **halve** knockback; Badass trait **−1 tile per rank**; armor a **percentage** (100+modifier), rounded to nearest tile | — | same | `[PRIMARY-IMPL]` |
| **Diablo 2 knockback chance by target size** | Large **25%**, Medium **50%**, Small **100%**, Act bosses/stationary/golems **0%** | — | [Basin Wiki Knockback](https://d2.lc/AB/wiki/indexdd6b.html) and [mannm.org FAQtoids "Get Off of my Cloud"](http://www.mannm.org/d2library/faqtoids/kb_eng.html) | `[SECONDARY]` (community wikis; two independent pages agree) |
| **Diablo 2 knockback distance** | "up to **three sub-tiles** when unobstructed, but occasionally only one or two (or even just hit recovery without moving). **This distance cannot be increased.**" | — | [Basin Wiki](https://d2.lc/AB/wiki/indexdd6b.html) | `[SECONDARY]` |
| **Diablo 2 knockback distance, second source (conflicts)** | "set to the limits of a **7×7 square of subtiles** with the base tile of the unit as center. Thus distance varies depending on direction between approximately **2 yards and 2.66 yards**." | — | [mannm.org FAQtoids](http://www.mannm.org/d2library/faqtoids/kb_eng.html) | `[SECONDARY]` |
| D2 knockback chance, specific sources | Paladin **Sanctuary** KB distance **scales with skill level**; Baal's ice wedge **75%**; Frog Demon / Nessie tentacle spit **33%**; Molten Boulder **50%**; Telekinesis **35%** | — | same two | `[SECONDARY]` |

**Two Diablo 2 sources conflict** on the *shape* of the knockback volume ("up to 3 sub-tiles" vs "7×7 sub-tile box ⇒ 2–2.66 yards"). I am not averaging them: both agree the magnitude is small, fixed, and non-scalable, which is the design lesson. `[INFERENCE]`

### A.3 Hitstun vs knockback pairing, and player vs enemy knockback

- **Smash ties knockback strength to hitlag (hitstop) strength through damage**, with a per-hitbox multiplier: Ultimate `hitlag_frames = ⌊⌊⌊(d×0.65 + 6) × h × e × s⌋ × p⌋ × c⌋`. Worked example from the same page: **a 15%-damage move inflicts 15 frames of hitlag in Ultimate, 10 in Brawl/Smash 4, 8 in Melee, 10 in Smash 64 (9 in the JP version)**. Cap: **20 frames in Melee, 30 frames from Brawl on** (up to 36 vs. Stone Kirby). Marth's tipper multiplier **1.25×** vs **0.7×** otherwise; Ryu/Ken **1.5×** (Ryu 1.8× in Smash 4); Kazuya **0.2–0.6×**; electric **×1.5**; crouch-cancel **×0.666667** (Melee) / **×0.85** (Smash 4) / **×0.67** (Brawl on); shielding **×0.67**; player-count scaling 1.0 → 0.75 for 2→8 players. Also: *"If an attack deals no knockback, the target does not experience any hitlag"* and *"If the attack deals no damage, hitlag is always zero."* — [ssbwiki Hitlag](https://www.ssbwiki.com/Hitlag) `[PRIMARY-IMPL]`
- **The frames→ms conversion matters and is routinely botched:** 8 frames = **133 ms**, 10 = **167 ms**, 15 = **250 ms**, 30 = **500 ms** at 60 fps. `[INFERENCE]`
- **Player-vs-enemy asymmetry, from Smash** (Sakurai's own 8 techniques, see Part B): the **victim shakes large, the attacker small**; the **hurtbox does not shake** (visual-only, so combos aren't broken); the **attacker keeps micro-moving** during hitstop. `[SECONDARY]`
- **Sakurai technique 6** reportedly interpolates the victim's hit pose over **"about 4 frames"** rather than snapping. `[SECONDARY — two independent blog summaries agree on the technique list; only one (senkohome) gives the "4F" figure]`
- **I found no source giving a rule like "hitstun = 1.2 × knockback duration" or "player knockback = 0.5 × enemy knockback".** The user's premise that such a pairing rule is canon is **unverified**. `[—]`

### A.5 "Tiles" / "body widths" guidance

- **Tiles: yes, this is real and documented.** DRL expresses knockback directly as *"took X knockback" where X is the number of tiles displaced*, derived from a damage-per-tile threshold (table above). `[PRIMARY-IMPL]`
- **Diablo 2** works in sub-tiles/yards, capped (table above). `[SECONDARY]`
- **"Body widths" (e.g. "knock back 0.5 body widths"): I found no source using body widths as the unit.** The nearest thing is Smash's "stage builder block per second" reference row in the knockback table. `[—]`
- A CHAOS ARENA design PDF indexed by search literally reads *"Knockback indicates how many tiles…"* — evidence that tile-denominated knockback is normal practice in design docs, but **I could not read the PDF** (see limitations). [source](https://collab.dvb.bayern/download/attachments/71869727/CHAOS%20ARENA%20-%202.%20Game%20Prototype.pdf?version=1&modificationDate=1526142460580&api=v2) `[snippet only]`

### A.6 Research that exists but that I could not read (worth obtaining)

- **Seki & Ishikawa, "Quantifying Hit Feedback Preferences in 2D Action Games: A User-Adjustment Study of Visual and Temporal Parameters"** (ACM, 2025) — this is *precisely* the missing Part A experiment: users adjust hitstop duration and visual parameters in a 2D action game. [ACM record](https://dl.acm.org/doi/full/10.1145/3772363.3798911) · [PDF (403 to me)](https://dl.acm.org/doi/pdf/10.1145/3772363.3798911) · [Semantic Scholar](https://www.semanticscholar.org/paper/Quantifying-Hit-Feedback-Preferences-in-2D-Action-A-Seki-Ishikawa/94ca4d99acae490822992ec3fc0aa3b112be4e23) — **paywalled/Cloudflare-blocked; no numbers extracted.**
- **"An Evaluation Research on Dynamic Hit Stop Using Eye Gaze"** (SCITEPRESS 2024) — [PDF](https://www.scitepress.org/Papers/2024/124614/124614.pdf) — **406 to my fetcher.**
- A Japanese JSKE proceedings paper on screen-shake **duration** (ANOVA `p < 0.001` main effect of duration) — [J-STAGE](https://www.jstage.jst.go.jp/article/jskeproceedings/3.1/0/3.1_419/_pdf/-char/ja) — **fetch failed**; only the snippet is available. `[snippet only]`
- **Banatt 2017, "Input Latency Detection in Expert-Level Gamers" (Yale)** — the right source for "pros notice X ms". Indexed URL now **404s**. `[snippet only]`

### A.7 AI-generated knockback/shake numbers — treat as fabricated until checked

`[AI-GENERATED]` [raduacg/game-mechanics-optimizations `97_camera_trauma.md`](https://raw.githubusercontent.com/raduacg/game-mechanics-optimizations/main/97_camera_trauma.md) states: decay 1.5/s, max_offset 100 px, max_rotation 0.1 rad ("~5.7 degrees"), noise_speed 50, exponent 2.0, light/medium/heavy/extreme trauma 0.2/0.4/0.6/1.0, and "max offset 50–150 px, max rotation 0.05–0.15 rad (3–9 degrees)".
**It also asserts per-game constants that I believe are invented**: "Nuclear Throne … 0.3–0.8 trauma", "Celeste … dash 0.15, ground pound 0.4, Badeline 0.7", "Enter the Gungeon … pistol 0.1, shotgun 0.4, rocket 0.8", "Hyper Light Drifter … sword 0.3, decay 3.0", "Dead Cells … daggers 0.1, greatswords 0.5". Celeste and Nuclear Throne do **not** have a trauma system with these values as far as any primary source I fetched shows. **Do not cite these.**

---

## PART B — The canonical talks, and what constants they actually recommend

### B.0 Attribution correction (important)

The task pairs **Squirrel Eiserloh** with **"Juice it or lose it" (GDC 2015)**. That is wrong.

- **"Juice it or lose it"** is **Martin Jonasson + Petri Purho**, presented at **Nordic Game Jam 2012** (8 min), video `https://www.youtube.com/watch?v=Fy0aCDmgnxg`. Separate talk from Eiserloh's. `[SECONDARY]` — [CODECRUNCH resource list](https://raw.githubusercontent.com/CODECRUNCHWORLDWIDE/C11-CRUNCH-ARCADE/refs/heads/main/curriculum/week-06-animation-and-juice/01-resources.md) (an AI-written course, but the attribution is independently consistent with the Internet Archive record below).
- **Squirrel Eiserloh, "Math for Game Programmers: Juicing Your Cameras With Math"** is a **GDC 2016 Math for Game Programmers** session. Official overview text, fetched from GDC Vault: *"2D and 3D games alike benefit greatly from the judicious use of in-game cameras and camera motion. In this talk we explore the math behind a variety of camera behaviors including framing techniques, types and characteristics of smoothed motion, camera shake, and dynamic split-screen."* Also confirmed: the presentation's **definition of "juicy" framing/hit-feel is not in the publicly readable overview — the talk is video-only behind the Vault player.** `[SECONDARY/PRIMARY-RECORD]` [GDC Vault session](https://www.gdcvault.com/play/1023557/Math-for-Game-Programmers-Juicing)
- "The Art of Screenshake" is **Jan Willem Nijman (Vlambeer)**, **GDC Europe 2013** (30 min), video `https://www.youtube.com/watch?v=AJdEqssNZ-U`; also archived at [archive.org/details/the-art-of-screenshake](https://archive.org/details/the-art-of-screenshake) (unreachable to me). `[SECONDARY]`

### B.1 Squirrel Eiserloh — trauma model: what is verifiable, and what the user's guesses actually match

**The model itself is not in dispute and is reproduced verbatim in shipping code:**

```
trauma ∈ [0,1];  events ADD trauma;  trauma decays linearly each frame
shake  = trauma^2   (or trauma^3)
roll   = maxAngle  * shake * noise(t + offset1)
x      = maxOffsetX * shake * noise(t + offset2)
y      = y equally with a third noise channel
```
`[PRIMARY-IMPL]` [Bevy `examples/camera/2d_screen_shake.rs`](https://raw.githubusercontent.com/bevyengine/bevy/main/examples/camera/2d_screen_shake.rs) — its header comment literally says: *"It follows the GDC talk 'Math for Game Programmers: Juicing Your Cameras With Math' by Squirrel Eiserloh"*. Bevy's own in-code comments justify the exponent: *"Camera shakes don't feel punchy when they go up linearly, so we use an exponent of 2.0."*

**Four independent implementations of Eiserloh's model, and they disagree substantially.** This is the real finding: *there is no single published constant set; everyone tunes their own.*

| Constant | Bevy (Rust, official example) | kidscancode (Godot recipe) | sajmoni/screen-shake (JS) | bones_lib (Rust engine) |
|---|---|---|---|---|
| Explicitly credits the talk | ✅ | ✅ ("we'll be emulating the technique outlined in the following GDC talk") | ✅ | ✗ (same model) |
| **Trauma decay** | **0.5 /s** | **0.8 /s** (range stated as `[0,1]`) | **28 updates** for 1→0 ⇒ **≈2.1 /s** @60fps `[INFERENCE]` | **0.5 /s** (field documented as "seconds for trauma to decay 1→0") |
| **Shake exponent** | **2.0** | **2**, "Use [2, 3]" | not exposed | **2** (hard-coded `trauma * trauma`) |
| **Max offset** | **20 px** (x and y) | **Vector2(100, 75) px** | **70 px** (x and y) | **100 px** (x and y) |
| **Max angle / roll** | **10°** (`10.0_f32.to_radians()`), commented "somewhat high but still reasonable" | **0.1 rad ≈ 5.73°** — commented "**use sparingly**" | **12** (degrees, presumably) | **90 rad**?? default `max_angle_rad: 90.0` (almost certainly an unconverted-degrees bug) |
| **Noise speed** | **20.0** ("fairly fast shake") | `period = 4`, `octaves = 2`, noise cursor `+= 1/frame` | **0.4** | **1.5** |
| **Per-event trauma** | **+0.4 per press** | `add_trauma(0..1)` | **+0.1** for a projectile hit | via event queue |
| Noise type | 1D Perlin, 3 channels offset by +0/+100/+200 | OpenSimplex, 3 channels, seeds `seed`, `seed*2`, `seed*3` | Perlin, seeded | vendored 1D Perlin |

Sources: [Bevy](https://raw.githubusercontent.com/bevyengine/bevy/main/examples/camera/2d_screen_shake.rs) · [kidscancode Godot recipe](https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/) · [sajmoni/screen-shake README](https://raw.githubusercontent.com/sajmoni/screen-shake/main/README.md) · [bones_lib camera.rs](https://docs.rs/bones_lib/0.2.0/i686-pc-windows-msvc/src/bones_lib/camera.rs.html) — all `[PRIMARY-IMPL]`.

**Verdict on the user's specific guesses:**

| User's guess | Verdict | Best evidence |
|---|---|---|
| trauma ∈ [0,1] | ✅ **Confirmed** (in all four implementations) | Bevy/kidscancode/sajmoni/bones |
| shake = trauma², with trauma³ as an option | ✅ **Confirmed** | Bevy (`TRAUMA_EXPONENT = 2.0`); kidscancode ("square (2) or cube (3)… typically the best") |
| **decay ≈ 1.0–1.5 /s** | ⚠️ **NOT verified from any talk.** The only source I found giving exactly 1.0–1.5 is an **AI-generated agent skill doc**. Real implementations span **0.5–2.1 /s**. | [gamedev-skills `feedback-recipes.md`](https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/refs/heads/main/skills/disciplines/game-feel/references/feedback-recipes.md) says `decay = 1.0..1.5` trauma/sec — `[AI-GENERATED]`, no citations |
| **max angle ≈ 0.1 rad ≈ 5–6°** | ⚠️ **Corroborated by exactly one secondary implementation, contradicted by two others.** kidscancode says `max_roll = 0.1` rad; Bevy ships **10°**; sajmoni ships **12**. Not verified from the talk. | kidscancode / Bevy / sajmoni |
| max offset in pixels | ✅ real, but **no consensus: 20 / 70 / 100×75 / 100 px** | as above |
| noise frequency / shake speed | ✅ real, **no consensus: 0.4 / 1.5 / 20.0**, or `period = 4` | as above |

**Eiserloh's other juicing content** — the GDC Vault overview confirms the talk also covers *framing techniques, types and characteristics of smoothed motion, and dynamic split-screen*, i.e. it is a **camera** talk, not a generic hitstop/particle talk. `[SECONDARY/PRIMARY-RECORD]`

### B.2 Jan Willem Nijman, "The Art of Screenshake" (GDC Europe 2013) — numbers I could actually source

**I have no transcript and no slide deck.** What is sourceable:

| Claim | Value / content | Source | Provenance |
|---|---|---|---|
| Structure of the talk | The talk ships the same Vlambeer prototype twice — once plain, once with **~20 juice tricks stacked** | [CODECRUNCH resource list](https://raw.githubusercontent.com/CODECRUNCHWORLDWIDE/C11-CRUNCH-ARCADE/refs/heads/main/curriculum/week-06-animation-and-juice/01-resources.md) | `[AI-GENERATED]`, but corroborated in spirit by the dev recreation below |
| **Hit flash** | *"Nijman demonstrates flashing the enemy sprite **white for a frame or two** in a 2D platformer to emphasise a hit."* | [Pichlmair & Johansen, *Designing Game Feel: A Survey*](https://ar5iv.labs.arxiv.org/html/2011.09201) §III-B6 | `[SECONDARY — academic survey]` |
| **Recoil** | *"Nijman describes an implementation in detail, where the firing of a bullet **shakes the screen while also pushing the player character a few pixels back**, resulting in a side-effect with gameplay implications."* | same survey §III-B2 | `[SECONDARY — academic survey]` |
| Screen shake is one of his tools | listed as a canonical technique with the talk as reference | same survey §III-B1 | `[SECONDARY]` |
| **The full trick list, in order, as independently re-implemented** | baseline → animation → lower time-to-kill → higher rate of fire → bigger bullets → muzzle flash → faster bullets → lower accuracy for more dynamics → impact effect → **hit reaction** → **enemy knockback** → **permanence** → camera lerp → **screenshake** → **player knockback** → **hit pause** → **weapon recoil** → random enemy explosion | [Chosen Concept devlog, "The art of screenshake"](https://blog.chosenconcept.dev/posts/2022/11/0012-the-art-of-screenshake/) — a dev who rebuilt the talk's list and shipped it | `[SECONDARY — practitioner blog, no numbers]` |

**Numbers the user asked for that I could NOT verify: screen shake amount per weapon, gun kick in px, muzzle-flash duration, ms of delay, particle counts, and any explicit "0.1 second" figure. I also could not verify the aphorisms ("make it loud, make it fast", "sleep is for the weak") against any fetched source.** Search results repeatedly surfaced `gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games` as the likely write-up, but it **403s (Cloudflare) on every attempt.** `[—]`

### B.3 Steve Swink, *Game Feel* (2009)

| Item | Value | Source | Provenance |
|---|---|---|---|
| **Definition** | *"real-time control of virtual objects in a simulated space, with interactions emphasised by polish"* | quoted in [Pichlmair & Johansen survey](https://ar5iv.labs.arxiv.org/html/2011.09201) §I, attributed to Swink [1] | `[SECONDARY — academic, direct quote]` |
| **The five experiences a great-feeling game conveys** | ① aesthetic sensation of control ② pleasure of learning/practising/mastering a skill ③ extension of the senses ④ extension of identity ⑤ interaction with a unique physical reality | same survey §I | `[SECONDARY]` |
| **The three building blocks** | The survey frames them as **real-time control / simulated physical space / polish**; the AI course notes phrase the same three as "real-time control, simulated space, polish" | survey §I + [CODECRUNCH lecture notes](https://raw.githubusercontent.com/CODECRUNCHWORLDWIDE/C11-CRUNCH-ARCADE/refs/heads/main/curriculum/week-03-game-design-vocabulary/lecture-notes/01-what-makes-a-game-feel-good.md) | `[SECONDARY]` for the survey; the notes are `[AI-GENERATED]` |
| **Case-study tuning values actually attributable near Swink's area** | Super Mario Bros. gravity **91.28 m/s²**; Super Meat Boy **41 m/s²** (vs Earth 9.807 m/s²) — both attributed to Fasterholdt et al., which the survey cites alongside Swink | survey §III-A2 | `[SECONDARY — third-hand]` |
| **Button caching** | **Mario caches the jump button 1–2 frames; Braid caches it 0.23 s** (survey cites Fasterholdt et al.) | survey §III-A8 | `[SECONDARY]` |
| **"Coyote time"/safety windows** | Disc Room activates lethal hitboxes only after a delay of **up to 50 ms** (accessibility feature) | survey §III-A4 | `[SECONDARY]` |
| **Swink's own input-latency numbers ("under 100 ms", "50–100 ms")** | **NOT VERIFIED.** The Rutgers-hosted chapter PDF titled "© Steve Swink" is the likely primary and is **unreadable to me** (`fetch failed`; PDFs unsupported). | [Rutgers course PDF (unfetchable)](https://content.sakai.rutgers.edu/access/content/group/5682b464-6179-4684-b203-41db7bfc0bea/lectures/04_gamefeel.pdf) | `[—]` |
| **Mario's acceleration/deceleration/jump constants** | **NOT OBTAINED.** | — | `[—]` |
| Aspirational latency figures from an AI course (do **not** cite as Swink) | "0 ms instant, 16 ms floor for perfect, 50 ms sluggish, 200 ms broken"; "player's brain checks for response within ~100 ms" | [CODECRUNCH notes](https://raw.githubusercontent.com/CODECRUNCHWORLDWIDE/C11-CRUNCH-ARCADE/refs/heads/main/curriculum/week-03-game-design-vocabulary/lecture-notes/01-what-makes-a-game-feel-good.md) | `[AI-GENERATED — unverified]` |

### B.4 Other canonical numeric sources

**Masahiro Sakurai — "Stop for Big Moments" / "Eight Hit Stop Techniques"** (video IDs `OdVkEOzdCPw` and `tycbMSjDDLg`, per SmashWiki's own external links). Two independent written summaries agree on the eight techniques; only one carries extra figures. `[SECONDARY]`

| # | Technique | Number |
|---|---|---|
| 1 | Shake the victim large, the attacker small | — |
| 2 | Don't move the hitbox — visual shake only, so combos stay possible | — |
| 3 | Ground: shake sideways. Air: shake all directions (2D games need not worry) | — |
| 4 | Amplitude gradually converges (computed from the remaining hitstop duration) | — |
| 5 | Size controlled by a **multiplier**, not raw damage — Marth's tipper feels superb, the base feels like nothing; Ryu's hitstop is bigger, Kazuya's tuned down to match his source game | — |
| 6 | **Interpolate into the damage pose over ~4 frames** | **≈4F ≈ 67 ms** `[INFERENCE]` |
| 7 | Keep the attacker moving very slightly — the blade tip moves at **less than one frame's worth of motion** during hitstop | <1 frame |
| 8 | Amplitude varies with camera distance (bigger when the camera is far) | — |

Sources: [senkohome summary of the Specifications category](https://en.senkohome.com/sakurai-game-dev-specification/) — appears to be a **recent/likely-AI-assisted blog**, contains a suspiciously future publication date, treat as `[SECONDARY, UNVERIFIED]`; and [Medill-East study notes (2023, Chinese)](https://medill-east.github.io/2023/07/30/20230730-d04/) — independent human class notes, `[SECONDARY]`. Sakurai's own framing: hit-stop is *"very important for getting sufficient feel"*, traceable to *Defender* (1980) and *Fantasy Zone* (1986).

**Sakurai jump spec** (same senkohome summary): *"Give an initial upward velocity (say **5**), add fall acceleration (say **1**) each frame, and the velocity drops 5→4→3…"*; *"Mario's top speed is probably around **1.x DPF** (dots per frame)"*; Smash Ultimate's hidden touch — *"an extremely strong initial rise speed, a strong fall speed for just a few frames, then return to normal"*; Kirby's cannonball rotation axis shifted so it *"makes one revolution over 6 frames"*. `[SECONDARY, UNVERIFIED]`

**Game Maker's Toolkit / Mark Brown, "Secrets of Game Feel and Juice"**, and **Jonathan Blow-style "hit feedback" talks** — I did not find readable numeric content in any fetched source. `[—]`

### B.5 Input latency perception thresholds

| Claim | Value | Source | Provenance |
|---|---|---|---|
| **The only solid, citable threshold I found** | **0.1 s** = limit for the user to feel the system is *reacting instantaneously* (i.e. direct manipulation); **1.0 s** = limit for uninterrupted flow of thought; **10 s** = attention limit | [Jakob Nielsen, "Response Times: The 3 Important Limits" (1993, from *Usability Engineering* ch.5; cites Miller 1968, Card et al. 1991)](https://www.nngroup.com/articles/response-times-3-important-limits/) | `[PRIMARY]` — **but HCI, not games** |
| "Players notice >100 ms" | **Not verified as a game-specific finding.** The defensible statement is that Nielsen's 0.1 s is the perception boundary most often borrowed by game-feel writing; the game-specific studies exist but were unreadable to me (Banatt 2017 Yale thesis — 404; Claypool WPI latency MQP — PDF) | — | `[—]` |
| "Pros notice >50 ms" | **NOT VERIFIED — no source found.** | — | `[—]` |

---

## Conflicts and gaps, stated rather than averaged

1. **Hitstop duration: the common advice and the shipped reality differ by 2–5×.** AI/secondary guidance says **30–80 ms** (CODECRUNCH) or **40–150 ms** (gamedev-skills AI doc). Smash actually ships **133 ms (Melee 8F) to 250 ms (Ultimate 15F)** for a plain 15% move, capped at **500 ms (30F)**. Do not silently split the difference — pick per genre and playtest. `[PRIMARY-IMPL vs AI-GENERATED]`
2. **Trauma decay rate has no canonical value.** 0.5 / 0.8 / ~2.1 / (and the AI doc's 1.0–1.5) all appear in real code. The user's 1.0–1.5 is traceable to an uncited AI doc, not to Eiserloh.
3. **Max shake angle has no canonical value.** 0.1 rad (kidscancode) vs 10° (Bevy) vs 12° (sajmoni) vs a broken 90 (bones_lib). The user's **0.1 rad / 5–6° guess is supported by exactly one implementation.**
4. **Max shake offset: 20 px vs 70 px vs 100 px vs 8–16 px.** Only Bevy and kidscancode ship resolution-aware comments ("20 px is low enough not to be distracting"; "scales with resolution" per the AI doc).
5. **Diablo 2 knockback geometry:** "up to 3 sub-tiles" (Basin) vs "7×7 sub-tile box ⇒ 2–2.66 yards" (FAQtoids). Report both.
6. **"0.5 body widths" guidance does not exist in any source I could reach.** Tile-based knockback (DRL, D2) does.
7. **No transcript, no slides, no video for any of the three canonical talks was reachable from this environment.** Every talk constant above is implementation-derived or a secondary summary — flagged accordingly. If primary numbers are required, someone with unrestricted network access must pull the YouTube auto-captions for `Fy0aCDmgnxg`, `AJdEqssNZ-U`, `tu-Qe66AvtY`, and the GDC Vault slide decks.

## Practical synthesis for a 60 fps 2D game `[INFERENCE — my synthesis, not sourced]`

- Express knockback in **px/s**, convert to distance with an **explicitly chosen decay**: exponential `d = v₀/k` (safe, self-limiting) or linear `d = v₀²/(2a)` (Smash's model; gives long, readable launches). Decide distance **first** and solve for `v₀`.
- Sanity anchor from real tiered data: player move speed **240 px/s**, light hit impulse **250 px/s**, heavy **780 px/s** — i.e. **a light hit barely exceeds walk speed, a heavy hit exceeds 3× walk speed.**
- Make knockback **legible in tiles** for top-down/ARPG work (DRL's damage-per-tile threshold is the cleanest published pattern: pick a damage-per-tile constant, derive tiles, cap tiles).
- Scale hitstop with damage and add a per-move multiplier (Smash's `d` and `h`), rather than hand-authoring 60 hitstop values.
- Shake: keep `trauma ∈ [0,1]`, `shake = trauma²`, add ~0.1–0.4 trauma per event, decay 0.5–2.0/s, and put **max offset in px and max roll in radians, both as tunable constants**, because no source agrees on the values.

# Accessibility Limits on Screen Shake, Flashing, Chromatic Aberration & Bloom

**Research brief — concrete numeric thresholds with authoritative citations**
Compiled from pages actually fetched (URLs listed per row). Where a source could not be fetched
(e.g. PDF-only), that is stated explicitly and the item is marked **UNFETCHED**.
`[experiential inference]` marks my own reasoning, not a sourced claim.

---

## 0. How to read the normativity column

| Label | Meaning |
|---|---|
| **Normative (WCAG 2.2)** | A W3C Recommendation Success Criterion. Conformance is testable and claimable. Machine-checkable. |
| **Normative (WCAG 3.0)** | Currently a W3C **Working Draft**; text is explicitly unstable ("The exact values are likely to change before WCAG3 is published"). Not yet a standard. |
| **Normative (platform)** | A platform holder's requirement for certification/manufacture. Note: the *game* console guidelines from Sony/Nintendo/Microsoft that bind developers are distributed under NDA and are not the public pages cited here. The public pages are **advisory** to developers. |
| **Advisory** | Best-practice guidance from an accessibility body, platform doc, or practitioner. Not enforceable. |

**Critical caveat on jurisdiction:** WCAG is normative for *web content*, not for native game
rendering pipelines. Xbox's own doc states the XAGs "aren't intended to act as a checklist to
validate any type of compliance or legal requirements." Console manufacturers separately impose
contractual flash-safety testing (HardingFPA), which is where the binding teeth are — but those
specs are confidential.

---

## 1. Master threshold table

| # | Guideline / threshold | Exact value | Normative or advisory | Source URL (fetched) |
|---|---|---|---|---|
| 1 | **WCAG 2.2 SC 2.3.1** — max flash rate | "no more than **three** flashes in any one second period" (≤3 per second passes automatically) | **Normative**, Level A | https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html |
| 2 | WCAG 2.2 **general flash** amplitude | pair of opposing changes in relative luminance of **10% or more of the maximum relative luminance (1.0)**, where the relative luminance of the **darker image is below 0.80** | **Normative**, Level A | same |
| 3 | WCAG 2.2 **flash area** | combined area of concurrent flashes occupies **no more than 0.006 steradians within any 10 degree visual field** ( = **25% of any 10 degree visual field**) | **Normative**, Level A | same |
| 4 | WCAG 2.2 area, practical measurement | **341 × 256 pixel rectangle** "anywhere on the displayed screen area when the content is viewed at **1024 × 768** pixels" ≈ 10° visual field; explicitly **87,296 CSS pixels** in WCAG 2.2 | **Normative** (Note 1 measurement guidance) | same; https://www.w3.org/TR/WCAG22/ |
| 5 | WCAG 2.2 **red flash** | "any pair of opposing transitions involving a saturated red" — WCAG 2.2 operational definition: one transition to/from a state with **R/(R+G+B) ≥ 0.8**, and states differ by **more than 0.2 (unitless) in CIE 1976 UCS** | **Normative**, Level A | same |
| 6 | WCAG 2.2 fine-pattern exception | white noise / checkerboard with squares **smaller than 0.1 degree** of visual field does **not** violate thresholds | **Normative** exception | same |
| 7 | **WCAG 2.2 SC 2.3.2** — Three Flashes | "Web pages do not contain anything that flashes **more than three times in any one second period**" — **regardless of brightness or size**; "even a single flashing pixel would violate this criterion" | **Normative**, Level AAA | https://www.w3.org/WAI/WCAG22/Understanding/three-flashes.html |
| 8 | **WCAG 2.2 SC 2.3.3** — Animation from Interactions | motion animation triggered by interaction **can be disabled**, unless essential | **Normative**, Level AAA | https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html |
| 9 | **WCAG 2.2 SC 2.2.2** — Pause, Stop, Hide | moving/blinking/scrolling info that starts automatically and **lasts more than five seconds** must have a pause/stop/hide mechanism | **Normative**, Level A | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html |
| 10 | WCAG 1.0 legacy band (superseded) | WCAG 1.0 "did not allow any flashing (even of a single pixel) within a broad frequency range (**3 to 50 Hz**)" | Historical / superseded | https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html |
| 11 | ITU-R BT.1702 flash definition (non-sRGB colourspaces) | general flash = change in luminance of **20 cd/m² or more where the darker image is below 160 cd/m²**; for HDR where darker state ≥160 cd/m², Michelson contrast **1/17 or greater**, i.e. (LHigh−LLow)/(LHigh+LLow) | **Normative** reference adopted into WCAG 2.2 Understanding | same |
| 12 | **WCAG 3.0 draft** — "No flashing over threshold" (guideline 2.6.1 "Avoid physical harm") | Carries over **identical** thresholds (3 per second; 10% luminance; darker <0.80; .006 steradians in 10° field). Adds: *"There is research into the size and frequency metrics underway. The exact values are likely to change before WCAG3 is published."* Methods text contains a literal placeholder: "Ensure that any flashing is below **[X]** size in the users' view." | **Draft normative** (Working Draft 10 Sept 2026) | https://www.w3.org/WAI/WCAG3/informative/animation-and-movement/avoid-physical-harm/no-flashing-over-threshold/ |
| 13 | **WCAG 3.0 draft** — "No visual motion" | "Content does not include pseudo-motion or visual motion **lasting longer than 5 seconds**" | **Draft normative** | https://www.w3.org/WAI/WCAG3/informative/animation-and-movement/avoid-physical-harm/no-visual-motion/ |
| 14 | **XAG 118 (Photosensitivity)** — luminance flash | flash = **10% change in luminance** (100% = max luminance of a white screen); darker value **below 0.8**; failure when flashes "occur too frequently (**approximately more than three per second**)" AND take up "**approximately 20 percent or more**" of the screen | Advisory (Microsoft dev guidance) | https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118 |
| 15 | **XAG 118** — red flash | applies when either extreme is saturated red (**R/(R+G+B) ≥ 0.8**); flash defined when change in **(R−G−B) × 320 is greater than 20** | Advisory | same |
| 16 | **XAG 118** — spatial pattern | alternating high-contrast bands; failure when contrast difference **greater than 10 percent** and pattern covers "**approximately 20 percent or more**" of screen | Advisory | same |
| 17 | **XAG 118** — prevalence statement | "approximately **1 in 4,000**" people can experience a seizure from certain visual images | Advisory | same |
| 18 | **XAG 117 (Visual distractions & motion settings)** | "Avoid the use of camera shake, camera bobbing effects, motion blur, mouse blur, and more **or provide an option to turn off these behaviors**." Provide adjustable FOV; camera sensitivity; disable automatic camera movement; 1st/3rd person choice. | Advisory | https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117 |
| 19 | HardingFPA — luminance flash detection | "identifies a transition of at least **20 cd/m²** at pixel level"; "flashing area must exceed **25% of the video frame** to generate a flash failure"; warnings appear above **3 Hz** | Advisory / broadcast-compliance tool (Ofcom, ITU, NAB-J, ISO) | https://www.hardingfpa.com/technical-support/how-to-interpret-hardingfpa-results/ |
| 20 | HardingFPA — spatial pattern failure | "**6 or more stationary pairs** which persist for **more than 0.5 seconds** and the area occupied is **greater than 40%**" → failure | Advisory (tool spec) | same |
| 21 | HardingFPA — extended (sustained low-level) failure | if near-threshold flash activity persists, "an extended failure may occur"; triggers "if such flash activity is detected in at least **80% of the most recent 5 seconds**" | Advisory (tool spec) | same |
| 22 | HardingFPA — NAB-J scene-change rule | if one transition is a "scene change" (80% of image, ≥**20 IRE units**), "the maximum allowable number of transitions is reduced from **6 down to 3**" | Advisory (Japan NAB-J) | same |
| 23 | **Game Accessibility Guidelines** — flashing | avoid: any flashing sequence lasting **more than 5 seconds**; **more than three flashes in a single second covering 25%+ of the screen**; moving repeated patterns / uniform text covering **25%+**; static repeated patterns covering **40%+** | Advisory | https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/ |
| 24 | GAG — pattern definition | "**more than 8 static or 5 moving** high contrast repeated stripes – parallel or radial, curved or straight, in any orientation" | Advisory | same |
| 25 | GAG — VR caveat | "**Particularly in VR**, as the 25%/40% above is based on a typical screen display, not a display that takes up **100% of your field of view**." | Advisory | same |
| 26 | GAG — naming warning | "**the term 'epilepsy safe' must never be used.** If you include a setting called 'epilepsy safe mode', you risk harming players and risk legal action" | Advisory | same |
| 27 | GAG — VR comfort: framerate | "Maintaining constantly high framerate (minimum requirements currently vary depending on platform and research – **60fps, 75fps, 90fps** – but it should **always remain constant**) and low latency (**below 20ms**)" | Advisory | https://gameaccessibilityguidelines.com/avoid-vr-simulation-sickness-triggers/ |
| 28 | GAG — VR comfort: rotation | "teleporting, and **snap-rotating in 30 degree increments**" | Advisory | same |
| 29 | GAG — background movement | option to turn off / hide background movement; level **Intermediate**; rationale is ADHD distraction and readability, not seizure risk | Advisory | https://gameaccessibilityguidelines.com/provide-an-option-to-turn-off-hide-background-movement/ |
| 30 | GAG — FOV | "If the game uses field of view (3D engine only), **set an appropriate default** for the expected viewing environment" (Basic) and "**allow a means for it to be adjusted**" (Intermediate) | Advisory | https://gameaccessibilityguidelines.com/basic/ ; https://gameaccessibilityguidelines.com/intermediate/ |
| 31 | GAG — cold-down period (control, not visual) | "cool-down period (post acceptance delay) of **0.5 seconds** between inputs" | Advisory, Advanced | https://gameaccessibilityguidelines.com/advanced/ |
| 32 | GAG — non-interactive elements | "Provide an option to turn off / hide **all non interactive elements**" | Advisory, Advanced | same |
| 33 | **Epilepsy Society (UK)** — prevalence | "Around **1 in 100** people has epilepsy and, of these people, around **3%** have photosensitive epilepsy." | Advisory (clinical charity) | https://epilepsysociety.org.uk/understanding-epilepsy/photosensitive-epilepsy |
| 34 | Epilepsy Society — trigger frequency band | "Between **3-30 hertz** (flashes per second) are the common rates to trigger seizures... While some people are sensitive at frequencies **up to 60 hertz**, sensitivity **under 3 hertz is not common**." | Advisory | same |
| 35 | Epilepsy Society — **peak provocative band** | "Lights that flash or flicker between **16 and 25 times a second** are the most likely to trigger seizures." | Advisory | same |
| 36 | Epilepsy Society — UK broadcast regulation | "Ofcom regulations... restrict the **flash rate to three per second or less**, and they also restrict the area of screen allowed for flashing lights or alternating patterns." | Regulatory (Ofcom) as reported by Epilepsy Society | same |
| 37 | Epilepsy Society — strobe lighting | "The Health and Safety Executive recommends that strobe lighting, in clubs or at public performances, flashes at a maximum rate of **four Hertz** (flashes per second) or less." | Regulatory (HSE) as reported | same |
| 38 | Epilepsy Society — display refresh | "Plasma, LCD, or TFT screens with a refresh rate of **100 hertz** are less likely to trigger a seizure than older TVs and computer monitors." | Advisory | same |
| 39 | Epilepsy Society — field-of-view risk factor | "The effect taking up **all your field of vision**. For example, being very close to a screen." listed as a factor **increasing** photosensitive risk | Advisory | same |
| 40 | Epilepsy Action (UK) — prevalence | "Photosensitive epilepsy affects around **1 in 4000** people overall... Only around **3 to 5 in every 100 (3 to 5%)** people with epilepsy will have photosensitive epilepsy." | Advisory | https://www.epilepsy.org.uk/info/seizure-triggers/photosensitive-epilepsy |
| 41 | Trace Center / Dr Graham Harding | "about **one in four thousand** people are diagnosed with photosensitive epilepsy"; "majority of sufferers' first seizures occur between the ages of **seven and fifteen**"; "twice as common in females"; CRT raster at **50 Hz** (Europe) noted as a known stimulus | Advisory (expert interview) | https://trace.umd.edu/information-about-photosensitive-seizure-disorders/ |
| 42 | Harding (verbatim, interview) | "photosensitive epilepsy occurs in approximately **1 in 4000** of the population"; "view television in a well lit room from a distance of **2 meters or 8 feet** and never go closer" | Advisory | https://trace.umd.edu/harding-interview-transcript/ |
| 43 | **Nintendo** (consumer support) | No Hz threshold given. Recommendations: "Sit or stand as far from the screen as possible"; "Play video games on the **smallest available television screen**"; "Take a **10 to 15 minute break every hour**"; "Play in a well-lit room" | Advisory (consumer guidance) | https://en-americas-support.nintendo.com/app/answers/detail/a_id/59596 |
| 44 | **DOOM + DOOM II** (shipped game) — FOV | "**Field of View:** Adjust the FOV (between **50 and 120**)" | Shipped implementation | https://slayersclub.bethesda.net/en-AU/news/doom-doomii-accessibility-guide |
| 45 | DOOM + DOOM II — view bob | "**View Bobbing:** Adjust the camera view bobbing (**0% to 100%**)." | Shipped implementation | same |
| 46 | DOOM + DOOM II — screen flash | "**Screen Flash Effects (Full Screen Effects):** When disabled... many of the game's screen flash effects are not displayed. This includes disabling effects such as **blinking when invulnerability is about to end**." Also: "not all screen effects are impacted by this setting." | Shipped implementation | same |
| 47 | DOOM + DOOM II — default-on for a11y path | "Screen Flash Effects are **disabled (not displayed) by default** when you select Customize Accessibility Settings on the first launch menu." | Shipped implementation | same |
| 48 | **Directive 8020** (shipped game) — chromatic aberration | "**Chromatic Aberration** — Scales the intensity of the chromatic aberration effect... **0 – Removes Chromatic Aberration. 10 – Full intensity (Default).** Note: Some gameplay elements may be unaffected." | Shipped implementation (0–10 integer scale) | https://www.thedarkpictures.com/news/directive-8020-accessibility-features |
| 49 | Directive 8020 — motion blur | "**Motion Blur** ... **0 – Removes Motion Blur. 10 – Full intensity (Default).**" | Shipped implementation | same |
| 50 | Directive 8020 — film grain | "**Film Grain** ... **0 – Removes Film Grain. 10 – Full intensity (Default)**" | Shipped implementation | same |
| 51 | **Halo Infinite** (via XAG 117) | "players can individually set the intensity or amount of **radial blur, screen shake, full screen effects, and speed lines** across a sliding scale from **zero to 100%**" | Shipped implementation | https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117 |
| 52 | **Minecraft** (via XAG 117) | "players can adjust the Field of View angle up to **110 degrees**"; XAG notes "lower angles reduce the 'fishbowl' effect and help with motion sickness" | Shipped implementation | same |
| 53 | **Cyberpunk 2077** (via XAG 117) | "players can adjust the amount of **additive or secondary camera movements** to help players who experience motion sickness" (setting named "additive camera motions"; no numeric scale published in source) | Shipped implementation | same |
| 54 | **Sea of Thieves** (via XAG 117) | auto-centre camera off; "auto centre delay is set to **2.0**", "auto centre speed is set to **180**" | Shipped implementation (example values in screenshot) | same |
| 55 | **Flat-screen FOV comfort range** (practitioner guide) | "many people who feel sick at console-style defaults do better between **90 and 105** on a desktop monitor" | Advisory (non-peer-reviewed publisher) | https://dizzout.com/blog/game-settings-that-stop-motion-sickness |
| 56 | Post-processing performance cost table (journalistic) | Motion Blur **1–4% FPS**, DoF **3–8%**, Chromatic Aberration **<1%**, Vignette **<1%**, Bloom **1–2%** | Advisory (secondary source; **not** a primary benchmark — treat as indicative only) | https://bugsgames.net/the-post-processing-divide-why-pc-gamers-wage-war-on-modern-graphics-effects/ |
| 57 | Chromatic aberration discomfort | "Some players find chromatic aberration causes **eye strain or headaches**, particularly when combined with other post-processing effects like motion blur and film grain. This is why many advocate for it to **always be optional**" | Advisory (vendor blog; low authority, corroborating only) | https://spotlightfx.com/blog/what-is-chromatic-aberration-in-games |

---

## 2. Verbatim quotes for the key thresholds

### 2.1 WCAG 2.2 SC 2.3.1 — Success Criterion (normative, Level A)

> \[Web pages\] do not contain anything that flashes more than three times in any one second
> period, or the flash is below the general flash and red flash thresholds.

Source: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html

### 2.2 The general flash and red flash thresholds (glossary definition — this is where the numbers live)

> a flash or rapidly changing image sequence is below the threshold (i.e., content **passes**) if any
> of the following are true:
>
> - there are no more than three **general flashes** and / or no more than three **red flashes**
>   within any one-second period; or
> - the combined area of flashes occurring concurrently occupies no more than a total of **.006
>   steradians** within any **10 degree visual field** on the screen (**25% of any 10 degree visual
>   field** on the screen) at typical viewing distance
>
> where:
>
> - A **general flash** is defined as a pair of opposing changes in relative luminance of **10% or
>   more of the maximum relative luminance (1.0)** where the relative luminance of the darker image
>   is **below 0.80**; and where "a pair of opposing changes" is an increase followed by a decrease,
>   or a decrease followed by an increase, and
> - A **red flash** is defined as any pair of opposing transitions involving a saturated red
>
> _Exception:_ Flashing that is a fine, balanced, pattern such as white noise or an alternating
> checkerboard pattern with "squares" smaller than **0.1 degree** (of visual field at typical viewing
> distance) on a side does not violate the thresholds.

Source: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html

### 2.3 The 341×256 measurement (Note 1) and the CSS-pixel area

> For general software or web content, using a **341 x 256 pixel rectangle** anywhere on the
> displayed screen area when the content is viewed at **1024 x 768 pixels** will provide a good
> estimate of a 10 degree visual field for standard screen sizes and viewing distances (e.g., 15-17
> inch screen at 22-26 inches).

Source: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html

> Substituting CSS pixels for the original pixel block means that the combined area of flashing
> becomes **341 x 256 CSS pixels**, or a flashing area of **87,296 CSS pixels**.

Source: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html

### 2.4 ⚠️ The single most commonly misquoted number in this whole domain

**"25%" in WCAG means 25% of a 10-degree visual field — NOT 25% of the screen.**
The spec is explicit: "the combined area of flashes occurring concurrently occupies no more than a
total of .006 steradians **within any 10 degree visual field on the screen (25% of any 10 degree
visual field on the screen)**".

By contrast, **Game Accessibility Guidelines** writes "More than three flashes in a single second,
covering **25%+ of the screen**" and HardingFPA uses "**25% of the video frame**".
[experiential inference] These three "25%" figures are *different quantities* that happen to share a
number: WCAG's is a fraction of a 10° foveal field, GAG's is phrased as screen area, and Harding's is
frame area. Because the 341×256 block is only ~11.1% of a 1024×768 frame, ~7.1% of 1280×960 and
~4.2% of 1920×1080 [corrected: an earlier draft of this line mislabelled these — 87,296/2,073,600 = 4.2%],
the WCAG rule is **not** equivalent to "a quarter of the screen". Any implementation spec must state
which one it means. GAG itself flags this, warning that its 25%/40% figures assume a "typical screen
display, not a display that takes up 100% of your field of view".

### 2.5 WCAG 2.2 — normative red-flash definition (new in 2.2)

> The new working definition in the field for **"pair of opposing transitions involving a saturated
> red"** is a pair of opposing transitions where, one transition is either to or from a state with a
> value **R/(R + G + B) that is greater than or equal to 0.8**, and the difference between states is
> **more than 0.2 (unitless) in the CIE 1976 UCS chromaticity diagram**. \[ISO 9241-391\]
>
> The chromaticity difference is calculated as:
> `SQRT( (u'1 - u'2)^2 + (v'1 - v'2)^2 )`

Source: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html

### 2.6 WCAG 2.2 SC 2.3.2 — Three Flashes (AAA)

> Web pages do not contain anything that flashes more than three times in any one second period.

> Compared to Success Criterion 2.3.1 Three Flashes or Below Threshold – which allows flashing if it
> is dim enough or has a small enough area – this criterion does not allow any flashing that occurs
> at a frequency greater than 3 per second, **regardless of brightness or size**. As a result, **even
> a single flashing pixel would violate this criterion**.

Source: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes.html

### 2.7 WCAG 2.2 SC 2.3.3 — Animation from Interactions (AAA)

> Motion animation triggered by interaction can be disabled, unless the animation is essential to the
> functionality or the information being conveyed.

Intent, verbatim:

> **How can a website reduce the chances of triggering a vestibular disorder?** Choose any one of the
> following solutions. Avoid using unnecessary animation. Provide a control for users to turn off
> non-essential animations from user interaction. Take advantage of the **reduce motion** feature in
> the user agent or operating system.

> **The impact of animation on people with vestibular disorders can be quite severe.** Triggered
> reactions include nausea, migraine headaches, and potentially needing bed rest to recover.

Source: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html

Note the errata on this SC's key term: "Amending the definition to _not_ exclude blurring" — i.e.
blurring is intended to count as motion animation. Same URL.

### 2.8 WCAG 2.2 SC 2.2.2 — Pause, Stop, Hide (Level A)

> **Moving, blinking, scrolling:** For any moving, blinking or scrolling information that (1) starts
> automatically, (2) **lasts more than five seconds**, and (3) is presented in parallel with other
> content, there is a mechanism for the user to pause, stop, or hide it unless the movement,
> blinking, or scrolling is part of an activity where it is essential

> **Auto-updating:** For any auto-updating information that (1) starts automatically and (2) is
> presented in parallel with other content, there is a mechanism for the user to pause, stop, or hide
> it **or to control the frequency of the update** unless the auto-updating is part of an activity
> where it is essential.

Rationale for the 5 s figure, verbatim: "**Five seconds was chosen because it is long enough to get a
user's attention, but not so long that a user cannot wait out the distraction if necessary to use the
page.**"

Blink/flash distinction (verbatim, relevant to any "warning flash" feature):

> - "Blinking" refers to content that causes a **distraction** problem. Blinking can be allowed for a
>   short time as long as it stops (or can be stopped)
> - "Flashing" refers to content that can **trigger a seizure** (if it is more than 3 per second and
>   large and bright enough). **This cannot be allowed even for a second or it could cause a seizure.
>   And turning the flash off is also not an option since the seizure could occur faster than most
>   users could turn it off.**

Source: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html

**This last point is the strongest available argument against relying on a settings-menu toggle for
flash safety**: the spec's own reasoning is that a seizure can occur before a user could reach the
toggle, therefore the *default* must be safe, not the *option*.

### 2.9 WCAG 3.0 draft — what it adds (and what it explicitly does not yet know)

Requirement text (draft normative):

> Flashes are below the general flash and red flash thresholds.
> **Applies when** content includes flashes. **Except when** the flashing is essential to outcome.
>
> If there is an accessibility supported method of setting a user-preference to prevent flashing, the
> content can be considered to avoid flashing if that preference is respected.
>
> **There is research into the size and frequency metrics underway. The exact values are likely to
> change before WCAG3 is published.**

Methods section contains an unresolved placeholder — quoted verbatim including the placeholder:

> - Ensure that any flashing is below **\[X\]** size in the users' view.

It also adds a **no-exceptions** sibling requirement ("No flashing over threshold (no exceptions)")
listed in the WCAG 3.0 table of contents, and a **trigger warning** requirement
("Trigger warning available"). The TOC-level list under guideline 2.6.1 "Avoid physical harm" is:
No flashing over threshold; No flashing over threshold (no exceptions); No visual motion; No visual
motion (no exceptions); Trigger warning available; Haptic stimulation adjustable; Audio shifting
adjustable; Safe content review.

Sources:
https://www.w3.org/WAI/WCAG3/informative/animation-and-movement/avoid-physical-harm/no-flashing-over-threshold/
https://www.w3.org/TR/wcag-3.0/
https://www.w3.org/WAI/WCAG3/informative/animation-and-movement/avoid-physical-harm/no-visual-motion/

**Bottom line for WCAG 3:** it currently adds **no new numeric flashing threshold**. It re-uses WCAG
2's numbers verbatim and states outright that the numbers may change. Anyone citing "WCAG 3 says X Hz"
today is citing a placeholder.

### 2.10 Xbox Accessibility Guideline 118 — Photosensitivity (verbatim)

> **Luminance flash failure**
> - Definition:
>   - A flash is defined as a **10% change in luminance** (where 100% is the maximum luminance of a
>     white screen)
>   - The darker luminance value should be **below 0.8**.
> - Failure criteria:
>   - Flashes occur too frequently (**approximately more than three per second**).
>   - Flashes take up a certain amount of the screen (**approximately 20 percent or more**).
>   - **Lower intensity flashing can also cause a failure if it's continued for an extended period of
>     time.**
>
> **Red flash failure**
> - Definition:
>   - A red flash requires a lower change in luminance than a normal flash. Specifically, it applies
>     when either extreme of the flash is a saturated red (**R/(R + G + B) >= 0.8**).
>   - A flash here is defined when the change in the value of **(R-G-B) × 320 is greater than 20**.
>
> **Spatial pattern failure**
> - Definition:
>   - Alternating bands that have high contrast define a spatial pattern.
> - Failure criteria:
>   - The difference in contrast is **greater than 10 percent**.
>   - The pattern takes up a large part of the screen (**approximately 20 percent or more**).

And the policy stance, verbatim:

> A small percentage of people (**approximately 1 in 4,000**) can experience a seizure when they're
> exposed to certain visual images... **This is why eliminating game content that can potentially
> cause photosensitive seizures is preferred over splash-screen warnings or other methods.**

Note: XAG 118's **20% screen area** figure differs from GAG/Harding's **25%**. XAG numbers are
prefixed "approximately", so they are advisory bands, not exact thresholds.

Source: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118

> **Numbering warning:** XAG numbers have been renumbered. Guideline **115 is now "Error messages and
> destructive actions"** and **118 is "Photosensitivity"**; the motion/flashing-adjacent guideline is
> **117 "Visual distractions and motion settings"**. Older references to "XAG 115 = photosensitivity"
> are stale. Source: https://learn.microsoft.com/en-us/gaming/accessibility/guidelines

### 2.11 Xbox Accessibility Guideline 117 — Visual distractions and motion settings (verbatim)

> Avoid the use of camera shake, camera bobbing effects, motion blur, mouse blur, and more **or
> provide an option to turn off these behaviors**.

> Avoid any repetitive side-to-side or up-and-down on-screen movement, except that which is core to
> game play. This includes behaviors such as "**weapon sway**" or "**camera bobbing**."

> Provide adjustable **field of view** settings.
> **Note:** This allows players to choose a field of view or angle that is least likely to make them
> sick based on their sitting distance from their screen and other factors.

> Provide camera movement settings like the ability to adjust horizontal and vertical camera movement
> sensitivity and the ability to **disable automatic camera movement**.

Mechanism of harm, verbatim:

> This mismatch between the visual perception of body movement and actual body movement contributes to
> feelings of motion sickness among players. This is why intentional decisions around settings related
> to camera **field of view, camera bobbing, motion blur, weapon sway, automatic changes in camera
> angle**, and more are critical when creating more accessible experiences.

**Important scoping limitation**, verbatim:

> **Ancillary gameplay that occurs surrounding the text-based UI experience isn't subject to this.**
> Example: "The ability to turn off all background movement during active gameplay isn't subject to
> XAG 117 guidelines."

[experiential inference] This is a significant hole: XAG 117's disable requirement is scoped to
**UI-with-text screens**, so in-gameplay screen shake is only addressed by the softer
"avoid ... or provide an option" clause. It does not impose an amplitude or Hz limit on gameplay
shake at all. **No numeric screen-shake limit is given by XAG 117.**

Source: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117

### 2.12 HardingFPA — the broadcast/game compliance thresholds (verbatim)

> The HardingFPA analysis identifies a transition of at least **20 cd/m²** at pixel level after
> compensation for motion and noise and then searches for an opposing transition... Pixels which have
> seen several alternating transitions within the previous second, are analysed in full and it is only
> these which contribute to the main Risk Trace.
>
> **The flashing area must exceed 25% of the video frame to generate a flash failure**; otherwise a
> warning (Pass with Caution) may be indicated.

> Warnings will appear when **frequency and amplitude** have been exceeded and failures will appear
> when **frequency, amplitude and area** criteria are exceeded.

> The HardingFPA detected flashing of **above 3Hz** and at least **20cd/m²** in amplitude; but the
> flash area is **less than 25%** of the screen area.

> The Diagnostic Trace is a useful guide to flash activity which can cause a violation of guidelines
> since **all flash activity above 1.0 Hz is indicated**.

Spatial pattern (verbatim):

> If the HardingFPA detects **6 or more stationary pairs which persist for more than 0.5 seconds** and
> the area occupied is **greater than 40%** then a failed sequence will be indicated.

Extended / cumulative failure (verbatim):

> If such flashing activity persists for more than 4 seconds, an extended failure may occur... The
> black Extended Failure Trace of constant height appears if such flash activity is detected in at
> least **80% of the most recent 5 seconds**.

> The Extended Failure trace is activated when at least **80% of the preceding 5 seconds** contain
> luminance or red flash warnings. This could occur after as little as 4 seconds if flash warning
> activity is continuous.

NAB-J scene change (verbatim):

> in this test mode... if one of the transitions in the most recent second is classified as a "scene
> change" (see bottom entry of the Advanced Information tab) where **80% of the image has seen a
> significant luminance transition of 20IRE units or more**. When this occurs, **the maximum allowable
> number of transitions is reduced from 6 down to 3**.

Sources: https://www.hardingfpa.com/technical-support/how-to-interpret-hardingfpa-results/ ,
https://www.hardingfpa.com/

And on why this matters for games specifically (verbatim from the vendor):

> The HardingFPA video game systems are designed to analyse live video game play direct from the game
> platform (console, PC, or hand-held device) to verify compliance with the various **Proprietary
> Guidelines (provided by the console manufacturers)** that safeguard and protect photosensitive
> players and onlookers from imagery induced epileptic seizures.

Source: https://www.hardingfpa.com/hardingfpa-for-games/games-industry/

**This is the key structural finding for platform requirements:** the actual binding console
specifications exist and are enforced with HardingFPA, but they are "**Proprietary Guidelines
(provided by the console manufacturers)**" — i.e. NDA'd and **not publicly published**. Any figure
quoted publicly as "the Sony/Nintendo flashing limit" is either the broadcast figure (Ofcom/ITU:
3 Hz, 20 cd/m², 25% area) or a leak. I could not obtain a public, citable Sony or Nintendo
*developer* numeric spec within this research; see §6 Gaps.

---

## 3. Photosensitive epilepsy: prevalence and frequency bands

### 3.1 Prevalence — the two numbers, precisely

| Figure | Exact wording | Source |
|---|---|---|
| **~1 in 4,000** of the **general population** | "about one in four thousand people are diagnosed with photosensitive epilepsy" (Trace Center/Harding); "photosensitive epilepsy occurs in **approximately 1 in 4000 of the population**" (Harding); "approximately **1 in 4,000**" (XAG 118); "around **1 in 4000** people overall" (Epilepsy Action) | https://trace.umd.edu/information-about-photosensitive-seizure-disorders/ · https://trace.umd.edu/harding-interview-transcript/ · https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118 · https://www.epilepsy.org.uk/info/seizure-triggers/photosensitive-epilepsy |
| **~3% (or 3–5%)** of people **with epilepsy** | Epilepsy Society: "Around **1 in 100** people has epilepsy and, of these people, around **3%** have photosensitive epilepsy." Epilepsy Action: "Only around **3 to 5 in every 100 (3 to 5%)** people with epilepsy will have photosensitive epilepsy." | https://epilepsysociety.org.uk/understanding-epilepsy/photosensitive-epilepsy · https://www.epilepsy.org.uk/info/seizure-triggers/photosensitive-epilepsy |

⚠️ **These two statistics are not interchangeable and are frequently confused.** "1 in 4,000" is a
prevalence in the whole population; "3%" is a proportion *within* the epilepsy population. Both are
confirmed by the sources above, and both are cited by a platform holder (XAG 118 uses 1 in 4,000).

Age/sex modifiers (Trace Center, verbatim): "The majority of sufferers' first seizures occur between
the ages of **seven and fifteen** years old. Photosensitive seizure disorder is **twice as common in
females** as in males and is a function of **binocular vision**."
Epilepsy Society gives the age window as "between the age of **7 and 19** years old".

### 3.2 Frequency bands — all figures found

| Claim | Exact wording | Source |
|---|---|---|
| Common trigger band: **3–30 Hz** | "Between **3-30 hertz** (flashes per second) are the common rates to trigger seizures but this varies from person to person." | Epilepsy Society (fetched) |
| Some sensitive up to **60 Hz** | "While some people are sensitive at frequencies **up to 60 hertz**, sensitivity **under 3 hertz is not common**." | Epilepsy Society (fetched) |
| **Peak provocative band: 16–25 Hz** | "Lights that flash or flicker between **16 and 25 times a second** are the most likely to trigger seizures." | Epilepsy Society (fetched) |
| Legacy WCAG 1.0 prohibited band: **3–50 Hz** | "This success criterion replaces a much more restrictive criterion in WCAG 1.0 that did not allow any flashing (even of a single pixel) within a broad frequency range (**3 to 50 Hz**)." | https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html (fetched) |
| UK broadcast: **≤3 flashes/second** | "The regulations restrict the flash rate to **three per second or less**, and they also restrict the area of screen allowed for flashing lights or alternating patterns." | Epilepsy Society (fetched) |
| Public-event strobe: **≤4 Hz** | "The Health and Safety Executive recommends that strobe lighting, in clubs or at public performances, flashes at a maximum rate of **four Hertz** (flashes per second) or less." | Epilepsy Society (fetched) |
| Secondary restatement: 3–30 Hz, up to 60 Hz | "Epileptic seizures are most common at flash frequencies between **3 and 30 Hertz (Hz – flashes per second) and up to 60 Hz**. It is rare for seizures to be provoked at frequencies below **3 Hz**." (cites Epilepsy Society April 2025) | https://www.angelinipharma.com/expertise/epilepsy-hub/basics-knowledge/photosensitive-epilepsy-light-triggers/ (fetched; **secondary** — pharma site citing Epilepsy Society) |

> **Precision note on "15–25 Hz":** the commonly repeated "15–25 Hz most provocative" figure was
> **not** confirmed by any page I fetched. The authoritative page I *did* fetch (Epilepsy Society,
> reviewed by Dr F J Rugg-Gunn, Consultant Neurologist, Chalfont Centre for Epilepsy) states
> **16–25 Hz**. Use **16–25 Hz** and cite Epilepsy Society. The Epilepsy Foundation working-group
> paper (Fisher et al. 2005, *Epilepsia* 46(9):1426–1440, doi 10.1111/j.1528-1167.2005.00315.x) is
> the usual origin of the 15–25 claim, but **I could not fetch it** (PubMed reCAPTCHA-blocked;
> ScienceDirect 403; read.qxmd 403; the Epilepsia and ITU PDFs are PDF-only and `web_fetch` rejects
> PDFs). → **UNFETCHED**, cite at your own risk or obtain directly.

### 3.3 Non-seizure effects — important for "reduce flashing" justification

Verbatim (Epilepsy Society), which broadens the affected population far beyond the 1-in-4000 group:

> Flashing, flickering or patterned effects can make people with **or without** epilepsy feel
> **disorientated, uncomfortable or unwell**. This does not necessarily mean they have photosensitive
> epilepsy.

Corroborated by XAG 118 (verbatim):

> In addition, repetitive flashing images can be problematic for a wide range of other players; for
> example those who are **autistic, prone to migraines, or have sensory processing disorder**.

Source: https://epilepsysociety.org.uk/understanding-epilepsy/photosensitive-epilepsy ·
https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118

### 3.4 Real-world enforcement precedent (why "epilepsy safe" naming is dangerous)

GAG (verbatim): "**the term 'epilepsy safe' must never be used.** If you include a setting called
'epilepsy safe mode', you risk harming players and risk legal action being brought against
yourself." GAG also cites the 1997 Pokémon incident ("more than **600 children** being admitted to
hospital after suffering epileptic seizures. Three-quarters of those had never suffered from symptoms
of epilepsy before") and "at least **27 cases of people having their first seizure while gaming**".
WCAG 3.0 gives the same incident as "over **700 children** to the hospital, including about **500**
who had seizures" — sources differ on the count; attribute accordingly.

Sources: https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/ ·
https://www.w3.org/WAI/WCAG3/informative/animation-and-movement/avoid-physical-harm/no-flashing-over-threshold/

Also note GAG's point about the limits of testing (verbatim): "There is always a chance of seizure
from any game, even a game that avoids all common triggers."

---

## 4. Motion sickness / vestibular safety

### 4.1 What the normative layer actually says

WCAG 2.2 **SC 2.3.3 (AAA)** is the only *normative* motion-safety requirement: interaction-triggered
motion must be disableable. **SC 2.2.2 (A)** covers automatically-starting motion >5 s. Neither
specifies a *maximum amplitude*, *shake frequency*, or *FOV limit*. [experiential inference] The
standards deliberately describe the **control** (a user-facing off switch) rather than the **dose**,
because vestibular susceptibility varies enormously between individuals and no single dose threshold is
defensible.

WCAG 3.0's draft "No visual motion" is stricter — motion lasting >5 s is disallowed unless essential
— but is a Working Draft with unresolved detail.

### 4.2 Concrete numbers available

| Item | Value | Status | Source |
|---|---|---|---|
| VR framerate | "60fps, 75fps, 90fps" minimums "vary depending on platform and research – but it should **always remain constant**" | Advisory | https://gameaccessibilityguidelines.com/avoid-vr-simulation-sickness-triggers/ |
| VR latency | "**below 20ms**" | Advisory | same |
| VR snap rotation | "**30 degree increments**" | Advisory | same |
| VR — dynamic FOV reduction during movement | "Dynamically reducing amount of peripheral vision during movement" (listed as a VR comfort technique; **no percentage given**) ; the underlying study is Fernandes AS, Feiner SK, "Combating VR sickness through subtle dynamic field-of-view modification", IEEE 3DUI 2016 | Advisory / academic | https://gameaccessibilityguidelines.com/avoid-vr-simulation-sickness-triggers/ · IEEE ref cited at https://dizzout.com/blog/game-settings-that-stop-motion-sickness |
| VR peripheral blur | "Motion blur effects are problematic outside of VR too, but for VR pay particular attention to avoiding blur in **peripheral vision**" | Advisory | same |
| Flat-screen FOV comfort | "between **90 and 105** on a desktop monitor" | Advisory, secondary | https://dizzout.com/blog/game-settings-that-stop-motion-sickness |
| Shipped FOV ranges | Minecraft up to **110°**; Halo Infinite example **97°**; DOOM + DOOM II **50–120** | Shipped | XAG 117 · DOOM guide |
| Shipped shake/blur sliders | Halo Infinite: radial blur, screen shake, full screen effects, speed lines **0–100%**; Directive 8020: motion blur / film grain / chromatic aberration **0–10**; DOOM + DOOM II: view bobbing **0–100%** | Shipped | XAG 117 · Directive 8020 · DOOM guide |
| Gameplay camera shake amplitude limit | **No numeric maximum found in any normative or platform source.** | — | — |

**Gap, stated plainly:** neither W3C, Microsoft, Valve, GAG, nor Sony/Nintendo publishes a public
**numeric maximum for screen-shake amplitude, duration, or frequency**. XAG 117 requires only
"avoid ... or provide an option to turn off". [experiential inference] The absence is itself the
finding: screen shake is governed by *disclosure + control*, not by a dose ceiling, in every
authoritative source I could fetch.

### 4.3 Prevalence of motion sickness in games

I could **not** secure a fetchable, authoritative prevalence figure. Specifically:

- The most on-point peer-reviewed paper found — Chen A., Burtscher S., Gerling K., *"'I may only be
  able to sit through 30 minutes': Gaming Sickness and Its Impact on Players' Experiences With
  Games"*, MuC '24, pp. 582–587, DOI 10.1145/3670653.3677494 — exists, and I fetched its landing
  page, **but the content is PDF-only** and `web_fetch` rejects `application/pdf`. Landing page:
  https://publikationen.bibliothek.kit.edu/1000183457 → **UNFETCHED content**.
- Epilepsy.com (Epilepsy Foundation) is Cloudflare-blocked (HTTP 403) and archive.org fetch failed.
- PubMed returns a reCAPTCHA interstitial.
- An IEEE Xplore search-results snippet asserted cybersickness is "induced around 60-95% users due to
  immersive VR exposure", but that is a **search-result snippet, not a fetched page** → **must not be
  cited as verified.** 

**Do not put a "X% of players get motion sick" number in a design doc on the strength of this brief.**
If that number is needed, it must be sourced from the KIT/MuC 2024 paper or an equivalent primary
study read in full.

### 4.4 The mechanism (for justifying "reduce motion" features)

Verified verbatim statements:

> This mismatch between the visual perception of body movement and actual body movement contributes to
> feelings of motion sickness among players. — XAG 117

> Vestibular (inner ear) disorder reactions include **dizziness, nausea and headaches**... The impact
> of animation on people with vestibular disorders can be quite severe. Triggered reactions include
> nausea, migraine headaches, and potentially **needing bed rest to recover**. — WCAG 2.2 Understanding SC 2.3.3, with persona quote: "Stop that extra movement! You are making me so dizzy I cannot concentrate. Now I have to turn off my computer and go lie down."

> Simulation sickness occurs due to some of your senses telling your brain that one thing is
> happening, while other senses are busy telling your brain that something else is happening... When
> your visual system says you are moving but your vestibular system says you are stationary.
> — GAG

> The symptoms of VR induced simulation sickness can be severe, ranging from mild discomfort to being
> **partially incapacitated for up to a day two afterwards**, even in some rare cases left with
> **permanent effects**. — GAG

Sources: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117 ·
https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html ·
https://gameaccessibilityguidelines.com/avoid-vr-simulation-sickness-triggers/

### 4.5 Implementation guidance for a "reduce motion" setting

From XAG 117 (verbatim), the required surface area of a motion solution:
adjustable **field of view**; **horizontal + vertical camera sensitivity**; ability to **disable
automatic camera movement** (with configurable delay and speed — Sea of Thieves exposes "auto centre
delay **2.0**" and "auto centre speed **180**"); toggle for **camera shake, camera bobbing, motion
blur, mouse blur**; **weapon sway**; **1st/3rd person** choice; and separate control of **additive /
secondary camera movement**.

From GAG (verbatim), the comfort-mode design rule:

> Some of these considerations may clash with your intended experience. If so, **still implement them,
> but treat them as your default ("comfort mode")**, with the option for players who know they can
> handle them to turn them off.

And on naming, GAG's advice to describe effects literally rather than with clinical labels:
"describe what the setting relates to – 'screen flash effects', 'effects intensity', etc."

DOOM + DOOM II shows the "safe-by-default" pattern in practice (verbatim): "Screen Flash Effects are
**disabled (not displayed) by default** when you select Customize Accessibility Settings on the first
launch menu" and "all accessibility options are set to **the most accessible version by default**"
when choosing that path.

Sources: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117 ·
https://gameaccessibilityguidelines.com/avoid-vr-simulation-sickness-triggers/ ·
https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/ ·
https://slayersclub.bethesda.net/en-AU/news/doom-doomii-accessibility-guide

**Recommendation shape** (advisory wording for a design doc, [experiential inference]):
per-effect float `0.0–1.0`, default `1.0` for cosmetic effects but **`0.0` for full-screen
white/red flash and for any effect that modifies the whole framebuffer's luminance**; expose a master
`prefers-reduced-motion`-linked switch; ship the compliant build as the default and let the player opt
*in* to more.

---

## 5. Readability loss from "juice" overuse

### 5.1 What I could verify

I could **not** fetch the primary developer sources on this topic within this session. Specific
failures:

| Source | Status |
|---|---|
| gamedeveloper.com "Designing for Difficulty: Readability in ARPGs" (https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs) | **HTTP 403** (Cloudflare) — **UNFETCHED** |
| Jan Willem Nijman, "The Art of Screenshake" (GDC 2013) | archive.org item exists (https://archive.org/details/the-art-of-screenshake) but **fetch failed**; no transcript obtained — **UNFETCHED** |
| Martin Jonasson & Petri Purho, "Juice it or lose it" (GDC 2012) | Not fetched — **UNFETCHED** |
| Steve Swink, *Game Feel* | Not fetched — **UNFETCHED** |

**Therefore I cannot supply a verified verbatim developer quote on juice harming readability, nor any
developer-stated numeric limit on shake amplitude, hitflash duration, or bloom intensity.** Stating
otherwise would be fabrication. This is the weakest-evidence section of the brief and is flagged as
such.

### 5.2 What I *did* verify (secondary/weak, use only as corroboration)

From a community-adjacent technical article (verbatim), the readability and comfort complaints are
attributed as user-facing symptoms:

> While designed to enhance immersion, critics argue these effects introduce unwanted **visual noise**,
> degrade native resolution, decrease frame rates, and—in severe cases—induce physical symptoms such
> as **motion sickness and eye strain**.

And a per-effect complaint table (verbatim excerpt):

| Effect | "Primary User Complaint" (verbatim) |
|---|---|
| Motion Blur | "Causes nausea/motion sickness; **reduces competitive readability**." |
| Depth of Field | "Obstructs peripheral vision; feels unnatural as it overrides the player's natural eye focus." |
| Chromatic Aberration | "Makes the image look blurry, out of focus, or low-quality." |
| Vignette | "Artificially constricts the field of view (FOV)." |
| Bloom | "Creates distracting glare; **obscures targets in competitive environments**." |

Same source, verbatim on the mechanism now being treated as accessibility:

> **Vestibular-ocular mismatch**—which occurs when the visual motion on a screen does not match the
> fluid in the inner ear—is a primary cause of simulator sickness. Heavy motion blur and aggressive
> depth of field are major triggers for this condition. As a result, major publishers are increasingly
> **treating these settings as accessibility options**, ensuring they can be disabled globally across
> both PC and console platforms.

**Authority warning:** https://bugsgames.net/ is an SEO-style games blog of unverified editorial
provenance; its figures (the FPS-cost table in §1 row 56) and its evolutionary narrative should be
treated as **indicative, not authoritative**. I include it only because it is the one fetched page
that explicitly links the effects to readability and vestibular harm, and because its claims
directionally agree with the primary sources in §2 and §4.

### 5.3 What *is* well-sourced about readability (from primary sources)

The strongest verified readability statements I found are not about juice per se but about
**background motion behind text** — and they come from Microsoft, verbatim:

> Background animation can distract greatly from elements that are important to gameplay,
> particularly for **attention related cognitive conditions such as ADHD**. It can sometimes be so
> distracting that it can make **essential information and interactive elements difficult to see at
> all**. — GAG, https://gameaccessibilityguidelines.com/provide-an-option-to-turn-off-hide-background-movement/

> Even when the text itself is stationary, if there are background animations or other visual
> distractions present on the UI screen behind the stationary text, players with **attention deficit
> disorders or cognitive disabilities** might find these movements distracting. — XAG 117

> Additionally, when in-game movement behind stationary elements is unavoidable, providing players the
> option to enable an **opaque background behind the text** itself can be helpful. — XAG 117

DOOM + DOOM II implements exactly this (verbatim): "High Contrast Text... will change the background
behind text in the menu to a **solid black background**. This will also **replace the animated
background with a static black background** across many menu screens."

[experiential inference] This gives a defensible, *cited* line of argument for reducing VFX load even
if the juice/readability dev quotes cannot be obtained: the platform holder and the industry guidance
body both state that moving background visuals measurably impair access to essential information for
ADHD/cognitive players, and both prescribe a kill switch plus an opaque text backing. That argument
does not depend on any designer's opinion.

---

## 6. Shipped "photosensitivity mode" / "reduce flashing" implementations — what is actually published

| Game | What ships | Numbers | Source (fetched) |
|---|---|---|---|
| **DOOM + DOOM II** | "Screen Flash Effects (Full Screen Effects)" toggle; FOV slider; view bobbing slider; high-contrast text that removes animated menu backgrounds; a first-launch accessibility path that sets the safe options by default | FOV **50–120**; view bobbing **0%–100%**; chat message time **0–20**; controller/crosshair size **50%–400%**; brightness **0–100%**; extra lighting **0%–100%** | https://slayersclub.bethesda.net/en-AU/news/doom-doomii-accessibility-guide |
| **Halo Infinite** | Independent sliders for radial blur, screen shake, full screen effects, speed lines; FOV; look sensitivity H/V | Sliders **0–100%**; FOV example **97°** | XAG 117 |
| **Directive 8020** | Separate "scales the intensity" sliders for motion blur, film grain, chromatic aberration | Each **0–10**, **default 10**; "0 – Removes" the effect | https://www.thedarkpictures.com/news/directive-8020-accessibility-features |
| **Minecraft** | FOV setting | up to **110 degrees** | XAG 117 |
| **Cyberpunk 2077** | "additive camera motions" setting; vignette/CA by default | no numeric scale published in source | XAG 117 |
| **Sea of Thieves** | Auto-centre camera off/delay/speed; opaque text backings | delay **2.0**, speed **180** | XAG 117 |
| **Even the Ocean**, **TowerFall** | Cited by GAG as epilepsy-trigger toggle best practice examples | no numbers published | https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/ |

**Answer to "what fraction do they cut, and do they replace white flash with a tint?"** —
**No shipped game I fetched publishes a cut fraction, and none documents replacing white flash with a
tint.** What is published is:
- an **on/off toggle** (DOOM + DOOM II — all-or-nothing, and explicitly incomplete: "not all screen
  effects are impacted by this setting"; "may reduce the visibility of some types of elements or
  actions"),
- a **0–100% intensity slider** (Halo Infinite), or
- a **0–10 "scale the intensity" slider** where 0 removes the effect (Directive 8020).

[experiential inference] The published state of the art is therefore **scalar attenuation, not a
frequency cap**. No shipped title I found advertises a "caps flashing at N Hz" guarantee. Given §2.8
(WCAG's own reasoning that a seizure may occur before a user can reach a toggle), a design that
relies on the player having already pre-configured the toggle is not defensible for the highest-risk
effects; the flash itself must be under threshold in the default build.

---

## 7. Chromatic aberration and bloom — discomfort guidance and recommended maximums

### 7.1 The honest answer on "recommended maximum"

**No normative or platform-published maximum amount or duration of chromatic aberration exists in any
source I could fetch.** There is no WCAG SC for it, no XAG for it, and no GAG guideline for it.
The only quantified published artifact is a **shipped in-game slider scale**:

> **Chromatic Aberration** — Scales the intensity of the chromatic aberration effect. Chromatic
> aberration simulates the colour shifts in real-world camera lenses.
> **0 – Removes Chromatic Aberration. 10 – Full intensity (Default).**
> Note: Some gameplay elements may be unaffected.

Source: https://www.thedarkpictures.com/news/directive-8020-accessibility-features (fetched)

### 7.2 Discomfort claims

| Claim | Verbatim | Source / status |
|---|---|---|
| CA can cause eye strain/headaches, esp. combined with motion blur + film grain | "Some players find chromatic aberration causes **eye strain or headaches**, particularly when combined with other post-processing effects like motion blur and film grain. This is why many advocate for it to **always be optional**" | https://spotlightfx.com/blog/what-is-chromatic-aberration-in-games (fetched; **vendor blog — low authority**) |
| Extended-session fatigue | "**Reduced eye strain:** Some players experience discomfort or headaches from chromatic aberration, especially during extended gaming sessions. The constant color shifting at screen edges can be fatiguing for sensitive eyes." | same (fetched; low authority) |
| CA reduces clarity / perceived resolution | "Artificially distorts color channels (R, G, B) at the screen edges, **reducing perceived resolution**"; user complaint "Makes the image look blurry, out of focus, or low-quality." | https://bugsgames.net/the-post-processing-divide-why-pc-gamers-wage-war-on-modern-graphics-effects/ (fetched; low authority) |
| Industry expectation | "many developers assume players will appreciate the cinematic quality, but community feedback consistently shows that a significant portion of players immediately disable chromatic aberration. This has led to ongoing discussions about whether such effects should **always be optional**, with accessibility advocates and groups like **Digital Foundry** arguing that player choice should take priority unless the effect is absolutely core to the game's identity." | https://spotlightfx.com/blog/what-is-chromatic-aberration-in-games (fetched; low authority — the Digital Foundry attribution is **unverified**) |
| Vignette reduces peripheral vision | "Artificially constricts the field of view (FOV)." | bugsgames.net (fetched; low authority) |
| Bloom obscures targets | "Creates distracting glare; **obscures targets** in competitive environments." | bugsgames.net (fetched; low authority) |

**Caveat:** every row in this table rests on secondary/SEO-tier sources. I found **no peer-reviewed
or platform-holder source** quantifying chromatic-aberration discomfort. Do not cite a threshold for
it; cite the *pattern* (shipped games expose CA as a 0–10 slider with 0 = removed) instead.

### 7.3 The defensible engineering conclusion for CA and bloom

[experiential inference, but grounded in §2.12 and §7.1] Because CA and bloom have no external
threshold to comply with, they should be governed by the same rule the platform holders already apply
to motion: **expose an independent intensity control, allow full removal (0), and do not rely on
them to convey gameplay-critical information.** Directive 8020's own note — "Some gameplay elements
may be unaffected" — is a warning sign: if setting CA to 0 leaves gameplay-critical CA-driven
signalling intact, then CA is being used as a channel, and per WCAG 1.4.1 / XAG-style multi-channel
reasoning it must be duplicated in another modality.

---

## 8. Gaps and unfetched sources (read this before quoting the brief)

| Gap | Why | What to do |
|---|---|---|
| No numeric screen-shake **amplitude/duration** limit anywhere | Not published by W3C, Microsoft, Valve, GAG | State "no public threshold exists"; specify your own and document it |
| No fetchable motion-sickness **prevalence %** | KIT/MuC 2024 paper is PDF-only; epilepsy.com Cloudflare-403; PubMed reCAPTCHA | Obtain the MuC 2024 paper (DOI 10.1145/3670653.3677494) as PDF and read it, or drop the stat |
| No verified **juice/readability developer quotes** | gamedeveloper.com 403; GDC talks video-only; no transcripts fetched | Watch "The Art of Screenshake" (GDC 2013) and "Juice it or lose it" (GDC 2012) directly, or fetch gamedeveloper.com from a non-blocked network |
| Epilepsy Foundation (US) pages | Cloudflare 403 + archive.org fetch failure | Use Epilepsy Society UK (fetched, clinician-reviewed) instead — it is a stronger source anyway |
| Fisher et al. 2005 *Epilepsia* (origin of "15–25 Hz") | PubMed/ScienceDirect/qxmd all blocked; PDF-only | Note that the verified figure is **16–25 Hz** per Epilepsy Society; obtain the paper if the 15 Hz bound matters |
| **Sony / PlayStation developer numeric spec** | Not public; HardingFPA confirms console specs are "Proprietary Guidelines (provided by the console manufacturers)" | Only consumer safety warnings are public; the numeric spec must come from the platform's developer portal under NDA |
| **Nintendo developer numeric spec** | Not public; only consumer guidance fetched (no Hz values) | Same as above. (A "Nintendo Wii Programming Guidelines" doc exists on manualslib.com but returned HTTP 403 — **UNFETCHED**) |
| XAG "Reduced Motion"/"Camera Comfort" **feature tag criteria** | The fetched feature-tags page (v2.0.1) did not include a flashing/motion tag in the portion retrieved; the remainder was spill-truncated | Re-fetch https://learn.microsoft.com/en-us/gaming/accessibility/accessibility-feature-tags and read the Visual Features section in full |
| Ofcom / ITU-R BT.1702 / ISO 9241-391 primary texts | PDF-only (web_fetch rejects `application/pdf`) | Fetch via a browser or PDF tool; the WCAG Understanding page already restates BT.1702's 20 cd/m² / <160 cd/m² numbers |
| XAG version history (flashing element size/intensity changes) | Only glimpsed in non-English search results | https://learn.microsoft.com/en-us/gaming/accessibility/xag-version-history |

---

## 9. Condensed engineering checklist (all values traceable to the table in §1)

**Hard requirements (normative — must not be exceeded in the default build):**
1. ≤ **3 flashes per second** in any 1 s window — WCAG 2.3.1 (A). Above this, only pass if below threshold.
2. Any general flash must be **<10% relative-luminance change**, or the darker state must be **≥0.80** relative luminance, or the flashing area must be **≤0.006 steradians within a 10° field**.
3. Red flash: if any transition touches **R/(R+G+B) ≥ 0.8** with a **>0.2 CIE 1976 UCS** difference, treat it as a flash at the same frequency/area limits.
4. Auto-starting motion/blink/scroll lasting **>5 s** needs a pause/stop/hide mechanism — WCAG 2.2.2 (A).
5. AAA targets: **zero** flashing above 3 Hz regardless of size/brightness (2.3.2); interaction-triggered motion must be disableable (2.3.3).

**Advisory targets (platform + industry guidance):**
6. Screen flash area ≤ **~20%** (XAG 118) / **25%** (GAG, HardingFPA) — pick one and document which.
7. Avoid flash sequences **>5 s** duration; watch the **80%-of-5-seconds** cumulative-exposure rule (HardingFPA).
8. Keep the peak band **16–25 Hz** clear with margin; avoid the **3–30 Hz** band entirely where possible.
9. Full-screen effects, screen shake, motion blur, camera bob, weapon sway, chromatic aberration and bloom each get an **independent control that can reach zero**.
10. Provide adjustable **FOV**, horizontal/vertical camera sensitivity, automatic-camera-movement off, and 1st/3rd person choice.
11. **Safe-by-default**: the reduced-effects configuration should be the one a player gets when they choose the accessibility path, per DOOM + DOOM II's pattern and WCAG 2.2.2's reasoning.
12. Never label a setting "epilepsy safe" — GAG.
13. Validate with **HardingFPA** (the tool the console manufacturers require) before submission.

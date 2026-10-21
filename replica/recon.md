# Recon map: InstaDoodle (web app, browser-based)

Scope: the core loop — text prompt / template / own image → animated whiteboard (hand-drawn) scenes → voice + music → rendered video. Agency extras (AI Wizard, InMotion) mapped but marked could.
For: **confirmed 2026-10-20 — own YouTube content first, built so it can be sold later** (see `architecture.md`).
Date: 2026-10-20

> **Evidence level.** The app lives behind a login (`instadoodle.app/user/login`). No account was used, so every
> in-app screen below is **inferred** from the official sales page, the samples page and third-party write-ups.
> Screen layouts, exact settings and click counts are guesses until someone drives a real account. If you have one,
> a 20-minute click-through with screenshots into `replica/screens/` upgrades most rows from `guess` to `high`.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | app login (the URL given) | https://instadoodle.app/instadoodle | Login, sign-up, forgot-password only. Email+password, Google sign-in, "remember 30 days". Branded "Doodle" in the form copy. |
| 2 | official sales page | https://instadoodle.com/ | Best source. Full feature list, plan table, aspect ratios, resolutions, credits, guarantee. |
| 3 | samples page | https://instadoodle.com/samples | 16 sample titles (explainers, ads, kids' stories, how-tos). Videos on Vimeo, not inspected. |
| 4 | terms | https://instadoodle.com/terms | Fair-use clause bans bots/scripts generating videos in mass; restricts top 0.05% users. **No anti-competitor or reverse-engineering clause found.** No output-ownership clause. |
| 5 | help center | https://help.instadoodle.com/support/home | JS-rendered, did not load. Ticket-based support. **Worth reading in a browser.** |
| 6 | tutorial (third-party) | https://aiindigo.com/tutorials/getting-started-with-instadoodle-create-whiteboard-animations-from-text | Workflow steps; notes audio sync is manual. |
| 7 | affiliate tutorial | https://instadoodle-reviews.beehiiv.com/p/instadoodle-tutorial-a-step-by-step-guide-to-creating-your-first-whiteboard-video | 3-step flow, share to YouTube/Facebook claim. Promotional, low weight. |
| 8 | affiliate review | https://my-reviews.beehiiv.com/p/instadoodle-honest-review-what-they-don-t-tell-you | 1 credit = 1 AI element; AI misses prompts; no motion paths. Promotional, low weight. |
| 9 | affiliate pricing post | https://my-reviews.beehiiv.com/p/instadoodle-price-features-2025-breakdown-for-usa-uk-aus | $37 one-time front end + $67 Pro. Promotional, conflicts with #2. |
| — | public API docs | none found | — |
| — | app store listing | none found (web only) | — |
| — | official YouTube tutorials | https://www.youtube.com/@InstaDoodle | Not watched. Best next source for real editor layout. |

**Conflicts to resolve:** pricing model (sales page shows $47/$67/$127 per month *and* a $37 one-time checkout; affiliates say one-time); guarantee (60 days on sales page, 14 in terms, 30 in one review); "6 animation types" with only 5 named; language counts (20+, 30+, "any").

## Core loop

Type an idea (or pick a template / upload a photo) → AI and the library fill scenes with doodle art → each element is "drawn on" by a hand in sequence → add narration and music → cloud-render an HD video to download.

## Screens

All inferred (confidence: guess unless noted).

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Login | /user/login | sign in | email, password, remember-30-days, forgot link, Google button | default (seen, high) |
| S02 | Sign up | link on S01 | create account | email, password, confirm, Google button | default (seen, high) |
| S03 | Forgot password | link on S01 | reset | email, recover button | default (seen, high) |
| S04 | Dashboard / projects | after login | list, open, create projects | project cards (thumb, name, ratio), new-project button, credits badge | empty, filled |
| S05 | New project | button on S04 | start blank or from template, pick aspect ratio | ratio picker 16:9 / 9:16 / 4:5 / 1:1, blank vs template | default |
| S06 | Template gallery | S05 | choose one of 14+ starter templates | template grid, preview | filled, locked (plan) |
| S07 | Editor | open project | compose scenes | canvas, scene/slide strip, left tool tabs, properties panel, timeline, preview + export buttons | empty scene, filled, saving, error |
| S08 | Asset library panel | editor tab | search & insert 1,000+ elements | search, category tabs (characters, props, bubbles, arrows, emoji, backgrounds), grid, PRO badges | loading, results, no results, locked |
| S09 | DoodleAI panel | editor tab | generate element from prompt | prompt box, style picker (caricature, cartoon, realistic, charcoal, doodle…), generate, variations (4x Pro), credit cost | idle, generating, results, AI miss, out of credits |
| S10 | Upload / image-to-sketch | editor tab | bring own image, convert to doodle | dropzone, convert toggle | uploading, converting, error (type/size) |
| S11 | Image editor | on an image element | fix artwork | freehand draw, fill, eraser, crop, recolor, one-click BG removal | default, processing |
| S12 | Hand picker | editor panel | choose drawing hand | **seen (user screenshot, 2026-10-20, high):** 2-column tile grid, 24 hands + "No Hand" (male/female, skin tones, sleeves, watch, tattoos, Santa ×2, Witch ×2, Cartoon ×4, Chalk ×2); star badge = Pro (8 of them) | selected (purple border + purple gradient label), pro |
| S13 | Animation & timing | element selected | how/when it appears | type (draw, wipe, slide, fade, pop-in, +1), duration, delay, order | default |
| S14 | Scene settings | scene selected | background & transition | board (white, blackboard, greenboard, math paper…), blur / transparency / white-fill toggles, transition (fade, wipe, iris, push), scene duration | default |
| S15 | Text | editor tab | add/edit text | font picker (20 Pro fonts, custom upload), size, colour, align | default |
| S16 | Voiceover | editor tab | narration | TTS text, voice, language, generate; upload file; (record?) | idle, generating, attached, error |
| S17 | Music | editor tab | background track | royalty-free library, upload, volume | default |
| S18 | Preview | button in S07 | watch before render | player, scrub, scene jump | playing, paused |
| S19 | Export / render | button in S07 | render video | resolution (1080p; 2K/4K Pro), ratio confirm, render button | idle, queued, rendering %, done, failed |
| S20 | Renders / downloads | after S19 or S04 | get the file | list, status, download | rendering, ready, failed |
| S21 | AI Wizard (Agency) | dashboard or editor | script → whole project | topic/script input, language, voice, generate project | generating, done |
| S22 | InMotion (Agency) | editor tab | video → sketch frames | video upload, convert | processing, done |
| S23 | Account / plan / credits | avatar menu | plan, credits, billing | plan card, credit balance, upgrade | default |
| S24 | Upgrade / paywall | clicking a locked item | upsell | tier compare, buy | default |

Mobile: sales page claims it runs on iPad and phones in a browser. No evidence the editor is designed for small screens — assume desktop-first.

## Flows

Click counts are estimates.

```
F01 Make a video from a template
    S04 -> S05 (ratio) -> S06 (pick) -> S07 (edit text) -> S18 -> S19 -> S20
    happy path clicks: ~10 (sales page claims first video in under 2 minutes)
    edge: template locked to Pro, ratio change after building, unsaved changes on leave

F02 Generate a doodle from a prompt
    S07 -> S09 type prompt, pick style -> generate -> pick a variation -> placed on canvas
    happy path clicks: ~5
    edge: AI misreads the prompt (source 8), out of credits -> S24, non-English prompt, slow queue, generation fails (refund the credit?)

F03 Turn my photo into a doodle
    S07 -> S10 upload -> convert -> S11 (BG removal, crop, recolor) -> placed
    happy path clicks: ~5
    edge: huge file, wrong type, low-contrast photo gives a messy sketch, transparent PNG

F04 Animate an element
    select element -> S13 type, duration, delay -> S12 hand -> S18 preview
    happy path clicks: ~5
    edge: element with no strokes (photo) under "draw", overlapping elements, very long durations

F05 Add narration
    S16 type text, voice, language -> generate -> drops on timeline; or upload audio
    happy path clicks: ~4
    edge: audio longer than scenes (sync is manual — source 6), unsupported language, TTS failure

F06 Add background music
    S17 pick track -> volume
    happy path clicks: ~3

F07 Export
    S07 -> S19 resolution -> render -> S20 download
    happy path clicks: ~3 plus wait
    edge: 4K on Standard -> S24, render fails, tab closed mid-render (must continue server-side), very long video

F08 Script to project (Agency)
    S21 topic/script -> language, voice -> generate -> S07 with scenes, art and synced voice
    happy path clicks: ~4

F09 Account
    S02 sign up (or Google) -> S04; S01 login; S03 reset
    edge: Google account already registered by email, weak password

F10 Hit a plan limit
    any locked asset, hand, style, 2K/4K, AI Wizard -> S24
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, ghost, icon | default, hover, focus, disabled, loading | all |
| Text input / textarea | email, password, prompt, TTS script | default, focus, error, disabled | S01–S03, S09, S16, S21 |
| Google sign-in button | — | default, loading | S01, S02 |
| Project card | — | default, hover, rendering badge | S04 |
| Aspect ratio picker | 16:9, 9:16, 4:5, 1:1 | selected | S05, S19 |
| Tile grid (assets, templates, hands, tracks) | with PRO lock badge | loading, hover, selected, locked | S06, S08, S12, S17 |
| Search with category tabs | — | empty, results, none | S08 |
| Canvas with selectable objects | — | selected, multi-select, dragging, scaling | S07 |
| Scene / slide strip | thumbnails, add, reorder, duplicate, delete | active, dragging | S07 |
| Timeline | per-element bars, audio tracks | playing, scrubbing | S07 |
| Properties panel | element, scene, text | — | S07, S13, S14, S15 |
| Style picker | AI styles | selected, locked | S09 |
| Select / dropdown | animation type, transition, voice, language, font, resolution | open, selected | S13–S16, S19 |
| Slider / number | duration, delay, volume, blur, transparency | — | S13, S14, S17 |
| Toggle | white fill, convert to sketch | on, off | S10, S14 |
| Image editor toolbar | draw, fill, erase, crop, recolor, remove BG | active tool | S11 |
| Player | — | playing, paused, buffering | S18, S20 |
| Progress / status | queued, rendering %, done, failed | — | S09, S19, S20 |
| Credit badge | — | normal, low, zero | S04, S09, S23 |
| Modal | default, upsell | open, closing | S05, S19, S24 |
| Toast | success, error, info | — | all |

## Inferred data model

```
User            id, email, password_hash | google_id, plan (standard|pro|agency), created_at
                evidence: S01–S03 (seen), plan table (source 2)       confidence: high

CreditLedger    id, user_id, delta, reason (grant|ai_element|ai_wizard|voice|refund), ref_id, created_at
                evidence: "150 AI credits", "1 credit = 1 AI element" (sources 2, 8)  confidence: medium

Project         id, user_id, name, aspect_ratio (16:9|9:16|4:5|1:1), template_id?, thumbnail_url,
                updated_at
                evidence: ratios and templates (source 2)              confidence: medium

Scene           id, project_id, position, background_id, bg_blur, bg_transparency, white_fill,
                transition (fade|wipe|iris|push), duration_ms
                evidence: backgrounds, toggles, transitions (source 2)   confidence: medium

Element         id, scene_id, kind (asset|ai|upload|text), asset_id?, x, y, scale, rotation, z,
                animation (draw|wipe|slide|fade|pop_in|…), start_ms, duration_ms, hand_id?,
                text?, font_id?, color?
                evidence: drag/scale/edit text, animation types, hands (source 2)  confidence: medium

Asset           id, owner (library|user), type (character|prop|bubble|arrow|emoji|background),
                style, tier (standard|pro), source (library|ai|upload|sketch), file_url (svg|png),
                stroke_data?, tags
                evidence: library + AI + upload + image-to-sketch (source 2)   confidence: medium
                stroke_data is a guess: "draw" needs an ordered path for the hand to follow.

AIGeneration    id, user_id, prompt, style, variations, status, result_asset_ids[], credits_used
                evidence: DoodleAI, 4x variations Pro (source 2)        confidence: medium

Hand            id, name, image_url, tip_offset (x,y), tier
                evidence: 8 + 8 hands (source 2)                         confidence: medium

Font            id, name, file_url, tier, owner (library|user)          confidence: medium

AudioTrack      id, project_id, kind (voiceover|music|sfx), source (tts|upload|library), voice_id?,
                language?, text?, file_url, start_ms, volume
                evidence: voices, music, upload (source 2)               confidence: medium

Template        id, name, aspect_ratio, project_snapshot (json), tier   confidence: medium

RenderJob       id, project_id, resolution (1080p|2k|4k), status (queued|rendering|done|failed),
                progress, output_url, error, created_at
                evidence: cloud rendering, priority queue (source 2)     confidence: medium
```

Relationships: User 1-n Project, Project 1-n Scene, Scene 1-n Element, Element n-1 Asset, Element n-1 Hand,
Project 1-n AudioTrack, Project 1-n RenderJob, User 1-n AIGeneration 1-n Asset, User 1-n CreditLedger.

## Feature matrix

See `features.csv`. Must: 25, should: 18, could: 8, skip: 6.

## Out of scope (cannot or should not be cloned)

- **Their art.** The 1,000+ / 3,000+ doodle library, templates, backgrounds and hands are their assets. Build your own library (commission, generate, or open-licence) — same categories, new drawings.
- **"DoodleAI™" and their model.** You rebuild the feature (prompt → doodle element) on your own image model and prompts, under your own name.
- **Their voices and music.** The 6 AI voices and music tracks come from their vendors and licences. Use your own TTS provider and a licensed or royalty-free library.
- **Sample videos, testimonials, ratings, bonuses** ("One Week Cash Machine", VSL script). Marketing, not product.
- **Their customer base and ratings.** Not transferable.

## Size

Screens 24, flows 10, entities 12.

Hard parts:
1. **Draw-on animation with a following hand.** Every element needs an ordered stroke path; a hand image must track the pen tip. For library art you author strokes; for AI or uploaded raster images you must vectorise/skeletonise and order strokes automatically. This is the product.
2. **Server-side video rendering** at 1080p–4K for every ratio, with audio mix, reliable for long videos and closed tabs (headless renderer or ffmpeg pipeline + a job queue).
3. **AI doodle generation in a consistent line-art style** that then converts cleanly to strokes, plus credits accounting.
4. TTS in many languages and syncing narration to scene timing (theirs is manual — an opening).
5. The asset library itself: hundreds of on-brand drawings before launch.

Size: **L (a quarter)** for parity with Standard + Pro. A **core-loop MVP** (templates, library, upload→sketch, draw/fade/pop animations, hands, TTS, 1080p render) is **M (a few weeks)**. Agency features (AI Wizard, InMotion) add more on top.

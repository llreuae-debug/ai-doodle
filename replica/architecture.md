# Architecture plan: Ai Doodle (whiteboard video maker)

Status: **draft for approval** · 2026-10-20 · inputs: `recon.md`, `features.csv`

## Decisions already made

| question | answer |
| --- | --- |
| Who is it for | Own YouTube videos first. Built so it can become a sellable SaaS later without a rewrite. |
| Where | This folder (`Ai Doodle/`). Repurpose the Vite + React scaffold. The sketch-game idea in `index.html` is dropped. |
| Scope now | The core-loop MVP from the recon (size M). Accounts, billing, credits and cloud render come in Phase 2. |

## Guiding principles

1. **One renderer, used everywhere.** `renderFrame(project, t, ctx)` is a pure, deterministic function with no React and
   no DOM. The editor preview, scene thumbnails, browser export and the later server render all call it. Preview and
   export can never drift apart.
2. **The project is one JSON document.** A versioned (`schemaVersion`) document, not rows. Phase 1 stores it in
   IndexedDB. Phase 2 puts the same document in a Postgres `jsonb` column. Migrations are plain functions
   `vN → vN+1`.
3. **Everything that draws on is "reveal through a brush mask".** Library SVGs, uploaded photos, AI images and text
   all go through the same path: final art + ordered centreline strokes → reveal the art under a fat brush that
   follows the strokes → put the hand at the brush tip. One code path covers every element kind.
4. **Keep API keys off the client from day one.** A tiny server handles TTS and AI calls, even when you are the only
   user. In Phase 2 the same server gets auth.

## Stack

| layer | choice | why |
| --- | --- | --- |
| UI | React 19 + Vite (already installed) | Already scaffolded. |
| Language | **TypeScript** (recommend switching now, while `src/` is still the starter) | The document model is large and nested. Types catch schema mistakes early. Say no if you'd rather stay on JS. |
| State | Zustand + Immer, with patch-based undo/redo | Small, works with one big document, and Immer patches give undo for free. |
| Local storage | IndexedDB through Dexie: `projects`, `assets` (blobs), `audio` (blobs) | Works offline, holds large blobs, no server needed for own use. |
| Rendering | Canvas 2D on an `OffscreenCanvas`; the editor's selection handles are an SVG overlay on top | Canvas 2D does dash offsets, clip paths and compositing, and it also runs in workers and in headless Chromium. |
| Heavy work | Web Workers (image → strokes, export) | Keeps the editor responsive. |
| Export (Phase 1) | WebCodecs `VideoEncoder` + `AudioEncoder`, muxed to MP4 with **Mediabunny**; audio mixed in `OfflineAudioContext` | Renders frame by frame, entirely in the browser. M0 measured 8.4 s for a 6.9 s 720p clip in headless Chrome, so about real time; measure 1080p/4K in a normal window. Chrome/Edge first. Check Safari's encoder support before relying on it. |
| Server | Hono on Node in `server/` (deployable as a serverless function later) | Proxies TTS and image AI calls. Grows into the Phase 2 API. |
| TTS | Gemini TTS returning an audio file | The browser's `speechSynthesis` can't be recorded into the export. |
| Image AI | Evaluate 2–3 providers using a fixed line-art prompt template | What matters is how cleanly the output turns into strokes, not image quality alone. |
| Phase 2 | Supabase (auth incl. Google, Postgres, Storage), a render queue, Stripe | You already use Supabase elsewhere in this workspace. |

## Module layout

```
src/
  model/       types, defaults, schema migrations, factories (newProject, newScene, newElement)
  engine/      PURE — no React/DOM imports
    timeline.ts     resolves per-element start/duration, scene offsets, total length
    renderFrame.ts  draws one frame of the whole project at time t
    reveal.ts       brush-mask reveal along strokes
    hand.ts         hand placement at the brush tip
    animations.ts   draw, wipe, slide, fade, pop-in, (6th: "move-in with hand")
    transitions.ts  fade, wipe, iris, push between scenes
  pipeline/    workers: rasterToStrokes, svgToStrokes, textToStrokes
  export/      exportMp4 (WebCodecs + Mediabunny), mixAudio (OfflineAudioContext)
  store/       zustand store, undo/redo, autosave to Dexie
  services/    storage (Dexie), tts, ai — all behind interfaces so Phase 2 can swap in Supabase
  editor/      React: Dashboard, Editor, Canvas, SceneStrip, Timeline, panels/*
server/        Hono: POST /tts, POST /ai/doodle (Phase 2: auth, credits, render jobs)
public/library/  your own SVG art, hands, backgrounds, music (with LICENSES.md)
```

## Project document (v1)

```ts
Project   { schemaVersion: 1, id, name, aspectRatio: '16:9'|'9:16'|'4:5'|'1:1',
            scenes: Scene[], music?: AudioClip, handId, createdAt, updatedAt }
Scene     { id, background: { boardId, blur, opacity, whiteFill },
            elements: Element[], narration?: Narration,
            transition: { type: 'none'|'fade'|'wipe'|'iris'|'push', ms },
            durationMs: number | 'auto' }
Element   { id, assetId | text, x, y, scale, rotation, z,
            anim: { type: 'draw'|'wipe'|'slide'|'fade'|'pop'|'none', durationMs: number|'auto',
                    delayMs, after: 'previous'|'with-previous'|'scene-start' },
            handId?: string|null }   // null = no hand for this element
Narration { text, voiceId, language, audioId?, durationMs? }   // audioId = TTS result or upload
Asset     { id, source: 'library'|'upload'|'ai', kind, tags, width, height,
            artBlobId,                  // final look (SVG or PNG)
            strokes: Stroke[] }         // ordered centrelines in asset space
Stroke    { points: [x, y][], width }   // pre-sampled; the length table is cached at load
Hand      { id, imageUrl, tipX, tipY, scale }
```

Positions are in a **fixed logical canvas per ratio** (e.g. 1920×1080 for 16:9). Export scales the whole canvas, so
2K/4K are only an export setting.

## The hard parts, in detail

### 1. Draw-on with a following hand

- **Timeline:** by default each element starts `after: 'previous'`. A `'auto'` draw duration is
  `clamp(totalStrokeLength / speed, 0.6s, 6s)`. `timeline.ts` turns the document into absolute
  `[start, end]` times per element and per scene.
- **Reveal:** at progress `p`, find the stroke and position at `p × totalLength` using the cached cumulative-length
  tables. Paint the completed strokes plus the partial one into a mask canvas with a round brush of
  `max(stroke.width × 1.5, minBrush)`. Composite the art through it (`destination-in`). Cache the mask of completed
  strokes so each frame only adds the newest segment.
- **Hand:** draw the hand image so that `(tipX, tipY)` sits on the current point. Add a slight lift and lag
  between strokes so it doesn't teleport. Between elements the hand moves on an eased path.
- **Fill finish:** once the strokes finish, fade in the full art over about 150 ms. That covers solid fills and
  colours the brush mask missed.

### 2. Image → strokes (uploads, AI output, library art without stroke data)

Runs in a worker:
grayscale → optional background removal → adaptive threshold → small-blob removal → **Zhang-Suen skeleton** →
trace the skeleton graph into polylines (split at junctions) → Ramer-Douglas-Peucker simplify → drop tiny strokes →
**order** them (greedy nearest neighbour, starting top-left and biasing towards long strokes) → resample to
even point spacing.
Library SVGs use their own path order (author it in the drawing tool) and skip the skeleton step.
Text: the glyph outlines from `opentype.js` are the strokes. Offer one or two **single-line handwriting fonts** for
the real "hand writes it" look.

### 3. Export

Phase 1 runs in the browser worker: for `frame in 0..N`, run `renderFrame` → `VideoFrame` → encoder. Narration clips
and music are mixed in an `OfflineAudioContext`, with ducking under narration. Mediabunny writes the MP4.
Progress and cancel go to the UI. **Limit:** the tab must stay open. That's fine for own use, and it's why Phase 2
adds a server render.
Phase 2 runs the same `engine/` bundle in headless Chromium (Playwright) on a worker box, behind a job queue, and
saves to Storage. It needs no new rendering code.

### 4. Narration auto-sync (the gap the recon found in the original)

Each scene has its own narration text, and TTS runs per scene. A scene with `durationMs: 'auto'` lasts
`max(narration + 0.5s, end of last element animation)`. Optionally, element draw durations are stretched to fill the
narration. Their tool syncs audio by hand; doing it per scene costs almost nothing extra and is a real selling point.

## Milestones

| # | milestone | done when | rough size |
| --- | --- | --- | --- |
| M0 | **Spike: prove the effect** | One hand-ordered SVG and one uploaded PNG draw on with a hand, scrubbable, and a 10 s 1080p MP4 downloads | 3–4 days |
| M1 | Editor core | Dashboard, new project with ratio, scenes (add/reorder/duplicate/delete), place/move/scale/rotate, library panel, animation + timing panel, preview player, autosave, undo | ~1.5 weeks |
| M2 | Uploads → sketch | Drop an image, convert it, adjust threshold/stroke order, then place it | 3–4 days |
| M3 | Audio | `/tts` server route, per-scene narration, auto-sync, uploaded voice, music + volume + ducking, all in the export | ~1 week |
| M4 | Look & finish | Boards (white/black/green/paper), transitions, 2–3 hands, text with fonts, 3–5 starter templates, export at 1080p, 2K and 4K | ~1 week |
| M5 | AI doodle | `/ai/doodle` route, style presets, 2–4 variations, then the stroke pipeline | 3–5 days |
| — | **Usable for your own channel** | after M4 (M5 is a bonus) | ~5–6 weeks total |
| P2 | Sell it | Supabase auth (email + Google + reset), cloud projects/assets, server render queue, credit ledger, Stripe plans, gating + paywall, landing page | ~4–6 weeks |

M0 is the go/no-go. If the reveal plus the hand doesn't look good on real art, nothing else matters.

### M0 result (2026-10-20): go

Built and checked in desktop Chrome: three library SVGs and an uploaded PNG draw on in sequence with the hand on the
pen tip. Draw, fade, pop, wipe, slide and none all work, plus scrubbing and a stroke-order overlay. A 6.9 s 720p MP4
exported in 8.4 s; ffmpeg reads it as H.264 High, 30 fps. Image → strokes took about 0.1 s for an 800×500 image.
17 unit tests cover the timeline, the pen path and the tracer. Known gaps to fix in M1/M2:

- Small solid dots (eyes, full stops) are shorter than the minimum stroke length, so they only appear in the
  final fade-in.
- During drawing, a coloured fill shows only as a band along the brush; the whole fill fades in at the end. That's
  fine for doodles, but consider a quick fill sweep after the outline.
- Uploads have near-white made transparent. That should become the recon's "white fill" toggle.
- The hand is a placeholder drawing; real photographed hands come in M4.
- Export runs on the main thread; move it into a worker in M1 so the editor stays responsive.

### Editor port (2026-10-21)

The owner supplied **Chalkline Studio.html**, a single-file InstaDoodle-style editor, and asked for the app to match
it fully. Ported to the React/TS app on top of the M0 engine. This covers most of M1–M4 early:
library (8 characters, 24 props, colour toggle, search, tag filter), uploads with an "as uploaded / turned into a
sketch" choice, AI doodles and AI voiceover lines (Claude via `server/aiPlugin.ts`), text with 5 handwriting
fonts, layers, direct manipulation with snap guides, undo/redo, multi-slide timeline with thumbnails and slide
menu, transitions, slide speed/pause/voice sync, voiceover upload or browser TTS (preview only), music with
ducking, 4 ratios, 5 boards, projects in IndexedDB (audio and images included), dashboard, tutorial, shortcuts,
dark mode. Kept from our engine instead of Chalkline's: brush-mask reveal, traced uploads, 24 hands, frame-exact
MP4 export with AAC audio (Chalkline recorded in real time with MediaRecorder).

Photo hands: 3 of 24 generated with an image model before the free plan's daily image limit; the other 21
stay illustrated until generated. `services/photoHand.ts` cuts out the white background, finds the pen tip and
extends the forearm along its direction at load time, so new photos just need adding to `public/hands/photo`.

## Assets you need (no code can stand in for these)

- **Library art:** start from CC0/MIT sets (e.g. Open Doodles, Tabler Icons), then add your own drawings or AI-made
  ones. Record every source and licence in `public/library/LICENSES.md`. That matters once you sell it.
- **Hands:** 2–3 photographed or drawn hands as transparent PNGs, with a measured pen tip.
- **Music:** a royalty-free set whose licence allows both your YouTube use and redistributing it inside a product.
  Those are often different licences.
- **Voices:** choose the TTS provider after reading its commercial and resale terms for Phase 2.

## Open questions (they don't block M0)

1. TypeScript switch: yes or no?
2. TTS provider. A 10-minute voice test with your own script decides it.
3. Product name and brand. It must not use "Doodle AI" / "DoodleAI" (their mark, per the recon).
4. Is a desktop Chrome-only export acceptable for Phase 1?

## Not doing (for now)

AI Wizard (script → full project), InMotion (video → sketch), image editor tools (draw/fill/crop/recolor), custom font
upload, the YouTube upload integration, and everything in the recon's "skip" rows.

# Ai Doodle

A whiteboard video maker: doodles, text and uploaded images draw on with a hand, slide by slide, then export to
MP4 (with voiceover, music and a marker sound) in the browser. Plan and research:
[replica/architecture.md](replica/architecture.md), [replica/recon.md](replica/recon.md).

The editor is a port of the Chalkline Studio prototype in the Ai Doodle purple theme:
Doodles / Text / Layers on the left, the board in the centre, Properties / Project on the right, slides along the bottom.

```sh
npm install
cp .env.example .env.local   # optional: GEMINI_API_KEY for "Generate with AI" / "Write it with AI"
npm run dev                  # http://localhost:5173  (login screens: /login, /forgot-password)
npm test
npm run typecheck
npm run build
```

New project flow: a template gallery (9 templates and 3 sample projects, any of 4 sizes). Soundtrack: upload or
pick from 6 original tracks generated in the browser. Text: 31 built-in fonts (including Chinese, Hindi, and
right-to-left Urdu and Arabic) with search, loaded as you scroll, plus your own uploaded fonts. AI: element, character or background. DoodleAI 1.0 draws vector line art in 10 styles; DoodleAI 2.0
makes pictures in 17 styles (3D Pixar, realistic, watercolour, Mixed...) with Google's image models and traces
them so the hand draws them. Fast or detailed, 4 variations, and a recently generated list. Export: 720p, 1080p, 2K and 4K, each with Render, Play and Download.

What works: 8 characters, 24 props and 20 decorations (line or colour), plus a clipart library (63 items in 12
categories so far, loaded on demand), uploads traced into strokes (as uploaded or turned into a
sketch), AI doodles, text written stroke by stroke, layers, drag / resize / rotate with snap guides, undo/redo,
slides with transitions (fade, wipe, push, iris), drawing speed, pause, voice-synced slides, voiceover (upload, or
browser voice for preview), background music with ducking, 4 sizes (16:9, 9:16, 1:1, 4:5), 5 boards, 25 hands
in 4 groups (5 photo-real so far) or no hand, per slide if you like, a marker drawing sound, projects saved in this browser, and MP4 export at
720p to 4K (desktop Chrome or Edge).

Layout:

- `src/engine/`: pure renderer, timeline, boards, text layout; used by preview, thumbnails and export.
- `src/pipeline/`: image → ordered strokes, in a worker.
- `src/audio/`: drawing sound and the soundtrack mix.
- `src/export/`: WebCodecs + Mediabunny MP4 export.
- `src/editor/`: the editor UI. `src/auth/`: login screens (UI only until Phase 2).
- `src/library/doodles.ts`: the built-in doodles. `src/library/manifest.ts`: the clipart library.
  `src/hands/`: hand catalogue, illustrated hand art.
- `server/aiPlugin.ts`: dev-server AI routes; the API key stays on the server.
- `scripts/hands/prepare-hands.mjs`: turns generated hand photos (`assets/hands/masters/<id>.png`, not in git)
  into `public/hands/` (2048 WebP + PNG, thumbnails, `hands.json`) with a review sheet in `assets/hands/_review/`.
  Hand list and per-hand tweaks: `scripts/hands/hands.src.json`.
- `scripts/library/build-library.mjs`: validates and builds the clipart in `scripts/library/items/` into
  `public/library/` (one JSON per item, thumbnails, `manifest.json`) and contact sheets in `assets/library/_review/`.
- Both scripts need Chrome (they run in headless Chrome via playwright-core). Record every artwork source in
  `public/library/LICENSES.md`.

`src/components/`, `src/utils/` and `src/index.css` belong to a separate sketch-game app that an Antigravity
session built in this folder. The video maker doesn't use them. The game's entry files (`src/App.jsx`,
`src/main.jsx`) were deleted by mistake on 2026-10-20 and haven't been restored yet.

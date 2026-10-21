# Ai Doodle

A whiteboard video maker: doodles, text and uploaded images draw on with a hand, slide by slide, then export to
MP4 (with voiceover, music and a marker sound) in the browser. Plan and research:
[replica/architecture.md](replica/architecture.md), [replica/recon.md](replica/recon.md).

The editor is a port of the Chalkline Studio prototype in the Ai Doodle purple theme:
Doodles / Text / Layers on the left, the board in the centre, Properties / Project on the right, slides along the bottom.

```sh
npm install
cp .env.example .env         # GEMINI_API_KEY and APP_SECRET (server only, never sent to the browser)
npm run dev                  # http://localhost:5173  (login screens: /login, /forgot-password)
npm test
npm run typecheck
npm run build && npm start   # production: Express serves dist/, the AI API and /media on :8787
```

ffmpeg must be installed on the server (voices are encoded to MP3, music is looped, normalised and
encoded with it). All AI runs on Google AI (Gemini API); see "AI" below.

New project flow: a template gallery (9 templates and 3 sample projects, any of 4 sizes). Soundtrack: upload or
pick from 6 original tracks generated in the browser. Text: 31 built-in fonts (including Chinese, Hindi, and
right-to-left Urdu and Arabic) with search, loaded as you scroll, plus your own uploaded fonts. AI (Google AI only): Generate with AI makes elements, characters and scenes in 8 styles (the two doodle
styles are drawn stroke by stroke; the others are pictures with the background removed), with 4 variations
and reusable characters in new poses. The Story wizard turns a title into a narrated video (storyboard,
visuals, Google AI voices, music). Background music is generated with Lyria and fitted to the video. Export: 720p, 1080p, 2K and 4K, each with Render, Play and Download.

What works: 8 characters, 24 props and 20 decorations (line or colour), plus a clipart library (63 items in 12
categories so far, loaded on demand), uploads traced into strokes (as uploaded or turned into a
sketch), AI doodles, text written stroke by stroke, layers, drag / resize / rotate with snap guides, undo/redo,
slides with transitions (fade, wipe, push, iris), drawing speed, pause, voice-synced slides, voiceover (upload, or a Google AI
voice in English, Urdu, Hindi or Arabic), background music with mood sections, ducking and refit, 4 sizes (16:9, 9:16, 1:1, 4:5), 5 boards, 25 hands
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
- `server/api/`: the AI API (story, slide, element, tts, voices, music), shared by the Vite dev server
  (`server/aiPlugin.ts`) and the production server (`server/index.ts`). zod-validated, rate-limited per IP,
  retries 429/5xx, falls back across Google models when one runs out of daily quota, and never logs keys or
  user text. Generated files go to `media/<projectId>/`. Only pages served by the app can call it (signed
  session cookie, `APP_SECRET`).
- `scripts/ai/`: one-off generators: `check-languages.mjs` (writes the language support table),
  `voice-previews.mjs` (the ▶ preview per voice) and `style-thumbs.mjs` (Generate-with-AI style samples).
- `MUSIC_NOTES.md`: Lyria models, limits, pricing and commercial-use notes.

## AI and free Google keys

| Feature | Model (`server/api/gemini.ts`, `music.ts`) | Free key |
| --- | --- | --- |
| Story and slide writing | `gemini-3.8-flash` → 3.7 / 3.6 / 3.5 Flash | yes (daily limit per model) |
| Doodle drawings, other text | `gemini-3.5-flash-lite` → other Flash models | yes |
| Pictures (3D, flat, watercolour, charcoal, photo, anime) | `gemini-nano-banana-2.1` | **no**: needs billing |
| Voices | `gemini-3.8-flash-tts` → lite / 3.1 / 2.5 TTS | yes, about 10 lines a day per model |
| Music | `lyria-realtime-exp` (Lyria RealTime) | yes |

A free key is enough to try everything except pictures, but a full story uses one voice line per slide, so
expect one 3-minute story a day on the free tier. Generated speech and story drawings are cached in
`media/_cache`, so rebuilding a story after small edits only pays for what changed.
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

## Deploying (Vercel)

Live at https://ai-doodle.vercel.app (project `ai-doodle`), behind an access password.

```sh
npm run build                 # typecheck, vite build, and bundle the API (api/) and proxy (proxy.js)
vercel deploy --prod
```

- `api/[...path].mjs` (+ `api/ai/`, `api/music/`): the same API as `server/api`, bundled by `npm run build:api`
  (Vercel catch-alls only match one path level, hence the two small re-exports). 300 s limit per request:
  long AI calls stop at 285 s with a "try again" message.
- `proxy.js` (from `server/proxy.ts`): runs before every page, file and API call and shows the password form
  until `ACCESS_PASSWORD` is entered. Changing the password signs everyone out.
- Generated voices, music and pictures go to the Vercel Blob store `ai-doodle-media` (public files with
  unguessable names); caches too. Locally they go to `media/`.
- Production environment variables (Vercel → Settings → Environment Variables): `GEMINI_API_KEY`,
  `APP_SECRET`, `ACCESS_PASSWORD`, `BLOB_READ_WRITE_TOKEN` (added by the Blob store). Redeploy after changing one.
- ffmpeg comes from `ffmpeg-static` on Vercel.

# Background music: Google AI notes

Checked 2026-10-21 against ai.google.dev and this project's Gemini API key.

## Models

| Model ID | How | Length per call | Output | Price | Free tier (this key) |
| --- | --- | --- | --- | --- | --- |
| `lyria-realtime-exp` (Lyria RealTime) | WebSocket stream, `BidiGenerateMusic` | Streams for as long as the session stays open (real time) | Raw 16-bit PCM, 48 kHz, stereo | Not listed on the pricing page | **Works** (tested: 10 s of audio in 12 s) |
| `lyria-3-clip-preview` | Interactions API, one request | Always 30 s | MP3 (44.1 kHz stereo) | $0.04 per 30 s clip | No (0 requests per day) |
| `lyria-3.5` / `lyria-3-pro-preview` | Interactions API, one request | "A couple of minutes" (full song) | MP3, or WAV via `response_format` | $0.08 per song | No (0 requests per day) |

The app uses **Lyria RealTime** by default because it works on a free key. It also has real
controls for background music: `bpm` (60–200), `density`, `brightness`, `scale`, `mute_drums`,
`mute_bass`, `seed`, `temperature`, `guidance`. Set `GOOGLE_MUSIC_MODEL=lyria-3-clip-preview` to use the 30-second
clip model instead once the key has billing.

## What the docs say

- **Vocals:** Lyria RealTime generates instrumental music (its `VOCALIZATION` mode adds vocal-like
  sounds; the app never uses it). Lyria 3 can sing, so the prompt always says "Instrumental only,
  no vocals, no lyrics".
- **Negative prompts:** no dedicated field on either API. RealTime takes several *weighted
  prompts*; the app sends the "avoid" list as a prompt with a negative weight, and states it in
  the text prompt for Lyria 3.
- **Seed:** RealTime has `seed` (0–2,147,483,647). Lyria 3 has no seed: results vary per call.
- **Watermark:** all generated audio carries an imperceptible SynthID watermark.
- **Safety:** prompts naming specific artists or copyrighted lyrics are blocked or filtered
  (RealTime reports this in `filtered_prompt`).
- **Prompt guidance:** be specific about instruments, BPM, key, mood and structure.

## Commercial use (YouTube)

- [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms): Google "won't claim
  ownership" of generated content; you're responsible for how it's used. Google may generate
  similar content for others, so the same track isn't exclusive to you.
- **Free (unpaid) tier:** Google may use prompts and outputs to improve its products, and human
  reviewers may read them. Don't send private information while on the free tier.
- **YouTube:** the Gemini API terms don't mention YouTube. Monetisation follows the [YouTube Partner
  Program policies](https://support.google.com/youtube/answer/1311392) (including the
  "inauthentic content" rule) and YouTube's AI-content disclosure rules. Because the music is
  SynthID-watermarked, YouTube can identify it as AI-generated. Check those pages before
  monetising; this file isn't legal advice.

## Pages used

- https://ai.google.dev/gemini-api/docs/music-generation
- https://ai.google.dev/gemini-api/docs/realtime-music-generation
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/terms
- https://www.techcrunch.com/2026/02/18/google-adds-music-generation-capabilities-to-the-gemini-app/ (SynthID on Lyria 3)

No Vertex AI setup is needed: Lyria RealTime and Lyria 3 both run on the Gemini API key.

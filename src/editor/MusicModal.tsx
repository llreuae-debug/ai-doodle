import { Check, ChevronDown, ChevronUp, FlaskConical, LoaderCircle, Music2, Pause, Play, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Timeline } from '../engine/timeline';
import type { Mood, Music, Project } from '../model/types';
import { AiError, fetchMedia, generateMusic, type MusicResult } from '../services/ai';
import { formatClock, MOOD_COLORS, MOOD_LABELS, moodSections, MUSIC_STYLE_LABELS, MUSIC_TAIL_SEC, musicFromResult } from '../services/music';
import { Modal } from './modals';

/** Instruments per style (matches server/api/music.ts), plus a few extras to add. */
const STYLE_INSTRUMENTS: Record<string, string[]> = {
  'calm-piano': ['piano'],
  'acoustic-guitar': ['acoustic guitar'],
  'warm-strings': ['strings', 'cello'],
  'lofi-gentle': ['electric piano', 'soft bass'],
  'ambient-pads': ['synth pads'],
  'playful-kids': ['marimba', 'ukulele', 'light claps'],
  'inspiring-cinematic': ['piano', 'strings', 'soft horns'],
  'corporate-light': ['piano', 'plucked guitar', 'soft synth'],
  'eastern-ambient': ['bansuri flute', 'santoor', 'tanpura drone'],
  'humming-pad': [],
};
const EXTRA_INSTRUMENTS = ['piano', 'strings', 'harp', 'flute', 'acoustic guitar', 'bells', 'cello'];
const MOOD_BPM: Record<Mood, number> = { calm: 66, happy: 95, tense: 75, sad: 60, exciting: 105 };
const INTENSITIES: ['very-soft' | 'soft' | 'medium', string][] = [
  ['very-soft', 'Very soft'],
  ['soft', 'Soft'],
  ['medium', 'Medium'],
];
const CREDITS_PER_MIN = 3;
const VARIATIONS = 2;

type Mode = 'whole' | 'by-section';

/** A waveform from the decoded audio's peaks, with the mood sections drawn underneath. */
function Waveform({ blob, sections, totalSec, progress }: { blob: Blob; sections: MusicResult['sections']; totalSec: number; progress: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  useEffect(() => {
    let alive = true;
    const ctx = new OfflineAudioContext(1, 1, 44100);
    void blob
      .arrayBuffer()
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => {
        const data = buf.getChannelData(0);
        const n = 400;
        const out = new Float32Array(n);
        const step = Math.floor(data.length / n);
        for (let i = 0; i < n; i++) {
          let m = 0;
          for (let j = i * step; j < (i + 1) * step; j += 16) m = Math.max(m, Math.abs(data[j]));
          out[i] = m;
        }
        if (alive) setPeaks(out);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [blob]);
  useEffect(() => {
    const c = ref.current;
    if (!c || !peaks) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth * dpr;
    const h = c.clientHeight * dpr;
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    const wave = h - 12 * dpr;
    const accent = getComputedStyle(c).getPropertyValue('--accent').trim() || '#7f56d9';
    const max = Math.max(...peaks, 0.01);
    peaks.forEach((p, i) => {
      const x = (i / peaks.length) * w;
      const ph = Math.max(1, (p / max) * wave * 0.95);
      g.fillStyle = i / peaks.length < progress ? accent : '#C9C3DA';
      g.fillRect(x, (wave - ph) / 2, Math.max(1, (w / peaks.length) * 0.7), ph);
    });
    for (const s of sections) {
      g.fillStyle = MOOD_COLORS[s.mood];
      g.fillRect((s.fromSec / totalSec) * w, h - 8 * dpr, ((s.toSec - s.fromSec) / totalSec) * w - 2 * dpr, 8 * dpr);
    }
  }, [peaks, sections, totalSec, progress]);
  return <canvas ref={ref} className="wave" />;
}

interface Variant {
  result: MusicResult;
  blob: Blob;
  url: string;
}

export function MusicModal(props: {
  project: Project;
  timeline: Timeline;
  credits: number;
  onSpend: (n: number) => void;
  onClose: () => void;
  onUse: (music: Music) => void;
}) {
  const prev = props.project.music?.ai;
  const sections = useMemo(() => moodSections(props.project, props.timeline), [props.project, props.timeline]);
  const videoSec = props.timeline.duration / 1000;
  const [style, setStyle] = useState(prev?.style ?? (props.project.story?.type.startsWith('faith') ? 'humming-pad' : 'calm-piano'));
  const [mode, setMode] = useState<Mode>(prev?.mode ?? (sections.length > 1 ? 'by-section' : 'whole'));
  const [mood, setMood] = useState<Mood>(prev?.sections[0]?.mood ?? sections[0]?.mood ?? 'calm');
  const [extra, setExtra] = useState(prev?.extra ?? '');
  const [tempo, setTempo] = useState<number | null>(prev?.tempo ?? null);
  const [intensity, setIntensity] = useState<'very-soft' | 'soft' | 'medium'>(prev?.intensity ?? 'soft');
  const [instruments, setInstruments] = useState<string[]>(prev?.instruments ?? []);
  const [noDrums, setNoDrums] = useState(prev?.noPercussion ?? true);
  const [open, setOpen] = useState<'style' | 'mode' | null>(null);
  const [busy, setBusy] = useState<number[]>([]);
  const [variants, setVariants] = useState<(Variant | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(
    () => () => {
      audio.current?.pause();
    },
    [],
  );
  useEffect(() => () => variants.forEach((v) => v && URL.revokeObjectURL(v.url)), [variants]);

  const minutes = Math.max(1, Math.ceil((videoSec + MUSIC_TAIL_SEC) / 60));
  const cost = minutes * CREDITS_PER_MIN;
  const shownTempo = tempo ?? (mode === 'whole' ? MOOD_BPM[mood] : null);
  const styleInstruments = STYLE_INSTRUMENTS[style] ?? [];
  const chips = [...new Set([...styleInstruments, ...EXTRA_INSTRUMENTS])];
  const chosen = instruments.length ? instruments : styleInstruments;

  const request = (seed?: number) =>
    generateMusic({
      projectId: props.project.id,
      mode,
      totalSec: videoSec,
      sections: mode === 'whole' ? [{ fromSec: 0, toSec: videoSec, mood }] : sections.map(({ fromSec, toSec, mood: m }) => ({ fromSec, toSec, mood: m })),
      style,
      ...(tempo ? { tempo } : {}),
      intensity,
      instruments: chosen,
      noPercussion: noDrums,
      vocalsOff: true,
      extra,
      ...(seed !== undefined ? { seed } : {}),
    });

  const make = async () => {
    const r = await request();
    const blob = await fetchMedia(r.audioUrl);
    props.onSpend(cost);
    return { result: r, blob, url: URL.createObjectURL(blob) };
  };

  const go = async (slots: number[] = Array.from({ length: VARIATIONS }, (_, i) => i)) => {
    if (props.credits < cost * slots.length) return setError(`Music uses ${cost} credits per track here. You have ${props.credits}.`);
    audio.current?.pause();
    setPlaying(null);
    setOpen(null);
    setError(null);
    setBusy(slots);
    setVariants((v) => {
      const next = slots.length === VARIATIONS ? Array<Variant | null>(VARIATIONS).fill(null) : [...v];
      for (const s of slots) next[s] = null;
      return next;
    });
    await Promise.all(
      slots.map(async (slot) => {
        try {
          const v = await make();
          setVariants((list) => {
            const next = [...list];
            next[slot] = v;
            return next;
          });
        } catch (err) {
          setError(err instanceof AiError ? err.message : "Couldn't make the music right now. Try again.");
        } finally {
          setBusy((b) => b.filter((x) => x !== slot));
        }
      }),
    );
  };

  const toggle = (i: number) => {
    const v = variants[i];
    if (!v) return;
    audio.current?.pause();
    if (playing === i) return setPlaying(null);
    const a = new Audio(v.url);
    audio.current = a;
    a.ontimeupdate = () => setProgress(a.currentTime / (a.duration || 1));
    a.onended = () => setPlaying(null);
    setProgress(0);
    setPlaying(i);
    void a.play();
  };

  const use = async (v: Variant) => {
    props.onUse(
      await musicFromResult(
        v.result,
        { style, mode, tempo: tempo ?? undefined, intensity, instruments: chosen, noPercussion: noDrums, extra, fittedSec: videoSec },
        props.project.music,
      ),
    );
  };

  /** Slide numbers for a time range, for the section labels. */
  const slideLabel = (from: number, to: number) => {
    const s = sections.filter((x) => x.toSec > from + 0.01 && x.fromSec < to - 0.01);
    if (!s.length) return '';
    const a = s[0].slides[0];
    const b = s[s.length - 1].slides[1];
    return a === b ? `slide ${a}` : `slides ${a}–${b}`;
  };

  return (
    <Modal title="Generate music" subtitle="Slow background music made with Google AI to fit your video" icon={<Music2 size={22} />} size="xl" onClose={props.onClose}>
      <div className="gen-band">
        <div className="gen-bar">
          <div className="gen-menu-wrap">
            <button type="button" className="gen-kind" aria-expanded={open === 'style'} onClick={() => setOpen(open === 'style' ? null : 'style')}>
              <Music2 size={20} />
              <span>{MUSIC_STYLE_LABELS[style]}</span>
              {open === 'style' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {open === 'style' && (
              <div className="gen-menu" role="listbox" aria-label="Music style">
                {Object.entries(MUSIC_STYLE_LABELS).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={id === style}
                    onClick={() => {
                      setStyle(id);
                      setInstruments([]);
                      if (id === 'humming-pad') setNoDrums(true);
                      setOpen(null);
                    }}
                  >
                    <span>
                      <strong>{label}</strong>
                      <small>{(STYLE_INSTRUMENTS[id] ?? []).join(', ') || 'No instruments: soft vocal-like pads'}</small>
                    </span>
                    {id === style && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="gen-menu-wrap">
            <button type="button" className="gen-style" aria-expanded={open === 'mode'} onClick={() => setOpen(open === 'mode' ? null : 'mode')}>
              <span>{mode === 'whole' ? 'Whole video, one mood' : 'Follow the story'}</span>
              {open === 'mode' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {open === 'mode' && (
              <div className="gen-menu" role="listbox" aria-label="Mode">
                {(
                  [
                    ['whole', 'Whole video, one mood', 'One steady track'],
                    ['by-section', 'Follow the story (mood per section)', `${sections.length} section${sections.length === 1 ? '' : 's'} from your slide moods`],
                  ] as const
                ).map(([id, label, hint]) => (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={id === mode}
                    onClick={() => {
                      setMode(id);
                      setOpen(null);
                    }}
                  >
                    <span>
                      <strong>{label}</strong>
                      <small>{hint}</small>
                    </span>
                    {id === mode && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input className="gen-prompt" type="text" maxLength={120} aria-label="Extra words" placeholder="Extra words, e.g. rainy evening, hopeful ending" value={extra} onChange={(e) => setExtra(e.target.value)} />
          <button type="button" className="gen-go" onClick={() => void go()} disabled={busy.length > 0}>
            {busy.length ? <LoaderCircle size={20} className="spin" /> : <Sparkles size={20} />}
            Generate
          </button>
        </div>
        <div className="music-opts">
          {mode === 'whole' && (
            <label className="mo">
              <span>Mood</span>
              <select value={mood} onChange={(e) => setMood(e.target.value as Mood)}>
                {(Object.keys(MOOD_LABELS) as Mood[]).map((m) => (
                  <option key={m} value={m}>
                    {MOOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="mo">
            <span>Tempo {shownTempo ? `${shownTempo} BPM` : '(from each mood)'}</span>
            <input type="range" min={50} max={120} value={shownTempo ?? 80} onChange={(e) => setTempo(Number(e.target.value))} />
            {tempo !== null && (
              <button type="button" className="link" onClick={() => setTempo(null)}>
                Use mood default
              </button>
            )}
          </label>
          <div className="mo">
            <span>Intensity</span>
            <div className="pill-tabs">
              {INTENSITIES.map(([id, label]) => (
                <button key={id} type="button" aria-pressed={intensity === id} onClick={() => setIntensity(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="mo row-wrap">
            <span className="switch">
              <input type="checkbox" checked={noDrums} onChange={(e) => setNoDrums(e.target.checked)} aria-label="No drums" />
              <span />
            </span>
            No drums
          </label>
          {chips.length > 0 && style !== 'humming-pad' && (
            <div className="mo chips-row" role="group" aria-label="Instruments">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={chosen.includes(c)}
                  onClick={() => setInstruments(chosen.includes(c) ? chosen.filter((x) => x !== c) : [...chosen, c].slice(0, 6))}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <p className="note">
            Video is {formatClock(videoSec)} — music will be {formatClock(videoSec + MUSIC_TAIL_SEC)} with a gentle fade-out.
          </p>
        </div>
        {error && (
          <p className="err gen-err" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="gen-results">
        <svg className="gen-curves" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M80,0 C220,140 380,170 520,300" />
          <path d="M300,0 C380,120 420,200 440,300" />
          <path d="M700,0 C620,140 560,210 520,300" />
          <path d="M940,0 C780,160 640,220 600,300" />
        </svg>
        <div className="gen-section-h">
          <span className="gen-section-title tabbed">
            <FlaskConical size={20} />
            Results
          </span>
        </div>
        {variants.length === 0 && busy.length === 0 ? (
          <div className="gen-steps">
            <span>Step 1: Pick a style</span>
            <span>Step 2: Choose mood</span>
            <span>Step 3: Generate</span>
          </div>
        ) : (
          <div className="music-grid">
            {Array.from({ length: VARIATIONS }, (_, i) => {
              const v = variants[i];
              if (!v || busy.includes(i))
                return (
                  <div key={i} className="music-card skeleton">
                    <span className="wave" />
                    <span className="note">Composing… (about a minute)</span>
                  </div>
                );
              return (
                <div key={i} className="music-card">
                  <div className="row-wrap">
                    <button type="button" className="btn icon" aria-label={playing === i ? 'Pause' : 'Play'} onClick={() => toggle(i)}>
                      {playing === i ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <strong>Version {i + 1}</strong>
                    <span className="note">{formatClock(v.result.durationSec)}</span>
                  </div>
                  <Waveform blob={v.blob} sections={v.result.sections} totalSec={v.result.durationSec} progress={playing === i ? progress : 0} />
                  <div className="mood-legend">
                    {v.result.sections.map((s, k) => (
                      <span key={k} style={{ flexGrow: s.toSec - s.fromSec }}>
                        <i style={{ background: MOOD_COLORS[s.mood] }} />
                        {MOOD_LABELS[s.mood]} · {slideLabel(s.fromSec, s.toSec)}
                      </span>
                    ))}
                  </div>
                  <div className="row-wrap">
                    <button type="button" className="btn accent sm" onClick={() => void use(v)}>
                      <Check size={14} />
                      Use this track
                    </button>
                    <button type="button" className="btn sm" onClick={() => void go([i])} disabled={busy.length > 0}>
                      <RefreshCw size={14} />
                      Regenerate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="credits">
          Music uses {CREDITS_PER_MIN} credits per minute · {props.credits} credits left
        </p>
      </div>
    </Modal>
  );
}

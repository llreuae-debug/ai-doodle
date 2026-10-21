import { ArrowDown, ArrowLeft, ArrowRight, Check, GripVertical, LoaderCircle, Plus, RefreshCw, Sparkles, Trash, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BOARDS } from '../engine/boards';
import type { Resources } from '../engine/resources';
import { AI_STYLES } from '../library/aiStyles';
import { LIBRARY } from '../library/doodles';
import { loadLibraryManifest, type ManifestItem } from '../library/manifest';
import type { AspectRatio, BoardId, Hand, Project } from '../model/types';
import { AiError, rewriteSlide, writeStory, type Audience, type ElementStyle, type Language, type Storyboard, type StorySlide, type StoryType, type Tone } from '../services/ai';
import { formatClock, MUSIC_STYLE_LABELS } from '../services/music';
import { autoMusicStyle, buildStory, searchLibrary, verseTopics, type BuildResult, type BuildSettings, type Progress, type StageId } from '../services/storyBuilder';
import { Modal } from './modals';
import { LANGUAGE_LABELS, languageProblem, useVoices, VoicePicker } from './VoicePicker';

const LENGTHS: { id: 3 | 5 | 8; slides: string; words: string }[] = [
  { id: 3, slides: '22–26 slides', words: '420–480 words' },
  { id: 5, slides: '36–42 slides', words: '700–780 words' },
  { id: 8, slides: '56–65 slides', words: '1,120–1,250 words' },
];
const TYPES: [StoryType, string][] = [
  ['kids', 'Kids story'],
  ['explainer', 'Explainer'],
  ['faith-islamic', 'Faith story (Islamic)'],
  ['faith-christian', 'Faith story (Christian)'],
  ['business', 'Business / marketing'],
  ['motivational', 'Motivational'],
  ['true-life', 'True-life lesson'],
];
const AUDIENCES: [Audience, string][] = [
  ['kids-4-8', 'Kids 4–8'],
  ['kids-9-12', 'Kids 9–12'],
  ['teens', 'Teens'],
  ['adults', 'Adults'],
];
const TONES: [Tone, string][] = [
  ['warm', 'Warm'],
  ['funny', 'Funny'],
  ['inspiring', 'Inspiring'],
  ['calm', 'Calm'],
  ['dramatic', 'Dramatic'],
];
const RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:5'];
const STEPS = ['The idea', 'Look and voice', 'Script & storyboard', 'Build'];
const STAGES: [StageId, string][] = [
  ['visuals', 'Visuals'],
  ['voice', 'Voice'],
  ['music', 'Music'],
  ['slides', 'Slides'],
];
const WPM = 150;
const CREDITS_PER_MUSIC_MIN = 3;

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/** A slide's spoken length estimate, in seconds (narration pace plus a short pause). */
const slideSec = (s: StorySlide) => (wordCount(s.narration) / WPM) * 60 + 0.3;

function Choice<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="wiz-choices" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={v === value} className="chip" aria-pressed={v === value} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** Narration with [VERSE: …] placeholders highlighted for the user to fill in. */
function Narration({ text }: { text: string }) {
  const parts = text.split(/(\[VERSE:[^\]]*\])/gi);
  return (
    <>
      {parts.map((p, i) =>
        /^\[VERSE:/i.test(p) ? (
          <mark key={i} className="verse" title="Fill in a real verse here, or remove the placeholder">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function StoryWizard(props: { project: Project; hands: Hand[]; resources: Resources; credits: number; onSpend: (n: number) => void; onClose: () => void; onDone: (r: BuildResult, settings: BuildSettings) => void }) {
  const { catalog } = useVoices();
  const [step, setStep] = useState(0);
  // Step 1
  const [title, setTitle] = useState('');
  const [length, setLength] = useState<3 | 5 | 8>(3);
  const [type, setType] = useState<StoryType>('kids');
  const [audience, setAudience] = useState<Audience>('kids-4-8');
  const [tone, setTone] = useState<Tone>('warm');
  const [language, setLanguage] = useState<Language>('en');
  const [englishText, setEnglishText] = useState(false);
  const [include, setInclude] = useState('');
  // Step 2
  const [ratio, setRatio] = useState<AspectRatio>(props.project.aspectRatio);
  const [board, setBoard] = useState<BoardId>(props.project.board);
  const [handId, setHandId] = useState<string | null>(props.project.handId);
  const [style, setStyle] = useState<ElementStyle>('colour-doodle');
  const [voiceId, setVoiceId] = useState('');
  const [speed, setSpeed] = useState(1);
  const [music, setMusic] = useState('auto');
  const [noDrums, setNoDrums] = useState(true);
  const [precise, setPrecise] = useState(false);
  // Step 3
  const [sb, setSb] = useState<Storyboard | null>(null);
  const [scriptKey, setScriptKey] = useState('');
  const [writing, setWriting] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [library, setLibrary] = useState<ManifestItem[]>([]);
  // Step 4
  const [progress, setProgress] = useState<Progress | null>(null);
  const [building, setBuilding] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const faith = type.startsWith('faith');
  useEffect(() => {
    // Faith stories default to the voice-free humming pad with no drums; the user can change it.
    if (faith) {
      setMusic('humming-pad');
      setNoDrums(true);
    }
  }, [faith]);
  useEffect(() => {
    if (audience.startsWith('kids') && catalog && !voiceId) setVoiceId(catalog.defaults.storyteller);
  }, [audience, catalog, voiceId]);
  useEffect(() => void loadLibraryManifest().then(setLibrary), []);
  useEffect(() => () => abort.current?.abort(), []);

  const voice = voiceId || catalog?.defaults.storyteller || 'Sulafat';
  const langProblem = languageProblem(catalog, language);
  const request = { title: title.trim(), length, type, audience, tone, language, englishText, include: include.trim() };
  const requestKey = JSON.stringify(request);

  const generate = async (instruction?: string) => {
    setWriting(instruction ?? 'Writing your story…');
    setError(null);
    try {
      const r = await writeStory(instruction && sb ? { ...request, revise: { storyboard: sb, instruction } } : request);
      setSb(r.storyboard);
      setWarnings(r.warnings);
      setScriptKey(requestKey);
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Couldn't write the story right now. Try again.");
    } finally {
      setWriting(null);
    }
  };

  const goTo = (n: number) => {
    setError(null);
    setStep(n);
    if (n === 2 && (!sb || scriptKey !== requestKey) && !writing) void generate();
  };

  const updateSlide = (i: number, patch: Partial<StorySlide>) => setSb((b) => b && { ...b, slides: b.slides.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const renumber = (slides: StorySlide[]) => slides.map((s, i) => ({ ...s, n: i + 1 }));
  const removeSlide = (i: number) => setSb((b) => b && { ...b, slides: renumber(b.slides.filter((_, k) => k !== i)) });
  const insertAfter = (i: number) =>
    setSb((b) => {
      if (!b) return b;
      const blank: StorySlide = { n: i + 2, narration: '', speaker: 'narrator', on_screen_text: '', visuals: [{ type: 'element', ref: null, description: 'a lightbulb', position: 'center' }], transition: 'fade', mood: b.slides[i]?.mood ?? 'calm' };
      const slides = [...b.slides];
      slides.splice(i + 1, 0, blank);
      return { ...b, slides: renumber(slides) };
    });
  const move = (from: number, to: number) =>
    setSb((b) => {
      if (!b || from === to) return b;
      const slides = [...b.slides];
      const [x] = slides.splice(from, 1);
      slides.splice(to, 0, x);
      return { ...b, slides: renumber(slides) };
    });
  const regenSlide = async (i: number) => {
    if (!sb) return;
    setRowBusy(i);
    try {
      const r = await rewriteSlide({
        storyContext: { title: sb.title, logline: sb.logline, language, type, audience, tone, englishText, characters: sb.characters.map(({ id, name, look }) => ({ id, name, look })), previous: sb.slides[i - 1]?.narration, next: sb.slides[i + 1]?.narration },
        slide: sb.slides[i],
        instruction: 'Rewrite this slide so it reads better and moves the story forward.',
      });
      updateSlide(i, { ...r.slide, n: i + 1 });
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Couldn't rewrite that slide.");
    } finally {
      setRowBusy(null);
    }
  };

  // Live totals and the credits this build will use.
  const totals = useMemo(() => {
    if (!sb) return null;
    const words = sb.slides.reduce((a, s) => a + wordCount(s.narration), 0);
    const chars = sb.slides.reduce((a, s) => a + s.narration.length, 0);
    const sec = sb.slides.reduce((a, s) => a + slideSec(s), 0);
    const items = [...LIBRARY.filter((d) => !d.tags.includes('decor')), ...library];
    const toGenerate = new Set<string>();
    for (const s of sb.slides)
      for (const v of s.visuals) {
        if (v.type === 'character' && v.ref) toGenerate.add(`char:${v.ref}`);
        else if (v.type !== 'element' || !searchLibrary(v.description, items)) toGenerate.add(`${v.type}:${v.description.toLowerCase()}`);
      }
    const musicCredits = music === 'none' ? 0 : Math.ceil((sec + 2) / 60) * CREDITS_PER_MUSIC_MIN;
    const credits = toGenerate.size + sb.slides.length + musicCredits;
    return { words, chars, sec, visuals: toGenerate.size, credits };
  }, [sb, library, music]);

  const settings: BuildSettings = { ...request, ratio, board, handId, style, voiceId: voice, speed, music, noDrums, precise };

  const build = async () => {
    if (!sb || !totals) return;
    if (props.credits < totals.credits) return setError(`This build needs about ${totals.credits} credits. You have ${props.credits}.`);
    setStep(3);
    setBuilding(true);
    setError(null);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const r = await buildStory(sb, settings, props.resources, { signal: ctrl.signal, onProgress: setProgress });
      props.onSpend(totals.credits);
      props.onDone(r, settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBuilding(false);
    }
  };

  const canNext = [title.trim().length >= 2 && !langProblem, !!voice, !!sb && !writing && sb.slides.length > 0][step] ?? false;

  return (
    <Modal title="Story" subtitle="From a title to a full narrated video" icon={<Sparkles size={22} />} size="xl" onClose={building ? () => abort.current?.abort() : props.onClose}>
      <ol className="wiz-steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>
            <span>{i < step ? <Check size={14} /> : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="wiz-body">
          <label className="field">
            <span>Title</span>
            <input type="text" maxLength={120} value={title} placeholder="The Ant Who Saved Ramadan" onChange={(e) => setTitle(e.target.value)} autoFocus />
          </label>
          <div className="field">
            <span>Length</span>
            <div className="wiz-cards">
              {LENGTHS.map((l) => (
                <button key={l.id} type="button" className="wiz-card" aria-pressed={length === l.id} onClick={() => setLength(l.id)}>
                  <strong>{l.id} min</strong>
                  <span>{l.slides}</span>
                  <span>{l.words}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Story type</span>
            <Choice value={type} options={TYPES} onChange={setType} label="Story type" />
          </div>
          <div className="field">
            <span>Audience</span>
            <Choice value={audience} options={AUDIENCES} onChange={setAudience} label="Audience" />
          </div>
          <div className="field">
            <span>Tone</span>
            <Choice value={tone} options={TONES} onChange={setTone} label="Tone" />
          </div>
          <div className="field">
            <span>Language</span>
            <Choice
              value={language}
              options={(Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => [l, `${LANGUAGE_LABELS[l]}${languageProblem(catalog, l) ? ' (not supported)' : ''}`])}
              onChange={setLanguage}
              label="Language"
            />
            {language !== 'en' && (
              <label className="row-wrap">
                <input type="checkbox" checked={englishText} onChange={(e) => setEnglishText(e.target.checked)} />
                Also show English on-screen text
              </label>
            )}
            {langProblem && <p className="err">{langProblem}</p>}
          </div>
          <label className="field">
            <span>What must the story include? (optional)</span>
            <textarea className="ta" maxLength={300} value={include} onChange={(e) => setInclude(e.target.value)} placeholder="A lantern, sharing food with neighbours" />
          </label>
          {faith && <p className="note">Faith stories never show prophets, angels or holy figures, and never invent verses: Google AI marks [VERSE: topic] where one fits, for you to fill in.</p>}
        </div>
      )}

      {step === 1 && (
        <div className="wiz-body">
          <div className="field">
            <span>Video size</span>
            <Choice value={ratio} options={RATIOS.map((r) => [r, r])} onChange={setRatio} label="Video size" />
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Board</span>
              <select value={board} onChange={(e) => setBoard(e.target.value as BoardId)}>
                {(Object.keys(BOARDS) as BoardId[]).map((b) => (
                  <option key={b} value={b}>
                    {BOARDS[b].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Drawing hand</span>
              <select value={handId ?? ''} onChange={(e) => setHandId(e.target.value || null)}>
                <option value="">No Hand</option>
                {props.hands.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Visual style</span>
              <select value={style} onChange={(e) => setStyle(e.target.value as ElementStyle)}>
                {AI_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.vector ? '' : ' (picture)'}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Speed</span>
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                <option value={0.9}>0.9×</option>
                <option value={1}>1.0×</option>
                <option value={1.1}>1.1×</option>
              </select>
            </label>
            <label className="field">
              <span>Background music</span>
              <select value={music} onChange={(e) => setMusic(e.target.value)}>
                <option value="none">None</option>
                <option value="auto">Auto (Google AI, follow the story)</option>
                {Object.entries(MUSIC_STYLE_LABELS).map(([id, l]) => (
                  <option key={id} value={id}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row-wrap">
            <label className="row-wrap">
              <input type="checkbox" checked={noDrums} onChange={(e) => setNoDrums(e.target.checked)} disabled={music === 'none'} />
              No drums
            </label>
            <label className="row-wrap" title="Google AI listens back to each line and times every word. Slower; off by default.">
              <input type="checkbox" checked={precise} onChange={(e) => setPrecise(e.target.checked)} />
              Precise sync
            </label>
            {music === 'auto' && <span className="note">Auto picks {MUSIC_STYLE_LABELS[autoMusicStyle(type)]}.</span>}
          </div>
          <div className="field">
            <span>Narrator voice</span>
            <VoicePicker value={voice} onChange={setVoiceId} catalog={catalog} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wiz-body">
          {writing && (
            <p className="note">
              <LoaderCircle size={14} className="spin" /> {writing === 'Writing your story…' ? 'Google AI is writing your story (about a minute)…' : `Reworking: ${writing}…`}
            </p>
          )}
          {sb && totals && (
            <>
              <div className="wiz-head">
                <div>
                  <h3>{sb.title}</h3>
                  <p className="note">{sb.logline}</p>
                </div>
                <div className="wiz-actions">
                  <button type="button" className="btn sm" disabled={!!writing} onClick={() => void generate()}>
                    <RefreshCw size={14} />
                    Regenerate whole script
                  </button>
                  {['Make it funnier', 'Simpler words', 'Shorter'].map((t) => (
                    <button key={t} type="button" className="btn sm" disabled={!!writing} onClick={() => void generate(t === 'Shorter' ? 'Shorter: tighten every line toward the low end of the word range' : t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <p className="wiz-totals">
                {sb.slides.length} slides · {totals.words} words · about {formatClock(totals.sec)} · Narration: {totals.chars.toLocaleString()} characters ≈ {formatClock((totals.words / WPM) * 60)} of speech · this build uses about {totals.credits} credits
                ({totals.visuals} new visuals, {sb.slides.length} voice lines{music === 'none' ? '' : ', music'})
              </p>
              {warnings.length > 0 && <p className="note warn">Close but not exact: {warnings.join('; ')}.</p>}
              {sb.characters.length > 0 && (
                <p className="note">
                  Characters: {sb.characters.map((c) => `${c.name} (${c.look})`).join(' · ')}
                </p>
              )}
              <div className="sb-table" role="table" aria-label="Storyboard">
                <div className="sb-row sb-h" role="row">
                  <span>#</span>
                  <span>Speaker</span>
                  <span>Narration</span>
                  <span>On-screen text</span>
                  <span>Visuals</span>
                  <span>Sec</span>
                  <span />
                </div>
                {sb.slides.map((s, i) => (
                  <div
                    key={`${s.n}-${i}`}
                    className={`sb-row${verseTopics(s.narration).length ? ' has-verse' : ''}${drag === i ? ' dragging' : ''}`}
                    role="row"
                    draggable
                    onDragStart={() => setDrag(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (drag !== null) move(drag, i);
                      setDrag(null);
                    }}
                    onDragEnd={() => setDrag(null)}
                  >
                    <span className="sb-n">
                      <GripVertical size={14} aria-hidden="true" />
                      {s.n}
                    </span>
                    <select value={s.speaker} aria-label={`Slide ${s.n} speaker`} onChange={(e) => updateSlide(i, { speaker: e.target.value })}>
                      <option value="narrator">Narrator</option>
                      {sb.characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="sb-narr">
                      <textarea value={s.narration} aria-label={`Slide ${s.n} narration`} dir="auto" onChange={(e) => updateSlide(i, { narration: e.target.value })} />
                      {verseTopics(s.narration).length > 0 && (
                        <div className="sb-verse">
                          <Narration text={s.narration} />
                        </div>
                      )}
                    </div>
                    <input type="text" value={s.on_screen_text} dir="auto" aria-label={`Slide ${s.n} on-screen text`} onChange={(e) => updateSlide(i, { on_screen_text: e.target.value })} />
                    <div className="sb-vis">
                      {s.visuals.map((v, k) => (
                        <input
                          key={k}
                          type="text"
                          value={v.description}
                          title={`${v.type}${v.ref ? ` (${sb.characters.find((c) => c.id === v.ref)?.name ?? v.ref})` : ''}, ${v.position}`}
                          aria-label={`Slide ${s.n} visual ${k + 1}`}
                          onChange={(e) => updateSlide(i, { visuals: s.visuals.map((x, j) => (j === k ? { ...x, description: e.target.value } : x)) })}
                        />
                      ))}
                    </div>
                    <span className="sb-sec">{slideSec(s).toFixed(1)}</span>
                    <span className="sb-act">
                      <button type="button" className="btn icon sm ghost" aria-label={`Regenerate slide ${s.n}`} title="Regenerate slide" disabled={rowBusy !== null} onClick={() => void regenSlide(i)}>
                        {rowBusy === i ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />}
                      </button>
                      <button type="button" className="btn icon sm ghost" aria-label={`Insert after slide ${s.n}`} title="Insert after" onClick={() => insertAfter(i)}>
                        <Plus size={14} />
                      </button>
                      <button type="button" className="btn icon sm ghost" aria-label={`Move slide ${s.n} down`} title="Move down" disabled={i === sb.slides.length - 1} onClick={() => move(i, i + 1)}>
                        <ArrowDown size={14} />
                      </button>
                      <button type="button" className="btn icon sm ghost" aria-label={`Delete slide ${s.n}`} title="Delete" onClick={() => removeSlide(i)}>
                        <Trash size={14} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="wiz-body">
          <ul className="build-list">
            {STAGES.map(([id, label]) => {
              const p = progress?.[id];
              const pct = p && p.total ? Math.round((p.done / p.total) * 100) : p && p.total === 0 ? 100 : 0;
              return (
                <li key={id}>
                  <span className="bl-label">{label}</span>
                  <span className="bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="bl-count">
                    {p ? (p.total ? `${p.done} / ${p.total}` : id === 'music' ? 'off' : '—') : '…'}
                    {p?.failed ? ` · ${p.failed} need attention` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="note">Up to 3 requests run at a time. You can cancel any time: finished slides are kept.</p>
        </div>
      )}

      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}

      <div className="wiz-nav">
        {step > 0 && step < 3 && (
          <button type="button" className="btn" onClick={() => goTo(step - 1)}>
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        <span className="grow" />
        {step < 2 && (
          <button type="button" className="btn accent" disabled={!canNext} onClick={() => goTo(step + 1)}>
            Next
            <ArrowRight size={16} />
          </button>
        )}
        {step === 2 && (
          <button type="button" className="btn ai" disabled={!canNext} onClick={() => void build()}>
            <Sparkles size={16} />
            Generate video
          </button>
        )}
        {step === 3 && building && (
          <button type="button" className="btn" onClick={() => abort.current?.abort()}>
            <X size={16} />
            Cancel
          </button>
        )}
      </div>
    </Modal>
  );
}

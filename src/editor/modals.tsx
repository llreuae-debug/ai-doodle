import { LoaderCircle, Mic, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { exampleProject } from '../library/templates';
import type { Project, Voice } from '../model/types';
import { AiError, fetchMedia, speakText, writeVoiceLine, type Language, type Tone } from '../services/ai';
import { sketchPreview } from '../services/loaders';
import { deleteProject, listProjects, loadProject, type ProjectSummary } from '../services/storage';
import { LANGUAGE_LABELS, languageProblem, useVoices, VoicePicker } from './VoicePicker';

// ---------- shell ----------

/** Dialog basics: focus moves inside when it opens and back to the opener when it closes; Escape closes it. */
export function useDialog(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const last = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus();
    return () => last?.focus?.();
  }, [ref]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

export function Modal(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  hero?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { title, subtitle, icon, size = 'md', hero, onClose, children, footer } = props;
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, onClose);
  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} ref={ref}>
        <div className={hero ? 'modal-h hero' : 'modal-h'}>
          {icon && <span className="mh-icon">{icon}</span>}
          <div className="mh-text">
            <div className="mh-title">{title}</div>
            {subtitle && <div className="mh-sub">{subtitle}</div>}
          </div>
          <button type="button" className="btn icon ghost" data-close aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

// ---------- upload ----------

export function UploadModal({ file, onClose, onAdd }: { file: File; onClose: () => void; onAdd: (src: Blob | string, name: string) => Promise<void> }) {
  const [original, setOriginal] = useState('');
  // A blob URL is an external resource: create it and revoke it with the effect's lifetime.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // oxlint-disable-next-line react/set-state-in-effect
    setOriginal(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const [sketch, setSketch] = useState<string | null>(null);
  const [pick, setPick] = useState<'orig' | 'sketch'>('orig');
  const [name, setName] = useState(file.name.replace(/\.[^.]+$/, ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    sketchPreview(file)
      .then((s) => alive && setSketch(s))
      .catch(() => alive && setSketch(null));
    return () => {
      alive = false;
    };
  }, [file]);

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      await onAdd(pick === 'sketch' && sketch ? sketch : file, (name.trim() || 'My image').slice(0, 40));
    } catch (err) {
      setError(`Couldn't add that image: ${errText(err)}`);
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Add your image"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" data-close onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn accent" onClick={add} disabled={busy}>
            {busy ? 'Tracing lines…' : 'Add to board'}
          </button>
        </>
      }
    >
      <div className="pickgrid">
        <button type="button" className="pick" aria-pressed={pick === 'orig'} onClick={() => setPick('orig')}>
          <span className="frame">{original && <img src={original} alt="Original" />}</span>
          <span className="note">As uploaded</span>
        </button>
        <button type="button" className="pick" aria-pressed={pick === 'sketch'} onClick={() => setPick('sketch')} disabled={!sketch}>
          <span className="frame">{sketch ? <img src={sketch} alt="Sketch version" /> : <span className="note">Making sketch…</span>}</span>
          <span className="note">Turned into a sketch</span>
        </button>
      </div>
      <label className="field">
        <span>Name</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <p className="note">Only upload images you own or have the rights to use.</p>
      {error && <p className="err">{error}</p>}
    </Modal>
  );
}

// ---------- voiceover ----------

const TONES: [Tone, string][] = [
  ['warm', 'Warm'],
  ['calm', 'Calm'],
  ['inspiring', 'Inspiring'],
  ['funny', 'Funny'],
  ['dramatic', 'Dramatic'],
];

/** One slide's narration with a Google AI voice. The result is an audio file, so it's in the MP4 export. */
export function VoiceModal(props: {
  slideNumber: number;
  initialText: string;
  initialVoice?: Voice['ai'];
  items: string;
  title: string;
  projectId: string;
  onClose: () => void;
  onUse: (voice: Voice) => void;
}) {
  const { catalog, error: catalogError } = useVoices();
  const [text, setText] = useState(props.initialText);
  const [voiceId, setVoiceId] = useState(props.initialVoice?.voiceId ?? '');
  const [language, setLanguage] = useState<Language>((props.initialVoice?.language as Language) ?? 'en');
  const [tone, setTone] = useState<Tone>('warm');
  const [speed, setSpeed] = useState(props.initialVoice?.speed ?? 1);
  const [precise, setPrecise] = useState(false);
  const [busy, setBusy] = useState<'write' | 'voice' | null>(null);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<{ voice: Voice; url: string } | null>(null);
  const voice = voiceId || catalog?.defaults.storyteller || '';
  const langProblem = languageProblem(catalog, language);

  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result]);

  const write = async () => {
    setBusy('write');
    setNote('Writing…');
    try {
      setText(await writeVoiceLine(props.items, props.title));
      setNote('');
    } catch (err) {
      setNote(err instanceof AiError ? err.message : "Couldn't write a line right now. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  const make = async () => {
    const words = text.trim();
    if (!words || !voice) return;
    setBusy('voice');
    setNote('Recording with Google AI…');
    try {
      const r = await speakText({ text: words, voice, language, style: tone, speed, precise, projectId: props.projectId });
      const blob = await fetchMedia(r.audioUrl);
      const v: Voice = {
        kind: 'file',
        name: `${catalog?.voices.find((x) => x.id === voice)?.name ?? voice} voice.${r.format}`,
        blob,
        durationMs: Math.round(r.durationSec * 1000),
        ai: { text: words, voiceId: voice, language, speed, words: r.words },
      };
      setResult({ voice: v, url: URL.createObjectURL(blob) });
      setNote(`${r.durationSec.toFixed(1)} s · word timing ${r.timing === 'precise' ? 'measured by Google AI' : 'estimated'}`);
    } catch (err) {
      setNote(err instanceof AiError ? err.message : "Couldn't make the voice right now. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      title={`Generate voiceover · Slide ${props.slideNumber}`}
      subtitle="AI voice (Google)"
      size="lg"
      onClose={props.onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={() => void make()} disabled={!text.trim() || !voice || busy !== null || !!langProblem}>
            <Mic size={16} />
            {result ? 'Record again' : 'Make voice'}
          </button>
          <button type="button" className="btn accent" disabled={!result} onClick={() => result && props.onUse(result.voice)}>
            Use this voiceover
          </button>
        </>
      }
    >
      <label className="field">
        <span>What should the voice say?</span>
        <textarea className="ta" maxLength={1200} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="row-wrap">
        <button type="button" className="btn ai sm" onClick={() => void write()} disabled={busy !== null}>
          <Sparkles size={16} />
          Write it with AI
        </button>
        <span className="note">{text.length} / 1,200</span>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>Language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            {(Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABELS[l]}
                {languageProblem(catalog, l) ? ' (not supported)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Delivery</span>
          <select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
            {TONES.map(([t, l]) => (
              <option key={t} value={t}>
                {l}
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
      </div>
      {langProblem && <p className="err">{langProblem}</p>}
      <div className="field">
        <span>Voice</span>
        {catalogError ? <p className="err">{catalogError}</p> : <VoicePicker value={voice} onChange={setVoiceId} catalog={catalog} />}
      </div>
      <label className="row-wrap">
        <input type="checkbox" checked={precise} onChange={(e) => setPrecise(e.target.checked)} />
        <span>Precise sync: Google AI listens back and times every word (slower)</span>
      </label>
      {result && <audio className="voice-audio" src={result.url} controls />}
      {note && <p className="note">{busy === 'voice' && <LoaderCircle size={14} className="spin" />} {note}</p>}
    </Modal>
  );
}

// ---------- projects ----------

export function DashboardModal(props: { onClose: () => void; onOpen: (p: Project) => void; onNew: () => void; handId: string | null }) {
  const [rows, setRows] = useState<ProjectSummary[] | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then(setRows)
      .catch((err: unknown) => setError(`Couldn't read saved projects: ${errText(err)}`));
  }, []);

  const open = async (id: string) => {
    try {
      const p = await loadProject(id);
      if (p) props.onOpen(p);
    } catch (err) {
      setError(`Couldn't open that project: ${errText(err)}`);
    }
  };

  const remove = async (id: string) => {
    if (armed !== id) return setArmed(id);
    await deleteProject(id).catch((err: unknown) => setError(errText(err)));
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
  };

  return (
    <Modal
      title="Your projects"
      onClose={props.onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={props.onNew}>
            New project
          </button>
          <button type="button" className="btn accent" onClick={() => props.onOpen(exampleProject(props.handId))}>
            Open the example
          </button>
        </>
      }
    >
      <div className="projlist">
        {rows === null && !error && <p className="note">Loading…</p>}
        {rows?.length === 0 && (
          <div className="empty">
            <strong>No saved projects yet</strong>Press Save in the top bar to keep this project in this browser.
          </div>
        )}
        {rows?.map((r) => (
          <div className="projrow" key={r.id}>
            <div className="pn">
              <b>{r.name}</b>
              <small>
                {r.slides} {r.slides === 1 ? 'slide' : 'slides'} · saved {new Date(r.updatedAt).toLocaleString()}
              </small>
            </div>
            <button type="button" className="btn sm" onClick={() => void open(r.id)}>
              Open
            </button>
            <button type="button" className="btn sm" style={{ color: 'var(--danger)' }} onClick={() => void remove(r.id)}>
              {armed === r.id ? 'Delete for good?' : 'Delete'}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="err">{error}</p>}
      <p className="note">Projects are stored in this browser only, including uploaded images and audio.</p>
      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
        <a href="/how-it-works" style={{ color: 'var(--accent)' }}>How It Works</a>
        <a href="/blog" style={{ color: 'var(--accent)' }}>Blog</a>
        <a href="/about" style={{ color: 'var(--accent)' }}>About</a>
        <a href="/contact" style={{ color: 'var(--accent)' }}>Contact</a>
        <a href="/privacy-policy" style={{ color: 'var(--accent)' }}>Privacy</a>
      </div>
    </Modal>
  );
}

export function TutorialModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Make your first video" onClose={onClose}>
      <ol className="steps">
        <li>
          <b>Pick a size and board</b> in the Project tab: 16:9 for YouTube, 9:16 for Shorts and Reels.
        </li>
        <li>
          <b>Add doodles</b> from Characters or Props, or describe one and press Generate with AI. Turn on Color for filled versions.
        </li>
        <li>
          <b>Add text</b> from the Text tab. Each item draws in order; reorder them in Layers.
        </li>
        <li>
          <b>Time each slide</b> under Properties: drawing speed, pause at end, and transition.
        </li>
        <li>
          <b>Add a voiceover</b>, then switch on Sync slide with voice so the slide lasts as long as the narration.
        </li>
        <li>
          <b>Press play</b> to preview, then Export to render the video.
        </li>
      </ol>
      <p className="note">Shortcuts: Space plays, Delete removes the selected item, Ctrl+Z undoes, Ctrl+D duplicates, Ctrl+S saves, arrow keys nudge.</p>
      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
        <a href="/how-it-works" style={{ color: 'var(--accent)' }}>Read Step-by-Step Guide →</a>
        <a href="/blog" style={{ color: 'var(--accent)' }}>Browse Tutorials & Blog →</a>
      </div>
    </Modal>
  );
}

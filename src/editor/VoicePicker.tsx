import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { listVoices, type Language, type VoiceCatalog } from '../services/ai';

export const LANGUAGE_LABELS: Record<Language, string> = { en: 'English', ur: 'Urdu', hi: 'Hindi', ar: 'Arabic' };

const DEFAULT_LABELS: Record<keyof VoiceCatalog['defaults'], string> = {
  storyteller: 'Warm storyteller',
  kids: 'Bright, for kids',
  documentary: 'Calm documentary',
};

/** The voice catalogue, loaded once. */
export function useVoices(): { catalog: VoiceCatalog | null; error: string | null } {
  const [catalog, setCatalog] = useState<VoiceCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    listVoices()
      .then((c) => alive && setCatalog(c))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []);
  return { catalog, error };
}

/** "not supported" for languages Google AI voices can't speak, instead of failing silently. */
export const languageProblem = (catalog: VoiceCatalog | null, lang: Language): string | null => {
  const s = catalog?.langSupport[lang];
  if (!s) return null;
  return s.engine === 'gemini' ? null : `${LANGUAGE_LABELS[lang]} is not supported by Google AI voices yet.`;
};

/**
 * Google AI voices with ▶ previews. The three recommended voices come first, then the rest.
 * Previews that haven't been generated yet (scripts/ai/voice-previews.mjs) are greyed out.
 */
export function VoicePicker({ value, onChange, catalog }: { value: string; onChange: (id: string) => void; catalog: VoiceCatalog | null }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);

  if (!catalog) return <p className="note">Loading Google AI voices…</p>;
  const recommended = Object.entries(catalog.defaults) as [keyof VoiceCatalog['defaults'], string][];
  const recIds = new Set(recommended.map(([, id]) => id));
  const rest = catalog.voices.filter((v) => !recIds.has(v.id));

  const toggle = (id: string, url: string) => {
    audio.current?.pause();
    if (playing === id) return setPlaying(null);
    const a = new Audio(url);
    audio.current = a;
    a.onended = () => setPlaying(null);
    a.onerror = () => {
      setPlaying(null);
      setMissing((m) => new Set(m).add(id));
    };
    setPlaying(id);
    void a.play().catch(() => setPlaying(null));
  };

  const row = (id: string, label?: string) => {
    const v = catalog.voices.find((x) => x.id === id);
    if (!v) return null;
    const off = missing.has(id);
    return (
      <div key={id} className={value === id ? 'voice-row selected' : 'voice-row'}>
        <button type="button" className="btn icon sm" aria-label={`Preview ${v.name}`} title={off ? 'Preview not generated yet' : `Preview ${v.name}`} disabled={off} onClick={() => toggle(id, v.previewUrl)}>
          {playing === id ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
        </button>
        <button type="button" className="voice-pick" aria-pressed={value === id} onClick={() => onChange(id)}>
          <strong>{label ?? v.name}</strong>
          <span>
            {label ? `${v.name} · ` : ''}
            {v.gender} · {v.style_tags.join(', ')}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="voice-list" role="listbox" aria-label="Narrator voice">
      <div className="voice-group">Recommended</div>
      {recommended.map(([k, id]) => row(id, DEFAULT_LABELS[k]))}
      <div className="voice-group">All Google AI voices</div>
      {rest.map((v) => row(v.id))}
    </div>
  );
}

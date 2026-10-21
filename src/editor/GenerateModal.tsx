import { Check, ChevronDown, ChevronUp, FlaskConical, Hash, LoaderCircle, Plus, RefreshCw, Save, Sparkles, Star, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AI_STYLES, AI_TYPES, aiStyle, PROMPT_EXAMPLES, stylePreviewSvg, type AiStyle } from '../library/aiStyles';
import { doodleSvg, validStrokes, type DoodleDef } from '../library/doodles';
import { newId } from '../model/factories';
import type { CharacterSheet } from '../model/types';
import { AiError, fetchMedia, generateElements, type ElementResult, type ElementStyle, type ElementType } from '../services/ai';
import { Modal } from './modals';

const VARIATIONS = 4;
const PLACEHOLDER_MS = 3200;
const REFERENCE_PX = 512;

/** One result on screen: a drawing (strokes) or a picture (downloaded blob). */
type Shown =
  | { key: string; kind: 'vector'; def: DoodleDef; type: ElementType; style: ElementStyle; prompt: string }
  | { key: string; kind: 'image'; name: string; blob: Blob; url: string; type: ElementType; style: ElementStyle; prompt: string }
  | { key: string; kind: 'busy' };

function Svg({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Style thumbnail: the generated sample in public/assets/styles if it exists, else a drawn preview. */
function StyleThumb({ style, className }: { style: AiStyle; className: string }) {
  const [failed, setFailed] = useState(false);
  const svg = useMemo(() => stylePreviewSvg(style), [style]);
  if (failed) return <Svg html={svg} className={className} />;
  return (
    <span className={className}>
      <img src={`/assets/styles/${style.id}.png`} alt="" onError={() => setFailed(true)} />
    </span>
  );
}

/** Every stroke must build as a Path2D in this browser too, or the result is dropped. */
function toDef(r: Extract<ElementResult, { kind: 'vector' }>, type: ElementType, style: ElementStyle): DoodleDef | null {
  const ok = (d: string) => {
    try {
      new Path2D(d);
      return true;
    } catch {
      return false;
    }
  };
  const strokes = validStrokes(r.strokes).filter(ok);
  if (strokes.length < 3) return null;
  return { id: `ai-${newId()}`, cat: 'custom', name: r.name.slice(0, 32), tags: [type, style], strokes, fills: r.fills.filter((f) => ok(f.d)) };
}

/** A PNG of a result, sent with later prompts so the same character comes back in a new pose. */
async function referencePng(s: Exclude<Shown, { kind: 'busy' }>): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = REFERENCE_PX;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, REFERENCE_PX, REFERENCE_PX);
  const src = s.kind === 'vector' ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(doodleSvg(s.def, { color: s.def.fills.length > 0, ink: '#1B1B1B' }))}` : s.url;
  const img = new Image();
  img.src = src;
  await img.decode();
  const k = Math.min(REFERENCE_PX / img.naturalWidth, REFERENCE_PX / img.naturalHeight) || 1;
  const w = (img.naturalWidth || REFERENCE_PX) * k;
  const h = (img.naturalHeight || REFERENCE_PX) * k;
  g.drawImage(img, (REFERENCE_PX - w) / 2, (REFERENCE_PX - h) / 2, w, h);
  return canvas.toDataURL('image/png');
}

/** Closes a popover when the pointer goes down outside it. */
function useOutside(open: boolean, ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, ref, close]);
}

export function GenerateModal(props: {
  preset: 'characters' | 'props';
  credits: number;
  projectId: string;
  aspect: string;
  characters: CharacterSheet[];
  onClose: () => void;
  /** Uses credits for generated results. */
  onSpend: (n: number) => void;
  /** Adds a drawing to the board (and to Custom). Scenes fill the board, behind everything. */
  onAddVector: (def: DoodleDef, asScene: boolean) => void;
  /** Saves a drawing to Custom without placing it. */
  onSaveVector: (def: DoodleDef) => void;
  /** Traces a picture and adds it (place) or keeps it in Custom only. */
  onAddImage: (blob: Blob, name: string, opts: { place: boolean; asScene: boolean }) => Promise<void>;
  onSaveCharacter: (sheet: CharacterSheet) => void;
}) {
  const [type, setType] = useState<ElementType>(props.preset === 'characters' ? 'character' : 'element');
  const [styleId, setStyleId] = useState<ElementStyle>('doodle');
  const [typesOpen, setTypesOpen] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [example, setExample] = useState(0);
  const [variations, setVariations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<Shown[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [posing, setPosing] = useState<CharacterSheet | null>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  useOutside(typesOpen, typeRef, () => setTypesOpen(false));
  useOutside(stylesOpen, styleRef, () => setStylesOpen(false));
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  useEffect(() => {
    const t = setInterval(() => setExample((i) => (i + 1) % PROMPT_EXAMPLES.length), PLACEHOLDER_MS);
    return () => clearInterval(t);
  }, []);

  const style = aiStyle(styleId);
  const typeDef = AI_TYPES.find((t) => t.id === type)!;
  const busy = shown.some((s) => s.kind === 'busy');
  const count = variations ? VARIATIONS : 1;

  const toggleStyles = () => {
    if (stylesOpen) return setStylesOpen(false);
    const r = styleRef.current?.getBoundingClientRect();
    if (r) {
      const width = Math.min(560, window.innerWidth - 24);
      const top = r.bottom + 6;
      setPopPos({ top, left: Math.max(12, Math.min(r.left, window.innerWidth - width - 12)), maxHeight: Math.max(240, window.innerHeight - top - 12) });
    }
    setStylesOpen(true);
  };

  /** Results from the server as tiles; pictures are downloaded so they can be traced or reused. */
  const toShown = async (results: ElementResult[], t: ElementType, st: ElementStyle, p: string): Promise<Shown[]> => {
    const out: Shown[] = [];
    for (const r of results) {
      if (r.kind === 'vector') {
        const def = toDef(r, t, st);
        if (def) out.push({ key: def.id, kind: 'vector', def, type: t, style: st, prompt: p });
      } else {
        const blob = await fetchMedia(r.url);
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        out.push({ key: `img-${newId()}`, kind: 'image', name: r.name, blob, url, type: t, style: st, prompt: p });
      }
    }
    return out;
  };

  const request = async (n: 1 | 4, p: string) => {
    const reference = posing?.reference?.split(',')[1];
    const r = await generateElements({
      type,
      style: styleId,
      prompt: p,
      variations: n,
      aspect: props.aspect,
      projectId: props.projectId,
      ...(posing ? { characterSheet: { name: posing.name, look: posing.look, style: styleId, ...(reference ? { reference: { mimeType: 'image/png' as const, data: reference } } : {}) } } : {}),
    });
    const tiles = await toShown(r.results, type, styleId, p);
    props.onSpend(tiles.length);
    if (tiles.length === 0) throw new AiError('bad_drawing', 'The drawing came back unusable. Try a simpler description.');
    return { tiles, failed: r.failed + (r.results.length - tiles.length) };
  };

  const go = async () => {
    const p = prompt.trim();
    if (!p || busy) return;
    if (props.credits < count) return setError(`You need ${count} credit${count > 1 ? 's' : ''} for this. You have ${props.credits}.`);
    setStylesOpen(false);
    setTypesOpen(false);
    setError(null);
    setShown(Array.from({ length: count }, (_, i) => ({ key: `busy-${i}`, kind: 'busy' as const })));
    try {
      const { tiles, failed } = await request(count as 1 | 4, p);
      setShown(tiles);
      if (failed) setError(`${failed} of ${count} variations didn't work; the rest are below.`);
    } catch (err) {
      setShown([]);
      setError(err instanceof AiError ? err.message : 'Something went wrong. Try again.');
    }
  };

  /** Replaces one tile with a fresh version of the same request. */
  const regenerate = async (s: Exclude<Shown, { kind: 'busy' }>) => {
    if (props.credits < 1) return setError('You have no credits left.');
    setShown((list) => list.map((x) => (x.key === s.key ? { key: s.key, kind: 'busy' } : x)));
    try {
      const { tiles } = await request(1, s.prompt);
      setShown((list) => list.map((x) => (x.key === s.key ? tiles[0] : x)));
    } catch (err) {
      setShown((list) => list.map((x) => (x.key === s.key ? s : x)));
      setError(err instanceof AiError ? err.message : 'Something went wrong. Try again.');
    }
  };

  const saveSheet = async (s: Exclude<Shown, { kind: 'busy' }>): Promise<CharacterSheet> => {
    const sheet: CharacterSheet = {
      id: newId(),
      name: (s.kind === 'vector' ? s.def.name : s.name) || s.prompt.slice(0, 24),
      look: posing?.look ?? s.prompt,
      style: s.style,
      reference: await referencePng(s),
    };
    if (!posing) props.onSaveCharacter(sheet);
    return posing ?? sheet;
  };

  const add = async (s: Exclude<Shown, { kind: 'busy' }>, place: boolean) => {
    setWorking(s.key);
    try {
      if (s.type === 'character') await saveSheet(s);
      if (s.kind === 'vector') (place ? props.onAddVector(s.def, s.type === 'scene') : props.onSaveVector(s.def));
      else await props.onAddImage(s.blob, s.name, { place, asScene: s.type === 'scene' });
    } catch (err) {
      setError(`Couldn't add that: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setWorking(null);
    }
  };

  const pose = async (s: Exclude<Shown, { kind: 'busy' }>) => {
    const sheet = await saveSheet(s);
    setPosing(sheet);
    setType('character');
    setStyleId(sheet.style as ElementStyle);
    setPrompt('');
    setError(null);
  };

  const tile = (s: Shown) => {
    if (s.kind === 'busy') {
      return (
        <div key={s.key} className="gen-tile skeleton" aria-label="Generating…">
          <span className="gen-art" />
          <span className="gen-name">{style.vector ? 'Drawing…' : 'Painting…'}</span>
        </div>
      );
    }
    const name = s.kind === 'vector' ? s.def.name : s.name;
    return (
      <div key={s.key} className="gen-tile result">
        {s.kind === 'vector' ? (
          <Svg html={doodleSvg(s.def, { color: s.def.fills.length > 0, ink: '#1B1B1B' })} className="gen-art" />
        ) : (
          <span className="gen-art">
            <img src={s.url} alt="" />
          </span>
        )}
        <span className="gen-name">{working === s.key ? 'Adding…' : name}</span>
        <div className="gen-actions">
          <button type="button" className="btn sm accent" disabled={working !== null} onClick={() => void add(s, true)}>
            <Plus size={14} />
            Add to board
          </button>
          <button type="button" className="btn sm" disabled={working !== null} onClick={() => void add(s, false)}>
            <Save size={14} />
            Save to Custom
          </button>
          <button type="button" className="btn sm" disabled={working !== null || busy} onClick={() => void regenerate(s)}>
            <RefreshCw size={14} />
            Regenerate
          </button>
          {s.type === 'character' && (
            <button type="button" className="btn sm" disabled={working !== null} onClick={() => void pose(s)}>
              <UserRound size={14} />
              Use in another pose
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal title="Generate with AI" subtitle="Create unique assets with Ai Doodle AI" icon={<Star size={22} />} size="xl" onClose={props.onClose}>
      <div className="gen-band">
        <div className="gen-bar">
          <div className="gen-menu-wrap" ref={typeRef}>
            <button type="button" className="gen-kind" aria-haspopup="listbox" aria-expanded={typesOpen} onClick={() => setTypesOpen(!typesOpen)}>
              <Hash size={20} />
              <span>{typeDef.label}</span>
              {typesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {typesOpen && (
              <div className="gen-menu" role="listbox" aria-label="Type">
                {AI_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="option"
                    aria-selected={t.id === type}
                    onClick={() => {
                      setType(t.id);
                      setTypesOpen(false);
                      if (t.id !== 'character') setPosing(null);
                    }}
                  >
                    <span>
                      <strong>{t.label}</strong>
                      <small>{t.hint}</small>
                    </span>
                    {t.id === type && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="gen-menu-wrap" ref={styleRef}>
            <button type="button" className="gen-style" aria-haspopup="dialog" aria-expanded={stylesOpen} onClick={toggleStyles}>
              <StyleThumb style={style} className="gen-style-thumb" />
              <span>{style.name}</span>
              {stylesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {stylesOpen && (
              <div className="style-pop" role="dialog" aria-label="Choose style" style={popPos ?? undefined}>
                <div className="style-pop-h">
                  <Sparkles size={18} />
                  Choose Style
                </div>
                <div className="style-grid">
                  {AI_STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="style-tile"
                      aria-pressed={s.id === styleId}
                      onClick={() => {
                        setStyleId(s.id);
                        setStylesOpen(false);
                      }}
                    >
                      {s.tier === 'pro' && (
                        <span className="pro-badge left" title="Pro">
                          <Star size={11} fill="currentColor" strokeWidth={0} />
                        </span>
                      )}
                      {s.id === styleId && (
                        <span className="style-check">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      )}
                      <StyleThumb style={s} className="style-art" />
                      <span className="style-name">
                        {s.name}
                        <small>{s.vector ? 'Draws line by line' : 'Picture, revealed'}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <input
            className="gen-prompt"
            type="text"
            maxLength={500}
            aria-label="Describe what to make"
            placeholder={posing ? `New pose for ${posing.name}, e.g. waving hello` : PROMPT_EXAMPLES[example]}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void go()}
          />
          <button type="button" className="gen-go" onClick={() => void go()} disabled={!prompt.trim() || busy}>
            {busy ? <LoaderCircle size={20} className="spin" /> : <Sparkles size={20} />}
            Generate
          </button>
        </div>
        {error && (
          <p className="err gen-err" role="alert">
            {error}
          </p>
        )}
        {(posing || props.characters.length > 0) && (
          <div className="gen-chars">
            {posing ? (
              <span className="chip on">
                <UserRound size={14} />
                New pose of {posing.name}
                <button type="button" className="chip-x" aria-label="Stop posing" onClick={() => setPosing(null)}>
                  <X size={12} />
                </button>
              </span>
            ) : (
              <>
                <span className="note">Your characters:</span>
                {props.characters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="chip"
                    title={c.look}
                    onClick={() => {
                      setPosing(c);
                      setType('character');
                      setStyleId(c.style as ElementStyle);
                    }}
                  >
                    <img src={c.reference} alt="" />
                    {c.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="gen-results">
        <svg className="gen-curves" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M80,0 C220,140 380,170 520,300" />
          <path d="M300,0 C380,120 420,200 440,300" />
          <path d="M520,0 C500,120 470,220 480,300" />
          <path d="M700,0 C620,140 560,210 520,300" />
          <path d="M940,0 C780,160 640,220 600,300" />
        </svg>
        <div className="gen-section-h">
          <span className="gen-section-title tabbed">
            <FlaskConical size={20} />
            Results
          </span>
          <label className="snaplbl">
            <span className="switch">
              <input type="checkbox" checked={variations} onChange={(e) => setVariations(e.target.checked)} aria-label={`${VARIATIONS} variations`} />
              <span />
            </span>
            {VARIATIONS} variations
            <span className="hint" title={`Makes ${VARIATIONS} versions to pick from. Uses ${VARIATIONS} credits.`}>
              ?
            </span>
          </label>
        </div>
        {shown.length === 0 ? (
          <div className="gen-steps">
            <span>Step 1: Select</span>
            <span>Step 2: Write prompt</span>
            <span>Step 3: Generate</span>
          </div>
        ) : (
          <div className="gen-grid">{shown.map(tile)}</div>
        )}
        <p className="credits">{props.credits} credits left</p>
      </div>
    </Modal>
  );
}

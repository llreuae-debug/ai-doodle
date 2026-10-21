import { FlaskConical, HelpCircle, History, LoaderCircle, Plus, RefreshCw, Save, Sparkles, Star, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { doodleSvg, validStrokes, type DoodleDef } from '../library/doodles';
import { loadLibraryManifest, type ManifestItem } from '../library/manifest';
import { newId } from '../model/factories';
import type { CharacterSheet } from '../model/types';
import { AiError, fetchMedia, generateElements, type ElementResult } from '../services/ai';
import { useDialog } from './modals';
import './characterVariations.css';

interface CharacterVariationsModalProps {
  initialCharacter?: CharacterSheet | string | null;
  characters: CharacterSheet[];
  credits: number;
  projectId: string;
  onClose: () => void;
  onSpend: (n: number) => void;
  onAddVector: (def: DoodleDef, asScene: boolean) => void;
  onSaveVector: (def: DoodleDef) => void;
  onAddImage: (blob: Blob, name: string, opts: { place: boolean; asScene: boolean }) => Promise<void>;
  onSaveCharacter: (sheet: CharacterSheet) => void;
}

interface VariationItem {
  id: string;
  name: string;
  prompt: string;
  timestamp: number;
  kind: 'vector' | 'image';
  def?: DoodleDef;
  url?: string;
  blob?: Blob;
}

function EmptyVariationPlaceholder() {
  return (
    <svg width="74" height="74" viewBox="0 0 74 74" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer subtle grey circle */}
      <circle cx="37" cy="37" r="34" stroke="#94a3b8" strokeWidth="2.75" />
      {/* Rounded photo frame */}
      <rect x="23" y="24" width="28" height="25" rx="5" stroke="#94a3b8" strokeWidth="2.2" />
      {/* Mountain outline inside frame */}
      <path
        d="M26 42L32 35L38 41L42 37L48 44"
        stroke="#94a3b8"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sparkles on top right of frame */}
      <path
        d="M43.5 28C43.5 28 45.2 29.2 45.2 31C45.2 29.2 47 28 47 28C47 28 45.2 26.8 45.2 25C45.2 26.8 43.5 28 43.5 28Z"
        fill="#94a3b8"
      />
      <path
        d="M47 24C47 24 48 24.8 48 26C48 24.8 49 24 49 24C49 24 48 23.2 48 22C48 23.2 47 24 47 24Z"
        fill="#94a3b8"
      />
    </svg>
  );
}

export function CharacterVariationsModal(props: CharacterVariationsModalProps) {
  const [characterItems, setCharacterItems] = useState<ManifestItem[]>([]);

  useEffect(() => {
    let alive = true;
    void loadLibraryManifest().then((items) => {
      if (alive) {
        setCharacterItems(items.filter((it) => it.cat === 'characters'));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const defaultRef = useMemo(() => {
    if (props.initialCharacter && typeof props.initialCharacter === 'object') {
      return {
        name: props.initialCharacter.name || 'Faraz',
        src: props.initialCharacter.reference || '/library/characters/business-man-faraz-walking.color.svg',
      };
    }
    return {
      name: 'Faraz',
      src: '/library/characters/business-man-faraz-walking.color.svg',
    };
  }, [props.initialCharacter]);

  const [refImageSrc, setRefImageSrc] = useState<string>(defaultRef.src);
  const [refName, setRefName] = useState<string>(defaultRef.name);
  const [charPickerOpen, setCharPickerOpen] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [variationsCount, setVariationsCount] = useState<3 | 1>(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current active variations results (up to 3)
  const [currentVariations, setCurrentVariations] = useState<(VariationItem | null)[]>([null, null, null]);

  // Recently generated variations stored in state
  // This session's results (nothing is shown until something has been generated).
  const [recentVariations, setRecentVariations] = useState<VariationItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Escape closes the character picker first, then the window.
  useDialog(dialogRef, () => (charPickerOpen ? setCharPickerOpen(false) : props.onClose()));

  // Convert result to DoodleDef if vector
  const toDef = (r: Extract<ElementResult, { kind: 'vector' }>): DoodleDef | null => {
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
    return {
      id: `ai-var-${newId()}`,
      cat: 'custom',
      name: r.name.slice(0, 32),
      tags: ['character', 'variation'],
      strokes,
      fills: r.fills.filter((f) => ok(f.d)),
    };
  };

  // Convert ref image to base64 for API
  const getReferenceData = async (): Promise<{ mimeType: 'image/png'; data: string } | undefined> => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = refImageSrc;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
      });

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 400);
      const scale = Math.min(380 / img.naturalWidth, 380 / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (400 - w) / 2, (400 - h) / 2, w, h);

      const dataUrl = canvas.toDataURL('image/png');
      const b64 = dataUrl.split(',')[1];
      if (b64) {
        return { mimeType: 'image/png', data: b64 };
      }
    } catch (e) {
      console.warn('Could not export reference data', e);
    }
    return undefined;
  };

  const handleGenerate = async () => {
    const text = prompt.trim();
    if (!text || busy) return;

    setError(null);
    setBusy(true);

    const targetCount = variationsCount;
    setCurrentVariations(Array.from({ length: targetCount }, () => null));

    try {
      const refData = await getReferenceData();
      const lookDesc = `consistent character features and outfit for ${refName}`;
      const charName = refName || 'Character';

      const res = await generateElements({
        type: 'character',
        style: 'colour-doodle',
        prompt: text,
        variations: targetCount,
        projectId: props.projectId,
        characterSheet: {
          name: charName,
          look: lookDesc,
          style: 'colour-doodle',
          reference: refData,
        },
      });

      const newItems: VariationItem[] = [];
      for (const r of res.results) {
        if (r.kind === 'vector') {
          const def = toDef(r);
          if (def) {
            newItems.push({
              id: def.id,
              name: def.name,
              prompt: text,
              timestamp: Date.now(),
              kind: 'vector',
              def,
            });
          }
        } else {
          newItems.push({
            id: `ai-img-${newId()}`,
            name: `${charName} – ${r.name}`,
            prompt: text,
            timestamp: Date.now(),
            kind: 'image',
            url: r.url,
          });
        }
      }

      props.onSpend(res.results.length);

      // Fewer usable results than asked for: say so instead of filling slots with copies of the reference.
      if (newItems.length < targetCount) setError(`Google AI made ${newItems.length} of ${targetCount} variations. Generate again for more.`);

      setCurrentVariations(newItems);
      setRecentVariations((prev) => [...newItems, ...prev.slice(0, 12)]);
    } catch (err: unknown) {
      if (err instanceof AiError && err.code === 'not_configured') {
        window.dispatchEvent(new CustomEvent('open-api-key-modal'));
        setError('Google Gemini API key required. Please enter your key.');
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || 'Generation failed. Try a different prompt.');
      }
    } finally {
      setBusy(false);
    }
  };

  /** Adds (or saves) a result: drawings directly, pictures after downloading them. */
  const useResult = async (item: VariationItem, place: boolean) => {
    if (item.def) return place ? props.onAddVector(item.def, false) : props.onSaveVector(item.def);
    if (!item.url) return;
    try {
      const blob = item.blob ?? (await fetchMedia(item.url));
      await props.onAddImage(blob, item.name, { place, asScene: false });
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Couldn't add that picture. Try again.");
    }
  };

  const handleUploadRef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return setError('Use a PNG, JPEG, WebP or SVG image as the reference.');
    if (file.size > 8 * 1024 * 1024) return setError('That image is over 8 MB. Use a smaller file.');
    setError(null);
    const url = URL.createObjectURL(file);
    if (refImageSrc.startsWith('blob:')) URL.revokeObjectURL(refImageSrc);
    setRefImageSrc(url);
    setRefName(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handlePickPresetChar = (item: ManifestItem) => {
    setRefName(item.name);
    setRefImageSrc(item.thumbColor || item.thumb);
    setCharPickerOpen(false);
  };

  const handleUseAsRef = (item: VariationItem) => {
    if (item.url) {
      setRefImageSrc(item.url);
    } else if (item.def) {
      const svg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(doodleSvg(item.def, { color: true, ink: '#1B1B1B' }))}`;
      setRefImageSrc(svg);
    }
    setRefName(item.name);
  };

  // Filter unique characters for the picker (one per character name)
  const uniqueChars = useMemo(() => {
    const seen = new Set<string>();
    const list: ManifestItem[] = [];
    for (const item of characterItems) {
      const key = item.character || item.name;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(item);
      }
    }
    return list.slice(0, 40);
  }, [characterItems]);

  return (
    <div className="char-vars-overlay" role="dialog" aria-modal="true" aria-labelledby="char-vars-title" onPointerDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className="char-vars-modal" ref={dialogRef}>
        {/* Header */}
        <header className="char-vars-header">
          <div className="char-vars-header-left">
            <div className="char-vars-icon-badge">
              <Star size={20} className="star-icon" />
            </div>
            <div className="char-vars-titles">
              <h2 id="char-vars-title">Consistent Character Variations</h2>
              <p>Keep the same character while changing the pose or style</p>
            </div>
          </div>
          <button type="button" className="char-vars-close" data-close onClick={props.onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        {/* Prompt Input Row */}
        <div className="char-vars-prompt-wrap">
          <div className="char-vars-prompt-bar">
            <input
              type="text"
              className="char-vars-input"
              placeholder="Type your prompt here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleGenerate()}
              maxLength={500}
              disabled={busy}
            />
            <button
              type="button"
              className="char-vars-gen-btn"
              onClick={() => void handleGenerate()}
              disabled={!prompt.trim() || busy}
            >
              {busy ? <LoaderCircle size={18} className="spin" /> : <Sparkles size={18} />}
              Generate
            </button>
          </div>
          {error && <p className="char-vars-error">{error}</p>}
        </div>

        {/* Results Area */}
        <div className="char-vars-results-area">
          <div className="char-vars-results-toolbar">
            <div className="char-vars-results-label">
              <FlaskConical size={18} />
              <span>Results</span>
            </div>
            <div className="char-vars-toggle-group">
              <label className="char-vars-toggle-lbl">
                <span className="char-vars-switch">
                  <input
                    type="checkbox"
                    checked={variationsCount === 3}
                    onChange={(e) => setVariationsCount(e.target.checked ? 3 : 1)}
                  />
                  <span className="slider" />
                </span>
                <span>3 variations</span>
              </label>
              <span className="char-vars-help" title="Generate 3 distinct pose or style variations keeping character features intact">
                <HelpCircle size={15} />
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="char-vars-cards-grid">
            {/* Card 1: Reference Image */}
            <div className="char-vars-ref-card">
              <button type="button" className="char-vars-ref-thumb" onClick={() => setCharPickerOpen(true)} title="Change the reference character" aria-label={`Reference: ${refName}. Change the reference character`}>
                <img src={refImageSrc} alt="" />
              </button>
              <button type="button" className="char-vars-ref-badge" onClick={() => setCharPickerOpen(true)}>
                <span>Reference Image</span>
              </button>
            </div>

            {/* Cards 2, 3, 4: Variation Slots */}
            {Array.from({ length: 3 }).map((_, idx) => {
              const item = currentVariations[idx];

              return (
                <div key={idx} className={`char-vars-slot-card ${item ? 'has-item' : 'is-empty'} ${busy ? 'is-busy' : ''}`}>
                  {busy ? (
                    <div className="char-vars-busy-view">
                      <LoaderCircle size={32} className="spin" />
                      <span>Generating #{idx + 1}…</span>
                    </div>
                  ) : item ? (
                    <div className="char-vars-item-view">
                      <div className="char-vars-item-thumb">
                        {item.kind === 'vector' && item.def ? (
                          <span dangerouslySetInnerHTML={{ __html: doodleSvg(item.def, { color: true, ink: '#1B1B1B' }) }} />
                        ) : (
                          <img src={item.url} alt={item.name} />
                        )}
                      </div>
                      <div className="char-vars-item-caption">{item.name}</div>
                      <div className="char-vars-item-actions">
                        <button
                          type="button"
                          className="btn-action primary"
                          title="Add to Canvas"
                          onClick={() => void useResult(item, true)}
                        >
                          <Plus size={14} /> Add
                        </button>
                        <button
                          type="button"
                          className="btn-action"
                          title="Save to Custom"
                          onClick={() => void useResult(item, false)}
                        >
                          <Save size={14} /> Save
                        </button>
                        <button
                          type="button"
                          className="btn-action"
                          title="Set as New Reference"
                          onClick={() => handleUseAsRef(item)}
                        >
                          <RefreshCw size={14} /> Use Ref
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="char-vars-empty-view">
                      <div className="char-vars-empty-icon">
                        <EmptyVariationPlaceholder />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recently Generated Section */}
        <div className="char-vars-recent-section">
          <div className="char-vars-recent-title">
            <History size={16} strokeWidth={2.2} />
            <span>Recently generated</span>
          </div>

          <div className="char-vars-recent-scroll">
            {recentVariations.length === 0 && <p className="char-vars-recent-empty">Your variations from this window appear here.</p>}
            {recentVariations.map((v) => (
              <button type="button" key={v.id} className="char-vars-recent-tile" onClick={() => handleUseAsRef(v)} title={`Use "${v.name}" as reference`}>
                <div className="char-vars-recent-thumb">
                  {v.kind === 'vector' && v.def ? (
                    <span dangerouslySetInnerHTML={{ __html: doodleSvg(v.def, { color: true, ink: '#1B1B1B' }) }} />
                  ) : (
                    <img src={v.url} alt={v.name} />
                  )}
                </div>
                <div className="char-vars-recent-info">
                  <span className="recent-name">{v.name}</span>
                  <span className="recent-prompt">{v.prompt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Character Picker Modal */}
        {charPickerOpen && (
          <div className="char-picker-modal">
            <div className="char-picker-card">
              <div className="char-picker-head">
                <h3>Choose Reference Character</h3>
                <button type="button" className="close-btn" aria-label="Close character picker" onClick={() => setCharPickerOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="char-picker-upload">
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUploadRef} />
                <button type="button" className="upload-custom-btn" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} /> Upload Custom Reference Image
                </button>
              </div>
              <div className="char-picker-grid">
                {uniqueChars.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="char-tile"
                    onClick={() => handlePickPresetChar(c)}
                  >
                    <img src={c.thumbColor || c.thumb} alt={c.name} />
                    <span>{c.character || c.name}</span>
                    <small>{c.role || 'Character'}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

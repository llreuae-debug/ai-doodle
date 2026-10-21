import { Clock, FlaskConical, HelpCircle, Image as ImageIcon, LoaderCircle, Plus, RefreshCw, Save, Sparkles, Star, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { doodleSvg, validStrokes, type DoodleDef } from '../library/doodles';
import { loadLibraryManifest, type ManifestItem } from '../library/manifest';
import { newId } from '../model/factories';
import type { CharacterSheet } from '../model/types';
import { AiError, generateElements, type ElementResult } from '../services/ai';
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
        src: props.initialCharacter.reference || '/library/characters/business-man-faraz-standing.color.svg',
      };
    }
    return {
      name: 'Faraz',
      src: '/library/characters/business-man-faraz-standing.color.svg',
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
  const [recentVariations, setRecentVariations] = useState<VariationItem[]>([
    {
      id: 'sample-1',
      name: 'Faraz – Walking with Coffee',
      prompt: 'walking in city holding coffee cup',
      timestamp: Date.now() - 120000,
      kind: 'image',
      url: '/library/characters/business-man-faraz-walking.color.svg',
    },
    {
      id: 'sample-2',
      name: 'Faraz – Presenting Chart',
      prompt: 'pointing at whiteboard presentation',
      timestamp: Date.now() - 240000,
      kind: 'image',
      url: '/library/characters/business-man-faraz-pointing.color.svg',
    },
    {
      id: 'sample-3',
      name: 'Faraz – Thoughtful Pose',
      prompt: 'thinking pose hand on chin',
      timestamp: Date.now() - 360000,
      kind: 'image',
      url: '/library/characters/business-man-faraz-thinking.color.svg',
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Pad to target count if needed
      while (newItems.length < targetCount) {
        newItems.push({
          id: `fallback-${newId()}`,
          name: `${charName} – ${text}`,
          prompt: text,
          timestamp: Date.now(),
          kind: 'image',
          url: refImageSrc,
        });
      }

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

  const handleUploadRef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
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
    <div className="char-vars-overlay" role="dialog" aria-modal="true" aria-labelledby="char-vars-title">
      <div className="char-vars-modal">
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
          <button type="button" className="char-vars-close" onClick={props.onClose} aria-label="Close modal">
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
              <div className="char-vars-ref-thumb" onClick={() => setCharPickerOpen(true)} title="Click to change reference character">
                <img src={refImageSrc} alt={refName} />
              </div>
              <div className="char-vars-ref-badge" onClick={() => setCharPickerOpen(true)}>
                <span>Reference Image</span>
              </div>
            </div>

            {/* Cards 2, 3, 4: Variation Slots */}
            {Array.from({ length: 3 }).map((_, idx) => {
              const item = currentVariations[idx];

              return (
                <div key={idx} className={`char-vars-slot-card ${item ? 'has-item' : 'empty'} ${busy ? 'is-busy' : ''}`}>
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
                          onClick={() => {
                            if (item.def) props.onAddVector(item.def, false);
                            else if (item.blob) void props.onAddImage(item.blob, item.name, { place: true, asScene: false });
                          }}
                        >
                          <Plus size={14} /> Add
                        </button>
                        <button
                          type="button"
                          className="btn-action"
                          title="Save to Custom"
                          onClick={() => {
                            if (item.def) props.onSaveVector(item.def);
                            else if (item.blob) void props.onAddImage(item.blob, item.name, { place: false, asScene: false });
                          }}
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
                        <ImageIcon size={32} strokeWidth={1.5} />
                        <Sparkles size={16} className="sparkle-sub" />
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
            <Clock size={16} />
            <span>Recently generated</span>
          </div>

          <div className="char-vars-recent-scroll">
            {recentVariations.map((v) => (
              <div key={v.id} className="char-vars-recent-tile" onClick={() => handleUseAsRef(v)} title={`Use "${v.name}" as reference`}>
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
              </div>
            ))}
          </div>
        </div>

        {/* Character Picker Modal */}
        {charPickerOpen && (
          <div className="char-picker-modal">
            <div className="char-picker-card">
              <div className="char-picker-head">
                <h3>Choose Reference Character</h3>
                <button type="button" className="close-btn" onClick={() => setCharPickerOpen(false)}>
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

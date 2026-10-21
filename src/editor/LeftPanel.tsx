import { ChevronDown, ChevronUp, Eye, EyeOff, Layers, PenLine, Search, SlidersHorizontal, Sparkles, Star, Trash, Type, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { doodleSvg, LIBRARY, TAGS, type DoodleCategory, type DoodleDef } from '../library/doodles';
import type { Project, Scene } from '../model/types';
import { findDoodle } from '../services/loaders';
import { LIBRARY_CATEGORIES, loadLibraryManifest, manifestItem, type LibraryCategory, type ManifestItem } from '../library/manifest';
import { ensureFontCss, FONT_LIBRARY, type FontDef } from '../library/fonts';
import { elementName } from './shared';

export type LeftTab = 'doodles' | 'text' | 'layers';
export type TextPreset = 'h' | 's' | 'b';
export type LayerAction = 'select' | 'up' | 'down' | 'hide' | 'delete';

const THUMB_INK = '#1B1B1B';

interface Props {
  project: Project;
  scene: Scene;
  selectedId: string | null;
  tab: LeftTab;
  onTab: (tab: LeftTab) => void;
  category: DoodleCategory;
  onCategory: (c: DoodleCategory) => void;
  colorMode: boolean;
  onColorMode: (on: boolean) => void;
  textFont: string;
  /** Apply a font to the selected text, or add new text in it. */
  onFont: (family: string) => void;
  onUploadFont: () => void;
  onDeleteFont: (id: string) => void;
  onAddDoodle: (defId: string) => void;
  onAddImage: (assetId: string) => void;
  onAddText: (preset: TextPreset) => void;
  onUpload: () => void;
  onGenerate: (category: 'characters' | 'props') => void;
  onLayer: (id: string, action: LayerAction) => void;
}

function DoodleThumb({ def, color }: { def: Pick<DoodleDef, 'strokes' | 'fills'>; color: boolean }) {
  const svg = useMemo(() => doodleSvg(def, { color, ink: THUMB_INK }), [def, color]);
  return <span className="thumb" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** A built-in font row, shown in its own font. The font's stylesheet loads when the row scrolls into view. */
function FontRow({ font, selected, onPick }: { font: FontDef; selected: boolean; onPick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        ensureFontCss(font.family);
        io.disconnect();
      },
      { root: row.closest('.fontpane'), rootMargin: '200px 0px' },
    );
    io.observe(row);
    return () => io.disconnect();
  }, [font.family]);
  return (
    <button ref={ref} type="button" className="font-row" aria-pressed={selected} style={{ fontFamily: `'${font.family}', cursive` }} onClick={onPick}>
      {font.label}
      {font.tier === 'pro' && (
        <span className="pro-badge inline" title="Pro">
          <Star size={11} fill="currentColor" strokeWidth={0} />
        </span>
      )}
    </button>
  );
}

/** Library items listed from public/library/manifest.json (strokes load when added). */
function useLibraryManifest(): ManifestItem[] {
  const [list, setList] = useState<ManifestItem[]>([]);
  useEffect(() => {
    let alive = true;
    void loadLibraryManifest().then((l) => alive && setList(l));
    return () => {
      alive = false;
    };
  }, []);
  return list;
}

const categoryOf = new Map(LIBRARY_CATEGORIES.map((c) => [c.id, c]));
/** Tag chips not already covered by a category chip or a sub-tab. */
const extraTags = TAGS.filter((t) => t !== 'people' && t !== 'shapes' && !LIBRARY_CATEGORIES.some((c) => c.label.toLowerCase() === t));

export function LeftPanel(p: Props) {
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [cats, setCats] = useState<Set<LibraryCategory>>(new Set());
  const manifest = useLibraryManifest();
  const [fontQuery, setFontQuery] = useState('');
  // The Add-text buttons preview the current font.
  useEffect(() => ensureFontCss(p.textFont), [p.textFont]);
  const fq = fontQuery.trim().toLowerCase();
  const builtIn = FONT_LIBRARY.filter((f) => !fq || f.label.toLowerCase().includes(fq));
  const customFonts = (p.project.fonts ?? []).filter((f) => !fq || f.name.toLowerCase().includes(fq));

  const genLabel = p.category === 'props' || p.category === 'shapes' ? 'Generate Props with AI' : p.category === 'custom' ? 'Generate a Doodle with AI' : 'Generate Characters with AI';
  const q = query.trim().toLowerCase();
  const tabCats = LIBRARY_CATEGORIES.filter((c) => c.tab === p.category);
  const activeCats = tabCats.filter((c) => cats.has(c.id));
  /** Search words, tag chips, and category chips (built-in doodles match a category through their tags). */
  const matches = (name: string, itemTags: string[], cat?: string) =>
    (!q || `${name} ${itemTags.join(' ')}`.toLowerCase().includes(q)) &&
    (p.category === 'custom' || tags.size === 0 || itemTags.some((t) => tags.has(t))) &&
    (activeCats.length === 0 || activeCats.some((c) => c.id === cat || itemTags.includes(c.label.toLowerCase())));

  const uploads = Object.values(p.project.assets)
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((a) => matches(a.name, []));
  const doodles = (p.category === 'custom' ? p.project.custom : LIBRARY.filter((d) => d.cat === p.category)).filter((d) => matches(d.name, d.tags, d.cat));
  const listed = p.category === 'custom' ? [] : manifest.filter((m) => categoryOf.get(m.cat)?.tab === p.category && matches(m.name, m.tags, m.cat));
  const empty = doodles.length === 0 && listed.length === 0 && (p.category !== 'custom' || uploads.length === 0);
  const totalShowing = doodles.length + listed.length + (p.category === 'custom' ? uploads.length : 0);
  const totalAvailable = manifest.length || LIBRARY.length;
  const filterCount = tags.size + activeCats.length;

  const toggleCat = (c: LibraryCategory) =>
    setCats((s) => {
      const next = new Set(s);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  const toggleTag = (t: string) =>
    setTags((s) => {
      const next = new Set(s);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const els = p.scene.elements;

  return (
    <aside className="left" aria-label="Library">
      <div className="seg" role="tablist">
        {(
          [
            ['doodles', 'Doodles', <PenLine key="i" size={18} />],
            ['text', 'Text', <Type key="i" size={18} />],
            ['layers', 'Layers', <Layers key="i" size={18} />],
          ] as const
        ).map(([id, label, icon]) => (
          <button key={id} type="button" role="tab" aria-selected={p.tab === id} onClick={() => p.onTab(id)}>
            {icon}
            {label}
          </button>
        ))}
      </div>

      <section className="tabpane" hidden={p.tab !== 'doodles'}>
        <div className="subtabs" role="tablist">
          {(['custom', 'characters', 'props', 'shapes'] as const).map((c) => (
            <button key={c} type="button" role="tab" aria-selected={p.category === c} onClick={() => p.onCategory(c)}>
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <div className="searchrow">
          <label className="search">
            <Search size={18} />
            <input type="search" placeholder="Search" aria-label="Search doodles" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="btn" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}>
            <SlidersHorizontal size={18} />
            Filter{filterCount ? ` (${filterCount})` : ''}
          </button>
          <div className="colorlbl">
            <label className="switch" title="Show colour versions">
              <input type="checkbox" aria-label="Colour versions" checked={p.colorMode} onChange={(e) => p.onColorMode(e.target.checked)} />
              <span />
            </label>
            Color
          </div>
        </div>
        <div className="tile-count" role="status">
          Showing {totalShowing} of {totalAvailable}
        </div>
        {filterOpen && (
          <div className="filterpop">
            {tabCats.length > 1 && (
              <div className="chiprow" role="group" aria-label="Categories">
                {tabCats.map((c) => (
                  <button key={c.id} type="button" className="chip cat" aria-pressed={cats.has(c.id)} onClick={() => toggleCat(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            {extraTags.map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={tags.has(t)} onClick={() => toggleTag(t)}>
                {t}
              </button>
            ))}
            {filterCount > 0 && (
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setTags(new Set());
                  setCats(new Set());
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}
        <button type="button" className="btn ai gen-top" onClick={() => p.onGenerate(p.category === 'props' || p.category === 'shapes' ? 'props' : 'characters')}>
          <Sparkles size={18} />
          {genLabel}
        </button>
        <div className="libgrid">
          {empty &&
            (p.category === 'custom' ? (
              <div className="empty">
                <strong>Your uploads and AI doodles</strong>Upload a photo or logo, or describe a doodle and generate it. They appear here for every slide.
              </div>
            ) : (
              <div className="empty">
                <strong>No doodles match</strong>Try another word or clear the filter.
              </div>
            ))}
          {p.category === 'custom' &&
            uploads.map((a) => (
              <button key={a.id} type="button" className="tile" title={`Add ${a.name}`} onClick={() => p.onAddImage(a.id)}>
                <span className="thumb">
                  <img src={a.artUrl} alt="" />
                </span>
                <span className="cap">{a.name}</span>
              </button>
            ))}
          {doodles.map((d) => (
            <button key={d.id} type="button" className="tile" title={`Add ${d.name}`} onClick={() => p.onAddDoodle(d.id)}>
              <DoodleThumb def={d} color={p.colorMode} />
              <span className="cap">{d.name}</span>
            </button>
          ))}
          {listed.map((m) => (
            <button key={m.id} type="button" className="tile" title={`Add ${m.name}`} onClick={() => p.onAddDoodle(m.id)}>
              <span className="thumb">
                <img src={p.colorMode ? m.thumbColor : m.thumb} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="cap">{m.name}</span>
            </button>
          ))}
        </div>
        <div className="bottombtns">
          <button type="button" className="btn" onClick={p.onUpload}>
            <Upload size={18} />
            Upload
          </button>
          <button type="button" className="btn ai" onClick={() => p.onGenerate(p.category === 'props' || p.category === 'shapes' ? 'props' : 'characters')}>
            <Sparkles size={18} />
            Generate with AI
          </button>
        </div>
      </section>

      <section className="tabpane" hidden={p.tab !== 'text'}>
        <div className="addtext">
          <button type="button" className="btn sm" style={{ fontFamily: `'${p.textFont}', cursive`, fontWeight: 700 }} onClick={() => p.onAddText('h')}>
            <span>+ Heading</span>
          </button>
          <button type="button" className="btn sm" style={{ fontFamily: `'${p.textFont}', cursive` }} onClick={() => p.onAddText('s')}>
            <span>+ Subheading</span>
          </button>
          <button type="button" className="btn sm" style={{ fontFamily: `'${p.textFont}', cursive` }} onClick={() => p.onAddText('b')}>
            <span>+ Body</span>
          </button>
        </div>
        <div className="searchrow">
          <label className="search">
            <Search size={18} />
            <input type="search" placeholder="Search" aria-label="Search fonts" value={fontQuery} onChange={(e) => setFontQuery(e.target.value)} />
          </label>
        </div>
        <div className="fontpane">
          <div className="font-h">Uploaded by you</div>
          {customFonts.length === 0 ? (
            <p className="note font-empty">{fq && p.project.fonts.length ? 'No uploaded fonts match.' : 'No custom fonts yet — upload a .ttf, .otf, .woff or .woff2'}</p>
          ) : (
            customFonts.map((f) => (
              <div key={f.id} className="font-own">
                <button type="button" className="font-row" aria-pressed={f.family === p.textFont} style={{ fontFamily: `'${f.family}', cursive` }} onClick={() => p.onFont(f.family)}>
                  {f.name}
                </button>
                <button type="button" className="btn icon sm ghost" aria-label={`Delete ${f.name}`} title="Delete font" onClick={() => p.onDeleteFont(f.id)}>
                  <Trash size={16} />
                </button>
              </div>
            ))
          )}
          <div className="font-h">Built-in fonts</div>
          {builtIn.map((f) => (
            <FontRow key={f.family} font={f} selected={f.family === p.textFont} onPick={() => p.onFont(f.family)} />
          ))}
          {builtIn.length === 0 && customFonts.length === 0 && <p className="note">No fonts match.</p>}
        </div>
        <div className="bottombtns one">
          <button type="button" className="btn" onClick={p.onUploadFont}>
            <Upload size={18} />
            Upload Font
            <span className="pro-badge inline" title="Pro">
              <Star size={11} fill="currentColor" strokeWidth={0} />
            </span>
          </button>
          <p className="note licence">Only upload fonts you have a licence to use.</p>
        </div>
      </section>

      <section className="tabpane" hidden={p.tab !== 'layers'}>
        <div className="pad">
          {els.length === 0 ? (
            <div className="empty">
              <strong>This slide is empty</strong>Add a doodle or text and it shows up here. Items draw in order, top of this list last.
            </div>
          ) : (
            <>
              <div className="label">Draw order · last drawn on top</div>
              {[...els].reverse().map((el) => {
                const i = els.indexOf(el);
                return (
                  <div key={el.id} className={el.hidden ? 'layer is-hidden' : 'layer'} aria-current={el.id === p.selectedId}>
                    <span className="lthumb">
                      {el.kind === 'doodle' ? (
                        <LayerDoodle project={p.project} defId={el.defId} color={el.color} />
                      ) : el.kind === 'image' ? (
                        <img src={p.project.assets[el.assetId]?.artUrl} alt="" />
                      ) : (
                        <span style={{ fontFamily: `'${el.font}', cursive`, fontSize: 20 }}>Aa</span>
                      )}
                    </span>
                    <button type="button" className="lname" onClick={() => p.onLayer(el.id, 'select')}>
                      {i + 1}. {elementName(el, p.project)}
                    </button>
                    <button type="button" className="btn icon" aria-label="Draw later" disabled={i === els.length - 1} onClick={() => p.onLayer(el.id, 'up')}>
                      <ChevronUp size={18} />
                    </button>
                    <button type="button" className="btn icon" aria-label="Draw earlier" disabled={i === 0} onClick={() => p.onLayer(el.id, 'down')}>
                      <ChevronDown size={18} />
                    </button>
                    <button type="button" className="btn icon" aria-label={el.hidden ? 'Show' : 'Hide'} onClick={() => p.onLayer(el.id, 'hide')}>
                      {el.hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button type="button" className="btn icon" aria-label="Delete" onClick={() => p.onLayer(el.id, 'delete')}>
                      <Trash size={18} />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>
    </aside>
  );
}

function LayerDoodle({ project, defId, color }: { project: Project; defId: string; color: boolean }) {
  const def = findDoodle(project, defId);
  const svg = useMemo(() => (def ? doodleSvg(def, { color, ink: THUMB_INK }) : ''), [def, color]);
  const listed = def ? undefined : manifestItem(defId);
  if (listed) return <img src={color ? listed.thumbColor : listed.thumb} alt="" />;
  return <span dangerouslySetInnerHTML={{ __html: svg }} style={{ display: 'contents' }} />;
}

import { ArrowRight, ChevronDown, ChevronUp, Clock, Library, Mic, Monitor, Music, PenLine, Play, RefreshCw, Settings, SlidersHorizontal, Square, Star, Trash, Upload, AudioLines, X, Columns3, Volume2, VolumeX } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { testPenSound } from '../audio/penEngine';
import { BOARDS } from '../engine/boards';
import type { SceneTiming, Timeline } from '../engine/timeline';
import { autoDurationMs } from '../engine/timeline';
import { STAGE_SIZE, type AnimationType, type AspectRatio, type BoardId, type DrawSoundType, type Hand, type Mood, type Project, type Scene, type SceneElement, type TransitionType } from '../model/types';
import { HAND_GROUPS } from '../hands/catalog';
import { MOOD_LABELS } from '../services/music';
import { HandPicker } from './HandPicker';
import { FONT_LIBRARY } from '../library/fonts';
import { elementName } from './shared';

export type RightTab = 'props' | 'project';

const ANIMS: [AnimationType, string][] = [
  ['draw', 'Draw with hand'],
  ['wipe', 'Wipe'],
  ['fade', 'Fade in'],
  ['pop', 'Pop in'],
  ['slide', 'Slide in'],
  ['none', 'Already there'],
];
const TRANSITIONS: [TransitionType, string][] = [
  ['none', 'None'],
  ['fade', 'Fade'],
  ['wipe', 'Wipe'],
  ['push', 'Push'],
  ['iris', 'Iris'],
];
export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const SOUND_TYPES: [DrawSoundType, string][] = [
  ['marker', 'Marker'],
  ['chalk', 'Chalk'],
  ['pencil', 'Pencil'],
  ['soft', 'Soft marker'],
  ['ballpoint', 'Ballpoint'],
  ['custom', 'Custom'],
  ['none', 'None'],
];
/** The pen sound that suits each board: suggested, never switched silently. */
const BOARD_SOUND: Record<BoardId, DrawSoundType> = { white: 'marker', black: 'chalk', green: 'chalk', grid: 'pencil', kraft: 'pencil' };

/** Slide hand select values that aren't hand ids. */
const INHERIT = '__project__';
const NO_HAND = '__none__';
/** Female hands get the female chalk hand. */
const chalkHandFor = (id: string | null) => (id?.startsWith('female') ? 'female-chalk' : 'male-chalk');
const RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:5'];

interface Props {
  tab: RightTab;
  onTab: (tab: RightTab) => void;
  project: Project;
  timeline: Timeline;
  sceneIndex: number;
  selected: SceneElement | null;
  strokeLengthOf: (el: SceneElement) => number;
  loadingHand: string | null;
  /** Records one undo step and applies the change. */
  update: (recipe: (draft: Project) => void) => void;
  /** Applies a change without recording (after `checkpoint`), for sliders and typing. */
  updateLive: (recipe: (draft: Project) => void) => void;
  checkpoint: () => void;
  onDeselect: () => void;
  onDuplicate: () => void;
  onDrawLast: () => void;
  onDelete: () => void;
  onGenerateVoice: () => void;
  onUploadVoice: () => void;
  onPlayVoice: () => void;
  onUploadMusic: () => void;
  onMusicLibrary: () => void;
  onGenerateMusic: () => void;
  onPlayMusic: () => void;
  musicPlaying: boolean;
  onRatio: (ratio: AspectRatio) => void;
  hands: Hand[];
  onHand: (id: string | null) => void;
  /** undefined = use the project's hand. */
  onSlideHand: (id: string | null | undefined) => void;
}

const Hint = ({ text }: { text: string }) => (
  <span className="hint" title={text}>
    ?
  </span>
);

const Switch = ({ id, checked, disabled, onChange }: { id: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) => (
  <span className="switch">
    <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span />
  </span>
);

/** A number box that commits on blur or Enter, like Chalkline's change events. */
function NumberField(props: { id: string; value: number | null; placeholder?: string; min: number; max: number; step?: number; onCommit: (v: number | null) => void }) {
  return <NumberInput key={`${props.id}:${props.value ?? ''}`} {...props} />;
}

function NumberInput(props: { id: string; value: number | null; placeholder?: string; min: number; max: number; step?: number; onCommit: (v: number | null) => void }) {
  const { id, value, placeholder, min, max, step = 0.1, onCommit } = props;
  const [text, setText] = useState(value == null ? '' : String(value));
  const commit = () => {
    const v = text.trim() === '' ? null : Math.min(max, Math.max(min, Number(text) || 0));
    if (v !== value) onCommit(v);
    else setText(value == null ? '' : String(value));
  };
  return (
    <input
      className="num-in"
      id={id}
      type="number"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
    />
  );
}

const Sec = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <div className="sec-h">
    {icon}
    {children}
  </div>
);

const secs = (ms: number) => (ms / 1000).toFixed(1);

export function RightPanel(p: Props) {
  const [slideOpen, setSlideOpen] = useState(true);
  const scene = p.project.scenes[p.sceneIndex];
  const timing = p.timeline.scenes[p.sceneIndex];
  const mutateEl = (fn: (el: SceneElement) => void, live = false) =>
    (live ? p.updateLive : p.update)((d) => {
      const el = d.scenes[p.sceneIndex]?.elements.find((e) => e.id === p.selected?.id);
      if (el) fn(el);
    });
  const mutateScene = (fn: (s: Scene) => void) =>
    p.update((d) => {
      const s = d.scenes[p.sceneIndex];
      if (s) fn(s);
    });

  return (
    <aside className="right" aria-label="Settings">
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={p.tab === 'props'} onClick={() => p.onTab('props')}>
          <SlidersHorizontal size={18} />
          Properties
        </button>
        <button type="button" role="tab" aria-selected={p.tab === 'project'} onClick={() => p.onTab('project')}>
          <Settings size={18} />
          Project
        </button>
      </div>

      {p.tab === 'props' && scene && timing && (
        <>
          {p.selected && <ElementCard {...p} el={p.selected} mutateEl={mutateEl} />}
          <SlideCard
            scene={scene}
            timing={timing}
            index={p.sceneIndex}
            open={slideOpen}
            onToggle={() => setSlideOpen(!slideOpen)}
            mutateScene={mutateScene}
            hands={p.hands}
            projectHand={p.project.handId}
            onSlideHand={p.onSlideHand}
            music={p.project.music}
            musicPlaying={p.musicPlaying}
            onGenerateMusic={p.onGenerateMusic}
            onUploadMusic={p.onUploadMusic}
            onPlayMusic={p.onPlayMusic}
            onRemoveMusic={() => p.update((d) => void (d.music = null))}
            onGenerateVoice={p.onGenerateVoice}
            onUploadVoice={p.onUploadVoice}
            onPlayVoice={p.onPlayVoice}
          />
        </>
      )}

      {p.tab === 'project' && <ProjectCard {...p} />}
    </aside>
  );
}

function ElementCard(p: Props & { el: SceneElement; mutateEl: (fn: (el: SceneElement) => void, live?: boolean) => void }) {
  const { el, mutateEl } = p;
  const slideSpeed = p.project.scenes[p.sceneIndex]?.speed ?? 1;
  const effectiveSpeed = el.anim.speed ?? slideSpeed;
  const auto = autoDurationMs(el, p.strokeLengthOf(el));
  const effectiveAuto = auto / effectiveSpeed;
  return (
    <div className="card">
      <div className="card-h">
        <PenLine size={18} />
        <span className="title">{elementName(el, p.project).slice(0, 22)}</span>
        <button type="button" className="btn icon sm ghost" aria-label="Deselect" onClick={p.onDeselect}>
          <X size={18} />
        </button>
      </div>
      <Sec icon={<ArrowRight size={18} />}>Entrance</Sec>
      <div className="row">
        <label htmlFor="eAnim">Animation</label>
        <select className="sel" id="eAnim" value={el.anim.type} onChange={(e) => mutateEl((x) => void (x.anim.type = e.target.value as AnimationType))}>
          {ANIMS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="row">
        <label htmlFor="eSpeed">
          <Hint text="Overrides the slide drawing speed for this item only." />
          Speed
        </label>
        <select
          className="sel"
          id="eSpeed"
          value={el.anim.speed ?? ''}
          onChange={(e) => mutateEl((x) => void (x.anim.speed = e.target.value === '' ? undefined : Number(e.target.value)))}
        >
          <option value="">Use slide speed ({slideSpeed}x)</option>
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
      </div>
      <div className="row">
        <label htmlFor="eDur">
          Duration (sec) <Hint text="Leave empty for automatic timing based on how much there is to draw." />
        </label>
        <NumberField
          id="eDur"
          min={0}
          max={30}
          placeholder={secs(effectiveAuto)}
          value={el.anim.durationMs === 'auto' ? null : el.anim.durationMs / 1000}
          onCommit={(v) => mutateEl((x) => void (x.anim.durationMs = v == null ? 'auto' : Math.round(v * 1000)))}
        />
      </div>
      {el.anim.durationMs !== 'auto' && (
        <div className="row" style={{ paddingTop: 0, paddingBottom: '0.25rem', borderTop: 'none', color: 'var(--text-muted)' }}>
          <span className="lbl" style={{ fontSize: '11px' }}>Effective duration:</span>
          <span className="val" style={{ fontSize: '11px' }}>{secs(el.anim.durationMs / effectiveSpeed)} sec</span>
        </div>
      )}
      <div className="row">
        <label htmlFor="eDelay">Wait before (sec)</label>
        <NumberField id="eDelay" min={0} max={30} value={el.anim.delayMs / 1000} onCommit={(v) => mutateEl((x) => void (x.anim.delayMs = Math.round((v ?? 0) * 1000)))} />
      </div>
      <Sec icon={<Square size={18} />}>Appearance</Sec>
      {el.kind === 'doodle' && (
        <div className="row">
          <label htmlFor="eDrawAs">Draw as</label>
          <select
            className="sel"
            id="eDrawAs"
            value={!el.color ? 'line' : el.anim.type === 'draw' ? 'line-color' : 'color-only'}
            onChange={(e) => {
              const val = e.target.value;
              mutateEl((x) => {
                if (x.kind !== 'doodle') return;
                if (val === 'line') {
                  x.color = false;
                  x.anim.type = 'draw';
                } else if (val === 'line-color') {
                  x.color = true;
                  x.anim.type = 'draw';
                } else if (val === 'color-only') {
                  x.color = true;
                  x.anim.type = 'fade';
                }
              });
            }}
          >
            <option value="line">Line only</option>
            <option value="line-color">Line then colour</option>
            <option value="color-only">Colour only (no hand)</option>
          </select>
        </div>
      )}
      {el.kind === 'text' && (
        <>
          <div className="stack" style={{ paddingBottom: 0 }}>
            <label className="field">
              <span>Text</span>
              <textarea
                className="ta"
                value={el.text}
                onFocus={p.checkpoint}
                onChange={(e) => mutateEl((x) => void (x.kind === 'text' && (x.text = e.target.value || ' ')), true)}
              />
            </label>
          </div>
          <div className="row">
            <label htmlFor="eFont">Font</label>
            <select className="sel" id="eFont" value={el.font} onChange={(e) => mutateEl((x) => void (x.kind === 'text' && (x.font = e.target.value)))}>
              {p.project.fonts.map((f) => (
                <option key={f.id} value={f.family}>
                  {f.name} (uploaded)
                </option>
              ))}
              {FONT_LIBRARY.map((f) => (
                <option key={f.family} value={f.family}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <label htmlFor="eSize">Size</label>
            <NumberField id="eSize" min={12} max={600} step={1} value={el.size} onCommit={(v) => mutateEl((x) => void (x.kind === 'text' && (x.size = v ?? 40)))} />
          </div>
          <div className="row">
            <label htmlFor="eWeight">Bold</label>
            <Switch id="eWeight" checked={el.weight >= 700} onChange={(v) => mutateEl((x) => void (x.kind === 'text' && (x.weight = v ? 700 : 400)))} />
          </div>
          <div className="row">
            <label htmlFor="eFill">Colour</label>
            <input
              className="color"
              id="eFill"
              type="color"
              value={el.fill ?? BOARDS[p.project.board].ink}
              onChange={(e) => mutateEl((x) => void (x.kind === 'text' && (x.fill = e.target.value)))}
            />
          </div>
        </>
      )}
      <div className="row">
        <label htmlFor="eRot">Rotate</label>
        <input
          id="eRot"
          type="range"
          min={-180}
          max={180}
          value={el.rotation}
          onPointerDown={p.checkpoint}
          onKeyDown={p.checkpoint}
          onChange={(e) => mutateEl((x) => void (x.rotation = Number(e.target.value)), true)}
        />
      </div>
      <div className="stack inline">
        <button type="button" className="btn sm" onClick={p.onDuplicate}>
          Duplicate
        </button>
        <button type="button" className="btn sm" onClick={p.onDrawLast}>
          Draw last
        </button>
        <button type="button" className="btn sm" style={{ color: 'var(--danger)' }} onClick={p.onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

function SlideCard(props: {
  scene: Scene;
  timing: SceneTiming;
  index: number;
  open: boolean;
  onToggle: () => void;
  mutateScene: (fn: (s: Scene) => void) => void;
  hands: Hand[];
  projectHand: string | null;
  onSlideHand: (id: string | null | undefined) => void;
  music: Project['music'];
  musicPlaying: boolean;
  onGenerateMusic: () => void;
  onUploadMusic: () => void;
  onPlayMusic: () => void;
  onRemoveMusic: () => void;
  onGenerateVoice: () => void;
  onUploadVoice: () => void;
  onPlayVoice: () => void;
}) {
  const { scene, timing, index, open, mutateScene } = props;
  const v = scene.voice;
  return (
    <div className="card">
      <div className="card-h">
        <Monitor size={18} />
        Slide <span className="num">{index + 1}</span>
        <button type="button" className="btn icon sm ghost" aria-label={open ? 'Collapse' : 'Expand'} aria-expanded={open} onClick={props.onToggle}>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      {open && (
        <>
          <Sec icon={<Columns3 size={18} />}>Transitions</Sec>
          <div className="row">
            <label htmlFor="sTrans">
              <Hint text="How this slide replaces the one before it." />
              Transition type:
            </label>
            <select
              className="sel"
              id="sTrans"
              value={scene.transition}
              title={index === 0 ? 'The first slide has nothing to transition from.' : undefined}
              onChange={(e) => mutateScene((s) => void (s.transition = e.target.value as TransitionType))}
            >
              {TRANSITIONS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <Sec icon={<Clock size={18} />}>Timing</Sec>
          <div className="row">
            <label htmlFor="sSpeed">
              <Hint text="Speeds up or slows down every drawing on this slide." />
              Drawing speed:
            </label>
            <select className="sel" id="sSpeed" value={scene.speed} onChange={(e) => mutateScene((s) => void (s.speed = Number(e.target.value)))}>
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <span className="lbl">
              <Hint text="Drawing time plus the pause at the end." />
              Slide duration:
            </span>
            <span className="val">{secs(timing.end - timing.start)} sec</span>
          </div>
          <div className="row">
            <label htmlFor="sHold">
              <Hint text="How long the finished slide stays on screen." />
              Pause at end:
            </label>
            <NumberField id="sHold" min={0} max={60} value={scene.holdMs / 1000} onCommit={(val) => mutateScene((s) => void (s.holdMs = Math.round((val ?? 0) * 1000)))} />
          </div>
          <div className="row">
            <label htmlFor="sSync">
              <Hint text="Stretches the slide so it lasts as long as its voiceover." />
              Sync slide with voice
            </label>
            <Switch id="sSync" checked={scene.syncVoice} disabled={!v} onChange={(val) => mutateScene((s) => void (s.syncVoice = val))} />
          </div>
          {scene.syncVoice && (
            <div className="row" style={{ paddingLeft: '1.25rem' }}>
              <label htmlFor="sStretch">
                <Hint text="Slows drawing down to fill up to 85% of voiceover length." />
                Stretch drawing to voice
              </label>
              <Switch id="sStretch" checked={scene.stretchToVoice !== false} onChange={(val) => mutateScene((s) => void (s.stretchToVoice = val))} />
            </div>
          )}
          <div className="row">
            <label htmlFor="sDrawSound">
              <Hint text="Plays pen drawing sounds while elements are drawn on this slide." />
              Pen sound on this slide
            </label>
            <Switch id="sDrawSound" checked={scene.drawSound !== false} onChange={(val) => mutateScene((s) => void (s.drawSound = val))} />
          </div>
          <Sec icon={<PenLine size={18} />}>Hand</Sec>
          <div className="row">
            <label htmlFor="sHand">
              <Hint text="Draw this slide with a different hand, or none." />
              Drawing hand:
            </label>
            <select
              className="sel"
              id="sHand"
              value={scene.handId === undefined ? INHERIT : (scene.handId ?? NO_HAND)}
              onChange={(e) => props.onSlideHand(e.target.value === INHERIT ? undefined : e.target.value === NO_HAND ? null : e.target.value)}
            >
              <option value={INHERIT}>Project hand ({props.hands.find((h) => h.id === props.projectHand)?.name ?? 'No Hand'})</option>
              <option value={NO_HAND}>No Hand</option>
              {HAND_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {props.hands
                    .filter((h) => h.group === g)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <Sec icon={<Mic size={18} />}>Voiceover</Sec>
          <div className="stack">
            {v && (
              <div className="voicechip">
                <AudioLines size={18} />
                <span className="vt">
                  {v.ai ? `AI voice (Google): ${v.ai.text}` : v.name} · {secs(v.durationMs)}s
                </span>
                <button type="button" className="btn icon" aria-label="Play voiceover" onClick={props.onPlayVoice}>
                  <Play size={16} fill="currentColor" />
                </button>
                <button
                  type="button"
                  className="btn icon"
                  aria-label="Remove voiceover"
                  onClick={() =>
                    mutateScene((s) => {
                      s.voice = null;
                      s.syncVoice = false;
                    })
                  }
                >
                  <Trash size={16} />
                </button>
              </div>
            )}
            <button type="button" className="btn ai" onClick={props.onGenerateVoice}>
              <Mic size={18} />
              Generate voiceover
            </button>
            <button type="button" className="btn" style={{ background: 'var(--panel-2)' }} onClick={props.onUploadVoice}>
              <Upload size={18} />
              Upload voiceover
            </button>
          </div>
          <Sec icon={<Music size={18} />}>Background music</Sec>
          <div className="stack">
            {props.music && (
              <div className="voicechip">
                <Music size={18} />
                <span className="vt">♪ {props.music.name}</span>
                <button type="button" className="btn icon" aria-label={props.musicPlaying ? 'Stop music preview' : 'Play music preview'} onClick={props.onPlayMusic}>
                  {props.musicPlaying ? <Square size={14} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                {props.music.ai && (
                  <button type="button" className="btn icon" aria-label="Regenerate music" onClick={props.onGenerateMusic}>
                    <RefreshCw size={16} />
                  </button>
                )}
                <button type="button" className="btn icon" aria-label="Remove music" onClick={props.onRemoveMusic}>
                  <Trash size={16} />
                </button>
              </div>
            )}
            <button type="button" className="btn ai" onClick={props.onGenerateMusic}>
              <Music size={18} />
              Generate music
              <span className="pro-badge" title="Pro">
                <Star size={11} fill="currentColor" strokeWidth={0} />
              </span>
            </button>
            <button type="button" className="btn" style={{ background: 'var(--panel-2)' }} onClick={props.onUploadMusic}>
              <Upload size={18} />
              Upload music
            </button>
          </div>
          <div className="row">
            <label htmlFor="sMood">
              <Hint text="Music volume and the generated music's mood for this slide. Auto uses the story's mood." />
              Mood for this slide:
            </label>
            <select className="sel" id="sMood" value={scene.mood ?? 'auto'} onChange={(e) => mutateScene((s) => (e.target.value === 'auto' ? delete s.mood : void (s.mood = e.target.value as Mood)))}>
              <option value="auto">Auto{scene.storyMood ? ` (${MOOD_LABELS[scene.storyMood]})` : ' (from the story)'}</option>
              {(Object.keys(MOOD_LABELS) as Mood[]).map((m) => (
                <option key={m} value={m}>
                  {MOOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

function ProjectCard(p: Props) {
  const { project } = p;
  const [soundOpen, setSoundOpen] = useState(true);
  const [confirmApplySpeed, setConfirmApplySpeed] = useState(false);
  const [testingSound, setTestingSound] = useState(false);
  const testStopRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customErr, setCustomErr] = useState<string | null>(null);

  const handleTestSound = async () => {
    if (testingSound) {
      testStopRef.current?.();
      testStopRef.current = null;
      setTestingSound(false);
      return;
    }
    setTestingSound(true);
    const stop = await testPenSound(project.drawSound);
    testStopRef.current = stop;
    setTimeout(() => {
      setTestingSound(false);
      testStopRef.current = null;
    }, 2050);
  };

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomErr(null);
    if (file.size > 2 * 1024 * 1024) {
      setCustomErr('File must be ≤ 2 MB');
      return;
    }
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const tempCtx = new AudioContext();
      const ab = await file.arrayBuffer();
      const decoded = await tempCtx.decodeAudioData(ab);
      void tempCtx.close();
      if (decoded.duration > 10.5) {
        setCustomErr('Audio must be ≤ 10 seconds');
        return;
      }
      p.update((d) => {
        d.drawSound.customUrl = url;
        d.drawSound.customName = file.name;
        d.drawSound.type = 'custom';
        d.drawSound.enabled = true;
      });
    } catch {
      setCustomErr('Could not read audio file');
    }
  };

  return (
    <>
    <div className="card">
      <div className="card-h">
        <Music size={18} />
        Soundtrack
        <button type="button" className="btn icon sm ghost" aria-label={soundOpen ? 'Collapse' : 'Expand'} aria-expanded={soundOpen} onClick={() => setSoundOpen(!soundOpen)}>
          {soundOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      {soundOpen && (
        <div className="stack">
          {project.music && (
            <>
              <div className="voicechip">
                <Music size={18} />
                <span className="vt">{project.music.name}</span>
                <button type="button" className="btn icon" aria-label="Remove soundtrack" onClick={() => p.update((d) => void (d.music = null))}>
                  <Trash size={16} />
                </button>
              </div>
              <label className="row" style={{ padding: 0, border: 0 }}>
                <span className="lbl">Volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(project.music.volume * 100)}
                  onPointerDown={p.checkpoint}
                  onKeyDown={p.checkpoint}
                  onChange={(e) => p.updateLive((d) => void (d.music = d.music && { ...d.music, volume: Number(e.target.value) / 100 }))}
                />
              </label>
            </>
          )}
          {project.music && (
            <>
              <div className="row" style={{ padding: 0, border: 0 }}>
                <label htmlFor="pDuck">Duck under voice</label>
                <Switch id="pDuck" checked={project.music.duck !== false} onChange={(v) => p.update((d) => void (d.music = d.music && { ...d.music, duck: v }))} />
              </div>
              <div className="row" style={{ padding: 0, border: 0 }}>
                <label htmlFor="pFade">Fade out at end</label>
                <Switch id="pFade" checked={project.music.fadeOut !== false} onChange={(v) => p.update((d) => void (d.music = d.music && { ...d.music, fadeOut: v }))} />
              </div>
            </>
          )}
          <button type="button" className="btn ai" onClick={p.onGenerateMusic}>
            <Music size={18} />
            {project.music?.ai ? 'Regenerate music' : 'Generate music'}
          </button>
          <button type="button" className="btn soft accent-text" onClick={p.onMusicLibrary}>
            <Library size={18} />
            Select from Library
            <span className="pro-badge" title="Pro">
              <Star size={11} fill="currentColor" strokeWidth={0} />
            </span>
          </button>
          <p className="note">Music plays under the whole video{project.music?.duck !== false ? ' and drops to 25% while a voice speaks' : ''}. Upload your own from the slide panel.</p>
        </div>
      )}
    </div>
    <div className="card">
      <div className="card-h">
        <Monitor size={18} />
        Project
      </div>
      <div className="row">
        <span className="lbl">Length</span>
        <span className="val">
          {secs(p.timeline.duration)} sec · {project.scenes.length} {project.scenes.length === 1 ? 'slide' : 'slides'}
        </span>
      </div>
      <div className="sec-h">Video size</div>
      <div className="choices">
        {RATIOS.map((r) => {
          const { width, height } = STAGE_SIZE[r];
          const s = 28 / Math.max(width, height);
          return (
            <button key={r} type="button" className="choice" aria-pressed={project.aspectRatio === r} onClick={() => p.onRatio(r)}>
              <span className="ratio-box" style={{ width: Math.round(width * s), height: Math.round(height * s) }} />
              {r}
            </button>
          );
        })}
      </div>
      <div className="sec-h">Default drawing speed</div>
      <div className="row">
        <label htmlFor="pDefaultSpeed">
          <Hint text="Default drawing speed for new slides added to this project." />
          Speed for new slides
        </label>
        <select
          className="sel"
          id="pDefaultSpeed"
          value={project.defaultSpeed ?? 1}
          onChange={(e) => {
            const spd = Number(e.target.value);
            p.update((d) => void (d.defaultSpeed = spd));
          }}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
      </div>
      {!confirmApplySpeed ? (
        <div className="row" style={{ justifyContent: 'flex-end', borderTop: 'none', paddingTop: 0 }}>
          <button
            type="button"
            className="btn sm"
            onClick={() => setConfirmApplySpeed(true)}
          >
            Apply to all slides
          </button>
        </div>
      ) : (
        <div className="confirm-banner" role="alert" style={{ margin: '0.25rem 0 0.5rem', padding: '0.5rem', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '12px', marginBottom: '0.35rem' }}>
            Apply {project.defaultSpeed ?? 1}x speed to all {project.scenes.length} {project.scenes.length === 1 ? 'slide' : 'slides'}?
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn sm primary"
              onClick={() => {
                const spd = project.defaultSpeed ?? 1;
                p.update((d) => {
                  d.scenes.forEach((s) => {
                    s.speed = spd;
                  });
                });
                setConfirmApplySpeed(false);
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => setConfirmApplySpeed(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="sec-h">Board</div>
      <div className="choices" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {(Object.keys(BOARDS) as BoardId[]).map((k) => {
          const b = BOARDS[k];
          return (
            <button key={k} type="button" className="choice" aria-pressed={project.board === k} onClick={() => p.update((d) => void (d.board = k))}>
              <span
                className="sw"
                style={{
                  background: b.bg,
                  ...(b.grid
                    ? {
                        backgroundImage: `linear-gradient(${b.grid} 1px, transparent 1px), linear-gradient(90deg, ${b.grid} 1px, transparent 1px)`,
                        backgroundSize: '8px 8px',
                      }
                    : {}),
                }}
              />
              {b.name}
            </button>
          );
        })}
      </div>
      <div className="sec-h">Drawing hand</div>
      <div className="handpane">
        {(project.board === 'black' || project.board === 'green') && p.hands.find((h) => h.id === project.handId)?.group !== 'Chalk' && (
          <div className="chalk-hint">
            <span>Drawing on a {BOARDS[project.board].name.toLowerCase()}.</span>
            <button type="button" className="link" onClick={() => p.onHand(chalkHandFor(project.handId))}>
              Use chalk hand?
            </button>
          </div>
        )}
        <HandPicker hands={p.hands} selectedId={project.handId} loadingId={p.loadingHand} onSelect={p.onHand} />
      </div>
      <div className="sec-h">Pen sound</div>
      <div className="row" style={{ borderBottom: 'none', paddingBottom: '0.25rem' }}>
        <span className="lbl">Sound type</span>
      </div>
      <div className="choices" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {SOUND_TYPES.map(([st, label]) => (
          <button
            key={st}
            type="button"
            className="choice"
            aria-pressed={(project.drawSound?.type ?? 'marker') === st}
            onClick={() => {
              p.update((d) => {
                d.drawSound.type = st;
                if (st !== 'none') d.drawSound.enabled = true;
              });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {(() => {
        const type = project.drawSound?.type ?? 'marker';
        const suggest = BOARD_SOUND[project.board];
        // Paper takes a pencil or a ballpoint; either is fine there.
        const fits = type === suggest || (suggest === 'pencil' && type === 'ballpoint');
        if (fits || type === 'custom' || type === 'none') return null;
        const label = SOUND_TYPES.find(([t]) => t === suggest)?.[1] ?? suggest;
        return (
          <div className="chalk-hint" style={{ marginTop: '0.4rem', marginBottom: '0.5rem' }}>
            <span>Drawing on {BOARDS[project.board].name.toLowerCase()}.</span>
            <button type="button" className="link" onClick={() => p.update((d) => void (d.drawSound.type = suggest))}>
              Use {label.toLowerCase()} sound?
            </button>
          </div>
        );
      })()}
      {project.drawSound?.type === 'custom' && (
        <div className="stack" style={{ margin: '0.5rem 0', padding: '0.75rem', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
          <div className="row" style={{ border: 'none', padding: 0 }}>
            <span className="lbl" style={{ fontSize: '12px' }}>
              {project.drawSound.customName ? project.drawSound.customName : 'No file chosen'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mp3,audio/wav"
              style={{ display: 'none' }}
              onChange={handleCustomUpload}
            />
            <button
              type="button"
              className="btn sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              {project.drawSound.customUrl ? 'Replace' : 'Upload pen sound'}
            </button>
          </div>
          {customErr && <p className="err" style={{ margin: '0.25rem 0 0', fontSize: '11px' }}>{customErr}</p>}
          <span className="note" style={{ fontSize: '11px', margin: 0 }}>Upload MP3 or WAV (≤ 2 MB, ≤ 10 s). Loops while drawing.</span>
        </div>
      )}
      <div className="row">
        <label htmlFor="pSoundVol">Volume ({Math.round((project.drawSound?.volume ?? 0.35) * 100)}%)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
          <input
            id="pSoundVol"
            type="range"
            min={0}
            max={100}
            value={Math.round((project.drawSound?.volume ?? 0.35) * 100)}
            disabled={project.drawSound?.muted || project.drawSound?.type === 'none'}
            onPointerDown={p.checkpoint}
            onKeyDown={p.checkpoint}
            onChange={(e) =>
              p.updateLive(
                (d) =>
                  void (d.drawSound = {
                    ...d.drawSound,
                    volume: Number(e.target.value) / 100,
                  }),
              )
            }
          />
          <button
            type="button"
            className={`btn icon sm ${project.drawSound?.muted ? 'muted' : ''}`}
            aria-label={project.drawSound?.muted ? 'Unmute pen sound' : 'Mute pen sound'}
            aria-pressed={project.drawSound?.muted}
            onClick={() =>
              p.update((d) => {
                d.drawSound.muted = !d.drawSound.muted;
              })
            }
          >
            {project.drawSound?.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button
          type="button"
          className="btn sm"
          disabled={project.drawSound?.type === 'none'}
          onClick={handleTestSound}
        >
          <Play size={14} fill="currentColor" />
          {testingSound ? 'Stop' : 'Test'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="pQuietVoice" style={{ fontSize: '12px' }}>
            <Hint text="Pen sound drops to 40% while narration plays." />
            Quieter during voiceover
          </label>
          <Switch
            id="pQuietVoice"
            checked={project.drawSound?.quietDuringVoice !== false}
            onChange={(val) =>
              p.update((d) => {
                d.drawSound.quietDuringVoice = val;
              })
            }
          />
        </div>
      </div>
      {(project.drawSound?.type ?? 'marker') === 'marker' && (
        <div className="row">
          <label htmlFor="pCapSound" style={{ fontSize: '12px' }}>
            <Hint text="A marker cap coming off just before the first drawing." />
            Cap-off sound at the start
          </label>
          <Switch id="pCapSound" checked={!!project.drawSound?.capSound} onChange={(val) => p.update((d) => void (d.drawSound.capSound = val))} />
        </div>
      )}
    </div>
    </>
  );
}

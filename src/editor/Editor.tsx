import { Bell, BookOpen, Download, ExternalLink, KeyRound, Lightbulb, Maximize, Music, Pause, Pencil, Play, Redo2, SkipBack, SkipForward, Sparkles, Undo2, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { mixSoundtrack } from '../audio/mix';
import { Logomark } from '../brand/Logomark';
import { elementBox } from '../engine/geometry';
import { projectTimeline, stageStrokeLength } from '../engine/projectTiming';
import { emptyResources } from '../engine/resources';
import { sceneIndexAt } from '../engine/timeline';
import { DEFAULT_HAND_ID, HANDS, loadHandCatalog, resolveHand } from '../hands/catalog';
import type { DoodleCategory, DoodleDef } from '../library/doodles';
import { exampleProject } from '../library/templates';
import { cloneElement, cloneScene, newDoodle, newId, newImage, newScene, newText } from '../model/factories';
import { STAGE_SIZE, type AspectRatio, type CharacterSheet, type Project, type SceneElement, type Voice } from '../model/types';
import { doodleName, ensureResources, importImage, loadHand, readFont } from '../services/loaders';
import { DEFAULT_FONT, FONT_UPLOAD_TYPES, MAX_FONT_BYTES } from '../library/fonts';
import { lastProjectId, loadProject, saveProject } from '../services/storage';
import { LeftPanel, type LayerAction, type LeftTab, type TextPreset } from './LeftPanel';
import { ExportModal, type RenderCache } from './ExportModal';
import { GenerateModal } from './GenerateModal';
import { CharacterVariationsModal } from './CharacterVariationsModal';
import { ApiKeyModal } from './ApiKeyModal';
import { DashboardModal, TutorialModal, UploadModal, VoiceModal } from './modals';
import { MusicLibraryModal } from './MusicLibraryModal';
import { MusicModal } from './MusicModal';
import { StoryWizard } from './StoryWizard';
import { DEFAULT_MUSIC_VOLUME, formatClock, refitMusic, REFIT_TOLERANCE_SEC } from '../services/music';
import { TemplateGallery } from './TemplateGallery';
import { RightPanel, type RightTab } from './RightPanel';
import { SlideTimeline, type SlideMenuAction } from './SlideTimeline';
import { StageView } from './StageView';
import { useProjectStore } from './useProjectStore';
import './editor.css';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const TOAST_MS = 3200;
const START_CREDITS = 150;
const NUDGE = 8;
const NUDGE_BIG = 40;
/** Audio and picture start together this far in the future, so the first frame isn't late. */
const START_LEAD_S = 0.06;

type ModalState =
  | { kind: 'upload'; file: File }
  | { kind: 'generate'; preset: 'characters' | 'props' }
  | { kind: 'characterVariations'; initialCharacter?: any }
  | { kind: 'voice' }
  | { kind: 'export' }
  | { kind: 'dashboard' }
  | { kind: 'gallery' }
  | { kind: 'music' }
  | { kind: 'aimusic' }
  | { kind: 'story' }
  | { kind: 'tutorial' }
  | { kind: 'apiKey' };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function audioDurationMs(blob: Blob): Promise<number> {
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  return Math.round(buf.duration * 1000);
}

export default function Editor() {
  const [resources] = useState(emptyResources);
  const store = useProjectStore(() => exampleProject(DEFAULT_HAND_ID));
  const { project, update, checkpoint, undo, redo, replace } = store;
  const [resVersion, bump] = useReducer((x: number) => x + 1, 0);
  // resources is mutable; resVersion is bumped whenever new art lands in it.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const timeline = useMemo(() => projectTimeline(project, resources), [project, resources, resVersion]);

  const [cur, setCur] = useState(0);
  const sceneIndex = clamp(cur, 0, project.scenes.length - 1);
  const scene = project.scenes[sceneIndex];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = scene.elements.find((e) => e.id === selectedId) ?? null;

  const [leftTab, setLeftTab] = useState<LeftTab>('doodles');
  const [rightTab, setRightTab] = useState<RightTab>('props');
  const [category, setCategory] = useState<DoodleCategory>('characters');
  const [colorMode, setColorMode] = useState(false);
  const [textFont, setTextFont] = useState(DEFAULT_FONT);
  const renderCache = useRef<RenderCache>(new Map());
  const fontInput = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(1);
  const [soundPopoverOpen, setSoundPopoverOpen] = useState(false);
  const [snap, setSnap] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [credits, setCredits] = useState(START_CREDITS);
  const [loadingHand, setLoadingHand] = useState<string | null>(null);
  const [hands, setHands] = useState(HANDS);
  useEffect(() => void loadHandCatalog().then(setHands), []);
  const savedRef = useRef<Project | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const voiceInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const stage = STAGE_SIZE[project.aspectRatio];

  const showToast = useCallback((text: string) => setToast(text), []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    document.title = 'Ai Doodle';
    document.body.classList.add('editor-body');
    return () => document.body.classList.remove('editor-body');
  }, []);

  // Reopen the last saved project.
  useEffect(() => {
    const id = lastProjectId();
    if (!id) {
      setModal({ kind: 'gallery' });
      return;
    }
    loadProject(id)
      .then((p) => {
        if (!p) return;
        savedRef.current = p;
        replace(p);
      })
      .catch(() => {});
  }, [replace]);

  // Load art, uploads and the hand the project needs; redraw when they arrive.
  useEffect(() => {
    let alive = true;
    void ensureResources(project, resources, (msg) => showToast(`Couldn't load some artwork: ${msg}`)).then((changed) => {
      if (alive && changed) bump();
    });
    return () => {
      alive = false;
    };
  }, [project, resources, showToast]);

  // Text measures change when the handwriting fonts arrive.
  useEffect(() => {
    void document.fonts.ready.then(() => bump());
    const onDone = () => bump();
    document.fonts.addEventListener('loadingdone', onDone);
    return () => document.fonts.removeEventListener('loadingdone', onDone);
  }, []);

  // Read-only view of the project for the audit tests (only with ?audit in the URL).
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('audit')) return;
    const w = window as unknown as { __audit?: unknown };
    w.__audit = { project: () => JSON.parse(JSON.stringify(store.current(), (_k, v) => (v instanceof Blob ? `blob:${v.size}` : v))) as unknown, scene: () => cur };
    return () => void delete w.__audit;
  }, [store, cur]);

  // Listen for requests to configure API key from AI services.
  useEffect(() => {
    const handleOpenApiKey = () => setModal({ kind: 'apiKey' });
    window.addEventListener('open-api-key-modal', handleOpenApiKey);
    return () => window.removeEventListener('open-api-key-modal', handleOpenApiKey);
  }, []);

  // ---------- playback ----------

  const play = useRef<{ raf: number; token: number; source: AudioBufferSourceNode | null } | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const tokenRef = useRef(0);

  const stopPlay = useCallback(() => {
    tokenRef.current++;
    const p = play.current;
    if (p) {
      cancelAnimationFrame(p.raf);
      try {
        p.source?.stop();
      } catch {
        // Already stopped.
      }
    }
    play.current = null;
    setPlaying(false);
  }, []);

  const startPlay = async () => {
    if (playing) return stopPlay();
    setSelectedId(null);
    const token = ++tokenRef.current;
    audioCtx.current ??= new AudioContext();
    const ctx = audioCtx.current;
    void ctx.resume();
    setPlaying(true);
    // Everything the picture needs must be loaded first, or the sound would be mixed from a different timeline.
    if (await ensureResources(project, resources, () => {})) bump();
    if (token !== tokenRef.current) return;
    const tl = projectTimeline(project, resources);
    const t0 = tl.scenes[sceneIndex]?.start ?? 0;
    setPlayTime(t0);
    let mixed: AudioBuffer | null = null;
    try {
      mixed = await mixSoundtrack(project, tl, resources, { onWarning: showToast });
    } catch (err) {
      showToast(`Playing without sound: ${errText(err)}`);
    }
    if (token !== tokenRef.current) return;

    // The audio clock drives the picture, so they can't drift apart. The picture is held back by the
    // output latency, so a stroke appears when its scratch is actually heard.
    const audioClock = ctx.state === 'running';
    const startAt = ctx.currentTime + START_LEAD_S;
    const latency = ctx.outputLatency || ctx.baseLatency || 0;
    let source: AudioBufferSourceNode | null = null;
    if (mixed && t0 / 1000 < mixed.duration) {
      source = ctx.createBufferSource();
      source.buffer = mixed;
      source.connect(ctx.destination);
      source.start(startAt, t0 / 1000);
    }
    const startPerf = performance.now() + START_LEAD_S * 1000;
    const now = () => (audioClock ? (ctx.currentTime - startAt - latency) * 1000 : performance.now() - startPerf);
    let lastScene = -1;
    const tick = () => {
      if (token !== tokenRef.current) return;
      const t = t0 + Math.max(0, now());
      if (t >= tl.duration) {
        stopPlay();
        setCur(project.scenes.length - 1);
        return;
      }
      const i = sceneIndexAt(tl, t);
      if (i !== lastScene) {
        lastScene = i;
        setCur(i);
      }
      setPlayTime(t);
      play.current = { raf: requestAnimationFrame(tick), token, source };
    };
    play.current = { raf: requestAnimationFrame(tick), token, source };
  };

  useEffect(() => () => stopPlay(), [stopPlay]);

  const goSlide = (i: number) => {
    stopPlay();
    setCur(clamp(i, 0, project.scenes.length - 1));
    setSelectedId(null);
  };

  // ---------- adding things ----------

  const addElement = (el: SceneElement, label: string) => {
    update((d) => d.scenes[sceneIndex].elements.push(el));
    setSelectedId(el.id);
    showToast(`Added ${label}`);
  };

  const addDoodle = (defId: string, color = colorMode, project_ = project) => {
    const s = Math.min(stage.width, stage.height) * 0.55;
    const n = scene.elements.length;
    addElement(newDoodle(defId, stage.width / 2 + n * 24, stage.height / 2 + n * 12, s, color), doodleName(project_, defId) ?? 'doodle');
  };

  const addImageEl = (assetId: string, name: string) => {
    const w = Math.min(stage.width, stage.height) * 0.5;
    addElement(newImage(assetId, stage.width / 2, stage.height / 2, w), name);
  };

  const addText = (preset: TextPreset) => {
    const text = preset === 'h' ? 'Your big idea' : preset === 's' ? 'A short subheading' : 'A line of supporting text';
    const size = preset === 'h' ? 140 : preset === 's' ? 90 : 60;
    const el = newText(text, 0, 0, size, textFont, preset === 'h' ? 700 : 400);
    const box = elementBox(el, project);
    el.x = stage.width * 0.1 + box.w / 2;
    el.y = stage.height * 0.12 + scene.elements.length * 20 + box.h / 2;
    addElement(el, 'text');
  };

  const onImagePicked = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) return showToast('That image is over 8 MB. Use a smaller file.');
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return showToast('Use a PNG, JPEG, WebP or SVG image.');
    setModal({ kind: 'upload', file });
  };

  const addUpload = async (src: Blob | string, name: string, opts: { place?: boolean; asScene?: boolean } = {}) => {
    const { asset, art } = await importImage(src, name);
    resources.art.set(`img:${asset.id}`, art);
    update((d) => {
      d.assets = { ...d.assets, [asset.id]: asset };
    });
    setModal(null);
    setCategory('custom');
    setLeftTab('doodles');
    if (opts.place === false) return showToast(`Saved to Custom: ${name}`);
    if (asset.strokes.length === 0) showToast('No lines found in that image, so it will fade in instead of drawing.');
    if (opts.asScene) {
      // A scene fills the board (cover) and sits behind everything else on the slide.
      const k = Math.max(stage.width / asset.width, stage.height / asset.height);
      const el = newImage(asset.id, stage.width / 2, stage.height / 2, asset.width * k);
      update((d) => void d.scenes[sceneIndex].elements.unshift(el));
      setSelectedId(el.id);
      return showToast(`Added scene: ${name}`);
    }
    addImageEl(asset.id, asset.name);
  };

  const addGenerated = (def: DoodleDef, asScene = false) => {
    const color = def.fills.length > 0;
    if (color) setColorMode(true);
    if (!project.custom.some((d) => d.id === def.id)) update((d) => void (d.custom = [def, ...d.custom]));
    setModal(null);
    setCategory('custom');
    if (asScene) {
      const el = newDoodle(def.id, stage.width / 2, stage.height / 2, Math.max(stage.width, stage.height), color);
      update((d) => void d.scenes[sceneIndex].elements.unshift(el));
      setSelectedId(el.id);
      return showToast(`Added scene: ${def.name}`);
    }
    addDoodle(def.id, color, { ...project, custom: [def, ...project.custom] });
  };

  const saveGenerated = (def: DoodleDef) => {
    if (!project.custom.some((d) => d.id === def.id)) update((d) => void (d.custom = [def, ...d.custom]));
    showToast(`Saved to Custom: ${def.name}`);
  };

  const saveCharacter = (sheet: CharacterSheet) =>
    update((d) => {
      const list = d.characters ?? [];
      if (!list.some((c) => c.look === sheet.look && c.style === sheet.style)) d.characters = [sheet, ...list].slice(0, 12);
    });

  // ---------- fonts ----------

  const applyFont = (family: string) => {
    setTextFont(family);
    if (selected?.kind === 'text') {
      const id = selected.id;
      mutateScene((els) => els.forEach((e) => e.id === id && e.kind === 'text' && (e.font = family)));
      return;
    }
    const el = newText('Your Text Here', 0, 0, 100, family, 400);
    const box = elementBox(el, project);
    el.x = stage.width / 2;
    el.y = stage.height * 0.2 + scene.elements.length * 24 + box.h / 2;
    addElement(el, 'text');
  };

  const onFontPicked = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FONT_BYTES) return showToast('That font file is over 5 MB.');
    try {
      await readFont(file);
    } catch {
      return showToast("That file isn't a font this browser can read. Use TTF, OTF, WOFF or WOFF2.");
    }
    const name = file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'My font';
    const font = { id: newId(), family: `Custom ${name} ${newId().slice(0, 6)}`, name, blob: file as Blob };
    update((d) => void (d.fonts = [...d.fonts, font]));
    setTextFont(font.family);
    showToast(`Font added: ${name}`);
  };

  /** Removes an uploaded font; text that used it switches to the default font. */
  const deleteFont = (id: string) => {
    const font = project.fonts.find((f) => f.id === id);
    if (!font) return;
    let moved = 0;
    update((d) => {
      d.fonts = d.fonts.filter((f) => f.id !== id);
      for (const s of d.scenes) for (const el of s.elements) if (el.kind === 'text' && el.font === font.family) (el.font = DEFAULT_FONT, moved++);
    });
    if (textFont === font.family) setTextFont(DEFAULT_FONT);
    showToast(moved ? `Font removed: ${font.name}. ${moved} text${moved === 1 ? '' : 's'} now use ${DEFAULT_FONT}.` : `Font removed: ${font.name}`);
  };

  // ---------- element and layer actions ----------

  const mutateScene = (fn: (els: SceneElement[]) => void) => update((d) => fn(d.scenes[sceneIndex].elements));

  const duplicate = () => {
    if (!selected) return;
    const copy = cloneElement(selected, 40, 40);
    mutateScene((els) => els.push(copy));
    setSelectedId(copy.id);
  };
  const drawLast = () =>
    selected &&
    mutateScene((els) => {
      const i = els.findIndex((e) => e.id === selected.id);
      els.push(...els.splice(i, 1));
    });
  const remove = (id = selectedId) => {
    if (!id) return;
    mutateScene((els) => {
      const i = els.findIndex((e) => e.id === id);
      if (i >= 0) els.splice(i, 1);
    });
    if (id === selectedId) setSelectedId(null);
  };

  const onLayer = (id: string, action: LayerAction) => {
    if (action === 'select') return setSelectedId(id);
    if (action === 'delete') return remove(id);
    mutateScene((els) => {
      const i = els.findIndex((e) => e.id === id);
      if (i < 0) return;
      if (action === 'up' && i < els.length - 1) [els[i], els[i + 1]] = [els[i + 1], els[i]];
      if (action === 'down' && i > 0) [els[i], els[i - 1]] = [els[i - 1], els[i]];
      if (action === 'hide') els[i] = { ...els[i], hidden: !els[i].hidden };
    });
  };

  // ---------- project actions ----------

  const changeRatio = (ratio: AspectRatio) => {
    if (ratio === project.aspectRatio) return;
    const from = STAGE_SIZE[project.aspectRatio];
    const to = STAGE_SIZE[ratio];
    const f = Math.min(to.width / from.width, to.height / from.height);
    update((d) => {
      d.aspectRatio = ratio;
      for (const s of d.scenes) {
        for (const el of s.elements) {
          el.x = el.x * f + (to.width - from.width * f) / 2;
          el.y = el.y * f + (to.height - from.height * f) / 2;
          if (el.kind === 'text') el.size = Math.round(el.size * f);
          else if (el.kind === 'doodle') el.size *= f;
          else el.width *= f;
        }
      }
    });
  };

  /** Downloads a hand before it's used, so the switch is instant. False if it failed. */
  const prepareHand = async (id: string): Promise<boolean> => {
    if (resources.hands.has(id)) return true;
    const hand = await resolveHand(id);
    if (!hand) return false;
    setLoadingHand(id);
    try {
      resources.hands.set(id, await loadHand(hand));
      return true;
    } catch (err) {
      showToast(`Couldn't load ${hand.name}: ${errText(err)}`);
      return false;
    } finally {
      setLoadingHand(null);
    }
  };

  const selectHand = async (id: string | null) => {
    if (id && !(await prepareHand(id))) return;
    update((d) => void (d.handId = id));
  };

  /** This slide's own hand; undefined goes back to the project's. */
  const selectSlideHand = async (id: string | null | undefined) => {
    if (id && !(await prepareHand(id))) return;
    update((d) => {
      const s = d.scenes[cur];
      if (!s) return;
      if (id === undefined) delete s.handId;
      else s.handId = id;
    });
  };

  const onVoicePicked = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) return showToast('That audio file is over 20 MB. Use a shorter or compressed file.');
    try {
      const durationMs = await audioDurationMs(file);
      update((d) => {
        d.scenes[sceneIndex].voice = { kind: 'file', name: file.name, blob: file, durationMs };
        d.scenes[sceneIndex].syncVoice = true;
      });
      showToast('Voiceover added. Slide now lasts as long as the recording.');
    } catch {
      showToast("Couldn't read that audio file. Try MP3, WAV or M4A.");
    }
  };

  const onMusicPicked = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES * 2) return showToast('That music file is over 40 MB. Use a shorter or compressed file.');
    update((d) => void (d.music = { name: file.name, blob: file, volume: d.music?.volume ?? DEFAULT_MUSIC_VOLUME, duck: d.music?.duck ?? true, fadeOut: d.music?.fadeOut ?? true }));
    showToast('Music added');
  };

  // ---------- background music ----------

  const musicAudio = useRef<{ audio: HTMLAudioElement; url: string } | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const stopMusicPreview = () => {
    const m = musicAudio.current;
    if (m) {
      m.audio.pause();
      URL.revokeObjectURL(m.url);
    }
    musicAudio.current = null;
    setMusicPlaying(false);
  };
  useEffect(() => stopMusicPreview, []);
  /** Previews the track from this slide's place in the video. */
  const playMusic = () => {
    if (musicAudio.current) return stopMusicPreview();
    if (!project.music) return;
    const url = URL.createObjectURL(project.music.blob);
    const audio = new Audio(url);
    audio.volume = Math.min(1, project.music.volume * 2);
    audio.currentTime = (timeline.scenes[sceneIndex]?.start ?? 0) / 1000;
    audio.onended = stopMusicPreview;
    musicAudio.current = { audio, url };
    setMusicPlaying(true);
    void audio.play().catch(stopMusicPreview);
  };

  const [refitting, setRefitting] = useState(false);
  const fitted = project.music?.ai?.fittedSec;
  const videoSec = timeline.duration / 1000;
  const lengthChanged = fitted !== undefined && Math.abs(fitted - videoSec) > REFIT_TOLERANCE_SEC;
  const refit = async () => {
    setRefitting(true);
    try {
      const { music, generated } = await refitMusic(project, timeline);
      update((d) => void (d.music = music));
      showToast(generated ? `Music refitted (${generated} new clip${generated === 1 ? '' : 's'} for new moods).` : 'Music refitted to the new length from the same loops.');
    } catch (err) {
      showToast(`Couldn't refit the music: ${errText(err)}`);
    } finally {
      setRefitting(false);
    }
  };
  const keepMusicLength = () => update((d) => void (d.music?.ai && (d.music = { ...d.music, ai: { ...d.music.ai, fittedSec: videoSec } })));

  const playVoice = () => {
    const v = scene.voice;
    if (!v) return;
    const url = URL.createObjectURL(v.blob);
    const a = new Audio(url);
    a.onended = () => URL.revokeObjectURL(url);
    void a.play().catch(() => URL.revokeObjectURL(url));
  };

  const useVoice = (voice: Voice) => {
    update((d) => {
      d.scenes[sceneIndex].voice = voice;
      d.scenes[sceneIndex].syncVoice = true;
    });
    setModal(null);
  };

  const onSlideMenu = (i: number, action: SlideMenuAction) => {
    let next = i;
    update((d) => {
      const S = d.scenes;
      if (action === 'duplicate') {
        S.splice(i + 1, 0, cloneScene(S[i]));
        next = i + 1;
      }
      if (action === 'left' && i > 0) {
        [S[i - 1], S[i]] = [S[i], S[i - 1]];
        next = i - 1;
      }
      if (action === 'right' && i < S.length - 1) {
        [S[i + 1], S[i]] = [S[i], S[i + 1]];
        next = i + 1;
      }
      if (action === 'delete' && S.length > 1) {
        S.splice(i, 1);
        next = clamp(cur >= i ? cur - 1 : cur, 0, S.length - 1);
      }
    });
    goSlide(next);
  };

  const addSlide = () => {
    update((d) => d.scenes.splice(sceneIndex + 1, 0, newScene('fade', d.defaultSpeed ?? 1)));
    goSlide(sceneIndex + 1);
  };

  const save = async () => {
    try {
      await saveProject(project);
      savedRef.current = project;
      showToast('Saved in this browser.');
    } catch (err) {
      showToast(`Couldn't save: ${errText(err)}`);
    }
  };

  const openProject = (p: Project, saved: boolean) => {
    stopPlay();
    replace(p);
    savedRef.current = saved ? p : null;
    setCur(0);
    setSelectedId(null);
    setModal(null);
  };

  const commitName = (input: HTMLInputElement) => {
    const name = input.value.trim() || 'untitled project';
    input.value = name;
    if (name !== project.name) update((d) => void (d.name = name));
  };

  const strokeLengthOf = (el: SceneElement) => stageStrokeLength(el, project, resources);

  // ---------- keyboard ----------

  const keyState = useRef({ undo, redo, save, duplicate, remove, startPlay, selected, update, checkpoint, sceneIndex, modal });
  useEffect(() => {
    keyState.current = { undo, redo, save, duplicate, remove, startPlay, selected, update, checkpoint, sceneIndex, modal };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keyState.current;
      if (k.modal) return;
      if (e.key === 'Escape') return setSelectedId(null);
      if ((e.target as Element).closest('input, textarea, select')) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        return e.shiftKey ? k.redo() : k.undo();
      }
      if (mod && key === 'y') {
        e.preventDefault();
        return k.redo();
      }
      if (mod && key === 's') {
        e.preventDefault();
        return void k.save();
      }
      if (mod && key === 'd' && k.selected) {
        e.preventDefault();
        return k.duplicate();
      }
      if (!mod && key === 'm') {
        e.preventDefault();
        k.update((d) => {
          d.drawSound.muted = !d.drawSound.muted;
        });
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        return void k.startPlay();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && k.selected) {
        e.preventDefault();
        return k.remove();
      }
      if (k.selected && e.key.startsWith('Arrow')) {
        e.preventDefault();
        if (!e.repeat) k.checkpoint();
        const d = e.shiftKey ? NUDGE_BIG : NUDGE;
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        const id = k.selected.id;
        const si = k.sceneIndex;
        k.update((draft) => {
          const el = draft.scenes[si].elements.find((x) => x.id === id);
          if (el) {
            el.x += dx;
            el.y += dy;
          }
        }, false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (savedRef.current !== store.current() && store.canUndo) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [store]);

  const fullscreen = async () => {
    const wrap = document.querySelector('.editor .stagewrap');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrap?.requestFullscreen();
    } catch {
      showToast('Full screen is not available here.');
    }
  };

  const voiceItems = scene.elements
    .map((e) => (e.kind === 'text' ? `text "${e.text.replace(/\n/g, ' ')}"` : e.kind === 'doodle' ? `drawing of ${doodleName(project, e.defId) ?? 'an object'}` : 'an image'))
    .join('; ');
  const slideTexts = scene.elements
    .filter((e) => e.kind === 'text')
    .map((e) => (e.kind === 'text' ? e.text.replace(/\n/g, ' ') : ''))
    .join('. ');

  return (
    <div className="editor">
      <header className="top">
        <div className="brand" aria-label="Ai Doodle">
          <Logomark size={30} />
          <span>Ai Doodle</span>
        </div>
        <nav className="crumbs" aria-label="Breadcrumb">
          <button type="button" onClick={() => setModal({ kind: 'dashboard' })}>
            Dashboard
          </button>
          <span aria-hidden="true">›</span>
          <input
            key={project.name}
            type="text"
            aria-label="Project name"
            defaultValue={project.name}
            onBlur={(e) => commitName(e.currentTarget)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <Pencil size={18} aria-hidden="true" />
        </nav>
        <div className="top-actions">
          <button
            type="button"
            className="btn ai"
            aria-label="Story"
            onClick={() => {
              stopPlay();
              setModal({ kind: 'story' });
            }}
          >
            <Sparkles size={18} />
            <span className="lbl-story">Story</span>
          </button>
          <button
            type="button"
            className="btn"
            title="Google Gemini API Key"
            aria-label="Google Gemini API Key"
            onClick={() => {
              stopPlay();
              setModal({ kind: 'apiKey' });
            }}
          >
            <KeyRound size={18} />
            <span className="lbl-hide">API Key</span>
          </button>
          <button type="button" className="btn" aria-label="Tutorials" onClick={() => setModal({ kind: 'tutorial' })}>
            <span className="lbl-hide">Tutorials</span>
            <Lightbulb size={18} />
          </button>
          <a
            href="/blog"
            className="btn"
            title="Blog & Guides"
            aria-label="Blog & Guides"
          >
            <BookOpen size={18} />
            <span className="lbl-hide">Blog</span>
          </a>
          <button type="button" className="btn" aria-label="Save" onClick={() => void save()}>
            <span className="lbl-hide">Save</span>
            <Download size={18} />
          </button>
          <button
            type="button"
            className="btn primary"
            aria-label="Export"
            onClick={() => {
              stopPlay();
              setModal({ kind: 'export' });
            }}
          >
            <span className="lbl-export">Export</span>
            <ExternalLink size={18} />
          </button>
          <button type="button" className="btn ghost icon" aria-label="Notifications" onClick={() => showToast('No new notifications')}>
            <Bell size={18} />
          </button>
          <div className="avatar" aria-label="Your account">
            You
          </div>
        </div>
      </header>

      <main className="work">
        <LeftPanel
          project={project}
          scene={scene}
          selectedId={selectedId}
          tab={leftTab}
          onTab={setLeftTab}
          category={category}
          onCategory={setCategory}
          colorMode={colorMode}
          onColorMode={setColorMode}
          textFont={textFont}
          onFont={applyFont}
          onUploadFont={() => fontInput.current?.click()}
          onDeleteFont={deleteFont}
          onAddDoodle={(id, color) => addDoodle(id, color)}
          onAddImage={(id) => addImageEl(id, project.assets[id]?.name ?? 'image')}
          onAddText={addText}
          onUpload={() => imageInput.current?.click()}
          onGenerate={(preset) => setModal({ kind: 'generate', preset })}
          onCharacterVariations={(initialCharacter) => setModal({ kind: 'characterVariations', initialCharacter })}
          onLayer={onLayer}
        />

        <section className="center" aria-label="Board">
          {lengthChanged && (
            <div className="refit-banner" role="status">
              <Music size={16} />
              <span>
                Video length changed ({formatClock(fitted ?? 0)} → {formatClock(videoSec)}). Refit music?
              </span>
              <button type="button" className="btn sm accent" onClick={() => void refit()} disabled={refitting}>
                {refitting ? 'Refitting…' : 'Refit'}
              </button>
              <button type="button" className="btn sm" onClick={keepMusicLength} disabled={refitting}>
                Keep
              </button>
            </div>
          )}
          <StageView
            project={project}
            timeline={timeline}
            resources={resources}
            resVersion={resVersion}
            sceneIndex={sceneIndex}
            playing={playing}
            playTime={playTime}
            selectedId={selectedId}
            zoom={zoom}
            snap={snap}
            onSelect={setSelectedId}
            onCheckpoint={checkpoint}
            onChange={(recipe) => update(recipe, false)}
          />
          <div className="ctrl">
            <div className="prog" aria-hidden="true">
              <i style={{ width: playing ? `${(playTime / Math.max(1, timeline.duration)) * 100}%` : 0 }} />
            </div>
            <div className="ctrlrow">
              <div className="grp">
                <button type="button" className="btn icon" aria-label="Undo" onClick={undo} disabled={!store.canUndo}>
                  <Undo2 size={18} />
                </button>
                <button type="button" className="btn icon" aria-label="Redo" onClick={redo} disabled={!store.canRedo}>
                  <Redo2 size={18} />
                </button>
                <label className="snaplbl">
                  <span className="switch">
                    <input type="checkbox" checked={snap} aria-label="Snap align" onChange={(e) => setSnap(e.target.checked)} />
                    <span />
                  </span>
                  Snap Align
                  <span className="hint" title="Lines items up with the board centre and with each other while you drag.">
                    ?
                  </span>
                </label>
              </div>
              <div className="grp">
                <button type="button" className="btn icon" aria-label="Previous slide" style={{ borderRadius: '50%' }} onClick={() => goSlide(sceneIndex - 1)}>
                  <SkipBack size={18} fill="currentColor" />
                </button>
                <button type="button" className="playbtn" aria-label={playing ? 'Pause' : 'Play'} onClick={() => void startPlay()}>
                  {playing ? <Pause size={22} fill="currentColor" strokeWidth={0} /> : <Play size={22} fill="currentColor" strokeWidth={0} />}
                </button>
                <button type="button" className="btn icon" aria-label="Next slide" style={{ borderRadius: '50%' }} onClick={() => goSlide(sceneIndex + 1)}>
                  <SkipForward size={18} fill="currentColor" />
                </button>
              </div>
              <div className="grp">
                <button type="button" className="btn icon" aria-label="Zoom out" onClick={() => setZoom((z) => clamp(Math.round((z - 0.1) * 10) / 10, 0.3, 3))}>
                  <ZoomOut size={18} />
                </button>
                <span className="zoomval">{Math.round(zoom * 100)}%</span>
                <button type="button" className="btn icon" aria-label="Zoom in" onClick={() => setZoom((z) => clamp(Math.round((z + 0.1) * 10) / 10, 0.3, 3))}>
                  <ZoomIn size={18} />
                </button>
                <button type="button" className="btn icon" aria-label="Full screen" onClick={() => void fullscreen()}>
                  <Maximize size={18} />
                </button>
              </div>
              <div
                className="grp sound-control-wrap"
                onMouseEnter={() => setSoundPopoverOpen(true)}
                onMouseLeave={() => setSoundPopoverOpen(false)}
                onFocus={() => setSoundPopoverOpen(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setSoundPopoverOpen(false);
                }}
              >
                <button
                  type="button"
                  className={`btn icon ${project.drawSound?.muted ? 'muted' : ''}`}
                  aria-label={project.drawSound?.muted ? 'Unmute pen sound (M)' : 'Mute pen sound (M)'}
                  aria-pressed={project.drawSound?.muted}
                  onClick={() => {
                    update((d) => {
                      d.drawSound.muted = !d.drawSound.muted;
                    });
                  }}
                >
                  {project.drawSound?.muted || project.drawSound?.type === 'none' || (project.drawSound?.volume ?? 0) === 0 ? (
                    <VolumeX size={18} />
                  ) : (
                    <Volume2 size={18} />
                  )}
                </button>
                {soundPopoverOpen && (
                  <div className="sound-popover" role="dialog" aria-label="Pen sound volume">
                    <div className="sound-popover-row">
                      <Volume2 size={14} />
                      <input
                        id="canvasSoundVol"
                        aria-label="Pen sound volume"
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round((project.drawSound?.volume ?? 0.35) * 100)}
                        onPointerDown={checkpoint}
                        onKeyDown={checkpoint}
                        onChange={(e) => {
                          const v = Number(e.target.value) / 100;
                          update((d) => {
                            d.drawSound.volume = v;
                            if (d.drawSound.muted && v > 0) d.drawSound.muted = false;
                          }, false);
                        }}
                      />
                      <span className="sound-vol-val">{Math.round((project.drawSound?.volume ?? 0.35) * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <RightPanel
          tab={rightTab}
          onTab={setRightTab}
          project={project}
          timeline={timeline}
          sceneIndex={sceneIndex}
          selected={selected}
          strokeLengthOf={strokeLengthOf}
          loadingHand={loadingHand}
          update={(r) => update(r)}
          updateLive={(r) => update(r, false)}
          checkpoint={checkpoint}
          onDeselect={() => setSelectedId(null)}
          onDuplicate={duplicate}
          onDrawLast={() => void drawLast()}
          onDelete={() => remove()}
          onGenerateVoice={() => setModal({ kind: 'voice' })}
          onUploadVoice={() => voiceInput.current?.click()}
          onPlayVoice={playVoice}
          onUploadMusic={() => musicInput.current?.click()}
          onMusicLibrary={() => setModal({ kind: 'music' })}
          onGenerateMusic={() => {
            stopPlay();
            setModal({ kind: 'aimusic' });
          }}
          onPlayMusic={playMusic}
          musicPlaying={musicPlaying}
          onRatio={changeRatio}
          hands={hands}
          onHand={(id) => void selectHand(id)}
          onSlideHand={(id) => void selectSlideHand(id)}
        />
      </main>

      <SlideTimeline
        project={project}
        timeline={timeline}
        resources={resources}
        resVersion={resVersion}
        current={sceneIndex}
        onGo={goSlide}
        onAdd={addSlide}
        onMenu={onSlideMenu}
      />

      <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => {
        onImagePicked(e.target.files?.[0]);
        e.target.value = '';
      }} />
      <input ref={voiceInput} type="file" accept="audio/*" hidden onChange={(e) => {
        void onVoicePicked(e.target.files?.[0]);
        e.target.value = '';
      }} />
      <input ref={musicInput} type="file" accept="audio/*" hidden onChange={(e) => {
        onMusicPicked(e.target.files?.[0]);
        e.target.value = '';
      }} />
      <input ref={fontInput} type="file" accept={FONT_UPLOAD_TYPES} hidden onChange={(e) => {
        void onFontPicked(e.target.files?.[0]);
        e.target.value = '';
      }} />

      {modal?.kind === 'upload' && <UploadModal file={modal.file} onClose={() => setModal(null)} onAdd={addUpload} />}
      {modal?.kind === 'generate' && (
        modal.preset === 'characters' ? (
          <CharacterVariationsModal
            initialCharacter={null}
            characters={project.characters ?? []}
            credits={credits}
            projectId={project.id}
            onClose={() => setModal(null)}
            onSpend={(n) => setCredits((c) => c - n)}
            onAddVector={addGenerated}
            onSaveVector={saveGenerated}
            onAddImage={(blob, name, opts) => addUpload(blob, name, opts)}
            onSaveCharacter={saveCharacter}
          />
        ) : (
          <GenerateModal
            preset={modal.preset}
            credits={credits}
            onClose={() => setModal(null)}
            projectId={project.id}
            aspect={project.aspectRatio}
            characters={project.characters ?? []}
            onSpend={(n) => setCredits((c) => c - n)}
            onAddVector={addGenerated}
            onSaveVector={saveGenerated}
            onAddImage={(blob, name, opts) => addUpload(blob, name, opts)}
            onSaveCharacter={saveCharacter}
          />
        )
      )}
      {modal?.kind === 'characterVariations' && (
        <CharacterVariationsModal
          initialCharacter={modal.initialCharacter}
          characters={project.characters ?? []}
          credits={credits}
          projectId={project.id}
          onClose={() => setModal(null)}
          onSpend={(n) => setCredits((c) => c - n)}
          onAddVector={addGenerated}
          onSaveVector={saveGenerated}
          onAddImage={(blob, name, opts) => addUpload(blob, name, opts)}
          onSaveCharacter={saveCharacter}
        />
      )}
      {modal?.kind === 'voice' && (
        <VoiceModal
          slideNumber={sceneIndex + 1}
          initialText={scene.voice?.ai?.text ?? slideTexts}
          initialVoice={scene.voice?.ai}
          projectId={project.id}
          items={voiceItems}
          title={project.name}
          onClose={() => setModal(null)}
          onUse={useVoice}
        />
      )}
      {modal?.kind === 'export' && <ExportModal project={project} resources={resources} cache={renderCache.current} sceneIndex={sceneIndex} onClose={() => setModal(null)} />}
      {modal?.kind === 'story' && (
        <StoryWizard
          project={project}
          hands={hands}
          resources={resources}
          credits={credits}
          onSpend={(n) => setCredits((c) => c - n)}
          onClose={() => setModal(null)}
          onDone={(r, s) => {
            // Keep the current project safe before opening the story.
            void saveProject(project).catch(() => {});
            openProject(r.project, false);
            const flagged = r.project.scenes.filter((sc) => sc.attention).length;
            showToast(
              r.cancelled
                ? `Stopped. Kept ${r.slides} finished slide${r.slides === 1 ? '' : 's'}.`
                : `Your ${s.length}-minute story is ready — press play${flagged ? ` (${flagged} slide${flagged === 1 ? ' needs' : 's need'} attention)` : ''}`,
            );
          }}
        />
      )}
      {modal?.kind === 'aimusic' && (
        <MusicModal
          project={project}
          timeline={timeline}
          credits={credits}
          onSpend={(n) => setCredits((c) => c - n)}
          onClose={() => setModal(null)}
          onUse={(music) => {
            update((d) => void (d.music = music));
            setModal(null);
            showToast(`Music: ${music.name}`);
          }}
        />
      )}
      {modal?.kind === 'music' && (
        <MusicLibraryModal
          onClose={() => setModal(null)}
          onUse={(name, blob) => {
            update((d) => void (d.music = { name, blob, volume: d.music?.volume ?? 0.35 }));
            setModal(null);
            showToast(`Soundtrack: ${name}`);
          }}
        />
      )}
      {modal?.kind === 'gallery' && (
        <TemplateGallery
          initialRatio={project.aspectRatio}
          handId={project.handId}
          onBack={() => setModal({ kind: 'dashboard' })}
          onClose={() => setModal(null)}
          onCreate={(p) => openProject(p, false)}
        />
      )}
      {modal?.kind === 'dashboard' && (
        <DashboardModal
          handId={project.handId}
          onClose={() => setModal(null)}
          onOpen={(p) => openProject(p, p.id !== project.id || savedRef.current?.id === p.id)}
          onNew={() => setModal({ kind: 'gallery' })}
        />
      )}
      {modal?.kind === 'tutorial' && <TutorialModal onClose={() => setModal(null)} />}
      {modal?.kind === 'apiKey' && (
        <ApiKeyModal
          onClose={() => setModal(null)}
          onSaved={() => showToast('Google Gemini key connected!')}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

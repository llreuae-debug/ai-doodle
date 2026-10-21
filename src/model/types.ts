import type { DoodleDef } from '../library/doodles';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

/** Logical stage size per ratio. Positions are stored in these units; export scales the whole stage. */
export const STAGE_SIZE: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
};

export type Point = [number, number];

/** An ordered centreline the hand follows, in asset pixel space. */
export interface Stroke {
  points: Point[];
  /** Line thickness in asset px; the reveal brush is wider than this. */
  width: number;
}

/** An uploaded image, traced into strokes. Library doodles are DoodleDefs, not Assets. */
export interface Asset {
  id: string;
  source: 'upload';
  name: string;
  /** Asset pixel space: the art raster and the strokes share it. */
  width: number;
  height: number;
  /** A data: URL, so the project document is self-contained when saved. */
  artUrl: string;
  strokes: Stroke[];
  createdAt: number;
}

export type AnimationType = 'draw' | 'wipe' | 'slide' | 'fade' | 'pop' | 'none';

export interface ElementAnimation {
  type: AnimationType;
  durationMs: number | 'auto';
  delayMs: number;
  /** Speed multiplier for this item. Undefined = use slide speed. */
  speed?: number;
}

interface ElementBase {
  id: string;
  /** Centre, in stage px. */
  x: number;
  y: number;
  /** Degrees. */
  rotation: number;
  anim: ElementAnimation;
  hidden: boolean;
}

export interface DoodleElement extends ElementBase {
  kind: 'doodle';
  /** A library doodle id or an AI doodle id from project.custom. */
  defId: string;
  /** Colour fills on, or line art only. */
  color: boolean;
  /** Side of the square box, stage px. */
  size: number;
}

export interface ImageElement extends ElementBase {
  kind: 'image';
  assetId: string;
  /** Box width in stage px; height follows the image's aspect. */
  width: number;
}

export interface TextElement extends ElementBase {
  kind: 'text';
  text: string;
  font: string;
  /** Font size, stage px. */
  size: number;
  weight: 400 | 500 | 700;
  /** null = the board's ink colour. */
  fill: string | null;
}

export type SceneElement = DoodleElement | ImageElement | TextElement;

export type TransitionType = 'none' | 'fade' | 'wipe' | 'push' | 'iris';
export type BoardId = 'white' | 'black' | 'green' | 'grid' | 'kraft';

export interface WordTime {
  w: string;
  /** Seconds from the start of the voice. */
  start: number;
  end: number;
}

/** A slide's voiceover: an uploaded recording or a Google AI voice (both are audio files). */
export interface Voice {
  kind: 'file';
  name: string;
  blob: Blob;
  durationMs: number;
  /** Google AI voice: what it says, which voice, and when each word is spoken. */
  ai?: { text: string; voiceId: string; language: string; speed: number; words: WordTime[] };
}

export type Mood = 'calm' | 'happy' | 'tense' | 'sad' | 'exciting';

export interface Scene {
  id: string;
  /** How this scene replaces the previous one. */
  transition: TransitionType;
  /** Multiplies drawing speed for every element. */
  speed: number;
  /** Pause after the last element finishes. */
  holdMs: number;
  /** Stretch the scene to last as long as its voiceover. */
  syncVoice: boolean;
  /** When syncVoice is on, slow the drawing to fill up to 85% of voice length. Default true. */
  stretchToVoice?: boolean;
  /** Pen sound on this slide. Default true. */
  drawSound?: boolean;
  voice: Voice | null;
  /** This slide's drawing hand: a hand id, null for no hand, absent to use the project's. */
  handId?: string | null;
  /** Mood for background music; absent = Auto (the story's mood for this slide). */
  mood?: Mood;
  /** The story's mood for this slide (set by the Story Wizard), used when mood is Auto. */
  storyMood?: Mood;
  /** Something went wrong building this slide (Story Wizard); shown as a badge on its card. */
  attention?: string;
  elements: SceneElement[];
}

/** How an AI music track was made, so it can be refitted to a new video length without regenerating. */
export interface MusicRecipe {
  style: string;
  mode: 'whole' | 'by-section';
  seed: number;
  tempo?: number;
  intensity?: 'very-soft' | 'soft' | 'medium';
  instruments: string[];
  noPercussion: boolean;
  extra: string;
  sections: { fromSec: number; toSec: number; mood: Mood }[];
  /** Video length (s) the track was built for. */
  fittedSec: number;
}

export interface Music {
  name: string;
  blob: Blob;
  /** 0–1. */
  volume: number;
  /** Drop to 25% while a voiceover plays. */
  duck?: boolean;
  /** Fade out over the last seconds of the video. */
  fadeOut?: boolean;
  ai?: MusicRecipe;
}

/** A reusable AI character: the same look across poses and slides. */
export interface CharacterSheet {
  id: string;
  name: string;
  look: string;
  style: string;
  /** PNG data URL of the first drawing, sent as the reference for new poses. */
  reference: string;
}

/** What the Story Wizard made, kept for regenerating slides and music. */
export interface StoryInfo {
  title: string;
  logline: string;
  type: string;
  audience: string;
  tone: string;
  language: string;
  acts: { name: string; slides: number[] }[];
}

/** A font the user uploaded; registered under `family` with the FontFace API. */
export interface CustomFont {
  id: string;
  family: string;
  name: string;
  blob: Blob;
}

export type DrawSoundType = 'marker' | 'chalk' | 'pencil' | 'soft' | 'ballpoint' | 'custom' | 'none';

export interface DrawSoundConfig {
  enabled: boolean;
  /** Volume 0–1 (default 0.35). */
  volume: number;
  /** Sound type: Marker · Chalk · Pencil · Soft marker · Ballpoint · Custom · None (default 'marker'). */
  type?: DrawSoundType;
  /** Mute toggle. Mute keeps the chosen volume. */
  muted?: boolean;
  /** Pen sound drops to 40% while narration plays (default true). */
  quietDuringVoice?: boolean;
  /** Marker cap-off sound before the first drawing (default off). */
  capSound?: boolean;
  /** Uploaded custom sound as a data URL (<= 2MB, <= 10s). */
  customUrl?: string;
  customName?: string;
}

export interface Project {
  schemaVersion: 1;
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  board: BoardId;
  /** null = No Hand. */
  handId: string | null;
  /** Default drawing speed for new slides (default 1). */
  defaultSpeed?: number;
  /** Pen/marker drawing sound configuration. */
  drawSound: DrawSoundConfig;
  music: Music | null;
  /** Uploaded images. */
  assets: Record<string, Asset>;
  /** AI-generated doodles (newest first). */
  custom: DoodleDef[];
  /** Uploaded fonts. */
  fonts: CustomFont[];
  /** AI characters that can be drawn again in new poses. */
  characters?: CharacterSheet[];
  story?: StoryInfo;
  scenes: Scene[];
  createdAt: number;
  updatedAt: number;
}

/** Parameters for the illustrated hand art (src/hands/handArt.ts). */
export interface HandLook {
  skin: string;
  build: 'male' | 'female';
  style: 'real' | 'cartoon';
  /** Local y (along the arm) where the sleeve starts; the wrist is about 240. */
  sleeve?: { color: string; from: number; cuff?: string; fur?: boolean };
  tool: 'marker' | 'pen' | 'chalk' | 'quill';
  toolColor?: string;
  watch?: boolean;
  bracelet?: boolean;
  tattoo?: boolean;
  nails?: { color: string; long?: boolean };
}

export interface Hand {
  id: string;
  name: string;
  /** 'pro' shows a star in the picker; nothing is locked until plans exist (Phase 2). */
  tier: 'free' | 'pro';
  /** Illustrated version, always available. */
  look: HandLook;
  group: HandGroup;
  /** Cut-out photo version from public/hands/hands.json. When set, it is used instead of `look`. */
  photo?: HandPhoto;
}

export type HandGroup = 'Realistic' | 'Chalk' | 'Cartoon' | 'Seasonal';

/** One entry of public/hands/hands.json, made by scripts/hands/prepare-hands.mjs. */
export interface HandPhoto {
  /** 2048×2048 WebP, transparent, every hand in the same pose. */
  file: string;
  /** PNG fallback for browsers without WebP decoding. */
  png: string;
  thumb: string;
  /** Pen tip in image px. */
  tipX: number;
  tipY: number;
  /** Unit vector along the forearm, pointing off the image. */
  arm?: [number, number];
}

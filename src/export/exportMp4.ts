import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
import { createSurface } from '../engine/canvas';
import { Renderer } from '../engine/renderer';
import type { Resources } from '../engine/resources';
import type { Timeline } from '../engine/timeline';
import { loadFont } from '../library/fonts';
import { STAGE_SIZE, type AspectRatio, type Project } from '../model/types';

const UI_YIELD_EVERY = 10;

export type Resolution = '720p' | '1080p' | '1440p' | '2160p';

/** 'pro' only shows a star until plans exist. */
export const RESOLUTIONS: Record<Resolution, { label: string; shortSide: number; tier: 'free' | 'pro' }> = {
  '720p': { label: '720p', shortSide: 720, tier: 'free' },
  '1080p': { label: '1080p', shortSide: 1080, tier: 'free' },
  '1440p': { label: '2k', shortSide: 1440, tier: 'pro' },
  '2160p': { label: '4k', shortSide: 2160, tier: 'pro' },
};

export function outputSize(ratio: AspectRatio, resolution: Resolution): { width: number; height: number } {
  const stage = STAGE_SIZE[ratio];
  const k = RESOLUTIONS[resolution].shortSide / Math.min(stage.width, stage.height);
  // H.264 needs even dimensions.
  const even = (v: number) => Math.round(v / 2) * 2;
  return { width: even(stage.width * k), height: even(stage.height * k) };
}

export interface ExportOptions {
  resolution: Resolution;
  fps?: number;
  /** The mixed soundtrack (see audio/mix.ts), or null for a silent video. */
  audio?: AudioBuffer | null;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Waits for every text font the project uses, so the first frames don't render in a fallback font. */
export async function loadProjectFonts(project: Project): Promise<void> {
  const fonts = new Map<string, [string, number, string]>();
  for (const scene of project.scenes) {
    for (const el of scene.elements) {
      if (el.kind !== 'text') continue;
      const key = `${el.weight} ${el.font}`;
      fonts.set(key, [el.font, el.weight, `${fonts.get(key)?.[2] ?? ''}${el.text}`]);
    }
  }
  await Promise.all([...fonts.values()].map(([family, weight, text]) => loadFont(family, weight, text)));
}

/**
 * Renders every frame with the shared Renderer and encodes H.264 (+ AAC) into an MP4, in the browser.
 * Frames are rendered as fast as the encoder accepts them, not in real time. The tab must stay open.
 */
export async function exportMp4(
  project: Project,
  timeline: Timeline,
  resources: Resources,
  { resolution, fps = 30, audio = null, onProgress, signal }: ExportOptions,
): Promise<Blob> {
  const { width, height } = outputSize(project.aspectRatio, resolution);
  if (!(await canEncodeVideo('avc', { width, height, quality: QUALITY_HIGH }))) {
    throw new Error(`This browser can't encode ${width}×${height} H.264 video. Try desktop Chrome or Edge, or a lower resolution.`);
  }
  const withAudio = !!audio && (await canEncodeAudio('aac', { numberOfChannels: audio.numberOfChannels, sampleRate: audio.sampleRate }));
  await loadProjectFonts(project);

  const surface = createSurface(width, height);
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const video = new CanvasSource(surface.canvas, { codec: 'avc', quality: QUALITY_HIGH });
  output.addVideoTrack(video, { frameRate: fps });
  const sound = withAudio ? new AudioBufferSource({ codec: 'aac', quality: QUALITY_MEDIUM }) : null;
  if (sound) output.addAudioTrack(sound);
  await output.start();

  const renderer = new Renderer(resources);
  const frames = Math.max(1, Math.ceil((timeline.duration / 1000) * fps));
  try {
    if (sound && audio) await sound.add(audio);
    for (let i = 0; i < frames; i++) {
      signal?.throwIfAborted();
      renderer.render(surface.ctx, project, timeline, (i * 1000) / fps, width, height, { showHand: true });
      await video.add(i / fps, 1 / fps);
      onProgress?.((i + 1) / frames);
      // Let the page repaint the progress bar and handle a Cancel click.
      if (i % UI_YIELD_EVERY === 0) await new Promise((r) => setTimeout(r, 0));
    }
    await output.finalize();
  } catch (err) {
    await output.cancel();
    throw err;
  }
  return new Blob([output.target.buffer!], { type: 'video/mp4' });
}

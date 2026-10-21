import type { Resources } from '../engine/resources';
import type { Timeline } from '../engine/timeline';
import type { Mood, Project, Scene } from '../model/types';
import { penBankFor, penPath, projectSeed, SAMPLE_RATE, schedulePen } from './penEngine';

/** Music sits under narration: it ducks to this share of its volume while a voiceover plays. */
export const DUCK = 0.25;
/** Ramp time for ducking and mood changes. */
const RAMP_S = 0.3;
/** "Fade out at end": music fades over the video's last seconds. */
const END_FADE_S = 4;
/** Music volume by slide mood (the story's mood when the slide's own is Auto). */
const MOOD_LEVEL: Record<Mood, number> = { calm: 1, happy: 1, tense: 0.85, sad: 0.8, exciting: 1.15 };
export const sceneMood = (s: Scene): Mood | undefined => s.mood ?? s.storyMood;

const decodeCache = new WeakMap<Blob, Promise<AudioBuffer>>();
function decode(ctx: BaseAudioContext, blob: Blob): Promise<AudioBuffer> {
  let p = decodeCache.get(blob);
  if (!p) {
    p = blob.arrayBuffer().then((buf) => ctx.decodeAudioData(buf));
    decodeCache.set(blob, p);
  }
  return p;
}

export interface MixOptions {
  includeDrawSound?: boolean;
  /** Called when something can't be included (e.g. the pen sound didn't load); the rest still plays. */
  onWarning?: (message: string) => void;
}

/**
 * The whole soundtrack as one stereo buffer, used by both preview and MP4 export:
 * - Master limiter (DynamicsCompressorNode at -1 dB) to stop clipping
 * - Background music bus (its volume set per slide by mood, ducked to 25% under each voiceover, faded out at the end)
 * - Voiceover bus at 100% from each slide start
 * - Pen sound bus: recorded pen samples driven by the hand's strokes (audio/penEngine.ts), ducked to
 *   40% under narration with 0.2 s ramps when "Quieter during voiceover" is on
 * Returns null when there is nothing to hear.
 */
export async function mixSoundtrack(
  project: Project,
  timeline: Timeline,
  resources: Resources,
  options?: MixOptions,
): Promise<AudioBuffer | null> {
  const durationS = timeline.duration / 1000;
  if (durationS <= 0) return null;
  const voices = project.scenes.flatMap((scene, i) =>
    scene.voice?.kind === 'file' && timeline.scenes[i] ? [{ blob: scene.voice.blob, at: timeline.scenes[i].start / 1000 }] : [],
  );

  const drawSoundEnabled =
    options?.includeDrawSound !== false &&
    project.drawSound?.enabled !== false &&
    !project.drawSound?.muted &&
    project.drawSound?.type !== 'none' &&
    (project.drawSound?.volume ?? 0) > 0;

  const pen = drawSoundEnabled ? penPath(project, timeline, resources) : [];

  if (!project.music && voices.length === 0 && pen.length === 0) return null;

  const ctx = new OfflineAudioContext(2, Math.ceil(durationS * SAMPLE_RATE), SAMPLE_RATE);

  // Master limiter (DynamicsCompressor, threshold -3 dB) to stop clipping
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-1, 0);
  limiter.knee.setValueAtTime(6, 0);
  limiter.ratio.setValueAtTime(20, 0);
  limiter.attack.setValueAtTime(0.001, 0);
  limiter.release.setValueAtTime(0.1, 0);
  limiter.connect(ctx.destination);

  // Master bus
  const masterBus = ctx.createGain();
  masterBus.gain.setValueAtTime(1, 0);
  masterBus.connect(limiter);

  // Voice bus
  const voiceBus = ctx.createGain();
  voiceBus.gain.setValueAtTime(1, 0);
  voiceBus.connect(masterBus);

  // Music bus
  const musicBus = ctx.createGain();
  musicBus.gain.setValueAtTime(1, 0);
  musicBus.connect(masterBus);

  // Pen sound bus
  const penSoundBus = ctx.createGain();
  penSoundBus.gain.setValueAtTime(1, 0);
  penSoundBus.connect(masterBus);

  const voiceBuffers = await Promise.all(voices.map((v) => decode(ctx, v.blob)));

  // Route voices to voiceBus
  voices.forEach((v, i) => {
    const src = ctx.createBufferSource();
    src.buffer = voiceBuffers[i];
    src.connect(voiceBus);
    src.start(v.at);
  });

  // Route music to musicBus
  if (project.music) {
    const music = await decode(ctx, project.music.blob);
    const src = ctx.createBufferSource();
    src.buffer = music;
    src.loop = true;
    const gain = ctx.createGain();
    const full = project.music.volume;
    const duck = project.music.duck !== false;
    const level = (i: number) => {
      const m = project.scenes[i] && sceneMood(project.scenes[i]);
      return m ? MOOD_LEVEL[m] : 1;
    };
    gain.gain.value = full * level(0);
    // Per slide: its mood level from the slide start, ducked while its voiceover plays.
    let v = 0;
    timeline.scenes.forEach((t, i) => {
      const at = t.start / 1000;
      const base = full * level(i);
      const voice = voices[v] && Math.abs(voices[v].at - at) < 1e-6 ? v++ : -1;
      gain.gain.setTargetAtTime(voice >= 0 && duck ? base * DUCK : base, at, RAMP_S / 3);
      if (voice >= 0 && duck) gain.gain.setTargetAtTime(base, at + voiceBuffers[voice].duration, RAMP_S / 3);
    });
    const fade = ctx.createGain();
    if (project.music.fadeOut !== false && durationS > END_FADE_S) {
      fade.gain.setValueAtTime(1, durationS - END_FADE_S);
      fade.gain.linearRampToValueAtTime(0, durationS);
    }
    src.connect(gain).connect(fade).connect(musicBus);
    src.start(0);
  }

  // Pen sound scheduling & voiceover ducking
  if (pen.length > 0) {
    // Toggle "Quieter during voiceover" (default on): pen sound drops to 40% of its volume while narration plays, with 0.2 s ramps
    const quietDuringVoice = project.drawSound?.quietDuringVoice !== false;
    if (quietDuringVoice && voices.length > 0) {
      for (let i = 0; i < voices.length; i++) {
        const at = voices[i].at;
        const endVoice = at + voiceBuffers[i].duration;
        penSoundBus.gain.setTargetAtTime(0.4, at, 0.2 / 3);
        penSoundBus.gain.setTargetAtTime(1.0, endVoice, 0.2 / 3);
      }
    }

    try {
      const bank = await penBankFor(project.drawSound, ctx);
      if (bank) {
        const first = pen[0].t0;
        schedulePen(ctx, penSoundBus, pen, bank, {
          volume: project.drawSound.volume ?? 0.35,
          seed: projectSeed(project.id),
          capOffAt: project.drawSound.capSound ? first - 0.45 : undefined,
        });
      }
    } catch {
      // The video still draws (and plays voice and music) without the pen sound.
      options?.onWarning?.("Pen sound couldn't load");
    }
  }

  return ctx.startRendering();
}

import { sceneMood } from '../audio/mix';
import type { Timeline } from '../engine/timeline';
import type { Mood, Music, MusicRecipe, Project } from '../model/types';
import { fetchMedia, generateMusic, type MusicResult } from './ai';

/** Music is a little longer than the video, so it can fade out gently. */
export const MUSIC_TAIL_SEC = 2;
export const DEFAULT_MUSIC_VOLUME = 0.22;
/** Refit is offered when the video length and the track differ by more than this. */
export const REFIT_TOLERANCE_SEC = 1;

export const MOOD_LABELS: Record<Mood, string> = { calm: 'Calm', happy: 'Happy', tense: 'Tense', sad: 'Sad', exciting: 'Exciting' };
export const MOOD_COLORS: Record<Mood, string> = { calm: '#7EC8E3', happy: '#F2C14E', tense: '#9B7FD4', sad: '#7A8FA6', exciting: '#E4572E' };

/** Music settings shown in the modal; the server's style ids (server/api/music.ts). */
export const MUSIC_STYLE_LABELS: Record<string, string> = {
  'calm-piano': 'Calm piano',
  'acoustic-guitar': 'Soft acoustic guitar',
  'warm-strings': 'Warm strings',
  'lofi-gentle': 'Lo-fi gentle',
  'ambient-pads': 'Ambient pads',
  'playful-kids': 'Playful kids',
  'inspiring-cinematic': 'Inspiring cinematic (soft)',
  'corporate-light': 'Corporate light',
  'eastern-ambient': 'Eastern ambient',
  'humming-pad': 'Voice-free humming pad',
};

/** Each slide's mood for music: its own, else the story's (Auto), else calm. */
export const slideMood = (project: Project, i: number): Mood => (project.scenes[i] ? sceneMood(project.scenes[i]) : undefined) ?? 'calm';

/**
 * Mood sections over the video: consecutive slides with the same mood become one section.
 * Times are seconds on the video timeline.
 */
export function moodSections(project: Project, timeline: Timeline): { fromSec: number; toSec: number; mood: Mood; slides: [number, number] }[] {
  const out: { fromSec: number; toSec: number; mood: Mood; slides: [number, number] }[] = [];
  timeline.scenes.forEach((t, i) => {
    const mood = slideMood(project, i);
    const last = out[out.length - 1];
    if (last && last.mood === mood) {
      last.toSec = t.end / 1000;
      last.slides[1] = i + 1;
    } else out.push({ fromSec: t.start / 1000, toSec: t.end / 1000, mood, slides: [i + 1, i + 1] });
  });
  return out;
}

/** The track as project music, keeping its recipe so it can be refitted later. */
export async function musicFromResult(r: MusicResult, recipe: Omit<MusicRecipe, 'seed' | 'sections'>, prev: Music | null): Promise<Music> {
  return {
    name: `${MUSIC_STYLE_LABELS[recipe.style] ?? 'AI music'} · ${formatClock(r.durationSec)}`,
    blob: await fetchMedia(r.audioUrl),
    volume: prev?.volume ?? DEFAULT_MUSIC_VOLUME,
    duck: prev?.duck ?? true,
    fadeOut: prev?.fadeOut ?? true,
    ai: { ...recipe, seed: r.seed, sections: r.sections.map(({ fromSec, toSec, mood }) => ({ fromSec, toSec, mood })) },
  };
}

/**
 * Rebuilds an AI track to the video's current length from the same loops (same style, seed and
 * moods, so the server reuses its cached clips and doesn't generate anything new).
 */
export async function refitMusic(project: Project, timeline: Timeline): Promise<{ music: Music; generated: number }> {
  const music = project.music;
  if (!music?.ai) throw new Error('Only AI music can be refitted.');
  const totalSec = timeline.duration / 1000;
  const sections =
    music.ai.mode === 'whole' ? [{ fromSec: 0, toSec: totalSec, mood: music.ai.sections[0]?.mood ?? 'calm' }] : moodSections(project, timeline).map(({ fromSec, toSec, mood }) => ({ fromSec, toSec, mood }));
  const r = await generateMusic({
    projectId: project.id,
    mode: music.ai.mode,
    totalSec,
    sections,
    style: music.ai.style,
    tempo: music.ai.tempo,
    intensity: music.ai.intensity,
    instruments: music.ai.instruments,
    noPercussion: music.ai.noPercussion,
    vocalsOff: true,
    extra: music.ai.extra,
    seed: music.ai.seed,
  });
  const { seed: _seed, sections: _sections, ...rest } = music.ai;
  return { music: await musicFromResult(r, { ...rest, fittedSec: totalSec }, music), generated: r.generated };
}

export const formatClock = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

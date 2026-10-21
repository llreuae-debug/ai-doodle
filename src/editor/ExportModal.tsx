import { Download, Inbox, Play, Star, Video, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { mixSoundtrack } from '../audio/mix';
import { projectTimeline } from '../engine/projectTiming';
import type { Resources } from '../engine/resources';
import { exportMp4, outputSize, RESOLUTIONS, type Resolution } from '../export/exportMp4';
import type { Project } from '../model/types';
import { ensureResources } from '../services/loaders';
import { Modal } from './modals';

/** A finished render, kept while the editor is open so reopening Export still offers Play and Download. */
export interface RenderResult {
  url: string;
  mb: number;
  /** The project version it was rendered from; an edit makes it stale. */
  updatedAt: number;
}
export type RenderCache = Map<Resolution, RenderResult>;

type RowState = { kind: 'idle' } | { kind: 'rendering'; progress: number; stage: string } | { kind: 'error'; message: string };

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function ExportModal({ project, resources, cache, onClose }: { project: Project; resources: Resources; cache: RenderCache; onClose: () => void }) {
  const [rows, setRows] = useState<Partial<Record<Resolution, RowState>>>({});
  const [, force] = useState(0);
  const [playing, setPlaying] = useState<Resolution | null>(null);
  const [includeDrawSound, setIncludeDrawSound] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const hasVoice = project.scenes.some((s) => s.voice?.kind === 'file');
  const hasMusic = Boolean(project.music);
  const penSoundVol = Math.round((project.drawSound?.volume ?? 0.35) * 100);
  const penSoundConfigured =
    project.drawSound?.enabled !== false &&
    !project.drawSound?.muted &&
    project.drawSound?.type !== 'none' &&
    (project.drawSound?.volume ?? 0) > 0;
  const penSoundIncluded = includeDrawSound && penSoundConfigured;

  const fresh = (r: Resolution) => {
    const hit = cache.get(r);
    return hit && hit.updatedAt === project.updatedAt ? hit : null;
  };
  const busy = Object.values(rows).some((s) => s?.kind === 'rendering');
  const name = (project.name || 'video').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'video';
  const set = (r: Resolution, s: RowState) => setRows((x) => ({ ...x, [r]: s }));

  const render = async (r: Resolution) => {
    const abort = new AbortController();
    abortRef.current = abort;
    set(r, { kind: 'rendering', progress: 0, stage: 'Preparing' });
    try {
      // Picture and sound must come from the same, fully loaded timeline.
      await ensureResources(project, resources, () => {});
      const tl = projectTimeline(project, resources);
      set(r, { kind: 'rendering', progress: 0, stage: 'Mixing sound' });
      const audio = await mixSoundtrack(project, tl, resources, { includeDrawSound });
      const blob = await exportMp4(project, tl, resources, {
        resolution: r,
        audio,
        signal: abort.signal,
        onProgress: (progress) => set(r, { kind: 'rendering', progress, stage: 'Rendering' }),
      });
      const old = cache.get(r);
      if (old) URL.revokeObjectURL(old.url);
      cache.set(r, { url: URL.createObjectURL(blob), mb: blob.size / 1048576, updatedAt: project.updatedAt });
      set(r, { kind: 'idle' });
      force((n) => n + 1);
    } catch (err) {
      set(r, abort.signal.aborted ? { kind: 'idle' } : { kind: 'error', message: errText(err) });
    } finally {
      abortRef.current = null;
    }
  };

  const playingResult = playing ? fresh(playing) : null;

  return (
    <Modal title="Export" subtitle="Render and download your video" icon={<Inbox size={22} />} size="lg" onClose={onClose}>
      <div className="export-audio-summary" style={{ margin: '0 0 1rem', padding: '0.6rem 0.85rem', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border)' }}>
        <div style={{ color: 'var(--text-muted)' }}>
          Includes: voice {hasVoice ? '✓' : '—'} · music {hasMusic ? '✓' : '—'} · pen sound {penSoundIncluded ? `✓ (${penSoundVol}%)` : '—'}
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={includeDrawSound}
            onChange={(e) => setIncludeDrawSound(e.target.checked)}
          />
          Include pen drawing sound in this export
        </label>
      </div>
      <div className="export-rows">
        {(Object.keys(RESOLUTIONS) as Resolution[]).map((r) => {
          const def = RESOLUTIONS[r];
          const state = rows[r] ?? { kind: 'idle' };
          const done = fresh(r);
          const { width, height } = outputSize(project.aspectRatio, r);
          return (
            <div className="export-row" key={r}>
              <div className="er-label">
                <span className="er-name">{def.label}</span>
                {def.tier === 'pro' && (
                  <span className="pro-badge inline" title="Pro">
                    <Star size={11} fill="currentColor" strokeWidth={0} />
                  </span>
                )}
                <span className="er-size">
                  {width}×{height}
                  {done ? ` · ${done.mb.toFixed(1)} MB` : ''}
                </span>
              </div>
              {state.kind === 'rendering' ? (
                <div className="er-progress" role="status">
                  <div className="bar">
                    <i style={{ width: `${Math.round(state.progress * 100)}%` }} />
                  </div>
                  <span>
                    {state.stage} {Math.round(state.progress * 100)}%
                  </span>
                  <button type="button" className="btn sm" onClick={() => abortRef.current?.abort()}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="er-actions">
                  <button type="button" className="btn" onClick={() => void render(r)} disabled={busy}>
                    <Video size={18} fill="currentColor" />
                    {done ? 'Re-render' : 'Render'}
                  </button>
                  <button type="button" className="btn" disabled={!done} onClick={() => setPlaying(r)}>
                    <Play size={16} fill="currentColor" />
                    Play
                  </button>
                  {done ? (
                    <a className="btn" href={done.url} download={`${name}-${r}.mp4`}>
                      <Download size={18} />
                      Download
                    </a>
                  ) : (
                    <button type="button" className="btn" disabled>
                      <Download size={18} />
                      Download
                    </button>
                  )}
                </div>
              )}
              {state.kind === 'error' && <p className="err er-error">Render failed: {state.message}</p>}
            </div>
          );
        })}
      </div>
      {playingResult && (
        <div className="export-player">
          <video src={playingResult.url} controls autoPlay className="export-video" />
          <button type="button" className="btn icon ghost" aria-label="Close player" onClick={() => setPlaying(null)}>
            <X size={18} />
          </button>
        </div>
      )}
      <p className="note">MP4 (H.264 + AAC), 30 fps. Frames render one by one, so keep this tab open until it finishes. Desktop Chrome or Edge works best.</p>
    </Modal>
  );
}

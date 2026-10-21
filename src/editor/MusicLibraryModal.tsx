import { Library, LoaderCircle, Pause, Play, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { renderTrack, toWav, trackSeconds, TRACKS, type TrackDef } from '../audio/musicLibrary';
import { Modal } from './modals';

const rendered = new Map<string, Promise<AudioBuffer>>();
const getTrack = (t: TrackDef) => {
  let p = rendered.get(t.id);
  if (!p) {
    p = renderTrack(t);
    rendered.set(t.id, p);
  }
  return p;
};

export function MusicLibraryModal({ onClose, onUse }: { onClose: () => void; onUse: (name: string, blob: Blob) => void }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);

  const stop = () => {
    try {
      srcRef.current?.stop();
    } catch {
      // Already stopped.
    }
    srcRef.current = null;
    setPlaying(null);
  };
  useEffect(
    () => () => {
      stop();
      void ctxRef.current?.close();
    },
    [],
  );

  const preview = async (t: TrackDef) => {
    if (playing === t.id) return stop();
    stop();
    setLoading(t.id);
    ctxRef.current ??= new AudioContext();
    const ctx = ctxRef.current;
    void ctx.resume();
    const buffer = await getTrack(t);
    setLoading(null);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(ctx.destination);
    src.start();
    srcRef.current = src;
    setPlaying(t.id);
  };

  const use = async (t: TrackDef) => {
    setLoading(t.id);
    const buffer = await getTrack(t);
    setLoading(null);
    stop();
    onUse(`${t.name} (${t.mood})`, toWav(buffer));
  };

  return (
    <Modal title="Soundtrack library" subtitle="Royalty-free tracks made for Ai Doodle. They loop under the whole video." icon={<Library size={22} />} onClose={onClose}>
      <div className="track-list">
        {TRACKS.map((t) => (
          <div className="track-row" key={t.id}>
            <button type="button" className="btn icon" aria-label={playing === t.id ? `Stop ${t.name}` : `Play ${t.name}`} onClick={() => void preview(t)}>
              {loading === t.id ? <LoaderCircle size={18} className="spin" /> : playing === t.id ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <div className="track-text">
              <b>
                {t.name}
                {t.tier === 'pro' && (
                  <span className="pro-badge inline" title="Pro">
                    <Star size={11} fill="currentColor" strokeWidth={0} />
                  </span>
                )}
              </b>
              <small>
                {t.mood} · {t.bpm} bpm · {Math.round(trackSeconds(t))} s loop
              </small>
            </div>
            <button type="button" className="btn sm accent" onClick={() => void use(t)} disabled={loading === t.id}>
              Use track
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

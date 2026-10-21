import { Ban, LoaderCircle, Star } from 'lucide-react';
import { useMemo } from 'react';
import { HAND_GROUPS } from '../hands/catalog';
import { HAND_THUMB_VIEWBOX, handSvg } from '../hands/handArt';
import type { Hand, HandGroup } from '../model/types';

interface Props {
  hands: Hand[];
  /** null = No Hand. */
  selectedId: string | null;
  loadingId: string | null;
  onSelect: (id: string | null) => void;
}

interface Option {
  id: string | null;
  name: string;
  pro: boolean;
  thumb: string | null;
}

const thumbOf = (h: Hand) => h.photo?.thumb ?? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(handSvg(h.look, HAND_THUMB_VIEWBOX))}`;

/** Hands grouped Realistic / Chalk / Cartoon / Seasonal, with No Hand first. Thumbnails load lazily. */
export function HandPicker({ hands, selectedId, loadingId, onSelect }: Props) {
  const groups = useMemo(
    () =>
      HAND_GROUPS.map((group): [HandGroup, Option[]] => [
        group,
        hands.filter((h) => h.group === group).map((h) => ({ id: h.id, name: h.name, pro: h.tier === 'pro', thumb: thumbOf(h) })),
      ]).filter(([, list]) => list.length > 0),
    [hands],
  );

  const tile = (o: Option) => {
    const selected = o.id === selectedId;
    return (
      <button
        type="button"
        key={o.id ?? 'none'}
        role="option"
        aria-selected={selected}
        className={selected ? 'hand-tile selected' : 'hand-tile'}
        onClick={() => onSelect(o.id)}
        disabled={loadingId !== null}
      >
        <span className="hand-thumb">
          {o.thumb ? <img src={o.thumb} alt="" loading="lazy" decoding="async" /> : <Ban size={28} className="hand-none" />}
          {o.id !== null && o.id === loadingId && <LoaderCircle size={20} className="spin hand-loading" />}
        </span>
        {o.pro && (
          <span className="pro-badge" title="Pro">
            <Star size={11} fill="currentColor" strokeWidth={0} />
          </span>
        )}
        <span className="hand-label">{o.name}</span>
      </button>
    );
  };

  return (
    <div className="hand-grid" role="listbox" aria-label="Drawing hand">
      {tile({ id: null, name: 'No Hand', pro: false, thumb: null })}
      {groups.map(([group, list]) => [
        <div key={`h-${group}`} className="hand-group" role="presentation">
          {group}
        </div>,
        ...list.map(tile),
      ])}
    </div>
  );
}

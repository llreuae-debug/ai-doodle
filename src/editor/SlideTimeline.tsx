import { MoreVertical, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FINISHED, Renderer } from '../engine/renderer';
import type { Resources } from '../engine/resources';
import type { Timeline } from '../engine/timeline';
import { STAGE_SIZE, type Project } from '../model/types';
import { formatTime } from './shared';

const CARD_MAX_H = 112;
const CARD_W = 200;

export type SlideMenuAction = 'duplicate' | 'left' | 'right' | 'delete';

interface Props {
  project: Project;
  timeline: Timeline;
  resources: Resources;
  resVersion: number;
  current: number;
  onGo: (index: number) => void;
  onAdd: () => void;
  onMenu: (index: number, action: SlideMenuAction) => void;
}

export function SlideTimeline({ project, timeline, resources, resVersion, current, onGo, onAdd, onMenu }: Props) {
  const renderer = useMemo(() => new Renderer(resources), [resources]);
  const stage = STAGE_SIZE[project.aspectRatio];
  const cardH = Math.min(CARD_MAX_H, Math.round((CARD_W * stage.height) / stage.width));
  const cardW = Math.round((cardH * stage.width) / stage.height);
  const [menu, setMenu] = useState<{ index: number; left: number; top: number } | null>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);

  // Thumbnails redraw a beat after edits settle, like Chalkline.
  useEffect(() => {
    const id = window.setTimeout(() => {
      project.scenes.forEach((_, i) => {
        const c = canvases.current[i];
        const ctx = c?.getContext('2d');
        if (c && ctx) renderer.renderScene(ctx, project, timeline, i, FINISHED, c.width, c.height, { showHand: false });
      });
    }, 120);
    return () => window.clearTimeout(id);
  }, [renderer, project, timeline, resVersion, cardW, cardH]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as Element).closest('.menu')) setMenu(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  const openMenu = (index: number, anchor: Element) => {
    const r = anchor.getBoundingClientRect();
    setMenu({ index, left: Math.min(r.left, window.innerWidth - 190), top: Math.max(8, r.top - 200) });
  };

  const n = project.scenes.length;
  return (
    <footer className="timeline" aria-label="Slides">
      <div className="ttrack">
        {project.scenes.map((s, i) => (
          <div className="tslot" key={s.id}>
            <div className="ttime">
              {i === current && <b />}
              {formatTime(timeline.scenes[i]?.start ?? 0)}
            </div>
            <button
              type="button"
              className="slidecard"
              aria-current={i === current}
              aria-label={`Slide ${i + 1}`}
              style={{ width: cardW, height: cardH }}
              onClick={(e) => {
                if ((e.target as Element).closest('[data-menu]')) return;
                onGo(i);
              }}
            >
              <canvas
                ref={(el) => {
                  canvases.current[i] = el;
                }}
                width={cardW * 2}
                height={cardH * 2}
              />
              <span className="snum">{i + 1}</span>
              {project.scenes[i]?.attention && (
                <span className="attention" title={project.scenes[i].attention}>
                  Needs attention
                </span>
              )}
              <span className="sdur">{(((timeline.scenes[i]?.end ?? 0) - (timeline.scenes[i]?.start ?? 0)) / 1000).toFixed(1)}s</span>
              <span
                className="kebab"
                data-menu
                role="button"
                tabIndex={0}
                aria-label={`Slide ${i + 1} options`}
                onClick={(e) => {
                  e.stopPropagation();
                  openMenu(i, e.currentTarget);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    openMenu(i, e.currentTarget);
                  }
                }}
              >
                <MoreVertical size={18} />
              </span>
            </button>
          </div>
        ))}
        <div className="tslot">
          <div className="ttime">{formatTime(timeline.duration)}</div>
          <button type="button" className="addslide" aria-label="Add slide" style={{ width: cardW, height: cardH }} onClick={onAdd}>
            <span>
              <Plus size={20} />
            </span>
          </button>
        </div>
      </div>
      {menu && (
        <div className="menu" role="menu" style={{ left: menu.left, top: menu.top }}>
          {(
            [
              ['duplicate', 'Duplicate slide', false],
              ['left', 'Move left', menu.index === 0],
              ['right', 'Move right', menu.index === n - 1],
              ['delete', 'Delete slide', n < 2],
            ] as const
          ).map(([action, label, disabled]) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className={action === 'delete' ? 'danger' : undefined}
              disabled={disabled}
              autoFocus={action === 'duplicate'}
              onClick={() => {
                setMenu(null);
                onMenu(menu.index, action);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </footer>
  );
}

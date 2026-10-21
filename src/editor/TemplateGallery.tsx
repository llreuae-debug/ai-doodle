import { LayoutTemplate } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { projectTimeline } from '../engine/projectTiming';
import { FINISHED, Renderer } from '../engine/renderer';
import { emptyResources } from '../engine/resources';
import { buildFromTemplate, SAMPLES, TEMPLATES, type TemplateSpec } from '../library/templates';
import { STAGE_SIZE, type AspectRatio, type Project } from '../model/types';
import { loadProjectFonts } from '../export/exportMp4';
import { ensureResources } from '../services/loaders';
import { Modal } from './modals';

const SIZES: { ratio: AspectRatio; label: string }[] = [
  { ratio: '16:9', label: 'Presentation (16:9)' },
  { ratio: '9:16', label: 'Story / Reel (9:16)' },
  { ratio: '1:1', label: 'Square (1:1)' },
  { ratio: '4:5', label: 'Portrait (4:5)' },
];

/** Thumbnails share one resource set: doodle art is reused across templates. Text is drawn as vectors, so it isn't traced. */
const thumbResources = emptyResources();

function Thumb({ project }: { project: Project }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const renderer = useMemo(() => new Renderer(thumbResources), []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.all([ensureResources(project, thumbResources, () => {}, { text: false }), loadProjectFonts(project)]);
      const c = ref.current;
      const ctx = c?.getContext('2d');
      if (!alive || !c || !ctx) return;
      renderer.renderScene(ctx, project, projectTimeline(project, thumbResources), 0, FINISHED, c.width, c.height, { showHand: false });
    })();
    return () => {
      alive = false;
    };
  }, [project, renderer]);
  const { width, height } = STAGE_SIZE[project.aspectRatio];
  const w = 480;
  return <canvas ref={ref} width={w} height={Math.round((w * height) / width)} />;
}

export function TemplateGallery(props: { initialRatio: AspectRatio; handId: string | null; onBack: () => void; onClose: () => void; onCreate: (p: Project) => void }) {
  const [ratio, setRatio] = useState<AspectRatio>(props.initialRatio);
  const [tab, setTab] = useState<'templates' | 'samples'>('templates');
  const [picked, setPicked] = useState('empty');
  const specs = tab === 'templates' ? TEMPLATES : SAMPLES;
  const projects = useMemo(() => new Map(specs.map((s) => [s.id, buildFromTemplate(s, ratio, props.handId)])), [specs, ratio, props.handId]);
  const portrait = STAGE_SIZE[ratio].height > STAGE_SIZE[ratio].width;
  const chosen: TemplateSpec | undefined = specs.find((s) => s.id === picked);

  const switchTab = (t: 'templates' | 'samples') => {
    setTab(t);
    setPicked(t === 'templates' ? 'empty' : SAMPLES[0].id);
  };

  return (
    <Modal
      title="Project template gallery"
      subtitle="Pick a template style to kickstart your project"
      icon={<LayoutTemplate size={22} />}
      size="xl"
      hero
      onClose={props.onClose}
      footer={
        <div className="gallery-f">
          <button type="button" className="btn big" onClick={props.onBack}>
            Back
          </button>
          <button type="button" className="btn big accent" disabled={!chosen} onClick={() => chosen && props.onCreate(buildFromTemplate(chosen, ratio, props.handId))}>
            Next
          </button>
        </div>
      }
    >
      <div className="gallery-head">
        <label className="field inline">
          <span>Project Size:</span>
          <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)}>
            {SIZES.map((s) => (
              <option key={s.ratio} value={s.ratio}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="pill-tabs pill-center" role="tablist">
          <button type="button" role="tab" aria-pressed={tab === 'templates'} onClick={() => switchTab('templates')}>
            Templates
          </button>
          <button type="button" role="tab" aria-pressed={tab === 'samples'} onClick={() => switchTab('samples')}>
            Sample Projects
          </button>
        </div>
      </div>
      <div className={portrait ? 'gallery-grid portrait' : 'gallery-grid'}>
        {specs.map((s) => {
          const p = projects.get(s.id)!;
          return (
            <button key={s.id} type="button" className="gallery-tile" aria-pressed={picked === s.id} onClick={() => setPicked(s.id)} onDoubleClick={() => props.onCreate(p)}>
              <span className={s.id === 'empty' ? 'gallery-art checker' : 'gallery-art'} style={{ aspectRatio: `${STAGE_SIZE[ratio].width} / ${STAGE_SIZE[ratio].height}` }}>
                {s.id !== 'empty' && <Thumb project={p} />}
              </span>
              <span className="gallery-name">
                {s.name}
                {tab === 'samples' && <small> · {s.slides.length} slides</small>}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

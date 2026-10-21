import { newDoodle, newProject, newScene, newText } from '../model/factories';
import { STAGE_SIZE, type AspectRatio, type BoardId, type Project, type SceneElement, type TextElement, type TransitionType } from '../model/types';

/**
 * Starter templates and sample projects. Layouts are written once for a 1920×1080 stage
 * (positions as fractions, sizes in 1080ths) and re-flowed for each project size: landscape
 * sizes scale down to fit; portrait sizes stack left-to-right content top-to-bottom.
 */

type Doodle = { d: string; x: number; y: number; s: number; color?: boolean };
type Words = { t: string; x: number; y: number; size: number; font: string; weight?: TextElement['weight']; fill?: string };
type Item = Doodle | Words;

interface SlideSpec {
  items: Item[];
  transition?: TransitionType;
  holdMs?: number;
}

export interface TemplateSpec {
  id: string;
  name: string;
  board?: BoardId;
  slides: SlideSpec[];
}

const D = (d: string, x: number, y: number, s: number, color = true): Doodle => ({ d, x, y, s, color });
const T = (t: string, x: number, y: number, size: number, font: string, weight: TextElement['weight'] = 400, fill?: string): Words => ({ t, x, y, size, font, weight, fill });

export const TEMPLATES: TemplateSpec[] = [
  { id: 'empty', name: 'Empty Project', slides: [{ items: [] }] },
  {
    id: 'teaching',
    name: 'Teaching',
    slides: [
      {
        items: [
          D('d-whiteboard', 0.5, 0.46, 1),
          T('Insert Your\nTitle Here', 0.5, 0.43, 110, 'Cabin Sketch', 700, '#6B5BD6'),
          D('d-plant', 0.12, 0.7, 0.42),
          D('d-books', 0.89, 0.74, 0.38),
        ],
      },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    slides: [
      {
        items: [
          D('d-laptop', 0.5, 0.5, 1.25),
          T('Insert here the title\nfor your project', 0.5, 0.465, 54, 'Indie Flower', 700, '#1F8A8A'),
          D('p-coin', 0.12, 0.24, 0.24),
          D('p-chart', 0.13, 0.74, 0.32),
          D('d-burst', 0.86, 0.22, 0.26),
          D('p-target', 0.87, 0.74, 0.3),
        ],
      },
    ],
  },
  {
    id: 'funky',
    name: 'Funky',
    slides: [
      {
        items: [
          D('d-squiggle-pink', 0.1, 0.24, 0.5),
          D('d-squiggle-gold', 0.8, 0.22, 0.46),
          T('Your Text Here', 0.45, 0.5, 120, 'Gochi Hand'),
          D('d-wave', 0.3, 0.64, 0.24),
          D('d-loop-pink', 0.9, 0.82, 0.46),
        ],
      },
    ],
  },
  {
    id: 'scribble',
    name: 'Scribble',
    slides: [
      {
        items: [
          D('d-scribble', 0.33, 0.28, 0.34),
          T('Project Title', 0.52, 0.5, 150, 'Bubblegum Sans', 700),
          D('d-zigzag', 0.62, 0.68, 0.42),
          D('d-dots', 0.9, 0.15, 0.3),
        ],
      },
    ],
  },
  {
    id: 'stickman',
    name: 'Stickman',
    slides: [
      {
        items: [
          D('d-speedlines', 0.16, 0.62, 0.2),
          T('Your Text Here', 0.45, 0.5, 120, 'Shadows Into Light'),
          D('d-wave', 0.52, 0.63, 0.22),
          D('c-bilal', 0.82, 0.55, 0.72, false),
          D('d-burst', 0.86, 0.15, 0.28),
        ],
      },
    ],
  },
  {
    id: 'pastel',
    name: 'Minimal Pastel',
    slides: [
      {
        items: [
          D('d-pastel-curve', 0.07, 0.2, 0.44),
          T('Your Text Here', 0.55, 0.45, 120, 'Shadows Into Light'),
          D('d-pastel-stroke', 0.52, 0.6, 0.5),
          D('d-pastel-hill', 0.62, 0.93, 0.5),
        ],
      },
    ],
  },
  {
    id: 'presenter',
    name: 'Presenter',
    slides: [
      {
        items: [
          D('d-speedlines', 0.06, 0.55, 0.24),
          D('c-omar', 0.22, 0.55, 0.8, false),
          T('Your Text Here', 0.62, 0.45, 130, 'Patrick Hand', 700),
          D('d-underline', 0.62, 0.6, 0.55),
          D('d-burst', 0.86, 0.24, 0.3),
        ],
      },
    ],
  },
  {
    id: 'paper-plane',
    name: 'Paper Plane',
    slides: [
      {
        items: [
          D('d-trail-loop', 0.16, 0.22, 0.4),
          D('d-plane', 0.26, 0.36, 0.2),
          T('Your Text Here', 0.55, 0.5, 120, 'Cabin Sketch', 700, '#E0607A'),
          D('d-plane', 0.87, 0.62, 0.24),
          D('d-trail', 0.88, 0.86, 0.28),
        ],
      },
    ],
  },
];

export const SAMPLES: TemplateSpec[] = [
  {
    id: 'sample-teams',
    name: '3 habits of great teams',
    slides: [
      { items: [D('c-omar', 0.34, 0.5, 0.65, false), T('3 habits of\ngreat teams', 0.69, 0.44, 150, 'Caveat', 700)], transition: 'none', holdMs: 1000 },
      { items: [D('p-bulb', 0.24, 0.48, 0.48), T('1. Share ideas early', 0.62, 0.46, 110, 'Caveat', 500), D('p-arrow', 0.76, 0.66, 0.28)], transition: 'wipe', holdMs: 1200 },
      { items: [D('p-chart', 0.24, 0.48, 0.52), T('2. Measure what\nmatters', 0.64, 0.44, 110, 'Caveat', 500)], transition: 'fade', holdMs: 1200 },
      { items: [D('p-heart', 0.24, 0.48, 0.45), T('3. Celebrate\nthe wins', 0.64, 0.44, 110, 'Caveat', 500), D('d-burst', 0.85, 0.2, 0.25)], transition: 'iris', holdMs: 1500 },
    ],
  },
  {
    id: 'sample-plant',
    name: 'How a plant grows',
    board: 'green',
    slides: [
      { items: [D('d-plant', 0.27, 0.5, 0.6), T('How a plant\ngrows', 0.66, 0.45, 130, 'Indie Flower', 700)], transition: 'none' },
      { items: [D('p-globe', 0.25, 0.48, 0.45), T('1. Seeds need\nsoil and water', 0.65, 0.45, 100, 'Indie Flower')], transition: 'push' },
      { items: [D('d-burst', 0.25, 0.35, 0.35), D('p-star', 0.25, 0.58, 0.3), T('2. Sunlight is\ntheir food', 0.65, 0.45, 100, 'Indie Flower')], transition: 'push' },
      { items: [D('p-clock', 0.25, 0.48, 0.42), T('3. Growing\ntakes time', 0.65, 0.45, 100, 'Indie Flower')], transition: 'fade', holdMs: 1500 },
    ],
  },
  {
    id: 'sample-launch',
    name: 'Launch your product',
    slides: [
      { items: [D('p-rocket', 0.28, 0.5, 0.62), T('Launch day\nin 3 steps', 0.66, 0.45, 120, 'Permanent Marker')], transition: 'none' },
      { items: [D('p-target', 0.25, 0.5, 0.45), T('1. Pick one goal', 0.65, 0.45, 100, 'Permanent Marker')], transition: 'wipe' },
      { items: [D('p-chart', 0.25, 0.5, 0.48), T('2. Measure it\nevery week', 0.65, 0.45, 100, 'Permanent Marker')], transition: 'wipe' },
      { items: [D('p-trophy', 0.25, 0.5, 0.45), T('3. Celebrate\nthe win', 0.65, 0.45, 100, 'Permanent Marker'), D('d-burst', 0.84, 0.2, 0.26)], transition: 'iris', holdMs: 1500 },
    ],
  },
];

const LANDSCAPE = STAGE_SIZE['16:9'];

/** Builds a fresh project from a template or sample for the chosen size. */
export function buildFromTemplate(spec: TemplateSpec, ratio: AspectRatio, handId: string | null, name = spec.id === 'empty' ? 'untitled project' : spec.name): Project {
  const { width: W, height: H } = STAGE_SIZE[ratio];
  const portrait = H > W;
  // How much smaller this stage is than the 1920×1080 design (portrait: than its 1080×1920 mirror).
  const k = portrait ? Math.min(W / LANDSCAPE.height, H / LANDSCAPE.width) : Math.min(W / LANDSCAPE.width, H / LANDSCAPE.height);
  const at = (fx: number, fy: number): [number, number] => (portrait ? [W * (0.5 + (fy - 0.5) * 0.85), H * (0.1 + fx * 0.8)] : [fx * W, fy * H]);

  const project = newProject(name, handId);
  project.aspectRatio = ratio;
  if (spec.board) project.board = spec.board;
  project.scenes = spec.slides.map((slide, i) => {
    const elements: SceneElement[] = slide.items.map((item) => {
      const [x, y] = at(item.x, item.y);
      if ('d' in item) return newDoodle(item.d, x, y, item.s * LANDSCAPE.height * k, item.color ?? true);
      const el = newText(item.t, x, y, Math.round(item.size * k), item.font, item.weight ?? 400);
      return item.fill ? { ...el, fill: item.fill } : el;
    });
    return { ...newScene(i === 0 ? 'none' : (slide.transition ?? 'fade')), holdMs: slide.holdMs ?? 1000, elements };
  });
  return project;
}

/** The default project on first launch. */
export const exampleProject = (handId: string | null): Project => buildFromTemplate(SAMPLES[0], '16:9', handId, 'Example – 3 habits of great teams');

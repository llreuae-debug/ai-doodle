import { normalizeProject } from '../model/factories';
import type { DoodleDef } from '../library/doodles';
import type { Project } from '../model/types';

/**
 * Projects live in this browser's IndexedDB, audio blobs and image data included,
 * so a saved project reopens complete. Phase 2 syncs the same records to the cloud.
 */

const DB_NAME = 'ai-doodle';
const DB_VERSION = 2;
const STORE = 'projects';
/** AI doodles across all projects, for "Recently generated". */
const GENERATIONS = 'generations';
const GENERATIONS_KEPT = 40;
const LAST_KEY = 'ai-doodle.lastProject';

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  slides: number;
}

interface ProjectRecord extends ProjectSummary {
  project: Project;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(GENERATIONS)) db.createObjectStore(GENERATIONS, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('This browser blocked local storage.'));
    };
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>, storeName = STORE): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? new Error('Storage failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('Storage was cancelled. The browser may be out of space.'));
  });
}

export async function saveProject(project: Project): Promise<void> {
  const record: ProjectRecord = {
    id: project.id,
    name: project.name,
    updatedAt: Date.now(),
    slides: project.scenes.length,
    project,
  };
  await run('readwrite', (s) => s.put(record));
  setLastProjectId(project.id);
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const records = await run<ProjectRecord[]>('readonly', (s) => s.getAll());
  return records.map(({ id, name, updatedAt, slides }) => ({ id, name, updatedAt, slides })).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadProject(id: string): Promise<Project | null> {
  const record = await run<ProjectRecord | undefined>('readonly', (s) => s.get(id));
  return record ? normalizeProject(record.project) : null;
}

export async function deleteProject(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}

/** One AI result: a vector drawing (DoodleAI 1.0) or a picture to trace (DoodleAI 2.0). */
export type Generation = { kind: 'vector'; id: string; def: DoodleDef } | { kind: 'image'; id: string; name: string; blob: Blob };

interface GenerationRecord {
  id: string;
  createdAt: number;
  /** Older records hold only a vector drawing. */
  def?: DoodleDef;
  image?: { name: string; blob: Blob };
}

export async function saveGeneration(g: Generation): Promise<void> {
  const record: GenerationRecord = { id: g.id, createdAt: Date.now(), ...(g.kind === 'vector' ? { def: g.def } : { image: { name: g.name, blob: g.blob } }) };
  await run('readwrite', (s) => s.put(record), GENERATIONS);
  const all = await run<GenerationRecord[]>('readonly', (s) => s.getAll(), GENERATIONS);
  const stale = all.sort((a, b) => b.createdAt - a.createdAt).slice(GENERATIONS_KEPT);
  for (const r of stale) await run('readwrite', (s) => s.delete(r.id), GENERATIONS);
}

export async function listGenerations(): Promise<Generation[]> {
  const all = await run<GenerationRecord[]>('readonly', (s) => s.getAll(), GENERATIONS);
  return all
    .sort((a, b) => b.createdAt - a.createdAt)
    .flatMap((r): Generation[] =>
      r.image ? [{ kind: 'image', id: r.id, name: r.image.name, blob: r.image.blob }] : r.def ? [{ kind: 'vector', id: r.id, def: r.def }] : [],
    );
}

export function lastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

function setLastProjectId(id: string): void {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    // Remembering the last project is only a convenience.
  }
}

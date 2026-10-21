import type { TraceOptions, TraceResult } from './rasterToStrokes';
import type { TraceRequest } from './trace.worker';

type Reply = { id: number; result: TraceResult } | { id: number; error: string };

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (r: TraceResult) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./trace.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }: MessageEvent<Reply>) => {
    const job = pending.get(data.id);
    pending.delete(data.id);
    if (!job) return;
    if ('error' in data) job.reject(new Error(data.error));
    else job.resolve(data.result);
  };
  worker.onerror = (e) => {
    for (const job of pending.values()) job.reject(new Error(e.message || 'Tracing worker crashed'));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** Runs rasterToStrokes off the main thread. Takes ownership of `image.data`. */
export function traceImage(image: ImageData, options?: TraceOptions): Promise<TraceResult> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const req: TraceRequest = { id, width: image.width, height: image.height, data: image.data, options };
    getWorker().postMessage(req, [image.data.buffer]);
  });
}

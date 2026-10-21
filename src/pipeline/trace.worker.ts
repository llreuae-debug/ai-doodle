import { rasterToStrokes, type TraceOptions } from './rasterToStrokes';

export interface TraceRequest {
  id: number;
  width: number;
  height: number;
  data: Uint8ClampedArray;
  options?: TraceOptions;
}

// The DOM lib types `self` as Window; only these two members are used here.
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<TraceRequest>) => void) | null;
  postMessage(message: unknown): void;
};

scope.onmessage = ({ data: req }) => {
  try {
    scope.postMessage({ id: req.id, result: rasterToStrokes(req, req.options) });
  } catch (err) {
    scope.postMessage({ id: req.id, error: err instanceof Error ? err.message : String(err) });
  }
};

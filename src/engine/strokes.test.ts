import { describe, expect, it } from 'vitest';
import { LIFT_PAUSE_COST, TRAVEL_COST, penAt, prepareStrokes } from './strokes';

// Two 100 px horizontal strokes, 100 px apart vertically.
const prepared = prepareStrokes([
  { points: [[0, 0], [100, 0]], width: 4 },
  { points: [[100, 100], [0, 100]], width: 4 },
]);

describe('prepareStrokes', () => {
  it('weights pen-up travel and lift pause', () => {
    expect(prepared.total).toBeCloseTo(200 + 100 * TRAVEL_COST + LIFT_PAUSE_COST);
  });
});

describe('penAt', () => {
  it('starts at the first point with nothing completed', () => {
    expect(penAt(prepared, 0)).toMatchObject({ x: 0, y: 0, drawing: true, completed: 0 });
  });

  it('moves along the first stroke', () => {
    const pen = penAt(prepared, 50 / prepared.total);
    expect(pen.x).toBeCloseTo(49, 0);
    expect(pen).toMatchObject({ stroke: 0, drawing: true });
  });

  it('travels with the pen up between strokes', () => {
    const travelCost = 100 * TRAVEL_COST + LIFT_PAUSE_COST;
    const pen = penAt(prepared, (100 + travelCost * 0.5) / prepared.total);
    expect(pen.drawing).toBe(false);
    expect(pen.y).toBeCloseTo(50);
    expect(pen.completed).toBe(1);
  });

  it('finishes at the last point with everything completed', () => {
    expect(penAt(prepared, 1)).toMatchObject({ x: 0, y: 100, completed: 2, drawing: false });
  });

  it('handles an asset with no strokes', () => {
    expect(penAt(prepareStrokes([]), 0.5)).toMatchObject({ completed: 0, drawing: false });
  });
});

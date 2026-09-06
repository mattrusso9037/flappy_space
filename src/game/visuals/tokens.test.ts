import { describe, expect, it } from 'vitest';
import { damp, easeOut } from './tokens';

describe('motion conventions', () => {
  it('clamps entrance progress and reaches exact endpoints', () => {
    expect(easeOut(-1)).toBe(0); expect(easeOut(1)).toBe(1); expect(easeOut(2)).toBe(1);
  });
  it('damping is independent of frame subdivision and does not overshoot', () => {
    expect(damp(damp(0, 1, 0.05), 1, 0.05)).toBeCloseTo(damp(0, 1, 0.1), 10);
    expect(damp(0, 1, 0)).toBe(0);
    expect(damp(0, 1, 1)).toBeLessThanOrEqual(1);
  });
});

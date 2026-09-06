import { describe, expect, it, vi } from 'vitest';
import { Container, Ticker } from 'pixi.js';
import { FlightEffects } from './FlightEffects';

describe('FlightEffects', () => {
  it('expires bursts and thrust from elapsed simulation time, with no shared ticker', () => {
    const add = vi.spyOn(Ticker.shared, 'add');
    const effects = new FlightEffects();
    effects.burst(100, 100, 'collection');
    effects.thrust(100, 100);
    const count = effects.activeCount;
    expect(count).toBeGreaterThan(0);
    effects.update(0);
    expect(effects.activeCount).toBe(count);
    effects.update(0.7);
    expect(effects.activeCount).toBe(0);
    expect(add).not.toHaveBeenCalled();
    effects.dispose(); add.mockRestore();
  });
  it('bounds continuous allocation and clears effects on reset', () => {
    const effects = new FlightEffects();
    for (let i = 0; i < 1000; i++) effects.thrust(10, 10);
    expect(effects.activeCount).toBe(FlightEffects.capacity);
    effects.reset(); expect(effects.activeCount).toBe(0);
    effects.burst(10, 10, 'impact'); expect(effects.activeCount).toBeGreaterThan(0);
    effects.dispose();
  });
  it('detaches and destroys all graphics, and ignores events after disposal', () => {
    const stage = new Container();
    const effects = new FlightEffects(); stage.addChild(effects.container);
    const nodes = [...effects.container.children];
    effects.burst(10, 10, 'warp'); effects.dispose(); effects.dispose();
    expect(stage.children).toHaveLength(0);
    expect(nodes.every(node => node.destroyed)).toBe(true);
    expect(() => { effects.update(1); effects.burst(0, 0, 'impact'); }).not.toThrow();
  });
});

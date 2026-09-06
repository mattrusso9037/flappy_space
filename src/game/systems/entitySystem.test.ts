import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as PIXI from 'pixi.js';
import { EntitySystem } from './entitySystem';
import { EventBus } from '../eventBus';
import { GAME_HEIGHT } from '../config';

describe('EntitySystem Ground Lifecycle', () => {
  let app: PIXI.Application;
  let events: EventBus;
  let entities: EntitySystem;

  beforeEach(() => {
    app = new PIXI.Application();
    app.stage = new PIXI.Container();
    events = new EventBus();
    entities = new EntitySystem(app, undefined, events);
    entities.initialize(app);
  });

  afterEach(() => {
    entities.dispose();
  });

  it('setGround creates exactly one Ground instance when enabled', () => {
    expect(entities.getGround()).toBeNull();

    const ground = entities.setGround({ enabled: true, height: 80 }, 'alien-crust');

    expect(ground).not.toBeNull();
    expect(entities.getGround()).toBe(ground);
    expect(ground?.y).toBe(GAME_HEIGHT - 80);
    expect(entities.getGroundY()).toBe(GAME_HEIGHT - 80);
  });

  it('replacing ground destroys the old ground without leaking', () => {
    const ground1 = entities.setGround({ enabled: true, height: 80 }, 'alien-crust')!;
    const destroySpy = vi.spyOn(ground1, 'destroy');

    const ground2 = entities.setGround({ enabled: true, height: 120 }, 'alien-crust')!;

    expect(destroySpy).toHaveBeenCalled();
    expect(ground2).not.toBe(ground1);
    expect(entities.getGround()).toBe(ground2);
    expect(entities.getGroundY()).toBe(GAME_HEIGHT - 120);
  });

  it('clearing ground destroys it and restores null ground boundary', () => {
    const ground = entities.setGround({ enabled: true, height: 80 }, 'alien-crust')!;
    const destroySpy = vi.spyOn(ground, 'destroy');

    const result = entities.setGround(null);

    expect(result).toBeNull();
    expect(destroySpy).toHaveBeenCalled();
    expect(entities.getGround()).toBeNull();
    expect(entities.getGroundY()).toBeNull();
  });

  it('new astronaut receives active ground boundary upon creation', () => {
    entities.setGround({ enabled: true, height: 80 }, 'alien-crust');
    const astronaut = entities.createAstronaut()!;

    expect(astronaut).not.toBeNull();
    expect(astronaut.getGroundY()).toBe(GAME_HEIGHT - 80);
  });

  it('space level astronaut receives null ground boundary upon creation', () => {
    entities.setGround(null);
    const astronaut = entities.createAstronaut()!;

    expect(astronaut).not.toBeNull();
    expect(astronaut.getGroundY()).toBeNull();
  });

  it('updates existing astronaut ground boundary when ground is added, replaced, or removed', () => {
    const astronaut = entities.createAstronaut()!;
    expect(astronaut.getGroundY()).toBeNull();

    entities.setGround({ enabled: true, height: 80 }, 'alien-crust');
    expect(astronaut.getGroundY()).toBe(GAME_HEIGHT - 80);

    entities.setGround({ enabled: true, height: 110 }, 'alien-crust');
    expect(astronaut.getGroundY()).toBe(GAME_HEIGHT - 110);

    entities.setGround(null);
    expect(astronaut.getGroundY()).toBeNull();
  });

  it('clearAll removes and destroys ground', () => {
    const ground = entities.setGround({ enabled: true, height: 80 }, 'alien-crust')!;
    const destroySpy = vi.spyOn(ground, 'destroy');

    entities.clearAll();

    expect(destroySpy).toHaveBeenCalled();
    expect(entities.getGround()).toBeNull();
  });

  it('dispose removes and destroys ground exactly once', () => {
    const ground = entities.setGround({ enabled: true, height: 80 }, 'alien-crust')!;
    const destroySpy = vi.spyOn(ground, 'destroy');

    entities.dispose();

    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(entities.getGround()).toBeNull();
  });
});

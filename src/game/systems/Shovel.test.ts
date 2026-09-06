import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Application, Container, Ticker } from 'pixi.js';
import { createFlappySpaceRuntime } from '../createFlappySpaceRuntime';
import { GameRuntime } from '../GameRuntime';
import { SECTOR_02, SECTOR_04 } from '../campaign/defaultCampaign';
import { Astronaut } from '../entities/Astronaut';

describe('Shovel and authored terrain through the production runtime', () => {
  let runtime: GameRuntime;
  let pilot: Astronaut;
  const tick = () => runtime.onTick({ deltaMS: 1000 / 60 } as Ticker);
  const press = (code: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  };
  const position = (x = 1075, y = 495) => {
    pilot.worldX = pilot.sprite.x = x;
    pilot.sprite.y = y;
    pilot.horizontalVelocity = pilot.velocity = 0;
    pilot.isGrounded = y === 495;
  };
  const load = () => {
    runtime.reset({ ...SECTOR_02, gameplay: { ...SECTOR_02.gameplay, orbs: { spawnChance: 0 } } });
    runtime.start(); runtime.app.ticker.stop();
    pilot = runtime.systems.entities.getAstronaut()!;
    position();
  };
  beforeEach(() => {
    const app = new Application(); app.stage = new Container(); app.ticker = new Ticker();
    runtime = createFlappySpaceRuntime(app); runtime.initialize(); app.ticker.stop();
    load();
  });
  afterEach(() => { runtime.dispose(); runtime.app.ticker.destroy(); });

  it('equips and digs on simulation input, removes graphics and geometry, and safely repeats', () => {
    const entities = runtime.systems.entities;
    const block = entities.getTerrainBlocks()[1];
    press('Digit3'); press('KeyE');
    expect(entities.getTerrainBlocks()).toHaveLength(2);
    tick();
    expect(runtime.systems.tools.getEquipped()).toBe('shovel');
    expect(runtime.systems.tools.getLastResult()).toBe('dug');
    expect(block.graphics.destroyed).toBe(true);
    expect(entities.getSolidBounds()).not.toContain(block.bounds);
    press('KeyE'); tick();
    expect(runtime.systems.tools.getLastResult()).toBe('invalid-target');
    expect(entities.getTerrainBlocks().map(b => b.id)).toEqual(['tunnel-roof']);
    expect(SECTOR_02.gameplay.terrainBlocks).toHaveLength(2);
  });

  it('blocks the tunnel before digging and permits traversal afterward', () => {
    for (let i = 0; i < 30; i++) { pilot.moveRight(); tick(); }
    expect(pilot.worldX).toBe(1075);
    runtime.systems.tools.select('shovel'); runtime.systems.tools.use();
    for (let i = 0; i < 60; i++) { pilot.moveRight(); tick(); }
    expect(pilot.worldX).toBeGreaterThan(1320);
    expect(pilot.sprite.y).toBe(495);
    expect(pilot.dead).toBe(false);
    expect(pilot.getThrustCharges()).toBe(1);
  });

  it('rejects solid terrain, natural ground, panels, distant and dead uses', () => {
    const tools = runtime.systems.tools, entities = runtime.systems.entities;
    tools.select('shovel');
    position(975, 390);
    expect(tools.use()).toBe('invalid-target');
    expect(entities.digTerrainBlock(entities.getTerrainBlocks()[0])).toBe(false);
    position(800);
    expect(tools.use()).toBe('invalid-target');
    const ground = entities.getGround();
    entities.createWall({ x: 825, y: 440, width: 30, height: 80 }, 20);
    expect(tools.use()).toBe('invalid-target');
    expect(entities.getWalls()).toHaveLength(1);
    expect(entities.getGround()).toBe(ground);
    position(); pilot.dead = true;
    expect(tools.use()).toBe('invalid-target');
    pilot.dead = false; position(NaN);
    expect(tools.use()).toBe('invalid-target');
    expect(entities.getTerrainBlocks()).toHaveLength(2);
  });

  it('honors facing direction and prevents digging through nearer non-diggable solids', () => {
    const tools = runtime.systems.tools, entities = runtime.systems.entities;
    tools.select('shovel'); position(1185);
    expect(tools.use()).toBe('invalid-target');
    tools.face(-1); expect(tools.use()).toBe('dug');
    load(); tools.select('shovel');
    position(1040);
    entities.createWall({ x: 1065, y: 440, width: 10, height: 80 }, 20);
    expect(tools.use()).toBe('invalid-target');
    expect(entities.getTerrainBlocks()).toHaveLength(2);
  });

  it('keeps roof collision and landing/thrust rules, including support removal', () => {
    position(1200, 330); pilot.velocity = 5;
    for (let i = 0; i < 5; i++) tick();
    expect(pilot.sprite.y).toBe(335);
    expect(pilot.isGrounded).toBe(true);
    expect(pilot.thrust()).toBe(true);
    expect(pilot.thrust()).toBe(false);
    runtime.systems.entities.configureTerrainBlocks([
      { id: 'ledge', bounds: { x: 1000, y: 420, width: 200, height: 100 }, diggable: true },
    ]);
    position(1100, 390); pilot.velocity = 5;
    for (let i = 0; i < 5; i++) tick();
    expect(pilot.sprite.y).toBe(395);
    expect(pilot.isGrounded).toBe(true);
    runtime.systems.entities.digTerrainBlock(runtime.systems.entities.getTerrainBlocks()[0]);
    tick();
    expect(pilot.sprite.y).toBeGreaterThan(395);
    expect(pilot.isGrounded).toBe(false);
  });

  it('clears dig state on reset and transitions, restores authored blocks, and destroys resources', () => {
    const tools = runtime.systems.tools, entities = runtime.systems.entities;
    const roof = entities.getTerrainBlocks()[0];
    tools.select('shovel'); tools.use();
    runtime.reset();
    expect(roof.graphics.destroyed).toBe(true);
    expect(entities.getTerrainBlocks()).toHaveLength(2);
    runtime.loadLevel(SECTOR_04);
    expect(entities.getTerrainBlocks()).toHaveLength(0);
    expect(entities.getSolidBounds()).toHaveLength(0);
    expect(tools.select('shovel')).toBe(false);
    expect(entities.getGroundY()).toBeNull();
    runtime.loadLevel(SECTOR_02);
    expect(entities.getTerrainBlocks()).toHaveLength(2);
    const blocks = [...entities.getTerrainBlocks()];
    runtime.dispose();
    expect(blocks.every(b => b.graphics.destroyed)).toBe(true);
  });

  it('does not replay digging across pause/reset and cancels grapple on shovel selection', () => {
    press('Digit3'); press('KeyE'); runtime.pause();
    press('KeyE'); tick(); runtime.resume(); tick();
    expect(runtime.systems.entities.getTerrainBlocks()).toHaveLength(2);
    position(400); runtime.systems.tools.select('grapple-hook');
    expect(runtime.systems.tools.use()).toBe('attached');
    press('Digit3'); tick();
    expect(runtime.systems.tools.getAttachment()).toBeNull();
    position(); press('KeyE'); runtime.reset(); runtime.start(); tick();
    expect(runtime.systems.entities.getTerrainBlocks()).toHaveLength(2);
  });

  it('prevents wall placement intersecting authored terrain', () => {
    position(1030);
    expect(runtime.systems.tools.use()).toBe('blocked');
    expect(runtime.systems.entities.getWalls()).toHaveLength(0);
  });
});

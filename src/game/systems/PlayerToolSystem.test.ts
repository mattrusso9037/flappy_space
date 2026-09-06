import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Application, Container, Ticker } from 'pixi.js';
import { createFlappySpaceRuntime } from '../createFlappySpaceRuntime';
import { GameRuntime } from '../GameRuntime';
import { SECTOR_01, SECTOR_02, SECTOR_04 } from '../campaign/defaultCampaign';
import { LevelDefinition } from '../campaign/campaignTypes';
import { Astronaut } from '../entities/Astronaut';

const testLevel = (): LevelDefinition => ({ ...SECTOR_02, gameplay: {
  ...SECTOR_02.gameplay, orbs: { spawnChance: 0 },
} });

describe('PlayerToolSystem production runtime', () => {
  let runtime: GameRuntime;
  let pilot: Astronaut;
  const tick = (seconds = 1 / 60) => runtime.onTick({ deltaMS: seconds * 1000 } as Ticker);
  const position = (x = 300, y = 495) => {
    pilot.worldX = pilot.sprite.x = x;
    pilot.sprite.y = y;
    pilot.horizontalVelocity = pilot.velocity = 0;
    pilot.isGrounded = y === 495;
  };
  const press = (code: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  };
  beforeEach(() => {
    const app = new Application();
    app.stage = new Container();
    app.ticker = new Ticker();
    runtime = createFlappySpaceRuntime(app);
    runtime.initialize();
    app.ticker.stop();
    runtime.reset(testLevel());
    runtime.start();
    app.ticker.stop();
    pilot = runtime.systems.entities.getAstronaut()!;
    position();
  });
  afterEach(() => { runtime.dispose(); runtime.app.ticker.destroy(); });

  it('equips, unequips, selects and uses via semantic keyboard input on the runtime update', () => {
    const tools = runtime.systems.tools;
    expect(tools.getEquipped()).toBe('wall-builder');
    press('Digit0'); tick();
    expect(tools.getEquipped()).toBeNull();
    press('KeyE'); tick();
    expect(tools.getLastResult()).toBe('no-tool');
    press('Digit1'); press('KeyE');
    expect(runtime.systems.entities.getWalls()).toHaveLength(0);
    tick();
    expect(tools.getEquipped()).toBe('wall-builder');
    expect(runtime.systems.entities.getWalls()).toHaveLength(1);
    expect(tools.getLastResult()).toBe('placed');
    press('KeyX'); tick();
    expect(runtime.systems.entities.getWalls()).toHaveLength(0);
  });

  it('equips and attaches through input, pulls to the authored pickup, and releases', () => {
    runtime.reset({ ...SECTOR_02, gameplay: { ...SECTOR_02.gameplay,
      orbs: { ...SECTOR_02.gameplay.orbs, spawnChance: 0 } } });
    runtime.start(); pilot = runtime.systems.entities.getAstronaut()!; position(400);
    press('Digit2'); press('KeyE'); tick();
    expect(runtime.systems.tools.getEquipped()).toBe('grapple-hook');
    expect(runtime.systems.tools.getAttachment()?.id).toBe('raised-pickup');
    const start = { x: pilot.worldX, y: pilot.sprite.y };
    for (let i = 0; i < 65; i++) tick();
    expect(pilot.worldX).toBeGreaterThan(start.x);
    expect(pilot.sprite.y).toBeLessThan(start.y);
    expect(runtime.state.getState().orbsCollected).toBe(1);
    press('KeyX'); tick();
    expect(runtime.systems.tools.getAttachment()).toBeNull();
  });

  it('rejects unsupported, behind, out-of-range and nonfinite targets safely', () => {
    const tools = runtime.systems.tools;
    tools.select('grapple-hook');
    for (const x of [-500, 900, NaN]) {
      position(x);
      expect(tools.use()).toBe('invalid-target');
      expect(tools.getAttachment()).toBeNull();
    }
    position(400); tools.face(-1);
    expect(tools.use()).toBe('invalid-target');
    tools.face(1); pilot.dead = true;
    expect(tools.use()).toBe('invalid-target');
  });

  it('cancels on repeat use, switch, death, reset and transition without leaking queued input', () => {
    const tools = runtime.systems.tools;
    const attach = () => { position(400); tools.select('grapple-hook'); expect(tools.use()).toBe('attached'); };
    attach(); expect(tools.use()).toBe('released');
    attach(); tools.select('wall-builder'); expect(tools.getAttachment()).toBeNull();
    attach(); pilot.die(); runtime.systems.physics.update(1 / 60);
    expect(tools.getAttachment()).toBeNull();
    runtime.reset(testLevel()); runtime.start(); pilot = runtime.systems.entities.getAstronaut()!;
    attach(); press('KeyE'); runtime.reset(); expect(tools.getAttachment()).toBeNull();
    runtime.start(); pilot = runtime.systems.entities.getAstronaut()!; tick();
    expect(tools.getAttachment()).toBeNull();
    attach(); runtime.loadLevel(SECTOR_04);
    expect(tools.getAttachment()).toBeNull();
    expect(tools.select('grapple-hook')).toBe(false);
    runtime.loadLevel(testLevel());
    expect(tools.getAttachment()).toBeNull();
  });

  it('freezes attachment while paused and retains thrust contracts after release', () => {
    position(400); const tools = runtime.systems.tools;
    tools.select('grapple-hook'); tools.use(); tick();
    const y = pilot.sprite.y;
    runtime.pause(); press('KeyX'); tick(1);
    expect(pilot.sprite.y).toBe(y);
    expect(tools.getAttachment()).not.toBeNull();
    runtime.resume(); tick(); expect(tools.getAttachment()).not.toBeNull();
    tools.remove();
    expect(pilot.thrust()).toBe(true);
    expect(pilot.thrust()).toBe(false);
  });

  it('uses facing direction and world coordinates, including negative loop coordinates', () => {
    position(-100);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    press('KeyE'); tick();
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
    expect(runtime.systems.entities.getWalls()[0].bounds).toEqual({ x: -213, y: 440, width: 80, height: 80 });
  });

  it('rejects airborne, dead and non-finite positions without creating geometry', () => {
    position(300, 350);
    expect(runtime.systems.tools.use()).toBe('invalid-ground');
    position(); pilot.dead = true;
    expect(runtime.systems.tools.use()).toBe('invalid-ground');
    pilot.dead = false; position(NaN);
    expect(runtime.systems.tools.use()).toBe('invalid-ground');
    expect(runtime.systems.entities.getWalls()).toHaveLength(0);
  });

  it('rejects bounded world edges while allowing valid placement on both sides', () => {
    runtime.reset({ ...testLevel(), gameplay: { ...testLevel().gameplay, world: { width: 800 } } });
    runtime.start(); pilot = runtime.systems.entities.getAstronaut()!;
    position(760);
    expect(runtime.systems.tools.use()).toBe('blocked');
    runtime.systems.tools.face(-1); position(50);
    expect(runtime.systems.tools.use()).toBe('blocked');
    position(300);
    expect(runtime.systems.tools.use()).toBe('placed');
    expect(runtime.systems.entities.getWalls()[0].bounds.x).toBe(187);
  });

  it('rejects overlaps with panels, obstacles and pickups, preserving existing walls', () => {
    const tools = runtime.systems.tools, entities = runtime.systems.entities;
    expect(tools.use()).toBe('placed');
    const wall = entities.getWalls()[0];
    expect(tools.use()).toBe('blocked');
    expect(wall.graphics.destroyed).toBe(false);
    entities.clearWalls();
    const orb = entities.createOrb(360, 480, 14, 0);
    expect(tools.use()).toBe('blocked');
    entities.removeOrb(orb);
    entities.createPlanet(360, 480, 20, 0);
    expect(tools.use()).toBe('blocked');
    expect(entities.getWalls()).toHaveLength(0);
  });

  it('limits active walls, atomically replaces oldest, and removes latest', () => {
    const tools = runtime.systems.tools, entities = runtime.systems.entities;
    tools.use(); const first = entities.getWalls()[0];
    position(500); tools.use(); const second = entities.getWalls()[1];
    expect(tools.use()).toBe('blocked');
    expect(entities.getWalls()).toEqual([first, second]);
    position(700); expect(tools.use()).toBe('placed');
    expect(first.graphics.destroyed).toBe(true);
    expect(entities.getWalls()).toHaveLength(2);
    expect(entities.getWalls()[0]).toBe(second);
    const last = entities.getWalls()[1];
    expect(tools.remove()).toBe('removed');
    expect(last.graphics.destroyed).toBe(true);
    expect(entities.getWalls()).toEqual([second]);
    tools.remove(); expect(tools.remove()).toBe('empty');
  });

  it('expires only in simulation time and ignores invalid deltas', () => {
    runtime.systems.tools.use();
    const wall = runtime.systems.entities.getWalls()[0];
    runtime.systems.tools.update(NaN); runtime.systems.tools.update(-1);
    expect(wall.remainingSeconds).toBe(20);
    runtime.pause(); tick(5);
    expect(wall.remainingSeconds).toBe(20);
    runtime.resume(); runtime.systems.tools.update(19);
    expect(runtime.systems.entities.getWalls()).toHaveLength(1);
    runtime.systems.tools.update(1);
    expect(wall.graphics.destroyed).toBe(true);
    expect(runtime.systems.entities.getWalls()).toHaveLength(0);
  });

  it('does not queue tool use while paused or replay actions queued before pause', () => {
    press('KeyE'); runtime.pause(); press('KeyE'); tick();
    runtime.resume(); tick();
    expect(runtime.systems.entities.getWalls()).toHaveLength(0);
    press('KeyE'); tick();
    expect(runtime.systems.entities.getWalls()).toHaveLength(1);
  });

  it('suppresses repeated keydown and disables tool actions on completion and game over', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); tick();
    position(500);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', repeat: true })); tick();
    expect(runtime.systems.entities.getWalls()).toHaveLength(1);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
    runtime.state.gameOver(); press('KeyE'); tick();
    expect(runtime.systems.entities.getWalls()).toHaveLength(1);
  });

  it('blocks ground traversal at the wall sides without killing the pilot', () => {
    runtime.systems.tools.use();
    for (let i = 0; i < 60; i++) { pilot.moveRight(); runtime.systems.physics.update(1 / 60); }
    expect(pilot.worldX).toBe(308);
    expect(pilot.dead).toBe(false);
    expect(pilot.horizontalVelocity).toBe(0);
  });

  it('lands, recharges thrust, rejects stacking, and falls after support removal', () => {
    runtime.systems.tools.use();
    position(370, 400); pilot.velocity = 5;
    for (let i = 0; i < 10; i++) runtime.systems.physics.update(1 / 60);
    expect(pilot.sprite.y).toBe(415);
    expect(pilot.isGrounded).toBe(true);
    expect(pilot.getThrustCharges()).toBe(1);
    expect(runtime.systems.tools.use()).toBe('invalid-ground');
    expect(pilot.thrust()).toBe(true);
    expect(pilot.thrust()).toBe(false);
    for (let i = 0; i < 110; i++) runtime.systems.physics.update(1 / 60);
    expect(pilot.sprite.y).toBe(415);
    expect(pilot.getThrustCharges()).toBe(1);
    runtime.systems.tools.remove();
    runtime.systems.physics.update(1 / 60);
    expect(pilot.sprite.y).toBeGreaterThan(415);
    expect(pilot.isGrounded).toBe(false);
  });

  it('cleans geometry, selection and queued input on reset and ground-flight-ground transitions', () => {
    runtime.systems.tools.use(); const first = runtime.systems.entities.getWalls()[0];
    press('KeyE'); runtime.reset();
    expect(first.graphics.destroyed).toBe(true);
    runtime.start(); tick();
    expect(runtime.systems.entities.getWalls()).toHaveLength(0);
    pilot = runtime.systems.entities.getAstronaut()!; position();
    runtime.systems.tools.use(); const second = runtime.systems.entities.getWalls()[0];
    runtime.loadLevel(SECTOR_04);
    expect(second.graphics.destroyed).toBe(true);
    expect(runtime.systems.tools.getEquipped()).toBeNull();
    expect(runtime.systems.tools.select('wall-builder')).toBe(false);
    expect(runtime.systems.tools.use()).toBe('no-tool');
    expect(runtime.systems.entities.getGroundY()).toBeNull();
    runtime.loadLevel(testLevel());
    expect(runtime.systems.entities.getWalls()).toHaveLength(0);
    expect(runtime.systems.tools.getEquipped()).toBe('wall-builder');
  });

  it('proves the Sector 02 raised pickup needs a panel from the ground and rewards normal orb scoring', () => {
    const loadPuzzle = () => {
      runtime.reset({ ...SECTOR_02, gameplay: { ...SECTOR_02.gameplay,
        orbs: { ...SECTOR_02.gameplay.orbs, spawnChance: 0 } } });
      runtime.start(); pilot = runtime.systems.entities.getAstronaut()!; position(587);
    };
    loadPuzzle();
    pilot.thrust();
    for (let i = 0; i < 20; i++) runtime.systems.physics.update(1 / 60);
    pilot.moveRight();
    for (let i = 0; i < 110; i++) runtime.systems.physics.update(1 / 60);
    expect(runtime.state.getState().orbsCollected).toBe(0);
    loadPuzzle();
    expect(runtime.systems.tools.use()).toBe('placed');
    pilot.thrust();
    for (let i = 0; i < 20; i++) runtime.systems.physics.update(1 / 60);
    pilot.moveRight();
    for (let i = 0; i < 110; i++) runtime.systems.physics.update(1 / 60);
    expect(pilot.isGrounded).toBe(true);
    expect(pilot.sprite.y).toBe(415);
    expect(runtime.state.getState().orbsCollected).toBe(0);
    pilot.thrust();
    for (let i = 0; i < 55; i++) runtime.systems.physics.update(1 / 60);
    expect(runtime.state.getState().orbsCollected).toBe(1);
    expect(runtime.state.getState().score).toBe(50);
    expect(runtime.systems.entities.getOrbs()).toHaveLength(0);
  });

  it('retains authored pickups when traversing away, and recreates exactly once on reset', () => {
    runtime.reset(SECTOR_02); runtime.start();
    pilot = runtime.systems.entities.getAstronaut()!; position(4000);
    runtime.systems.physics.update(1 / 60);
    expect(runtime.systems.entities.getOrbs()).toHaveLength(1);
    runtime.reset(SECTOR_02);
    expect(runtime.systems.entities.getOrbs()).toHaveLength(1);
  });

  it('disposes panel resources and stays isolated from a second runtime', () => {
    runtime.systems.tools.use(); const wall = runtime.systems.entities.getWalls()[0];
    const app = new Application(); app.stage = new Container(); app.ticker = new Ticker();
    const other = createFlappySpaceRuntime(app);
    other.initialize(); other.reset(testLevel()); app.ticker.stop();
    expect(other.systems.entities.getWalls()).toHaveLength(0);
    runtime.dispose();
    expect(wall.graphics.destroyed).toBe(true);
    expect(other.systems.tools.getEquipped()).toBe('wall-builder');
    other.dispose(); app.ticker.destroy();
  });

  it.each([SECTOR_01, testLevel()])('preserves existing movement with tools absent or unused in $name', level => {
    runtime.reset(level); runtime.start(); pilot = runtime.systems.entities.getAstronaut()!;
    const reference = new Astronaut(pilot.sprite.texture, pilot.worldX, pilot.sprite.y);
    reference.setMovementConfig(level.gameplay.movement);
    reference.setGroundY(runtime.systems.entities.getGroundY());
    reference.setWorldWidth(level.gameplay.world?.width ?? 0, level.gameplay.world?.traversal === 'loop');
    for (let i = 0; i < 120; i++) {
      if (i === 0 || i === 80) { pilot.thrust(); reference.thrust(); }
      pilot.moveRight(); reference.moveRight();
      runtime.systems.physics.update(1 / 60); reference.update(1000 / 60);
      expect([pilot.worldX, pilot.sprite.y, pilot.velocity, pilot.getThrustCharges()])
        .toEqual([reference.worldX, reference.sprite.y, reference.velocity, reference.getThrustCharges()]);
    }
    reference.sprite.destroy();
  });
});

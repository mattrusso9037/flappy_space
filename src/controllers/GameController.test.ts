import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { GameController } from './GameController';
import { eventBus } from '../game/eventBus';
import { gameStateService } from '../game/gameStateService';
import { inputSystem } from '../game/systems/inputSystem';
import { audioSystem } from '../game/systems/audioSystem';
import { entityManager } from '../game/systems/entitySystem';
import { renderSystem } from '../game/systems/renderSystem';
import { physicsSystem } from '../game/systems/physicsSystem';
import { spawningSystem } from '../game/systems/spawningSystem';
import { uiSystem } from '../game/systems/uiSystem';

describe('GameController Characterization', () => {
  let mockApp: PIXI.Application;

  beforeEach(() => {
    // Create a lightweight mock for PIXI.Application matching what GameController needs
    const ticker = new PIXI.Ticker();
    const stage = new PIXI.Container();
    mockApp = {
      ticker,
      stage,
    } as unknown as PIXI.Application;

    gameStateService.resetGame();
  });

  it('initializes systems and attaches a game loop callback to ticker', () => {
    const controller = new GameController(
      mockApp,
      eventBus,
      gameStateService,
      inputSystem,
      audioSystem,
      entityManager,
      renderSystem,
      physicsSystem,
      spawningSystem,
      uiSystem
    );

    const addSpy = vi.spyOn(mockApp.ticker, 'add');
    controller.initialize();

    expect(addSpy).toHaveBeenCalledTimes(1);

    controller.dispose();
  });

  it('is idempotent on multiple initialize() calls', () => {
    const controller = new GameController(
      mockApp,
      eventBus,
      gameStateService,
      inputSystem,
      audioSystem,
      entityManager,
      renderSystem,
      physicsSystem,
      spawningSystem,
      uiSystem
    );

    const addSpy = vi.spyOn(mockApp.ticker, 'add');
    controller.initialize();
    controller.initialize(); // second call should be ignored

    expect(addSpy).toHaveBeenCalledTimes(1);

    controller.dispose();
  });

  it('removes ticker callback when dispose() is called', () => {
    const controller = new GameController(
      mockApp,
      eventBus,
      gameStateService,
      inputSystem,
      audioSystem,
      entityManager,
      renderSystem,
      physicsSystem,
      spawningSystem,
      uiSystem
    );

    controller.initialize();

    const removeSpy = vi.spyOn(mockApp.ticker, 'remove');
    controller.dispose();

    expect(removeSpy).toHaveBeenCalled();
  });
});

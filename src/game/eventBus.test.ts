import { describe, it, expect, vi } from 'vitest';
import { EventBus, GameEvent } from './eventBus';

describe('EventBus', () => {
  it('provides a singleton instance', () => {
    const bus1 = EventBus.getInstance();
    const bus2 = EventBus.getInstance();
    expect(bus1).toBe(bus2);
  });

  it('allows subscribing and receiving emitted events with correct payload', () => {
    const bus = EventBus.getInstance();
    const mockHandler = vi.fn();

    const subscription = bus.on<number>(GameEvent.SCORE_CHANGED).subscribe(mockHandler);

    bus.emit(GameEvent.SCORE_CHANGED, 42);
    expect(mockHandler).toHaveBeenCalledWith(42);

    bus.emit(GameEvent.SCORE_CHANGED, 100);
    expect(mockHandler).toHaveBeenCalledWith(100);
    expect(mockHandler).toHaveBeenCalledTimes(2);

    subscription.unsubscribe();
  });

  it('isolates different event types so handlers only receive their registered event', () => {
    const bus = EventBus.getInstance();
    const scoreHandler = vi.fn();
    const levelHandler = vi.fn();

    const sub1 = bus.on<number>(GameEvent.SCORE_CHANGED).subscribe(scoreHandler);
    const sub2 = bus.on<number>(GameEvent.LEVEL_CHANGED).subscribe(levelHandler);

    bus.emit(GameEvent.LEVEL_CHANGED, 3);
    expect(scoreHandler).not.toHaveBeenCalled();
    expect(levelHandler).toHaveBeenCalledWith(3);

    sub1.unsubscribe();
    sub2.unsubscribe();
  });

  it('stops delivering events after unsubscribing', () => {
    const bus = EventBus.getInstance();
    const mockHandler = vi.fn();

    const sub = bus.on(GameEvent.GAME_OVER).subscribe(mockHandler);
    bus.emit(GameEvent.GAME_OVER, null);
    expect(mockHandler).toHaveBeenCalledTimes(1);

    sub.unsubscribe();
    bus.emit(GameEvent.GAME_OVER, null);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('toggles debug logging without throwing', () => {
    const bus = EventBus.getInstance();
    expect(() => bus.enableDebug()).not.toThrow();
    bus.emit(GameEvent.SCORE_CHANGED, 10);
    expect(() => bus.disableDebug()).not.toThrow();
    bus.emit(GameEvent.SCORE_CHANGED, 20);
  });

  it('provides the raw event stream with full payload metadata', () => {
    const bus = EventBus.getInstance();
    const streamHandler = vi.fn();

    const sub = bus.getEventStream().subscribe(streamHandler);
    bus.emit(GameEvent.ORB_COLLECTED, 5);

    expect(streamHandler).toHaveBeenCalledWith({
      type: GameEvent.ORB_COLLECTED,
      data: 5
    });

    sub.unsubscribe();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { EventBus, GameEvent } from './eventBus';

describe('EventBus', () => {
  it('isolates separate instances so events emitted on one do not affect another', () => {
    const bus1 = new EventBus();
    const bus2 = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus1.on(GameEvent.SCORE_CHANGED).subscribe(handler1);
    bus2.on(GameEvent.SCORE_CHANGED).subscribe(handler2);

    bus1.emit(GameEvent.SCORE_CHANGED, 42);

    expect(handler1).toHaveBeenCalledWith(42);
    expect(handler2).not.toHaveBeenCalled();
  });

  it('supports strongly-typed custom event maps', () => {
    interface TestEvents {
      foo: { value: number };
      bar: string;
    }
    const typedBus = new EventBus<TestEvents>();
    const fooHandler = vi.fn();

    typedBus.on('foo').subscribe(fooHandler);
    typedBus.emit('foo', { value: 123 });

    expect(fooHandler).toHaveBeenCalledWith({ value: 123 });
  });

  it('allows subscribing and receiving emitted events with correct payload', () => {
    const bus = new EventBus();
    const mockHandler = vi.fn();

    const subscription = bus.on(GameEvent.SCORE_CHANGED).subscribe(mockHandler);

    bus.emit(GameEvent.SCORE_CHANGED, 42);
    expect(mockHandler).toHaveBeenCalledWith(42);

    bus.emit(GameEvent.SCORE_CHANGED, 100);
    expect(mockHandler).toHaveBeenCalledWith(100);
    expect(mockHandler).toHaveBeenCalledTimes(2);

    subscription.unsubscribe();
  });

  it('isolates different event types so handlers only receive their registered event', () => {
    const bus = new EventBus();
    const scoreHandler = vi.fn();
    const levelHandler = vi.fn();

    const sub1 = bus.on(GameEvent.SCORE_CHANGED).subscribe(scoreHandler);
    const sub2 = bus.on(GameEvent.LEVEL_CHANGED).subscribe(levelHandler);

    bus.emit(GameEvent.LEVEL_CHANGED, 3);
    expect(scoreHandler).not.toHaveBeenCalled();
    expect(levelHandler).toHaveBeenCalledWith(3);

    sub1.unsubscribe();
    sub2.unsubscribe();
  });

  it('stops delivering events after unsubscribing', () => {
    const bus = new EventBus();
    const mockHandler = vi.fn();

    const sub = bus.on(GameEvent.GAME_OVER).subscribe(mockHandler);
    bus.emit(GameEvent.GAME_OVER, null);
    expect(mockHandler).toHaveBeenCalledTimes(1);

    sub.unsubscribe();
    bus.emit(GameEvent.GAME_OVER, null);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('toggles debug logging without throwing', () => {
    const bus = new EventBus();
    expect(() => bus.enableDebug()).not.toThrow();
    bus.emit(GameEvent.SCORE_CHANGED, 10);
    expect(() => bus.disableDebug()).not.toThrow();
    bus.emit(GameEvent.SCORE_CHANGED, 20);
  });

  it('provides the raw event stream with full payload metadata', () => {
    const bus = new EventBus();
    const streamHandler = vi.fn();

    const sub = bus.getEventStream().subscribe(streamHandler);
    const orbData = { x: 10, y: 20 };
    bus.emit(GameEvent.ORB_COLLECTED, orbData);

    expect(streamHandler).toHaveBeenCalledWith({
      type: GameEvent.ORB_COLLECTED,
      data: orbData
    });

    sub.unsubscribe();
  });
});

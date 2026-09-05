/**
 * Minimal common lifecycle contracts for game systems.
 */
export interface GameSystem {
  initialize?(...args: unknown[]): void;
  dispose(): void;
}

export interface UpdatingGameSystem extends GameSystem {
  update(deltaSeconds: number): void;
}

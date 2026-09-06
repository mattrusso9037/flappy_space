export type PlayerToolId = 'wall-builder';

/** Omit gameplay.tools to disable tools. Configuration belongs only here. */
export interface PlayerToolsDefinition {
  equipped: PlayerToolId | null;
  wallBuilder: {
    width: number;
    height: number;
    maxActive: number;
    lifetimeSeconds: number;
  };
}

export type ToolUseResult = 'placed' | 'removed' | 'no-tool' | 'invalid-ground' | 'blocked' | 'empty';

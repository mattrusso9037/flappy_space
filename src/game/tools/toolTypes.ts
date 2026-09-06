export type PlayerToolId = 'wall-builder' | 'grapple-hook' | 'shovel';

/** Omit gameplay.tools to disable tools. Configuration belongs only here. */
export interface PlayerToolsDefinition {
  equipped: PlayerToolId | null;
  shovel?: { reach: number };
  grappleHook?: GrappleDefinition;
  wallBuilder?: {
    width: number;
    height: number;
    maxActive: number;
    lifetimeSeconds: number;
  };
}

export interface GrappleAnchor { id: string; x: number; y: number }
export interface GrappleDefinition {
  anchors: readonly GrappleAnchor[];
  range: number;
  pullSpeed: number; // world pixels per second
}

export type ToolUseResult = 'dug' | 'attached' | 'released' | 'invalid-target' | 'placed' | 'removed' | 'no-tool' | 'invalid-ground' | 'blocked' | 'empty';

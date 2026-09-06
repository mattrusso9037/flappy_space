import { CutsceneDefinition } from './cutsceneTypes';

export const OPENING_SPACEWALK: CutsceneDefinition = {
  id: 'opening-spacewalk',
  steps: [
    {
      type: 'music',
      musicId: 'weightless-space'
    },
    {
      type: 'scene',
      duration: 12,
      scene: {
        actors: [
          {
            id: 'service-ship',
            kind: 'ship',
            keyframes: [
              { time: 0, x: 280, y: 235, scale: 1, rotation: 0.0, alpha: 1 },
              { time: 6, x: 280, y: 235, scale: 1, rotation: 0.0, alpha: 1 },
              { time: 9, x: 240, y: 210, scale: 0.92, rotation: -0.08, alpha: 1 },
              { time: 12, x: 180, y: 180, scale: 0.8, rotation: -0.12, alpha: 1 }
            ]
          },
          {
            id: 'portal',
            kind: 'wormhole',
            keyframes: [
              { time: 0, x: 625, y: 310, scale: 0, rotation: 0.0, alpha: 0 },
              { time: 4, x: 625, y: 310, scale: 0.02, rotation: 0.0, alpha: 0 },
              { time: 5, x: 625, y: 310, scale: 0.35, rotation: 0.3, alpha: 0.8 },
              { time: 7, x: 625, y: 310, scale: 1, rotation: 1.3, alpha: 1 },
              { time: 10, x: 625, y: 310, scale: 1.25, rotation: 3.0, alpha: 1 },
              { time: 12, x: 625, y: 310, scale: 0.02, rotation: 5.0, alpha: 0 }
            ]
          },
          {
            id: 'safety-line',
            kind: 'tether',
            keyframes: [
              { time: 0, x: 222, y: 260, scale: 1, rotation: 0.0, alpha: 1 },
              { time: 5.5, x: 222, y: 260, scale: 1, rotation: 0.0, alpha: 1 },
              { time: 6.3, x: 222, y: 260, scale: 1.1, rotation: -0.2, alpha: 0 }
            ]
          },
          {
            id: 'spacewalking-pilot',
            kind: 'pilot',
            keyframes: [
              { time: 0, x: 310, y: 317, scale: 1, rotation: -0.2, alpha: 1 },
              { time: 1, x: 312, y: 313, scale: 1, rotation: -0.12, alpha: 1 },
              { time: 2, x: 308, y: 317, scale: 1, rotation: -0.25, alpha: 1 },
              { time: 3, x: 312, y: 313, scale: 1, rotation: -0.12, alpha: 1 },
              { time: 4, x: 310, y: 317, scale: 1, rotation: -0.2, alpha: 1 },
              { time: 5.3, x: 320, y: 321, scale: 1, rotation: -0.1, alpha: 1 },
              { time: 6.2, x: 340, y: 335, scale: 1, rotation: 0.2, alpha: 1 },
              { time: 7.2, x: 375, y: 345, scale: 0.95, rotation: 0.7, alpha: 1 },
              { time: 8.2, x: 440, y: 350, scale: 0.8, rotation: 1.7, alpha: 1 },
              { time: 9.1, x: 535, y: 335, scale: 0.5, rotation: 3.5, alpha: 1 },
              { time: 9.8, x: 622, y: 310, scale: 0.04, rotation: 6.0, alpha: 0 },
              { time: 12, x: 625, y: 310, scale: 0, rotation: 6.0, alpha: 0 }
            ]
          },
          {
            id: 'panel-repair',
            kind: 'repair-sparks',
            keyframes: [
              { time: 0, x: 304, y: 285, scale: 1, rotation: 0.0, alpha: 1 },
              { time: 0.3, x: 304, y: 285, scale: 0.6, rotation: 0.7, alpha: 0 },
              { time: 0.45, x: 304, y: 285, scale: 1, rotation: 1.4, alpha: 1 },
              { time: 0.7, x: 304, y: 285, scale: 0.6, rotation: 2.1, alpha: 0 },
              { time: 1, x: 304, y: 285, scale: 1, rotation: 2.8, alpha: 1 },
              { time: 1.2, x: 304, y: 285, scale: 0.6, rotation: 3.5, alpha: 0 },
              { time: 1.5, x: 304, y: 285, scale: 1, rotation: 4.2, alpha: 1 },
              { time: 1.8, x: 304, y: 285, scale: 0.6, rotation: 4.9, alpha: 0 },
              { time: 2, x: 304, y: 285, scale: 1, rotation: 5.6, alpha: 1 },
              { time: 2.3, x: 304, y: 285, scale: 0.6, rotation: 6.3, alpha: 0 },
              { time: 2.5, x: 304, y: 285, scale: 1, rotation: 7.0, alpha: 1 },
              { time: 2.9, x: 304, y: 285, scale: 0.6, rotation: 7.7, alpha: 0 },
              { time: 3.1, x: 304, y: 285, scale: 1, rotation: 8.4, alpha: 1 },
              { time: 3.4, x: 304, y: 285, scale: 0.6, rotation: 9.1, alpha: 0 },
              { time: 3.7, x: 304, y: 285, scale: 1, rotation: 9.8, alpha: 1 },
              { time: 4, x: 304, y: 285, scale: 0.6, rotation: 10.5, alpha: 0 },
              { time: 4.1, x: 304, y: 285, scale: 1, rotation: 11.2, alpha: 0 },
              { time: 12, x: 304, y: 285, scale: 0.6, rotation: 11.9, alpha: 0 }
            ]
          }
        ]
      }
    },
    {
      type: 'fade',
      direction: 'out',
      duration: 0.45
    }
  ]
};

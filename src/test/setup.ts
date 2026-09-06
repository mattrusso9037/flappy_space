import '@testing-library/jest-dom/vitest';

// Provide basic canvas 2D context mock for jsdom environment if needed by Pixi.js
if (typeof HTMLCanvasElement !== 'undefined') {
  // @ts-expect-error - Mocking getContext for jsdom test environment
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    _contextId: string
  ) {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Array(w * h * 4).fill(0),
      }),
      putImageData: () => {},
      createImageData: () => [],
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    };
  };
}

// Provide basic AudioContext mock for jsdom environment
if (typeof window !== 'undefined' && !window.AudioContext) {
  // @ts-expect-error - Mock AudioContext for jsdom
  window.AudioContext = class {
    sampleRate = 44100;
    createBuffer() {
      return {
        getChannelData: () => new Float32Array(100),
        length: 100,
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    get destination() {
      return {};
    }
  };
}

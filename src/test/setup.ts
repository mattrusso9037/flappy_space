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

// Provide comprehensive AudioContext and Audio mocks for jsdom environment
if (typeof window !== 'undefined') {
  const createMockAudioParam = (defaultValue = 1) => ({
    value: defaultValue,
    defaultValue,
    minValue: -1000,
    maxValue: 1000,
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    setTargetAtTime: () => {},
    setValueCurveAtTime: () => {},
    cancelScheduledValues: () => {},
  });

  const createMockNode = () => ({
    connect: () => {},
    disconnect: () => {},
  });

  if (!window.AudioContext) {
    // @ts-expect-error - Mock AudioContext for jsdom
    window.AudioContext = class {
      sampleRate = 44100;
      currentTime = 0;
      state: AudioContextState = 'running';

      get destination() {
        return createMockNode();
      }

      resume() {
        this.state = 'running';
        return Promise.resolve();
      }

      suspend() {
        this.state = 'suspended';
        return Promise.resolve();
      }

      close() {
        this.state = 'closed';
        return Promise.resolve();
      }

      createBuffer(numberOfChannels: number, length: number, sampleRate: number) {
        const channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
        return {
          numberOfChannels,
          length,
          sampleRate,
          duration: length / sampleRate,
          getChannelData: (channel: number) => channels[channel] || new Float32Array(length),
        };
      }

      createBufferSource() {
        return {
          ...createMockNode(),
          buffer: null,
          playbackRate: createMockAudioParam(1),
          detune: createMockAudioParam(0),
          loop: false,
          loopStart: 0,
          loopEnd: 0,
          start: () => {},
          stop: () => {},
          onended: null,
        };
      }

      createGain() {
        return {
          ...createMockNode(),
          gain: createMockAudioParam(1),
        };
      }

      createOscillator() {
        return {
          ...createMockNode(),
          type: 'sine' as OscillatorType,
          frequency: createMockAudioParam(440),
          detune: createMockAudioParam(0),
          start: () => {},
          stop: () => {},
          onended: null,
        };
      }

      createBiquadFilter() {
        return {
          ...createMockNode(),
          type: 'lowpass' as BiquadFilterType,
          frequency: createMockAudioParam(350),
          detune: createMockAudioParam(0),
          Q: createMockAudioParam(1),
          gain: createMockAudioParam(0),
        };
      }

      decodeAudioData(
        _audioData: ArrayBuffer,
        successCallback?: (decodedData: AudioBuffer) => void
      ) {
        const buffer = this.createBuffer(2, 44100, 44100) as unknown as AudioBuffer;
        successCallback?.(buffer);
        return Promise.resolve(buffer);
      }
    };
  }

  // JSDOM has a stub HTMLMediaElement that does not simulate play/pause state transitions
  if (typeof window.HTMLMediaElement !== 'undefined') {
    window.HTMLMediaElement.prototype.play = function () {
      Object.defineProperty(this, 'paused', { value: false, configurable: true });
      return Promise.resolve();
    };
    window.HTMLMediaElement.prototype.pause = function () {
      Object.defineProperty(this, 'paused', { value: true, configurable: true });
    };
    window.HTMLMediaElement.prototype.load = function () {};
  }
}

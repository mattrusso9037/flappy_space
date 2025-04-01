// Simple audio manager using the Web Audio API
class AudioManager {
  private context: AudioContext | null = null;
  private sounds: Record<string, AudioBuffer> = {};
  private initialized: boolean = false;

  constructor() {
    // Create context on user interaction to avoid autoplay restrictions
    this.initialize();
  }

  initialize() {
    if (this.initialized) return;
    
    try {
      this.context = new AudioContext();
      this.loadSounds();
      this.initialized = true;
    } catch (error) {
      console.error('Web Audio API not supported:', error);
    }
  }

  async loadSounds() {
    if (!this.context) return;

    const soundFiles = {
      jump: this.createSimpleTone(800, 0.1),   // Higher frequency for jump
      score: this.createSimpleTone(600, 0.15),  // Medium frequency for scoring
      hit: this.createSimpleTone(200, 0.2),     // Low frequency for collision
      levelUp: this.createSimpleTone(1200, 0.3) // Highest frequency for level up
    };

    this.sounds = soundFiles;
  }

  createSimpleTone(frequency: number, duration: number): AudioBuffer {
    if (!this.context) throw new Error('Audio context not initialized');
    
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      // Simple sine wave
      data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
      
      // Apply simple envelope
      const envelope = i < buffer.length * 0.1 
        ? i / (buffer.length * 0.1) // Attack
        : 1 - ((i - buffer.length * 0.1) / (buffer.length * 0.9)); // Decay/Release
      
      data[i] *= envelope;
    }
    
    return buffer;
  }

  play(soundName: 'jump' | 'score' | 'hit' | 'levelUp') {
    if (!this.context || !this.sounds[soundName]) return;
    
    // Ensure context is running (needed for Chrome's autoplay policy)
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    
    const source = this.context.createBufferSource();
    source.buffer = this.sounds[soundName];
    source.connect(this.context.destination);
    source.start();
  }
}

// Create a singleton instance
const audioManager = new AudioManager();
export default audioManager; 
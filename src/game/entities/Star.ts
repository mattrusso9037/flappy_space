import * as PIXI from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class Star {
  graphics: PIXI.Graphics;
  blinkSpeed: number;
  blinkDirection: number;
  alpha: number;
  speed: number;
  size: number;
  layer: number; // 0 = background, 1 = middle, 2 = foreground

  constructor(x: number, y: number, size: number, alpha: number, layer: number = 0) {
    this.size = size;
    this.layer = layer;
    
    // Set speed based on the layer (parallax effect)
    const layerSpeeds = [0.05, 0.15, 0.4]; // Reduced speeds for all layers (was [0.1, 0.3, 0.8])
    this.speed = layerSpeeds[layer] || 0.05;
    
    this.graphics = new PIXI.Graphics();
    
    // Adjust color slightly based on layer for depth perception
    let color;
    if (layer === 0) {
      color = 0x6666AA; // Distant stars (slightly purple)
    } else if (layer === 1) {
      color = 0xAAAAAA; // Middle stars (grey-white)
    } else {
      color = 0xFFFFFF; // Close stars (bright white)
    }
    
    // Draw the circle FIRST
    this.graphics.circle(0, 0, size);
    // THEN fill it
    this.graphics.fill({ color, alpha: alpha });
    this.graphics.x = x;
    this.graphics.y = y;
    
    this.blinkSpeed = 0.005 * Math.random();
    this.blinkDirection = Math.random() > 0.5 ? 1 : -1;
    this.alpha = alpha;
  }

  update() {
    // Movement is now handled in renderSystem.updateBackground
    // for more precise speed control
    
    // Handle blinking effect
    this.alpha += this.blinkSpeed * this.blinkDirection;
    
    if (this.alpha > 1) {
      this.alpha = 1;
      this.blinkDirection = -1;
    } else if (this.alpha < 0.2) {
      this.alpha = 0.2;
      this.blinkDirection = 1;
    }
    
    this.graphics.alpha = this.alpha;
  }
} 
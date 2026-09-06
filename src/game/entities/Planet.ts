import * as PIXI from 'pixi.js';
import { Obstacle } from './Obstacle';
import { Astronaut } from './Astronaut';
import { circleRectIntersect } from './utils';

// Define planet types with their colors
const PLANET_TYPES = [
    { color: 0xFF6B6B, name: 'red', hasRings: false },      // Red
    { color: 0x4ECDC4, name: 'cyan', hasRings: true },      // Cyan
    { color: 0xFFE66D, name: 'yellow', hasRings: false },   // Yellow
    { color: 0x6BFF94, name: 'green', hasRings: false },    // Green
    { color: 0xAB83FF, name: 'purple', hasRings: true },    // Purple
    { color: 0xFF83D6, name: 'pink', hasRings: false }      // Pink
];

export class Planet extends Obstacle {
    graphics: PIXI.Graphics;
    glowGraphics: PIXI.Graphics;
    radius: number;
    rotationSpeed: number;
    planetType: { color: number, name: string, hasRings: boolean };
    timeOffset: number;
    hasRings: boolean;

    constructor(x: number, y: number, radius: number, speed: number) {
        super(x, speed);
        this.y = y;
        this.radius = radius;
        this.timeOffset = Math.random() * Math.PI * 2; // Used for animations
        
        // Randomly select a planet type
        this.planetType = PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)];
        
        // 40% chance of having rings, overriding the default for this planet type
        this.hasRings = Math.random() < 0.4 ? true : this.planetType.hasRings;
        
        // Create planet graphics
        this.graphics = new PIXI.Graphics();
        
        // Create separate glow graphics (for better layering)
        this.glowGraphics = new PIXI.Graphics();
        
        this.drawPlanet();
        
        // Set positions
        this.graphics.x = x;
        this.graphics.y = y;
        this.glowGraphics.x = x;
        this.glowGraphics.y = y;
        
        // Add random rotation speed for visual interest
        this.rotationSpeed = (Math.random() * 0.02 - 0.01) * speed;
    }
    
    drawPlanet() {
        const g = this.graphics;
        const r = this.radius;
        const color = this.planetType.color;
        g.clear();
        this.drawGlow(color);
        if (this.hasRings) this.drawRings(color);
        const light = new PIXI.FillGradient({
            start: { x: 0, y: 0 }, end: { x: 1, y: 0.8 },
            colorStops: [
                { offset: 0, color: this.adjustColor(color, 1.3) },
                { offset: 0.5, color },
                { offset: 1, color: this.adjustColor(color, 0.22) },
            ],
        });
        g.once('destroyed', () => light.destroy());
        g.circle(0, 0, r).fill(light).stroke({ color, width: 1.5 });
        this.drawSurfaceDetails(color);
        g.arc(0, 0, r * 0.96, -2.8, -1).stroke({ color: 0xe2f8ff, alpha: 0.6, width: 1 });
    }

    // Helper method to safely adjust color
    adjustColor(color: number, factor: number): number {
        // Extract RGB components
        const r = ((color >> 16) & 0xFF) * factor;
        const g = ((color >> 8) & 0xFF) * factor;
        const b = (color & 0xFF) * factor;
        
        // Clamp values to valid range (0-255)
        const clampedR = Math.min(255, Math.max(0, Math.floor(r)));
        const clampedG = Math.min(255, Math.max(0, Math.floor(g)));
        const clampedB = Math.min(255, Math.max(0, Math.floor(b)));
        
        // Recombine into a single color value
        return (clampedR << 16) | (clampedG << 8) | clampedB;
    }
    
    drawGlow(baseColor: number) {
        this.glowGraphics.clear();
        for (let i = 4; i > 0; i--) {
            this.glowGraphics.circle(0, 0, this.radius + i * 2.5)
                .fill({ color: baseColor, alpha: 0.035 });
        }
    }

    drawRings(baseColor: number) {
        this.graphics.ellipse(0, 0, this.radius * 1.5, this.radius * 0.32)
            .stroke({ color: baseColor, alpha: 0.5, width: 3 });
    }

    drawSurfaceDetails(baseColor: number) {
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.radius * 0.65;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const r = this.radius * (0.06 + Math.random() * 0.12);
            this.graphics.circle(x, y, r).fill({ color: this.adjustColor(baseColor, 0.4), alpha: 0.4 })
                .arc(x, y, r, 0.2, 2.8).stroke({ color: baseColor, alpha: 0.6, width: 0.8 });
        }
    }

    update(deltaTime: number = 1/60) {
        // Track speed for diagnostics
        this.trackSpeed();
        
        // Update position
        const moveDistance = this.speed * deltaTime * 60; // Normalize for 60fps
        this.x -= moveDistance;
        this.graphics.x = this.x;
        this.glowGraphics.x = this.x;
        
        // Stable geometry; only transforms change during flight.
        this.timeOffset += deltaTime;
        this.graphics.rotation += this.rotationSpeed * deltaTime * 6;
        this.glowGraphics.alpha = 0.8 + 0.1 * Math.sin(this.timeOffset);
    }
    
    isOffScreen(): boolean {
        return this.x + this.radius * 2 < 0; // Include glow in calculation
    }
    
    checkCollision(astronaut: Astronaut): boolean {
        if (astronaut.dead) return false;
        
        // Use the astronaut's custom hitbox instead of the sprite bounds
        const astronautBounds = astronaut.getHitbox();
        
        // For collision, we only use the main planet body, not the glow or rings
        // Use the more accurate circle-rectangle intersection check
        return circleRectIntersect(
            this.x,  // Planet center X
            this.y,  // Planet center Y
            this.radius * 0.9,  // Use 90% of radius for a more forgiving collision
            astronautBounds
        );
    }
} 
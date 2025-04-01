import * as PIXI from 'pixi.js';
import { Obstacle } from './Obstacle';
import { Astronaut } from './Astronaut';
import { rectanglesIntersect } from './utils';

export class Orb extends Obstacle {
    graphics: PIXI.Graphics;
    glowGraphics: PIXI.Graphics;
    radius: number;
    rotationSpeed: number;
    glowPulseSpeed: number;
    glowSize: number;
    timeOffset: number;
    collected: boolean;

    constructor(x: number, y: number, radius: number, speed: number) {
        super(x, speed);
        this.y = y;
        this.radius = radius;
        this.timeOffset = Math.random() * Math.PI * 2; // Used for animations
        this.collected = false;
        
        // Create orb graphics
        this.graphics = new PIXI.Graphics();
        
        // Create separate glow graphics (for better layering)
        this.glowGraphics = new PIXI.Graphics();
        this.glowSize = this.radius * 0.7;
        
        this.drawOrb();
        
        // Set positions
        this.graphics.x = x;
        this.graphics.y = y;
        this.glowGraphics.x = x;
        this.glowGraphics.y = y;
        
        // Add random rotation for visual interest
        this.rotationSpeed = (Math.random() * 0.05 - 0.025);
        this.glowPulseSpeed = 0.05 + Math.random() * 0.03;
    }
    
    drawOrb() {
        const g = this.graphics;
        g.clear();
        
        // Draw outer glow
        this.drawGlow();
        
        // Draw the main orb body - blue color
        const orbColor = 0x00AAFF;
        
        g.beginFill(orbColor);
        g.drawCircle(0, 0, this.radius);
        g.fill();
        
        // Add gradient overlay for depth
        const gradientLight = new PIXI.FillGradient({
            type: 'linear',
            start: { x: 0, y: 0 },
            end: { x: this.radius * 2, y: this.radius * 2 },
            colorStops: [
                { offset: 0, color: 0x00DDFF },  // Lighter at top-left
                { offset: 1, color: 0x0066AA }   // Darker at bottom-right
            ],
            textureSpace: 'local'
        });
        
        // Use fill with gradient
        g.fill({ fill: gradientLight, alpha: 0.6 });
        g.drawCircle(0, 0, this.radius);
        
        // Add inner highlight
        g.beginFill(0xFFFFFF, 0.5);
        g.drawCircle(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.2);
        g.fill();
    }
    
    drawGlow() {
        const glow = this.glowGraphics;
        glow.clear();
        
        // Create a bright glowing effect
        const outerGlowRadius = this.radius + this.glowSize;
        
        // Use gradient for glow
        const glowGradient = new PIXI.FillGradient({
            type: 'radial',
            center: { x: 0, y: 0 },
            innerRadius: 0,
            outerRadius: outerGlowRadius,
            colorStops: [
                { offset: 0, color: 0x66DDFF },
                { offset: 0.5, color: 0x00AAFF },
                { offset: 1, color: 0x0066AA }
            ],
            textureSpace: 'local'
        });
        
        glow.fill({ fill: glowGradient, alpha: 0.4 });
        glow.drawCircle(0, 0, outerGlowRadius);
    }
    
    update() {
        if (this.collected) return;
        
        // Update position
        this.x -= this.speed;
        this.graphics.x = this.x;
        this.glowGraphics.x = this.x;
        
        // Update animation time
        const time = performance.now() * 0.001;
        
        // Add rotation for visual effect
        this.graphics.rotation += this.rotationSpeed;
        
        // Pulse glow effect
        const pulseFactor = 0.3 * Math.sin(time * this.glowPulseSpeed + this.timeOffset) + 1.2;
        this.glowGraphics.scale.set(pulseFactor);
        
        // Update glow opacity subtly
        this.glowGraphics.alpha = 0.3 + 0.2 * Math.sin(time * this.glowPulseSpeed * 1.5 + this.timeOffset);
    }
    
    collect() {
        this.collected = true;
        // Add a quick animation for collection effect
        return 50; // Points awarded for collecting this orb
    }
    
    isOffScreen(): boolean {
        return this.x + this.radius * 2 < 0; // Include glow in calculation
    }
    
    checkCollision(astronaut: Astronaut): boolean {
        if (astronaut.dead || this.collected) return false;
        
        const astronautBounds = astronaut.sprite.getBounds();
        
        // For collision, we only use the main orb body, not the glow
        const orbBounds = new PIXI.Bounds();
        orbBounds.minX = this.x - this.radius;
        orbBounds.maxX = this.x + this.radius;
        orbBounds.minY = this.y - this.radius;
        orbBounds.maxY = this.y + this.radius;
        
        return rectanglesIntersect(astronautBounds, orbBounds);
    }
} 
import * as PIXI from 'pixi.js';
import { Obstacle } from './Obstacle';
import { Astronaut } from './Astronaut';
import { rectanglesIntersect } from './utils';
import { INK, MOTION } from '../visuals/tokens';
import { getLogger } from '../../utils/logger';

const logger = getLogger('Orb');

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
        const r = this.radius;
        this.graphics.clear()
            .circle(0, 0, r).fill(INK.void).stroke({ color: INK.cyan, width: 1.5 })
            .circle(0, 0, r * 0.7).fill(INK.violet)
            .circle(-r * 0.18, -r * 0.16, r * 0.47).fill(0x747cff)
            .circle(-r * 0.32, -r * 0.3, r * 0.2).fill(INK.ice)
            .arc(0, 0, r * 1.22, -0.5, 1.2).stroke({ color: INK.cyan, width: 1 })
            .arc(0, 0, r * 1.22, 2.6, 4.3).stroke({ color: INK.violet, width: 1 });
        this.drawGlow();
    }

    drawGlow() {
        this.glowGraphics.clear();
        for (let i = 5; i > 0; i--) {
            this.glowGraphics.circle(0, 0, this.radius * (1 + i * 0.2))
                .fill({ color: i % 2 ? INK.violet : INK.cyan, alpha: 0.035 });
        }
    }

    update(deltaTime: number = 1/60) {
        if (this.collected) return;
        
        // Track speed for diagnostics
        this.trackSpeed();
        
        // Update position
        const moveDistance = this.speed * deltaTime * 60; // Normalize for 60fps
        this.x -= moveDistance;
        this.graphics.x = this.x;
        this.glowGraphics.x = this.x;
        
        // Update animation time
        this.timeOffset += deltaTime;
        const time = this.timeOffset;
        
        // Add rotation for visual effect
        this.graphics.rotation += deltaTime * 0.45;
        
        // Pulse glow effect
        const pulse = Math.sin(time * Math.PI * 2 / MOTION.pulse);
        this.glowGraphics.scale.set(1 + pulse * 0.12);
        this.glowGraphics.alpha = 0.8 + pulse * 0.2;
    }
    
    collect(): void {
        if (this.collected) return;
        
        this.collected = true;
        logger.info(`Orb collected at ${this.x}, ${this.y}`);
        
        // Make graphics invisible immediately to avoid flickering
        // The UI system will handle all visual animation
        this.graphics.visible = false;
        this.glowGraphics.visible = false;
    }
    
    isOffScreen(): boolean {
        return this.x + this.radius * 2 < 0; // Include glow in calculation
    }
    
    checkCollision(astronaut: Astronaut): boolean {
        if (astronaut.dead || this.collected) return false;
        
        // Use the astronaut's custom hitbox instead of the sprite bounds
        const astronautBounds = astronaut.getHitbox();
        
        // For collision, we only use the main orb body, not the glow
        const orbBounds = new PIXI.Bounds();
        orbBounds.minX = this.x - this.radius;
        orbBounds.maxX = this.x + this.radius;
        orbBounds.minY = this.y - this.radius;
        orbBounds.maxY = this.y + this.radius;
        
        return rectanglesIntersect(astronautBounds, orbBounds);
    }
} 
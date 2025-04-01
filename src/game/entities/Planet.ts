import * as PIXI from 'pixi.js';
import { Obstacle } from './Obstacle';
import { Astronaut } from './Astronaut';
import { rectanglesIntersect } from './utils';

// Define planet types with their colors
const PLANET_TYPES = [
    { color: 0xFF6B6B, name: 'red' },      // Red
    { color: 0x4ECDC4, name: 'cyan' },     // Cyan
    { color: 0xFFE66D, name: 'yellow' },   // Yellow
    { color: 0x6BFF94, name: 'green' },    // Green
    { color: 0xAB83FF, name: 'purple' },   // Purple
    { color: 0xFF83D6, name: 'pink' }      // Pink
];

export class Planet extends Obstacle {
    graphics: PIXI.Graphics;
    radius: number;
    rotationSpeed: number;
    planetType: { color: number, name: string };

    constructor(x: number, y: number, radius: number, speed: number) {
        super(x, speed);
        this.y = y;
        this.radius = radius;
        
        // Randomly select a planet type
        this.planetType = PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)];
        
        // Create planet graphics
        this.graphics = new PIXI.Graphics();
        this.drawPlanet();
        
        // Set position
        this.graphics.x = x;
        this.graphics.y = y;
        
        // Add random rotation speed for visual interest
        this.rotationSpeed = (Math.random() * 0.02 - 0.01) * speed;
    }
    
    drawPlanet() {
        const g = this.graphics;
        g.clear();
        
        // Draw planet circle
        g.circle(0, 0, this.radius);
        g.fill({ color: this.planetType.color });
        
        // Add some details to make it look more like a planet
        // Darker border
        g.lineStyle({ width: this.radius * 0.05, color: this.planetType.color * 0.7 });
        g.circle(0, 0, this.radius);
        
        // Draw some craters or features on the planet
        const craterColor = this.planetType.color * 0.8;
        const numFeatures = Math.floor(Math.random() * 5) + 2;
        
        for (let i = 0; i < numFeatures; i++) {
            // Random position within the planet
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.radius * 0.7;
            const craterX = Math.cos(angle) * distance;
            const craterY = Math.sin(angle) * distance;
            const craterRadius = this.radius * (Math.random() * 0.15 + 0.05);
            
            g.circle(craterX, craterY, craterRadius);
            g.fill({ color: craterColor });
        }
    }
    
    update() {
        // Update position
        this.x -= this.speed;
        this.graphics.x = this.x;
        
        // Add rotation for visual effect
        this.graphics.rotation += this.rotationSpeed;
    }
    
    isOffScreen(): boolean {
        return this.x + this.radius < 0;
    }
    
    checkCollision(astronaut: Astronaut): boolean {
        if (astronaut.dead) return false;
        
        const astronautBounds = astronaut.sprite.getBounds();
        const planetBounds = this.graphics.getBounds();
        
        return rectanglesIntersect(astronautBounds, planetBounds);
    }
} 
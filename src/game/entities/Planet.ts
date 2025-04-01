import * as PIXI from 'pixi.js';
import { Obstacle } from './Obstacle';
import { Astronaut } from './Astronaut';
import { rectanglesIntersect } from './utils';

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
    ringRotationSpeed: number;
    glowPulseSpeed: number;
    glowSize: number;
    planetType: { color: number, name: string, hasRings: boolean };
    ringAngle: number;
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
        this.glowSize = this.radius * 0.3;
        
        this.drawPlanet();
        
        // Set positions
        this.graphics.x = x;
        this.graphics.y = y;
        this.glowGraphics.x = x;
        this.glowGraphics.y = y;
        
        // Add random rotation speeds for visual interest
        this.rotationSpeed = (Math.random() * 0.02 - 0.01) * speed;
        this.ringRotationSpeed = (Math.random() * 0.005 - 0.0025) * speed;
        this.glowPulseSpeed = 0.03 + Math.random() * 0.02;
        this.ringAngle = Math.random() * Math.PI * 2;
    }
    
    drawPlanet() {
        const g = this.graphics;
        g.clear();
        
        // Get the base planet color
        const planetColor = this.planetType.color;
        
        // Draw outer glow
        this.drawGlow(planetColor);
        
        // Draw rings if this planet has them
        if (this.hasRings) {
            this.drawRings(planetColor);
        }
        
        // Draw the main planet body
        g.fill({ color: planetColor });
        g.circle(0, 0, this.radius);
        
        // Add gradient overlay for depth
        const gradMatrix = new PIXI.Matrix();
        gradMatrix.translate(-this.radius * 0.5, -this.radius * 0.5);
        
        // Convert color values properly using bitwise operations to ensure they're valid
        const lighterColor = this.adjustColor(planetColor, 1.2);
        
        // Lighter side gradient (light source from top-left)
        const gradientLight = new PIXI.FillGradient({
            type: 'linear',
            start: { x: 0, y: 0 },
            end: { x: this.radius * 2, y: this.radius * 2 },
            colorStops: [
                { offset: 0, color: lighterColor },  // Lighter at top-left
                { offset: 1, color: planetColor }    // Normal at bottom-right
            ],
            textureSpace: 'local'
        });
        
        // Use fill with gradient
        g.fill({ fill: gradientLight, alpha: 0.6 });
        g.circle(0, 0, this.radius);
        
        // Darker border for depth
        g.setStrokeStyle({
            width: this.radius * 0.05,
            color: this.adjustColor(planetColor, 0.7)
        });
        g.stroke();
        g.circle(0, 0, this.radius);
        
        // Draw surface details
        this.drawSurfaceDetails(planetColor);
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
        const glow = this.glowGraphics;
        glow.clear();
        
        // Create a subtle glow/aura effect
        const outerGlowRadius = this.radius + this.glowSize;
        
        // Safely adjust colors
        const brighterColor = this.adjustColor(baseColor, 1.2);
        
        // Use gradient for glow
        const glowGradient = new PIXI.FillGradient({
            type: 'radial',
            center: { x: 0, y: 0 },
            innerRadius: 0,
            outerRadius: outerGlowRadius,
            colorStops: [
                { offset: 0, color: brighterColor },
                { offset: 0.5, color: baseColor },
                { offset: 1, color: baseColor }
            ],
            textureSpace: 'local'
        });
        
        glow.fill({ fill: glowGradient, alpha: 0.15 });
        glow.circle(0, 0, outerGlowRadius);
    }
    
    drawRings(baseColor: number) {
        const g = this.graphics;
        
        // Save current angle for animation
        const ringTilt = Math.sin(this.ringAngle) * 0.6;
        
        // Draw the rings
        const ringOuterRadius = this.radius * 1.8;
        const ringInnerRadius = this.radius * 1.1;
        
        // Create a matrix for the elliptical transform
        const ringMatrix = new PIXI.Matrix();
        ringMatrix.translate(0, 0);
        ringMatrix.scale(1, ringTilt); // Flatten to create oval
        
        // Draw the ring with elliptical transform - use safer color adjustment
        g.fill({ color: this.adjustColor(baseColor, 1.1), alpha: 0.6 });
        
        // Draw ring as donut (outer circle - inner circle)
        g.circle(0, 0, ringOuterRadius);
        g.circle(0, 0, ringInnerRadius); // Use circle instead of drawCircle
        
        // Add some ring detail (bands)
        const numBands = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < numBands; i++) {
            const bandRadius = ringInnerRadius + 
                (ringOuterRadius - ringInnerRadius) * (i + 0.5) / numBands;
            
            // Calculate color safely
            const bandColorFactor = 0.9 + Math.random() * 0.3;
            
            // Use setStrokeStyle instead of lineStyle
            g.setStrokeStyle({
                width: (ringOuterRadius - ringInnerRadius) * 0.1,
                color: this.adjustColor(baseColor, bandColorFactor),
                alpha: 0.7
            });
            
            // Draw an elliptical arc
            g.ellipse(0, 0, bandRadius, bandRadius * ringTilt);
        }
        
        // Reset line style
        g.setStrokeStyle({width: 0});
    }
    
    drawSurfaceDetails(baseColor: number) {
        const g = this.graphics;
        
        // Draw some craters or features on the planet
        const craterColor = this.adjustColor(baseColor, 0.8);
        const highlightColor = this.adjustColor(baseColor, 1.2);
        const numFeatures = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < numFeatures; i++) {
            // Random position within the planet
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.radius * 0.7;
            const craterX = Math.cos(angle) * distance;
            const craterY = Math.sin(angle) * distance;
            const craterRadius = this.radius * (Math.random() * 0.15 + 0.05);
            
            // Draw crater with highlight on one side
            g.fill({ color: craterColor });
            g.circle(craterX, craterY, craterRadius);
            
            // Add a small highlight on one side
            const highlightAngle = angle + Math.PI / 4;
            const highlightX = craterX + Math.cos(highlightAngle) * (craterRadius * 0.5);
            const highlightY = craterY + Math.sin(highlightAngle) * (craterRadius * 0.5);
            const highlightRadius = craterRadius * 0.4;
            
            g.fill({ color: highlightColor, alpha: 0.5 });
            g.circle(highlightX, highlightY, highlightRadius);
        }
        
        // Add some swirls or gas cloud details for gas giants (larger planets)
        if (this.radius > 30) {
            const numSwirls = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < numSwirls; i++) {
                const swirl = new PIXI.Graphics();
                
                // Swirl parameters
                const swirlX = (Math.random() * 2 - 1) * this.radius * 0.5;
                const swirlY = (Math.random() * 2 - 1) * this.radius * 0.6;
                const swirlWidth = this.radius * (0.4 + Math.random() * 0.3);
                const swirlHeight = this.radius * (0.1 + Math.random() * 0.1);
                const swirlRotation = Math.random() * Math.PI * 2;
                
                // Use safe color calculation
                const swirlColorFactor = 0.9 + Math.random() * 0.2;
                
                // Draw the swirl
                swirl.fill({ color: this.adjustColor(baseColor, swirlColorFactor), alpha: 0.5 });
                swirl.ellipse(swirlX, swirlY, swirlWidth, swirlHeight);
                swirl.rotation = swirlRotation;
                
                g.addChild(swirl);
            }
        }
    }
    
    update() {
        // Update position
        this.x -= this.speed;
        this.graphics.x = this.x;
        this.glowGraphics.x = this.x;
        
        // Update animation time
        const time = performance.now() * 0.001;
        
        // Add rotation for visual effect
        this.graphics.rotation += this.rotationSpeed;
        
        // Animate rings if present
        if (this.hasRings) {
            this.ringAngle += this.ringRotationSpeed;
        }
        
        // Pulse glow effect
        const pulseFactor = 0.2 * Math.sin(time * this.glowPulseSpeed + this.timeOffset) + 1;
        this.glowGraphics.scale.set(pulseFactor);
        
        // Update glow opacity subtly
        this.glowGraphics.alpha = 0.6 + 0.1 * Math.sin(time * this.glowPulseSpeed * 1.5 + this.timeOffset);
        
        // Redraw if necessary for animated features
        if (this.hasRings && Math.abs(this.ringRotationSpeed) > 0.001) {
            this.drawPlanet();
        }
    }
    
    isOffScreen(): boolean {
        return this.x + this.radius * 2 < 0; // Include glow in calculation
    }
    
    checkCollision(astronaut: Astronaut): boolean {
        if (astronaut.dead) return false;
        
        const astronautBounds = astronaut.sprite.getBounds();
        
        // For collision, we only use the main planet body, not the glow or rings
        // Make a temporary bounds object that's the same size as the planet
        const planetBounds = new PIXI.Bounds();
        planetBounds.minX = this.x - this.radius;
        planetBounds.maxX = this.x + this.radius;
        planetBounds.minY = this.y - this.radius;
        planetBounds.maxY = this.y + this.radius;
        
        return rectanglesIntersect(astronautBounds, planetBounds);
    }
} 
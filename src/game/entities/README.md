# Flappy Spaceman Game Entities

This directory contains the various game entities used in the Flappy Spaceman game.

## Structure

- `Astronaut.ts` - The main player character controlled by the user
- `Obstacle.ts` - Abstract base class for all obstacles in the game
  - `PipeObstacle` - Legacy pipe-style obstacles (top and bottom pipes)
- `Planet.ts` - Colorful planet obstacles that the player must avoid
- `Star.ts` - Background stars with parallax effect to create depth
- `utils.ts` - Utility functions used by the entities
- `index.ts` - Barrel file for easier importing

## Usage

To use these entities in other files, import them from the entities directory:

```typescript
import { Astronaut, Obstacle, Planet, Star } from './entities';
```

## Obstacle System

The game uses an abstract `Obstacle` base class that defines common behavior for all obstacles:
- Movement from right to left
- Collision detection with the player
- Score tracking when passed

The `Planet` class extends `Obstacle` to create colorful, rotating planet obstacles that appear randomly in the game space. 
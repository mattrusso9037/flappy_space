# Flappy Spaceman Game Entities

This directory contains the various game entities used in the Flappy Spaceman game.

## Structure

- `Astronaut.ts` - The main player character controlled by the user
- `Obstacle.ts` - The obstacles (pipes) that the player must avoid
- `Star.ts` - Background stars with parallax effect to create depth
- `utils.ts` - Utility functions used by the entities
- `index.ts` - Barrel file for easier importing

## Usage

To use these entities in other files, import them from the entities directory:

```typescript
import { Astronaut, Obstacle, Star } from './entities';
``` 
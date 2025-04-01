# Flappy Space Game Architecture

This document explains the architecture of the Flappy Space game and how the different components work together.

## Core Architecture

The game is built using a reactive pattern with RxJS and a modular system architecture. The main components are:

1. **EventBus**: A central pub/sub system that enables decoupled communication between systems
2. **GameStateService**: Manages the core game state using RxJS BehaviorSubjects
3. **Systems**: Independent modules that handle specific aspects of the game

## EventBus

The EventBus enables communication between different parts of the game without tight coupling. It uses RxJS Subjects and Observables for pub/sub patterns.

```typescript
// Publishing an event
eventBus.publish(GameEvent.JUMP_ACTION, null);

// Subscribing to an event
eventBus.on(GameEvent.SCORE_CHANGED).subscribe(newScore => {
  console.log(`Score changed to: ${newScore}`);
});
```

## GameStateService

The GameStateService manages the core game state like score, level, and game status. It uses RxJS BehaviorSubjects for reactive state updates.

```typescript
// Get current state
const currentState = gameStateService.getState();

// Subscribe to the full state observable
gameStateService.getState$().subscribe(state => {
  console.log('Game state updated:', state);
});

// Subscribe to a specific part of the state
gameStateService.select(state => state.score).subscribe(score => {
  console.log('Score updated:', score);
});

// Update the state
gameStateService.incrementScore(10);
gameStateService.collectOrb();
gameStateService.startGame();
```

## Systems

Systems are independent modules that handle specific aspects of the game:

1. **AudioSystem**: Manages sound effects and music based on game events
2. **InputSystem**: Handles player input and translates it to game actions
3. **EntityManager**: (to be implemented) Manages game entities
4. **RenderSystem**: (to be implemented) Handles rendering to the screen
5. **PhysicsSystem**: (to be implemented) Manages physics and collision detection

Each system follows the same pattern:

```typescript
// Initialize the system
someSystem.initialize();

// Clean up when done
someSystem.dispose();
```

## Adding a New System

To add a new system, follow this pattern:

1. Create a new file in the systems directory
2. Implement the singleton pattern
3. Subscribe to relevant events from the EventBus
4. Use GameStateService for state access
5. Keep responsibilities focused and single-purpose

## Example: Implementing the Astronaut Movement in the New Architecture

In the new architecture, the astronaut's movement would be handled by a combination of systems:

```typescript
// InputSystem receives jump command
inputSystem.handleJumpAction = () => {
  eventBus.publish(GameEvent.JUMP_ACTION, null);
};

// PhysicsSystem (to be implemented) handles the astronaut's movement
physicsSystem.update = (deltaTime) => {
  // Apply gravity to astronaut
  // Check if jump action was received
  // Apply jump impulse
};

// AudioSystem reacts to jump event
audioSystem.setupEventListeners = () => {
  eventBus.on(GameEvent.JUMP_ACTION).subscribe(() => {
    audioManager.play('jump');
  });
};
```

## Migration Strategy

To migrate from the old architecture to the new one:

1. First, install RxJS with `npm install rxjs`
2. Create the core EventBus and GameStateService
3. Create individual systems one by one
4. Replace direct method calls with event publishing/subscribing
5. Move state management to GameStateService

## Best Practices

1. Keep systems focused on a single responsibility
2. Use the EventBus for communication between systems
3. Use GameStateService for state management
4. Unsubscribe from RxJS subscriptions to prevent memory leaks
5. Use TypeScript interfaces to define event payloads
6. Initialize systems in a logical order 
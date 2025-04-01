# Flappy Spaceman

A modern remake of the classic Flappy Spaceman game using React, Pixi.js, and Electron.

## Project Description

This project is a reimplementation of a simple HTML/Canvas game into a modern web and desktop application. It uses:

- React for UI components and state management
- Pixi.js for high-performance game rendering
- Electron for packaging as a desktop application

## Development

### Prerequisites

- Node.js (>= 16)
- npm (>= 8)

### Setup

1. Clone the repository
2. Install dependencies:

```
npm install
```

### Running

For web development:

```
npm run dev
```

For Electron development:

```
npm run electron:dev
```

### Building

For web:

```
npm run build
```

For desktop:

```
npm run electron:package
```

## Project Structure

- `src/` - React and game code
  - `components/` - React UI components
  - `game/` - Game logic and Pixi.js integration
  - `assets/` - Game assets
  - `styles/` - CSS files
- `electron/` - Electron configuration
- `public/` - Static assets

## License

See the LICENSE file for details.

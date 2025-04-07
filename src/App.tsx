import { useState, useEffect, useCallback } from 'react'
import GameDisplay from './components/GameDisplay'
import Scoreboard from './components/Scoreboard'
import LevelMessage from './components/LevelMessage'
import './App.css'
import { GameState } from './game/gameStateService'

function App() {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    level: 1,
    warps: 0,
    time: 0,
    orbsCollected: 0,
    orbsRequired: 5,
    timeLimit: 60000,
    timeRemaining: 60000,
    isStarted: false,
    isGameOver: false,
    isLevelComplete: false,
    debugMode: false
  })
  

  return (
    <div className="App">
      <header className="App-header">
        <h1>Flappy Spaceman</h1>
      </header>
      
      <main className="App-main">
        <div className="game-container">
          <GameDisplay  />
          
    
        </div>
      </main>
      
      {gameState.isLevelComplete && (
        <LevelMessage 
          level={gameState.level} 
          isVisible={gameState.isLevelComplete}
        />
      )}
    </div>
  )
}

export default App

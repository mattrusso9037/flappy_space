import { useState, useEffect } from 'react'
import GameDisplay from './components/GameDisplay'
import LevelMessage from './components/LevelMessage'
import './App.css'
import { GameState, gameStateService } from './game/gameStateService'

function App() {
  // Game state
  const [gameState, setGameState] = useState<GameState>(gameStateService.getState())

  useEffect(() => {
    const sub = gameStateService.getState$().subscribe(setGameState)
    return () => sub.unsubscribe()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>Flappy Spaceman</h1>
      </header>
      
      <main className="App-main">
        <div className="game-container">
          <GameDisplay />
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

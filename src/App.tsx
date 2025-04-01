import { useState, useEffect } from 'react'
import GameDisplay from './components/GameDisplay'
import Controls from './components/Controls'
import Scoreboard from './components/Scoreboard'
import MessageBox from './components/MessageBox'
import LevelMessage from './components/LevelMessage'
import { GameState } from './game/gameState'
import './App.css'
import Button from './components/Button'

function App() {
  // Game state
  const [gameStarted, setGameStarted] = useState(false)
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    level: 1,
    warps: 0,
    time: 0,
    isStarted: false,
    isGameOver: false,
    isLevelComplete: false
  })
  
  // Handle state updates from the game manager
  const handleGameStateChange = (newState: GameState) => {
    setGameState(newState)
    
    // Update UI state based on game state
    if (newState.isGameOver) {
      setGameStarted(false)
    } else if (newState.isStarted && !gameStarted) {
      setGameStarted(true)
    }
  }
  
  // Game actions
  const handleStartGame = () => {
    setGameStarted(true)
  }
  
  const handleResetGame = () => {
    setGameStarted(false)
    // We'll trigger a reset in the game manager through the props
  }
  
  const handleGameClick = () => {
    // This is handled in the GameDisplay component
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Flappy Spaceman</h1>
      </header>
      
      <main className="App-main">
        <div className="game-container">
          <GameDisplay 
            gameStarted={gameStarted} 
            onGameClick={handleGameClick}
            onGameStateChange={handleGameStateChange}
          />
          
          <div className="game-ui">
            <div className="game-controls">
              <div className="game-stats">
                <p>Score: {gameState.score}</p>
                <p>Level: {gameState.level}</p>
              </div>
              
              {!gameStarted && (
                <div className="game-buttons">
                  <Button onClick={handleStartGame}>
                    {gameState.isGameOver ? 'Try Again' : 'Start Game'}
                  </Button>
                </div>
              )}
              
              {gameStarted && (
                <div className="game-buttons">
                  <Button onClick={handleResetGame}>Reset</Button>
                </div>
              )}
            </div>
            
            <div className="game-instructions">
              <h3>Controls:</h3>
              <ul>
                <li>Press <strong>Space</strong>, <strong>↑</strong>, or <strong>W</strong> key to fly</li>
                <li>Click or tap the screen to fly</li>
                <li>Avoid obstacles and collect points</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="App-footer">
        <p>Made with React, TypeScript, and Pixi.js</p>
      </footer>
    </div>
  )
}

export default App

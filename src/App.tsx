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
    orbsCollected: 0,
    orbsRequired: 5,
    timeLimit: 60000,
    timeRemaining: 60000,
    isStarted: false,
    isGameOver: false,
    isLevelComplete: false,
    debugMode: false
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
    // If the game is over, we need to trigger a full reset before starting
    if (gameState.isGameOver) {
      // First set gameStarted to false to fully reset
      setGameStarted(false);
      
      // Then use setTimeout to give the GameDisplay component time to reset
      setTimeout(() => {
        setGameStarted(true);
      }, 100);
    } else {
      // Normal game start
      setGameStarted(true);
    }
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
            <div className="game-info">
              <Scoreboard 
                score={gameState.score}
                level={gameState.level}
                warps={gameState.warps}
                time={gameState.time}
                orbsCollected={gameState.orbsCollected}
                orbsRequired={gameState.orbsRequired}
                timeRemaining={gameState.timeRemaining}
              />
            </div>
            
        
            
           
          </div>
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

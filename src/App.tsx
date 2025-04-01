import { useState, useEffect } from 'react'
import GameDisplay from './components/GameDisplay'
import Controls from './components/Controls'
import Scoreboard from './components/Scoreboard'
import MessageBox from './components/MessageBox'
import LevelMessage from './components/LevelMessage'
import { GameState } from './game/gameState'
import './App.css'

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
  
  const handleReset = () => {
    setGameStarted(false)
  }
  
  const handleFlap = () => {
    // This is just a UI action - the actual flap happens in the game manager
    // We still need this to handle the button clicks
  }

  return (
    <div className="game-container">
      <h1>Flappy Spaceman</h1>
      
      <GameDisplay 
        gameStarted={gameStarted} 
        onGameClick={handleFlap}
        onGameStateChange={handleGameStateChange}
      />
      
      <Controls 
        gameStarted={gameStarted} 
        onFlap={handleFlap}
        onReset={handleReset}
      />
      
      <Scoreboard 
        score={gameState.score}
        level={gameState.level}
        warps={gameState.warps}
        time={gameState.time}
      />
      
      <MessageBox 
        message={gameState.isGameOver ? "Game Over!" : "Welcome to Flappy Spaceman!"}
        isVisible={!gameStarted || gameState.isGameOver}
        onStartGame={handleStartGame}
      />
      
      <LevelMessage 
        isVisible={gameState.isLevelComplete}
        level={gameState.level - 1} // Show the completed level
      />
    </div>
  )
}

export default App

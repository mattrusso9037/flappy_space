import { useState, useEffect } from 'react'
import GameDisplay from './components/GameDisplay'
import Controls from './components/Controls'
import Scoreboard from './components/Scoreboard'
import MessageBox from './components/MessageBox'
import LevelMessage from './components/LevelMessage'
import './App.css'

function App() {
  // Game state
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [warps, setWarps] = useState(0)
  const [time, setTime] = useState(0)
  const [showLevelMessage, setShowLevelMessage] = useState(false)
  
  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    
    if (gameStarted && !gameOver) {
      interval = setInterval(() => {
        setTime(prev => prev + 100) // Add 100ms
      }, 100)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [gameStarted, gameOver])
  
  // Game actions
  const handleStartGame = () => {
    setGameStarted(true)
    setGameOver(false)
    setScore(0)
    setLevel(1)
    setWarps(0)
    setTime(0)
  }
  
  const handleReset = () => {
    setGameStarted(false)
    setGameOver(false)
  }
  
  const handleFlap = () => {
    // In Phase 3, this will trigger the game's flap/boost logic
    if (!gameOver) {
      setScore(prev => prev + 10)
      
      // Demo level up when score reaches multiples of 100
      if (score > 0 && score % 100 === 0) {
        handleLevelUp()
      }
    }
  }
  
  const handleLevelUp = () => {
    setLevel(prev => prev + 1)
    setWarps(prev => prev + 1)
    setShowLevelMessage(true)
    
    setTimeout(() => {
      setShowLevelMessage(false)
    }, 3000)
  }
  
  // For demo purposes - game over when score reaches 300
  useEffect(() => {
    if (score >= 300) {
      setGameOver(true)
    }
  }, [score])

  return (
    <div className="game-container">
      <h1>Flappy Spaceman</h1>
      
      <GameDisplay 
        gameStarted={gameStarted && !gameOver} 
        onGameClick={handleFlap}
      />
      
      <Controls 
        gameStarted={gameStarted && !gameOver} 
        onFlap={handleFlap}
        onReset={handleReset}
      />
      
      <Scoreboard 
        score={score}
        level={level}
        warps={warps}
        time={time}
      />
      
      <MessageBox 
        message={gameOver ? "Game Over!" : "Welcome to Flappy Spaceman!"}
        isVisible={!gameStarted || gameOver}
        onStartGame={handleStartGame}
      />
      
      <LevelMessage 
        isVisible={showLevelMessage}
        level={level - 1} // Show the completed level
      />
    </div>
  )
}

export default App

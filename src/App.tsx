import { useState } from 'react'
import GameDisplay from './components/GameDisplay'
import './App.css'

function App() {
  const [gameStarted, setGameStarted] = useState(false)

  return (
    <div className="game-container">
      <h1>Flappy Spaceman</h1>
      
      <GameDisplay gameStarted={gameStarted} />
      
      <div className="controls">
        <button onClick={() => setGameStarted(true)}>
          {gameStarted ? 'Boost' : 'Start Game'}
        </button>
        {gameStarted && (
          <button onClick={() => setGameStarted(false)}>
            Retry
          </button>
        )}
      </div>
      
      <div className="scoreboard">
        <div>Score: 0</div>
        <div>Level: 1</div>
        <div>Warps: 0</div>
        <div>Time: 0s</div>
      </div>
    </div>
  )
}

export default App

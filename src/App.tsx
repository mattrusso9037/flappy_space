import GameDisplay from './components/GameDisplay'
import './App.css'
import './styles/visual-foundation.css'

function App() {
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
      


    </div>
  )
}

export default App

import { DEMO_CAMPAIGN, DEMO_STORAGE_KEY } from './game/campaign/demoCampaign'
import GameDisplay from './components/GameDisplay'
import './App.css'
import './styles/visual-foundation.css'

function App() {
  const demo = new URLSearchParams(window.location.search).get('demo') === 'relay-vault';
  return (
    <div className="App">
      <header className="App-header">
        <h1>{demo ? 'The Relay Vault' : 'Flappy Spaceman'}</h1>
        {demo && <div className="demo-brief">
          <p>Recover all 8 energy orbs. Jump the steps, grapple over the vault, and reach the final relay.</p>
          <p>A / D or arrows: move · Space: thrust (land to recharge) · E: grapple / release · X: release</p>
          <p>Face an anchor above you and press E. Release, then steer onto the next platform.
            Miss a landing? The ground is safe. Try again.</p>
          <small>Keyboard demo · 3-minute run · Grapple equipped</small>
        </div>}
      </header>
      
      <main className="App-main">
        <div className="game-container">
          <GameDisplay campaign={demo ? DEMO_CAMPAIGN : undefined} storageKey={demo ? DEMO_STORAGE_KEY : undefined} />
        </div>
      </main>
      


    </div>
  )
}

export default App

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initLogger, LogLevel, Logger } from './utils/logger'

// Initialize logger with appropriate level
const isDevelopment = import.meta.env.DEV;
initLogger({
  level: isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR,
  showTimestamp: true,
  showLogLevel: true
});

Logger.info('Application starting...', {
  env: isDevelopment ? 'development' : 'production',
  version: import.meta.env.VITE_APP_VERSION || 'unknown'
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

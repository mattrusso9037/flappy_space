const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Better detect development mode
const isDev = process.env.NODE_ENV === 'development' || 
              !fs.existsSync(path.join(__dirname, '../dist/index.html'));

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Load the app
  if (isDev) {
    // In development, load from the dev server
    console.log('Running in development mode, trying to load from dev server...');
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      console.error('Failed to load from dev server. Please start the dev server first with: npm run dev');
      // Fallback to the built files if they exist
      if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
        console.log('Loading from built files as fallback...');
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
      }
    });
    // Open DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the built files
    console.log('Running in production mode, loading from built files...');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', function () {
  // On macOS, applications and their menu bar typically stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  // On macOS, re-create a window in the app when the dock icon is clicked and there are no other windows open
  if (mainWindow === null) createWindow();
}); 
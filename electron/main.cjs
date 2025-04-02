const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Better detect development mode
const isDev = process.env.NODE_ENV === 'development' || 
              !fs.existsSync(path.join(__dirname, '../dist/index.html'));

// Log important paths for debugging
console.log('App paths:');
console.log('- __dirname:', __dirname);
console.log('- App path:', app.getAppPath());
console.log('- Current working directory:', process.cwd());
console.log('- Development mode:', isDev);

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      // Enable more detailed Chromium logging
      additionalArguments: ['--enable-logging=stderr', '--v=1']
    }
  });

  // Enable DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Log when page loads or fails
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
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

// Register the file protocol for direct asset access
// This ensures assets can be loaded using the file:// protocol when packaged
app.whenReady().then(() => {
  // Register file protocol handler
  protocol.registerFileProtocol('file', (request, callback) => {
    // Extract the file path from the request URL
    const filePath = decodeURIComponent(request.url.slice('file://'.length));
    try {
      callback({ path: filePath });
    } catch (error) {
      console.error('Failed to register protocol:', error);
    }
  });

  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', function () {
  // On macOS, applications and their menu bar typically stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  // On macOS, re-create a window in the app when the dock icon is clicked and there are no other windows open
  if (mainWindow === null) createWindow();
}); 
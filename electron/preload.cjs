const { contextBridge } = require('electron');

// Expose a limited API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // You can add functions here that will be accessible from the renderer process
  // Example: getAppVersion: () => app.getVersion(),
}); 
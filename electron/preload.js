const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific Electron functionality without exposing the entire API
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  isElectron: true
});

// Log that preload script loaded successfully
console.log('LitRevTool Electron preload script loaded');

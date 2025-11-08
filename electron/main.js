const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Initialize settings store
const store = new Store({
  defaults: {
    apiMode: 'local', // 'local' or 'cloud'
    localApiUrl: 'http://localhost:8000',
    cloudApiUrl: 'https://litrev.haielab.org'
  }
});

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: getIconPath(),
    backgroundColor: '#ffffff',
    show: false, // Don't show until ready-to-show
    title: 'LitRevTool'
  });

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL ||
                   `file://${path.join(__dirname, '../frontend/build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Development mode - open DevTools
  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Create application menu
  createMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getIconPath() {
  const iconDir = path.join(__dirname, 'assets');

  if (process.platform === 'darwin') {
    return path.join(iconDir, 'icon.icns');
  } else if (process.platform === 'win32') {
    return path.join(iconDir, 'icon.ico');
  } else {
    return path.join(iconDir, 'icon.png');
  }
}

// Get current API URL based on mode
function getCurrentApiUrl() {
  const mode = store.get('apiMode');
  if (mode === 'cloud') {
    return store.get('cloudApiUrl');
  }
  return store.get('localApiUrl');
}

// Get current API mode
function getApiMode() {
  return store.get('apiMode');
}

// Set API mode
function setApiMode(mode) {
  if (mode !== 'local' && mode !== 'cloud') {
    throw new Error('Invalid API mode. Must be "local" or "cloud"');
  }
  store.set('apiMode', mode);

  // Reload the window to apply new API URL
  if (mainWindow) {
    mainWindow.reload();
  }
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'API Mode',
          submenu: [
            {
              label: 'Local (localhost:8000)',
              type: 'radio',
              checked: getApiMode() === 'local',
              click: () => {
                setApiMode('local');
                createMenu(); // Rebuild menu to update checkmarks
              }
            },
            {
              label: 'Cloud (litrev.haielab.org)',
              type: 'radio',
              checked: getApiMode() === 'cloud',
              click: () => {
                setApiMode('cloud');
                createMenu(); // Rebuild menu to update checkmarks
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Current API: ' + getCurrentApiUrl(),
          enabled: false
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/ai4he/litrevtool');
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/ai4he/litrevtool/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About LitRevTool',
              message: 'LitRevTool v1.0.0',
              detail: 'A literature review tool that overcomes Google Scholar\'s 1000-paper limit by automatically splitting searches by year and running them in parallel.\n\nDeveloped by the AI4HE Lab',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  // Add developer menu in development mode
  if (process.env.ELECTRON_START_URL) {
    template.push({
      label: 'Developer',
      submenu: [
        { role: 'toggleDevTools' },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for settings
ipcMain.handle('get-api-url', () => {
  return getCurrentApiUrl();
});

ipcMain.handle('get-api-mode', () => {
  return getApiMode();
});

ipcMain.handle('set-api-mode', (event, mode) => {
  setApiMode(mode);
  return getCurrentApiUrl();
});

// App lifecycle events
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep app running until explicit Quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent navigation to external sites
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow navigation to localhost and file protocol
    if (parsedUrl.protocol === 'file:' ||
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1') {
      return;
    }

    // Block all other navigation
    event.preventDefault();
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Application Error', error.message);
});

# LitRevTool Desktop Application

Desktop version of LitRevTool built with Electron.

## Features

- Native desktop application for Windows, macOS, and Linux
- Uses the same React frontend as the web application
- Connects to the LitRevTool backend API
- Offline-capable once initial data is loaded

## Development

### Prerequisites

- Node.js >= 18.0.0
- Backend server running on `http://localhost:8000`
- Frontend build or dev server running on `http://localhost:3001`

### Setup

```bash
# Install dependencies
cd electron
npm install
```

### Running in Development Mode

```bash
# Make sure the backend is running
cd ../backend-node
npm run dev

# In another terminal, make sure the frontend dev server is running
cd ../frontend
npm start

# In another terminal, start the Electron app
cd ../electron
npm run dev
```

The Electron app will load the React frontend from `http://localhost:3001` in development mode.

### Building for Production

```bash
# First, build the React frontend
cd ../frontend
npm run build

# Then build the Electron app
cd ../electron
npm run build

# Or build for specific platforms
npm run build:mac     # macOS
npm run build:win     # Windows
npm run build:linux   # Linux
```

The built applications will be in `electron/dist/`.

## Architecture

The Electron app consists of:

- **main.js**: Main Electron process that creates the application window
- **preload.js**: Preload script for secure IPC between main and renderer processes
- **Frontend**: The React application (from `../frontend/build`)
- **Backend**: Connects to the Node.js backend API (requires backend server to be running)

## Configuration

### API URL

By default, the app connects to `http://localhost:8000` for the backend API. To change this:

1. Set the `REACT_APP_API_URL` environment variable before building the frontend
2. Rebuild the frontend with the new API URL
3. Rebuild the Electron app

```bash
cd frontend
REACT_APP_API_URL=https://your-api-server.com npm run build

cd ../electron
npm run build
```

### Development vs Production

- **Development**: Loads from `http://localhost:3001` (React dev server)
- **Production**: Loads from `../frontend/build/index.html` (built React app)

The mode is determined by the `ELECTRON_START_URL` environment variable:
- If set: Development mode
- If not set: Production mode

## Security

The Electron app implements several security best practices:

- **Context Isolation**: Enabled to prevent renderer process from accessing Node.js APIs
- **Node Integration**: Disabled in renderer process
- **Preload Script**: Used for safe IPC communication
- **External Link Handling**: External URLs open in the system browser, not within the app
- **Navigation Protection**: Prevents navigation to non-localhost URLs

## Distribution

### macOS

- **DMG**: Drag-and-drop installer
- **ZIP**: Portable application

Requires code signing for distribution outside development.

### Windows

- **NSIS Installer**: Traditional Windows installer with custom installation directory option
- **Portable**: Standalone executable

### Linux

- **AppImage**: Universal Linux package
- **DEB**: Debian/Ubuntu package

## Troubleshooting

### Cannot connect to backend

Ensure the backend server is running:
```bash
cd backend-node
npm run dev
```

### White screen on launch

1. Check if frontend is built: `ls -la ../frontend/build`
2. If not, build it: `cd ../frontend && npm run build`
3. Rebuild Electron app: `cd ../electron && npm run build`

### Development mode not working

1. Ensure frontend dev server is running: `cd ../frontend && npm start`
2. Ensure backend is running: `cd ../backend-node && npm run dev`
3. Run Electron in dev mode: `npm run dev`

## Package Scripts

- `npm start`: Run in production mode (requires built frontend)
- `npm run dev`: Run in development mode (loads from localhost:3001)
- `npm run build`: Build for all platforms
- `npm run build:mac`: Build for macOS only
- `npm run build:win`: Build for Windows only
- `npm run build:linux`: Build for Linux only
- `npm run pack`: Package without building installers (faster for testing)

## File Structure

```
electron/
├── main.js                 # Main Electron process
├── preload.js             # Preload script for IPC
├── package.json           # Electron app dependencies and build config
├── assets/                # Application icons
│   ├── icon.icns         # macOS icon
│   ├── icon.ico          # Windows icon
│   └── icon.png          # Linux icon
└── dist/                  # Built applications (created after build)
```

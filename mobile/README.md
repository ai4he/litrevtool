# LitRevTool Mobile App

Hybrid mobile app for iOS and Android built with React + Capacitor.

## Overview

The LitRevTool mobile app is built using **Capacitor**, which wraps the existing React web frontend into native iOS and Android applications. This means:

- ✅ **Single Source**: Same React codebase for web, desktop (Electron), and mobile (Capacitor)
- ✅ **Easy Updates**: Build once, deploy to all platforms
- ✅ **Native Features**: Access to device capabilities (camera, notifications, etc.)
- ✅ **App Store Ready**: Can be published to Apple App Store and Google Play Store

## Architecture

```
React Frontend (Single Source)
    ↓
    ├── 🌐 Web App (served by Node.js backend)
    ├── 💻 Desktop App (Electron wrapper)
    └── 📱 Mobile App (Capacitor wrapper)
        ├── iOS (Xcode project)
        └── Android (Android Studio project)
```

## Quick Start

### 1. Install Dependencies

```bash
# From project root
npm run mobile:install
```

### 2. Initialize Capacitor (First Time Only)

```bash
npm run mobile:init
```

When prompted:
- **App name**: LitRevTool
- **App ID**: org.haielab.litrevtool
- **Web directory**: build

### 3. Add Mobile Platforms

```bash
# Add iOS platform (requires macOS)
npm run mobile:add:ios

# Add Android platform
npm run mobile:add:android
```

### 4. Build and Sync

```bash
# Build React app and sync to mobile platforms
npm run mobile:sync
```

## Development Workflow

### Option 1: Build All Platforms at Once

```bash
# Build web + mobile + desktop from single source
npm run build:all
```

This single command:
1. Builds the React frontend
2. Syncs to mobile platforms (iOS + Android)
3. Builds the Electron desktop app

### Option 2: Mobile-Only Development

```bash
# Build and open in Xcode
npm run mobile:build:ios

# Build and open in Android Studio
npm run mobile:build:android
```

## API Configuration

The mobile app needs to connect to your backend API. You have three options:

### Option 1: Production API (Recommended)

Use the production API at `https://litrev.haielab.org`:

1. Build with production API:
```bash
cd frontend
REACT_APP_API_URL=https://litrev.haielab.org npm run build
npm run mobile:sync
```

### Option 2: Local Development

For development, you can point to your local backend:

1. Edit `frontend/capacitor.config.ts`:
```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:3001',  // e.g., http://192.168.1.100:3001
  cleartext: true  // Allow HTTP in development
}
```

2. Find your local IP:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

3. Build and sync:
```bash
npm run mobile:sync
```

### Option 3: Android Emulator Localhost

For Android emulator specifically, use the special IP that maps to host localhost:

```typescript
server: {
  url: 'http://10.0.2.2:3001',
  cleartext: true
}
```

## Building for Production

### iOS App Store

1. Open in Xcode:
```bash
npm run mobile:open:ios
```

2. In Xcode:
   - Set signing certificate (Apple Developer account required)
   - Select target device: "Any iOS Device (arm64)"
   - Product → Archive
   - Distribute App → App Store Connect

### Google Play Store

1. Open in Android Studio:
```bash
npm run mobile:open:android
```

2. In Android Studio:
   - Build → Generate Signed Bundle / APK
   - Create/select signing key
   - Build release AAB (Android App Bundle)
   - Upload to Google Play Console

## Mobile-Specific Features

The mobile app includes native features:

- **Splash Screen**: Customizable splash screen with app branding
- **Status Bar**: Native status bar styling
- **Back Button**: Android hardware back button support
- **App State Management**: Handles app backgrounding/foregrounding
- **Offline Support**: Can cache data for offline viewing (future enhancement)

## File Structure

```
frontend/
├── capacitor.config.ts       # Capacitor configuration
├── package.json              # Includes mobile scripts
├── src/
│   ├── mobile.js            # Mobile initialization & features
│   └── index.js             # Calls mobile.js on startup
├── ios/                     # iOS app (created by Capacitor)
│   └── App/
│       └── App.xcodeproj    # Xcode project
└── android/                 # Android app (created by Capacitor)
    └── app/
        └── build.gradle     # Android config
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run mobile:install` | Install mobile dependencies |
| `npm run mobile:init` | Initialize Capacitor (first time) |
| `npm run mobile:add:ios` | Add iOS platform |
| `npm run mobile:add:android` | Add Android platform |
| `npm run mobile:sync` | Build React + sync to mobile |
| `npm run mobile:build:ios` | Build + open in Xcode |
| `npm run mobile:build:android` | Build + open in Android Studio |
| `npm run mobile:open:ios` | Open in Xcode |
| `npm run mobile:open:android` | Open in Android Studio |
| `npm run build:all` | Build all platforms (web + mobile + desktop) |

## Updating the Mobile App

To push updates to the mobile app:

1. Make changes to React code in `frontend/src/`
2. Build and sync:
```bash
npm run mobile:sync
```
3. Open in native IDE and test:
```bash
npm run mobile:open:ios
npm run mobile:open:android
```
4. Submit updates to app stores (if needed)

## Prerequisites

### For iOS Development (macOS only)

- macOS with Xcode installed
- Apple Developer account (for App Store submission)
- CocoaPods: `sudo gem install cocoapods`

### For Android Development

- Android Studio installed
- Java Development Kit (JDK) 11 or higher
- Android SDK (API level 24+)

### For Both Platforms

- Node.js 16+ and npm
- React app built in `frontend/build/`

## Troubleshooting

### iOS Build Fails

```bash
# Clean Xcode build
cd frontend/ios
rm -rf Pods DerivedData
pod install
```

### Android Build Fails

```bash
# Clean Gradle cache
cd frontend/android
./gradlew clean
```

### Changes Not Reflecting

```bash
# Force rebuild and sync
cd frontend
rm -rf build
npm run build
npm run mobile:sync
```

### Can't Connect to Backend

- Check `capacitor.config.ts` server URL
- Ensure backend is running and accessible
- For local development, use your machine's IP (not localhost)
- For Android emulator, use `10.0.2.2` instead of `localhost`

## Next Steps

1. **Add App Icons**: Replace default icons in `frontend/ios/App/Assets.xcassets/` and `frontend/android/app/src/main/res/`
2. **Customize Splash Screen**: Update splash screen in `capacitor.config.ts`
3. **Add Push Notifications**: Install `@capacitor/push-notifications` plugin
4. **Enable Offline Mode**: Implement service worker for offline caching
5. **Add Biometric Auth**: Use `@capacitor/biometric-auth` for fingerprint/Face ID

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Console](https://play.google.com/console)
- [React Documentation](https://react.dev)

## Support

For issues specific to LitRevTool mobile app, check:
- [Main README](../README.md) for general setup
- [CLAUDE.md](../CLAUDE.md) for developer guidance
- [Frontend README](../frontend/README.md) for React app details

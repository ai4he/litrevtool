# Google Cloud Console Setup for Mobile OAuth

This guide explains how to configure Google OAuth for the LitRevTool mobile apps (iOS and Android).

## Overview

The mobile app uses **native Google Sign-In** via the `@codetrix-studio/capacitor-google-auth` plugin, which requires additional configuration in Google Cloud Console beyond the web OAuth setup.

## Prerequisites

- Existing Google Cloud Project with OAuth configured for web
- Client ID: `337048330114-f2kimcqsu1fi4h1unmuno10cr8gcnetp.apps.googleusercontent.com`

## Steps to Configure Mobile OAuth

### 1. Open Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one containing the existing OAuth client ID)
3. Navigate to **APIs & Services** → **Credentials**

### 2. Configure OAuth Consent Screen (if not done)

1. Click on **OAuth consent screen** in the left sidebar
2. Ensure the following scopes are added:
   - `profile`
   - `email`
3. Save changes

### 3. Create iOS OAuth Client ID

1. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Select **iOS** as the application type
3. Fill in the following:
   - **Name**: `LitRevTool iOS`
   - **Bundle ID**: `org.haielab.litrevtool`
4. Click **CREATE**
5. **Save the iOS Client ID** (you'll need this for the app configuration)

### 4. Create Android OAuth Client ID

1. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Select **Android** as the application type
3. Fill in the following:
   - **Name**: `LitRevTool Android`
   - **Package name**: `org.haielab.litrevtool`
   - **SHA-1 certificate fingerprint**: (see below for how to get this)
4. Click **CREATE**

#### Getting SHA-1 Certificate Fingerprint

**For Development (Debug Keystore):**
```bash
# On macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# On Windows
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**For Production (Release Keystore):**
```bash
keytool -list -v -keystore /path/to/your-release-key.keystore -alias your-alias-name
```

Copy the SHA-1 fingerprint from the output and paste it into Google Cloud Console.

### 5. Update Capacitor Configuration

The `frontend/capacitor.config.ts` file should already be configured with:

```typescript
plugins: {
  GoogleAuth: {
    scopes: ['profile', 'email'],
    serverClientId: '337048330114-f2kimcqsu1fi4h1unmuno10cr8gcnetp.apps.googleusercontent.com',
    forceCodeForRefreshToken: true,
  },
}
```

**Important**: The `serverClientId` should be your **Web Client ID** (the same one used for the web app), not the iOS or Android client IDs.

### 6. Configure iOS App (Info.plist)

After running `npm run mobile:add:ios`, you need to add the OAuth client ID to `ios/App/App/Info.plist`:

```xml
<key>GIDClientID</key>
<string>337048330114-f2kimcqsu1fi4h1unmuno10cr8gcnetp.apps.googleusercontent.com</string>

<key>GIDServerClientID</key>
<string>337048330114-f2kimcqsu1fi4h1unmuno10cr8gcnetp.apps.googleusercontent.com</string>

<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.337048330114-f2kimcqsu1fi4h1unmuno10cr8gcnetp</string>
    </array>
  </dict>
</array>
```

### 7. Test the OAuth Flow

1. Build and run the mobile app:
   ```bash
   npm run mobile:build:ios    # For iOS
   npm run mobile:build:android # For Android
   ```

2. Tap the "Sign in with Google" button
3. You should see the native Google Sign-In dialog
4. After authentication, the app should redirect back and log you in

## Troubleshooting

### "Sign in attempt failed" on iOS
- Verify the `GIDClientID` in Info.plist matches your Web Client ID
- Ensure the iOS Client ID is created in Google Cloud Console
- Check that the Bundle ID matches exactly: `org.haielab.litrevtool`

### "Sign in attempt failed" on Android
- Verify the SHA-1 fingerprint is correct
- Ensure you're using the correct keystore (debug for development, release for production)
- Check that the Package name matches exactly: `org.haielab.litrevtool`

### "Request is malformed" error (web only)
- This error should NOT appear in mobile apps (they use native auth)
- If you see this in the mobile app, check that the plugin is initialized correctly
- Verify `Capacitor.isNativePlatform()` returns true in the mobile app

## Architecture Notes

- **Web/Desktop**: Uses `@react-oauth/google` with redirect-based OAuth flow
- **Mobile (iOS/Android)**: Uses `@codetrix-studio/capacitor-google-auth` with native SDKs
- **Detection**: `Capacitor.isNativePlatform()` determines which auth method to use
- **Backend**: Accepts ID tokens from both web and native OAuth flows

The Login component automatically detects the platform and uses the appropriate authentication method.

## References

- [Capacitor Google Auth Plugin](https://github.com/CodetrixStudio/CapacitorGoogleAuth)
- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios/start)
- [Google Sign-In for Android](https://developers.google.com/identity/sign-in/android/start)
- [Google Cloud Console](https://console.cloud.google.com/)

## Security Notes

- Never commit keystores or certificates to version control
- Use different OAuth client IDs for development and production
- Rotate credentials if they are ever exposed
- Enable 2FA for the Google Cloud Console account

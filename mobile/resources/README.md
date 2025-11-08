# Mobile App Resources

This directory contains assets for the mobile app (icons, splash screens, etc.).

## App Icon

### Requirements

- **iOS**: 1024x1024 PNG (no transparency)
- **Android**: 512x512 PNG (can have transparency)

### Quick Setup

1. Create your app icon (1024x1024 PNG)
2. Save it as `icon.png` in this directory
3. Run the icon generator:

```bash
cd frontend
npx @capacitor/assets generate --iconBackgroundColor '#1976d2' --iconBackgroundColorDark '#115293' --splashBackgroundColor '#1976d2'
```

This will automatically generate all required icon sizes for iOS and Android.

## Splash Screen

### Requirements

- **Recommended**: 2732x2732 PNG (centered square safe zone)
- **Background color**: Set in `capacitor.config.ts`

### Quick Setup

1. Create your splash screen image (2732x2732 PNG)
2. Save it as `splash.png` in this directory
3. Run the same generator command above

## Manual Icon Sizes

If you prefer to generate icons manually:

### iOS Sizes Required

- 1024x1024 (App Store)
- 180x180 (iPhone 3x)
- 120x120 (iPhone 2x)
- 167x167 (iPad Pro)
- 152x152 (iPad 2x)
- 76x76 (iPad)
- 40x40, 29x29, 20x20 (Settings, Spotlight)

### Android Sizes Required

- 512x512 (Play Store)
- xxxhdpi: 192x192
- xxhdpi: 144x144
- xhdpi: 96x96
- hdpi: 72x72
- mdpi: 48x48

## Default Icon

Currently using default Capacitor icon. Replace with your custom icon:

1. Design icon at 1024x1024
2. Use bold, simple design that works at small sizes
3. No text (text should be in app name, not icon)
4. Follow platform guidelines:
   - iOS: Rounded corners applied automatically
   - Android: Can use transparency

## Resources

- [iOS Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Android Icon Design Guidelines](https://developer.android.com/guide/practices/ui_guidelines/icon_design)
- [Capacitor Assets Tool](https://github.com/ionic-team/capacitor-assets)

## Color Scheme

LitRevTool brand colors:
- Primary: `#1976d2` (Blue)
- Primary Dark: `#115293`
- Secondary: `#dc004e` (Pink)
- Background: `#ffffff`

Use these colors for consistent branding across splash screens and icons.

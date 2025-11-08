# Application Icons

This directory should contain the application icons for different platforms:

- **icon.icns**: macOS icon (512x512 or higher)
- **icon.ico**: Windows icon (256x256 or higher)
- **icon.png**: Linux icon (512x512 PNG)

## Generating Icons

You can use tools like:

- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- [electron-icon-maker](https://www.npmjs.com/package/electron-icon-maker)
- Online services like [iConvert Icons](https://iconverticons.com/online/)

## Quick Setup

If you have a high-resolution PNG (1024x1024 recommended):

```bash
npm install -g electron-icon-builder
electron-icon-builder --input=your-icon.png --output=./assets
```

This will generate all required icon formats.

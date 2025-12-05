# Reels Always-Play + Controls (minimal)

A lightweight Chrome/Brave extension that keeps Instagram Reels playing in the background and provides reliable popup controls (Play/Pause, Next, Prev).  
This build uses a robust URL-navigation fallback for Next/Prev so controls work even when Instagram tab is not focused.

## Features
- Keeps only the currently visible reel playing (IntersectionObserver).
- Play / Pause the active reel via popup.
- Next / Prev via URL navigation (works in background tabs).
- MV3 compatible (Manifest V3).

## INSTALLATION------
1. Clone this repo. [go to the green code<> button ->copy the link -> open cmd/terminal/powershell -> type git clone <link you copied>]
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `background reels` folder.
5. Open Instagram and play a reel. Open the extension popup and use controls.

## Files
- `manifest.json` - MV3 manifest and permissions.
- `content.js` - main page logic injected into Instagram pages.
- `background.js` - minimal service worker (reserved).
- `popup/*` - extension popup UI and logic.

## Limitations / Known issues
- This extension uses only public pages/data. It does not log in to Instagram or collect credentials.
- Instagram may change how public data is embedded — content script uses multiple fallbacks to handle common cases. If `Next`/`Prev` fails, please open DevTools on the Instagram tab and inspect for `/reel/<code>/` links or `__NEXT_DATA__` content to help adapt the parser.
- Global OS-level hotkeys are intentionally not used to avoid conflicts since chromium based browsers dont allow it . Popup controls operate on the best available Instagram tab.

## Privacy
This extension does **not** collect or send user data anywhere. All operations happen locally in the browser.

## Contributing
If you want to improve next/prev detection or add a feature / fix a bug ; --- open an issue , submit a PR or mail me at mayukh.bandyo151@gmail.com

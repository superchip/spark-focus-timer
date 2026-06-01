# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spark is a Manifest V3 Chrome extension — a Pomodoro-style focus timer that opens uplifting break content (facts, quotes, curated websites) when breaks start. No build system, no npm, no bundler; all files are loaded directly by Chrome.

## Development Setup

Load unpacked in Chrome:
1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked" → select this directory

After editing any JS/HTML/CSS, click the refresh icon on the extension card in `chrome://extensions/` to reload it. The popup must be closed and reopened to pick up changes.

## Packaging for the Chrome Web Store

```bash
./package-for-store.sh
```

This creates `spark-focus-timer-v<version>-store-submission.zip` (excludes dev-only files automatically). Bump `"version"` in `manifest.json` before running.

## Architecture

### File roles

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest — permissions, entry points, CSP |
| `background.js` | Service worker: alarms, notifications, break-content tab opening, API fetching |
| `popup.html` / `popup.js` | Main UI — `SparkTimer` class owns all timer logic and UI updates |
| `options.html` / `options.js` | Settings page (CSP-compliant external script) |
| `styles.css` | All UI styling |
| `privacy.html` | Privacy disclosure required by Chrome Web Store |

### Data flow and persistence

The popup (`SparkTimer`) is ephemeral — Chrome closes it whenever the user clicks away. Timer continuity is maintained by:

- **`chrome.alarms`** (in `background.js`): `sparkTimer` fires at session end; `sparkKeepAlive` pings periodically to prevent service-worker sleep; `sparkTimerCheck` is a 1-minute backup.
- **`chrome.storage.local`** — `timerState` (running state, `sessionStartTime` timestamp), `stats` (daily), `backgroundDebugLogs`.
- **`chrome.storage.sync`** — `settings` (user preferences, synced across devices).

On popup open, `SparkTimer.restoreTimerState()` reads `timerState` and recalculates `timeLeft` from `sessionStartTime` so drift is minimized even after service-worker sleep.

### Session cycle

Focus → (every 4th: Long Break, otherwise Short Break) → Focus. Breaks start only when the user taps — no surprise tab-opening. Break content (fact/quote/website) is opened as a new tab by the background script, which then attempts to re-open the popup 600 ms later via `chrome.action.openPopup()`.

### Message passing (popup ↔ background)

All cross-context communication uses `chrome.runtime.sendMessage`. Key actions:
- `startBackgroundTimer` / `stopBackgroundTimer` — control alarms
- `openBreakContent` — background fetches API and opens tab
- `showNotification` — background creates Chrome notification with action buttons
- `breakContentOpened` — background notifies popup (if open) that content was opened
- `debugCommand`, `debugLog`, `clearDebugLogs` — debug system

### Content APIs

`background.js` fetches via `robustFetchJson()` (timeout + per-URL retry + fallback list):
- Facts: `uselessfacts.jsph.pl` → `catfact.ninja`
- Quotes: `api.quotegarden.io` → `api.quotable.io`

Any new API must also be added to `host_permissions` in `manifest.json` and disclosed in `privacy.html` and `PRIVACY_POLICY.md`.

## Debug Mode

Enable via popup Settings → "Enable Debug Mode". This reveals:
- A 🧪 button that opens the debug console
- **Test Mode**: 5-second timers for rapid cycle testing
- **Accelerated**: 60× speed multiplier
- Storage inspector, log export, and simulated notifications

In Chrome DevTools (popup or background service worker), look for `[SPARK BG *]` and `[SPARK POPUP *]` log prefixes.

To inspect storage from DevTools console:
```js
chrome.storage.sync.get(null, console.log);   // settings
chrome.storage.local.get(null, console.log);  // timerState, stats, logs
```

Hard reset all state:
```js
chrome.storage.sync.clear(); chrome.storage.local.clear();
```

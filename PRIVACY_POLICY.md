# Privacy Policy for Spark Focus Timer

**Effective Date:** June 2026  
**Version:** 1.1.2

## Overview
Spark Focus Timer respects your privacy and is committed to protecting your personal information. This policy explains how we handle data when you use our Chrome extension.

## Data Collection and Storage

### Local Storage (`chrome.storage.local`)
- Timer state (current session type, time remaining, session count)
- Daily statistics (completed sessions, total focus minutes, streak)
- Debug logs — only when Debug Mode is explicitly enabled by the user

### Sync Storage (`chrome.storage.sync`)
- User preferences: timer durations, break content toggles, notification preference, debug mode toggle

**No personal information** is stored in any of these areas.

## Chrome Sync and Google Servers
Preferences stored in `chrome.storage.sync` are synced across signed-in Google accounts when Chrome Sync is enabled. This means preference data (durations, toggle states) travels through Google's servers for cross-device synchronization. These preferences contain no personally identifiable information. Users can opt out by disabling Chrome Sync at `chrome://settings/syncSetup`. The extension works fully without sync.

## External Network Requests
Spark fetches content from public APIs **only during break periods** and **only for content types the user has enabled**:

| Content Type | Primary API | Fallback API |
|-------------|-------------|--------------|
| Facts | `https://uselessfacts.jsph.pl/` | `https://catfact.ninja/` |
| Quotes | `https://api.quotegarden.io/` | `https://api.quotable.io/` |

All requests are fully anonymous. No user data, identifiers, or browsing history are included. If all API endpoints are unavailable, no external request is made and no fallback URL is opened.

## What We Do NOT Collect
- No browsing history
- No personally identifiable information
- No analytics or telemetry
- No tracking pixels or fingerprinting
- No third-party advertising

## Debug Mode
An optional Debug Mode (disabled by default) is available via Settings. When enabled, it stores debug logs locally and allows simulation of timer sessions. Logs never leave the device and can be cleared at any time from the debug console or the Options page.

## Incognito Mode
The extension does not run in incognito windows (`"incognito": "not_allowed"`).

## Data Deletion
Users can delete all stored data at any time:
- **Options page** → "Delete All Extension Data" button
- **Uninstalling** the extension removes all data from the device

## Data Sharing
We never share, sell, or transmit user data to third parties. The only outbound network activity is the anonymous content API calls described above.

## Children's Privacy
Spark Focus Timer does not knowingly collect data from children under 13 years of age.

## Changes to This Policy
Updates to this policy will be included with extension updates. Continued use constitutes acceptance of the updated policy.

## Contact
For privacy questions or concerns, please open an issue at: https://github.com/superchip/spark_chrome_extension

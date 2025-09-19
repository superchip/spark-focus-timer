# Spark Focus Timer – Privacy Policy

_Last updated: 2025-09-19_

Spark Focus Timer ("Spark", "the extension") is a Chrome/Chromium browser extension designed to help you manage focused work sessions and intentional breaks. We take a **privacy-first** approach: no tracking, no analytics, no external data collection beyond the public content APIs you explicitly enable.

## 1. Data We Store Locally
All data is stored using Chrome's extension storage areas and **never leaves your device** unless your Chrome profile sync is enabled (then Chrome may sync `chrome.storage.sync` values between your own signed-in browsers). We store:

| Category | Purpose | Storage Area | Retention |
|----------|---------|--------------|-----------|
| Timer state (current session, time left) | Resume timer after popup closes | local | Removed when session resets or ends |
| Session statistics (completed sessions, total focus minutes, streak) | Daily productivity feedback | local | Automatically overwritten per day; cleared on uninstall |
| User preferences (durations, enabled content types, notifications toggle) | Persist your chosen configuration | sync | Until you change/reset or uninstall |
| Optional debug logs (if Debug Mode enabled) | Troubleshooting only | local | Manually clearable; never enabled by default |

## 2. Data We Do NOT Collect
We intentionally do **not** collect or transmit:
- Personal identity data
- Browsing history or visited URLs (aside from opening break content tabs you requested)
- Keystrokes, form data, clipboard contents
- Analytics / telemetry / usage tracking
- Advertising identifiers or profiling attributes
- Any data for third-party monetization

## 3. Network Requests
If you enable break content categories, Spark fetches from a _minimal_ set of public endpoints strictly to display content:
- Interesting facts: `https://uselessfacts.jsph.pl/`
- Cat facts (fallback): `https://catfact.ninja/`
- Quotes: `https://api.quotegarden.io/` and fallback `https://api.quotable.io/`

Responses are used immediately to render a local tab; no caching, re-sharing, or profiling is performed.

## 4. Permissions Justification
| Permission | Why It's Needed |
|------------|-----------------|
| `storage` | Save preferences, timer state, daily stats, optional debug logs |
| `alarms` | Drive timer progress reliably while popup is closed |
| `notifications` | Inform you when focus or break sessions end (optional) |
| Host permissions (the API domains above) | Fetch user‑enabled content for breaks |

No broad host patterns (`<all_urls>`) are requested. No `activeTab`, `tabs`, or scripting access to arbitrary sites is used.

## 5. Data Deletion & Control
You can remove all stored data by either:
- Uninstalling the extension
- Using the Options page reset for preferences
- Enabling Debug Mode and using the "Clear All Storage" control (advanced)

## 6. Children’s Privacy
Spark is a general productivity tool and does not target children. It collects no personal data.

## 7. Security Practices
- Minimal surface area: only essential permissions
- No remote code execution or eval usage
- Content Security Policy limits script execution to extension bundle (`script-src 'self'`)

## 8. Changes to This Policy
Material changes will update the "Last updated" date. Significant updates may be noted in the project repository README.

## 9. Contact
Questions or concerns? Open an issue in the repository:
https://github.com/superchip/spark_chrome_extension

---
**Plain Summary:** Spark stores only what it must to function (timer + preferences), never tracks you, and only calls the content APIs you opt into. Your focus data stays on your machine.

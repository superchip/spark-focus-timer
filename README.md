# ⚡ Spark Focus Timer (Chrome / Chromium Extension)

Minimal focus & break (Pomodoro-style) timer that turns breaks into uplifting micro‑discoveries: random facts, inspirational quotes, and curated sites. No tracking, no accounts, just flow.

## ✨ Core Features

| Area | Highlights |
|------|------------|
| Sessions | Focus / Short Break / Long Break cycle, manual start of breaks (no surprise tab spam) |
| Persistence | Runs via background alarms even if popup closed |
| Notifications | Desktop completion notifications with quick Start Break / Start Focus buttons |
| Break Content | Facts & Quotes (random enabled type each break) |
| Stats | Daily completed sessions, total focus minutes, streak indicator |
| Options Page | Adjust durations, toggle content, one-click reset |
| Privacy | Zero analytics, zero external tracking, local + sync storage only |
| Debug (Opt‑in) | Hidden console for QA: simulate sessions, inspect storage, export logs |

## 🆕 v1.1.2

- Removed curated website break content; breaks now show facts and quotes only

## v1.1.1

- Enhanced break content handling and session management

## v1.0.1

- Added `options.html` (Chrome Web Store friendly settings page)
- Added `privacy.html` (transparent data & permission disclosure)
- Manifest polish: `short_name`, `homepage_url`, `author`, removed unused `activeTab` permission
 

## 🔐 Privacy Snapshot

No telemetry. No third‑party analytics. Only outgoing requests are to the enabled content APIs:
`uselessfacts.jsph.pl` / `catfact.ninja` (facts) and `api.quotegarden.io` / `api.quotable.io` (quotes).

Full statement: `privacy.html`.

## 🛠 Development (Load Unpacked)
1. Clone repo
2. Open `chrome://extensions/`
3. Enable Developer Mode
4. Load Unpacked → choose project folder

## 🏪 Chrome Web Store Submission Checklist

Already done in repo:
- Manifest V3 compliant, minimal permissions (`storage`, `notifications`, `alarms` + required host permissions)
- 16 / 32 / 48 / 128 icons in `icons/`
- Privacy Policy page included (`privacy.html`)
- Options page declared (`options.html`)
- Version bumped to 1.0.1

Still recommended before publishing:
- Capture 3–5 screenshots (1280×800 preferred). Ideas:
	1. Focus timer running
	2. Break session ready screen
	3. Options page (durations + toggles)
	4. Break content tab (fact or quote page)
- (Optional) Create a promo tile / cover image (branding consistency)

Packaging (exclude dev docs if desired):
```
zip -r spark-focus-timer-1.0.1.zip . \
	-x "*.git*" "*DEBUG*" "test-*" "*.py" "pyproject.toml" "TROUBLESHOOTING.md" "TESTING.md"
```

## 🧪 Debug Mode (Optional)
Enable via popup Settings → Debug Mode. Gives access to a debug console: simulate sessions, speed multiplier, storage inspector, export logs. Disabled by default; normal users never see it.

## 🔄 Session Logic
After each Focus session: user manually starts the break (prevents surprise new tabs). After a Short Break or Long Break: user starts the next Focus session. Every 4th focus yields a long break.

 

## 🧩 Customization Pointers
- Add new break content API types in `background.js` (`fetchFact`/`fetchQuote` pattern) and `popup.js` (`openBreakContent`)
- Adjust styling in `styles.css`
- Modify stats model in `popup.js` (`updateStats`, `updateStatsDisplay`)

## 🪪 License
MIT (add a LICENSE file if distributing broadly).

## 🤝 Contributing
PRs welcome: new content sources, accessibility improvements, UX refinements, localization.

---
Enjoy calmer, more meaningful breaks – and ship more deep work. ⚡
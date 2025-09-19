# Chrome Web Store Listing Content (Spark Focus Timer)

Use this file when filling out the Chrome Web Store form. Copy/paste the appropriate sections.

## Title
Spark Focus Timer

## Short Description (≤132 chars)
Pomodoro-style focus timer with intentional breaks that show uplifting facts, quotes & discoveries. No tracking. Stay sharp.

(Alt variant if needed): Minimal focus & break timer that sparks curiosity with facts & quotes—privacy first.

## Detailed Description
Spark is a lightweight Pomodoro-style focus timer that turns breaks into uplifting micro‑discoveries. Instead of drifting into distractions, enjoy a quick dose of curiosity or inspiration—then get back to deep work.

### Why Spark?
- Intentional Breaks: You manually start breaks (no surprise tab spam)
- Inspiring Micro‑Content: Facts, quotes, curated sites
- Reliable Background Engine: Timer continues even if popup is closed
- Smart Notifications: Action buttons jump straight into the next session
- Privacy First: No analytics, no tracking scripts, no accounts

### Features
- Focus / Short Break / Long Break cycle (custom durations)
- Daily stats: completed sessions, total focus time, streak
- Random break content from enabled categories
- Options page with instant auto‑save
- Optional Debug Console (off by default) for testers & power users

### Privacy & Data
All data stays local (or syncs only across your own Chrome profile). No personal data, no history collection, no tracking. Only network calls: public content APIs you enable plus any site you explicitly open.

### Permissions Explained
- storage: Save timer state, statistics, preferences
- alarms: Run focus/break timers in the background reliably
- notifications: Let you know when a session ends (optional)
- host permissions: Limited to a small set of content API domains

### Planned Roadmap
- Optional sound cues
- Keyboard shortcuts
- Basic theming / light mode
- Exportable stats

### Support & Feedback
Report issues or contribute: https://github.com/superchip/spark_chrome_extension

Give your breaks meaning. Spark curiosity. Return focused.

---
## Additional Listing Fields

### Category
Productivity

### Primary Language
English (en-US)

### Website (optional)
https://github.com/superchip/spark_chrome_extension

### Support Email (required)
Add in developer console (e.g. your public contact email or GitHub notifications address).

### Privacy Policy URL
Link directly to hosted version of `PRIVACY_POLICY.md` or `privacy.html` (e.g. GitHub Pages raw link) if required by review.

### Screenshots (Recommended 3–5)
Suggested set (1280×800 or 640×400):
1. Focus session running (timer + stats)
2. Break pending screen (Shows upcoming break content type)
3. Options page (durations + toggles)
4. Example break content tab (quote or fact)
5. (Optional) Debug console (to show transparency / power user tooling)

### Promotional Tile (Optional)
440×280 PNG – use lightning icon ☇ / ⚡ plus tagline: "Meaningful Breaks. Sharper Focus."

### Icon
Already provided (16 / 32 / 48 / 128). Ensure 128×128 used for listing.

---
## Review Prep Notes
- Ensure version in `manifest.json` matches uploaded ZIP name (currently 1.0.3)
- Verify no unused permissions (none present beyond required APIs)
- Verify `privacy.html` accessible & consistent with policy text
- Provide a support email before submission
- Final ZIP excludes test & debug markdown/docs (see packaging script)

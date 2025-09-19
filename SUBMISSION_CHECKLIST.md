# Spark Focus Timer – Chrome Web Store Submission Checklist

Version: 1.0.3
Date: 2025-09-19

## 1. Manifest Compliance
- [x] manifest_version = 3
- [x] Required fields: name, version, description, icons, action, background.service_worker
- [x] Short, clear description (<132 chars)
- [x] Minimal permissions: storage, notifications, alarms
- [x] Host permissions limited to specific API domains (no wildcards beyond needed)
- [x] CSP present (script-src 'self')
- [x] No externally hosted remote code
- [x] Uses service worker (background.js) instead of persistent background page

## 2. Assets
- [x] Icons: 16 / 32 / 48 / 128 in `icons/`
- [ ] Screenshots (prepare before upload)
- [ ] Promotional tile (optional)
- [x] Privacy policy page: `privacy.html` (and `PRIVACY_POLICY.md` for GitHub)

## 3. Listing Content Prepared
- [x] Title, short description, long description (see `STORE_LISTING.md`)
- [x] Permissions explanation included in long description
- [x] Roadmap section optional
- [x] Support URL: GitHub repo
- [x] Contact email (to be entered in dashboard)

## 4. Privacy & Data Disclosure
- [x] No personal data collected
- [x] Local & sync storage only
- [x] No analytics / telemetry / tracking
- [x] Only fetches enabled content APIs
- [x] Permissions justified in both privacy and listing text

## 5. Functionality QA
Manual test matrix (perform prior to submission):
- [ ] Install unpacked -> timer starts Focus session normally
- [ ] Pause / resume works
- [ ] Completion notification shows with appropriate action buttons
- [ ] Start Break from notification -> opens break content tab if break content enabled
- [ ] Start Focus from break notification -> transitions correctly
- [ ] Break content tab renders fact/quote/website
- [ ] Options changes persist (durations & toggles)
- [ ] Stats increment after focus completion
- [ ] Debug mode hidden by default
- [ ] Debug console functions (optional test)
- [ ] Dismiss All Notifications message path works (manual debug)

## 6. Packaging
- [x] `package_extension.sh` script created
- [x] Version auto-detected from manifest
- [x] Excludes dev / debug / test artifacts
- [ ] Run script and verify resulting ZIP loads cleanly

Command (example):
`./package_extension.sh 1.0.3`

## 7. Final Pre-Submit Review
- [ ] Upload ZIP and verify Chrome Web Store validation passes
- [ ] Fill support email (required)
- [ ] Attach privacy policy URL (link to hosted file or GitHub raw)
- [ ] Set category: Productivity
- [ ] Choose visibility (Public)
- [ ] Submit for review

## 8. Post-Submission
- [ ] Monitor review emails
- [ ] After approval: capture store URL and add to README
- [ ] Tag release in GitHub (v1.0.3)

---
All structural elements are in place. Complete the unchecked runtime tasks & media assets before submitting.

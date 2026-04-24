# Claude Code Instructions for Tab Countdown Timer

## Project Overview

This is a Chrome/Edge/Brave browser extension (Manifest V3) that allows users to set countdown timers on browser tabs. When timers expire, tabs close or (for YouTube) videos pause.

## Key Files

- `manifest.json` - Extension manifest with permissions and entry points
- `background/background.js` - Service worker handling alarms, badge updates, and tab actions
- `popup/popup.js` - Popup UI logic using jQuery
- `popup/popup.html` - Popup HTML structure
- `popup/styles.css` - CSS with dark/light theme support
- `tests/` - Jest tests with chrome-mocks
- `scripts/build-extension.js` - Build script that emits `dist/`
- `release.sh` - Packages the build for store upload

## Build & Release Commands

- `npm install` - Install dev dependencies
- `npm run build` - Emit `dist/` bundle via `scripts/build-extension.js`
- `npm test` - Run Jest suite
- `npm run test:coverage` - Writes coverage into `coverage/`
- `npm run lint` / `npm run lint:fix` - ESLint
- `npm run validate` - Validates `manifest.json`
- `npm run security-audit` - Run after dependency updates
- `./release.sh` - Package for store upload (after bumping `manifest.json` version)

## Development Guidelines

### Chrome Extension Patterns

- Use `ChromeAPIWrapper` in `background.js` for promisified Chrome API calls. It normalizes callbacks to Promises and silently ignores expected "tab not found" errors for badge updates.
- Service workers (`background.js`) have no persistent state between wake-ups — use `chrome.storage.local` for persistence.
- Always check if tabs/alarms exist before operating on them.

### Timer State Persistence

Timers persist by normalized URL rather than tab ID, so state survives tab closure:
- `HandleRemove` in `background.js` saves remaining time to `chrome.storage.local` keyed by URL when a tab with a running timer closes.
- On popup open, `popup.js` checks for saved state and restores the paused timer.
- YouTube URLs normalize to just the video ID (`paused_youtube_<videoId>`), ignoring `list`, `index`, `t` parameters.
- Non-YouTube URLs use full encoded URL as key (`paused_<encodedUrl>`).
- Saved pause states expire after 7 days (`PAUSE_EXPIRY_MS`).

### Testing Requirements

- Run `npm test` before committing.
- Tests use `jest-chrome` for Chrome API mocks; reuse helpers in `tests/setup/chrome-mocks.js`.
- Coverage thresholds are enforced in `jest.config.js`:
  - Global: 69% branches, 85% functions, 77% lines
  - `popup.js`: 78% branches, 99% functions, 93% lines
- Do NOT lower coverage thresholds; write tests to meet them.

### Code Style

- ES6 modules, `const`/`let` over `var`, 2-space indentation.
- jQuery is used for DOM manipulation in `popup.js`; cache selectors in `$`-prefixed variables.
- Use async/await with Chrome APIs via `ChromeAPIWrapper`.
- Descriptive camelCase for functions (e.g., `setupCountdown`); kebab-case for assets (`icons/hourglass32.png`).
- Follow existing patterns for storage keys and data structures.
- Support both callback and Promise patterns for Chrome APIs in tests.

### Storage Keys

- `timers_${tabId}` - Active timer state for a tab
- `paused_timers` - Saved timer states by URL (7-day expiration)
- `autostart_rules` - Auto-start rules by URL pattern
- `youtube_match_preference` - Persists the last-selected YouTube match mode (`'video'` or `'all'`) for the popup dropdown

### Git Practices

- Do not include `Co-Authored-By` lines in commit messages.
- Feature branches should be merged via PR.
- Commit subjects: verb-led, capitalized, under ~12 words (e.g., `Fix light mode`, `Bump form-data from 3.0.2 to 3.0.4`). Merge commits keep Git's default `Merge branch 'feature/...' into develop` format.
- PRs: open with a one-paragraph TL;DR, list behavioral changes, link issues, include screenshots/GIFs for UI tweaks. Note any `manifest.json` version bump and how you validated the build (`chrome://extensions`, `npm run build`, or `./release.sh`).
- Before submission: `npm run lint && npm test`.

### Release Flow

1. Bump the `manifest.json` version.
2. `npm run build`.
3. `./release.sh`.
4. Load the output via `chrome://extensions` to verify before tagging.

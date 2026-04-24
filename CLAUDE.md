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

## Development Guidelines

### Chrome Extension Patterns

- Use `ChromeAPIWrapper` in background.js for promisified Chrome API calls
- Service workers (background.js) have no persistent state between wake-ups
- Use `chrome.storage.local` for persistence
- Always check if tabs/alarms exist before operating on them

### Testing Requirements

- Run `npm test` before committing
- Tests use `jest-chrome` for Chrome API mocks
- Coverage thresholds are enforced in `jest.config.js`:
  - Global: 69% branches, 85% functions, 77% lines
  - popup.js: 78% branches, 99% functions, 93% lines
- Do NOT lower coverage thresholds; write tests to meet them

### Code Style

- jQuery is used for DOM manipulation in popup.js
- Use async/await with Chrome APIs via ChromeAPIWrapper
- Follow existing patterns for storage keys and data structures
- Support both callback and Promise patterns for Chrome APIs in tests

### Storage Keys

- `timers_${tabId}` - Active timer state for a tab
- `paused_timers` - Saved timer states by URL (7-day expiration)
- `autostart_rules` - Auto-start rules by URL pattern

### Git Practices

- Do not include "Co-Authored-By" lines in commit messages
- Feature branches should be merged via PR

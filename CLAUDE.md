# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tab Countdown Timer is a Chrome/Edge browser extension (Manifest V3) that allows users to set countdown timers for browser tabs. When timers expire, tabs can either be closed or (for YouTube) videos can be paused. The extension includes automatic YouTube pause functionality at 10 PM daily.

## Development Commands

### Testing
```bash
npm test                    # Run Jest test suite with coverage
```

### Building/Packaging
```bash
./release.sh               # Create zip file for store submission
```

### Installation for Development
1. Load as unpacked extension in Chrome/Edge (`chrome://extensions`)
2. Enable Developer mode and click "Load unpacked"
3. Select the project directory
4. Reload extension after making changes

## Architecture

### Core Components

**Background Script** (`background/background.js`):
- Service worker handling alarms, badge updates, tab management
- `ChromeAPIWrapper`: Abstraction layer for Chrome APIs with Promise-based methods
- `FormatDuration()`: Time formatting utility
- Auto-pause YouTube videos at 10 PM feature
- Badge color changes to red when <30 seconds remaining

**Popup Interface** (`popup/`):
- `popup.html`: Extension popup UI with timer controls
- `popup.js`: Timer creation, pause/resume, cancel functionality
- `styles.css`: UI styling
- Uses jQuery 3.5.1 for DOM manipulation

**Chrome Extension APIs Used**:
- `alarms`: Timer management
- `storage.local`: Settings persistence  
- `activeTab`/`scripting`: YouTube video control
- `action`: Badge text/color updates

### Key Features

1. **Dual Timer Actions**: Close tab (default) or pause video (YouTube only)
2. **Auto YouTube Pause**: Automatically sets 10 PM pause timers for YouTube tabs
3. **Preset Buttons**: 5m, 15m, 30m, 1h quick timer options
4. **Pause/Resume**: Timer can be paused and resumed
5. **Visual Feedback**: Badge shows countdown, turns red when <30s remain

### Testing Framework

- **Jest** with `jsdom` environment and 10s timeout
- **jest-chrome** for Chrome API mocking
- **Comprehensive Chrome API mocks** in `tests/setup/chrome-mocks.js`
- **Coverage thresholds**: 40% statements, 39% branches, 55% functions, 40% lines
- Tests cover:
  - Utility functions (FormatDuration, time calculations)
  - Chrome API wrapper methods
  - YouTube auto-pause functionality
  - Error handling and edge cases
  - Popup UI validation

### File Structure
```
├── background/background.js    # Service worker
├── popup/                     # Extension popup
│   ├── popup.html
│   ├── popup.js  
│   └── styles.css
├── icons/                     # Extension icons (16-512px)
├── tests/                     # Jest test files
├── manifest.json              # Extension manifest (v3)
└── lib/jquery-3.5.1.min.js   # jQuery dependency
```

### Development Notes

- Extension uses Manifest V3 with service worker architecture
- YouTube functionality requires `host_permissions` for `*://*.youtube.com/*`
- Timer precision: Updates every second, badges show MM:SS or HH:MM format
- Storage: Uses Chrome storage.local for timer preferences and last-used values
- Error handling: Extensive try/catch blocks and Chrome API error checking
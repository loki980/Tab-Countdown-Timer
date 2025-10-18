# Tab Countdown Timer

[![Chrome Web Store](https://developer.chrome.com/static/docs/webstore/branding/image/206x58-chrome-web-bcb82d15b2486.png)](https://chrome.google.com/webstore/detail/tab-countdown-timer/maoljenpfpdblggdbnhmegofbhhcdgle)
[![Microsoft Edge Add-ons](https://get.microsoft.com/images/en-us%20dark.svg)](https://microsoftedge.microsoft.com/addons/detail/tab-countdown-timer/mmocngnpdhbhikbhonekemkafnkccgan)

A productivity-focused Chromium browser extension (Chrome, Edge, Brave) that helps manage time spent on tabs by allowing users to set custom countdown timers. When the timer expires, the tab closes or (for YouTube) pauses the video automatically. Ideal for avoiding endless browsing and promoting focused sessions.

## Features

- **Custom Timers**: Set timers for any tab using hours (0-24) and minutes (0-59) via intuitive inputs.
- **YouTube-Specific Actions**: For YouTube watch pages, choose to pause the video instead of closing the tab (default for YouTube).
- **Real-Time Feedback**: Extension badge shows remaining time (e.g., "1:23"), updates every second, turns red under 30 seconds, and grays when paused.
- **Controls**: Pause/resume, cancel timers; supports multiple tabs simultaneously.
- **Enhanced UI**: 
  - Preset buttons for common durations.
  - Keyboard arrows (up/down) and mouse wheel for quick adjustments; Shift+wheel accelerates minutes.
  - Handles input overflow/underflow (e.g., 70 minutes becomes 1h 10m).
  - ETA display and persists last-used values.
- **Unobtrusive Design**: No auto-scheduling; user-initiated only for direct control.
- **Tested & Stable**: Version 1.3.1 with Jest unit tests for core functionality.

## Installation

### From Web Stores (Recommended)
- **Chrome/Brave**: [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/tab-countdown-timer/maoljenpfpdblggdbnhmegofbhhcdgle)
- **Edge**: [Install from Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tab-countdown-timer/mmocngnpdhbhikbhonekemkafnkccgan)

Follow the prompts to add the extension.

### Developer Installation (Load Unpacked)
1. Clone or download this repository.
2. Open your browser's extensions page: `chrome://extensions/` (Chrome/Brave) or `edge://extensions/` (Edge).
3. Enable "Developer mode" (top-right toggle).
4. Click "Load unpacked" and select the project root directory.
5. The extension icon (hourglass) will appear in your toolbar.

## Usage

1. Click the extension icon (hourglass) in the browser toolbar to open the popup.
2. Select a preset or enter hours/minutes (e.g., 0h 30m).
3. For YouTube tabs, choose "Pause Video" or "Close Tab" via radio buttons.
4. Click "Start timer" – the badge appears with countdown.
5. **Pause/Resume**: Click the pause button; badge grays out when paused.
6. **Cancel**: Click "Cancel timer" to stop and clear the badge.
7. On expiry: Tab closes (default) or video pauses (YouTube); badge clears.

## Screenshots
*(Add visual aids here if available: e.g., popup UI, badge examples. Currently, no images in repo – consider adding.)*

- Popup interface: Clean form with inputs, presets, and action options.
- Badge: Shows "0:45" in gray/red; disappears post-expiry.

## Project Structure

```
Tab-Countdown-Timer/
├── .clinerules              # Cline AI rules for project intelligence
├── .gitignore               # Git ignores
├── CLAUDE.md                # Contributor guidelines?
├── jest.config.js           # Jest configuration
├── jest.setup.js            # Jest setup with mocks
├── manifest.json            # Extension manifest (v3)
├── package.json             # Node dependencies (Jest, etc.)
├── README.md                # This file
├── release.sh               # Build/release script
├── background/              # Background service worker
│   └── background.js        # Alarm handling, badge updates, expiry actions
├── icons/                   # Extension icons
│   ├── hourglass16.png      # 16x16
│   ├── hourglass32.png      # 32x32
│   ├── hourglass48.png      # 48x48
│   ├── hourglass128.png     # 128x128
│   └── hourglass512.png     # 512x512
├── lib/                     # Shared libraries
│   └── jquery-3.5.1.min.js  # jQuery for UI
├── memory-bank/             # Documentation (Cline memory)
│   ├── activeContext.md     # Current work/next steps
│   ├── productContext.md    # Product goals/user experience
│   ├── progress.md          # Status/known issues
│   ├── projectbrief.md      # Core requirements
│   ├── systemPatterns.md    # Architecture overview
│   └── techContext.md       # Tech stack/constraints
├── popup/                   # Popup UI
│   ├── popup.html           # HTML structure
│   ├── popup.js             # UI logic (inputs, timers, Chrome API calls)
│   └── styles.css           # CSS styling
├── reports/                 # Test reports (generated)
│   └── jest/                # Jest output
└── tests/                   # Jest tests
    ├── background.test.js   # Background script tests
    ├── popup.test.js        # Popup functionality tests
    └── setup/
        └── chrome-mocks.js  # API mocks for testing
```

## Development

### Prerequisites
- Node.js (for testing)
- Chromium-based browser (Chrome, Edge, Brave)
- Basic JavaScript/HTML/CSS knowledge; familiarity with Chrome Extension APIs

### Setup
1. Clone the repo: `git clone https://github.com/loki980/Tab-Countdown-Timer.git`
2. Navigate: `cd Tab-Countdown-Timer`
3. Install deps: `npm install`
4. Load unpacked as per Developer Installation above.

### Building/Testing Changes
- Edit files in `popup/` or `background/`.
- Reload extension via `chrome://extensions/` (click "Reload").
- Run tests: `npm test` (uses Jest with Chrome API mocks).
- Release: `./release.sh` (excludes ZIPs; bumps version in manifest).

### Debugging
- Inspect popup: Right-click icon > "Inspect popup".
- Background console: `chrome://extensions/` > Details > "Inspect views: background page".

### Code Quality
- Uses jQuery for popup DOM manipulation.
- ChromeAPIWrapper in background for promisified API calls (testable).
- Follows Manifest V3 service worker patterns.
- Comments extensive in core files.

## Testing

Jest with `jest-chrome` mocks Chrome APIs. Coverage includes timer logic, badge updates, expiry actions.

### Run Tests
```bash
npm test
```
Generates reports in `reports/jest/`.

### Coverage
```bash
npm test -- --coverage
```

Current coverage: Core utilities (e.g., `FormatDuration`), alarm handling, YouTube pause simulation.

## Changelog

### v1.3.1 (Recent)
- UI enhancements: Arrow keys, mouse wheel (Shift+ for minutes), overflow handling.
- Bug fixes: Verify tab existence before close; removed auto-10PM YouTube timers.
- Added comments to ChromeAPIWrapper.
- Version bump in manifest.

See `memory-bank/progress.md` for full status.

## Contributing

1. Fork and clone the repo.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit changes: `git commit -m 'Add amazing feature'`.
4. Push: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

Update `memory-bank/` docs for new patterns.

## License

MIT License. See [LICENSE](LICENSE) for details.

---

For issues, report via GitHub or contact the maintainer. Project maintained for Chrome Web Store distribution.

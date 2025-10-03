# Tab Countdown Timer

A browser extension for Chrome and Edge that allows you to set a countdown timer for any tab. When the timer reaches zero, the tab automatically closes. Perfect for time management, limiting time spent on specific websites, or setting reminders.

<a href="https://chrome.google.com/webstore/detail/tab-countdown-timer/maoljenpfpdblggdbnhmegofbhhcdgle"><img src="https://developer.chrome.com/static/docs/webstore/branding/image/206x58-chrome-web-bcb82d15b2486.png" alt="Available in the Chrome Web Store" width="206" height="58"></a>
<a href="https://microsoftedge.microsoft.com/addons/detail/tab-countdown-timer/mmocngnpdhbhikbhonekemkafnkccgan"><img src="https://get.microsoft.com/images/en-us%20dark.svg" alt="Get it from Microsoft Edge Add-ons" width="206" height="58"></a>

## Features

- Set custom countdown timers for any tab
- Easy-to-use popup interface with minutes and seconds input
- Visual countdown display in the extension badge
- Automatic tab closure when timer reaches zero
- Works across multiple tabs simultaneously

## Installation

### Chrome
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/detail/tab-countdown-timer/maoljenpfpdblggdbnhmegofbhhcdgle)
2. Click "Add to Chrome"
3. Confirm the installation when prompted

### Edge
1. Visit the [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tab-countdown-timer/mmocngnpdhbhikbhonekemkafnkccgan)
2. Click "Get"
3. Confirm the installation when prompted

## Usage

1. Click the extension icon in your browser toolbar
2. Enter the desired countdown time in minutes and seconds
3. Click "Start" to begin the countdown
4. The extension badge will display the remaining time
5. The tab will automatically close when the timer reaches zero

## Project Structure

```
├── background/
│   └── background.js        # Handles alarm actions and badge countdown
├── coverage/                # Test coverage reports
├── icons/                   # Extension icons in various sizes
├── lib/                     # Third-party libraries (e.g., jQuery)
├── memory-bank/             # Project documentation and context
├── popup/                   # Popup interface
│   ├── popup.html           # Popup UI
│   ├── popup.js             # Popup logic
│   └── styles.css           # Popup styling
├── reports/                 # Test reports
├── tests/                   # Test files
│   ├── background.test.js   # Tests for background functionality
│   ├── popup.test.js        # Tests for popup functionality
│   └── setup/
│       └── chrome-mocks.js  # Mocks for Chrome APIs
├── .gitignore               # Git ignore rules
├── jest.config.js           # Jest testing configuration
├── jest.setup.js            # Jest setup file
├── manifest.json            # Extension manifest
├── package.json             # Project dependencies and scripts
└── README.md                # This file
```

## Development

### Prerequisites
- Chrome, Edge, or Brave browser
- Basic knowledge of JavaScript and browser extensions

### Setup
1. Clone the repository
2. Load the extension as unpacked (see Developer Installation above)
3. Make your changes
4. Reload the extension to test changes

### Developer Installation (Load Unpacked)
1. Clone this repository or download the source code
2. Open Chrome/Edge and navigate to `chrome://extensions` or `edge://extensions` or `brave://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the directory containing the extension files

### Debugging
- Open the extension's popup by clicking the extension icon in your browser toolbar
- Right click on the popup and select "Inspect"
- Open the "Sources" tab in the developer tools
- Click "Reload" on the `brave://extensions` page after making modifications to see your changes

## Testing

### Testing Framework
This project uses Jest for testing Chrome extension functionality.

### Prerequisites
- Node.js
- npm

### Setup
1. Install dependencies:
```bash
npm install
```

### Running Tests
To run the test suite:
```bash
npm test
```

### Test Coverage
Current tests cover:
- Utility function testing (duration formatting)
- Chrome extension API mocking
- Basic extension functionality verification

### Adding New Tests
- Place test files in the `tests/` directory
- Use `.test.js` or `.spec.js` file extensions
- Follow existing test structure and mocking patterns

### Mocking Chrome Extension APIs
Tests use `jest-chrome` to mock Chrome extension APIs, allowing for comprehensive testing of extension functionality without a full browser environment.

## License

This project is open source and available under the MIT License.

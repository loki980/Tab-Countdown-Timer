# Tab Countdown Timer

A browser extension for Chrome and Edge that allows you to set a countdown timer for any tab. When the timer reaches zero, the tab automatically closes. Perfect for time management, limiting time spent on specific websites, or setting reminders.

<img src="https://developer.chrome.com/static/docs/webstore/branding/image/206x58-chrome-web-bcb82d15b2486.png" alt="Available in the Chrome Web Store" width="206" height="58">
<br><br>
<img src="https://get.microsoft.com/images/en-us%20dark.svg" alt="Get it from Microsoft Edge Add-ons" width="206" height="58">

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
│   └── background.js    # Handles alarm actions and badge countdown
├── icons/              # Extension icons in various sizes
├── lib/                # Third-party libraries
├── popup/              # Popup interface
│   ├── popup.html      # Popup UI
│   ├── popup.js        # Popup logic
│   └── lib/            # Popup-specific libraries
└── manifest.json       # Extension manifest
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

## License

This project is open source and available under the MIT License.

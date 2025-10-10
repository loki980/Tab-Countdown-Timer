# System Patterns

## System Architecture
The system architecture consists of a background script (`background.js`) that manages timers via the Chrome Alarms API, and a popup (`popup.html`, `popup.js`, `styles.css`) that provides the user interface for setting, updating, and canceling timers. `background.js` includes a `ChromeAPIWrapper` to abstract and promisify Chrome API calls, making them easier to manage and test.

## Key Technical Decisions
- **Timer Management:** The Chrome Alarms API is the core mechanism for scheduling timers. This is efficient as it persists across browser sessions. The background script now checks if a tab exists before acting on an alarm, preventing errors.
- **State Persistence:** The Chrome Storage API is used to remember the last-used timer duration and the user's preferred action (close vs. pause) for YouTube tabs.
- **UI Logic:** The popup's UI is built with jQuery, handling user input, state changes, and communication with the background script. It includes logic for graceful rollovers between minutes and hours.

## Design Patterns in Use
- **Module Pattern & Abstraction:** The `ChromeAPIWrapper` in `background.js` acts as an abstraction layer, encapsulating the complexities of the Chrome APIs and providing a cleaner, Promise-based interface.
- **Observer Pattern:** The background script observes `chrome.alarms.onAlarm` events. The popup observes DOM events for user interactions.
- **Stateful UI Components:** The popup UI follows a clear state management pattern:
    - **Gating:** The "Start" button is disabled if no duration is set.
    - **Context-Aware Controls:** The UI adapts based on context (e.g., "Update timer," YouTube options).
    - **Progressive Disclosure:** YouTube-specific options are hidden by default.
- **Ergonomic Input:** The UI uses keyboard and mouse events (arrow keys, `wheel` with `Shift` modifier) to create shortcuts for power users, enhancing the user experience for setting timers.

## Component Relationships
- `popup.js` is the controller for the UI. It reads user input, handles complex UI logic like time rollovers, and communicates with the Chrome APIs via the background script.
- `background.js` acts as the service worker, responding to alarms and managing the core timer logic. The `ChromeAPIWrapper` ensures these interactions are robust.
- `popup.html` provides the structure, and `styles.css` ensures a consistent visual presentation.

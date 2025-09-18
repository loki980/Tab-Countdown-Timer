# System Patterns

## System Architecture
The system architecture consists of a background script (`background.js`) that manages timers via the Chrome Alarms API, and a popup (`popup.html`, `popup.js`, `styles.css`) that provides the user interface for setting, updating, and canceling timers.

## Key Technical Decisions
- **Timer Management:** The Chrome Alarms API is the core mechanism for scheduling timers. This is efficient as it persists across browser sessions and doesn't require a script to be constantly running.
- **State Persistence:** The Chrome Storage API is used to remember the last-used timer duration and the user's preferred action (close vs. pause) for YouTube tabs.
- **UI Logic:** The popup's UI is built with jQuery, handling user input, state changes, and communication with the background script.

## Design Patterns in Use
- **Module Pattern:** Used in `background.js` to encapsulate timer logic.
- **Observer Pattern:** The background script implicitly observes `chrome.alarms.onAlarm` events to act when a timer expires. The popup observes DOM events to trigger actions.
- **Stateful UI Components:** The popup UI now follows a clearer state management pattern:
    - **Gating:** The "Start" button is disabled if no duration is set, preventing invalid states.
    - **Context-Aware Controls:** The UI adapts based on context (e.g., showing "Update timer" if a timer is active, or revealing YouTube-specific options).
    - **Progressive Disclosure:** YouTube-specific options are hidden by default and only shown when relevant, reducing cognitive load.

## Component Relationships
- `popup.js` is the primary controller for the user-facing interface. It reads user input and makes calls to the Chrome APIs.
- `background.js` acts as the service worker, responding to alarms created by the popup and executing the core logic (closing a tab or pausing a video).
- `popup.html` provides the structure, and `styles.css` ensures a consistent and usable visual presentation, including responsive states like `disabled` and `paused`.

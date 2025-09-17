# System Patterns

## System Architecture
The system architecture consists of a background script (background.js) that manages the timers and interacts with the Chrome API, a popup (popup.html and popup.js) that allows the user to set and cancel timers.

## Key Technical Decisions
Key technical decisions include using the Chrome Alarms API for managing timers and the Chrome Storage API for persisting timer values. Auto-generated 10 PM YouTube alarms now check for an existing alarm before scheduling to preserve user overrides.

## Design Patterns in Use
Design patterns in use include the Module pattern (in background.js) and the Observer pattern (for handling tab closure events).

## Component Relationships
Component relationships include the background script creating and managing alarms, the popup script interacting with the background script to set and cancel alarms.

# Repository Guidelines

## Project Structure & Module Organization
Extension logic lives in `background/` (timers, badge updates, alarms) and `popup/` (UI markup, styling, handlers). Vendor assets stay in `lib/`, icons in `icons/`, and tests under `tests/` with mocks in `tests/setup/`. Root configs (`manifest.json`, `jest.config.js`, `scripts/`) keep builds reproducible.

## Key Architecture Concepts

### Timer State Persistence
Timers persist by **normalized URL** rather than tab ID, allowing timer state to survive tab closure:
- When a tab with a running timer closes, `HandleRemove` in `background.js` saves remaining time to `chrome.storage.local` keyed by URL
- When reopening the same URL, `popup.js` checks for saved state and restores the paused timer
- YouTube URLs normalize to just the video ID (e.g., `paused_youtube_<videoId>`), ignoring `list`, `index`, `t` parameters
- Non-YouTube URLs use full encoded URL as key (e.g., `paused_<encodedUrl>`)
- Saved pause states expire after 7 days (`PAUSE_EXPIRY_MS`)

### ChromeAPIWrapper
`background.js` wraps Chrome extension APIs in `ChromeAPIWrapper` for:
- Promise-based async/await usage
- Graceful error handling (e.g., silently ignores "tab not found" errors for badge updates)
- Testability with Jest mocks in `tests/setup/chrome-mocks.js`

## Build, Test, and Development Commands
- `npm install` – installs extension dev dependencies.
- `npm run build` – runs `scripts/build-extension.js` to emit the `dist/` bundle.
- `npm test` – runs the Jest suite (background + popup logic) via `jest.setup.js`.
- `npm run test:coverage` – writes coverage data into `coverage/`.
- `npm run lint` / `npm run lint:fix` – enforce ESLint rules before pushing.
- `npm run validate` – checks `manifest.json`; pair with `./release.sh` before uploading.

## Coding Style & Naming Conventions
JavaScript files use ES6 modules, `const`/`let` over `var`, and 2-space indentation (see `popup/popup.js`). Prefer descriptive camelCase for functions (e.g., `setupCountdown`) and kebab-case for assets (`icons/hourglass32.png`). Cache DOM selectors in `$`-prefixed variables, keep inline comments for non-obvious flows, and run ESLint before committing.

## Testing Guidelines
Place tests beside their target area in `tests/` using the `*.test.js` suffix. Mirror module names in `describe` blocks (`background` vs `popup`) and reuse mocks from `tests/setup/chrome-mocks.js`. Maintain coverage whenever touching timers, badge logic, or Chrome message handlers—run `npm run test:coverage` before review.

## Commit & Pull Request Guidelines
Recent commits show clear, verb-led subjects written like concise changelog entries: short directives (`Fix light mode`), scoped updates (`Bump form-data from 3.0.2 to 3.0.4`), and occasional larger summaries when context matters (`Allow flexible minute input and improve UX`). Follow that pattern—capitalize the first word, keep it under ~12 words, and use an bullet pointadditional sentence or two only for multi-step work. Keep merge commits in Git’s default `Merge branch 'feature/...' into develop` format. PRs should open with a one-paragraph TL;DR, list behavioral changes, link issues, and include screenshots or GIFs for UI tweaks. Before submission, run `npm run lint && npm test`, note any manifest version bump, and describe how you validated the build (e.g., `chrome://extensions`, `npm run build`, or `./release.sh`).

## Security & Release Tips
Keep secrets out of version control—environment data belongs outside `manifest.json`. Run `npm run security-audit` after dependency updates. For releases, bump the manifest version, run `npm run build`, execute `./release.sh`, and load the output via `chrome://extensions` before tagging.

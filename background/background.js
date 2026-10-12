// Utility for Chrome API interactions
const ChromeAPIWrapper = {
  alarms: {
    onAlarm: {
      // Safely adds a listener for alarm events.  Used for testing.
      addListener: (callback) => {
        if (typeof chrome !== 'undefined' && chrome.alarms) {
          chrome.alarms.onAlarm.addListener(callback);
        }
      }
    },
    // Retrieves an alarm by its name.
    get: (name) => {
      return new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.alarms) {
          chrome.alarms.get(name, (alarm) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(alarm);
            }
          });
        } else {
          resolve(undefined);
        }
      });
    },
    // Clears an alarm by its name.
    clear: (name) => {
      return new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.alarms) {
          chrome.alarms.clear(name, (wasCleared) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(wasCleared);
            }
          });
        } else {
          resolve(false);
        }
      });
    },
    // Retrieves all active alarms.
    getAll: () => {
      return new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.alarms) {
          chrome.alarms.getAll((alarms) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(alarms);
            }
          });
        } else {
          resolve([]);
        }
      });
    },
    // Creates a new alarm.
    create: (name, alarmInfo) => {
      if (typeof chrome !== 'undefined' && chrome.alarms) {
        chrome.alarms.create(name, alarmInfo);
      }
      // Since chrome.alarms.create is synchronous, we don't need a Promise
      return Promise.resolve();
    }
  },
  tabs: {
    onRemoved: {
      // Adds a listener for when a tab is closed.
      addListener: (callback) => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.onRemoved.addListener(callback);
        }
      }
    },
    // Removes or closes a tab by its ID.
    remove: (tabId) => {
      return new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    },
    // Retrieves details about a specific tab by its ID.
    get: (tabId) => {
      return new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(tab);
            }
          });
        } else {
          reject(new Error('Tabs API not available'));
        }
      });
    },
    // Checks if a tab exists by its ID.
    exists: (tabId) => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
              resolve(false);
            } else {
              resolve(true);
            }
          });
        } else {
          resolve(false);
        }
      });
    }
  },
  action: {
    // Sets the background color of the extension's badge.
    setBadgeBackgroundColor: (options) => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.action) {
          chrome.action.setBadgeBackgroundColor(options, () => {
            // Ignore errors (e.g., tab not found) - just resolve
            if (chrome.runtime.lastError) {
              // Silently ignore - tab may have been closed
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    },
    // Sets the text on the extension's badge.
    setBadgeText: (options) => {
      return new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.action) {
          chrome.action.setBadgeText(options, () => {
            if (chrome.runtime.lastError) {
              // Ignore "tab not found" errors - tab may have been closed
              const msg = chrome.runtime.lastError.message || '';
              if (msg.includes('No tab') || msg.includes('tab')) {
                resolve();
              } else {
                reject(chrome.runtime.lastError);
              }
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    },
    // Sets the extension's toolbar icon for a tab. Errors (e.g., tab closed)
    // are ignored, matching the badge color setter above.
    setIcon: (options) => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setIcon) {
          chrome.action.setIcon(options, () => {
            if (chrome.runtime.lastError) {
              // Silently ignore - tab may have been closed
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    },
    // Sets the toolbar icon tooltip for a tab, ignoring errors like above.
    setTitle: (options) => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setTitle) {
          chrome.action.setTitle(options, () => {
            if (chrome.runtime.lastError) {
              // Silently ignore - tab may have been closed
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    }
  },
  storage: {
    local: {
      // Retrieves an item from local storage.
      get: (key) => {
        return new Promise((resolve, reject) => {
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(key, (result) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(result);
              }
            });
          } else {
            resolve({});
          }
        });
      },
      // Sets an item in local storage.
      set: (items) => {
        return new Promise((resolve, reject) => {
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set(items, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      },
      // Removes items from local storage.
      remove: (keys) => {
        return new Promise((resolve, reject) => {
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.remove(keys, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      }
    }
  },
  scripting: {
    // Executes a script in the context of a specific tab.  Used to pause YouTube
    executeScript: (options) => {
      return new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.scripting) {
          chrome.scripting.executeScript(options, (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result);
            }
          });
        } else {
          reject(new Error('Scripting API not available'));
        }
      });
    }
  }
};

// URL/video-site helpers live in shared/video-site-utils.js so this file and
// popup.js can't drift apart. importScripts only exists in the Chrome service
// worker. Firefox runs this file as an event page with no importScripts, so
// the manifest's background.scripts loads the helper first and it is already
// on self. Jest loads this file under CommonJS.
let VideoSiteUtils;
if (typeof importScripts === 'function') {
  importScripts('../shared/video-site-utils.js');
  VideoSiteUtils = self.VideoSiteUtils;
} else if (typeof self !== 'undefined' && self.VideoSiteUtils) {
  VideoSiteUtils = self.VideoSiteUtils;
} else {
  VideoSiteUtils = require('../shared/video-site-utils.js');
}
const { getVideoSiteContext, normalizeUrlForRuleKey, normalizeUrlForStorage } = VideoSiteUtils;

// Utility functions
function FormatDuration(d) {
  if (d < 0) {
    return '?';
  }

  // Ceil to keep the badge in lock-step with the popup, which also rounds
  // sub-second remainders up — otherwise the two displays show different
  // values for the same moment.
  const totalSeconds = Math.ceil(d / 1000);
  function pad(x) {
    return x < 10 ? '0' + x : x;
  }

  // Badge text only fits ~4 characters (Firefox truncates anything longer),
  // so each tier below stays within that width.
  if (totalSeconds < 600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ':' + pad(seconds);
  }
  if (totalSeconds < 3600) {
    return Math.floor(totalSeconds / 60) + 'm';
  }
  const hours = Math.floor(totalSeconds / 3600);
  if (hours < 10) {
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours + ':' + pad(minutes);
  }
  return hours + 'h';
}

// Un-abbreviated countdown for the icon tooltip: M:SS below an hour,
// H:MM:SS from an hour up. Same Math.ceil convention as FormatDuration.
function FormatExactDuration(d) {
  if (d < 0) {
    return '?';
  }
  const totalSeconds = Math.ceil(d / 1000);
  function pad(x) {
    return x < 10 ? '0' + x : x;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return hours + ':' + pad(minutes) + ':' + pad(seconds);
  }
  return minutes + ':' + pad(seconds);
}

// Reduces the remaining time to at most three characters with a unit
// suffix (45s, 5m, 99m, 2h) so the label on the toolbar icon stays legible.
// The tooltip keeps the exact countdown.
function formatIconText(d) {
  if (d < 0) {
    return '?';
  }
  const totalSeconds = Math.ceil(d / 1000);
  if (totalSeconds < 60) {
    return totalSeconds + 's';
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes <= 99) {
    return totalMinutes + 'm';
  }
  return Math.round(totalMinutes / 60) + 'h';
}

// 24 serves 1.5x displays and 48 serves 3x, so no size is scaled down.
const ICON_SIZES = [16, 24, 32, 48];
const DEFAULT_ICON_TITLE = 'Tab Countdown Timer';
const DEFAULT_ICON_PATHS = {
  16: '/icons/hourglass16.png',
  32: '/icons/hourglass32.png',
  48: '/icons/hourglass48.png',
  128: '/icons/hourglass128.png'
};
// Plate gradient (top to bottom) and unit color for each timer state.
const ICON_UNIT_SOFT = 'rgba(255,255,255,0.85)';
const ICON_COLOR_RUNNING = { top: '#5a6a82', bottom: '#3a4659', unit: '#f5cf87' };
const ICON_COLOR_FINAL_MINUTE = { top: '#e5483a', bottom: '#b91f14', unit: ICON_UNIT_SOFT };
const ICON_COLOR_PAUSED = { top: '#8a93a3', bottom: '#626a78', unit: ICON_UNIT_SOFT };
const BADGE_COLOR_DEFAULT = '#666666';
const BADGE_COLOR_WARNING = '#ff0000';

const ICON_DIGIT_COLOR = '#ffffff';
const ICON_PLATE_STROKE = 'rgba(255,255,255,0.18)';
const ICON_PLATE_RADIUS = 0.2;
const ICON_DIGIT_MAX_WIDTH = 0.92;
const ICON_DIGIT_MAX_CAP = 0.56;
const ICON_UNIT_SCALE = 0.45;
const ICON_UNIT_MAX_WIDTH = 0.86;
const ICON_GAP = 0.06;
// The unit letter from formatIconText is drawn as a word beneath the digits,
// except at 16 px where a word would be too small to read and the letter
// itself is drawn larger instead.
const ICON_UNIT_WORDS = { m: 'min', s: 'sec', h: 'hr' };
const ICON_LETTER_UNIT_SIZE = 16;
const ICON_LETTER_UNIT_SCALE = 0.6;

// Splits a label such as '28m' into its digits and unit. Labels without a
// unit (such as '?') keep the whole text as digits.
function splitIconText(text) {
  const match = /^(\d+)([a-z]?)$/.exec(text);
  return match ? [match[1], match[2]] : [text, ''];
}

function boldFont(size) {
  return 'bold ' + size + 'px sans-serif';
}

// Height of text above the baseline at the current font, or fallbackRatio
// of the font size when the metric is missing.
function ascentOf(ctx, text, fontSize, fallbackRatio) {
  const ascent = ctx.measureText(text).actualBoundingBoxAscent;
  return typeof ascent === 'number' ? ascent : fallbackRatio * fontSize;
}

// Text sizes per icon size, fitted once to the widest labels ('88' and the
// widest unit word) so the text does not change size as it ticks. D is the
// digit cap height and U the tallest unit ascent. At 16 px the unit is a
// letter, sized as large as fits under the digits.
const iconTextLayouts = new Map();

function iconTextLayout(ctx, S) {
  if (!iconTextLayouts.has(S)) {
    let digitSize = Math.ceil(S);
    for (; digitSize > 6; digitSize--) {
      ctx.font = boldFont(digitSize);
      if (ctx.measureText('88').width <= ICON_DIGIT_MAX_WIDTH * S
        && ascentOf(ctx, '8', digitSize, 0.72) <= ICON_DIGIT_MAX_CAP * S) {
        break;
      }
    }
    ctx.font = boldFont(digitSize);
    const D = ascentOf(ctx, '8', digitSize, 0.72);

    const useWords = S !== ICON_LETTER_UNIT_SIZE;
    const units = useWords ? Object.values(ICON_UNIT_WORDS) : Object.keys(ICON_UNIT_WORDS);
    const tallestUnit = (size) => Math.max(...units.map((u) => ascentOf(ctx, u, size, 0.55)));
    let unitSize;
    if (useWords) {
      const widestWord = () => Math.max(...units.map((word) => ctx.measureText(word).width));
      unitSize = Math.round(ICON_UNIT_SCALE * digitSize);
      ctx.font = boldFont(unitSize);
      while (unitSize > 5 && widestWord() > ICON_UNIT_MAX_WIDTH * S) {
        unitSize--;
        ctx.font = boldFont(unitSize);
      }
    } else {
      const gap = ICON_GAP * S;
      unitSize = Math.round(ICON_LETTER_UNIT_SCALE * digitSize);
      ctx.font = boldFont(unitSize);
      while (unitSize > 5 && D + gap + tallestUnit(unitSize) > S - 1) {
        unitSize--;
        ctx.font = boldFont(unitSize);
      }
    }
    const U = tallestUnit(unitSize);

    iconTextLayouts.set(S, { digitSize, D, unitSize, U, useWords });
  }
  return iconTextLayouts.get(S);
}

// Test hook: forget the fitted text sizes so a test can fit them again.
function resetIconFitCache() {
  iconTextLayouts.clear();
}

// Fills the icon with a rounded plate in the state's gradient and a faint
// light edge.
function drawIconPlate(ctx, S, state) {
  ctx.beginPath();
  ctx.roundRect(0, 0, S, S, ICON_PLATE_RADIUS * S);
  const gradient = ctx.createLinearGradient(0, 0, 0, S);
  gradient.addColorStop(0, state.top);
  gradient.addColorStop(1, state.bottom);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, S - 1, S - 1, ICON_PLATE_RADIUS * S);
  ctx.strokeStyle = ICON_PLATE_STROKE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Draws the remaining time on a plate that fills the icon in place of the
// hourglass: big white digits on top and the unit as a word centered
// beneath them. The browser badge is too narrow for the countdown (Firefox
// clips it after 2 to 3 characters), so the time is drawn as the icon itself.
function drawCountdownIcon(ctx, S, text, state) {
  drawIconPlate(ctx, S, state);

  const [digits, unit] = splitIconText(text);
  const { digitSize, D, unitSize, U, useWords } = iconTextLayout(ctx, S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (!unit) {
    // Digits only, centered on their own cap height.
    ctx.font = boldFont(digitSize);
    ctx.fillStyle = ICON_DIGIT_COLOR;
    ctx.fillText(digits, S / 2, (S + D) / 2);
    return;
  }

  const gap = ICON_GAP * S;
  const top = (S - (D + gap + U)) / 2;
  ctx.font = boldFont(digitSize);
  ctx.fillStyle = ICON_DIGIT_COLOR;
  ctx.fillText(digits, S / 2, top + D);
  ctx.font = boldFont(unitSize);
  ctx.fillStyle = state.unit;
  const unitText = useWords && ICON_UNIT_WORDS[unit] ? ICON_UNIT_WORDS[unit] : unit;
  ctx.fillText(unitText, S / 2, top + D + gap + U);
}

// Renders the countdown icon at every size in ICON_SIZES. Resolves to the
// imageData map for action.setIcon, or null when OffscreenCanvas is missing
// or anything fails, so callers can fall back to badge text.
async function renderCountdownIcon(text, state) {
  if (typeof OffscreenCanvas === 'undefined') {
    return null;
  }
  try {
    const imageData = {};
    for (const S of ICON_SIZES) {
      const canvas = new OffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }
      drawCountdownIcon(ctx, S, text, state);
      imageData[S] = ctx.getImageData(0, 0, S, S);
    }
    return imageData;
  } catch (error) {
    console.error('Failed to render countdown icon:', error && error.message ? error.message : error);
    return null;
  }
}

// Tabs whose toolbar icon currently shows a label, so the default hourglass
// can be restored when their timer goes away.
const labeledIconTabs = new Set();
// Remaining milliseconds of timers paused from the popup, by tab id.
const pausedTabs = new Map();

// Timer state changes from the popup (start, pause, stop) are numbered. Each
// tab remembers the number of its latest change, and every icon update
// captures the counter when it starts. An update whose tab changed since then
// is stale and stops before writing, so a slow render or an old alarm list
// cannot paint over the icon a newer change asked for.
let iconStateEpoch = 0;
const tabStateVersions = new Map();

function markTabStateChanged(tabId) {
  iconStateEpoch++;
  tabStateVersions.set(tabId, iconStateEpoch);
}

// Returns a check that stays true until the tab's timer state changes.
function tabStateGuard(tabId, epoch = iconStateEpoch) {
  return () => (tabStateVersions.get(tabId) || 0) <= epoch;
}

const ALWAYS_CURRENT = () => true;

// Shows the remaining time for a tab: the labeled icon with empty badge
// text, or badge text on the default icon when the icon cannot be drawn.
// Returns false, leaving the rest untouched, once isCurrent() turns false.
async function showCountdown(tabId, timeRemaining, iconColor, badgeColor, title, isCurrent = ALWAYS_CURRENT) {
  const imageData = await renderCountdownIcon(formatIconText(timeRemaining), iconColor);
  if (!isCurrent()) {
    return false;
  }
  await ChromeAPIWrapper.action.setTitle({ tabId: tabId, title: title });
  if (!isCurrent()) {
    return false;
  }
  if (imageData) {
    await ChromeAPIWrapper.action.setIcon({ tabId: tabId, imageData: imageData });
    labeledIconTabs.add(tabId);
    if (!isCurrent()) {
      return false;
    }
    await ChromeAPIWrapper.action.setBadgeText({ tabId: tabId, text: '' });
  } else {
    // Drawing failed: take down any label left by an earlier tick so the
    // default icon shows with the badge text. Unconditional because the
    // browser keeps a drawn icon across background restarts, which empty
    // labeledIconTabs.
    labeledIconTabs.delete(tabId);
    await ChromeAPIWrapper.action.setIcon({ tabId: tabId, path: DEFAULT_ICON_PATHS });
    if (!isCurrent()) {
      return false;
    }
    await ChromeAPIWrapper.action.setBadgeText({
      tabId: tabId,
      text: FormatDuration(timeRemaining)
    });
    ChromeAPIWrapper.action.setBadgeBackgroundColor({ tabId: tabId, color: badgeColor });
  }
  return true;
}

// Puts the tab back to the default hourglass, title and empty badge.
async function restoreDefaultIcon(tabId, isCurrent = ALWAYS_CURRENT) {
  labeledIconTabs.delete(tabId);
  await ChromeAPIWrapper.action.setIcon({ tabId: tabId, path: DEFAULT_ICON_PATHS });
  if (!isCurrent()) {
    return;
  }
  await ChromeAPIWrapper.action.setTitle({ tabId: tabId, title: DEFAULT_ICON_TITLE });
  if (!isCurrent()) {
    return;
  }
  await ChromeAPIWrapper.action.setBadgeText({ tabId: tabId, text: '' });
  ChromeAPIWrapper.action.setBadgeBackgroundColor({ tabId: tabId, color: BADGE_COLOR_DEFAULT });
}

// Draws the paused icon with the frozen remaining time.
async function showPausedIcon(tabId, timeRemaining, isCurrent = ALWAYS_CURRENT) {
  await showCountdown(
    tabId,
    timeRemaining,
    ICON_COLOR_PAUSED,
    BADGE_COLOR_DEFAULT,
    'Paused, ' + FormatExactDuration(timeRemaining) + ' remaining',
    isCurrent
  );
}

// Pauses the first HTML5 <video> element on the page. Used for YouTube and
// Twitch when the user picked "Pause video" instead of "Close tab".
async function pauseVideoOnPage(tabId) {
  try {
    await ChromeAPIWrapper.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const video = document.querySelector('video');
        if (video) {
          video.pause();
        }
      }
    });
    // Restore the default icon, title and badge after pausing
    await restoreDefaultIcon(tabId);
  } catch (error) {
    console.error('Failed to pause video on page:', error && error.message ? error.message : error);
  }
}

// When an alarm expires, handle the action
ChromeAPIWrapper.alarms.onAlarm.addListener(async function(alarm) {
  const tabId = Number(alarm.name);
  try {
    const tabExists = await ChromeAPIWrapper.tabs.exists(tabId);
    if (!tabExists) {
      await ChromeAPIWrapper.alarms.clear(alarm.name);
      return;
    }

    // Get the tab so we can decide whether the saved action is meaningful.
    const tab = await ChromeAPIWrapper.tabs.get(tabId);
    const isVideoSite = !!(tab.url && getVideoSiteContext(tab.url));

    // Get the saved action for this tab
    const data = await ChromeAPIWrapper.storage.local.get(tabId + '_action');
    const action = data[tabId + '_action'] || 'close';

    if (isVideoSite && action === 'pause') {
      // Pause the embedded video for recognized video sites (YouTube, Twitch).
      await pauseVideoOnPage(tabId);
    } else {
      // Close the tab for everything else, or when close was explicitly chosen.
      await ChromeAPIWrapper.tabs.remove(tabId);
      labeledIconTabs.delete(tabId);
    }
    pausedTabs.delete(tabId);

    // Reset badge color after alarm expires
    ChromeAPIWrapper.action.setBadgeBackgroundColor({
      'tabId': tabId,
      'color': '#666666'
    });
  } catch (error) {
    console.error('Failed to handle alarm:', error);
  }
});

// When the user closes a tab, save timer state if running and clear the alarm
async function HandleRemove(tabId, _removeInfo) {
  const tabKey = tabId.toString();

  try {
    // Check if there's an alarm (running timer) for this tab
    const alarm = await ChromeAPIWrapper.alarms.get(tabKey);

    if (alarm) {
      // Tab had a running timer - save remaining time by URL
      const data = await ChromeAPIWrapper.storage.local.get([tabKey + '_url']);
      const url = data[tabKey + '_url'];

      if (url) {
        const remainingTime = alarm.scheduledTime - Date.now();
        if (remainingTime > 0) {
          const urlKey = normalizeUrlForStorage(url);
          await ChromeAPIWrapper.storage.local.set({
            [urlKey]: {
              pausedTimeRemaining: remainingTime,
              pausedAt: Date.now()
            }
          });
        }
      }
    }

    // Clear the alarm
    await ChromeAPIWrapper.alarms.clear(tabKey);

    // Forget the tab's icon state (don't try to set the icon - tab is already gone)
    labeledIconTabs.delete(tabId);
    pausedTabs.delete(tabId);
    tabStateVersions.delete(tabId);

    // Clean up tab-specific storage (don't try to set badge - tab is already gone)
    await ChromeAPIWrapper.storage.local.remove([tabKey + '_url', tabKey + '_action']);

  } catch (error) {
    if (error.message !== 'Tab not found') {
      console.error('Failed to handle tab removal:', error);
    }
  }
}
ChromeAPIWrapper.tabs.onRemoved.addListener(HandleRemove);

// Show the time remaining on every tab with a timer, once per second: a
// label drawn into the toolbar icon, or badge text when it cannot be drawn.
async function UpdateBadges() {
  const now = new Date();
  // Taken before reading the alarms, so a change that lands while this pass
  // is underway marks that tab's work in this pass as stale.
  const epoch = iconStateEpoch;

  try {
    const alarms = await ChromeAPIWrapper.alarms.getAll();

    // Restore the default icon on tabs whose timer went away while the icon
    // still showed a label. Paused tabs keep their paused icon.
    const alarmTabIds = new Set(alarms.map((alarm) => parseInt(alarm.name)));
    for (const tabId of Array.from(labeledIconTabs)) {
      const isCurrent = tabStateGuard(tabId, epoch);
      if (alarmTabIds.has(tabId) || pausedTabs.has(tabId) || !isCurrent()) {
        continue;
      }
      const exists = await ChromeAPIWrapper.tabs.exists(tabId);
      if (pausedTabs.has(tabId) || !isCurrent()) {
        continue;
      }
      if (exists) {
        await restoreDefaultIcon(tabId, isCurrent);
      } else {
        labeledIconTabs.delete(tabId);
      }
    }

    // Nothing to count down — stop polling so the service worker can suspend.
    if (alarms.length === 0) {
      stopBadgePolling();
      return;
    }

    for (const alarm of alarms) {
      const tabId = parseInt(alarm.name);
      const isCurrent = tabStateGuard(tabId, epoch);
      const tabExists = await ChromeAPIWrapper.tabs.exists(tabId);
      if (!isCurrent()) {
        // Paused, resumed or stopped since this pass read the alarms.
        continue;
      }

      if (tabExists) {
        // A live alarm means the timer is running, not paused.
        pausedTabs.delete(tabId);
        const timeRemaining = alarm.scheduledTime - now;

        // Match the popup's warning threshold by ceiling sub-second
        // remainders the same way it does.
        const secondsRemaining = Math.ceil(timeRemaining / 1000);
        const badgeColor = secondsRemaining <= 30 ? BADGE_COLOR_WARNING : BADGE_COLOR_DEFAULT;
        // The label goes red for the whole final minute, matching the
        // switch to a ticking seconds display.
        const iconColor = secondsRemaining < 60 ? ICON_COLOR_FINAL_MINUTE : ICON_COLOR_RUNNING;

        // Tooltip shows the exact countdown and the scheduled outcome, since
        // the icon only fits an abbreviated time.
        let tab = null;
        try {
          tab = await ChromeAPIWrapper.tabs.get(tabId);
        } catch {
          tab = null;
        }
        const data = await ChromeAPIWrapper.storage.local.get(tabId + '_action');
        const action = data[tabId + '_action'] || 'close';
        const willPause = !!(tab && tab.url && getVideoSiteContext(tab.url)) && action === 'pause';
        const endTime = new Date(alarm.scheduledTime)
          .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const title = FormatExactDuration(timeRemaining) + ' remaining\n'
          + (willPause ? 'Pauses video' : 'Closes tab') + ' at ' + endTime;

        await showCountdown(tabId, timeRemaining, iconColor, badgeColor, title, isCurrent);
      } else {
        // If tab does not exist, clear the alarm
        await ChromeAPIWrapper.alarms.clear(alarm.name);
      }
    }
  } catch (error) {
    console.error('Failed to get alarms:', error);
  }
}

// Badge polling runs only while at least one timer exists, so an idle worker
// can suspend instead of being kept alive by a busy loop. Polling restarts on
// every worker wake-up (top-level call below), when an auto-start rule
// creates an alarm, and when the popup reports a new timer via the
// 'timerStarted' message.
const BADGE_POLL_INTERVAL_MS = 1000;
let badgePollTimer = null;

function stopBadgePolling() {
  if (badgePollTimer !== null) {
    clearInterval(badgePollTimer);
    badgePollTimer = null;
  }
}

function startBadgePolling() {
  if (badgePollTimer === null) {
    badgePollTimer = setInterval(UpdateBadges, BADGE_POLL_INTERVAL_MS);
  }
  // Immediate pass so the badge appears without waiting a full tick (and so
  // polling stops right away when no alarms exist).
  UpdateBadges();
}

startBadgePolling();

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (!message) {
      return;
    }
    if (message.type === 'timerStarted') {
      if (typeof message.tabId === 'number') {
        markTabStateChanged(message.tabId);
        pausedTabs.delete(message.tabId);
      }
      startBadgePolling();
    } else if (message.type === 'timerPaused' && typeof message.tabId === 'number'
      && typeof message.timeRemaining === 'number') {
      markTabStateChanged(message.tabId);
      pausedTabs.set(message.tabId, message.timeRemaining);
      showPausedIcon(message.tabId, message.timeRemaining, tabStateGuard(message.tabId));
    } else if (message.type === 'timerStopped' && typeof message.tabId === 'number') {
      markTabStateChanged(message.tabId);
      pausedTabs.delete(message.tabId);
      restoreDefaultIcon(message.tabId, tabStateGuard(message.tabId));
    }
  });
}

function getMillisecondsUntilTime(hour, minute) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

async function checkAutoStartRule(url) {
  try {
    const data = await ChromeAPIWrapper.storage.local.get(['autostart_rules']);
    const rules = data.autostart_rules || {};

    // Video-site precedence: specific content rule beats per-site "all" rule.
    const ctx = getVideoSiteContext(url);
    if (ctx) {
      if (rules[ctx.ruleKeyExact]) return rules[ctx.ruleKeyExact];
      if (rules[ctx.ruleKeyAll]) return rules[ctx.ruleKeyAll];
    }

    const urlObj = new URL(url);
    const urlKey = `url_${encodeURIComponent(normalizeUrlForRuleKey(urlObj))}`;
    if (rules[urlKey]) return rules[urlKey];
  } catch (error) {
    console.error('Failed to check auto-start rule:', error);
  }
  return null;
}

function isValidDuration(d) {
  return d && typeof d.hours === 'number' && typeof d.minutes === 'number'
    && !Number.isNaN(d.hours) && !Number.isNaN(d.minutes);
}

function isValidTime(t) {
  return t && typeof t.hour === 'number' && typeof t.minute === 'number'
    && !Number.isNaN(t.hour) && !Number.isNaN(t.minute);
}

async function autoStartTimerForTab(tab, rule) {
  try {
    if (tab.id == null || tab.id < 0) return;
    const tabIdStr = tab.id.toString();

    const existingAlarm = await ChromeAPIWrapper.alarms.get(tabIdStr);
    if (existingAlarm) return;

    let durationMs;
    if (rule.timerMode === 'time') {
      if (!isValidTime(rule.time)) {
        console.error('Auto-start rule missing valid time:', rule);
        return;
      }
      durationMs = getMillisecondsUntilTime(rule.time.hour, rule.time.minute);
    } else {
      if (!isValidDuration(rule.duration)) {
        console.error('Auto-start rule missing valid duration:', rule);
        return;
      }
      durationMs = ((rule.duration.hours * 60) + rule.duration.minutes) * 60 * 1000;
    }

    if (durationMs <= 0) return;

    await ChromeAPIWrapper.storage.local.set({
      [tabIdStr + '_action']: rule.action,
      [tabIdStr + '_url']: tab.url
    });

    await ChromeAPIWrapper.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: '#666666'
    });

    await ChromeAPIWrapper.alarms.create(tabIdStr, {
      when: Date.now() + durationMs
    });

    startBadgePolling();
  } catch (error) {
    console.error('Failed to auto-start timer for tab:', error);
  }
}

async function handleTabForAutoStart(tab) {
  try {
    if (!tab || !tab.url) return;
    const rule = await checkAutoStartRule(tab.url);
    if (rule) await autoStartTimerForTab(tab, rule);
  } catch (error) {
    console.error('Auto-start handler failed:', error);
  }
}

if (typeof chrome !== 'undefined' && chrome.tabs) {
  chrome.tabs.onCreated.addListener((tab) => {
    handleTabForAutoStart(tab);
  });

  // Filter on changeInfo.url to fire once per navigation.
  // onUpdated otherwise fires repeatedly on status transitions and SPA route changes.
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!changeInfo.url) return;
    handleTabForAutoStart(tab);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FormatDuration,
    FormatExactDuration,
    formatIconText,
    renderCountdownIcon,
    resetIconFitCache,
    ICON_COLOR_RUNNING,
    ICON_COLOR_FINAL_MINUTE,
    ICON_COLOR_PAUSED,
    ChromeAPIWrapper,
    HandleRemove,
    UpdateBadges,
    startBadgePolling,
    stopBadgePolling,
    pauseVideoOnPage,
    getMillisecondsUntilTime,
    checkAutoStartRule,
    autoStartTimerForTab,
    handleTabForAutoStart,
    normalizeUrlForRuleKey,
    getVideoSiteContext
  };
}

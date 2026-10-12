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

const ICON_SIZES = [16, 32];
const DEFAULT_ICON_TITLE = 'Tab Countdown Timer';
const DEFAULT_ICON_PATHS = {
  16: '/icons/hourglass16.png',
  32: '/icons/hourglass32.png',
  48: '/icons/hourglass48.png',
  128: '/icons/hourglass128.png'
};
const ICON_COLOR_RUNNING = '#3d4a58';
const ICON_COLOR_FINAL_MINUTE = '#d92d20';
const ICON_COLOR_PAUSED = '#6b7280';
const BADGE_COLOR_DEFAULT = '#666666';
const BADGE_COLOR_WARNING = '#ff0000';

// Hourglass bitmaps for each rendered size, loaded once per background
// lifetime. A rejected load stays cached so every later tick goes straight
// to the badge fallback instead of refetching.
let iconBitmapsPromise = null;

function loadIconBitmaps() {
  if (iconBitmapsPromise === null) {
    iconBitmapsPromise = Promise.all(ICON_SIZES.map(async(size) => {
      const response = await fetch(chrome.runtime.getURL('icons/hourglass' + size + '.png'));
      if (!response.ok) {
        throw new Error('Failed to load hourglass' + size + '.png');
      }
      return createImageBitmap(await response.blob());
    })).then((bitmaps) => {
      const bySize = {};
      ICON_SIZES.forEach((size, i) => {
        bySize[size] = bitmaps[i];
      });
      return bySize;
    });
  }
  return iconBitmapsPromise;
}

// Test hook: forget the cached bitmaps and font sizes so a test can load
// and fit them again.
function resetIconBitmapCache() {
  iconBitmapsPromise = null;
  iconFontSizes.clear();
}

// Label font size per icon size, fitted once to the widest label ('88m')
// so the text does not change size as it ticks.
const ICON_FONT_REFERENCE_TEXT = '88m';
const iconFontSizes = new Map();

function iconFontSize(ctx, S, innerHeight) {
  if (!iconFontSizes.has(S)) {
    let fontSize = Math.ceil(0.95 * innerHeight);
    ctx.font = 'bold ' + fontSize + 'px sans-serif';
    while (fontSize > 5 && ctx.measureText(ICON_FONT_REFERENCE_TEXT).width > 0.86 * S) {
      fontSize--;
      ctx.font = 'bold ' + fontSize + 'px sans-serif';
    }
    iconFontSizes.set(S, fontSize);
  }
  return iconFontSizes.get(S);
}

// Draws the hourglass at size S with the label in an outlined pill over its
// lower half. The browser badge is too narrow for the countdown (Firefox
// clips it after 2 to 3 characters), so the time is drawn into the icon.
function drawIconLabel(ctx, S, bitmap, text, color) {
  ctx.drawImage(bitmap, 0, 0, S, S);

  const h = Math.round(0.5 * S);
  const b = Math.max(1, Math.round(S / 16));
  ctx.beginPath();
  ctx.roundRect(0, S - h, S, h, 0.4 * h);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(b, S - h + b, S - 2 * b, h - 2 * b, 0.4 * (h - 2 * b));
  ctx.fillStyle = color;
  ctx.fill();

  ctx.font = 'bold ' + iconFontSize(ctx, S, h - 2 * b) + 'px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, S / 2, S - h / 2 + 0.03 * S);
}

// Renders the labeled icon at every size in ICON_SIZES. Resolves to the
// imageData map for action.setIcon, or null when OffscreenCanvas or
// createImageBitmap is missing or anything fails, so callers can fall back
// to badge text.
async function renderCountdownIcon(text, color) {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    return null;
  }
  try {
    const bitmaps = await loadIconBitmaps();
    const imageData = {};
    for (const S of ICON_SIZES) {
      const canvas = new OffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }
      drawIconLabel(ctx, S, bitmaps[S], text, color);
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
// Bumped whenever the popup pauses or stops a timer. UpdateBadges abandons a
// pass that started before the bump, so a stale alarm list cannot paint the
// running icon over the paused or default one.
let iconStateEpoch = 0;

// Shows the remaining time for a tab: the labeled icon with empty badge
// text, or badge text on the default icon when the icon cannot be drawn.
// Returns false without touching the tab when isCurrent() turns false while
// the icon renders.
async function showCountdown(tabId, timeRemaining, iconColor, badgeColor, title, isCurrent) {
  const imageData = await renderCountdownIcon(formatIconText(timeRemaining), iconColor);
  if (isCurrent && !isCurrent()) {
    return false;
  }
  await ChromeAPIWrapper.action.setTitle({ tabId: tabId, title: title });
  if (imageData) {
    await ChromeAPIWrapper.action.setIcon({ tabId: tabId, imageData: imageData });
    await ChromeAPIWrapper.action.setBadgeText({ tabId: tabId, text: '' });
    labeledIconTabs.add(tabId);
  } else {
    await ChromeAPIWrapper.action.setBadgeText({
      tabId: tabId,
      text: FormatDuration(timeRemaining)
    });
    ChromeAPIWrapper.action.setBadgeBackgroundColor({ tabId: tabId, color: badgeColor });
  }
  return true;
}

// Puts the tab back to the default hourglass, title and empty badge.
async function restoreDefaultIcon(tabId) {
  labeledIconTabs.delete(tabId);
  await ChromeAPIWrapper.action.setIcon({ tabId: tabId, path: DEFAULT_ICON_PATHS });
  await ChromeAPIWrapper.action.setTitle({ tabId: tabId, title: DEFAULT_ICON_TITLE });
  await ChromeAPIWrapper.action.setBadgeText({ tabId: tabId, text: '' });
  ChromeAPIWrapper.action.setBadgeBackgroundColor({ tabId: tabId, color: BADGE_COLOR_DEFAULT });
}

// Draws the paused icon with the frozen remaining time.
async function showPausedIcon(tabId, timeRemaining) {
  await showCountdown(
    tabId,
    timeRemaining,
    ICON_COLOR_PAUSED,
    BADGE_COLOR_DEFAULT,
    'Paused, ' + FormatExactDuration(timeRemaining) + ' remaining'
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
  const epoch = iconStateEpoch;
  const isCurrent = () => iconStateEpoch === epoch;

  try {
    const alarms = await ChromeAPIWrapper.alarms.getAll();
    if (!isCurrent()) {
      return;
    }

    // Restore the default icon on tabs whose timer went away while the icon
    // still showed a label. Paused tabs keep their paused icon.
    const alarmTabIds = new Set(alarms.map((alarm) => parseInt(alarm.name)));
    for (const tabId of Array.from(labeledIconTabs)) {
      if (alarmTabIds.has(tabId) || pausedTabs.has(tabId)) {
        continue;
      }
      if (await ChromeAPIWrapper.tabs.exists(tabId)) {
        await restoreDefaultIcon(tabId);
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
      const tabExists = await ChromeAPIWrapper.tabs.exists(tabId);

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

        if (!await showCountdown(tabId, timeRemaining, iconColor, badgeColor, title, isCurrent)) {
          return;
        }
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
        pausedTabs.delete(message.tabId);
      }
      startBadgePolling();
    } else if (message.type === 'timerPaused' && typeof message.tabId === 'number'
      && typeof message.timeRemaining === 'number') {
      iconStateEpoch++;
      pausedTabs.set(message.tabId, message.timeRemaining);
      showPausedIcon(message.tabId, message.timeRemaining);
    } else if (message.type === 'timerStopped' && typeof message.tabId === 'number') {
      iconStateEpoch++;
      pausedTabs.delete(message.tabId);
      restoreDefaultIcon(message.tabId);
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
    resetIconBitmapCache,
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

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
    // Clear the badge text and reset color after pausing
    await ChromeAPIWrapper.action.setBadgeText({ 'tabId': tabId, 'text': '' });
    ChromeAPIWrapper.action.setBadgeBackgroundColor({
      'tabId': tabId,
      'color': '#666666'
    });
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
    }

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

    // Clean up tab-specific storage (don't try to set badge - tab is already gone)
    await ChromeAPIWrapper.storage.local.remove([tabKey + '_url', tabKey + '_action']);

  } catch (error) {
    if (error.message !== 'Tab not found') {
      console.error('Failed to handle tab removal:', error);
    }
  }
}
ChromeAPIWrapper.tabs.onRemoved.addListener(HandleRemove);

// Set the extension badge to the time remaining every second.
async function UpdateBadges() {
  const now = new Date();

  try {
    const alarms = await ChromeAPIWrapper.alarms.getAll();

    // Nothing to count down — stop polling so the service worker can suspend.
    if (alarms.length === 0) {
      stopBadgePolling();
      return;
    }

    for (const alarm of alarms) {
      const tabId = parseInt(alarm.name);
      const tabExists = await ChromeAPIWrapper.tabs.exists(tabId);

      if (tabExists) {
        const timeRemaining = alarm.scheduledTime - now;
        const description = FormatDuration(timeRemaining);

        // Update badge text
        await ChromeAPIWrapper.action.setBadgeText({
          'tabId': tabId,
          'text': description
        });

        // Match the popup's warning threshold by ceiling sub-second
        // remainders the same way it does.
        const secondsRemaining = Math.ceil(timeRemaining / 1000);
        const badgeColor = secondsRemaining <= 30 ? '#ff0000' : '#666666';
        ChromeAPIWrapper.action.setBadgeBackgroundColor({
          'tabId': tabId,
          'color': badgeColor
        });
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
    if (message && message.type === 'timerStarted') {
      startBadgePolling();
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

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
    // are ignored, matching the badge setters above.
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

// Stable URL form for rule keys. Drops fragment so #section variants of the
// same URL share one rule. Keeps query so ?id=1 vs ?id=2 stay distinct.
function normalizeUrlForRuleKey(urlObj) {
  return urlObj.origin + urlObj.pathname + urlObj.search;
}

// Twitch path segments that are not channels/VODs. Visiting these doesn't
// open a player, so we don't treat them as "video pages."
const TWITCH_NON_VIDEO_ROUTES = new Set([
  'directory', 'p', 'subscriptions', 'following', 'search', 'settings',
  'team', 'turbo', 'jobs', 'wallet', 'inventory', 'drops', 'downloads',
  'broadcast', 'logout', 'login', 'signup', 'redeem'
]);

// Identifies tabs hosting a pausable HTML5 video on a recognized site, and
// produces the storage/rule keys used to persist state per-content. Returns
// null for non-video pages so callers can fall back to URL-based keys.
function getVideoSiteContext(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')
      && urlObj.pathname === '/watch'
      && urlObj.searchParams.has('v')) {
      const id = urlObj.searchParams.get('v');
      return {
        site: 'youtube',
        id,
        storageKey: 'paused_youtube_' + id,
        ruleKeyExact: 'youtube_' + id,
        ruleKeyAll: 'youtube_all'
      };
    }
    if (urlObj.hostname.includes('twitch.tv')) {
      const path = urlObj.pathname.replace(/^\/+|\/+$/g, '');
      if (!path) return null;
      const segments = path.split('/');
      const first = segments[0].toLowerCase();
      if (TWITCH_NON_VIDEO_ROUTES.has(first)) return null;
      const id = first === 'videos' && segments[1]
        ? 'videos_' + segments[1]
        : first;
      return {
        site: 'twitch',
        id,
        storageKey: 'paused_twitch_' + id,
        ruleKeyExact: 'twitch_' + id,
        ruleKeyAll: 'twitch_all'
      };
    }
  } catch (e) {
    // fallthrough
  }
  return null;
}

// URL normalization for persistent pause state storage. For recognized video
// sites we key on content (so timers survive ?t=, ?list=, etc.); otherwise
// the full URL is used.
function normalizeUrlForStorage(url) {
  const ctx = getVideoSiteContext(url);
  if (ctx) return ctx.storageKey;
  try {
    return 'paused_' + encodeURIComponent(new URL(url).href);
  } catch (e) {
    return 'paused_' + encodeURIComponent(url);
  }
}

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

const ICON_SIZE = 32;
const DEFAULT_ICON_PATHS = {
  16: '/icons/hourglass16.png',
  32: '/icons/hourglass32.png',
  48: '/icons/hourglass48.png',
  128: '/icons/hourglass128.png'
};

// Draws the remaining time onto a badge-colored plate the size of the
// toolbar icon. The browser badge only fits ~4 tiny characters (Firefox
// truncates anything longer), so the countdown is rendered into the icon
// itself, where the font can use the full icon area. Returns null when
// OffscreenCanvas is unavailable so callers can fall back to badge text.
function renderCountdownIcon(text, color) {
  if (typeof OffscreenCanvas === 'undefined') {
    return null;
  }
  const canvas = new OffscreenCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(0, 0, ICON_SIZE, ICON_SIZE, 7);
  ctx.fill();

  // Largest bold font that keeps the text inside the plate.
  let fontSize = 22;
  ctx.font = 'bold ' + fontSize + 'px sans-serif';
  while (fontSize > 8 && ctx.measureText(text).width > ICON_SIZE - 4) {
    fontSize--;
    ctx.font = 'bold ' + fontSize + 'px sans-serif';
  }

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, ICON_SIZE / 2, ICON_SIZE / 2 + 1);
  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

// Tabs whose toolbar icon currently shows a rendered countdown, so the
// default hourglass can be restored when their timer goes away.
const countdownIconTabs = new Set();

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
    // Restore the default icon and clear the badge after pausing
    countdownIconTabs.delete(tabId);
    await ChromeAPIWrapper.action.setIcon({ tabId: tabId, path: DEFAULT_ICON_PATHS });
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

// Listen for alarm creation to set initial badge color
ChromeAPIWrapper.alarms.onAlarm.addListener((alarm) => {
  const tabId = parseInt(alarm.name);
  ChromeAPIWrapper.action.setBadgeBackgroundColor({
    'tabId': tabId,
    'color': '#666666'
  });
});

// Set the extension badge to the time remaining every second.
async function UpdateBadges() {
  const now = new Date();

  try {
    const alarms = await ChromeAPIWrapper.alarms.getAll();

    // Restore the default icon on tabs whose timer went away (canceled or
    // paused from the popup) while the icon still showed a countdown.
    const alarmTabIds = new Set(alarms.map((alarm) => parseInt(alarm.name)));
    for (const tabId of Array.from(countdownIconTabs)) {
      if (!alarmTabIds.has(tabId)) {
        countdownIconTabs.delete(tabId);
        await ChromeAPIWrapper.action.setIcon({ tabId: tabId, path: DEFAULT_ICON_PATHS });
      }
    }

    for (const alarm of alarms) {
      const tabId = parseInt(alarm.name);
      const tabExists = await ChromeAPIWrapper.tabs.exists(tabId);

      if (tabExists) {
        const timeRemaining = alarm.scheduledTime - now;
        const description = FormatDuration(timeRemaining);

        // Match the popup's warning threshold by ceiling sub-second
        // remainders the same way it does.
        const secondsRemaining = Math.ceil(timeRemaining / 1000);
        const badgeColor = secondsRemaining <= 30 ? '#ff0000' : '#666666';

        const imageData = renderCountdownIcon(description, badgeColor);
        if (imageData) {
          // Draw the countdown into the toolbar icon and keep the badge
          // empty; the badge is too small to show the text un-truncated.
          await ChromeAPIWrapper.action.setIcon({
            tabId: tabId,
            imageData: { [ICON_SIZE]: imageData }
          });
          await ChromeAPIWrapper.action.setBadgeText({ tabId: tabId, text: '' });
          countdownIconTabs.add(tabId);
        } else {
          // No OffscreenCanvas available: fall back to badge text.
          await ChromeAPIWrapper.action.setBadgeText({
            'tabId': tabId,
            'text': description
          });
          ChromeAPIWrapper.action.setBadgeBackgroundColor({
            'tabId': tabId,
            'color': badgeColor
          });
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
setInterval(UpdateBadges, 250);

// Function to calculate milliseconds until next 10 PM
function getMillisecondsUntil10PM() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(22, 0, 0, 0); // 10 PM

  // If it's already past 10 PM, set timer for tomorrow at 10 PM
  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
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
  } catch (error) {
    console.error('Failed to auto-start timer for tab:', error);
  }
}

// Function to set timer for YouTube tab
async function setYouTubeTimer(tab) {
  const tabId = tab.id.toString();

  try {
    const existingAlarm = await ChromeAPIWrapper.alarms.get(tabId);
    if (existingAlarm) {
      return;
    }

    const delayMs = getMillisecondsUntil10PM();

    // Set the action to pause for YouTube videos
    await ChromeAPIWrapper.storage.local.set({
      [tabId + '_action']: 'pause'
    });

    // Set initial badge color
    await ChromeAPIWrapper.action.setBadgeBackgroundColor({
      'tabId': parseInt(tabId),
      'color': '#666666'
    });

    // Create the alarm for 10 PM
    await ChromeAPIWrapper.alarms.create(tabId, {
      when: Date.now() + delayMs
    });
  } catch (error) {
    console.error('Failed to set YouTube timer:', error);
  }
}

// Check for YouTube tabs and set timers when needed
async function checkAndSetYouTubeTimers() {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    try {
      const tabs = await new Promise((resolve) => {
        chrome.tabs.query({}, resolve);
      });

      for (const tab of tabs) {
        if (tab.url && tab.url.includes('youtube.com/watch')) {
          // Check if there's already an alarm for this tab
          const alarm = await new Promise((resolve) => {
            chrome.alarms.get(tab.id.toString(), resolve);
          });

          // Only set a new timer if there isn't one already
          if (!alarm) {
            await setYouTubeTimer(tab);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check YouTube tabs:', error);
    }
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
    UpdateBadges: UpdateBadges,
    pauseVideoOnPage,
    renderCountdownIcon,
    getMillisecondsUntil10PM,
    getMillisecondsUntilTime,
    setYouTubeTimer,
    checkAndSetYouTubeTimers,
    checkAutoStartRule,
    autoStartTimerForTab,
    handleTabForAutoStart,
    normalizeUrlForRuleKey,
    getVideoSiteContext
  };
}

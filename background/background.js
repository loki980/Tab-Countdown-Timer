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
        setBadgeBackgroundColor: (color) => {
            if (typeof chrome !== 'undefined' && chrome.action) {
                chrome.action.setBadgeBackgroundColor(color);
            }
        },
        // Sets the text on the extension's badge.
        setBadgeText: (options) => {
            return new Promise((resolve, reject) => {
                if (typeof chrome !== 'undefined' && chrome.action) {
                    chrome.action.setBadgeText(options, () => {
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

// Utility functions
function FormatDuration(d) {
    if (d < 0) {
        return "?";
    }
    
    var divisor = d < 3600000 ? [60000, 1000] : [3600000, 60000];
    
    function pad(x) {
        return x < 10 ? "0" + x : x;
    }
    return Math.floor(d / divisor[0]) + ":" + pad(Math.floor((d % divisor[0]) / divisor[1]));
}

// Function to pause YouTube video
async function pauseYouTubeVideo(tabId) {
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
        await ChromeAPIWrapper.action.setBadgeText({ 'tabId': tabId, 'text': "" });
        ChromeAPIWrapper.action.setBadgeBackgroundColor({ 
            'tabId': tabId,
            'color': '#666666'
        });
    } catch (error) {
        console.error('Failed to pause YouTube video:', error);
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

        // Get the tab first to check if it's YouTube
        const tab = await ChromeAPIWrapper.tabs.get(tabId);
        const isYouTube = tab.url && tab.url.includes("youtube.com/watch");

        // Get the saved action for this tab
        const data = await ChromeAPIWrapper.storage.local.get(tabId + "_action");
        const action = data[tabId + "_action"] || "close";

        if (isYouTube && action === "pause") {
            // Pause YouTube video if it's a YouTube tab and pause action is selected
            await pauseYouTubeVideo(tabId);
        } else {
            // Close the tab for non-YouTube tabs or if close action is selected
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

// When the user closes a tab, clear the associated alarm
function HandleRemove(tabId, removeInfo) {
    ChromeAPIWrapper.alarms.clear(tabId.toString())
        .then(() => {
            // Reset badge color when alarm is cleared
            ChromeAPIWrapper.action.setBadgeBackgroundColor({ 
                'tabId': tabId,
                'color': '#666666'
            });
        })
        .catch(error => {
            if (error.message !== 'Tab not found') {
                console.error('Failed to clear alarm:', error);
            }
        });
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

                // Update badge color based on time remaining
                const secondsRemaining = Math.floor(timeRemaining / 1000);
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
setInterval(UpdateBadges, 1000);

// Function to calculate milliseconds until next 10 PM
function getMillisecondsUntil10PM() {
    const now = new Date();
    let target = new Date(now);
    target.setHours(22, 0, 0, 0); // 10 PM

    // If it's already past 10 PM, set timer for tomorrow at 10 PM
    if (now >= target) {
        target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
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
            [tabId + "_action"]: "pause"
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
                if (tab.url && tab.url.includes("youtube.com/watch")) {
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

/*
// Run the check when the extension starts
 checkAndSetYouTubeTimers();

// Also check when a new tab is created or updated
if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.onCreated.addListener((tab) => {
        if (tab.url && tab.url.includes("youtube.com/watch")) {
            setYouTubeTimer(tab);
        }
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.url && changeInfo.url.includes("youtube.com/watch")) {
            setYouTubeTimer(tab);
        }
    });
}
*/

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FormatDuration,
        ChromeAPIWrapper,
        HandleRemove,
        UpdateBadges: UpdateBadges,
        getMillisecondsUntil10PM,
        setYouTubeTimer,
        checkAndSetYouTubeTimers
    };
}

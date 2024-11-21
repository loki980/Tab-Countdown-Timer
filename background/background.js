// Utility for Chrome API interactions
const ChromeAPIWrapper = {
    alarms: {
        onAlarm: {
            addListener: (callback) => {
                if (typeof chrome !== 'undefined' && chrome.alarms) {
                    chrome.alarms.onAlarm.addListener(callback);
                }
            }
        },
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
        }
    },
    tabs: {
        onRemoved: {
            addListener: (callback) => {
                if (typeof chrome !== 'undefined' && chrome.tabs) {
                    chrome.tabs.onRemoved.addListener(callback);
                }
            }
        },
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
        }
    },
    action: {
        setBadgeBackgroundColor: (color) => {
            if (typeof chrome !== 'undefined' && chrome.action) {
                chrome.action.setBadgeBackgroundColor(color);
            }
        },
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
            }
        }
    },
    scripting: {
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
            try {
                await ChromeAPIWrapper.tabs.get(parseInt(alarm.name));
                const timeRemaining = alarm.scheduledTime - now;
                const description = FormatDuration(timeRemaining);
                
                // Update badge text
                await ChromeAPIWrapper.action.setBadgeText({ 
                    'tabId': parseInt(alarm.name), 
                    'text': description
                });

                // Update badge color based on time remaining
                const secondsRemaining = Math.floor(timeRemaining / 1000);
                const badgeColor = secondsRemaining <= 30 ? '#ff0000' : '#666666';
                ChromeAPIWrapper.action.setBadgeBackgroundColor({ 
                    'tabId': parseInt(alarm.name),
                    'color': badgeColor 
                });
            } catch (error) {
                if (error.message === 'Tab not found') {
                    try {
                        await ChromeAPIWrapper.alarms.clear(alarm.name);
                        // Reset badge color for cleared alarm
                        ChromeAPIWrapper.action.setBadgeBackgroundColor({ 
                            'tabId': parseInt(alarm.name),
                            'color': '#666666'
                        });
                    } catch (clearError) {
                        console.error('Failed to clear orphaned alarm:', clearError);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Failed to get alarms:', error);
    }
}
setInterval(UpdateBadges, 1000);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FormatDuration,
        ChromeAPIWrapper,
        HandleRemove,
        UpdateBadges: UpdateBadges
    };
}

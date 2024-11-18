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

// When an alarm expires, close the tab
ChromeAPIWrapper.alarms.onAlarm.addListener(function(alarm) {
    ChromeAPIWrapper.tabs.remove(Number(alarm.name)).catch(error => {
        console.error('Failed to remove tab:', error);
    });
});

// When the user closes a tab, clear the associated alarm
function HandleRemove(tabId, removeInfo) {
    ChromeAPIWrapper.alarms.clear(tabId.toString())
        .catch(error => {
            if (error.message !== 'Tab not found') {
                console.error('Failed to clear alarm:', error);
            }
        });
}
ChromeAPIWrapper.tabs.onRemoved.addListener(HandleRemove);

ChromeAPIWrapper.action.setBadgeBackgroundColor({ 'color': "#777" });

// Set the extension badge to the time remaining every second.
async function UpdateBadges() {
    const now = new Date();

    try {
        const alarms = await ChromeAPIWrapper.alarms.getAll();
        
        for (const alarm of alarms) {
            try {
                await ChromeAPIWrapper.tabs.get(parseInt(alarm.name));
                const description = FormatDuration(alarm.scheduledTime - now);
                await ChromeAPIWrapper.action.setBadgeText({ 
                    'tabId': parseInt(alarm.name), 
                    'text': description
                });
            } catch (error) {
                if (error.message === 'Tab not found') {
                    try {
                        await ChromeAPIWrapper.alarms.clear(alarm.name);
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

chrome.alarms.onAlarm.addListener(function(alarm) {
    chrome.tabs.remove(Number(alarm.name));
});

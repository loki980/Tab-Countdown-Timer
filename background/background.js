// When an alarm expires, close the tab
chrome.alarms.onAlarm.addListener(function(alarm) {
    chrome.tabs.remove(Number(alarm.name));
});

// When the user closes a tab, clear the associated alarm
function HandleRemove(tabId, removeInfo) {
    chrome.alarms.clear(tabId.toString()) 
}
chrome.tabs.onRemoved.addListener(HandleRemove);

// Pretty formatting for a date diff (duration)
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

chrome.action.setBadgeBackgroundColor({ 'color': "#777" });

// Set the extension badge to the time remaining every second.
function UpdateBadges() {
    var now = new Date();

    chrome.alarms.getAll(function(alarms) { 
        for(alarm of alarms) {
            var description = FormatDuration(alarm.scheduledTime - now);
            chrome.action.setBadgeText({ 'tabId': parseInt(alarm.name), 'text': description});
        }        
    });
}
setInterval(UpdateBadges, 1000);

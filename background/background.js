chrome.alarms.onAlarm.addListener(function(alarm) {
    chrome.tabs.remove(Number(alarm.name));
});



function HandleRemove(tabId, removeInfo) {
    chrome.alarms.clear(tabId.toString()) 
}
chrome.tabs.onRemoved.addListener(HandleRemove);



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

chrome.browserAction.setBadgeText({ 'text': '?'});
chrome.browserAction.setBadgeBackgroundColor({ 'color': "#777" });
//chrome.browserAction.setPopup() can set a tooltip I think.

function UpdateBadges() {
    var now = new Date();

    chrome.alarms.getAll(function(alarms) { 
        for(alarm of alarms) {
            var description = FormatDuration(alarm.scheduledTime - now);
            chrome.browserAction.setBadgeText({ 'tabId': parseInt(alarm.name), 'text': description});
        }        
    });
}
setInterval(UpdateBadges, 1000);


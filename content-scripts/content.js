chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    setTimeout(function() { 
        myWindow.close()
    }, request.autoCloseTimeInSeconds);

    sendResponse({ fromcontent: "This message is from content.js" });
});
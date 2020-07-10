$("#setTimer").bind('click', function(e){
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        // name of the alarm is just the id of the tab
        chrome.alarms.create(tabs[0].id.toString(), {delayInMinutes: getCloseTimeInSeconds()/60} );
        
        function getCloseTimeInSeconds() {
            var seconds = 0;
            
            seconds += Number($("#seconds")[0].value);
            seconds += Number($("#minutes")[0].value * 60);
            seconds += Number($("#hours")[0].value * 60 * 60);
        
            return seconds;
        }
    });
});

$(":text").bind('mousewheel', function(e){
    // Increase text inputs by 1 on mousewheelup, down by 1 on mousewheel down
    if(e.originalEvent.wheelDelta /120 > 0) {
        this.value++;
    }
    else{
        this.value--;
    }

    fixOverflowAndUnderflows();
});

function fixOverflowAndUnderflows() {
    // Get rid of negatives
    if($("#hours")[0].value < 0) {
        $("#hours")[0].value = 0;
    }
    if($("#minutes")[0].value < 0) {
        $("#minutes")[0].value = 0;
    }
    if($("#seconds")[0].value < 0) {
        $("#seconds")[0].value = 0;
    }

    // 61 seconds -> 1 minute, 1 second
    if($("#seconds")[0].value > 60) {
        $("#seconds")[0].value -= 60;
        $("#minutes")[0].value++;
    }

    // 61 minutes -> 1 hour, 1 minute
    if($("#minutes")[0].value > 60) {
        $("#minutes")[0].value -= 60;
        $("#hours")[0].value++;
    }
}
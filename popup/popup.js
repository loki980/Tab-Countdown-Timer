$("#setTimer").bind('click', function(e){
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        // name of the alarm is just the id of the active tab
        chrome.alarms.create(tabs[0].id.toString(), {delayInMinutes: getCloseTimeInSeconds()/60} );
        
        function getCloseTimeInSeconds() {
            var seconds = 0;
            
            seconds += Number($("#minutes")[0].value * 60);
            seconds += Number($("#hours")[0].value * 60 * 60);
        
            return seconds;
        }
    });

    // Close the popup
    window.close();
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

    // 61 minutes -> 1 hour, 1 minute
    if($("#minutes")[0].value > 60) {
        $("#minutes")[0].value -= 60;
        $("#hours")[0].value++;
    }
}

chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.alarms.get(tabs[0].id.toString(), function(alarms) {
        if(alarms != null) {
            var countDownDate = new Date(alarms.scheduledTime).getTime();
            
            // Update the count down every 1 second
            var x = setInterval(function() {
                // Get today's date and time
                var now = new Date().getTime();
                
                // Find the distance between now and the count down date
                var distance = countDownDate - now;
                
                // Time calculations for days, hours, minutes and seconds
                var days = Math.floor(distance / (1000 * 60 * 60 * 24));
                var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) + (days * 24);
                var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                var seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                // Output the result in an element with id="timeRemaining"
                document.getElementById("timeRemaining").innerHTML = "Tab closing in " + hours + "h "
                + minutes + "m " + seconds + "s ";
                
                // If the count down is over, write some text 
                if (distance < 0) {
                    clearInterval(x);
                    document.getElementById("timeRemaining").innerHTML = "EXPIRED";
                }
            }, 1000);
        }
    });
});

$( document ).ready(function() {
    // Hide the cancel timer div until we need it
    $("#cancelDiv").hide();

    // retrieve the last alarm values that were used as default
    chrome.storage.local.get(["hours"], function(data){
        $("#hours")[0].value = data.hours !== undefined ? data.hours : 0;
    });
    chrome.storage.local.get(["minutes"], function(data){
        $("#minutes")[0].value = data.minutes !== undefined ? data.minutes : 30;
    });

    // Preset buttons functionality
    $(".preset-btn").on('click', function() {
        const minutes = $(this).data('minutes') || 0;
        const hours = $(this).data('hours') || 0;
        
        $("#hours")[0].value = hours;
        $("#minutes")[0].value = minutes;
        
        fixOverflowAndUnderflows();
    });

    // Create tab countdown timer when the user sets one
    $("#startbutton").bind('click', function(e){
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            // name of the alarm is just the id of the active tab
            chrome.alarms.create(tabs[0].id.toString(), {delayInMinutes: getCloseTimeInSeconds()/60} );
            
            // store these alarm values as defaults
            chrome.storage.local.set({ "hours": $("#hours")[0].value }, function(){});
            chrome.storage.local.set({ "minutes": $("#minutes")[0].value }, function(){});

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

    // If the user cancels the timer, clear the alarm and the badge
    $("#cancelbutton").bind('click', function(e){
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.action.setBadgeText({ 'tabId': parseInt(tabs[0].id), 'text': ""});
            chrome.alarms.clear(tabs[0].id.toString())
            $("#cancelDiv").hide();
        });
    });

    // Arrow key and mousewheel input adjustment
    $("#hours, #minutes").on('keydown', function(e) {
        if (e.key === 'ArrowUp') {
            this.value = Number(this.value) + 1;
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            this.value = Number(this.value) - 1;
            e.preventDefault();
        }
        fixOverflowAndUnderflows();
    });

    // Increase text inputs by 1 on mousewheelup, down by 1 on mousewheel down
    $("#hours, #minutes").on('wheel', function(e){
        e.preventDefault(); // Prevent page scrolling
        if(e.originalEvent.deltaY < 0) {
            this.value = Number(this.value) + 1;
        }
        else{
            this.value = Number(this.value) - 1;
        }

        fixOverflowAndUnderflows();
    });

    // Address invalid timers
    function fixOverflowAndUnderflows() {
        // Ensure inputs are numbers and within min/max ranges
        const $hours = $("#hours");
        const $minutes = $("#minutes");

        // Validate hours
        let hours = Number($hours[0].value);
        hours = isNaN(hours) ? 0 : Math.max(0, Math.min(24, hours));
        $hours[0].value = hours;

        // Validate minutes
        let minutes = Number($minutes[0].value);
        minutes = isNaN(minutes) ? 0 : Math.max(0, Math.min(59, minutes));
        $minutes[0].value = minutes;

        // 61 minutes -> 1 hour, 1 minute
        if(minutes > 59) {
            $minutes[0].value = minutes % 60;
            $hours[0].value = Math.min(24, hours + Math.floor(minutes / 60));
        }
    }

    // Prevent non-numeric input
    $("#hours, #minutes").on('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
        fixOverflowAndUnderflows();
    });
});

// Display and update countdown on the popup.
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.alarms.get(tabs[0].id.toString(), function(alarms) {
        if(alarms != null) {
            $("#cancelDiv").show();
            var countDownDate = new Date(alarms.scheduledTime).getTime();
            var isPaused = false;
            var pausedTimeRemaining = null;
            
            // Function to update the countdown
            function updateCountdown() {
                if (isPaused) {
                    if (pausedTimeRemaining) {
                        displayTime(pausedTimeRemaining);
                    }
                    return;
                }

                // Get today's date and time
                var now = new Date().getTime();
                
                // Find the distance between now and the count down date
                var distance = countDownDate - now;
                
                displayTime(distance);
                
                // If the count down is over, write some text 
                if (distance < 0) {
                    clearInterval(x);
                    document.getElementById("timeRemaining").innerHTML = "EXPIRED";
                }
            }

            function displayTime(distance) {
                // Time calculations for days, hours, minutes and seconds
                var days = Math.floor(distance / (1000 * 60 * 60 * 24));
                var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) + (days * 24);
                var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                var seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                // Output the result in an element with id="timeRemaining"
                document.getElementById("timeRemaining").innerHTML = hours + "h "
                + minutes + "m " + seconds + "s ";
            }

            // Handle pause button click
            $("#pausebutton").on('click', function() {
                isPaused = !isPaused;
                $(this).toggleClass('paused');
                $(this).text(isPaused ? 'Resume' : 'Pause');

                if (isPaused) {
                    // Store the current time remaining when pausing
                    pausedTimeRemaining = countDownDate - new Date().getTime();
                } else {
                    // Adjust the countdown date when resuming
                    countDownDate = new Date().getTime() + pausedTimeRemaining;
                }

                // Update the alarm
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    if (isPaused) {
                        chrome.alarms.clear(tabs[0].id.toString());
                    } else {
                        chrome.alarms.create(tabs[0].id.toString(), {
                            when: countDownDate
                        });
                    }
                });
            });

            // Update immediately on popup open
            updateCountdown();
            
            // Then update every 1 second
            var x = setInterval(updateCountdown, 1000);
        }
    });
});

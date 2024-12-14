// Import ChromeAPIWrapper if in test environment
let ChromeAPIWrapper;
if (typeof require !== 'undefined') {
    const background = require('../background/background.js');
    ChromeAPIWrapper = background.ChromeAPIWrapper;
} else {
    ChromeAPIWrapper = chrome;
}

$( document ).ready(function() {
    // Hide the cancel timer div and action options by default
    $("#cancelDiv").hide();
    $(".action-options").hide();

    // Check if current tab is YouTube and show/enable options accordingly
    chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
        const currentTab = tabs[0];
        const tabId = currentTab.id.toString();

        // Check if there's an active alarm for this tab
        chrome.alarms.get(tabId, function(alarm) {
            if (alarm) {
                $("#cancelDiv").show();
            }
        });

        if (currentTab.url && currentTab.url.includes("youtube.com/watch")) {
            $(".action-options").show();
            $("#pauseVideo").prop('disabled', false);

            // Load saved action preference for this tab, default to "pause" if none exists
            chrome.storage.local.get([tabId + "_action"], function(data) {
                const savedAction = data[tabId + "_action"];
                if (savedAction) {
                    $(`input[name="timerAction"][value="${savedAction}"]`).prop('checked', true);
                } else {
                    // Default to "pause" for YouTube tabs
                    $('input[name="timerAction"][value="pause"]').prop('checked', true);
                }
            });

            // Save action preference when changed
            $('input[name="timerAction"]').on('change', function() {
                chrome.storage.local.set({ 
                    [tabId + "_action"]: this.value
                });
            });
        }
    });

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
    $("#startbutton").on('click', async function(e) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tabId = tabs[0].id.toString();
            let action = "close";  // Default action

            // Only check radio if it's a YouTube tab
            if (tabs[0].url && tabs[0].url.includes("youtube.com/watch")) {
                action = $('input[name="timerAction"]:checked').val();
            }
            
            // Store the selected action with the alarm
            await chrome.storage.local.set({ 
                [tabId + "_action"]: action,
                "hours": $("#hours")[0].value,
                "minutes": $("#minutes")[0].value 
            });

            // Set initial badge color
            await chrome.action.setBadgeBackgroundColor({ 
                'tabId': parseInt(tabId), 
                'color': '#666666'
            });

            // Create the alarm
            await chrome.alarms.create(tabId, {
                delayInMinutes: getCloseTimeInSeconds()/60
            });

            // Close the popup
            window.close();
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    });

    // If the user cancels the timer, clear the alarm and the badge
    $("#cancelbutton").on('click', async function(e) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tabId = parseInt(tabs[0].id);
            await chrome.action.setBadgeText({ 'tabId': tabId, 'text': ""});
            await chrome.action.setBadgeBackgroundColor({ 'tabId': tabId, 'color': '#666666'});
            await chrome.alarms.clear(tabs[0].id.toString());
            $("#cancelDiv").hide();
        } catch (error) {
            console.error('Error canceling timer:', error);
        }
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
                const timeElement = document.getElementById("timeRemaining");
                timeElement.innerHTML = hours + "h " + minutes + "m " + seconds + "s ";

                // Check if time is under 30 seconds
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                if (totalSeconds <= 30) {
                    timeElement.classList.add('warning');
                } else {
                    timeElement.classList.remove('warning');
                }
            }

            // Handle pause button click
            $("#pausebutton").on('click', async function() {
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

                try {
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    const tabId = parseInt(tabs[0].id);
                    if (isPaused) {
                        await chrome.alarms.clear(tabs[0].id.toString());
                        // Reset badge color when paused
                        await chrome.action.setBadgeBackgroundColor({ 
                            'tabId': tabId,
                            'color': '#666666'
                        });
                    } else {
                        await chrome.alarms.create(tabs[0].id.toString(), {
                            when: countDownDate
                        });
                    }
                } catch (error) {
                    console.error('Error handling pause:', error);
                }
            });

            // Update immediately on popup open
            updateCountdown();
            
            // Then update every 1 second
            var x = setInterval(updateCountdown, 1000);
        }
    });
});

function getCloseTimeInSeconds() {
    var seconds = 0;
    
    seconds += Number($("#minutes")[0].value * 60);
    seconds += Number($("#hours")[0].value * 60 * 60);

    return seconds;
}

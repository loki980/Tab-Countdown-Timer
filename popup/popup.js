// Import ChromeAPIWrapper if in test environment
let ChromeAPIWrapper;
if (typeof require !== 'undefined') {
    const background = require('../background/background.js');
    ChromeAPIWrapper = background.ChromeAPIWrapper;
} else {
    ChromeAPIWrapper = chrome;
}

$(document).ready(function () {
    // Hide the cancel timer div and action options by default
    $("#cancelDiv").hide();
    $(".action-options").hide();

    const $hours = $("#hours");
    const $minutes = $("#minutes");
    const $start = $("#startbutton");
    const $pause = $("#pausebutton");
    const $cancel = $("#cancelbutton");
    const $timeRemaining = $("#timeRemaining");
    const $eta = $("#eta");

    // Utilities
    function computeTotalSeconds() {
        const h = Number($hours[0].value) || 0;
        const m = Number($minutes[0].value) || 0;
        return h * 3600 + m * 60;
    }

    function updateStartButtonState() {
        // Disable start until duration > 0
        $start.prop('disabled', computeTotalSeconds() <= 0);
    }

    // Address invalid timers and manage overflow between minutes/hours
    function fixOverflowAndUnderflows() {
        // Validate hours
        let hours = Number($hours[0].value);
        hours = isNaN(hours) ? 0 : Math.max(0, Math.min(24, hours));
        $hours[0].value = hours;

        // Validate minutes
        let minutes = Number($minutes[0].value);
        minutes = isNaN(minutes) ? 0 : Math.max(0, Math.min(59, minutes));
        $minutes[0].value = minutes;

        // 61 minutes -> 1 hour, 1 minute
        if (minutes > 59) {
            $minutes[0].value = minutes % 60;
            $hours[0].value = Math.min(24, hours + Math.floor(minutes / 60));
        }
    }

    function getCloseTimeInSeconds() {
        // Keep +1s so the UI starts with a visible ticking second
        let seconds = 0;
        seconds += Number($minutes[0].value * 60);
        seconds += Number($hours[0].value * 60 * 60);
        seconds++;
        return seconds;
    }

    function formatETA(timestampMs) {
        try {
            const d = new Date(timestampMs);
            return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    function displayTime(distance) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) + (days * 24);
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        $timeRemaining.text(hours + "h " + minutes + "m " + seconds + "s ");

        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        if (totalSeconds <= 30) {
            $timeRemaining.addClass('warning');
        } else {
            $timeRemaining.removeClass('warning');
        }
    }

    function setupCountdown(tabIdStr, countDownDate) {
        // Clear any existing countdown interval
        if (window.countdownInterval) {
            clearInterval(window.countdownInterval);
        }

        let isPaused = false;
        let pausedTimeRemaining = null;

        function updateCountdown() {
            if (isPaused) {
                if (pausedTimeRemaining) {
                    displayTime(pausedTimeRemaining);
                }
                return;
            }

            const now = Date.now();
            const distance = countDownDate - now;
            displayTime(distance);

            // If the count down is over, write some text 
            if (distance < 0) {
                clearInterval(window.countdownInterval);
                $timeRemaining.text("EXPIRED");
                $eta.text("");
            }
        }

        // Initial update and interval
        updateCountdown();
        window.countdownInterval = setInterval(updateCountdown, 1000);

        // Update ETA
        $eta.text(countDownDate ? ("Ends at " + formatETA(countDownDate)) : "");

        // Handle pause button
        $pause.off('click').on('click', async function () {
            isPaused = !isPaused;
            $(this).toggleClass('paused');
            $(this).text(isPaused ? 'Resume' : 'Pause');

            if (isPaused) {
                pausedTimeRemaining = countDownDate - Date.now();
            } else {
                countDownDate = Date.now() + pausedTimeRemaining;
                $eta.text("Ends at " + formatETA(countDownDate));
            }

            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                const tabId = parseInt(tabs[0].id);
                const tabKey = tabs[0].id.toString();
                if (isPaused) {
                    await chrome.alarms.clear(tabKey);
                    await chrome.action.setBadgeBackgroundColor({
                        tabId: tabId,
                        color: '#666666'
                    });
                } else {
                    await chrome.alarms.create(tabKey, {
                        when: countDownDate
                    });
                }
            } catch (error) {
                console.error('Error handling pause:', error);
            }
        });
    }

    // Initialization: detect current tab, existing alarm, and YouTube context
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        const currentTab = tabs[0];
        const tabIdStr = currentTab.id.toString();

        // Check if there's an active alarm for this tab
        chrome.alarms.get(tabIdStr, function (alarm) {
            if (alarm) {
                $("#cancelDiv").show();
                $start.text("Update timer");
                setupCountdown(tabIdStr, alarm.scheduledTime);
            }
        });

        // YouTube context: show action options and maintain caption/defaults
        if (currentTab.url && currentTab.url.includes("youtube.com/watch")) {
            $(".action-options").show();
            $("#pauseVideo").prop('disabled', false);

            chrome.storage.local.get([tabIdStr + "_action"], function (data) {
                const savedAction = data[tabIdStr + "_action"];
                if (savedAction) {
                    $(`input[name="timerAction"][value="${savedAction}"]`).prop('checked', true);
                } else {
                    // Default to "pause" for YouTube tabs
                    $('input[name="timerAction"][value="pause"]').prop('checked', true);
                }
            });

            // Save action preference when changed
            $('input[name="timerAction"]').on('change', function () {
                chrome.storage.local.set({
                    [tabIdStr + "_action"]: this.value
                });
            });
        }
    });

    // Load last used alarm values and update Start enablement
    chrome.storage.local.get(["hours", "minutes"], function (data) {
        $hours[0].value = data.hours !== undefined ? data.hours : 0;
        $minutes[0].value = data.minutes !== undefined ? data.minutes : 30;
        fixOverflowAndUnderflows();
        updateStartButtonState();
    });

    // Preset buttons functionality
    $(".preset-btn").on('click', function () {
        const minutes = $(this).data('minutes') || 0;
        const hours = $(this).data('hours') || 0;

        $hours[0].value = hours;
        $minutes[0].value = minutes;

        fixOverflowAndUnderflows();
        updateStartButtonState();
    });

    // Create/update tab countdown timer when the user sets one
    $("#startbutton").on('click', async function (e) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tabIdStr = tabs[0].id.toString();
            const tabId = parseInt(tabs[0].id);
            let action = "close";  // Default action

            // Only check radio if it's a YouTube tab
            if (tabs[0].url && tabs[0].url.includes("youtube.com/watch")) {
                action = $('input[name="timerAction"]:checked').val();
            }

            // Store the selected action with the alarm + remember last duration
            await chrome.storage.local.set({
                [tabIdStr + "_action"]: action,
                "hours": $hours[0].value,
                "minutes": $minutes[0].value
            });

            // Set initial badge color
            await chrome.action.setBadgeBackgroundColor({
                tabId: tabId,
                color: '#666666'
            });

            // Create/update the alarm with exact milliseconds
            const delayMs = getCloseTimeInSeconds() * 1000;
            const scheduledTime = Date.now() + delayMs;
            await chrome.alarms.create(tabIdStr, { when: scheduledTime });

            // Show the cancel div and mark as update-able
            $("#cancelDiv").show();
            $start.text("Update timer");

            // Start/refresh countdown synced to this scheduled time
            setupCountdown(tabIdStr, scheduledTime);
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    });

    // If the user cancels the timer, clear the alarm and the badge
    $("#cancelbutton").on('click', async function (e) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tabId = parseInt(tabs[0].id);
            await chrome.action.setBadgeText({ tabId: tabId, text: "" });
            await chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#666666' });
            await chrome.alarms.clear(tabs[0].id.toString());
            $("#cancelDiv").hide();
            $start.text("Start timer");

            if (window.countdownInterval) {
                clearInterval(window.countdownInterval);
            }
            $timeRemaining.text("");
            $eta.text("");
            $timeRemaining.removeClass('warning');
            $pause.removeClass('paused').text('Pause');
        } catch (error) {
            console.error('Error canceling timer:', error);
        }
    });

    // Arrow key input adjustment
    $("#hours, #minutes").on('keydown', function (e) {
        if (e.key === 'ArrowUp') {
            this.value = Number(this.value) + 1;
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            this.value = Number(this.value) - 1;
            e.preventDefault();
        }
        fixOverflowAndUnderflows();
        updateStartButtonState();
    });

    // Mousewheel input with Shift acceleration on minutes
    $("#hours, #minutes").on('wheel', function (e) {
        e.preventDefault(); // Prevent page scrolling
        const isMinutes = this.id === 'minutes';
        let delta = (e.originalEvent.deltaY < 0) ? 1 : -1;

        if (isMinutes && e.shiftKey) {
            delta *= 5; // accelerate minutes by 5 when holding Shift
        }

        this.value = Number(this.value) + delta;
        fixOverflowAndUnderflows();
        updateStartButtonState();
    });

    // Prevent non-numeric input and keep gating in sync
    $("#hours, #minutes").on('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
        fixOverflowAndUnderflows();
        updateStartButtonState();
    });
});

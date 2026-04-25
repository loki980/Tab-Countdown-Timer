// Import ChromeAPIWrapper if in test environment
let ChromeAPIWrapper;
if (typeof require !== 'undefined') {
  const background = require('../background/background.js');
  ChromeAPIWrapper = background.ChromeAPIWrapper;
} else {
  ChromeAPIWrapper = chrome;
}

// Provide a chrome fallback when running outside the extension runtime
if (typeof chrome === 'undefined' && ChromeAPIWrapper) {
  const globalScope =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined'
          ? global
          : null;
  if (globalScope) {
    globalScope.chrome = ChromeAPIWrapper;
  }
}

let hasInitialized = false;

const initPopup = function() {
  if (hasInitialized) {
    return;
  }
  hasInitialized = true;

  // Hide the cancel timer div and action options by default
  $('#cancelDiv').hide();
  $('.action-options').hide();

  // URL normalization for persistent pause state storage
  function normalizeUrlForStorage(url) {
    try {
      const urlObj = new URL(url);
      // For YouTube, only keep the video ID - other params (t, list, index) can vary
      if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
        const videoId = urlObj.searchParams.get('v');
        return 'paused_youtube_' + videoId;
      }
      return 'paused_' + encodeURIComponent(urlObj.href);
    } catch (e) {
      return 'paused_' + encodeURIComponent(url);
    }
  }

  // Stable URL form for rule keys. Drops fragment so #section variants of the
  // same URL share one rule. Keeps query so ?id=1 vs ?id=2 stay distinct.
  function normalizeUrlForRuleKey(urlObj) {
    return urlObj.origin + urlObj.pathname + urlObj.search;
  }

  function getAutoStartRuleKey(url, matchType = 'exact') {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
        if (matchType === 'all') return 'youtube_all';
        return `youtube_${urlObj.searchParams.get('v')}`;
      }
      return `url_${encodeURIComponent(normalizeUrlForRuleKey(urlObj))}`;
    } catch (e) {
      return `url_${encodeURIComponent(url)}`;
    }
  }

  // Returns matching rule with precedence: specific YouTube video > youtube_all > exact URL
  async function getMatchingAutoStartRule(url) {
    try {
      const data = await chrome.storage.local.get(['autostart_rules']);
      const rules = data.autostart_rules || {};
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
        const videoKey = `youtube_${urlObj.searchParams.get('v')}`;
        if (rules[videoKey]) return { key: videoKey, rule: rules[videoKey] };
        if (rules['youtube_all']) return { key: 'youtube_all', rule: rules['youtube_all'] };
      }
      const urlKey = `url_${encodeURIComponent(normalizeUrlForRuleKey(urlObj))}`;
      if (rules[urlKey]) return { key: urlKey, rule: rules[urlKey] };
    } catch (error) {
      console.error('Failed to match auto-start rule:', error);
    }
    return null;
  }

  async function writeAutoStartRule(ruleKey, rule) {
    const data = await chrome.storage.local.get(['autostart_rules']);
    const rules = data.autostart_rules || {};
    rules[ruleKey] = rule;
    await chrome.storage.local.set({ autostart_rules: rules });
  }

  async function deleteAutoStartRule(ruleKey) {
    const data = await chrome.storage.local.get(['autostart_rules']);
    const rules = data.autostart_rules || {};
    delete rules[ruleKey];
    await chrome.storage.local.set({ autostart_rules: rules });
  }

  function buildAutoStartRule({ url, isYouTube, matchType, timerMode, action, hours, minutes, timeValue }) {
    const rule = {
      type: isYouTube ? (matchType === 'all' ? 'youtube_all' : 'youtube_video') : 'exact_url',
      timerMode,
      action,
      createdAt: Date.now()
    };
    if (isYouTube && matchType === 'video') {
      try {
        rule.videoId = new URL(url).searchParams.get('v');
      } catch (e) {
        rule.videoId = null;
      }
    } else if (!isYouTube) {
      rule.url = url;
    }
    if (timerMode === 'duration') {
      rule.duration = { hours: Number(hours) || 0, minutes: Number(minutes) || 0 };
    } else {
      const [hour, minute] = (timeValue || '').split(':').map(Number);
      rule.time = { hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 };
    }
    return rule;
  }

  function showAutoStartStatus(message) {
    const $status = $('#autoStartStatus');
    $status.text(message || '');
  }

  const PAUSE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  const $hours = $('#hours');
  const $minutes = $('#minutes');
  const $start = $('#startbutton');
  const $pause = $('#pausebutton');
  const $cancel = $('#cancelbutton');
  const $timeRemaining = $('#timeRemaining');
  const $eta = $('#eta');

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
    let hours = Number($hours.val()) || 0;
    let minutes = Number($minutes.val()) || 0;

    // Handle negative minutes by borrowing from hours
    if (minutes < 0) {
      if (hours > 0) {
        const hoursToBorrow = Math.ceil(Math.abs(minutes) / 60);
        hours -= hoursToBorrow;
        minutes += hoursToBorrow * 60;
      } else {
        minutes = 0; // Can't go below zero
      }
    }

    // Handle minute overflow
    if (minutes > 59) {
      hours += Math.floor(minutes / 60);
      minutes %= 60;
    }

    // Ensure hours and minutes are not negative and cap hours at 24
    hours = Math.max(0, Math.min(24, hours));
    minutes = Math.max(0, minutes);

    // If hours is 24, minutes must be 0
    if (hours === 24) {
      minutes = 0;
    }

    $hours.val(hours);
    $minutes.val(minutes);
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

    $timeRemaining.html(
      hours + '<span class="t-unit">h</span> ' +
      minutes + '<span class="t-unit">m</span> ' +
      seconds + '<span class="t-unit">s</span>'
    );

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds <= 30) {
      $timeRemaining.addClass('warning');
    } else {
      $timeRemaining.removeClass('warning');
    }
  }

  function setupCountdown(tabIdStr, countDownDate, initialPauseState = null) {
    // Clear any existing countdown interval
    if (window.countdownInterval) {
      clearInterval(window.countdownInterval);
    }

    let isPaused = initialPauseState ? true : false;
    let pausedTimeRemaining = initialPauseState ? initialPauseState.pausedTimeRemaining : null;

    // If restoring paused state, update UI immediately
    if (isPaused && pausedTimeRemaining) {
      $pause.addClass('paused').text('Resume');
      displayTime(pausedTimeRemaining);
      $eta.text('');
    }

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
        $timeRemaining.text('EXPIRED');
        $eta.text('');
      }
    }

    // Initial update and interval
    updateCountdown();
    window.countdownInterval = setInterval(updateCountdown, 1000);

    // Update ETA only if countdown is in the future (and not paused)
    if (!isPaused && countDownDate && countDownDate > Date.now()) {
      $eta.text('Ends at ' + formatETA(countDownDate));
    } else if (!isPaused) {
      $eta.text('');
    }

    // Handle pause button
    $pause.off('click').on('click', async function() {
      isPaused = !isPaused;
      $(this).toggleClass('paused');
      $(this).text(isPaused ? 'Resume' : 'Pause');

      if (isPaused) {
        pausedTimeRemaining = countDownDate - Date.now();
      } else {
        countDownDate = Date.now() + pausedTimeRemaining;
        $eta.text('Ends at ' + formatETA(countDownDate));
      }

      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = parseInt(tabs[0].id);
        const tabKey = tabs[0].id.toString();
        const urlKey = normalizeUrlForStorage(tabs[0].url);

        if (isPaused) {
          await chrome.alarms.clear(tabKey);
          await chrome.action.setBadgeBackgroundColor({
            tabId: tabId,
            color: '#666666'
          });
          // Save pause state by normalized URL
          await chrome.storage.local.set({
            [urlKey]: {
              pausedTimeRemaining: pausedTimeRemaining,
              pausedAt: Date.now()
            }
          });
        } else {
          await chrome.alarms.create(tabKey, {
            when: countDownDate
          });
          // Clear the URL-based pause state on resume
          await chrome.storage.local.remove(urlKey);
        }
      } catch (error) {
        console.error('Error handling pause:', error);
      }
    });
  }

  // Initialization: detect current tab, existing alarm, and YouTube context
  chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
    const currentTab = tabs[0];
    const tabIdStr = currentTab.id.toString();
    const urlKey = normalizeUrlForStorage(currentTab.url);

    // Check if there's an active alarm for this tab
    chrome.alarms.get(tabIdStr, async function(alarm) {
      if (alarm) {
        $('#cancelDiv').show();
        $start.text('Update timer');
        setupCountdown(tabIdStr, alarm.scheduledTime);
        return;
      }

      // No active alarm - check for URL-based paused state
      const pauseData = await chrome.storage.local.get([urlKey]);
      const pauseState = pauseData[urlKey];

      if (pauseState && pauseState.pausedTimeRemaining) {
        // Check if pause state has expired (7 days)
        const age = Date.now() - pauseState.pausedAt;
        if (age < PAUSE_EXPIRY_MS) {
          // Valid paused timer found - show resume UI
          $('#cancelDiv').show();
          $start.text('Update timer');
          setupCountdown(tabIdStr, null, pauseState);
        } else {
          // Expired - clean it up
          await chrome.storage.local.remove(urlKey);
        }
      }
    });

    // YouTube context: show action options and maintain caption/defaults
    const isYouTube = currentTab.url && currentTab.url.includes('youtube.com/watch');
    if (isYouTube) {
      $('.action-options').show();
      $('#pauseVideo').prop('disabled', false);

      chrome.storage.local.get([tabIdStr + '_action'], function(data) {
        const savedAction = data[tabIdStr + '_action'];
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
          [tabIdStr + '_action']: this.value
        });
      });
    }

    const $autoStartOptions = $('.auto-start-options');
    const $autoStartEnabled = $('#autoStartEnabled');
    const $timerModeOptions = $('.timer-mode-options');
    const $youtubeMatchOptions = $('.youtube-match-options');
    const $youtubeMatchType = $('#youtubeMatchType');
    const $timerTargetTime = $('#timerTargetTime');

    async function saveAutoStartRule() {
      if (!$autoStartEnabled.prop('checked')) return;

      const matchType = isYouTube ? $youtubeMatchType.val() : 'exact';
      const timerMode = $('input[name="timerMode"]:checked').val();
      const ruleKey = getAutoStartRuleKey(currentTab.url, matchType);

      let action = 'close';
      if (isYouTube) {
        action = $('input[name="timerAction"]:checked').val() || 'pause';
      }

      const hoursVal = Number($hours[0].value) || 0;
      const minutesVal = Number($minutes[0].value) || 0;

      // Popup change handlers fire mid-edit with empty fields; don't persist 0h0m garbage rules.
      if (timerMode === 'duration' && (hoursVal * 60 + minutesVal) <= 0) {
        return;
      }

      const rule = buildAutoStartRule({
        url: currentTab.url,
        isYouTube,
        matchType,
        timerMode,
        action,
        hours: hoursVal,
        minutes: minutesVal,
        timeValue: $timerTargetTime.val()
      });

      try {
        await writeAutoStartRule(ruleKey, rule);
        showAutoStartStatus('');
      } catch (error) {
        console.error('Failed to save auto-start rule:', error);
        showAutoStartStatus('Could not save auto-start rule.');
      }
    }

    $autoStartOptions.show();

    if (isYouTube) {
      $youtubeMatchOptions.show();

      try {
        const matchPref = await chrome.storage.local.get(['youtube_match_preference']);
        if (matchPref.youtube_match_preference) {
          $youtubeMatchType.val(matchPref.youtube_match_preference);
        }
      } catch (error) {
        console.error('Failed to load youtube_match_preference:', error);
      }
    }

    const existingRule = await getMatchingAutoStartRule(currentTab.url);
    if (existingRule) {
      $autoStartEnabled.prop('checked', true);
      $timerModeOptions.show();

      const timerMode = existingRule.rule.timerMode || 'duration';
      $(`input[name="timerMode"][value="${timerMode}"]`).prop('checked', true);

      if (timerMode === 'duration' && existingRule.rule.duration) {
        $hours.val(existingRule.rule.duration.hours || 0);
        $minutes.val(existingRule.rule.duration.minutes || 0);
      }

      if (timerMode === 'time' && existingRule.rule.time) {
        const hour = String(existingRule.rule.time.hour).padStart(2, '0');
        const minute = String(existingRule.rule.time.minute).padStart(2, '0');
        $timerTargetTime.val(`${hour}:${minute}`);
      }

      // Rules saved before youtube_match_preference existed didn't record match type; infer from the key shape.
      if (isYouTube) {
        try {
          const matchPref = await chrome.storage.local.get(['youtube_match_preference']);
          if (!matchPref.youtube_match_preference) {
            const inferredPref = existingRule.key === 'youtube_all' ? 'all' : 'video';
            $youtubeMatchType.val(inferredPref);
          }
        } catch (error) {
          console.error('Failed to load youtube_match_preference:', error);
        }
      }
    }

    $autoStartEnabled.on('change', async function() {
      if (this.checked) {
        $timerModeOptions.show();
        await saveAutoStartRule();
      } else {
        $timerModeOptions.hide();

        const matchType = isYouTube ? $youtubeMatchType.val() : 'exact';
        const ruleKey = getAutoStartRuleKey(currentTab.url, matchType);
        try {
          await deleteAutoStartRule(ruleKey);
          showAutoStartStatus('');
        } catch (error) {
          console.error('Failed to delete auto-start rule:', error);
          showAutoStartStatus('Could not remove auto-start rule.');
        }
      }
    });

    $('input[name="timerMode"]').on('change', saveAutoStartRule);
    $timerTargetTime.on('change', saveAutoStartRule);
    $youtubeMatchType.on('change', async function() {
      await chrome.storage.local.set({ youtube_match_preference: $(this).val() });
      await saveAutoStartRule();
    });
    $hours.on('change', saveAutoStartRule);
    $minutes.on('change', saveAutoStartRule);
  });

  // Load last used alarm values and update Start enablement
  chrome.storage.local.get(['hours', 'minutes'], function(data) {
    $hours[0].value = data.hours !== undefined ? data.hours : 0;
    $minutes[0].value = data.minutes !== undefined ? data.minutes : 30;
    fixOverflowAndUnderflows();
    updateStartButtonState();
  });

  // Preset buttons functionality
  $('.preset-btn').on('click', function() {
    const minutes = $(this).data('minutes') || 0;
    const hours = $(this).data('hours') || 0;

    $hours[0].value = hours;
    $minutes[0].value = minutes;

    fixOverflowAndUnderflows();
    updateStartButtonState();
  });

  // Create/update tab countdown timer when the user sets one
  $('#startbutton').on('click', async function(e) {
    e.preventDefault();

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabIdStr = tabs[0].id.toString();
      const tabId = parseInt(tabs[0].id);
      let action = 'close';  // Default action

      // Only check radio if it's a YouTube tab
      if (tabs[0].url && tabs[0].url.includes('youtube.com/watch')) {
        action = $('input[name="timerAction"]:checked').val();
      }

      // Store the selected action with the alarm + remember last duration + track URL
      await chrome.storage.local.set({
        [tabIdStr + '_action']: action,
        [tabIdStr + '_url']: tabs[0].url,
        'hours': $hours[0].value,
        'minutes': $minutes[0].value
      });

      // Clear any existing pause state for this URL
      await chrome.storage.local.remove(normalizeUrlForStorage(tabs[0].url));

      const autoStartEnabled = $('#autoStartEnabled').prop('checked');
      if (autoStartEnabled) {
        const isYouTube = tabs[0].url && tabs[0].url.includes('youtube.com/watch');
        const matchType = isYouTube ? $('#youtubeMatchType').val() : 'exact';
        const timerMode = $('input[name="timerMode"]:checked').val();
        const ruleKey = getAutoStartRuleKey(tabs[0].url, matchType);

        const rule = buildAutoStartRule({
          url: tabs[0].url,
          isYouTube,
          matchType,
          timerMode,
          action,
          hours: $hours[0].value,
          minutes: $minutes[0].value,
          timeValue: $('#timerTargetTime').val()
        });

        try {
          await writeAutoStartRule(ruleKey, rule);
          showAutoStartStatus('');
        } catch (error) {
          console.error('Failed to save auto-start rule on start:', error);
          showAutoStartStatus('Could not save auto-start rule.');
        }
      }

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
      $('#cancelDiv').show();
      $start.text('Update timer');

      // Start/refresh countdown synced to this scheduled time
      setupCountdown(tabIdStr, scheduledTime);
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  });

  // If the user cancels the timer, clear the alarm and the badge
  $cancel.on('click', async function() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = parseInt(tabs[0].id);
      const tabKey = tabs[0].id.toString();
      const urlKey = normalizeUrlForStorage(tabs[0].url);

      await chrome.action.setBadgeText({ tabId: tabId, text: '' });
      await chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#666666' });
      await chrome.alarms.clear(tabKey);
      // Clear URL-based pause state AND URL tracking
      await chrome.storage.local.remove([urlKey, tabKey + '_url', tabKey + '_action']);

      $('#cancelDiv').hide();
      $start.text('Start timer');

      if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
      }
      $timeRemaining.text('');
      $eta.text('');
      $timeRemaining.removeClass('warning');
      $pause.removeClass('paused').text('Pause');
    } catch (error) {
      console.error('Error canceling timer:', error);
    }
  });

  // Arrow key input adjustment
  $('#hours, #minutes').on('keydown', function(e) {
    if (e.key === 'ArrowUp') {
      this.value = Number(this.value) + 1;
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      this.value = Number(this.value) - 1;
      e.preventDefault();
    }
    updateStartButtonState();
  });

  // Mousewheel input with Shift acceleration on minutes
  $('#hours, #minutes').on('wheel', function(e) {
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

  // Mousewheel input for target time (hover over hours, minutes, or AM/PM to adjust)
  $('#timerTargetTime').on('wheel', function(e) {
    e.preventDefault();
    const timeValue = this.value || '22:00';
    let [hour, minute] = timeValue.split(':').map(Number);

    const delta = (e.originalEvent.deltaY < 0) ? 1 : -1;

    // Determine which section cursor is over (hours / minutes / AM-PM / clock icon)
    const rect = this.getBoundingClientRect();
    const mouseX = e.originalEvent.clientX;
    const relativeX = (mouseX - rect.left) / rect.width;

    if (relativeX < 0.25) {
      // within same AM/PM period
      const isPM = hour >= 12;
      let hour12 = hour % 12 || 12;
      hour12 += delta;
      if (hour12 > 12) hour12 = 1;
      if (hour12 < 1) hour12 = 12;
      hour = isPM ? (hour12 % 12) + 12 : (hour12 % 12);
    } else if (relativeX < 0.50) {
      minute += delta;
      if (minute >= 60) {
        minute = 0;
      } else if (minute < 0) {
        minute = 59;
      }
    } else if (relativeX < 0.75) {
      hour = (hour + 12) % 24;
    }
    // Fourth quarter (clock icon): do nothing

    this.value = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
    $(this).trigger('change');
  });

  // Prevent non-numeric input and keep gating in sync
  $('#hours, #minutes').on('input', function() {
    this.value = this.value.replace(/[^0-9]/g, '');
    updateStartButtonState();
  });

  // Handle blur
  $('#hours, #minutes').on('blur', function() {
    fixOverflowAndUnderflows();
    updateStartButtonState();
  });
};

$(document).ready(initPopup);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initPopup };
}

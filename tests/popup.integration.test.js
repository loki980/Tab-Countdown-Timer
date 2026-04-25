// Integration-style tests that execute popup.js to improve coverage
const $ = require('../lib/jquery-3.5.1.min.js');
const { createChromeMocks } = require('./setup/chrome-mocks');

global.$ = global.jQuery = $;

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

const buildPopupDOM = () => {
  document.body.innerHTML = `
    <div class="content">
      <div class="duration-row">
        <div class="duration-input">
          <label for="hours">Hours</label>
          <input type="number" id="hours" name="hours" value="0" min="0" max="24" step="1">
        </div>
        <div class="duration-input">
          <label for="minutes">Minutes</label>
          <input type="number" id="minutes" name="minutes" value="0" min="0" max="59" step="1">
        </div>
      </div>
      <div class="preset-buttons">
        <button class="preset-btn" data-minutes="5">5m</button>
        <button class="preset-btn" data-minutes="15">15m</button>
        <button class="preset-btn" data-minutes="30">30m</button>
        <button class="preset-btn" data-hours="1">1h</button>
      </div>
      <div class="action-options" style="display: none;">
        <div class="radio-group">
          <input type="radio" id="closeTab" name="timerAction" value="close" checked>
          <label for="closeTab">Close Tab</label>
        </div>
        <div class="radio-group">
          <input type="radio" id="pauseVideo" name="timerAction" value="pause" disabled>
          <label for="pauseVideo">Pause Video</label>
        </div>
      </div>
      <fieldset class="auto-start-options" style="display: none;">
        <p class="fieldset-title">Auto-start timer</p>
        <div class="checkbox-group">
          <input type="checkbox" id="autoStartEnabled" name="autoStartEnabled">
          <label for="autoStartEnabled">Start timer when I visit this URL</label>
        </div>
        <div class="timer-mode-options" style="display: none;">
          <div class="radio-group">
            <input type="radio" id="timerModeDuration" name="timerMode" value="duration" checked>
            <label for="timerModeDuration">Use duration above</label>
          </div>
          <div class="radio-group">
            <input type="radio" id="timerModeTime" name="timerMode" value="time">
            <label for="timerModeTime">Close/pause at:</label>
            <input type="time" id="timerTargetTime" value="22:00" style="margin-left: 8px;">
          </div>
        </div>
        <div class="youtube-match-options" style="display: none;">
          <label for="youtubeMatchType">Apply to:</label>
          <select id="youtubeMatchType" name="youtubeMatchType">
            <option value="video">This exact video</option>
            <option value="all">All YouTube videos</option>
          </select>
        </div>
      </fieldset>
      <button id="startbutton" class="button">Start timer</button>
      <div id="cancelDiv" style="display: none;">
        <button id="cancelbutton" class="button">Cancel</button>
        <button id="pausebutton" class="button">Pause</button>
        <p id="timeRemaining"></p>
        <p id="eta"></p>
      </div>
    </div>
  `;
};

const loadPopup = async({
  tabId = 987,
  url = 'https://example.com',
  alarm = null,
  storedHours = 0,
  storedMinutes = 0,
  storedAction
} = {}) => {
  jest.resetModules();
  buildPopupDOM();
  global.chrome = createChromeMocks();

  const tab = { id: tabId, url };
  chrome.tabs.query.mockImplementation((_query, callback) => {
    if (callback) callback([tab]);
    return Promise.resolve([tab]);
  });

  chrome.alarms.get.mockImplementation((_id, callback) => {
    if (callback) callback(alarm);
    return Promise.resolve(alarm);
  });

  const persisted = {};
  chrome.storage.local.get.mockImplementation((keys, callback) => {
    const arr = Array.isArray(keys) ? keys : [keys];
    const result = {};
    arr.forEach(key => {
      if (key === 'hours') {
        result[key] = storedHours;
      } else if (key === 'minutes') {
        result[key] = storedMinutes;
      } else if (key === `${tabId}_action` && storedAction !== undefined) {
        result[key] = storedAction;
      }
    });
    if (callback) callback(result);
    return Promise.resolve(result);
  });

  chrome.storage.local.set.mockImplementation((items, callback) => {
    Object.assign(persisted, items);
    if (callback) callback();
    return Promise.resolve();
  });

  chrome.storage.local.remove = jest.fn((keys, callback) => {
    const keysArr = Array.isArray(keys) ? keys : [keys];
    keysArr.forEach(key => delete persisted[key]);
    if (callback) callback();
    return Promise.resolve();
  });

  delete require.cache[require.resolve('../background/background.js')];
  delete require.cache[require.resolve('../popup/popup.js')];
  const popupModule = require('../popup/popup.js');
  popupModule.initPopup();
  await flushPromises();

  return {
    tab,
    getPersisted: () => ({ ...persisted })
  };
};

describe('popup.js integration coverage', () => {
  afterEach(() => {
    if (window.countdownInterval) {
      clearInterval(window.countdownInterval);
      delete window.countdownInterval;
    }
    document.body.innerHTML = '';
  });

  test('disables the start button until a positive duration exists', async() => {
    await loadPopup({ storedMinutes: 0 });
    expect(chrome.tabs.query).toHaveBeenCalled();
    const $start = $('#startbutton');
    expect($start.prop('disabled')).toBe(true);

    $('#minutes').val('10').trigger('input');
    expect($start.prop('disabled')).toBe(false);
  });

  test('blur event enforces the 24 hour cap by zeroing minutes', async() => {
    await loadPopup();
    $('#hours').val('24');
    $('#minutes').val('45');
    $('#minutes').triggerHandler('blur');

    expect($('#minutes').val()).toBe('0');
  });

  test('clicking start stores duration, schedules an alarm, and reveals cancel UI', async() => {
    const { tab, getPersisted } = await loadPopup({ storedMinutes: 0 });
    $('#minutes').val('1').trigger('input');
    expect($('#startbutton').prop('disabled')).toBe(false);
    const initialTabQueryCalls = chrome.tabs.query.mock.calls.length;

    $('#startbutton').trigger('click');
    await flushPromises();

    expect(chrome.tabs.query.mock.calls.length).toBeGreaterThan(initialTabQueryCalls);
    expect(chrome.storage.local.set).toHaveBeenCalled();
    const saved = getPersisted();
    expect(saved[`${tab.id}_action`]).toBe('close');
    expect(saved.hours).toBe('0');
    expect(saved.minutes).toBe('1');
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      tabId: tab.id,
      color: '#666666'
    });
    expect(chrome.alarms.create).toHaveBeenCalledWith(
      tab.id.toString(),
      expect.objectContaining({ when: expect.any(Number) })
    );
    expect($('#cancelDiv').css('display')).toBe('block');
    expect($('#startbutton').text()).toBe('Update timer');
  });

  test('pause button toggles the countdown and updates chrome alarms', async() => {
    const tabId = 4321;
    const alarmTime = Date.now() + 60000;
    await loadPopup({ tabId, alarm: { scheduledTime: alarmTime } });

    const $pause = $('#pausebutton');
    $pause.trigger('click');
    await flushPromises();

    expect($pause.text()).toBe('Resume');
    expect(chrome.alarms.clear).toHaveBeenCalledWith(tabId.toString());

    $pause.trigger('click');
    await flushPromises();

    expect($pause.text()).toBe('Pause');
    expect(chrome.alarms.create).toHaveBeenCalledWith(
      tabId.toString(),
      expect.objectContaining({ when: expect.any(Number) })
    );
  });

  test('cancel button clears the countdown state and badge text', async() => {
    const tabId = 654321;
    await loadPopup({ tabId, alarm: { scheduledTime: Date.now() + 120000 } });

    $('#cancelbutton').trigger('click');
    await flushPromises();

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId, text: '' });
    expect(chrome.alarms.clear).toHaveBeenCalledWith(tabId.toString());
    expect($('#cancelDiv').css('display')).toBe('none');
    expect($('#timeRemaining').text()).toBe('');
    expect($('#eta').text()).toBe('');
    expect($('#pausebutton').text()).toBe('Pause');
  });

  test('blur fixes negative inputs, borrows hours, and caps overflow', async() => {
    await loadPopup();

    $('#hours').val('1');
    $('#minutes').val('-30').triggerHandler('blur');
    expect($('#hours').val()).toBe('0');
    expect($('#minutes').val()).toBe('30');

    $('#hours').val('0');
    $('#minutes').val('-5').triggerHandler('blur');
    expect($('#minutes').val()).toBe('0');

    $('#hours').val('0');
    $('#minutes').val('125').triggerHandler('blur');
    expect($('#hours').val()).toBe('2');
    expect($('#minutes').val()).toBe('5');
  });

  test('setupCountdown clears prior interval and warns about imminent expiry', async() => {
    const clearSpy = jest.spyOn(global, 'clearInterval');

    window.countdownInterval = setInterval(() => {}, 1000);
    const existingInterval = window.countdownInterval;

    await loadPopup({ alarm: { scheduledTime: Date.now() + 20000 } });

    expect(clearSpy).toHaveBeenCalledWith(existingInterval);
    expect($('#timeRemaining').hasClass('warning')).toBe(true);

    clearInterval(existingInterval);
    clearInterval(window.countdownInterval);
    clearSpy.mockRestore();
  });

  test('expired countdown displays EXPIRED message immediately', async() => {
    await loadPopup({ alarm: { scheduledTime: Date.now() - 5000 } });
    expect($('#timeRemaining').text()).toBe('EXPIRED');
    expect($('#eta').text()).toBe('');
  });

  test('a fresh 5-minute alarm renders as "5m 0s", not "4m 59s" or "5m 1s"', async() => {
    await loadPopup({ alarm: { scheduledTime: Date.now() + 5 * 60 * 1000 } });
    expect($('#timeRemaining').text()).toBe('0h 5m 0s');
  });

  test('displayTime ceils sub-second remainders so 4.5s renders as 5s', async() => {
    await loadPopup({ alarm: { scheduledTime: Date.now() + 4500 } });
    expect($('#timeRemaining').text()).toBe('0h 0m 5s');
  });

  test('countdown samples sub-second so display can\'t stick or skip', async() => {
    const setSpy = jest.spyOn(global, 'setInterval');
    await loadPopup({ alarm: { scheduledTime: Date.now() + 60000 } });
    const countdownCalls = setSpy.mock.calls.filter(
      ([, delay]) => delay !== 1000 // jest internal intervals run at 1s; ignore those
    );
    expect(countdownCalls.length).toBeGreaterThan(0);
    expect(countdownCalls.every(([, delay]) => delay <= 250)).toBe(true);
    setSpy.mockRestore();
  });

  test('YouTube tabs reveal action options, default to pause, and persist selection', async() => {
    const { tab } = await loadPopup({
      url: 'https://www.youtube.com/watch?v=abc123'
    });

    expect($('.action-options').css('display')).toBe('block');
    expect($('#pauseVideo').prop('disabled')).toBe(false);
    expect($('input[name="timerAction"]:checked').val()).toBe('pause');

    $('input[name="timerAction"][value="close"]')
      .prop('checked', true)
      .trigger('change');

    expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
      [`${tab.id}_action`]: 'close'
    });
  });

  test('YouTube tabs restore a previously saved action', async() => {
    await loadPopup({
      url: 'https://www.youtube.com/watch?v=xyz',
      storedAction: 'close'
    });

    expect($('input[name="timerAction"]:checked').val()).toBe('close');
  });

  test('start button stores the selected YouTube action', async() => {
    const { tab, getPersisted } = await loadPopup({
      url: 'https://www.youtube.com/watch?v=timer',
      storedMinutes: 0
    });

    $('#minutes').val('2').trigger('input');
    $('input[name="timerAction"][value="pause"]').prop('checked', true);

    $('#startbutton').trigger('click');
    await flushPromises();

    const saved = getPersisted();
    expect(saved[`${tab.id}_action`]).toBe('pause');
  });

  test('preset buttons update hours/minutes even when dataset fields are missing', async() => {
    await loadPopup();

    $('.preset-btn[data-minutes="15"]').trigger('click');
    expect($('#minutes').val()).toBe('15');
    expect($('#hours').val()).toBe('0');

    $('.preset-btn[data-hours="1"]').trigger('click');
    expect($('#hours').val()).toBe('1');
    expect($('#minutes').val()).toBe('0');
  });

  test('keyboard and wheel interactions adjust inputs with proper modifiers', async() => {
    await loadPopup();

    const minutesInput = document.getElementById('minutes');
    minutesInput.value = '1';

    const arrowUpEvent = $.Event('keydown', { key: 'ArrowUp' });
    $('#minutes').trigger(arrowUpEvent);
    expect(minutesInput.value).toBe('2');
    expect(arrowUpEvent.isDefaultPrevented()).toBe(true);

    const arrowDownEvent = $.Event('keydown', { key: 'ArrowDown' });
    $('#minutes').trigger(arrowDownEvent);
    expect(minutesInput.value).toBe('1');
    expect(arrowDownEvent.isDefaultPrevented()).toBe(true);

    minutesInput.value = '0';
    const wheelMinutes = $.Event('wheel');
    wheelMinutes.originalEvent = { deltaY: -1, preventDefault: jest.fn() };
    wheelMinutes.shiftKey = true;
    $('#minutes').trigger(wheelMinutes);
    expect(minutesInput.value).toBe('5');
    expect(wheelMinutes.isDefaultPrevented()).toBe(true);

    const hoursInput = document.getElementById('hours');
    hoursInput.value = '1';
    const wheelHours = $.Event('wheel');
    wheelHours.originalEvent = { deltaY: 5, preventDefault: jest.fn() };
    $('#hours').trigger(wheelHours);
    expect(hoursInput.value).toBe('0');
  });

  test('start button logs error when Chrome API fails', async() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await loadPopup({ storedMinutes: 5 });

    // Make tabs.query throw an error
    chrome.tabs.query.mockImplementation(() => {
      throw new Error('Query failed');
    });

    $('#startbutton').trigger('click');
    await flushPromises();

    expect(consoleSpy).toHaveBeenCalledWith('Error starting timer:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('cancel button logs error when Chrome API fails', async() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await loadPopup({ alarm: { scheduledTime: Date.now() + 60000 } });

    // Make tabs.query throw an error
    chrome.tabs.query.mockImplementation(() => {
      throw new Error('Query failed');
    });

    $('#cancelbutton').trigger('click');
    await flushPromises();

    expect(consoleSpy).toHaveBeenCalledWith('Error canceling timer:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('pause button logs error when Chrome API fails', async() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await loadPopup({ alarm: { scheduledTime: Date.now() + 60000 } });

    // Make tabs.query throw an error on subsequent calls
    chrome.tabs.query.mockImplementation(() => {
      throw new Error('Query failed');
    });

    $('#pausebutton').trigger('click');
    await flushPromises();

    expect(consoleSpy).toHaveBeenCalledWith('Error handling pause:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('paused countdown displays the paused time remaining', async() => {
    const tabId = 5555;
    await loadPopup({ tabId, alarm: { scheduledTime: Date.now() + 120000 } });

    // First click to pause
    $('#pausebutton').trigger('click');
    await flushPromises();

    expect($('#pausebutton').text()).toBe('Resume');
    // The displayTime function should still show the paused time
    expect($('#timeRemaining').text()).toMatch(/\d+h \d+m \d+s/);
  });

  test('restores paused timer from URL-based storage', async() => {
    const tabId = 7777;
    const testUrl = 'https://example.com/page';
    const urlKey = 'paused_' + encodeURIComponent(testUrl);

    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: tabId, url: testUrl };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    // No active alarm
    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    // Return paused state from storage
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === urlKey) {
          result[key] = {
            pausedTimeRemaining: 60000, // 1 minute remaining
            pausedAt: Date.now() - 1000 // Paused 1 second ago (not expired)
          };
        }
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    chrome.storage.local.remove = jest.fn((keys, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    const popupModule = require('../popup/popup.js');
    popupModule.initPopup();
    await flushPromises();
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should show cancel UI and Resume button
    expect($('#cancelDiv').css('display')).toBe('block');
    expect($('#pausebutton').text()).toBe('Resume');
    expect($('#startbutton').text()).toBe('Update timer');
  });

  test('clears expired paused timer from URL-based storage', async() => {
    const tabId = 8888;
    const testUrl = 'https://example.com/expired';
    const urlKey = 'paused_' + encodeURIComponent(testUrl);

    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: tabId, url: testUrl };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    // Return expired pause state (8 days old)
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === urlKey) {
          result[key] = {
            pausedTimeRemaining: 60000,
            pausedAt: Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 days ago (expired)
          };
        }
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.remove = jest.fn((keys, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    const popupModule = require('../popup/popup.js');
    popupModule.initPopup();
    await flushPromises();
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should have removed the expired pause state
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(urlKey);
    // Cancel div should be hidden (no timer active)
    expect($('#cancelDiv').css('display')).toBe('none');
  });

  test('setupCountdown with initial pause state sets UI correctly', async() => {
    const tabId = 9999;
    const testUrl = 'https://example.com/paused';
    const urlKey = 'paused_' + encodeURIComponent(testUrl);

    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: tabId, url: testUrl };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    // Return valid pause state
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === urlKey) {
          result[key] = {
            pausedTimeRemaining: 120000, // 2 minutes
            pausedAt: Date.now() - 5000 // 5 seconds ago
          };
        }
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    chrome.storage.local.remove = jest.fn((keys, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    const popupModule = require('../popup/popup.js');
    popupModule.initPopup();
    await flushPromises();
    await new Promise(resolve => setTimeout(resolve, 150));

    // Verify the paused UI state
    expect($('#pausebutton').hasClass('paused')).toBe(true);
    expect($('#pausebutton').text()).toBe('Resume');
    expect($('#eta').text()).toBe('');
    // Time remaining should be displayed
    expect($('#timeRemaining').text()).toMatch(/\d+h \d+m \d+s/);
  });

  test('auto-start options are shown for all tabs', async() => {
    await loadPopup({ url: 'https://example.com' });
    expect($('.auto-start-options').css('display')).not.toBe('none');
  });

  test('YouTube-specific options appear on YouTube tabs', async() => {
    await loadPopup({ url: 'https://www.youtube.com/watch?v=abc123' });
    expect($('.youtube-match-options').css('display')).not.toBe('none');
  });

  test('checking auto-start checkbox shows timer mode options and saves rule', async() => {
    const savedRules = {};
    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 111, url: 'https://example.com/page' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = savedRules;
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      if (items.autostart_rules) Object.assign(savedRules, items.autostart_rules);
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    // Check the checkbox
    $('#autoStartEnabled').prop('checked', true).trigger('change');
    await flushPromises();

    expect($('.timer-mode-options').css('display')).not.toBe('none');
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  test('unchecking auto-start checkbox removes the rule', async() => {
    const ruleKey = 'url_' + encodeURIComponent('https://example.com/page');
    const savedRules = { [ruleKey]: { type: 'exact_url', timerMode: 'duration' } };

    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 222, url: 'https://example.com/page' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = { ...savedRules };
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      if (items.autostart_rules) {
        Object.keys(savedRules).forEach(k => delete savedRules[k]);
        Object.assign(savedRules, items.autostart_rules);
      }
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    // Checkbox should be checked due to existing rule
    expect($('#autoStartEnabled').prop('checked')).toBe(true);

    // Uncheck the checkbox
    $('#autoStartEnabled').prop('checked', false).trigger('change');
    await flushPromises();

    expect($('.timer-mode-options').css('display')).toBe('none');
    expect(savedRules[ruleKey]).toBeUndefined();
  });

  test('existing auto-start rule pre-fills UI with time mode settings', async() => {
    const ruleKey = 'url_' + encodeURIComponent('https://example.com/timed');
    const savedRules = {
      [ruleKey]: {
        type: 'exact_url',
        timerMode: 'time',
        time: { hour: 21, minute: 30 },
        action: 'close'
      }
    };

    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 333, url: 'https://example.com/timed' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = savedRules;
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    expect($('#autoStartEnabled').prop('checked')).toBe(true);
    expect($('#timerModeTime').prop('checked')).toBe(true);
    expect($('#timerTargetTime').val()).toBe('21:30');
  });

  test('YouTube all videos rule is matched correctly', async() => {
    const savedRules = {
      'youtube_all': {
        type: 'youtube_all',
        timerMode: 'duration',
        duration: { hours: 1, minutes: 0 },
        action: 'pause'
      }
    };

    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 444, url: 'https://www.youtube.com/watch?v=newvideo123' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = savedRules;
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    expect($('#autoStartEnabled').prop('checked')).toBe(true);
    expect($('#youtubeMatchType').val()).toBe('all');
    expect($('#hours').val()).toBe('1');
  });

  test('timer mode change saves the rule', async() => {
    const savedRules = {};
    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 555, url: 'https://example.com/mode' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = { ...savedRules };
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      if (items.autostart_rules) Object.assign(savedRules, items.autostart_rules);
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    // Enable auto-start
    $('#autoStartEnabled').prop('checked', true).trigger('change');
    await flushPromises();

    // Change to time mode
    $('#timerModeTime').prop('checked', true).trigger('change');
    await flushPromises();

    const ruleKey = 'url_' + encodeURIComponent('https://example.com/mode');
    expect(savedRules[ruleKey]).toBeDefined();
    expect(savedRules[ruleKey].timerMode).toBe('time');
  });

  test('target time change saves the rule', async() => {
    const savedRules = {};
    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 666, url: 'https://example.com/time' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = { ...savedRules };
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      if (items.autostart_rules) Object.assign(savedRules, items.autostart_rules);
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    // Enable auto-start and set to time mode
    $('#autoStartEnabled').prop('checked', true).trigger('change');
    await flushPromises();
    $('#timerModeTime').prop('checked', true).trigger('change');
    await flushPromises();

    // Change the target time
    $('#timerTargetTime').val('23:45').trigger('change');
    await flushPromises();

    const ruleKey = 'url_' + encodeURIComponent('https://example.com/time');
    expect(savedRules[ruleKey].time).toEqual({ hour: 23, minute: 45 });
  });

  test('time picker wheel scrolling adjusts hours in first quarter', async() => {
    await loadPopup();

    const timeInput = document.getElementById('timerTargetTime');
    timeInput.value = '14:30';

    // Mock getBoundingClientRect
    timeInput.getBoundingClientRect = () => ({ left: 0, width: 100 });

    // Scroll up in the first quarter (hours section)
    const wheelEvent = $.Event('wheel');
    wheelEvent.originalEvent = {
      deltaY: -1,
      clientX: 10, // 10% from left = first quarter
      preventDefault: jest.fn()
    };

    $('#timerTargetTime').trigger(wheelEvent);
    expect(timeInput.value).toBe('15:30');
  });

  test('time picker wheel scrolling adjusts minutes in second quarter', async() => {
    await loadPopup();

    const timeInput = document.getElementById('timerTargetTime');
    timeInput.value = '14:30';

    timeInput.getBoundingClientRect = () => ({ left: 0, width: 100 });

    // Scroll down in the second quarter (minutes section)
    const wheelEvent = $.Event('wheel');
    wheelEvent.originalEvent = {
      deltaY: 1,
      clientX: 35, // 35% from left = second quarter
      preventDefault: jest.fn()
    };

    $('#timerTargetTime').trigger(wheelEvent);
    expect(timeInput.value).toBe('14:29');
  });

  test('time picker wheel scrolling toggles AM/PM in third quarter', async() => {
    await loadPopup();

    const timeInput = document.getElementById('timerTargetTime');
    timeInput.value = '14:30'; // 2:30 PM

    timeInput.getBoundingClientRect = () => ({ left: 0, width: 100 });

    // Scroll in the third quarter (AM/PM section)
    const wheelEvent = $.Event('wheel');
    wheelEvent.originalEvent = {
      deltaY: 1,
      clientX: 60, // 60% from left = third quarter
      preventDefault: jest.fn()
    };

    $('#timerTargetTime').trigger(wheelEvent);
    expect(timeInput.value).toBe('02:30'); // Toggled to AM
  });

  test('time picker wheel scrolling does nothing in fourth quarter (clock icon)', async() => {
    await loadPopup();

    const timeInput = document.getElementById('timerTargetTime');
    timeInput.value = '14:30';

    timeInput.getBoundingClientRect = () => ({ left: 0, width: 100 });

    // Scroll in the fourth quarter (clock icon)
    const wheelEvent = $.Event('wheel');
    wheelEvent.originalEvent = {
      deltaY: 1,
      clientX: 85, // 85% from left = fourth quarter
      preventDefault: jest.fn()
    };

    $('#timerTargetTime').trigger(wheelEvent);
    expect(timeInput.value).toBe('14:30'); // Unchanged
  });

  test('time picker minute scrolling wraps from 59 to 0', async() => {
    await loadPopup();

    const timeInput = document.getElementById('timerTargetTime');
    timeInput.value = '14:59';

    timeInput.getBoundingClientRect = () => ({ left: 0, width: 100 });

    const wheelEvent = $.Event('wheel');
    wheelEvent.originalEvent = {
      deltaY: -1, // scroll up
      clientX: 35,
      preventDefault: jest.fn()
    };

    $('#timerTargetTime').trigger(wheelEvent);
    expect(timeInput.value).toBe('14:00');
  });

  test('time picker minute scrolling wraps from 0 to 59', async() => {
    await loadPopup();

    const timeInput = document.getElementById('timerTargetTime');
    timeInput.value = '14:00';

    timeInput.getBoundingClientRect = () => ({ left: 0, width: 100 });

    const wheelEvent = $.Event('wheel');
    wheelEvent.originalEvent = {
      deltaY: 1, // scroll down
      clientX: 35,
      preventDefault: jest.fn()
    };

    $('#timerTargetTime').trigger(wheelEvent);
    expect(timeInput.value).toBe('14:59');
  });

  test('time picker hour scrolling wraps within AM/PM period', async() => {
    await loadPopup();

    const timeInput = document.getElementById('timerTargetTime');
    timeInput.value = '12:30'; // 12 PM

    timeInput.getBoundingClientRect = () => ({ left: 0, width: 100 });

    const wheelEvent = $.Event('wheel');
    wheelEvent.originalEvent = {
      deltaY: -1, // scroll up
      clientX: 10,
      preventDefault: jest.fn()
    };

    $('#timerTargetTime').trigger(wheelEvent);
    expect(timeInput.value).toBe('13:30'); // 1 PM
  });

  test('existing rule with duration mode pre-fills hours and minutes', async() => {
    const ruleKey = 'url_' + encodeURIComponent('https://example.com/duration');
    const savedRules = {
      [ruleKey]: {
        type: 'exact_url',
        timerMode: 'duration',
        duration: { hours: 2, minutes: 15 },
        action: 'close'
      }
    };

    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 777, url: 'https://example.com/duration' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = savedRules;
        if (key === 'hours') result[key] = 0;
        if (key === 'minutes') result[key] = 30;
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    expect($('#autoStartEnabled').prop('checked')).toBe(true);
    expect($('#timerModeDuration').prop('checked')).toBe(true);
    expect($('#hours').val()).toBe('2');
    expect($('#minutes').val()).toBe('15');
  });

  test('start button saves auto-start rule when checkbox is checked', async() => {
    const savedRules = {};
    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 1001, url: 'https://example.com/startbtn' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = { ...savedRules };
        if (key === 'hours') result[key] = 0;
        if (key === 'minutes') result[key] = 15;
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      if (items.autostart_rules) Object.assign(savedRules, items.autostart_rules);
      if (callback) callback();
      return Promise.resolve();
    });

    chrome.storage.local.remove = jest.fn((keys, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    // Enable auto-start checkbox
    $('#autoStartEnabled').prop('checked', true).trigger('change');
    await flushPromises();

    // Click start button
    $('#startbutton').trigger('click');
    await flushPromises();

    const ruleKey = 'url_' + encodeURIComponent('https://example.com/startbtn');
    expect(savedRules[ruleKey]).toBeDefined();
    expect(savedRules[ruleKey].timerMode).toBe('duration');
    expect(savedRules[ruleKey].url).toBe('https://example.com/startbtn');
  });

  test('start button saves YouTube video auto-start rule with video ID', async() => {
    const savedRules = {};
    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 1002, url: 'https://www.youtube.com/watch?v=testvid123' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = { ...savedRules };
        if (key === 'hours') result[key] = 0;
        if (key === 'minutes') result[key] = 10;
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      if (items.autostart_rules) Object.assign(savedRules, items.autostart_rules);
      if (callback) callback();
      return Promise.resolve();
    });

    chrome.storage.local.remove = jest.fn((keys, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    // Enable auto-start checkbox (should default to "This exact video")
    $('#autoStartEnabled').prop('checked', true).trigger('change');
    await flushPromises();

    // Click start button
    $('#startbutton').trigger('click');
    await flushPromises();

    const ruleKey = 'youtube_testvid123';
    expect(savedRules[ruleKey]).toBeDefined();
    expect(savedRules[ruleKey].type).toBe('youtube_video');
    expect(savedRules[ruleKey].videoId).toBe('testvid123');
  });

  test('start button saves YouTube all videos auto-start rule', async() => {
    const savedRules = {};
    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 1003, url: 'https://www.youtube.com/watch?v=anothervid' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = { ...savedRules };
        if (key === 'hours') result[key] = 0;
        if (key === 'minutes') result[key] = 5;
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      if (items.autostart_rules) Object.assign(savedRules, items.autostart_rules);
      if (callback) callback();
      return Promise.resolve();
    });

    chrome.storage.local.remove = jest.fn((keys, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    // Enable auto-start and select "All YouTube videos"
    $('#autoStartEnabled').prop('checked', true).trigger('change');
    await flushPromises();
    $('#youtubeMatchType').val('all').trigger('change');
    await flushPromises();

    // Click start button
    $('#startbutton').trigger('click');
    await flushPromises();

    expect(savedRules['youtube_all']).toBeDefined();
    expect(savedRules['youtube_all'].type).toBe('youtube_all');
  });

  test('start button saves auto-start rule with time mode', async() => {
    const savedRules = {};
    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 1004, url: 'https://example.com/timebtn' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = { ...savedRules };
        if (key === 'hours') result[key] = 0;
        if (key === 'minutes') result[key] = 30;
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      if (items.autostart_rules) Object.assign(savedRules, items.autostart_rules);
      if (callback) callback();
      return Promise.resolve();
    });

    chrome.storage.local.remove = jest.fn((keys, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    // Enable auto-start and select time mode
    $('#autoStartEnabled').prop('checked', true).trigger('change');
    await flushPromises();
    $('#timerModeTime').prop('checked', true).trigger('change');
    await flushPromises();
    $('#timerTargetTime').val('20:15').trigger('change');
    await flushPromises();

    // Click start button
    $('#startbutton').trigger('click');
    await flushPromises();

    const ruleKey = 'url_' + encodeURIComponent('https://example.com/timebtn');
    expect(savedRules[ruleKey]).toBeDefined();
    expect(savedRules[ruleKey].timerMode).toBe('time');
    expect(savedRules[ruleKey].time).toEqual({ hour: 20, minute: 15 });
  });

  test('YouTube specific video rule takes precedence over all videos rule', async() => {
    const savedRules = {
      'youtube_all': {
        type: 'youtube_all',
        timerMode: 'duration',
        duration: { hours: 2, minutes: 0 },
        action: 'pause'
      },
      'youtube_specificVid': {
        type: 'youtube_video',
        videoId: 'specificVid',
        timerMode: 'time',
        time: { hour: 22, minute: 0 },
        action: 'pause'
      }
    };

    jest.resetModules();
    buildPopupDOM();
    global.chrome = createChromeMocks();

    const tab = { id: 888, url: 'https://www.youtube.com/watch?v=specificVid' };
    chrome.tabs.query.mockImplementation((_query, callback) => {
      if (callback) callback([tab]);
      return Promise.resolve([tab]);
    });

    chrome.alarms.get.mockImplementation((_id, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      const keysArr = Array.isArray(keys) ? keys : [keys];
      keysArr.forEach(key => {
        if (key === 'autostart_rules') result[key] = savedRules;
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    delete require.cache[require.resolve('../background/background.js')];
    delete require.cache[require.resolve('../popup/popup.js')];
    require('../popup/popup.js').initPopup();
    await flushPromises();

    // Should use the specific video rule, not the all videos rule
    expect($('#autoStartEnabled').prop('checked')).toBe(true);
    expect($('#timerModeTime').prop('checked')).toBe(true);
    expect($('#youtubeMatchType').val()).toBe('video');
  });
});

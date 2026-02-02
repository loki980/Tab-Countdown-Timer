// Integration-style tests that execute popup.js to improve coverage
const $ = require('../lib/jquery-3.5.1.min.js');
const { createChromeMocks } = require('./setup/chrome-mocks');

global.$ = global.jQuery = $;

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

const buildPopupDOM = () => {
  document.body.innerHTML = `
    <div class="content">
      <div class="input-group">
        <label for="hours">Hours</label>
        <input type="number" id="hours" name="hours" value="0" min="0" max="24" step="1">
      </div>
      <div class="input-group">
        <label for="minutes">Minutes</label>
        <input type="number" id="minutes" name="minutes" value="0" min="0" max="59" step="1">
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
});

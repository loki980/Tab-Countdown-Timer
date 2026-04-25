const $ = require('../lib/jquery-3.5.1.min.js');
const { createChromeMocks } = require('./setup/chrome-mocks');

global.$ = global.jQuery = $;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const renderPopupDom = () => {
  document.body.innerHTML = `
    <div class="content">
      <div class="duration-row">
        <div class="duration-input">
          <label for="hours">Hours</label>
          <input type="number" id="hours" name="hours" value="0" min="0" max="24" step="1">
        </div>
        <div class="duration-input">
          <label for="minutes">Minutes</label>
          <input type="number" id="minutes" name="minutes" value="30" min="0" step="1">
        </div>
      </div>
      <div class="preset-buttons">
        <button class="preset-btn" data-minutes="5">5m</button>
        <button class="preset-btn" data-minutes="15">15m</button>
        <button class="preset-btn" data-minutes="30">30m</button>
        <button class="preset-btn" data-hours="1">1h</button>
      </div>
      <fieldset class="action-options" style="display: none;">
        <input type="radio" id="closeTab" name="timerAction" value="close" checked>
        <label for="closeTab">Close Tab</label>
        <input type="radio" id="pauseVideo" name="timerAction" value="pause" disabled>
        <label for="pauseVideo">Pause Video</label>
      </fieldset>
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

describe('Popup integration behavior', () => {
  let chromeMocks;
  let storageState;

  const mountPopup = async(tabOverride = { id: 101, url: 'https://example.com' }) => {
    jest.resetModules();
    storageState = { hours: 0, minutes: 30 };
    chromeMocks = createChromeMocks();

    chromeMocks.tabs.query = jest.fn((_query, callback) => {
      const tabs = [tabOverride];
      if (callback) callback(tabs);
      return Promise.resolve(tabs);
    });

    chromeMocks.alarms.get = jest.fn((_name, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    });

    chromeMocks.storage.local.get = jest.fn((keys, callback) => {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      const result = {};
      keyArray.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(storageState, key)) {
          result[key] = storageState[key];
        }
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    });

    chromeMocks.storage.local.set = jest.fn((items, callback) => {
      storageState = { ...storageState, ...items };
      if (callback) callback();
      return Promise.resolve();
    });

    chromeMocks.action.setBadgeBackgroundColor = jest.fn(() => Promise.resolve());
    chromeMocks.action.setBadgeText = jest.fn((_options, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
    chromeMocks.alarms.create = jest.fn(() => Promise.resolve());
    chromeMocks.alarms.clear = jest.fn(() => Promise.resolve(true));

    global.chrome = chromeMocks;
    renderPopupDom();

    const popupModule = require('../popup/popup.js');
    popupModule.initPopup();
    await flushPromises();
  };

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('start button enables when duration is set and creates an alarm', async() => {
    await mountPopup();

    const $start = $('#startbutton');
    $('#minutes').val('0').trigger('input');
    await flushPromises();
    expect($start.prop('disabled')).toBe(true);

    $('#minutes').val('5').trigger('input');
    await flushPromises();
    expect($start.prop('disabled')).toBe(false);

    $start.trigger('click');
    await flushPromises();

    expect(chromeMocks.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({ hours: '0', minutes: '5' }));
    expect(chromeMocks.alarms.create).toHaveBeenCalled();
    expect($('#cancelDiv').css('display')).toBe('block');
  });

  test('YouTube tabs expose action options and persist radio selection', async() => {
    const youtubeTab = { id: 303, url: 'https://www.youtube.com/watch?v=abc' };
    await mountPopup(youtubeTab);

    expect($('.action-options').css('display')).toBe('block');
    expect($('#pauseVideo').prop('disabled')).toBe(false);
    expect($('input[name="timerAction"][value="pause"]').prop('checked')).toBe(true);

    const closeRadio = $('input[name="timerAction"][value="close"]');
    closeRadio.prop('checked', true).trigger('change');
    await flushPromises();

    expect(chromeMocks.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({ [`${youtubeTab.id}_action`]: 'close' }));
  });

  test('cancel button clears the alarm and UI state', async() => {
    await mountPopup();

    $('#minutes').val('10').trigger('input');
    await flushPromises();
    $('#startbutton').trigger('click');
    await flushPromises();

    $('#cancelbutton').trigger('click');
    await flushPromises();

    expect(chromeMocks.alarms.clear).toHaveBeenCalled();
    expect(chromeMocks.action.setBadgeText).toHaveBeenCalledWith(expect.objectContaining({ text: '' }));
    expect($('#timeRemaining').text()).toBe('');
    expect($('#cancelDiv').css('display')).toBe('none');
  });

  test('pause button toggles the timer alarm state', async() => {
    await mountPopup({ id: 808, url: 'https://youtube.com/watch?v=pause' });

    $('#minutes').val('2').trigger('input');
    await flushPromises();
    $('#startbutton').trigger('click');
    await flushPromises();

    $('#pausebutton').trigger('click');
    await flushPromises();
    expect(chromeMocks.alarms.clear).toHaveBeenCalled();
    expect($('#pausebutton').text()).toBe('Resume');

    $('#pausebutton').trigger('click');
    await flushPromises();
    expect(chromeMocks.alarms.create).toHaveBeenCalledTimes(2);
    expect($('#pausebutton').text()).toBe('Pause');
  });
});

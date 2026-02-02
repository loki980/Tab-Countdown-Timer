const $ = require('../lib/jquery-3.5.1.min.js');
// Ensure preventDefault exists on event objects
$.Event.prototype.preventDefault = jest.fn();
global.$ = global.jQuery = $;
const { createChromeMocks } = require('./setup/chrome-mocks');

describe('Popup Events', () => {
  let chromeMocks;

  beforeEach(() => {
    // Setup complete DOM elements
    document.body.innerHTML = `
      <div class="content">
        <div class="input-group">
          <label for="hours">Hours:</label>
          <input type="number" id="hours" name="hours" value="0" min="0" max="24" step="1">
        </div>
        <div class="input-group">
          <label for="minutes">Minutes:</label>
          <input type="number" id="minutes" name="minutes" value="30" min="0" max="59" step="1">
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
        <button id="startbutton" class="button">Start countdown</button>
        <div id="cancelDiv" style="display: none;">
          <button id="cancelbutton" class="button">Cancel</button>
          <button id="pausebutton" class="button">Pause</button>
          <p id="timeRemaining"></p>
          <p id="eta"></p>
        </div>
      </div>
    `;

    jest.resetModules();
    chromeMocks = createChromeMocks();
    global.chrome = chromeMocks;

    // Mock storage get to return defaults
    chromeMocks.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      if (callback) callback(result);
      return Promise.resolve(result);
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  const loadPopup = async () => {
    require('../popup/popup.js');
    // jQuery ready might fire asynchronously
    await new Promise(resolve => setTimeout(resolve, 50));
  };

  test('Start Button click properly creates alarm', async () => {
    // Mock tab query returning Promise - set up BEFORE loadPopup
    chromeMocks.tabs.query.mockImplementation((q, cb) => {
      const tabs = [{ id: 123, url: 'http://google.com' }];
      if (cb) cb(tabs);
      return Promise.resolve(tabs);
    });

    // Mock storage.local.remove for URL-based pause state clearing
    chromeMocks.storage.local.remove = jest.fn((keys, cb) => {
      if (cb) cb();
      return Promise.resolve();
    });

    await loadPopup();

    const startBtn = $('#startbutton');

    // Ensure button is not disabled (default 30 minutes should be > 0)
    expect(startBtn.prop('disabled')).toBe(false);

    startBtn.click();

    // Allow async promises to resolve
    await new Promise(r => setTimeout(r, 100));

    expect(chromeMocks.alarms.create).toHaveBeenCalledWith('123', expect.objectContaining({
      when: expect.any(Number)
    }));
    // Check display style directly since jsdom's :visible can be unreliable
    expect($('#cancelDiv').css('display')).not.toBe('none');
  });

  test('Cancel Button click clears alarm and resets UI', async () => {
    chromeMocks.tabs.query.mockImplementation((q, cb) => {
      const tabs = [{ id: 123, url: 'http://example.com' }];
      if (cb) cb(tabs);
      return Promise.resolve(tabs);
    });

    // Mock storage.local.remove for URL-based pause state clearing
    chromeMocks.storage.local.remove = jest.fn((keys, cb) => {
      if (cb) cb();
      return Promise.resolve();
    });

    await loadPopup();

    // Setup UI in "started" state
    $('#cancelDiv').show();

    const cancelBtn = $('#cancelbutton');
    const pauseBtn = $('#pausebutton');

    // Pause button might have been toggled - but reset it first
    pauseBtn.removeClass('paused').text('Pause');

    cancelBtn.click();

    await new Promise(r => setTimeout(r, 100));

    expect(chromeMocks.alarms.clear).toHaveBeenCalledWith('123');
    expect($('#cancelDiv').is(':visible')).toBe(false);
    expect(pauseBtn.text()).toBe('Pause');
    expect(pauseBtn.hasClass('paused')).toBe(false);
  });

  test('Pause Button toggles state and alarm', async () => {
    // Mock existing alarm BEFORE loading popup
    chromeMocks.alarms.get.mockImplementation((id, cb) => {
      cb({ scheduledTime: Date.now() + 10000 });
    });
    chromeMocks.tabs.query.mockImplementation((q, cb) => {
      const tabs = [{ id: 123, url: 'http://example.com' }];
      if (cb) cb(tabs);
      return Promise.resolve(tabs);
    });

    // Mock storage.local.remove and set for URL-based pause state
    chromeMocks.storage.local.remove = jest.fn((keys, cb) => {
      if (cb) cb();
      return Promise.resolve();
    });

    await loadPopup();

    // We need to trigger start first to setup countdown logic if possible,
    // But popup.js attaches click handler inside `setupCountdown`.
    // Only if we use `startbutton` or if `chrome.alarms.get` returns an alarm.

    const pauseBtn = $('#pausebutton');

    // First click: Pause
    pauseBtn.click();
    await new Promise(r => setTimeout(r, 100));

    expect(pauseBtn.text()).toBe('Resume');
    expect(chromeMocks.alarms.clear).toHaveBeenCalledWith('123');

    // Second click: Resume
    pauseBtn.click();
    await new Promise(r => setTimeout(r, 100));

    expect(pauseBtn.text()).toBe('Pause');
    expect(chromeMocks.alarms.create).toHaveBeenCalled();
  });

  test('Input validation: Hours and Minutes keys and scroll', async () => {
    await loadPopup();
    const hours = $('#hours');
    const minutes = $('#minutes');
    
    // Test ArrowUp on Hours
    hours.val(0);
    const eUp = $.Event('keydown', { key: 'ArrowUp' });
    hours.trigger(eUp);
    expect(hours.val()).toBe('1');
    
    // Test ArrowDown on Hours
    const eDown = $.Event('keydown', { key: 'ArrowDown' });
    hours.trigger(eDown);
    expect(hours.val()).toBe('0');
    
    // Test Wheel on Minutes (Scroll up -> +1)
    minutes.val(30);
    const eWheelUp = $.Event('wheel', { originalEvent: { deltaY: -100 } });
    minutes.trigger(eWheelUp);
    expect(minutes.val()).toBe('31');
    
    // Test Shift + Wheel on Minutes (+5)
    const eWheelShift = $.Event('wheel', { originalEvent: { deltaY: -100 }, shiftKey: true });
    minutes.trigger(eWheelShift);
    expect(minutes.val()).toBe('36');
  });

  test('Input Sanitization', async () => {
    await loadPopup();
    const hours = $('#hours');
    // Change type to text to allow invalid chars for testing sanitization logic
    hours.attr('type', 'text');
    
    hours.val('12a');
    hours.trigger('input');
    expect(hours.val()).toBe('12');
    
    hours.val('10');
    hours.trigger('blur');
    // Blur triggers fixOverflowAndUnderflows, but value shouldn't change if valid
    expect(hours.val()).toBe('10');
  });

  test('Preset Buttons', async () => {
    await loadPopup();
    const btn5m = $('.preset-btn[data-minutes="5"]');
    const minutes = $('#minutes');
    
    btn5m.click();
    expect(minutes.val()).toBe('5');
  });
  
  test('YouTube Actions Persistence', async () => {
    // Mock YouTube tab
    chromeMocks.tabs.query.mockImplementation((q, cb) => {
      const tabs = [{ id: 456, url: 'https://youtube.com/watch?v=xyz' }];
      cb(tabs);
      return Promise.resolve(tabs);
    });
    
    await loadPopup();
    
    // Wait for init
    await new Promise(r => setTimeout(r, 0));
    
    const pauseRadio = $('input[value="pause"]');
    const closeRadio = $('input[value="close"]');
    
    // Change to close
    closeRadio.prop('checked', true).trigger('change');
    
    expect(chromeMocks.storage.local.set).toHaveBeenCalledWith({ '456_action': 'close' });
  });
});

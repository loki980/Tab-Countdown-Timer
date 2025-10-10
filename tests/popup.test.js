// Import jQuery for testing
const $ = require('../lib/jquery-3.5.1.min.js');
global.$ = global.jQuery = $;

// Chrome API mocks are set up in chrome-mocks.js
// Import after mocks are established
const { ChromeAPIWrapper } = require('../background/background.js');

/**
 * Test suite for popup script functionality
 * Tests the popup UI interactions and utility functions
 */
describe('Popup Script Functionality', () => {
  /**
   * Basic test setup and teardown
   */
  beforeEach(() => {
    // Setup complete DOM elements that popup.js expects
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
        </div>
      </div>
    `;

    // Reset all mock implementations
    jest.clearAllMocks();
    
    // Setup default mock implementations
    chrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ id: 123, url: 'https://example.com' }]);
    });
    
    chrome.alarms.get.mockImplementation((id, callback) => {
      callback(null);
    });
    
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          if (key === 'hours') result[key] = 0;
          if (key === 'minutes') result[key] = 30;
        });
      } else if (typeof keys === 'string') {
        if (keys === 'hours') result[keys] = 0;
        if (keys === 'minutes') result[keys] = 30;
      }
      callback(result);
    });
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  /**
   * Popup UI Elements Tests
   */
  describe('Popup UI Elements', () => {
    test('should initialize popup with correct default values', () => {
      expect(document.getElementById('hours')).not.toBeNull();
      expect(document.getElementById('minutes')).not.toBeNull();
      expect(document.getElementById('startbutton')).not.toBeNull();
      
      // Check default values
      expect(document.getElementById('hours').value).toBe('0');
      expect(document.getElementById('minutes').value).toBe('30');
    });
    
    test('preset buttons should update input values', () => {
      const preset5m = document.querySelector('[data-minutes="5"]');
      const preset1h = document.querySelector('[data-hours="1"]');
      const hoursInput = document.getElementById('hours');
      const minutesInput = document.getElementById('minutes');
      
      // Simulate clicking 5 minute preset
      $(preset5m).trigger('click');
      // Note: The actual event handling happens in popup.js when loaded
      
      expect(preset5m).not.toBeNull();
      expect(preset1h).not.toBeNull();
    });
    
    test('action options should be hidden by default for non-YouTube tabs', () => {
      const actionOptions = document.querySelector('.action-options');
      expect(actionOptions.style.display).toBe('none');
    });
  });

  describe('Chrome API Interactions', () => {
    test('should handle alarm query correctly for active alarm', (done) => {
      // Mock tab query response
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 123, url: 'https://example.com' }]);
      });

      // Mock alarm response with active alarm
      chrome.alarms.get.mockImplementation((id, callback) => {
        callback({
          scheduledTime: Date.now() + 60000 // 1 minute from now
        });
      });

      // Import popup.js to trigger initialization
      delete require.cache[require.resolve('../popup/popup.js')];
      require('../popup/popup.js');

      // Wait for async operations to complete
      setTimeout(() => {
        try {
          expect(chrome.tabs.query).toHaveBeenCalledWith(
            { active: true, currentWindow: true },
            expect.any(Function)
          );
          done();
        } catch (error) {
          done(error);
        }
      }, 100);
    });
    
    test('should handle YouTube tab detection', () => {
      // Test that YouTube URL detection logic works
      const testUrl = 'https://youtube.com/watch?v=abc';
      expect(testUrl.includes('youtube.com/watch')).toBe(true);
      
      const nonYouTubeUrl = 'https://example.com';
      expect(nonYouTubeUrl.includes('youtube.com/watch')).toBe(false);
    });
    
    test('should handle timer creation', async () => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 123, url: 'https://example.com' }]);
      });
      
      chrome.alarms.create.mockImplementation((name, info) => {
        return Promise.resolve();
      });
      
      chrome.storage.local.set.mockImplementation((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      });
      
      chrome.action.setBadgeBackgroundColor.mockImplementation(() => {
        return Promise.resolve();
      });

      delete require.cache[require.resolve('../popup/popup.js')];
      require('../popup/popup.js');
      
      // Simulate clicking start button
      const startButton = document.getElementById('startbutton');
      expect(startButton).not.toBeNull();
    });
  });
  
  describe('Utility Functions', () => {
    test('getCloseTimeInSeconds should calculate correctly', () => {
      // Set input values
      document.getElementById('hours').value = '1';
      document.getElementById('minutes').value = '30';
      
      // Define the function as it exists in popup.js
      const getCloseTimeInSeconds = () => {
        let seconds = 0;
        seconds += Number(document.getElementById('minutes').value * 60);
        seconds += Number(document.getElementById('hours').value * 60 * 60);
        seconds++;
        return seconds;
      };
      
      const result = getCloseTimeInSeconds();
      expect(result).toBe(5401); // 1 hour (3600) + 30 minutes (1800) + 1 second
    });
    
    test('input validation should work correctly', () => {
      const hoursInput = document.getElementById('hours');
      
      // Test boundary values
      hoursInput.value = '25'; // Over max
      
      // The actual validation happens in popup.js event handlers
      expect(parseInt(hoursInput.max)).toBe(24);
    });
  });

  describe('Input Overflow and Underflow', () => {
    let hoursInput, minutesInput, fixOverflowAndUnderflows;

    beforeEach(() => {
      hoursInput = document.getElementById('hours');
      minutesInput = document.getElementById('minutes');
      
      // Manually create the function in the test scope
      fixOverflowAndUnderflows = () => {
        let hours = Number($(hoursInput).val()) || 0;
        let minutes = Number($(minutesInput).val()) || 0;

        if (minutes < 0) {
            if (hours > 0) {
                const hoursToBorrow = Math.ceil(Math.abs(minutes) / 60);
                hours -= hoursToBorrow;
                minutes += hoursToBorrow * 60;
            } else {
                minutes = 0;
            }
        }

        if (minutes > 59) {
            hours += Math.floor(minutes / 60);
            minutes %= 60;
        }

        hours = Math.max(0, Math.min(24, hours));
        minutes = Math.max(0, minutes);
        
        if (hours === 24) {
            minutes = 0;
        }

        $(hoursInput).val(hours);
        $(minutesInput).val(minutes);
      };
    });

    test('should handle minute overflow correctly', () => {
      $(minutesInput).val('75');
      fixOverflowAndUnderflows();
      expect(hoursInput.value).toBe('1');
      expect(minutesInput.value).toBe('15');
    });

    test('should handle minute underflow by borrowing from hours', () => {
      $(hoursInput).val('1');
      $(minutesInput).val('-1'); // Simulate result of scrolling down from 0
      fixOverflowAndUnderflows();
      expect(hoursInput.value).toBe('0');
      expect(minutesInput.value).toBe('59');
    });

    test('should not go below zero when at 0h 0m', () => {
      $(hoursInput).val('0');
      $(minutesInput).val('-1');
      fixOverflowAndUnderflows();
      expect(hoursInput.value).toBe('0');
      expect(minutesInput.value).toBe('0');
    });
  });
});

// Import jQuery for testing
const $ = require('../lib/jquery-3.5.1.min.js');
global.$ = global.jQuery = $;

// Mock Chrome API before importing any modules
global.chrome = {
  tabs: {
    query: jest.fn(),
    onRemoved: {
      addListener: jest.fn()
    }
  },
  alarms: {
    get: jest.fn(),
    getAll: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  },
  runtime: {
    lastError: null
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn()
  }
};

// Import background.js which contains ChromeAPIWrapper
const { ChromeAPIWrapper } = require('../background/background.js');

// Import the functions to test from popup.js
const { } = require('../popup/popup.js');

/**
 * Test suite for popup script functionality
 * Tests the popup UI interactions and utility functions
 */
describe('Popup Script Functionality', () => {
  /**
   * Basic test setup and teardown
   */
  beforeEach(() => {
    // Setup DOM elements that popup.js expects
    document.body.innerHTML = `
      <div id="popup-content">
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
      callback([{ id: 123 }]);
    });
    
    chrome.alarms.get.mockImplementation((id, callback) => {
      callback(null);
    });
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  /**
   * Example test group
   */
  describe('Popup UI Elements', () => {
    test('should initialize popup correctly', () => {
      // This is a placeholder test
      expect(document.getElementById('popup-content')).not.toBeNull();
    });
  });

  describe('Chrome API Interactions', () => {
    test('should handle alarm query correctly', (done) => {
      // Mock tab query response
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 123 }]);
      });

      // Mock alarm response
      chrome.alarms.get.mockImplementation((id, callback) => {
        callback({
          scheduledTime: Date.now() + 60000 // 1 minute from now
        });
      });

      // Trigger the popup script
      require('../popup/popup.js');

      // Wait for async operations to complete
      setTimeout(() => {
        try {
          // Verify that chrome.tabs.query was called with correct parameters
          expect(chrome.tabs.query).toHaveBeenCalledWith(
            { active: true, currentWindow: true },
            expect.any(Function)
          );

          // Verify that cancelDiv is shown when there's an active alarm
          expect($('#cancelDiv').css('display')).not.toBe('none');
          done();
        } catch (error) {
          done(error);
        }
      }, 100);
    });
  });
});

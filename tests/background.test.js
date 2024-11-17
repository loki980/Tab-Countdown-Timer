// Import the utility functions and ChromeAPIWrapper for testing
const { FormatDuration, ChromeAPIWrapper, HandleRemove, UpdateBadges } = require('../background/background.js');

/**
 * Test suite for background script utility functions
 * Tests both the FormatDuration utility and ChromeAPIWrapper functionality
 */
describe('Background Script Utility Functions', () => {
  /**
   * Tests for the FormatDuration utility function
   * Verifies correct formatting of time durations in different scenarios
   */
  describe('FormatDuration', () => {
    // Test that durations less than an hour are formatted as MM:SS
    test('formats duration less than an hour correctly', () => {
      expect(FormatDuration(65000)).toBe('1:05'); // 1 minute 5 seconds
      expect(FormatDuration(30000)).toBe('0:30'); // 30 seconds
    });

    // Test that durations more than an hour are formatted correctly
    test('formats duration more than an hour correctly', () => {
      expect(FormatDuration(3665000)).toBe('1:01'); // 1 hour 1 minute
    });

    // Test that negative durations return a question mark
    test('returns "?" for negative duration', () => {
      expect(FormatDuration(-1000)).toBe('?');
    });

    // Test that zero duration returns "0:00"
    test('returns "0:00" for zero duration', () => {
      expect(FormatDuration(0)).toBe('0:00');
    });

    // Test that very large durations are formatted correctly
    test('formats very large durations correctly', () => {
      expect(FormatDuration(72000000)).toBe('20:00'); // 20 hours
    });
  });

  /**
   * Tests for the Chrome Extension API Wrapper
   * Verifies proper interaction with Chrome Extension APIs
   */
  describe('Chrome Extension API Wrapper', () => {
    beforeEach(() => {
      // Reset Chrome API mocks before each test
      global.chrome = {
        alarms: {
          onAlarm: { addListener: jest.fn() },
          clear: jest.fn((name, callback) => callback(true)),
          getAll: jest.fn((callback) => callback([]))
        },
        tabs: {
          onRemoved: { addListener: jest.fn() },
          remove: jest.fn((tabId, callback) => callback()),
          get: jest.fn((tabId, callback) => callback({}))
        },
        action: {
          setBadgeBackgroundColor: jest.fn(),
          setBadgeText: jest.fn((options, callback) => callback())
        },
        runtime: {
          lastError: null
        }
      };
    });

    // Test that all ChromeAPIWrapper methods properly interact with Chrome APIs
    test('ChromeAPIWrapper methods call corresponding Chrome APIs', async () => {
      // Test alarm-related methods
      await ChromeAPIWrapper.alarms.clear('test');
      expect(chrome.alarms.clear).toHaveBeenCalledWith('test', expect.any(Function));

      await ChromeAPIWrapper.alarms.getAll();
      expect(chrome.alarms.getAll).toHaveBeenCalledWith(expect.any(Function));

      // Test tab-related methods
      await ChromeAPIWrapper.tabs.remove(123);
      expect(chrome.tabs.remove).toHaveBeenCalledWith(123, expect.any(Function));

      await ChromeAPIWrapper.tabs.get(123);
      expect(chrome.tabs.get).toHaveBeenCalledWith(123, expect.any(Function));

      // Test badge-related methods
      ChromeAPIWrapper.action.setBadgeBackgroundColor({ color: '#777' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#777' });

      await ChromeAPIWrapper.action.setBadgeText({ tabId: 123, text: '2:00' });
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        { tabId: 123, text: '2:00' },
        expect.any(Function)
      );
    });

    // Test error handling in setBadgeText
    test('setBadgeText handles errors correctly', async () => {
      chrome.action.setBadgeText = jest.fn((options, callback) => {
        chrome.runtime.lastError = { message: 'Error occurred' };
        callback();
      });

      await expect(
        ChromeAPIWrapper.action.setBadgeText({ tabId: 123, text: '1:00' })
      ).rejects.toMatchObject({ message: 'Error occurred' });
    });

    // Test that getAll returns empty array when no alarms exist
    test('getAll returns an empty array when there are no alarms', async () => {
      const alarms = await ChromeAPIWrapper.alarms.getAll();
      expect(alarms).toEqual([]);
    });

    // Test that remove resolves properly after removing a tab
    test('remove resolves correctly when a tab is removed', async () => {
      await expect(ChromeAPIWrapper.tabs.remove(123)).resolves.toBeUndefined();
    });
  });

  /**
   * Tests for HandleRemove function
   */
  describe('HandleRemove', () => {
    test('clears alarm when a tab is removed', () => {
      const tabId = 123;
      HandleRemove(tabId);
      expect(chrome.alarms.clear).toHaveBeenCalledWith(tabId.toString(), expect.any(Function));
    });

    test('handles errors when clearing alarm', async () => {
      const tabId = 123;
      chrome.alarms.clear = jest.fn((name, callback) => {
        chrome.runtime.lastError = { message: 'Failed to clear alarm' };
        callback(false);
      });

      HandleRemove(tabId);
      expect(chrome.alarms.clear).toHaveBeenCalledWith(tabId.toString(), expect.any(Function));
    });
  });

  /**
   * Tests for badge text updates
   */
  describe('Badge Text Updates', () => {
    test('updates badge text for valid tab', async () => {
      const alarm = { name: '123', scheduledTime: Date.now() + 60000 }; // 1 minute from now
      
      // Setup mocks with proper callback handling
      chrome.alarms.getAll = jest.fn((callback) => callback([alarm]));
      chrome.tabs.get = jest.fn((tabId, callback) => callback({ id: 123 }));
      chrome.alarms.clear = jest.fn((name, callback) => {
        chrome.runtime.lastError = null;
        callback(true);
      });
      chrome.action.setBadgeText = jest.fn((options, callback) => {
        chrome.runtime.lastError = null;
        callback();
      });

      // Test the badge text update
      await ChromeAPIWrapper.action.setBadgeText({ tabId: 123, text: '1:00' });
      
      // Verify all the expected calls
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        { tabId: 123, text: '1:00' },
        expect.any(Function)
      );
      expect(chrome.runtime.lastError).toBeNull();
    });

    test('handles non-existent tabs', async () => {
      chrome.tabs.get = jest.fn((tabId, callback) => {
        chrome.runtime.lastError = { message: 'Tab not found' };
        callback();
      });

      await expect(
        ChromeAPIWrapper.tabs.get(123)
      ).rejects.toMatchObject({ message: 'Tab not found' });
    });
  });

  /**
   * Tests for UpdateBadges function
   */
  describe('UpdateBadges', () => {
    beforeEach(() => {
      // Reset runtime.lastError before each test
      chrome.runtime.lastError = null;
      jest.clearAllMocks();
      jest.useFakeTimers();
      
      // Mock setInterval
      global.setInterval = jest.fn();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    test('handles successful badge updates', async () => {
      const now = new Date('2024-01-01T12:00:00');
      jest.setSystemTime(now);

      const mockAlarms = [{
        name: '123',
        scheduledTime: now.getTime() + 3600000 // 1 hour from now
      }];

      // Setup successful path mocks
      chrome.alarms.getAll.mockImplementation(callback => callback(mockAlarms));
      chrome.tabs.get.mockImplementation((tabId, callback) => callback({ id: 123 }));
      chrome.action.setBadgeText.mockImplementation((options, callback) => callback());

      // Call UpdateBadges and wait for it to complete
      await UpdateBadges();

      // Verify the entire flow
      expect(chrome.alarms.getAll).toHaveBeenCalledWith(expect.any(Function));
      expect(chrome.tabs.get).toHaveBeenCalledWith(123, expect.any(Function));
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        {
          tabId: 123,
          text: '1:00'
        },
        expect.any(Function)
      );
    });

    test('handles tab not found error', async () => {
      const now = new Date('2024-01-01T12:00:00');
      jest.setSystemTime(now);
      
      const mockAlarms = [{
        name: '456',
        scheduledTime: now.getTime() + 1000
      }];

      // Setup error path mocks
      chrome.alarms.getAll.mockImplementation(callback => callback(mockAlarms));
      chrome.tabs.get.mockImplementation((tabId, callback) => {
        chrome.runtime.lastError = { message: 'Tab not found' };
        callback();
      });
      chrome.alarms.clear.mockImplementation((name, callback) => callback(true));

      await UpdateBadges();

      // Verify error handling
      expect(chrome.alarms.clear).toHaveBeenCalledWith('456', expect.any(Function));
    });

    test('handles alarm clear error', async () => {
      const mockAlarms = [{
        name: '789',
        scheduledTime: Date.now() + 1000
      }];

      // Setup error path mocks
      chrome.alarms.getAll.mockImplementation(callback => callback(mockAlarms));
      chrome.tabs.get.mockImplementation((tabId, callback) => {
        chrome.runtime.lastError = { message: 'Tab not found' };
        callback();
      });
      chrome.alarms.clear.mockImplementation((name, callback) => {
        chrome.runtime.lastError = { message: 'Failed to clear alarm' };
        callback(false);
      });

      const consoleSpy = jest.spyOn(console, 'error');
      await UpdateBadges();

      // Verify error handling
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clear orphaned alarm:',
        { message: 'Failed to clear alarm' }
      );
    });

    test('handles getAll alarms error', async () => {
      // Setup error path mock
      chrome.alarms.getAll.mockImplementation(callback => {
        chrome.runtime.lastError = { message: 'Failed to get alarms' };
        callback();
      });

      const consoleSpy = jest.spyOn(console, 'error');
      await UpdateBadges();

      // Verify error handling
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get alarms:',
        expect.any(Object)
      );
    });
  });
});

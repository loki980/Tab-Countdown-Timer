// Import the utility functions and ChromeAPIWrapper for testing
const { FormatDuration, ChromeAPIWrapper } = require('../background/background.js');

describe('Background Script Utility Functions', () => {
  describe('FormatDuration', () => {
    test('formats duration less than an hour correctly', () => {
      expect(FormatDuration(65000)).toBe('1:05'); // 1 minute 5 seconds
      expect(FormatDuration(30000)).toBe('0:30'); // 30 seconds
    });

    test('formats duration more than an hour correctly', () => {
      expect(FormatDuration(3665000)).toBe('1:01'); // 1 hour 1 minute
    });

    test('returns "?" for negative duration', () => {
      expect(FormatDuration(-1000)).toBe('?');
    });
  });

  describe('Chrome Extension API Wrapper', () => {
    beforeEach(() => {
      // Mock Chrome APIs
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

    test('ChromeAPIWrapper methods call corresponding Chrome APIs', async () => {
      // Test alarms methods
      await ChromeAPIWrapper.alarms.clear('test');
      expect(chrome.alarms.clear).toHaveBeenCalledWith('test', expect.any(Function));

      await ChromeAPIWrapper.alarms.getAll();
      expect(chrome.alarms.getAll).toHaveBeenCalledWith(expect.any(Function));

      // Test tabs methods
      await ChromeAPIWrapper.tabs.remove(123);
      expect(chrome.tabs.remove).toHaveBeenCalledWith(123, expect.any(Function));

      await ChromeAPIWrapper.tabs.get(123);
      expect(chrome.tabs.get).toHaveBeenCalledWith(123, expect.any(Function));

      // Test action methods
      ChromeAPIWrapper.action.setBadgeBackgroundColor({ color: '#777' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#777' });

      await ChromeAPIWrapper.action.setBadgeText({ tabId: 123, text: '1:00' });
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 123, text: '1:00' }, expect.any(Function));
    });
  });
});

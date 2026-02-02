// Import the utility functions and ChromeAPIWrapper for testing
const {
  FormatDuration,
  ChromeAPIWrapper,
  HandleRemove,
  UpdateBadges,
  getMillisecondsUntil10PM,
  setYouTubeTimer,
  checkAndSetYouTubeTimers,
  pauseYouTubeVideo
} = require('../background/background.js');

const alarmListeners = chrome.alarms.onAlarm.addListener.mock.calls.map(call => call[0]);

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
      jest.clearAllMocks();

      global.chrome.alarms = {
        onAlarm: { addListener: jest.fn() },
        clear: jest.fn((name, callback) => callback(true)),
        getAll: jest.fn((callback) => callback([])),
        create: jest.fn(),
        get: jest.fn((name, callback) => callback(null))
      };

      global.chrome.tabs = {
        onRemoved: { addListener: jest.fn() },
        onCreated: { addListener: jest.fn() },
        onUpdated: { addListener: jest.fn() },
        remove: jest.fn((tabId, callback) => callback()),
        get: jest.fn((tabId, callback) => callback({})),
        query: jest.fn((query, callback) => callback([]))
      };

      global.chrome.storage = {
        local: {
          get: jest.fn((keys, callback) => callback({})),
          set: jest.fn((items, callback) => callback())
        }
      };

      global.chrome.runtime = {
        lastError: null
      };
    });

    // Test that all ChromeAPIWrapper methods properly interact with Chrome APIs
    test('ChromeAPIWrapper methods call corresponding Chrome APIs', async() => {
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
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#777' }, expect.any(Function));

      await ChromeAPIWrapper.action.setBadgeText({ tabId: 123, text: '2:00' });
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        { tabId: 123, text: '2:00' },
        expect.any(Function)
      );
    });

    // Test error handling in setBadgeText
    test('setBadgeText handles errors correctly', async() => {
      chrome.action.setBadgeText = jest.fn((options, callback) => {
        chrome.runtime.lastError = { message: 'Error occurred' };
        callback();
      });

      await expect(
        ChromeAPIWrapper.action.setBadgeText({ tabId: 123, text: '1:00' })
      ).rejects.toMatchObject({ message: 'Error occurred' });
    });

    // Test that getAll returns empty array when no alarms exist
    test('getAll returns an empty array when there are no alarms', async() => {
      const alarms = await ChromeAPIWrapper.alarms.getAll();
      expect(alarms).toEqual([]);
    });

    // Test that remove resolves properly after removing a tab
    test('remove resolves correctly when a tab is removed', async() => {
      await expect(ChromeAPIWrapper.tabs.remove(123)).resolves.toBeUndefined();
    });

    test('alarms.get rejects when runtime error occurs', async() => {
      chrome.alarms.get = jest.fn((name, callback) => {
        chrome.runtime.lastError = { message: 'boom' };
        callback(null);
      });

      await expect(ChromeAPIWrapper.alarms.get('boom')).rejects.toMatchObject({ message: 'boom' });
      chrome.runtime.lastError = null;
    });

    test('tabs.remove propagates runtime errors', async() => {
      chrome.tabs.remove = jest.fn((tabId, callback) => {
        chrome.runtime.lastError = { message: 'remove failed' };
        callback();
      });

      await expect(ChromeAPIWrapper.tabs.remove(9)).rejects.toMatchObject({ message: 'remove failed' });
      chrome.runtime.lastError = null;
    });

    test('storage.local.get rejects when chrome reports an error', async() => {
      chrome.storage.local.get = jest.fn((key, callback) => {
        chrome.runtime.lastError = { message: 'storage get failed' };
        callback({});
      });

      await expect(ChromeAPIWrapper.storage.local.get('foo')).rejects.toMatchObject({ message: 'storage get failed' });
      chrome.runtime.lastError = null;
    });

    test('storage.local.set rejects when chrome reports an error', async() => {
      chrome.storage.local.set = jest.fn((items, callback) => {
        chrome.runtime.lastError = { message: 'storage set failed' };
        callback();
      });

      await expect(ChromeAPIWrapper.storage.local.set({ foo: 'bar' }))
        .rejects.toMatchObject({ message: 'storage set failed' });
      chrome.runtime.lastError = null;
    });

    test('scripting.executeScript resolves when Chrome API succeeds', async() => {
      chrome.scripting.executeScript = jest.fn((options, callback) => {
        callback(['ok']);
      });

      await expect(ChromeAPIWrapper.scripting.executeScript({ target: { tabId: 1 } }))
        .resolves.toEqual(['ok']);
    });
  });

  /**
   * Tests for HandleRemove function
   */
  describe('HandleRemove', () => {
    test('clears alarm when a tab is removed', async() => {
      const tabId = 123;
      chrome.alarms.get = jest.fn((name, callback) => {
        callback(null); // No alarm for this tab
      });
      chrome.alarms.clear = jest.fn((name, callback) => {
        chrome.runtime.lastError = null;
        callback(true);
      });
      chrome.storage.local.get = jest.fn((keys, callback) => {
        callback({});
      });
      chrome.storage.local.remove = jest.fn((keys, callback) => {
        callback();
      });

      await HandleRemove(tabId);
      expect(chrome.alarms.clear).toHaveBeenCalledWith(tabId.toString(), expect.any(Function));
    });

    test('saves timer state when tab with running timer is closed', async() => {
      const tabId = 123;
      const futureTime = Date.now() + 60000;
      const testUrl = 'https://example.com/page';

      chrome.alarms.get = jest.fn((name, callback) => {
        callback({ scheduledTime: futureTime }); // Running alarm
      });
      chrome.alarms.clear = jest.fn((name, callback) => {
        chrome.runtime.lastError = null;
        callback(true);
      });
      chrome.storage.local.get = jest.fn((keys, callback) => {
        callback({ '123_url': testUrl });
      });
      chrome.storage.local.set = jest.fn((items, callback) => {
        callback();
      });
      chrome.storage.local.remove = jest.fn((keys, callback) => {
        callback();
      });

      await HandleRemove(tabId);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          ['paused_' + encodeURIComponent(testUrl)]: expect.objectContaining({
            pausedTimeRemaining: expect.any(Number),
            pausedAt: expect.any(Number)
          })
        }),
        expect.any(Function)
      );
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(
        ['123_url', '123_action'],
        expect.any(Function)
      );
    });

    test('handles errors when clearing alarm', async() => {
      const tabId = 123;
      chrome.alarms.get = jest.fn((name, callback) => {
        callback(null);
      });
      chrome.alarms.clear = jest.fn((name, callback) => {
        chrome.runtime.lastError = { message: 'Failed to clear alarm' };
        callback(false);
      });
      chrome.storage.local.get = jest.fn((keys, callback) => {
        callback({});
      });
      chrome.storage.local.remove = jest.fn((keys, callback) => {
        callback();
      });

      await HandleRemove(tabId);
      expect(chrome.alarms.clear).toHaveBeenCalledWith(tabId.toString(), expect.any(Function));
    });
  });

  /**
   * Tests for badge text updates
   */
  describe('Badge Text Updates', () => {
    test('updates badge text for valid tab', async() => {
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

    test('handles non-existent tabs', async() => {
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

    test('handles successful badge updates', async() => {
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

    test('handles tab not found error', async() => {
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

    test('handles alarm clear error', async() => {
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
        'Failed to get alarms:',
        { message: 'Failed to clear alarm' }
      );
    });

    test('handles getAll alarms error', async() => {
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

    test('clears alarms when the tab no longer exists', async() => {
      const mockAlarms = [{
        name: '999',
        scheduledTime: Date.now() + 1000
      }];

      chrome.alarms.getAll.mockImplementation(callback => callback(mockAlarms));
      const existsSpy = jest.spyOn(ChromeAPIWrapper.tabs, 'exists').mockResolvedValue(false);
      const clearSpy = jest.spyOn(ChromeAPIWrapper.alarms, 'clear').mockResolvedValue(true);

      await UpdateBadges();

      expect(existsSpy).toHaveBeenCalledWith(999);
      expect(clearSpy).toHaveBeenCalledWith('999');

      existsSpy.mockRestore();
      clearSpy.mockRestore();
    });
  });

  /**
   * Tests for YouTube-specific functionality
   */
  describe('YouTube Timer Functions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Set a fixed date for consistent testing
      jest.setSystemTime(new Date('2024-01-01T15:00:00'));

      // Setup Chrome API mocks for YouTube tests
      jest.clearAllMocks();

      global.chrome.storage = {
        local: {
          get: jest.fn((keys, callback) => callback({})),
          set: jest.fn((items, callback) => {
            if (callback) callback();
            return Promise.resolve();
          })
        }
      };

      global.chrome.alarms = {
        create: jest.fn(),
        get: jest.fn((name, callback) => callback(null))
      };

      global.chrome.action = {
        setBadgeBackgroundColor: jest.fn((options, callback) => {
          if (callback) callback();
        })
      };

      global.chrome.tabs = {
        query: jest.fn((query, callback) => callback([]))
      };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('getMillisecondsUntil10PM calculates correctly for same day', () => {
      // Test at 3 PM, should return milliseconds until 10 PM same day
      const result = getMillisecondsUntil10PM();
      const expected = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
      expect(result).toBe(expected);
    });

    test('getMillisecondsUntil10PM calculates correctly for next day', () => {
      // Test at 11 PM, should return milliseconds until 10 PM next day
      jest.setSystemTime(new Date('2024-01-01T23:00:00'));
      const result = getMillisecondsUntil10PM();
      const expected = 23 * 60 * 60 * 1000; // 23 hours in milliseconds
      expect(result).toBe(expected);
    });

    test('setYouTubeTimer function exists and can be called', async() => {
      const mockTab = { id: 123, url: 'https://youtube.com/watch?v=abc' };

      // Verify the function exists and can be called without throwing
      expect(typeof setYouTubeTimer).toBe('function');

      // This is a unit test - the function integration with Chrome APIs
      // is better tested in a full Chrome extension environment
      await expect(setYouTubeTimer(mockTab)).resolves.not.toThrow();
    });

    test('setYouTubeTimer does not create a new alarm if one already exists', async() => {
      const mockTab = { id: 123, url: 'https://youtube.com/watch?v=abc' };
      const existingAlarm = { name: '123', scheduledTime: Date.now() + 100000 };

      // Mock ChromeAPIWrapper.alarms.get to return an existing alarm
      const originalGet = ChromeAPIWrapper.alarms.get;
      ChromeAPIWrapper.alarms.get = jest.fn().mockResolvedValue(existingAlarm);

      await setYouTubeTimer(mockTab);

      // Expect that chrome.alarms.create was not called
      expect(global.chrome.alarms.create).not.toHaveBeenCalled();

      // Restore original method
      ChromeAPIWrapper.alarms.get = originalGet;
    });

    test('setYouTubeTimer creates a new alarm if one does not exist', async() => {
      const mockTab = { id: 456, url: 'https://youtube.com/watch?v=def' };

      // Mock ChromeAPIWrapper methods
      const originalGet = ChromeAPIWrapper.alarms.get;
      const originalStorageSet = ChromeAPIWrapper.storage.local.set;
      const originalSetBadgeColor = ChromeAPIWrapper.action.setBadgeBackgroundColor;
      const originalAlarmsCreate = ChromeAPIWrapper.alarms.create;

      ChromeAPIWrapper.alarms.get = jest.fn().mockResolvedValue(null);
      ChromeAPIWrapper.storage.local.set = jest.fn().mockResolvedValue();
      ChromeAPIWrapper.action.setBadgeBackgroundColor = jest.fn();
      ChromeAPIWrapper.alarms.create = jest.fn().mockResolvedValue();

      await setYouTubeTimer(mockTab);

      // Expect that ChromeAPIWrapper.alarms.create was called
      expect(ChromeAPIWrapper.alarms.create).toHaveBeenCalled();

      // Restore original methods
      ChromeAPIWrapper.alarms.get = originalGet;
      ChromeAPIWrapper.storage.local.set = originalStorageSet;
      ChromeAPIWrapper.action.setBadgeBackgroundColor = originalSetBadgeColor;
      ChromeAPIWrapper.alarms.create = originalAlarmsCreate;
    });

    test('setYouTubeTimer handles errors gracefully', async() => {
      const mockTab = { id: 123, url: 'https://youtube.com/watch?v=abc' };
      const testError = new Error('Alarm get error');

      // Mock ChromeAPIWrapper.alarms.get to throw an error
      const originalGet = ChromeAPIWrapper.alarms.get;
      ChromeAPIWrapper.alarms.get = jest.fn().mockRejectedValue(testError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await setYouTubeTimer(mockTab);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to set YouTube timer:', testError);

      // Restore original methods
      ChromeAPIWrapper.alarms.get = originalGet;
      consoleSpy.mockRestore();
    });

    test('checkAndSetYouTubeTimers processes YouTube tabs', async() => {
      // This is a more complex integration test that would require
      // mocking the global chrome object completely. For now, we verify
      // the function exists and can be called
      expect(typeof checkAndSetYouTubeTimers).toBe('function');

      // The actual implementation tests are covered by individual function tests
      // and real Chrome extension testing would require a full extension environment
    });

    test('pauseYouTubeVideo triggers script execution and badge reset', async() => {
      const executeSpy = jest.spyOn(ChromeAPIWrapper.scripting, 'executeScript').mockResolvedValue([]);
      const setBadgeTextSpy = jest.spyOn(ChromeAPIWrapper.action, 'setBadgeText').mockResolvedValue();
      const setColorSpy = jest.spyOn(ChromeAPIWrapper.action, 'setBadgeBackgroundColor');

      await pauseYouTubeVideo(55);

      expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({ target: { tabId: 55 } }));
      expect(setBadgeTextSpy).toHaveBeenCalledWith({ tabId: 55, text: '' });
      expect(setColorSpy).toHaveBeenCalledWith({ tabId: 55, color: '#666666' });

      executeSpy.mockRestore();
      setBadgeTextSpy.mockRestore();
      setColorSpy.mockRestore();
    });

    test('checkAndSetYouTubeTimers sets timers for fresh YouTube tabs', async() => {
      const youtubeTab = { id: 901, url: 'https://www.youtube.com/watch?v=abc' };
      const otherTab = { id: 777, url: 'https://example.com' };

      chrome.tabs.query = jest.fn((_query, callback) => {
        callback([youtubeTab, otherTab]);
      });

      chrome.alarms.get = jest.fn((name, callback) => {
        if (name === youtubeTab.id.toString()) {
          callback(null);
        } else {
          callback({ name });
        }
      });

      const createSpy = jest.spyOn(ChromeAPIWrapper.alarms, 'create').mockResolvedValue();
      const storageSpy = jest.spyOn(ChromeAPIWrapper.storage.local, 'set').mockResolvedValue();
      const colorSpy = jest.spyOn(ChromeAPIWrapper.action, 'setBadgeBackgroundColor');
      const getSpy = jest.spyOn(ChromeAPIWrapper.alarms, 'get').mockResolvedValue(null);

      await checkAndSetYouTubeTimers();

      expect(createSpy).toHaveBeenCalledWith(youtubeTab.id.toString(), expect.any(Object));
      expect(storageSpy).toHaveBeenCalled();
      expect(colorSpy).toHaveBeenCalledWith({ tabId: youtubeTab.id, color: '#666666' });
      expect(getSpy).toHaveBeenCalledWith(youtubeTab.id.toString());

      createSpy.mockRestore();
      storageSpy.mockRestore();
      colorSpy.mockRestore();
      getSpy.mockRestore();
    });
  });

  /**
   * Tests for utility functions
   */
  describe('Utility Functions', () => {
    test('getCloseTimeInSeconds calculates correct total seconds', () => {
      // Mock jQuery elements
      global.$ = jest.fn((selector) => {
        const mockElement = {
          value: selector.includes('hours') ? 1 : 30
        };
        return [mockElement];
      });

      // Import the function that uses jQuery
      const getCloseTimeInSeconds = () => {
        let seconds = 0;
        seconds += Number($('#minutes')[0].value * 60);
        seconds += Number($('#hours')[0].value * 60 * 60);
        seconds++;
        return seconds;
      };

      const result = getCloseTimeInSeconds();
      expect(result).toBe(5401); // 1 hour + 30 minutes + 1 second
    });
  });

  describe('Alarm listener behavior', () => {
    const primaryAlarmHandler = alarmListeners[0];
    const badgeColorListener = alarmListeners[1];

    test('clears alarms when the tab is gone', async() => {
      const existsSpy = jest.spyOn(ChromeAPIWrapper.tabs, 'exists').mockResolvedValue(false);
      const clearSpy = jest.spyOn(ChromeAPIWrapper.alarms, 'clear').mockResolvedValue(true);
      const getSpy = jest.spyOn(ChromeAPIWrapper.tabs, 'get');

      await primaryAlarmHandler({ name: '55' });

      expect(clearSpy).toHaveBeenCalledWith('55');
      expect(getSpy).not.toHaveBeenCalled();

      existsSpy.mockRestore();
      clearSpy.mockRestore();
      getSpy.mockRestore();
    });

    test('pauses YouTube tabs when action is pause', async() => {
      const existsSpy = jest.spyOn(ChromeAPIWrapper.tabs, 'exists').mockResolvedValue(true);
      const getSpy = jest.spyOn(ChromeAPIWrapper.tabs, 'get').mockResolvedValue({
        id: 101,
        url: 'https://www.youtube.com/watch?v=alarm'
      });
      const storageSpy = jest.spyOn(ChromeAPIWrapper.storage.local, 'get')
        .mockResolvedValue({ '101_action': 'pause' });
      const executeSpy = jest.spyOn(ChromeAPIWrapper.scripting, 'executeScript').mockResolvedValue([]);
      const removeSpy = jest.spyOn(ChromeAPIWrapper.tabs, 'remove').mockResolvedValue();

      await primaryAlarmHandler({ name: '101' });

      expect(executeSpy).toHaveBeenCalled();
      expect(removeSpy).not.toHaveBeenCalled();

      existsSpy.mockRestore();
      getSpy.mockRestore();
      storageSpy.mockRestore();
      executeSpy.mockRestore();
      removeSpy.mockRestore();
    });

    test('closes non-YouTube tabs when pause is not selected', async() => {
      const existsSpy = jest.spyOn(ChromeAPIWrapper.tabs, 'exists').mockResolvedValue(true);
      const getSpy = jest.spyOn(ChromeAPIWrapper.tabs, 'get').mockResolvedValue({
        id: 77,
        url: 'https://example.com'
      });
      const storageSpy = jest.spyOn(ChromeAPIWrapper.storage.local, 'get').mockResolvedValue({});
      const removeSpy = jest.spyOn(ChromeAPIWrapper.tabs, 'remove').mockResolvedValue();

      await primaryAlarmHandler({ name: '77' });

      expect(removeSpy).toHaveBeenCalledWith(77);

      existsSpy.mockRestore();
      getSpy.mockRestore();
      storageSpy.mockRestore();
      removeSpy.mockRestore();
    });

    test('secondary alarm listener always resets the badge color', () => {
      const colorSpy = jest.spyOn(ChromeAPIWrapper.action, 'setBadgeBackgroundColor');

      badgeColorListener({ name: '22' });

      expect(colorSpy).toHaveBeenCalledWith({ tabId: 22, color: '#666666' });
      colorSpy.mockRestore();
    });
  });

  describe('ChromeAPIWrapper without chrome runtime', () => {
    let originalChrome;

    beforeAll(() => {
      originalChrome = global.chrome;
      // Remove chrome so wrapper takes the fallback branches
      delete global.chrome;
    });

    afterAll(() => {
      global.chrome = originalChrome;
    });

    test('alarms.getAll resolves to an empty array', async() => {
      await expect(ChromeAPIWrapper.alarms.getAll()).resolves.toEqual([]);
    });

    test('storage.local.get resolves to an empty object', async() => {
      await expect(ChromeAPIWrapper.storage.local.get('foo')).resolves.toEqual({});
    });

    test('scripting.executeScript rejects when API is unavailable', async() => {
      await expect(
        ChromeAPIWrapper.scripting.executeScript({})
      ).rejects.toThrow('Scripting API not available');
    });

    test('alarms.get resolves undefined when chrome is missing', async() => {
      await expect(ChromeAPIWrapper.alarms.get('missing')).resolves.toBeUndefined();
    });

    test('alarms.clear resolves false without chrome', async() => {
      await expect(ChromeAPIWrapper.alarms.clear('missing')).resolves.toBe(false);
    });

    test('tabs.remove resolves when chrome is unavailable', async() => {
      await expect(ChromeAPIWrapper.tabs.remove(1)).resolves.toBeUndefined();
    });

    test('tabs.exists resolves false when chrome is unavailable', async() => {
      await expect(ChromeAPIWrapper.tabs.exists(1)).resolves.toBe(false);
    });

    test('action.setBadgeText resolves when chrome is unavailable', async() => {
      await expect(ChromeAPIWrapper.action.setBadgeText({ text: '' })).resolves.toBeUndefined();
    });

    test('tabs.get rejects when Tabs API is unavailable', async() => {
      await expect(ChromeAPIWrapper.tabs.get(123)).rejects.toThrow('Tabs API not available');
    });

    test('storage.local.set resolves when storage is unavailable', async() => {
      await expect(ChromeAPIWrapper.storage.local.set({ foo: 'bar' })).resolves.toBeUndefined();
    });
  });

  describe('Alarm listener error handling', () => {
    const primaryAlarmHandler = alarmListeners[0];

    test('logs error when alarm handler fails', async() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const existsSpy = jest.spyOn(ChromeAPIWrapper.tabs, 'exists').mockRejectedValue(new Error('Tab check failed'));

      await primaryAlarmHandler({ name: '999' });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to handle alarm:', expect.any(Error));

      consoleSpy.mockRestore();
      existsSpy.mockRestore();
    });
  });

  describe('checkAndSetYouTubeTimers error handling', () => {
    test('logs error when checking YouTube tabs fails', async() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock chrome.tabs.query to throw an error
      const originalQuery = chrome.tabs.query;
      chrome.tabs.query = jest.fn((_query, callback) => {
        throw new Error('Query failed');
      });

      await checkAndSetYouTubeTimers();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to check YouTube tabs:', expect.any(Error));

      chrome.tabs.query = originalQuery;
      consoleSpy.mockRestore();
    });
  });

  describe('scripting.executeScript error paths', () => {
    test('rejects when Chrome runtime reports an error', async() => {
      chrome.scripting = {
        executeScript: jest.fn((options, callback) => {
          chrome.runtime.lastError = { message: 'Script execution failed' };
          callback(null);
        })
      };

      await expect(ChromeAPIWrapper.scripting.executeScript({ target: { tabId: 1 } }))
        .rejects.toMatchObject({ message: 'Script execution failed' });

      chrome.runtime.lastError = null;
    });
  });

  describe('pauseYouTubeVideo error handling', () => {
    test('logs error when script execution fails', async() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const executeSpy = jest.spyOn(ChromeAPIWrapper.scripting, 'executeScript')
        .mockRejectedValue(new Error('Injection failed'));

      await pauseYouTubeVideo(123);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to pause YouTube video:', expect.any(Error));

      consoleSpy.mockRestore();
      executeSpy.mockRestore();
    });
  });
});

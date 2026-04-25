const { createChromeMocks } = require('./setup/chrome-mocks');

describe('Background Listeners', () => {
  let chromeMocks;
  let background;
  let alarmListeners = [];

  beforeEach(() => {
    jest.resetModules();
    alarmListeners = [];
    chromeMocks = createChromeMocks();
    global.chrome = chromeMocks;
    
    // Capture all listeners
    chromeMocks.alarms.onAlarm.addListener.mockImplementation((callback) => {
      alarmListeners.push(callback);
    });

    // Require background to register listeners
    background = require('../background/background.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to catch errors
  const spyConsoleError = () => {
    const spy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      console.log('Captured Error:', ...args);
    });
    return spy;
  };

  describe('Alarm Listener', () => {
    test('should close tab when alarm fires for non-YouTube tab', async () => {
      const spy = spyConsoleError();
      const tabId = 123;
      const alarm = { name: tabId.toString() };

      // Mock tab exists
      chromeMocks.tabs.get.mockImplementation((id, callback) => {
        const tab = { id: id, url: 'https://example.com' };
        callback(tab);
      });

      // Execute all registered listeners (we expect the main logic listener to be one of them)
      for (const listener of alarmListeners) {
        await listener(alarm);
      }
      
      if (spy.mock.calls.length > 0) {
        console.log('Console Error:', spy.mock.calls[0]);
      }

      expect(chromeMocks.tabs.remove).toHaveBeenCalledWith(tabId, expect.any(Function));
      expect(chromeMocks.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: tabId,
        color: '#666666'
      }, expect.any(Function));
    });

    test('should pause video calls executeScript for YouTube tab with pause action', async () => {
      const spy = spyConsoleError();
      const tabId = 456;
      const alarm = { name: tabId.toString() };

      // Mock YouTube tab
      chromeMocks.tabs.get.mockImplementation((id, callback) => {
        const tab = { id: id, url: 'https://youtube.com/watch?v=video' };
        callback(tab);
      });

      // Mock storage to return 'pause' action
      chromeMocks.storage.local.get.mockImplementation((key, callback) => {
        callback({ [tabId + '_action']: 'pause' });
      });

      for (const listener of alarmListeners) {
        await listener(alarm);
      }
      
      if (spy.mock.calls.length > 0) {
        console.log('Console Error:', spy.mock.calls[0]);
      }

      expect(chromeMocks.scripting.executeScript).toHaveBeenCalledWith(expect.objectContaining({
        target: { tabId: tabId }
      }), expect.any(Function));
      
      expect(chromeMocks.action.setBadgeText).toHaveBeenCalledWith({
        tabId: tabId,
        text: ''
      }, expect.any(Function));
    });

    test('should clear alarm and return if tab fails existence check', async () => {
      const spy = spyConsoleError();
      const tabId = 999;
      const alarm = { name: tabId.toString() };

      // Mock tab does NOT exist (Check returns false/error)
      chromeMocks.tabs.get.mockImplementation((id, callback) => {
        callback(null);
      });
      
      for (const listener of alarmListeners) {
        await listener(alarm);
      }
      
      if (spy.mock.calls.length > 0) {
        console.log('Console Error:', spy.mock.calls[0]);
      }

      expect(chromeMocks.alarms.clear).toHaveBeenCalledWith(alarm.name, expect.any(Function));
      expect(chromeMocks.tabs.remove).not.toHaveBeenCalled();
    });
  });
  
  describe('UpdateBadges', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });
    
    test('should update badges for active alarms', async () => {
      const tabId = 101;
      const now = Date.now();
      const scheduledTime = now + 65000; // 1m 5s remaining
      
      const alarms = [{ name: tabId.toString(), scheduledTime: scheduledTime }];
      
      chromeMocks.alarms.getAll.mockImplementation((callback) => {
        callback(alarms);
      });
      
      chromeMocks.tabs.get.mockImplementation((id, callback) => {
        callback({ id: id }); // Exists
      });

      // Trigger the interval or call UpdateBadges directly if exported
      // UpdateBadges is exported!
      await background.UpdateBadges();
      
      // FormatDuration(65000) -> 1:05
      expect(chromeMocks.action.setBadgeText).toHaveBeenCalledWith({
        tabId: tabId,
        text: '1:05'
      }, expect.any(Function));
      
      expect(chromeMocks.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: tabId,
        color: '#666666' // > 30s
      }, expect.any(Function));
    });

    test('should use red badge for under 30 seconds', async () => {
      const tabId = 102;
      const now = Date.now();
      const scheduledTime = now + 15000; // 15s remaining
      
      const alarms = [{ name: tabId.toString(), scheduledTime: scheduledTime }];
      
      chromeMocks.alarms.getAll.mockImplementation((callback) => {
        callback(alarms);
      });
      
      chromeMocks.tabs.get.mockImplementation((id, callback) => {
        callback({ id: id });
      });

      await background.UpdateBadges();
      
      expect(chromeMocks.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: tabId,
        color: '#ff0000'
      }, expect.any(Function));
    });

    test('should clear alarm if tab does not exist during update', async () => {
      const tabId = 103;
      const alarms = [{ name: tabId.toString(), scheduledTime: Date.now() + 10000 }];
      
      chromeMocks.alarms.getAll.mockImplementation((callback) => {
        callback(alarms);
      });
      
      chromeMocks.tabs.get.mockImplementation((id, callback) => {
        callback(null); // Tab gone
      });

      await background.UpdateBadges();
      
      expect(chromeMocks.alarms.clear).toHaveBeenCalledWith(tabId.toString(), expect.any(Function));
    });
  });
});

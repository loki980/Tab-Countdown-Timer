// Comprehensive Chrome API mocks for testing
const createChromeMocks = () => {
  return {
    alarms: {
      onAlarm: { addListener: jest.fn() },
      clear: jest.fn((name, callback) => {
        if (callback) callback(true);
        return Promise.resolve(true);
      }),
      getAll: jest.fn((callback) => {
        if (callback) callback([]);
        return Promise.resolve([]);
      }),
      create: jest.fn((name, alarmInfo) => {
        return Promise.resolve();
      }),
      get: jest.fn((name, callback) => {
        if (callback) callback(null);
        return Promise.resolve(null);
      })
    },
    tabs: {
      onRemoved: { addListener: jest.fn() },
      onCreated: { addListener: jest.fn() },
      onUpdated: { addListener: jest.fn() },
      remove: jest.fn((tabId, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      get: jest.fn((tabId, callback) => {
        const tab = { id: tabId, url: 'https://example.com' };
        if (callback) callback(tab);
        return Promise.resolve(tab);
      }),
      query: jest.fn((queryInfo, callback) => {
        const tabs = [{ id: 123, url: 'https://example.com', active: true }];
        if (callback) callback(tabs);
        return Promise.resolve(tabs);
      })
    },
    action: {
      setBadgeBackgroundColor: jest.fn((options) => {
        return Promise.resolve();
      }),
      setBadgeText: jest.fn((options, callback) => {
        if (callback) callback();
        return Promise.resolve();
      })
    },
    storage: {
      local: {
        get: jest.fn((keys, callback) => {
          const result = {};
          if (callback) callback(result);
          return Promise.resolve(result);
        }),
        set: jest.fn((items, callback) => {
          if (callback) callback();
          return Promise.resolve();
        })
      }
    },
    scripting: {
      executeScript: jest.fn((options, callback) => {
        const result = [{ result: null }];
        if (callback) callback(result);
        return Promise.resolve(result);
      })
    },
    runtime: {
      lastError: null
    }
  };
};

// Setup global chrome mock
global.chrome = createChromeMocks();

// Export for test customization
module.exports = { createChromeMocks };
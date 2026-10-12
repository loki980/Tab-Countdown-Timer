const { createChromeMocks } = require('./setup/chrome-mocks');

// background.js picks up shared/video-site-utils.js differently in each
// runtime. These tests reproduce each runtime's globals and check which
// helper object the module ended up using.
describe('Background shared helper loading', () => {
  const fakeHelpers = {
    getVideoSiteContext: jest.fn(),
    normalizeUrlForRuleKey: jest.fn(),
    normalizeUrlForStorage: jest.fn()
  };

  beforeEach(() => {
    jest.resetModules();
    global.chrome = createChromeMocks();
  });

  afterEach(() => {
    delete global.importScripts;
    delete self.VideoSiteUtils;
  });

  test('Chrome service worker loads the helper with importScripts', () => {
    global.importScripts = jest.fn(() => {
      self.VideoSiteUtils = fakeHelpers;
    });

    const background = require('../background/background.js');

    expect(global.importScripts).toHaveBeenCalledWith('../shared/video-site-utils.js');
    expect(background.getVideoSiteContext).toBe(fakeHelpers.getVideoSiteContext);
  });

  test('Firefox event page uses the helper an earlier background script attached', () => {
    self.VideoSiteUtils = fakeHelpers;

    const background = require('../background/background.js');

    expect(background.getVideoSiteContext).toBe(fakeHelpers.getVideoSiteContext);
    expect(background.normalizeUrlForRuleKey).toBe(fakeHelpers.normalizeUrlForRuleKey);
  });

  test('CommonJS falls back to require when no global helper exists', () => {
    const background = require('../background/background.js');

    expect(background.getVideoSiteContext).toBe(require('../shared/video-site-utils.js').getVideoSiteContext);
    expect(background.getVideoSiteContext).not.toBe(fakeHelpers.getVideoSiteContext);
  });
});

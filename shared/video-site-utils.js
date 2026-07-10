// Video-site URL helpers shared by the service worker and the popup.
// Loaded three ways: importScripts() in background/background.js, a <script>
// tag in popup/popup.html (attaches root.VideoSiteUtils), and require() in
// Jest. Keep this file dependency-free.
(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.VideoSiteUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  // Twitch path segments that are not channels/VODs. Visiting these doesn't
  // open a player, so we don't treat them as "video pages."
  const TWITCH_NON_VIDEO_ROUTES = new Set([
    'directory', 'p', 'subscriptions', 'following', 'search', 'settings',
    'team', 'turbo', 'jobs', 'wallet', 'inventory', 'drops', 'downloads',
    'broadcast', 'logout', 'login', 'signup', 'redeem'
  ]);

  // Identifies tabs hosting a pausable HTML5 video on a recognized site, and
  // produces the storage/rule keys used to persist state per-content. Returns
  // null for non-video pages so callers can fall back to URL-based keys.
  function getVideoSiteContext(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')
        && urlObj.pathname === '/watch'
        && urlObj.searchParams.has('v')) {
        const id = urlObj.searchParams.get('v');
        return {
          site: 'youtube',
          id,
          storageKey: 'paused_youtube_' + id,
          ruleKeyExact: 'youtube_' + id,
          ruleKeyAll: 'youtube_all'
        };
      }
      if (urlObj.hostname.includes('twitch.tv')) {
        const path = urlObj.pathname.replace(/^\/+|\/+$/g, '');
        if (!path) return null;
        const segments = path.split('/');
        const first = segments[0].toLowerCase();
        if (TWITCH_NON_VIDEO_ROUTES.has(first)) return null;
        const id = first === 'videos' && segments[1]
          ? 'videos_' + segments[1]
          : first;
        return {
          site: 'twitch',
          id,
          storageKey: 'paused_twitch_' + id,
          ruleKeyExact: 'twitch_' + id,
          ruleKeyAll: 'twitch_all'
        };
      }
    } catch {
      // fallthrough
    }
    return null;
  }

  // Stable URL form for rule keys. Drops fragment so #section variants of the
  // same URL share one rule. Keeps query so ?id=1 vs ?id=2 stay distinct.
  function normalizeUrlForRuleKey(urlObj) {
    return urlObj.origin + urlObj.pathname + urlObj.search;
  }

  // URL normalization for persistent pause state storage. For recognized video
  // sites we key on content (so timers survive ?t=, ?list=, etc.); otherwise
  // the full URL is used.
  function normalizeUrlForStorage(url) {
    const ctx = getVideoSiteContext(url);
    if (ctx) return ctx.storageKey;
    try {
      return 'paused_' + encodeURIComponent(new URL(url).href);
    } catch {
      return 'paused_' + encodeURIComponent(url);
    }
  }

  return {
    TWITCH_NON_VIDEO_ROUTES,
    getVideoSiteContext,
    normalizeUrlForRuleKey,
    normalizeUrlForStorage
  };
});

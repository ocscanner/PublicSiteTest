/* ============================================================
   OC SCANNER — site settings
   Loaded on every page before app.js. Safe to be public: nothing
   in here is a secret.

   STAFF LOGIN
   The header link to the Command Center. The public site does NOT
   log anyone in — it only links there. Cloudflare Access protects
   admin.ocscanner.media and handles staff sign-in.

   To turn the link on (only after Access is confirmed working):
     1. set  enabled: true
     2. commit and deploy
   To turn it off again, set enabled back to false.
   ============================================================ */
/* NEWS FROM THE COMMAND CENTER (P04)
   Stories published at admin.ocscanner.media appear on News, the homepage,
   the ticker, story pages, share cards and the sitemap. That switch lives
   in lib/cms.js (enabled: true/false), because the server-side page code
   reads it; previews use staging-admin.ocscanner.media automatically. */
window.OCS_CONFIG = {
  staffLogin: {
    // Production Command Center (live Nov 12, 2026). Staging stays at staging-admin.ocscanner.media for testing.
    url: 'https://admin.ocscanner.media/',

    // false = link is hidden on the live site.
    enabled: true,

    // While disabled, the link still shows on these addresses so you can
    // check how it looks before launch (it won't be seen by the public):
    //  - your own computer (localhost)
    //  - Cloudflare *branch/preview* builds, e.g. staff-login-link.<project>.pages.dev
    //    (NOT the production <project>.pages.dev address)
    showOnPreviews: true
  },

  /* ============================================================
     TICKER NEWS SOURCES (the outside headlines in the live ticker)
     Turn a source on or off with `enabled: true / false`, then
     commit. The ticker takes the newest stories from every source
     that is on, takes turns between them, and labels each one with
     its `name`.

     Adding a new source: every feed's site must be on the radar
     proxy's approved list (FEED_HOSTS in IntelHQ
     workers/oc-radar-proxy/src/index.js), or it will be refused.

     Per source:
       urls     one or more RSS feeds (merged, newest first)
       perTurn  how many of its stories to show (default 2)
       prefer   words that move a story to the front, e.g. OC cities
       note     small grey text after the headline (optional)
     ============================================================ */
  tickerNews: {
    cacheMinutes: 5,     // how long each visitor's browser keeps a copy
    maxAgeHours: 24,     // skip stories older than this (stale feeds disappear)
    sources: [
      {
        id: 'ktla', name: 'KTLA', enabled: true,
        urls: ['https://ktla.com/feed'],
        // KTLA covers all of SoCal; Orange County stories go first.
        prefer: ['Orange County', 'OC ', 'Anaheim', 'Santa Ana', 'Irvine', 'Huntington Beach',
          'Costa Mesa', 'Newport Beach', 'Fullerton', 'Garden Grove', 'Orange', 'Tustin',
          'Mission Viejo', 'Laguna', 'San Clemente', 'Dana Point', 'Westminster', 'Buena Park',
          'Yorba Linda', 'Lake Forest', 'Fountain Valley', 'Seal Beach', 'Cypress', 'Brea',
          'Placentia', 'La Habra', 'Stanton', 'Los Alamitos', 'Aliso Viejo',
          'Rancho Santa Margarita', 'San Juan Capistrano', 'Villa Park', 'Ladera Ranch']
      },
      {
        id: 'fox', name: 'Fox News', enabled: true,
        urls: ['https://moxie.foxnews.com/google-publisher/us.xml',
               'https://moxie.foxnews.com/google-publisher/politics.xml']
      },
      {
        // Off Nov 12, 2026: its newest story was 9+ days old. Flip to true to bring it back.
        id: 'iw', name: 'Insider Wire', enabled: false, note: 'Partner',
        urls: ['https://insiderwire.com/rssfeed.xml']
      }
    ]
  },

  /* ============================================================
     MAXQ SPACE DATA (maxq.app)
     Every MaxQ-specific value lives here so MaxQ's official URLs
     can be swapped in one place. Used by maxq.js on space.html
     and live.html. Credit and ?ref link are required by MaxQ.
     ============================================================ */
  maxq: {
    enabled: true,
    // Feed: next launch matching the search. No key needed.
    feedUrl: 'https://www.maxq.app/api/v1/widget?q=vandenberg&limit=1',
    // Embeds. The launch slug is appended to launch/jellyfish.
    embed: {
      launch:    'https://www.maxq.app/embed/launch/',
      jellyfish: 'https://www.maxq.app/embed/jellyfish/',
      broadcast: 'https://www.maxq.app/embed/broadcast'
    },
    creditText: 'Space data: MaxQ',
    creditUrl:  'https://maxq.app/?ref=ocscanner',
    // Live page: show MaxQ Live as a second panel below OUR stream
    // while we are broadcasting (e.g. launch nights). Default OFF.
    launchNightMode: false
  }
};

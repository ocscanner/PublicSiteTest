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
window.OCS_CONFIG = {
  staffLogin: {
    // Staging admin for now; switch to https://admin.ocscanner.media/ once production is built.
    url: 'https://staging-admin.ocscanner.media/',

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

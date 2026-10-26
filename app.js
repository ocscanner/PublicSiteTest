/* Moved to ocscanner.media: anyone on the old GitHub address
   (ocscanner.github.io/PublicSiteTest/...) is sent to the same page there. */
(function(){
  "use strict";
  if (location.hostname !== 'ocscanner.github.io') return;
  var path = location.pathname.replace(/^\/PublicSiteTest(\/|$)/i, '/');
  path = path.replace(/(^|\/)index\.html$/i, '$1').replace(/\.html$/i, '');
  if (path === '/blog') path = '/news';
  location.replace('https://ocscanner.media' + path + location.search + location.hash);
})();

(function(){
  "use strict";
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var nav = document.getElementById('nav');
  var toggle = document.getElementById('menuToggle');
  if (toggle){
    toggle.addEventListener('click', function(){
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function(e){
      if (e.target.tagName === 'A'){ nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); }
    });
  }

  var yrEl = document.getElementById('yr'); if(yrEl) yrEl.textContent = new Date().getFullYear();

  var todayEl = document.getElementById('today');
  if (todayEl){
    todayEl.textContent = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }).toUpperCase();
  }

  var track = document.getElementById('track');
  if (track){ track.innerHTML += track.innerHTML; }
})();


(function(){
  "use strict";
  var root = document.documentElement;
  function cur(){ return root.getAttribute('data-theme') || 'light'; }
  var bar = document.querySelector('.bar-inner');
  if(!bar) return;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-toggle';
  btn.setAttribute('aria-label','Toggle dark mode');
  function paint(){ btn.textContent = cur()==='dark' ? '\u2600' : '\u263E'; } // sun / moon
  paint();
  btn.addEventListener('click', function(){
    var next = cur()==='dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try{ localStorage.setItem('theme', next); }catch(e){}
    paint();
  });
  var menu = document.getElementById('menuToggle');
  if(menu) bar.insertBefore(btn, menu); else bar.appendChild(btn);
})();


/* Staff login link — settings live in site-config.js.
   Only reveals the link; it never signs anyone in or calls the admin API.
   Cloudflare Access on the admin site does the authentication. */
(function(){
  "use strict";
  var link = document.getElementById('staffLogin');
  if (!link) return;
  var cfg = (window.OCS_CONFIG && window.OCS_CONFIG.staffLogin) || {};

  var host = location.hostname;
  var isPreview =
    host === 'localhost' || host === '127.0.0.1' || host === '[::1]' ||
    // Cloudflare branch/preview builds: <branch-or-hash>.<project>.pages.dev
    // (the bare <project>.pages.dev address is production, so it doesn't count)
    /^[^.]+\.[^.]+\.pages\.dev$/i.test(host);

  if (!(cfg.enabled === true || (cfg.showOnPreviews === true && isPreview))) return;

  // Only ever link to a real https address
  var url;
  try { url = new URL(cfg.url); } catch (e) { return; }
  if (url.protocol !== 'https:') return;

  link.href = url.href;
  link.removeAttribute('hidden');
})();

/* OC Scanner: MaxQ space data (config lives in site-config.js > OCS_CONFIG.maxq) */
(function(){
  var C = (window.OCS_CONFIG && window.OCS_CONFIG.maxq) || null;
  if(!C || !C.enabled) return;
  var CACHE_KEY = 'oc_maxq_next_v1';

  function store(fn){ try{ return fn(); }catch(e){ return null; } }
  function safeUrl(u){ return typeof u === 'string' && /^https:\/\/(www\.)?maxq\.app\//.test(u); }
  function slugOk(s){ return typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(s); }

  function frame(src, title, cls){
    var f = document.createElement('iframe');
    f.src = src; f.title = title; f.loading = 'lazy';
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    if(cls) f.className = cls;
    return f;
  }
  function credit(){
    var a = document.createElement('a');
    a.href = C.creditUrl; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = C.creditText; a.className = 'maxq-credit';
    return a;
  }

  /* ---------- feed (cached until refreshAfter) ---------- */
  function readCache(){
    return store(function(){
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if(c && c.url === C.feedUrl && c.until > Date.now() && c.slug) return c;
      return null;
    });
  }
  function writeCache(slug, until){
    store(function(){ localStorage.setItem(CACHE_KEY, JSON.stringify({ url:C.feedUrl, slug:slug, until:until })); });
  }
  function getSlug(){
    var c = readCache();
    if(c) return Promise.resolve(c.slug);
    return fetch(C.feedUrl, { headers:{ 'Accept':'application/json' } })
      .then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .then(function(j){
        var l = j && j.launch;
        if(!l || !slugOk(l.slug)) throw 0;
        var until = Date.parse(j.refreshAfter);
        if(!(until > Date.now())) until = Date.now() + 5*60*1000;
        until = Math.min(until, Date.now() + 30*60*1000);   // never trust a stale pick for long
        writeCache(l.slug, until);
        return l.slug;
      });
  }

  /* ---------- Space page ---------- */
  function mountSpace(){
    var box = document.getElementById('maxq-vsfb');
    if(!box || !safeUrl(C.embed.launch) || !safeUrl(C.embed.jellyfish)) return;
    var cur = null, timer = null;
    function render(slug){
      if(slug === cur) return;
      cur = slug;
      var a = box.querySelector('[data-maxq-slot="launch"]');
      var b = box.querySelector('[data-maxq-slot="jelly"]');
      a.textContent = ''; b.textContent = '';
      a.appendChild(frame(C.embed.launch + encodeURIComponent(slug), 'MaxQ launch countdown: next Vandenberg launch'));
      b.appendChild(frame(C.embed.jellyfish + encodeURIComponent(slug), 'MaxQ jellyfish forecast: Southern California sky visibility for the next Vandenberg launch'));
      var cr = box.querySelector('[data-maxq-credit]');
      if(!cr.firstChild) cr.appendChild(credit());
      box.hidden = false;
    }
    function hide(){ box.hidden = true; cur = null; }
    function tick(){
      getSlug().then(render, function(){ if(!cur) hide(); })
        .then(function(){
          var c = readCache();
          var wait = c ? Math.max(60000, c.until - Date.now() + 1000) : 5*60*1000;
          clearTimeout(timer); timer = setTimeout(function(){ tick(); }, Math.min(wait, 30*60*1000));
        });
    }
    tick();
  }

  /* ---------- Live page (called by live.html only when we are NOT live, or launch-night mode) ---------- */
  function mountLive(target){
    if(!target || target.getAttribute('data-mounted')) return;
    if(!safeUrl(C.embed.broadcast)) return;
    target.setAttribute('data-mounted', '1');
    var wrap = target.querySelector('[data-maxq-slot="broadcast"]');
    var cr = target.querySelector('[data-maxq-credit]');
    wrap.appendChild(frame(C.embed.broadcast, 'MaxQ Live: 24/7 spaceflight broadcast'));
    if(cr && !cr.firstChild) cr.appendChild(credit());
    target.hidden = false;
  }

  window.OCS_MAXQ = { mountLive: mountLive, launchNightMode: !!C.launchNightMode };
  if(document.getElementById('maxq-vsfb')) mountSpace();
})();

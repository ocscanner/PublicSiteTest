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
    f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');   // autoplay lets MaxQ's audio play once the visitor has tapped
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
    if(cr && !cr.firstChild){
      cr.className = 'maxq-foot';
      cr.appendChild(credit());
      cr.appendChild(fullscreenButton(wrap));
    }
    target.hidden = false;
  }

  /* Full screen always keeps the embedded player on our page.
     1) The browser's own full screen on the frame (desktop, Android, iPad).
     2) Where that isn't allowed (iPhone Safari only allows it for <video>), a
        "fill the screen" mode: the same iframe is pinned over the whole page with
        a close button. The iframe is never moved or reloaded, so audio keeps playing. */
  function fsEl(){ return document.fullscreenElement || document.webkitFullscreenElement || null; }
  var ICON_IN  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"/></svg>';
  var ICON_OUT = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"/></svg>';
  function fullscreenButton(box){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'maxq-fs';
    var close = document.createElement('button');
    close.type = 'button'; close.className = 'maxq-fs-close';
    close.setAttribute('aria-label', 'Exit full screen');
    close.innerHTML = ICON_OUT + '<span>Exit</span>';
    box.appendChild(close);

    function theaterOn(){ return box.classList.contains('maxq-theater'); }
    function isOn(){ return fsEl() === box || theaterOn(); }
    function label(){
      var on = isOn();
      b.innerHTML = on ? ICON_OUT + ' Exit full screen' : ICON_IN + ' Full screen';
      b.setAttribute('aria-label', on ? 'Exit full screen' : 'Watch MaxQ Live full screen');
    }
    function enterTheater(){
      box.classList.add('maxq-theater');
      document.documentElement.classList.add('maxq-lock');
      label(); close.focus();
    }
    function exitAll(){
      if(fsEl() === box){ try{ (document.exitFullscreen || document.webkitExitFullscreen).call(document); }catch(e){} }
      if(theaterOn()){
        box.classList.remove('maxq-theater');
        document.documentElement.classList.remove('maxq-lock');
        b.focus();
      }
      label();
    }
    function enter(){
      var req = box.requestFullscreen || box.webkitRequestFullscreen;
      var allowed = document.fullscreenEnabled || document.webkitFullscreenEnabled;
      if(!req || !allowed){ enterTheater(); return; }
      try{
        var p = req.call(box);
        if(p && p.catch) p.catch(enterTheater);
      }catch(e){ enterTheater(); }
    }
    label();
    b.addEventListener('click', function(){ isOn() ? exitAll() : enter(); });
    close.addEventListener('click', exitAll);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && theaterOn()) exitAll(); });
    document.addEventListener('fullscreenchange', label);
    document.addEventListener('webkitfullscreenchange', label);
    return b;
  }

  window.OCS_MAXQ = { mountLive: mountLive, launchNightMode: !!C.launchNightMode };
  if(document.getElementById('maxq-vsfb')) mountSpace();
})();

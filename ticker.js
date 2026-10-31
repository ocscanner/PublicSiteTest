/* ============================================================
   OC SCANNER — live ticker (the strip under the nav, every page)

   Rotation: our story → OC weather → Insider Wire → next Vandenberg
   launch → our story → OC weather → Insider Wire → elections.
   A missing source is simply skipped. An active NWS *warning* for
   Orange County is pinned at the front and the label turns to ALERT.

   Sources (each cached in the visitor's browser, so moving between
   pages doesn't refetch):
     posts/index.json            our stories (same site)       5 min
     NWS api.weather.gov         OC forecast + current temp    30 / 15 min
     NWS active alerts           anything covering Orange Co.  5 min
     oc-radar-proxy /rss         Insider Wire headlines        15 min
     Launch Library (+ proxy)    next Vandenberg launch        60 min

   Wide screens: a slow crawl (pauses on hover/focus or with the
   pause button). Phones and "reduce motion": one item at a time.
   If nothing loads, the original static strip stays as it was.
   ============================================================ */
(function () {
  "use strict";

  var host = document.querySelector('.ticker');
  if (!host || !window.fetch || !window.Promise) return;

  var WORKER = 'https://oc-radar-proxy.ocscannernews.workers.dev';
  var IW_RSS = 'https://insiderwire.com/rssfeed.xml';
  var SANTA_ANA = { lat: 33.7455, lon: -117.8677 };
  var NWS_PAGE = 'https://forecast.weather.gov/MapClick.php?lat=33.7455&lon=-117.8677';
  var OBS_STATION = 'KSNA';                 // John Wayne Airport, Santa Ana
  var OC_SAME = '006059';                   // FIPS code NWS uses for Orange County
  var VANDENBERG_LL_ID = 11;                // Launch Library location id
  var ELECTION_DAY = '2026-11-03';          // PT date; item hides 2 weeks after
  var TZ = 'America/Los_Angeles';
  var CRAWL_PX_PER_SEC = 42;
  var ROTATE_MS = 5500;
  var REFRESH_MS = 10 * 60 * 1000;
  var FIRST_PAINT_WAIT_MS = 3500;

  var mqNarrow = window.matchMedia ? window.matchMedia('(max-width: 600px)') : null;
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* ---------- small helpers ---------- */
  function cacheGet(key, maxMin) {
    try {
      var c = JSON.parse(localStorage.getItem('ocs_tk_' + key) || 'null');
      if (c && (Date.now() - c.t) < maxMin * 60000) return c.v;
    } catch (e) {}
    return null;
  }
  function cacheSet(key, v) {
    try { localStorage.setItem('ocs_tk_' + key, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
  }
  // fetch JSON with a timeout, cached; a failed or empty result is never cached
  function cachedJSON(key, maxMin, url, pick, opts) {
    var hit = cacheGet(key, maxMin);
    if (hit != null) return Promise.resolve(hit);
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    var o = opts || {};
    if (ctl) o.signal = ctl.signal;
    return fetch(url, o).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error(key + ' ' + r.status);
      return r.json();
    }).then(function (j) {
      var v = pick(j);
      if (v == null || (Array.isArray(v) && !v.length)) throw new Error(key + ' empty');
      cacheSet(key, v);
      return v;
    });
  }
  var NWS_OPTS = { headers: { 'Accept': 'application/geo+json' } };

  function ptParts(d) { // YYYY-MM-DD in Pacific time
    return d.toLocaleDateString('en-CA', { timeZone: TZ });
  }
  function daysBetween(a, b) { // PT calendar days from a to b (YYYY-MM-DD strings)
    return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
  }
  function ago(d) {
    var m = Math.round((Date.now() - d.getTime()) / 60000);
    if (!isFinite(m) || m < 0) return '';
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }
  function whenPT(d) {
    var today = ptParts(new Date()), day = ptParts(d);
    var diff = daysBetween(today, day);
    var time = d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
    var hour = Number(d.toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })) % 24;
    var label = diff === 0 ? (hour >= 17 ? 'tonight' : 'today')
      : diff === 1 ? (hour >= 17 ? 'tomorrow night' : 'tomorrow')
      : d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
    return label + ' ' + time + ' PT';
  }
  function decode(s) {
    var t = document.createElement('textarea');
    t.innerHTML = s;
    return t.value;
  }

  /* ---------- sources ---------- */
  function getStories() {
    return cachedJSON('posts', 5, 'posts/index.json', function (list) {
      if (!Array.isArray(list)) return null;
      return list.filter(function (p) { return p && p.slug && p.title; })
        .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })
        .slice(0, 2)
        .map(function (p) {
          return { slug: p.slug, title: p.title, date: p.date || '', tag: p.tag || '', mins: p.mins || 0 };
        });
    }).then(function (list) {
      var today = ptParts(new Date());
      return list.map(function (p) {
        var isNew = p.date && daysBetween(p.date, today) <= 1;
        return {
          kind: 'ocs', tag: 'OC Scanner', isNew: !!isNew, text: p.title,
          meta: [p.tag, p.mins ? p.mins + ' min read' : ''].filter(Boolean).join(' · '),
          href: 'post.html?p=' + encodeURIComponent(p.slug)
        };
      });
    });
  }

  function getPoint() {
    return cachedJSON('point', 7 * 24 * 60,
      'https://api.weather.gov/points/' + SANTA_ANA.lat + ',' + SANTA_ANA.lon,
      function (j) { return j && j.properties && j.properties.forecast ? { forecast: j.properties.forecast } : null; },
      NWS_OPTS);
  }

  function getForecast() {
    return getPoint().then(function (pt) {
      return cachedJSON('fcst', 30, pt.forecast, function (j) {
        var per = j && j.properties && j.properties.periods;
        if (!per || !per.length) return null;
        return per.slice(0, 2).map(function (p) {
          return {
            name: p.name, temp: p.temperature, day: p.isDaytime, short: p.shortForecast,
            pop: p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value
          };
        });
      }, NWS_OPTS);
    }).then(function (per) {
      return per.map(function (p) {
        var bits = p.short + ', ' + (p.day ? 'high ' : 'low ') + p.temp + '°';
        if (p.pop != null && p.pop >= 20) bits += ' · ' + p.pop + '% chance of rain';
        return { kind: 'wx', tag: 'OC Weather', text: p.name + ': ' + bits, meta: 'NWS San Diego', href: NWS_PAGE, ext: true };
      });
    });
  }

  function getNow() {
    return cachedJSON('obs', 15, 'https://api.weather.gov/stations/' + OBS_STATION + '/observations/latest',
      function (j) {
        var p = j && j.properties; if (!p || !p.temperature || p.temperature.value == null) return null;
        // ignore a stale reading (station offline)
        if (p.timestamp && Date.now() - Date.parse(p.timestamp) > 3 * 3600000) return null;
        return {
          f: Math.round(p.temperature.value * 9 / 5 + 32),
          rh: p.relativeHumidity && p.relativeHumidity.value != null ? Math.round(p.relativeHumidity.value) : null
        };
      }, NWS_OPTS);
  }

  function getAlerts() {
    return cachedJSON('alerts', 5, 'https://api.weather.gov/alerts/active?area=CA', function (j) {
      var f = (j && j.features) || [];
      var seen = {};
      var out = [];
      f.forEach(function (a) {
        var p = a.properties || {};
        var same = (p.geocode && p.geocode.SAME) || [];
        if (same.indexOf(OC_SAME) === -1) return;
        if (p.status && p.status !== 'Actual') return;
        if (seen[p.event]) return;          // one line per alert type
        seen[p.event] = 1;
        out.push({ event: p.event, area: p.areaDesc || '', ends: p.ends || p.expires || '', sev: p.severity || '' });
      });
      return out;
    }, NWS_OPTS).catch(function (e) {
      // "no alerts" is a normal answer: remember it briefly so we don't ask again on every page
      if (/empty/.test(e.message)) { cacheSet('alerts', []); return []; }
      throw e;
    }).then(function (list) {
      return list.map(function (a) {
        var area = a.area.split(';').map(function (s) { return s.trim(); }).filter(function (s) { return /orange|santa ana/i.test(s); }).join(', ') || 'Orange County';
        var until = a.ends ? ' until ' + whenPT(new Date(a.ends)) : '';
        return {
          kind: 'alert', tag: 'NWS · ' + a.event, text: area + until, meta: '',
          href: NWS_PAGE, ext: true, warning: /warning/i.test(a.event)
        };
      });
    });
  }

  function getInsiderWire() {
    return cachedJSON('iw', 15, WORKER + '/rss?url=' + encodeURIComponent(IW_RSS), function (j) {
      var xml = (j && j.contents) || '';
      var items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
      return items.slice(0, 2).map(function (it) {
        function tag(name) {
          var m = it.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>', 'i'));
          return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
        }
        var title = decode(tag('title').replace(/<[^>]+>/g, ''));
        var link = tag('link') || tag('guid');
        if (!/^https:\/\//i.test(link)) link = 'https://insiderwire.com/';
        return title ? { title: title, link: link, date: tag('pubDate') } : null;
      }).filter(Boolean);
    }).then(function (list) {
      return list.map(function (it) {
        var d = it.date ? new Date(it.date) : null;
        var a = d && !isNaN(d) ? ago(d) : '';
        return {
          kind: 'iw', tag: 'Insider Wire', text: it.title,
          meta: 'Partner' + (a ? ' · ' + a : ''), href: it.link, ext: true
        };
      });
    });
  }

  function getLaunch() {
    var url = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?mode=list&limit=3&hide_recent_previous=true&location__ids=' + VANDENBERG_LL_ID;
    function pick(d) {
      var r = (d && d.results) || [];
      return r.filter(function (l) { return /vandenberg/i.test(l.location || '') || l.location == null; })
        .map(function (l) {
          return { name: l.name, net: l.net, st: l.status && l.status.abbrev, prec: l.net_precision && l.net_precision.abbrev };
        });
    }
    return cachedJSON('launch', 60, url, pick).catch(function () {
      // Launch Library throttles busy IPs; the proxy keeps a cached copy of all launches
      return cachedJSON('launch', 60, WORKER + '/launches', function (d) {
        var r = ((d && d.results) || []).filter(function (l) {
          var loc = (l.location || (l.pad && l.pad.location && l.pad.location.name) || '');
          return /vandenberg/i.test(loc);
        });
        return pick({ results: r.map(function (l) { return { name: l.name, net: l.net, status: l.status, net_precision: l.net_precision, location: 'Vandenberg' }; }) });
      });
    }).then(function (list) {
      var now = Date.now();
      var next = list.filter(function (l) {
        var t = Date.parse(l.net);
        var exact = !l.prec || /^(SEC|MIN|HR)$/.test(l.prec);   // skip "sometime that day/month"
        return exact && t > now - 30 * 60000 && t - now < 7 * 86400000;
      })[0];
      if (!next) return [];
      var parts = String(next.name).split('|');
      var rocket = parts[0].replace(/Block \d+/i, '').trim();
      var mission = (parts[1] || '').trim();
      var status = { Go: 'Go', TBC: 'To be confirmed', TBD: 'Time TBD', Hold: 'On hold' }[next.st] || '';
      return [{
        kind: 'launch', tag: 'Launch',
        text: rocket + (mission ? ' · ' + mission : '') + ' from Vandenberg · ' + whenPT(new Date(next.net)),
        meta: status, href: 'space.html'
      }];
    });
  }

  function getElection() {
    var today = ptParts(new Date());
    var d = daysBetween(today, ELECTION_DAY);
    var text, meta;
    if (d > 1) { text = 'Results board goes live Tuesday, Nov. 3'; meta = d + ' days out'; }
    else if (d === 1) { text = 'Results board goes live tomorrow'; meta = 'California polls close 8 PM PT'; }
    else if (d === 0) { text = 'Live results tonight on the Elections board'; meta = 'California polls close 8 PM PT'; }
    else if (d >= -14) { text = 'Results are still coming in · follow the count'; meta = 'Elections board'; }
    else return Promise.resolve([]);
    return Promise.resolve([{ kind: 'elex', tag: 'Elections', text: text, meta: meta, href: 'elections.html' }]);
  }

  /* ---------- assemble ---------- */
  function settle(p) {
    return p.then(function (v) { return v || []; }, function () { return []; });
  }
  // Starts every source once. Returns two promises over the same requests:
  // `quick` gives up on anything slower than `waitMs`, `full` waits for all.
  function load(waitMs) {
    var jobs = [getStories, getForecast, getInsiderWire, getLaunch, getElection, getAlerts, getNow]
      .map(function (fn) { return settle(fn()); });
    function cutoff(p) {
      return Promise.race([p, new Promise(function (res) { setTimeout(function () { res([]); }, waitMs); })]);
    }
    return { quick: Promise.all(jobs.map(cutoff)).then(assemble), full: Promise.all(jobs).then(assemble) };
  }
  function assemble(r) {
    var S = r[0], W = r[1], I = r[2], L = r[3], E = r[4], A = r[5], now = r[6];
    var pins = A.filter(function (a) { return a.warning; });
    var watches = A.filter(function (a) { return !a.warning; });
    var wx = watches.concat(W);  // advisories/watches lead the weather slots
    var order = [S[0], wx[0], I[0], L[0], S[1], wx[1], I[1], E[0]].filter(Boolean);
    return { pins: pins, items: order, now: Array.isArray(now) ? null : now };
  }

  /* ---------- render ---------- */
  var state = { data: null, sig: '', paused: false, idx: 0, timer: null, mode: '' };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function itemNode(it, hidden) {
    var a = el('a', 'tk-item tk-' + it.kind);
    a.href = it.href;
    if (it.ext) { a.target = '_blank'; a.rel = 'noopener'; }
    if (hidden) { a.setAttribute('aria-hidden', 'true'); a.tabIndex = -1; }
    a.appendChild(el('span', 'tk-tag', it.tag));
    if (it.isNew) a.appendChild(el('span', 'tk-new', 'New'));
    a.appendChild(el('span', 'tk-text', it.text));
    if (it.meta) a.appendChild(el('span', 'tk-meta', it.meta));
    return a;
  }
  function currentMode() {
    return ((mqNarrow && mqNarrow.matches) || (mqReduce && mqReduce.matches)) ? 'rotate' : 'crawl';
  }

  function render() {
    var d = state.data;
    // too little came back (feeds down): keep the original static strip
    if (!d || (d.items.length < 2 && !d.pins.length)) return;
    clearInterval(state.timer);
    state.mode = currentMode();

    host.className = 'ticker tk-live tk-' + state.mode + (d.pins.length ? ' tk-alerting' : '') + (state.paused ? ' tk-paused' : '');
    host.removeAttribute('aria-hidden');
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Live ticker');
    host.innerHTML = '';

    // label doubles as the pause button
    var btn = el('button', 'ticker-label tk-label');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
    btn.setAttribute('aria-label', (state.paused ? 'Resume' : 'Pause') + ' ticker');
    btn.title = state.paused ? 'Resume' : 'Pause';
    btn.appendChild(el('span', 'tk-label-text', d.pins.length ? 'Alert' : 'Live'));
    btn.addEventListener('click', function () {
      state.paused = !state.paused;
      render();
      var b = host.querySelector('.tk-label'); if (b) b.focus();
    });
    host.appendChild(btn);

    // one-at-a-time mode: warnings take every other slot instead of a pinned box
    var list = d.items;
    if (state.mode === 'rotate' && d.pins.length) {
      list = [];
      var n = Math.max(d.items.length, 1);
      for (var k = 0; k < n; k++) {
        list.push(d.pins[k % d.pins.length]);
        if (d.items[k]) list.push(d.items[k]);
      }
    }

    // pinned NWS warnings (crawl mode)
    if (state.mode === 'crawl' && d.pins.length) {
      var pin = el('div', 'tk-pins');
      d.pins.slice(0, 2).forEach(function (p) { pin.appendChild(itemNode(p)); });
      host.appendChild(pin);
    }

    var wrap = el('div', 'tk-wrap');
    host.appendChild(wrap);

    if (list.length) {
      if (state.mode === 'crawl') {
        var track = el('div', 'tk-track');
        d.items.forEach(function (it) { track.appendChild(itemNode(it)); });
        d.items.forEach(function (it) { track.appendChild(itemNode(it, true)); });
        wrap.appendChild(track);
        requestAnimationFrame(function () {
          var half = track.scrollWidth / 2;
          track.style.animationDuration = Math.max(30, Math.round(half / CRAWL_PX_PER_SEC)) + 's';
        });
      } else {
        var slot = el('div', 'tk-slot');
        wrap.appendChild(slot);
        var count = el('span', 'tk-count');
        count.setAttribute('aria-hidden', 'true');
        host.appendChild(count);
        var show = function () {
          var i = state.idx % list.length;
          slot.innerHTML = '';
          slot.appendChild(itemNode(list[i]));
          count.textContent = (i + 1) + '/' + list.length;
        };
        show();
        if (!state.paused && list.length > 1) {
          state.timer = setInterval(function () {
            if (host.matches(':hover') || host.contains(document.activeElement)) return;
            slot.classList.add('tk-out');
            setTimeout(function () {
              state.idx = (state.idx + 1) % list.length;
              show();
              slot.classList.remove('tk-out');
            }, (mqReduce && mqReduce.matches) ? 0 : 260);
          }, ROTATE_MS);
        }
      }
    }

    // current Santa Ana temperature (wide screens)
    if (d.now) {
      var nowA = el('a', 'tk-now');
      nowA.href = NWS_PAGE; nowA.target = '_blank'; nowA.rel = 'noopener';
      nowA.appendChild(el('span', 'tk-now-k', 'Santa Ana now'));
      nowA.appendChild(el('span', 'tk-now-v', d.now.f + '°' + (d.now.rh != null ? ' · ' + d.now.rh + '% RH' : '')));
      host.appendChild(nowA);
    }
  }

  function update(data) {
    var sig = JSON.stringify(data);
    if (sig === state.sig) return;
    state.sig = sig;
    state.data = data;
    render();
  }

  // first paint: whatever arrives within a few seconds (cached sources are instant),
  // then repaint once if a slower source fills in
  var first = load(FIRST_PAINT_WAIT_MS);
  first.quick.then(function (d) {
    update(d);
    first.full.then(update);
  });

  setInterval(function () {
    if (document.hidden) return;
    load(FIRST_PAINT_WAIT_MS).full.then(update);
  }, REFRESH_MS);

  function onModeChange() { if (state.data && currentMode() !== state.mode) render(); }
  [mqNarrow, mqReduce].forEach(function (mq) {
    if (!mq) return;
    if (mq.addEventListener) mq.addEventListener('change', onModeChange);
    else if (mq.addListener) mq.addListener(onModeChange);
  });
})();

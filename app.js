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

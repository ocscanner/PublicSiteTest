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

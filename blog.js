/* ============================================================
   OC SCANNER — file-based blog engine
   Posts live as markdown files in the /posts folder of your repo.
   To publish: drop a new .md file in /posts (with the front-matter
   block shown in the sample posts) and commit. It appears automatically.

   EDIT-REPO: point these at your repo. Right now: ocscanner/PublicSiteTest.
   (When you move to a different repo or the ocscanner.github.io root repo,
   update owner/repo/branch here — this is the only place it lives.)
   ============================================================ */
(function(){
  "use strict";
  var REPO = { owner:'ocscanner', repo:'PublicSiteTest', branch:'main', dir:'posts' };

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function fmtDate(d){
    if(!d) return '';
    var dt = new Date(String(d)+'T00:00:00');
    if(isNaN(dt)) return d;
    return dt.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  }
  // Split a "--- front matter --- body" file into { meta, body }
  function parseFM(text){
    var m = String(text).match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
    if(!m) return { meta:{}, body:String(text) };
    var meta = {};
    m[1].split(/\r?\n/).forEach(function(line){
      var i = line.indexOf(':'); if(i < 0) return;
      var k = line.slice(0,i).trim().toLowerCase();
      var v = line.slice(i+1).trim().replace(/^["']|["']$/g,'');
      if(k) meta[k] = v;
    });
    return { meta:meta, body:m[2] };
  }
  function firstPara(body){
    var t = (body||'').replace(/^#{1,6}\s.*$/gm,'').replace(/[#*_>`]/g,'').trim();
    var p = t.split(/\n\s*\n/)[0] || '';
    return p.length > 170 ? p.slice(0,170)+'\u2026' : p;
  }

  var apiURL = 'https://api.github.com/repos/'+REPO.owner+'/'+REPO.repo+'/contents/'+REPO.dir+'?ref='+REPO.branch;
  function rawURL(slug){
    return 'https://raw.githubusercontent.com/'+REPO.owner+'/'+REPO.repo+'/'+REPO.branch+'/'+REPO.dir+'/'+encodeURIComponent(slug)+'.md';
  }

  function list(){
    try{ var c = JSON.parse(sessionStorage.getItem('ocblog')||'null'); if(c && Date.now()-c.t < 300000) return Promise.resolve(c.posts); }catch(e){}
    return fetch(apiURL).then(function(r){ if(!r.ok) throw new Error('list '+r.status); return r.json(); }).then(function(files){
      var mds = (files||[]).filter(function(f){ return /\.md$/i.test(f.name); });
      return Promise.all(mds.map(function(f){
        return fetch(f.download_url).then(function(r){ return r.text(); }).then(function(t){
          var fm = parseFM(t), slug = f.name.replace(/\.md$/i,'');
          return { slug:slug, title:fm.meta.title||slug, date:fm.meta.date||'', tag:fm.meta.tag||'', author:fm.meta.author||'', excerpt:fm.meta.excerpt||firstPara(fm.body) };
        }).catch(function(){ return null; });
      }));
    }).then(function(posts){
      posts = posts.filter(Boolean).sort(function(a,b){ return String(b.date).localeCompare(String(a.date)); });
      try{ sessionStorage.setItem('ocblog', JSON.stringify({t:Date.now(), posts:posts})); }catch(e){}
      return posts;
    });
  }
  function getPost(slug){
    return fetch(rawURL(slug)).then(function(r){ if(!r.ok) throw new Error('post '+r.status); return r.text(); }).then(parseFM);
  }
  function card(p){
    return '<a class="blog-card" href="post.html?p='+encodeURIComponent(p.slug)+'">'
      + (p.tag ? '<span class="blog-tag">'+esc(p.tag)+'</span>' : '')
      + '<h3>'+esc(p.title)+'</h3>'
      + (p.date ? '<div class="blog-date">'+fmtDate(p.date)+'</div>' : '')
      + (p.excerpt ? '<p>'+esc(p.excerpt)+'</p>' : '')
      + '</a>';
  }

  // ---- render whichever surface exists on this page ----
  var listBox = document.getElementById('blog-list');   // blog.html
  var homeBox = document.getElementById('home-stories'); // index.html strip
  var postBody = document.getElementById('post-body');   // post.html

  if(listBox){
    list().then(function(posts){
      listBox.innerHTML = posts.length
        ? posts.map(card).join('')
        : '<div class="blog-empty">No stories yet \u2014 your first post will appear here.</div>';
    }).catch(function(){
      listBox.innerHTML = '<div class="blog-empty">Couldn\u2019t load stories right now. Make sure a <code>posts</code> folder exists in the repo.</div>';
    });
  }

  if(homeBox){
    list().then(function(posts){
      var wrap = document.getElementById('latest-stories');
      if(!posts.length){ if(wrap) wrap.style.display = 'none'; return; }
      homeBox.innerHTML = posts.slice(0,3).map(card).join('');
    }).catch(function(){ var wrap = document.getElementById('latest-stories'); if(wrap) wrap.style.display='none'; });
  }

  if(postBody){
    var slug = new URLSearchParams(location.search).get('p');
    var titleEl = document.getElementById('post-title'), metaEl = document.getElementById('post-meta');
    if(!slug){
      if(titleEl) titleEl.textContent = 'No story specified';
      postBody.innerHTML = '<p><a href="blog.html">Back to all stories</a>.</p>';
    } else {
      getPost(slug).then(function(post){
        var m = post.meta;
        document.title = (m.title || 'Story') + ' \u2014 OC Scanner';
        if(titleEl) titleEl.textContent = m.title || slug;
        if(metaEl) metaEl.innerHTML = [
          m.tag ? '<span class="blog-tag">'+esc(m.tag)+'</span>' : '',
          m.date ? fmtDate(m.date) : '',
          m.author ? 'By '+esc(m.author) : ''
        ].filter(Boolean).join(' <span class="post-dot">\u00b7</span> ');
        postBody.innerHTML = (window.marked && window.marked.parse) ? window.marked.parse(post.body) : '<pre>'+esc(post.body)+'</pre>';
      }).catch(function(){
        if(titleEl) titleEl.textContent = 'Story not found';
        postBody.innerHTML = '<p>That story couldn\u2019t be loaded. <a href="blog.html">Back to all stories</a>.</p>';
      });
    }
  }
})();

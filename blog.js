/* ============================================================
   OC SCANNER — News engine (file-based)
   Each news report is a markdown file in the /posts folder of the repo.
   To publish: drop a new .md file in /posts (with the front-matter
   block below) and commit. It appears on News and the homepage.

   Front matter a report can use:
     title:    Headline
     date:     2026-10-24        (YYYY-MM-DD publish date — newest leads the homepage)
     updated:  2026-10-25        (optional — shows "Updated <date>" in the byline)
     dateline: SANTA ANA         (optional — printed in caps before the first paragraph)
     tag:      Public Safety     (section label)
     author:   Christian
     excerpt:  One-line summary  (otherwise the first paragraph is used)
     image:    posts/img/x.jpg   (optional photo on the homepage lead card)
     featured: true              (pins this post as the homepage lead,
                                  even when newer posts exist)
   A post dated within the last 5 days (or featured) leads the homepage;
   otherwise the AI Digest leads and recent posts list under it.

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

  function readMins(body){
    var words = String(body||'').replace(/[#*_>`\[\]()!-]/g,' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words/220));
  }
  function ageDays(d){
    var dt = new Date(String(d)+'T00:00:00');
    return isNaN(dt) ? Infinity : (Date.now()-dt.getTime())/86400000;
  }
  var FRESH_DAYS = 7; // how long the lead card shows the red "New" label

  var apiURL ='https://api.github.com/repos/'+REPO.owner+'/'+REPO.repo+'/contents/'+REPO.dir+'?ref='+REPO.branch;
  function rawURL(slug){
    return 'https://raw.githubusercontent.com/'+REPO.owner+'/'+REPO.repo+'/'+REPO.branch+'/'+REPO.dir+'/'+encodeURIComponent(slug)+'.md';
  }

  function list(){
    try{ var c = JSON.parse(sessionStorage.getItem('ocblog')||'null'); if(c && Date.now()-c.t < 300000) return Promise.resolve(c.posts); }catch(e){}
    return fetch(apiURL).then(function(r){ if(!r.ok) throw new Error('list '+r.status); return r.json(); }).then(function(files){
      var mds = (files||[]).filter(function(f){ return /\.md$/i.test(f.name) && f.name.charAt(0) !== '_'; });
      return Promise.all(mds.map(function(f){
        return fetch(f.download_url).then(function(r){ return r.text(); }).then(function(t){
          var fm = parseFM(t), slug = f.name.replace(/\.md$/i,'');
          return { slug:slug, title:fm.meta.title||slug, date:fm.meta.date||'', tag:fm.meta.tag||'', author:fm.meta.author||'',
                   excerpt:fm.meta.excerpt||firstPara(fm.body), image:fm.meta.image||'',
                   featured:/^(true|yes|1)$/i.test(fm.meta.featured||''), mins:readMins(fm.body) };
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
  var listBox = document.getElementById('blog-list');   // news.html
  var postBody = document.getElementById('post-body');   // post.html

  if(listBox){
    list().then(function(posts){
      listBox.innerHTML = posts.length
        ? posts.map(card).join('')
        : '<div class="blog-empty">No reports have been published yet. Check back soon, or follow <a href="https://x.com/OC_Scanner" target="_blank" rel="noopener">@OC_Scanner</a> for breaking updates.</div>';
    }).catch(function(){
      listBox.innerHTML = '<div class="blog-empty">News couldn\u2019t be loaded right now. Please try again in a moment.</div>';
    });
  }

  function href(p){ return 'post.html?p='+encodeURIComponent(p.slug); }
  function metaLine(p){
    return [p.date ? fmtDate(p.date) : '', p.mins ? p.mins+' min read' : ''].filter(Boolean).join(' · ');
  }
  function leadCard(p){
    var fresh = ageDays(p.date) <= FRESH_DAYS;
    return '<a class="lead-story'+(p.image?' has-img':'')+'" href="'+href(p)+'">'
      + (p.image ? '<div class="lead-img"><img src="'+esc(p.image)+'" alt="" loading="lazy"></div>' : '')
      + '<div class="lead-body">'
      +   '<div class="lead-kicker">'
      +     (fresh ? '<span class="lead-new">New</span>' : '')
      +     (p.tag ? '<span class="blog-tag">'+esc(p.tag)+'</span>' : '')
      +   '</div>'
      +   '<h3>'+esc(p.title)+'</h3>'
      +   (p.excerpt ? '<p>'+esc(p.excerpt)+'</p>' : '')
      +   '<div class="lead-meta">'+esc(metaLine(p))+(p.author?' · By '+esc(p.author):'')+'</div>'
      +   '<span class="lead-cta">Read the story &rarr;</span>'
      + '</div></a>';
  }
  function sideItem(p){
    return '<a class="side-story" href="'+href(p)+'">'
      + (p.tag ? '<span class="blog-tag">'+esc(p.tag)+'</span>' : '')
      + '<h4>'+esc(p.title)+'</h4>'
      + '<div class="side-meta">'+esc(metaLine(p))+'</div>'
      + '</a>';
  }

  // ---- News-first front page (index.html) ----
  // A post leads only while it's fresh (or marked `featured: true`);
  // otherwise the AI Digest keeps the lead slot so the top never goes stale.
  var FRONT_FRESH_DAYS = 5;
  var front = document.getElementById('front');
  var frontLead = document.getElementById('front-lead');
  if(front && frontLead){
    list().then(function(posts){
      var lead = posts.filter(function(p){ return p.featured; })[0]
              || posts.filter(function(p){ return ageDays(p.date) <= FRONT_FRESH_DAYS; })[0];
      if(lead){
        frontLead.innerHTML = leadCard(lead);
        frontLead.hidden = false;
        front.setAttribute('data-mode','story');
      }
      var rest = posts.filter(function(p){ return p !== lead; });
      // Digest leads → show the two newest posts under it as a compact list
      var latest = document.getElementById('front-latest');
      if(!lead && latest && rest.length){
        latest.className = 'front-latest side-stories';
        latest.innerHTML = '<div class="front-latest-head"><span>Latest from the desk</span><a href="news.html">All news &rarr;</a></div>'
          + rest.slice(0,2).map(sideItem).join('');
        latest.hidden = false;
        rest = rest.slice(2);
      }
      rest = rest.slice(0,3);
      var more = document.getElementById('more-stories');
      var moreList = document.getElementById('more-stories-list');
      if(more && moreList && rest.length){
        moreList.innerHTML = rest.map(card).join('');
        more.hidden = false;
      }
    }).catch(function(){ /* stay in digest mode */ });
  }

  if(postBody){
    var slug = new URLSearchParams(location.search).get('p');
    var titleEl = document.getElementById('post-title'), metaEl = document.getElementById('post-meta');
    var BACK = '<p><a href="news.html">Back to all news</a>.</p>';
    if(!slug){
      if(titleEl) titleEl.textContent = 'No report specified';
      postBody.innerHTML = BACK;
    } else {
      getPost(slug).then(function(post){
        var m = post.meta;
        document.title = (m.title || 'News') + ' — OC Scanner';
        if(titleEl) titleEl.textContent = m.title || slug;

        // Byline: section · By author · Published date · Updated date
        if(metaEl) metaEl.innerHTML = [
          m.tag ? '<span class="blog-tag">'+esc(m.tag)+'</span>' : '',
          m.author ? '<span class="post-by">By '+esc(m.author)+'</span>' : '',
          m.date ? 'Published <time datetime="'+esc(m.date)+'">'+fmtDate(m.date)+'</time>' : '',
          (m.updated && m.updated !== m.date) ? 'Updated <time datetime="'+esc(m.updated)+'">'+fmtDate(m.updated)+'</time>' : ''
        ].filter(Boolean).join(' <span class="post-dot">·</span> ');

        postBody.innerHTML = (window.marked && window.marked.parse) ? window.marked.parse(post.body) : '<pre>'+esc(post.body)+'</pre>';

        // Dateline, e.g. "SANTA ANA —" at the start of the first paragraph
        if(m.dateline){
          var first = postBody.querySelector('p');
          if(first){
            var dl = document.createElement('span');
            dl.className = 'post-dateline';
            dl.textContent = String(m.dateline).toUpperCase() + ' — ';
            first.insertBefore(dl, first.firstChild);
          }
        }

        var corr = document.getElementById('post-corrections');
        if(corr) corr.hidden = false;

        // Structured data so search engines read this as a news article
        try{
          var page = 'https://ocscanner.media/post?p=' + encodeURIComponent(slug);
          var ld = {
            '@context':'https://schema.org', '@type':'NewsArticle',
            headline: m.title || slug,
            mainEntityOfPage: page,
            datePublished: m.date || undefined,
            dateModified: m.updated || m.date || undefined,
            author: m.author ? { '@type':'Person', name: m.author } : { '@type':'Organization', name:'OC Scanner' },
            publisher: { '@type':'NewsMediaOrganization', name:'OC Scanner', url:'https://ocscanner.media/' },
            image: m.image ? [ /^https?:/.test(m.image) ? m.image : 'https://ocscanner.media/' + m.image.replace(/^\//,'') ] : [ 'https://ocscanner.media/og-image.png' ],
            description: m.excerpt || undefined,
            articleSection: m.tag || undefined
          };
          var tag = document.createElement('script');
          tag.type = 'application/ld+json';
          tag.textContent = JSON.stringify(ld);
          document.head.appendChild(tag);
        }catch(e){}
      }).catch(function(){
        if(titleEl) titleEl.textContent = 'Report not found';
        postBody.innerHTML = '<p>That report couldn’t be loaded. It may have been moved or unpublished.</p>' + BACK;
      });
    }
  }
})();

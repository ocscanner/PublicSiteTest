// OC Scanner — Cloudflare Pages build
// Runs on every deploy (build command: node build.mjs, output: dist).
//  1. Copies the live site into dist/, leaving repo-only files out.
//  2. Builds posts/index.json (the news list the site reads, so no GitHub API calls).
//  3. Builds sitemap.xml for every page and published story.
// No packages needed.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://ocscanner.media';
const OUT = 'dist';

// Files and folders that stay in the repo but never go on the live site
const SKIP = new Set(['.git', '.github', 'node_modules', OUT, 'functions', 'build.mjs',
  'package.json', 'package-lock.json', 'README.md', 'wrangler.toml', '.gitignore', '.DS_Store']);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const name of readdirSync('.')) {
  if (SKIP.has(name) || name.startsWith('.')) continue;
  cpSync(name, join(OUT, name), {
    recursive: true,
    filter: (src) => !/(^|\/)(README\.md|\.DS_Store)$/.test(src) && !/(^|\/)posts\/_[^/]*$/.test(src),
  });
}

// ---- news list ----
function parseFM(text) {
  const m = String(text).match(/^﻿?---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: String(text) };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':'); if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (k) meta[k] = v;
  }
  return { meta, body: m[2] };
}
const firstPara = (body) => {
  const t = (body || '').replace(/<!--[\s\S]*?-->/g, '').replace(/^#{1,6}\s.*$/gm, '').replace(/[#*_>`]/g, '').trim();
  const p = t.split(/\n\s*\n/)[0] || '';
  return p.length > 170 ? p.slice(0, 170) + '…' : p;
};
const readMins = (body) => Math.max(1, Math.round(String(body || '').replace(/[#*_>`[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length / 220));

const posts = [];
if (existsSync('posts')) {
  for (const f of readdirSync('posts')) {
    if (!/\.md$/i.test(f) || f.startsWith('_')) continue;
    const { meta, body } = parseFM(readFileSync(join('posts', f), 'utf8'));
    if (/^(true|yes|1)$/i.test(meta.draft || '')) {           // drafts never publish
      rmSync(join(OUT, 'posts', f), { force: true });
      continue;
    }
    const slug = f.replace(/\.md$/i, '');
    posts.push({
      slug, title: meta.title || slug, date: meta.date || '', updated: meta.updated || '',
      tag: meta.tag || '', author: meta.author || '', excerpt: meta.excerpt || firstPara(body),
      image: meta.image || '', featured: /^(true|yes|1)$/i.test(meta.featured || ''), mins: readMins(body),
      home: !/^(false|no|0)$/i.test(meta.homepage || ''),
    });
  }
}
posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
mkdirSync(join(OUT, 'posts'), { recursive: true });
writeFileSync(join(OUT, 'posts', 'index.json'), JSON.stringify(posts));

// ---- sitemap ----
const pages = ['', 'news', 'live', 'elections', 'space', 'community', 'store', 'tips', 'donate', 'about'];
const today = new Date().toISOString().slice(0, 10);
const urls = pages.map((p) => `  <url><loc>${SITE}/${p}</loc><lastmod>${today}</lastmod></url>`);
for (const p of posts) {
  const mod = p.updated || p.date;
  urls.push(`  <url><loc>${SITE}/post?p=${encodeURIComponent(p.slug)}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</url>`);
}
writeFileSync(join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

const size = (d) => readdirSync(d).reduce((n, f) => n + (statSync(join(d, f)).isDirectory() ? size(join(d, f)) : 1), 0);
console.log(`Built ${OUT}/: ${size(OUT)} files, ${posts.length} published stories, sitemap with ${urls.length} URLs.`);

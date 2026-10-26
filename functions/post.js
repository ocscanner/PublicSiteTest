// Cloudflare Pages Function for /post?p=<slug>
// Puts the story's own headline, excerpt and image into the page before it's sent,
// so links shared on X, iMessage or Discord show that story instead of the generic card.
const SITE = 'https://ocscanner.media';

function parseFM(text) {
  const m = String(text).match(/^﻿?---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: String(text) };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':'); if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    if (k) meta[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2] };
}
function firstPara(body) {
  const t = (body || '').replace(/<!--[\s\S]*?-->/g, '').replace(/^#{1,6}\s.*$/gm, '').replace(/[#*_>`]/g, '').trim();
  const p = t.split(/\n\s*\n/)[0] || '';
  return p.length > 200 ? p.slice(0, 200) + '…' : p;
}

class SetAttr {
  constructor(attr, value) { this.attr = attr; this.value = value; }
  element(el) { el.setAttribute(this.attr, this.value); }
}
class SetText {
  constructor(value) { this.value = value; }
  element(el) { el.setInnerContent(this.value); }
}

export async function onRequestGet(context) {
  const { request, env, next } = context;
  const page = await next();                                   // the normal post.html
  const slug = new URL(request.url).searchParams.get('p') || '';
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(slug) || slug.startsWith('_')) return page;

  let story;
  try {
    const res = await env.ASSETS.fetch(new Request(`${new URL(request.url).origin}/posts/${slug}.md`));
    if (!res.ok) return page;
    story = parseFM(await res.text());
  } catch (e) { return page; }
  const m = story.meta;
  if (/^(true|yes|1)$/i.test(m.draft || '')) return page;

  const title = m.title || slug;
  const desc = m.excerpt || firstPara(story.body) || 'OC Scanner news report.';
  const url = `${SITE}/post?p=${encodeURIComponent(slug)}`;
  const image = m.image ? (/^https?:/i.test(m.image) ? m.image : `${SITE}/${m.image.replace(/^\//, '')}`) : `${SITE}/og-image.png`;

  return new HTMLRewriter()
    .on('title', new SetText(`${title} — OC Scanner`))
    .on('meta[name="description"]', new SetAttr('content', desc))
    .on('link[rel="canonical"]', new SetAttr('href', url))
    .on('meta[property="og:title"]', new SetAttr('content', title))
    .on('meta[property="og:description"]', new SetAttr('content', desc))
    .on('meta[property="og:type"]', new SetAttr('content', 'article'))
    .on('meta[property="og:url"]', new SetAttr('content', url))
    .on('meta[property="og:image"]', new SetAttr('content', image))
    .on('meta[name="twitter:title"]', new SetAttr('content', title))
    .on('meta[name="twitter:description"]', new SetAttr('content', desc))
    .on('meta[name="twitter:image"]', new SetAttr('content', image))
    .transform(page);
}

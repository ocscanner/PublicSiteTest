// Cloudflare Pages Function for /news/<section>, e.g. /news/fire
// Serves the News page with that section's own title, description and share card.
// - Unknown section: the 404 page.
// - Known section with no stories yet: sent back to /news (sections stay hidden until they have stories).
// The page's links and scripts are relative (styles.css, blog.js, news.json), so a
// <base href="/"> is added to keep them pointing at the site root from /news/<section>.
import { sectionBySlug, sectionOf } from '../../lib/sections.js';
import { loadNews } from '../../lib/news.js';
import { SITE } from '../../lib/cms.js';

class SetAttr {
  constructor(attr, value) { this.attr = attr; this.value = value; }
  element(el) { el.setAttribute(this.attr, this.value); }
}
class SetText {
  constructor(value) { this.value = value; }
  element(el) { el.setInnerContent(this.value); }
}
const addBase = { element(el) { el.prepend('<base href="/">', { html: true }); } };

async function notFound(request, env) {
  const page = await env.ASSETS.fetch(new Request(new URL('/404.html', request.url)));
  const out = new HTMLRewriter().on('head', addBase).transform(page);
  return new Response(out.body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function onRequestGet({ request, env, params }) {
  const slug = String(params.section || '');
  const sec = sectionBySlug(slug.toLowerCase());
  if (!sec) return notFound(request, env);
  if (slug !== sec.slug) return Response.redirect(`${new URL(request.url).origin}/news/${sec.slug}`, 301);

  const { list } = await loadNews(request, env);
  // Only redirect when we actually got a list; if everything failed, let the page try in the browser.
  if (list.length && !list.some((p) => { const s = sectionOf(p.tag); return s && s.slug === sec.slug; })) {
    return Response.redirect(`${new URL(request.url).origin}/news`, 302);
  }

  const page = await env.ASSETS.fetch(new Request(new URL('/news', request.url)));
  if (!page.ok) return page;
  const url = `${SITE}/news/${sec.slug}`;
  const title = `${sec.name} — OC Scanner News`;
  return new HTMLRewriter()
    .on('head', addBase)
    .on('title', new SetText(title))
    .on('meta[name="description"]', new SetAttr('content', sec.blurb))
    .on('link[rel="canonical"]', new SetAttr('href', url))
    .on('meta[property="og:title"]', new SetAttr('content', title))
    .on('meta[property="og:description"]', new SetAttr('content', sec.blurb))
    .on('meta[property="og:url"]', new SetAttr('content', url))
    .on('meta[name="twitter:title"]', new SetAttr('content', title))
    .on('meta[name="twitter:description"]', new SetAttr('content', sec.blurb))
    .transform(page);
}

// OC Scanner — Command Center stories on the public site (P04)
// Shared by the Pages Functions in /functions. Stories published at
// admin.ocscanner.media are read on the server (no browser cross-site calls),
// merged with the Markdown files in /posts, and served from this site.
//
// ON/OFF SWITCH: set enabled to false and deploy to go back to files only.
// Which Command Center is used depends on the address the page is served from:
//   ocscanner.media / www            → production (admin.ocscanner.media)
//   *.ocscanner-media.pages.dev      → staging (staging-admin.ocscanner.media)
//   localhost                        → staging
export const CMS = {
  enabled: true,
  production: 'https://admin.ocscanner.media',
  staging: 'https://staging-admin.ocscanner.media',
  // How long this site keeps a copy of the Command Center's answers (seconds).
  cacheSeconds: 30,
  timeoutMs: 4000,
};

export const SITE = 'https://ocscanner.media';

export function apiOriginFor(requestUrl, env) {
  if (!CMS.enabled || (env && env.CMS_ENABLED === 'false')) return null;
  // Optional override (Pages → Settings → Variables): CMS_API_ORIGIN, e.g. for local testing.
  const override = (env && env.CMS_API_ORIGIN) || '';
  if (/^https:\/\/[a-z0-9.-]+$/i.test(override) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(override)) return override;
  const host = new URL(requestUrl).hostname;
  if (host === 'ocscanner.media' || host === 'www.ocscanner.media') return CMS.production;
  return CMS.staging;
}

const SLUG = /^[a-z0-9-]{1,180}$/;
const MEDIA_PATH = /^\/api\/v1\/media\/[0-9a-f-]{36}$/i;

async function getJSON(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CMS.timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      redirect: 'manual',   // a redirect means the Access login page, not the public feed
      signal: ctl.signal,
      cf: { cacheTtl: CMS.cacheSeconds, cacheEverything: true },
    });
    if (res.status >= 300 && res.status < 400) throw new Error('Command Center redirected (Access login?)');
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Command Center answered ${res.status}`);
    if (!(res.headers.get('content-type') || '').includes('application/json')) {
      throw new Error('Command Center did not answer with JSON (Access login page?)');
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function mediaUrl(apiOrigin, media) {
  if (!media || typeof media.url !== 'string') return '';
  try {
    const url = new URL(media.url, apiOrigin);
    return url.origin === new URL(apiOrigin).origin && MEDIA_PATH.test(url.pathname) && !url.search ? url.href : '';
  } catch (e) { return ''; }
}

// YYYY-MM-DD in Pacific time, the format the story files use.
export function pacificDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

// A Command Center story in the same shape as an entry in posts/index.json.
export function toListEntry(apiOrigin, a) {
  const date = pacificDate(a.publishedAt);
  const updated = pacificDate(a.updatedAt);
  return {
    slug: a.slug,
    title: a.headline,
    date,
    updated: updated && updated !== date ? updated : '',
    tag: a.category ? a.category.name : '',
    author: a.authorName || '',
    excerpt: a.summary || '',
    image: mediaUrl(apiOrigin, a.featuredImage),
    featured: !!a.isFeatured,
    breaking: !!a.isBreaking,
    developing: !!a.isDeveloping,
    mins: 0,
    home: a.showOnHomepage !== false,
    publishedAt: a.publishedAt,
    source: 'cc',
  };
}

// Every published Command Center story (newest first), up to 200.
export async function cmsList(apiOrigin) {
  const out = [];
  for (let page = 1; page <= 4; page++) {
    const data = await getJSON(`${apiOrigin}/api/v1/articles?pageSize=50&page=${page}`);
    if (!data || !Array.isArray(data.items)) throw new Error('Unexpected story list');
    for (const a of data.items) if (a && SLUG.test(a.slug || '')) out.push(toListEntry(apiOrigin, a));
    if (!data.pagination || page >= data.pagination.totalPages) break;
  }
  return out;
}

// One published story, with photo addresses pointing at the Command Center.
export async function cmsStory(apiOrigin, slug) {
  if (!SLUG.test(slug || '')) return null;
  const data = await getJSON(`${apiOrigin}/api/v1/articles/${encodeURIComponent(slug)}`);
  if (!data || !data.article || typeof data.article.bodyHtml !== 'string') return null;
  const a = data.article;
  const bodyHtml = a.bodyHtml.replace(/(<img\b[^>]*\ssrc=")(\/api\/v1\/media\/[0-9a-f-]{36})(")/gi,
    (m, pre, path, post) => pre + apiOrigin + path + post);
  return Object.assign(toListEntry(apiOrigin, a), {
    bodyHtml,
    seoTitle: a.seoTitle || '',
    seoDescription: a.seoDescription || '',
    words: bodyHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length,
  });
}

// Files and Command Center stories together. A Command Center story wins when
// both have the same address (a story moved over keeps its address on purpose).
export function mergeLists(files, cms) {
  const bySlug = new Map();
  for (const p of files || []) if (p && p.slug) bySlug.set(String(p.slug).toLowerCase(), Object.assign({ source: 'file' }, p));
  for (const p of cms || []) bySlug.set(p.slug.toLowerCase(), p);
  const when = (p) => p.publishedAt || (p.date ? p.date + 'T20:00:00Z' : '');
  return [...bySlug.values()].sort((a, b) => String(when(b)).localeCompare(String(when(a))));
}

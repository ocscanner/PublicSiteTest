// Cloudflare Pages Function for /sitemap.xml
// The built sitemap (pages + story files) plus Command Center stories, so a new
// story is listed without a rebuild. Falls back to the built file.
import { apiOriginFor, cmsList, SITE } from '../lib/cms.js';

export async function onRequestGet({ request, env, next }) {
  const built = await next();
  const api = apiOriginFor(request.url, env);
  if (!api || !built.ok) return built;
  let xml;
  try { xml = await built.clone().text(); } catch (e) { return built; }
  let stories;
  try { stories = await cmsList(api); } catch (e) { return built; }

  const urls = [];
  for (const p of stories) {
    const loc = `${SITE}/post?p=${encodeURIComponent(p.slug)}`;
    if (xml.includes(`<loc>${loc}</loc>`)) {
      // A moved story: keep one entry, with the Command Center's date.
      const mod = p.updated || p.date;
      if (mod) xml = xml.replace(new RegExp(`(<loc>${loc.replace(/[.?*+^$()[\]{}|\\]/g, '\\$&')}</loc>)(<lastmod>[^<]*</lastmod>)?`), `$1<lastmod>${mod}</lastmod>`);
      continue;
    }
    const mod = p.updated || p.date;
    urls.push(`  <url><loc>${loc}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</url>`);
  }
  if (urls.length) xml = xml.replace('</urlset>', urls.join('\n') + '\n</urlset>');
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
}

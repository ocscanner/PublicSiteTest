// Cloudflare Pages Function for /news.json
// The news list the site reads: Markdown story files (posts/index.json, built on
// deploy) plus stories published in the Command Center, in the same format.
// If the Command Center can't be reached, the files alone are returned.
import { apiOriginFor, cmsList, mergeLists } from '../lib/cms.js';

export async function onRequestGet({ request, env }) {
  let files = [];
  try {
    const res = await env.ASSETS.fetch(new Request(new URL('/posts/index.json', request.url)));
    if (res.ok) files = await res.json();
  } catch (e) { /* no file list; Command Center only */ }

  let cms = [];
  let status = 'files';
  const api = apiOriginFor(request.url, env);
  if (api) {
    try { cms = await cmsList(api); status = 'files+cc'; }
    catch (e) { status = 'files (Command Center unavailable)'; console.warn('news.json: ' + e.message); }
  }
  return new Response(JSON.stringify(mergeLists(Array.isArray(files) ? files : [], cms)), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=30, must-revalidate',
      'X-News-Sources': status,
    },
  });
}

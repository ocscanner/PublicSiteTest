// The merged news list: story files (posts/index.json, built on deploy) plus
// Command Center stories. Used by /news.json and the section pages.
import { apiOriginFor, cmsList, mergeLists } from './cms.js';

export async function loadNews(request, env) {
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
    catch (e) { status = 'files (Command Center unavailable)'; console.warn('news: ' + e.message); }
  }
  return { list: mergeLists(Array.isArray(files) ? files : [], cms), status };
}

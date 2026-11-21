// Cloudflare Pages Function for /news.json
// The news list the site reads: Markdown story files (posts/index.json, built on
// deploy) plus stories published in the Command Center, in the same format.
// If the Command Center can't be reached, the files alone are returned.
import { loadNews } from '../lib/news.js';

export async function onRequestGet({ request, env }) {
  const { list, status } = await loadNews(request, env);
  return new Response(JSON.stringify(list), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=30, must-revalidate',
      'X-News-Sources': status,
    },
  });
}

// Cloudflare Pages Function for /story.json?p=<slug>
// One story published in the Command Center, for the story page. 404 when the
// story isn't there (the page then reads the Markdown file instead).
import { apiOriginFor, cmsStory } from '../lib/cms.js';

const json = (body, status, cache) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
});

export async function onRequestGet({ request, env }) {
  const slug = new URL(request.url).searchParams.get('p') || '';
  const api = apiOriginFor(request.url, env);
  if (!api) return json({ error: 'off' }, 404, 'no-store');
  try {
    const story = await cmsStory(api, slug);
    if (!story) return json({ error: 'not found' }, 404, 'public, max-age=30');
    return json({ story }, 200, 'public, max-age=30, must-revalidate');
  } catch (e) {
    console.warn('story.json: ' + e.message);
    return json({ error: 'unavailable' }, 503, 'no-store');
  }
}

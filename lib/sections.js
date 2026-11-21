// News sections, shared by the Pages Functions (section pages, sitemap).
// The list itself is sections.json at the site root; the browser reads the same file.
// A story belongs to a section when its tag (file stories) or Category (Command Center)
// matches the section's name or one of its aliases, ignoring case, spaces and "&"/"and".
import SECTIONS from '../sections.json';

export { SECTIONS };
const norm = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export function sectionBySlug(slug) {
  return SECTIONS.find((s) => s.slug === slug) || null;
}
export function sectionOf(tag) {
  const t = norm(tag);
  if (!t) return null;
  return SECTIONS.find((s) => norm(s.name) === t || (s.aliases || []).some((a) => norm(a) === t)) || null;
}

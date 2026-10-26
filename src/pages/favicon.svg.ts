// Favicon generado con los colores e inicial de cada tienda.
import type { APIRoute } from 'astro';
import { validateTheme } from '../modules/tema/theme';
import { DEFAULT_THEME } from '../modules/tema/defaults';

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export const GET: APIRoute = ({ locals }) => {
  const store = locals.store!;
  const checked = validateTheme(store.theme);
  const { colors } = checked.ok ? checked.theme : DEFAULT_THEME;
  const initial = escapeXml(store.name.trim().charAt(0).toUpperCase() || '?');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${colors.band}"/><text x="32" y="44" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="${colors.ink}">${initial}</text></svg>`;
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' },
  });
};

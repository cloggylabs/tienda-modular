// Sirve las fotos desde R2. Las llaves llevan un UUID, así que se pueden cachear para siempre.
import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

const KEY = /^tiendas\/\d+\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/;

export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key ?? '';
  if (!KEY.test(key)) return new Response('No encontrado', { status: 404 });

  const object = await env.MEDIA.get(key, { onlyIf: request.headers });
  if (!object) return new Response('No encontrado', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  // Si el navegador ya la tiene (If-None-Match), R2 no devuelve el cuerpo.
  if (!('body' in object) || !object.body) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
};

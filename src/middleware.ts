import { defineMiddleware } from 'astro:middleware';
import { getSessionUser, SESSION_COOKIE } from './lib/auth';
import { getDb } from './lib/db';
import { PREVIEW_COOKIE, PREVIEW_PARAM, resolveStore } from './modules/tiendas/resolve';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/admin/setup']);

export const onRequest = defineMiddleware(async (ctx, next) => {
  const db = getDb();
  const { pathname } = ctx.url;
  const secure = ctx.url.protocol === 'https:';

  // --- Panel de administración ---
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // Defensa extra contra CSRF: todo envío del panel debe venir de este mismo sitio.
    if (ctx.request.method !== 'GET' && ctx.request.method !== 'HEAD') {
      const source = ctx.request.headers.get('origin') ?? ctx.request.headers.get('referer');
      if (!source || new URL(source).origin !== ctx.url.origin) {
        return new Response('Solicitud rechazada.', { status: 403 });
      }
    }
    const normalized = pathname.replace(/\/$/, '') || '/admin';
    const user = ctx.cookies.has(SESSION_COOKIE) ? await getSessionUser(db, ctx.cookies) : null;
    ctx.locals.user = user;
    if (!user && !PUBLIC_ADMIN_PATHS.has(normalized)) {
      const back = encodeURIComponent(pathname + ctx.url.search);
      return ctx.redirect(`/admin/login?volver=${back}`);
    }
    const response = await next();
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    return response;
  }

  // --- Tienda pública ---
  // Vista previa de otra tienda: solo en desarrollo o con sesión en el panel.
  const requested = ctx.url.searchParams.get(PREVIEW_PARAM) ?? ctx.cookies.get(PREVIEW_COOKIE)?.value;
  let previewSlug: string | undefined;
  if (requested) {
    const allowed =
      import.meta.env.DEV || (ctx.cookies.has(SESSION_COOKIE) && (await getSessionUser(db, ctx.cookies)) !== null);
    if (allowed) {
      previewSlug = requested === 'salir' ? undefined : requested;
      if (ctx.url.searchParams.has(PREVIEW_PARAM)) {
        if (previewSlug) ctx.cookies.set(PREVIEW_COOKIE, previewSlug, { path: '/', httpOnly: true, sameSite: 'lax', secure });
        else ctx.cookies.delete(PREVIEW_COOKIE, { path: '/' });
      }
    }
  }

  const store = await resolveStore(db, ctx.url, previewSlug);
  if (!store) {
    return new Response('Esta dirección no tiene una tienda configurada.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  ctx.locals.store = store;
  ctx.locals.isPreview = Boolean(previewSlug);

  const response = await next();
  if (ctx.locals.isPreview) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
  }
  return response;
});

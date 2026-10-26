// Decide qué tienda atiende cada petición.
// 1. Vista previa (?tienda=slug), solo en desarrollo o para quien inició sesión en el panel.
// 2. Hostname registrado en store_domains (dominio propio o *.workers.dev).
// 3. DEFAULT_STORE del worker (cada tienda tiene su propio worker en wrangler.jsonc).
import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { storeDomains, stores, type Store } from '../../db/schema';
import type { Db } from '../../lib/db';

export const PREVIEW_PARAM = 'tienda';
export const PREVIEW_COOKIE = 'tm_vista_tienda';

export async function findStoreBySlug(db: Db, slug: string): Promise<Store | undefined> {
  return db.query.stores.findFirst({ where: eq(stores.slug, slug) });
}

export async function findStoreByHostname(db: Db, hostname: string): Promise<Store | undefined> {
  const row = await db
    .select({ store: stores })
    .from(storeDomains)
    .innerJoin(stores, eq(storeDomains.storeId, stores.id))
    .where(eq(storeDomains.hostname, hostname.toLowerCase()))
    .get();
  return row?.store;
}

export async function resolveStore(db: Db, url: URL, previewSlug: string | undefined): Promise<Store | undefined> {
  if (previewSlug) {
    const preview = await findStoreBySlug(db, previewSlug);
    if (preview) return preview;
  }
  const byHost = await findStoreByHostname(db, url.hostname);
  if (byHost) return byHost;
  const fallback = env.DEFAULT_STORE;
  return fallback ? findStoreBySlug(db, fallback) : undefined;
}

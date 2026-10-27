import { asc, eq, inArray, and, ne } from 'drizzle-orm';
import { storeDomains, stores, type Store } from '../../db/schema';
import type { Db } from '../../lib/db';
import type { Theme } from '../tema/theme';
import type { StoreSettings } from './settings';

export function listStores(db: Db) {
  return db.select().from(stores).orderBy(asc(stores.name)).all();
}

export function getStoreBySlug(db: Db, slug: string) {
  return db.query.stores.findFirst({ where: eq(stores.slug, slug) });
}

export function getDomains(db: Db, storeId: number) {
  return db
    .select()
    .from(storeDomains)
    .where(eq(storeDomains.storeId, storeId))
    .orderBy(asc(storeDomains.hostname))
    .all();
}

/**
 * Arma enlaces públicos de una tienda desde el panel (que puede estar abierto en el dominio de otra).
 * 1. Dominio principal registrado. 2. Sin dominio: su subdominio *.workers.dev, porque cada worker se
 * llama igual que el slug de su tienda (wrangler.jsonc). 3. En local: vista previa con ?tienda=.
 */
export async function storeLinker(db: Db, store: Pick<Store, 'id' | 'slug'>, current: URL): Promise<(path: string) => string> {
  const primary = (await getDomains(db, store.id)).find((d) => d.isPrimary);
  if (primary) return (path) => `https://${primary.hostname}${path}`;
  const workers = /^[^.]+\.([^.]+\.workers\.dev)$/.exec(current.hostname);
  if (workers) return (path) => `https://${store.slug}.${workers[1]}${path}`;
  return (path) => `${current.origin}${path}?tienda=${store.slug}`;
}

export interface GeneralInput {
  name: string;
  tagline: string;
  description: string;
  settings: StoreSettings;
}

export async function updateGeneral(db: Db, storeId: number, input: GeneralInput) {
  await db
    .update(stores)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(stores.id, storeId));
}

export async function updateTheme(db: Db, storeId: number, theme: Theme) {
  await db.update(stores).set({ theme, updatedAt: new Date() }).where(eq(stores.id, storeId));
}

const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Normaliza una lista de dominios escrita a mano (uno por línea, acepta URLs completas). */
export function parseDomains(text: string): { hostnames: string[]; errors: string[] } {
  const errors: string[] = [];
  const hostnames: string[] = [];
  for (const raw of text.split(/[\n,]+/)) {
    const value = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!value) continue;
    if (!HOSTNAME.test(value)) errors.push(`«${raw.trim()}» no es un dominio válido.`);
    else if (!hostnames.includes(value)) hostnames.push(value);
  }
  return { hostnames, errors };
}

/** Reemplaza los dominios de una tienda. El primero queda como principal. */
export async function setDomains(db: Db, storeId: number, hostnames: string[]): Promise<string[]> {
  if (hostnames.length) {
    const taken = await db
      .select({ hostname: storeDomains.hostname })
      .from(storeDomains)
      .where(and(inArray(storeDomains.hostname, hostnames), ne(storeDomains.storeId, storeId)))
      .all();
    if (taken.length) return taken.map((t) => `«${t.hostname}» ya pertenece a otra tienda.`);
  }
  const statements = [
    db.delete(storeDomains).where(eq(storeDomains.storeId, storeId)),
    ...hostnames.map((hostname, i) => db.insert(storeDomains).values({ hostname, storeId, isPrimary: i === 0 })),
  ];
  await db.batch(statements as [(typeof statements)[0], ...(typeof statements)[number][]]);
  return [];
}

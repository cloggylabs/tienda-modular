import { and, asc, desc, eq, inArray, isNull, lte, gte, or, sql } from 'drizzle-orm';
import {
  categories,
  collections,
  productCollections,
  products,
  type Category,
  type Collection,
  type Product,
} from '../../db/schema';
import type { Db } from '../../lib/db';

// ---------------------------------------------------------------------------
// Tienda: solo productos publicados y colecciones vigentes
// ---------------------------------------------------------------------------

const ORDER = [desc(products.featured), asc(products.position), desc(products.createdAt)];

export function listActiveProducts(db: Db, storeId: number, opts: { categoryId?: number; limit?: number } = {}) {
  const where = [eq(products.storeId, storeId), eq(products.status, 'active')];
  if (opts.categoryId) where.push(eq(products.categoryId, opts.categoryId));
  const q = db.select().from(products).where(and(...where)).orderBy(...ORDER);
  return opts.limit ? q.limit(opts.limit).all() : q.all();
}

export function listFeaturedProducts(db: Db, storeId: number, limit: number) {
  return db
    .select()
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.status, 'active'), eq(products.featured, true)))
    .orderBy(...ORDER)
    .limit(limit)
    .all();
}

export function getActiveProduct(db: Db, storeId: number, slug: string) {
  return db.query.products.findFirst({
    where: and(eq(products.storeId, storeId), eq(products.slug, slug), eq(products.status, 'active')),
  });
}

/** Productos publicados por id (para armar el carrito). */
export function listActiveProductsByIds(db: Db, storeId: number, ids: number[]) {
  if (!ids.length) return Promise.resolve([]);
  return db
    .select()
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.status, 'active'), inArray(products.id, ids)))
    .all();
}

export async function countActiveProducts(db: Db, storeId: number) {
  const row = await db
    .select({ n: sql<number>`count(*)` })
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.status, 'active')))
    .get();
  return row?.n ?? 0;
}

/** Condición SQL de colección vigente (habilitada y dentro de fechas). */
function activeCollection(now: Date) {
  return and(
    eq(collections.enabled, true),
    or(isNull(collections.startsAt), lte(collections.startsAt, now)),
    or(isNull(collections.endsAt), gte(collections.endsAt, now)),
  );
}

export function listActiveCollections(db: Db, storeId: number, now = new Date()) {
  return db
    .select()
    .from(collections)
    .where(and(eq(collections.storeId, storeId), activeCollection(now)))
    .orderBy(asc(collections.endsAt), asc(collections.name))
    .all();
}

export function getActiveCollection(db: Db, storeId: number, slug: string, now = new Date()) {
  return db
    .select()
    .from(collections)
    .where(and(eq(collections.storeId, storeId), eq(collections.slug, slug), activeCollection(now)))
    .get();
}

export async function listCollectionProducts(db: Db, collectionId: number, limit?: number) {
  const q = db
    .select({ product: products })
    .from(productCollections)
    .innerJoin(products, eq(productCollections.productId, products.id))
    .where(and(eq(productCollections.collectionId, collectionId), eq(products.status, 'active')))
    .orderBy(...ORDER);
  const rows = limit ? await q.limit(limit).all() : await q.all();
  return rows.map((r) => r.product);
}

/** Colecciones vigentes en las que está un producto (para enlazarlas desde su página). */
export async function productActiveCollections(db: Db, productId: number, now = new Date()) {
  const rows = await db
    .select({ collection: collections })
    .from(productCollections)
    .innerJoin(collections, eq(productCollections.collectionId, collections.id))
    .where(and(eq(productCollections.productId, productId), activeCollection(now)))
    .all();
  return rows.map((r) => r.collection);
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function listCategories(db: Db, storeId: number) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .orderBy(asc(categories.position), asc(categories.name))
    .all();
}

export function getCategoryBySlug(db: Db, storeId: number, slug: string) {
  return db.query.categories.findFirst({ where: and(eq(categories.storeId, storeId), eq(categories.slug, slug)) });
}

export async function categoryProductCounts(db: Db, storeId: number) {
  const rows = await db
    .select({ id: products.categoryId, n: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.storeId, storeId))
    .groupBy(products.categoryId)
    .all();
  return new Map(rows.map((r) => [r.id, r.n]));
}

export async function saveCategory(db: Db, storeId: number, input: { id?: number; name: string; slug: string; position: number }) {
  if (input.id) {
    await db
      .update(categories)
      .set({ name: input.name, slug: input.slug, position: input.position, updatedAt: new Date() })
      .where(and(eq(categories.id, input.id), eq(categories.storeId, storeId)));
  } else {
    await db.insert(categories).values({ storeId, name: input.name, slug: input.slug, position: input.position });
  }
}

export async function deleteCategory(db: Db, storeId: number, id: number) {
  // Los productos quedan "sin categoría" (ON DELETE SET NULL).
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.storeId, storeId)));
}

export function listCollections(db: Db, storeId: number) {
  return db
    .select()
    .from(collections)
    .where(eq(collections.storeId, storeId))
    .orderBy(desc(collections.createdAt))
    .all();
}

export function getCollection(db: Db, storeId: number, id: number) {
  return db.query.collections.findFirst({ where: and(eq(collections.id, id), eq(collections.storeId, storeId)) });
}

export async function collectionProductCounts(db: Db, storeId: number) {
  const rows = await db
    .select({ id: productCollections.collectionId, n: sql<number>`count(*)` })
    .from(productCollections)
    .innerJoin(collections, eq(productCollections.collectionId, collections.id))
    .where(eq(collections.storeId, storeId))
    .groupBy(productCollections.collectionId)
    .all();
  return new Map(rows.map((r) => [r.id, r.n]));
}

export type CollectionInput = Pick<Collection, 'name' | 'slug' | 'description' | 'image' | 'startsAt' | 'endsAt' | 'enabled'>;

export async function saveCollection(db: Db, storeId: number, id: number | null, input: CollectionInput) {
  if (id) {
    await db
      .update(collections)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(collections.id, id), eq(collections.storeId, storeId)));
    return id;
  }
  const row = await db
    .insert(collections)
    .values({ ...input, storeId })
    .returning({ id: collections.id })
    .get();
  return row.id;
}

export async function deleteCollection(db: Db, storeId: number, id: number) {
  await db.delete(collections).where(and(eq(collections.id, id), eq(collections.storeId, storeId)));
}

export async function slugTaken(
  db: Db,
  table: 'products' | 'collections' | 'categories',
  storeId: number,
  slug: string,
  exceptId?: number | null,
) {
  const t = { products, collections, categories }[table];
  const row = await db
    .select({ id: t.id })
    .from(t)
    .where(and(eq(t.storeId, storeId), eq(t.slug, slug)))
    .get();
  return Boolean(row && row.id !== exceptId);
}

export function listProductsAdmin(db: Db, storeId: number, opts: { q?: string; status?: Product['status'] } = {}) {
  const where = [eq(products.storeId, storeId)];
  if (opts.status) where.push(eq(products.status, opts.status));
  if (opts.q) where.push(sql`instr(lower(${products.name}), lower(${opts.q})) > 0`);
  return db
    .select()
    .from(products)
    .where(and(...where))
    .orderBy(asc(products.status), desc(products.updatedAt))
    .all();
}

export function getProduct(db: Db, storeId: number, id: number) {
  return db.query.products.findFirst({ where: and(eq(products.id, id), eq(products.storeId, storeId)) });
}

export async function getProductCollectionIds(db: Db, productId: number) {
  const rows = await db
    .select({ id: productCollections.collectionId })
    .from(productCollections)
    .where(eq(productCollections.productId, productId))
    .all();
  return rows.map((r) => r.id);
}

export type ProductInput = Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt' | 'position'>;

/** Crea o actualiza un producto y sus colecciones en una sola operación. */
export async function saveProduct(db: Db, storeId: number, id: number | null, input: ProductInput, collectionIds: number[]) {
  // Solo colecciones de esta tienda.
  const valid = collectionIds.length
    ? (
        await db
          .select({ id: collections.id })
          .from(collections)
          .where(and(eq(collections.storeId, storeId), inArray(collections.id, collectionIds)))
          .all()
      ).map((c) => c.id)
    : [];

  let productId = id;
  if (productId) {
    await db
      .update(products)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)));
  } else {
    const row = await db
      .insert(products)
      .values({ ...input, storeId })
      .returning({ id: products.id })
      .get();
    productId = row.id;
  }

  const statements = [
    db.delete(productCollections).where(eq(productCollections.productId, productId)),
    ...valid.map((collectionId) => db.insert(productCollections).values({ productId: productId!, collectionId })),
  ];
  await db.batch(statements as [(typeof statements)[0], ...(typeof statements)[number][]]);
  return productId;
}

export async function deleteProduct(db: Db, storeId: number, id: number) {
  await db.delete(products).where(and(eq(products.id, id), eq(products.storeId, storeId)));
}

export type { Category };

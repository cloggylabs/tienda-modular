import { and, asc, eq, max } from 'drizzle-orm';
import { blocks } from '../../db/schema';
import type { Db } from '../../lib/db';
import type { BlockProps, BlockType } from './blocks';

/** Bloques visibles de una página, en orden (para la tienda). */
export function getPageBlocks(db: Db, storeId: number, page = 'home') {
  return db
    .select()
    .from(blocks)
    .where(and(eq(blocks.storeId, storeId), eq(blocks.page, page), eq(blocks.enabled, true)))
    .orderBy(asc(blocks.position), asc(blocks.id))
    .all();
}

/** Todos los bloques de una página, incluidos los ocultos (para el panel). */
export function listBlocks(db: Db, storeId: number, page = 'home') {
  return db
    .select()
    .from(blocks)
    .where(and(eq(blocks.storeId, storeId), eq(blocks.page, page)))
    .orderBy(asc(blocks.position), asc(blocks.id))
    .all();
}

export function getBlock(db: Db, storeId: number, id: number) {
  return db.query.blocks.findFirst({ where: and(eq(blocks.id, id), eq(blocks.storeId, storeId)) });
}

export async function createBlock(db: Db, storeId: number, type: BlockType, props: BlockProps, page = 'home') {
  const last = await db
    .select({ p: max(blocks.position) })
    .from(blocks)
    .where(and(eq(blocks.storeId, storeId), eq(blocks.page, page)))
    .get();
  return db
    .insert(blocks)
    .values({ storeId, page, type, props, position: (last?.p ?? -10) + 10 })
    .returning()
    .get();
}

export async function updateBlockProps(db: Db, storeId: number, id: number, props: BlockProps) {
  await db
    .update(blocks)
    .set({ props, updatedAt: new Date() })
    .where(and(eq(blocks.id, id), eq(blocks.storeId, storeId)));
}

export async function setBlockEnabled(db: Db, storeId: number, id: number, enabled: boolean) {
  await db
    .update(blocks)
    .set({ enabled, updatedAt: new Date() })
    .where(and(eq(blocks.id, id), eq(blocks.storeId, storeId)));
}

export async function deleteBlock(db: Db, storeId: number, id: number) {
  await db.delete(blocks).where(and(eq(blocks.id, id), eq(blocks.storeId, storeId)));
}

/** Sube o baja un bloque una posición y renumera la página (10, 20, 30…). */
export async function moveBlock(db: Db, storeId: number, id: number, direction: 'up' | 'down', page = 'home') {
  const list = await listBlocks(db, storeId, page);
  const i = list.findIndex((b) => b.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j]!, list[i]!];
  const statements = list.map((b, index) =>
    db.update(blocks).set({ position: index * 10 }).where(and(eq(blocks.id, b.id), eq(blocks.storeId, storeId))),
  );
  await db.batch(statements as [(typeof statements)[0], ...(typeof statements)[number][]]);
}

import { and, asc, eq } from 'drizzle-orm';
import { blocks } from '../../db/schema';
import type { Db } from '../../lib/db';

export function getPageBlocks(db: Db, storeId: number, page = 'home') {
  return db
    .select()
    .from(blocks)
    .where(and(eq(blocks.storeId, storeId), eq(blocks.page, page), eq(blocks.enabled, true)))
    .orderBy(asc(blocks.position), asc(blocks.id))
    .all();
}

import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { Theme } from '../modules/tema/theme';
import type { BlockProps, BlockType } from '../modules/contenido/blocks';
import type { StoreSettings } from '../modules/tiendas/settings';

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
};

/** Cada emprendimiento es una fila. Todo lo demás cuelga de store_id. */
export const stores = sqliteTable('stores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull().default(''),
  description: text('description').notNull().default(''),
  locale: text('locale').notNull().default('es-CO'),
  currency: text('currency').notNull().default('COP'),
  settings: text('settings', { mode: 'json' }).$type<StoreSettings>().notNull(),
  theme: text('theme', { mode: 'json' }).$type<Theme>().notNull(),
  ...timestamps,
});

/** Dominios que apuntan a cada tienda (propios o *.workers.dev). */
export const storeDomains = sqliteTable(
  'store_domains',
  {
    hostname: text('hostname').primaryKey(),
    storeId: integer('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('store_domains_store_idx').on(t.storeId)],
);

/** Bloques de contenido de cada página (la landing es la página "home"). */
export const blocks = sqliteTable(
  'blocks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    storeId: integer('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    page: text('page').notNull().default('home'),
    position: integer('position').notNull().default(0),
    type: text('type').$type<BlockType>().notNull(),
    props: text('props', { mode: 'json' }).$type<BlockProps>().notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index('blocks_store_page_idx').on(t.storeId, t.page, t.position)],
);

/** Fotos subidas al panel. El archivo vive en R2 (binding MEDIA) bajo `key`. */
export const media = sqliteTable(
  'media',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    storeId: integer('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    key: text('key').notNull().unique(),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    width: integer('width'),
    height: integer('height'),
    alt: text('alt').notNull().default(''),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('media_store_idx').on(t.storeId, t.createdAt)],
);

/** Personas que entran al panel. Pueden administrar todas las tiendas. */
export const adminUsers = sqliteTable(
  'admin_users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: integer('locked_until', { mode: 'timestamp' }),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('admin_users_email_idx').on(t.email)],
);

/** Sesiones del panel. Se guarda el SHA-256 del token, nunca el token. */
export const adminSessions = sqliteTable(
  'admin_sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('admin_sessions_user_idx').on(t.userId)],
);

export type Store = typeof stores.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type Media = typeof media.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;


// Genera db/seed.sql a partir de db/seed-data.ts. Uso: npm run db:seed:build
import { writeFileSync } from 'node:fs';
import { seedStores } from '../db/seed-data.ts';
import { validateTheme } from '../src/modules/tema/theme.ts';
import { validateSettings } from '../src/modules/tiendas/settings.ts';

const q = (value: string) => `'${value.replace(/'/g, "''")}'`;
const json = (value: unknown) => q(JSON.stringify(value));

const lines: string[] = ['-- Generado por scripts/build-seed.ts. No editar a mano.', ''];

for (const store of seedStores) {
  const theme = validateTheme(store.theme);
  const settings = validateSettings(store.settings);
  if (!theme.ok) throw new Error(`Tema inválido en ${store.slug}: ${theme.errors.join(' ')}`);
  if (!settings.ok) throw new Error(`Ajustes inválidos en ${store.slug}: ${settings.errors.join(' ')}`);

  lines.push(`-- ${store.name}`);
  lines.push(
    `INSERT INTO stores (slug, name, tagline, description, settings, theme) VALUES (${q(store.slug)}, ${q(store.name)}, ${q(store.tagline)}, ${q(store.description)}, ${json(settings.settings)}, ${json(theme.theme)}) ON CONFLICT(slug) DO NOTHING;`,
  );
  // Bloques: solo si la tienda todavía no tiene ninguno.
  const values = store.blocks
    .map((b, i) => `(${q('home')}, ${i * 10}, ${q(b.type)}, ${json(b.props)})`)
    .join(',\n  ');
  lines.push(
    `INSERT INTO blocks (store_id, page, position, type, props)\nSELECT s.id, v.column1, v.column2, v.column3, v.column4\nFROM (VALUES\n  ${values}\n) AS v, stores s\nWHERE s.slug = ${q(store.slug)} AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.store_id = s.id);`,
  );
  lines.push('');
}

writeFileSync(new URL('../db/seed.sql', import.meta.url), lines.join('\n'));
console.log(`db/seed.sql listo (${seedStores.length} tiendas).`);

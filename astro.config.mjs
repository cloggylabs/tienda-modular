// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    // Sin servicio de imágenes de Cloudflare por ahora (las fotos llegan con R2 en la Fase 2).
    imageService: 'passthrough',
  }),
  // Las sesiones del panel viven en D1; no hace falta el KV de sesiones de Astro.
  session: false,
  security: {
    checkOrigin: true,
  },
});

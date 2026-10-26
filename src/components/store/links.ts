import type { LinkTarget } from '../../modules/contenido/blocks';
import { instagramUrl, whatsappUrl, type StoreSettings } from '../../modules/tiendas/settings';

/** Convierte el destino de un bloque en un href y dice si abre fuera de la tienda. */
export function resolveLink(link: LinkTarget, settings: StoreSettings): { href: string; external: boolean } {
  switch (link.to) {
    case 'whatsapp':
      return { href: whatsappUrl(settings, link.message), external: true };
    case 'instagram':
      return { href: instagramUrl(settings), external: true };
    case 'url':
      return { href: link.href, external: /^https?:\/\//.test(link.href) };
  }
}

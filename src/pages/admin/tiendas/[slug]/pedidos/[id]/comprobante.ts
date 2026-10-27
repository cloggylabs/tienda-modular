// Muestra el comprobante de pago de un pedido. Solo desde el panel (el middleware exige sesión).
import type { APIRoute } from 'astro';
import { getDb } from '../../../../../../lib/db';
import { getStoreBySlug } from '../../../../../../modules/tiendas/repo';
import { getOrder, getReceipt } from '../../../../../../modules/pedidos/repo';

export const GET: APIRoute = async ({ params }) => {
  const db = getDb();
  const store = await getStoreBySlug(db, params.slug ?? '');
  const id = Number(params.id);
  const order = store && Number.isInteger(id) && id > 0 ? await getOrder(db, store.id, id) : undefined;
  const object = order ? await getReceipt(order) : null;
  if (!order || !object) return new Response('No encontrado', { status: 404 });

  const ext = order.receiptKey!.split('.').pop();
  return new Response(object.body, {
    headers: {
      'Content-Type': order.receiptType ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="comprobante-${order.number}.${ext}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

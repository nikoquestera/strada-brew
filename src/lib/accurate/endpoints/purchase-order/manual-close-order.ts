import { accurateClient } from '../../client';

/**
 * /api/purchase-order/manual-close-order.do
 * Menutup Pesanan Pembelian secara manual (berdasarkan nomor PO)
 */
export async function purchaseOrderManualCloseOrder(data: any) {
  return accurateClient.post('/api/purchase-order/manual-close-order.do', data);
}

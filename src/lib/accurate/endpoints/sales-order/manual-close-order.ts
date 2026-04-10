import { accurateClient } from '../../client';

/**
 * /api/sales-order/manual-close-order.do
 * Menutup Pesanan Penjualan secara manual (berdasarkan nomor SO)
 */
export async function salesOrderManualCloseOrder(data: any) {
  return accurateClient.post('/api/sales-order/manual-close-order.do', data);
}

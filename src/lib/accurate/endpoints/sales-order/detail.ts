import { accurateClient } from '../../client';

/**
 * /api/sales-order/detail.do
 * Melihat detil data Pesanan Penjualan berdasarkan id atau identifier tertentu
 */
export async function salesOrderDetail(params: any) {
  return accurateClient.get('/api/sales-order/detail.do', { params });
}

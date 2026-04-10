import { accurateClient } from '../../client';

/**
 * /api/sales-order/delete.do
 * Menghapus data Pesanan Penjualan berdasarkan id tertentu
 */
export async function salesOrderDelete(params: any) {
  return accurateClient.delete('/api/sales-order/delete.do', params);
}

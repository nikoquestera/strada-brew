import { accurateClient } from '../../client';

/**
 * /api/purchase-order/delete.do
 * Menghapus data Pesanan Pembelian berdasarkan id tertentu
 */
export async function purchaseOrderDelete(params: any) {
  return accurateClient.delete('/api/purchase-order/delete.do', params);
}

import { accurateClient } from '../../client';

/**
 * /api/purchase-return/delete.do
 * Menghapus data Retur Pembelian berdasarkan id tertentu
 */
export async function purchaseReturnDelete(params: any) {
  return accurateClient.delete('/api/purchase-return/delete.do', params);
}

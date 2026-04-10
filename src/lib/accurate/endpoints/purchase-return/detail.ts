import { accurateClient } from '../../client';

/**
 * /api/purchase-return/detail.do
 * Melihat detil data Retur Pembelian berdasarkan id atau identifier tertentu
 */
export async function purchaseReturnDetail(params: any) {
  return accurateClient.get('/api/purchase-return/detail.do', { params });
}

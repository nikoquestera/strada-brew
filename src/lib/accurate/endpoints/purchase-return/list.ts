import { accurateClient } from '../../client';

/**
 * /api/purchase-return/list.do
 * Melihat daftar data Retur Pembelian, dengan filter yang sesuai
 */
export async function purchaseReturnList(params: any) {
  return accurateClient.get('/api/purchase-return/list.do', { params });
}

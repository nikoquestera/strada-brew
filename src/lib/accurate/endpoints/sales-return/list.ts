import { accurateClient } from '../../client';

/**
 * /api/sales-return/list.do
 * Melihat daftar data Retur Penjualan, dengan filter yang sesuai
 */
export async function salesReturnList(params: any) {
  return accurateClient.get('/api/sales-return/list.do', { params });
}

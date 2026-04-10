import { accurateClient } from '../../client';

/**
 * /api/sales-return/detail.do
 * Melihat detil data Retur Penjualan berdasarkan id atau identifier tertentu
 */
export async function salesReturnDetail(params: any) {
  return accurateClient.get('/api/sales-return/detail.do', { params });
}

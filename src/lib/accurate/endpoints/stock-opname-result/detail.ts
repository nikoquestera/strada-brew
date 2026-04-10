import { accurateClient } from '../../client';

/**
 * /api/stock-opname-result/detail.do
 * Melihat detil data Hasil Stok Opname berdasarkan id atau identifier tertentu
 */
export async function stockOpnameResultDetail(params: any) {
  return accurateClient.get('/api/stock-opname-result/detail.do', { params });
}

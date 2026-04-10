import { accurateClient } from '../../client';

/**
 * /api/stock-opname-result/list.do
 * Melihat daftar data Hasil Stok Opname, dengan filter yang sesuai
 */
export async function stockOpnameResultList(params: any) {
  return accurateClient.get('/api/stock-opname-result/list.do', { params });
}

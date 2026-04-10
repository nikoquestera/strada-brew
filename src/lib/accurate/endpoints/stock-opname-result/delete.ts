import { accurateClient } from '../../client';

/**
 * /api/stock-opname-result/delete.do
 * Menghapus data Hasil Stok Opname berdasarkan id tertentu
 */
export async function stockOpnameResultDelete(params: any) {
  return accurateClient.delete('/api/stock-opname-result/delete.do', params);
}

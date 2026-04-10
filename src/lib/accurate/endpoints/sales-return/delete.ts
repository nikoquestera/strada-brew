import { accurateClient } from '../../client';

/**
 * /api/sales-return/delete.do
 * Menghapus data Retur Penjualan berdasarkan id tertentu
 */
export async function salesReturnDelete(params: any) {
  return accurateClient.delete('/api/sales-return/delete.do', params);
}

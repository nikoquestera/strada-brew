import { accurateClient } from '../../client';

/**
 * /api/unit/delete.do
 * Menghapus data Satuan Barang berdasarkan id tertentu
 */
export async function unitDelete(params: any) {
  return accurateClient.delete('/api/unit/delete.do', params);
}

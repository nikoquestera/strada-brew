import { accurateClient } from '../../client';

/**
 * /api/fixed-asset/delete.do
 * Menghapus data Aset Tetap berdasarkan id tertentu
 */
export async function fixedAssetDelete(params: any) {
  return accurateClient.delete('/api/fixed-asset/delete.do', params);
}

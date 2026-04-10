import { accurateClient } from '../../client';

/**
 * /api/item-adjustment/delete.do
 * Menghapus data Penyesuaian Persediaan berdasarkan id tertentu
 */
export async function itemAdjustmentDelete(params: any) {
  return accurateClient.delete('/api/item-adjustment/delete.do', params);
}

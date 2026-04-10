import { accurateClient } from '../../client';

/**
 * /api/material-adjustment/delete.do
 * Menghapus data Penambahan Bahan Baku berdasarkan id tertentu
 */
export async function materialAdjustmentDelete(params: any) {
  return accurateClient.delete('/api/material-adjustment/delete.do', params);
}

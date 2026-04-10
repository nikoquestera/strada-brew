import { accurateClient } from '../../client';

/**
 * /api/material-slip/delete.do
 * Menghapus data Pengambilan Bahan Baku berdasarkan id tertentu
 */
export async function materialSlipDelete(params: any) {
  return accurateClient.delete('/api/material-slip/delete.do', params);
}

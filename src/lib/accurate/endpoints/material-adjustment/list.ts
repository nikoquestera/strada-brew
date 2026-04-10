import { accurateClient } from '../../client';

/**
 * /api/material-adjustment/list.do
 * Melihat daftar data Penambahan Bahan Baku, dengan filter yang sesuai
 */
export async function materialAdjustmentList(params: any) {
  return accurateClient.get('/api/material-adjustment/list.do', { params });
}

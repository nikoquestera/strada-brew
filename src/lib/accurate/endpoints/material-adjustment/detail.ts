import { accurateClient } from '../../client';

/**
 * /api/material-adjustment/detail.do
 * Melihat detil data Penambahan Bahan Baku berdasarkan id atau identifier tertentu
 */
export async function materialAdjustmentDetail(params: any) {
  return accurateClient.get('/api/material-adjustment/detail.do', { params });
}

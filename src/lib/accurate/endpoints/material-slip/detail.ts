import { accurateClient } from '../../client';

/**
 * /api/material-slip/detail.do
 * Melihat detil data Pengambilan Bahan Baku berdasarkan id atau identifier tertentu
 */
export async function materialSlipDetail(params: any) {
  return accurateClient.get('/api/material-slip/detail.do', { params });
}

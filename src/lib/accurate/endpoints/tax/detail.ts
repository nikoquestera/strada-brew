import { accurateClient } from '../../client';

/**
 * /api/tax/detail.do
 * Melihat detil data Pajak berdasarkan id atau identifier tertentu
 */
export async function taxDetail(params: any) {
  return accurateClient.get('/api/tax/detail.do', { params });
}

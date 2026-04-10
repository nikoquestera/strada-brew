import { accurateClient } from '../../client';

/**
 * /api/other-deposit/detail.do
 * Melihat detil data Penerimaan berdasarkan id atau identifier tertentu
 */
export async function otherDepositDetail(params: any) {
  return accurateClient.get('/api/other-deposit/detail.do', { params });
}

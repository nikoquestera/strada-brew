import { accurateClient } from '../../client';

/**
 * /api/bank-transfer/detail.do
 * Melihat detil data Transfer Bank berdasarkan id atau identifier tertentu
 */
export async function bankTransferDetail(params: any) {
  return accurateClient.get('/api/bank-transfer/detail.do', { params });
}

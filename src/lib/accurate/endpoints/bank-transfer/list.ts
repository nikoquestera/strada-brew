import { accurateClient } from '../../client';

/**
 * /api/bank-transfer/list.do
 * Melihat daftar data Transfer Bank, dengan filter yang sesuai
 */
export async function bankTransferList(params: any) {
  return accurateClient.get('/api/bank-transfer/list.do', { params });
}

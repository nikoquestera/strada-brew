import { accurateClient } from '../../client';

/**
 * /api/other-deposit/list.do
 * Melihat daftar data Penerimaan, dengan filter yang sesuai
 */
export async function otherDepositList(params: any) {
  return accurateClient.get('/api/other-deposit/list.do', { params });
}

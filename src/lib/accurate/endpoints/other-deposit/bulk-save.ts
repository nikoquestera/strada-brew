import { accurateClient } from '../../client';

/**
 * /api/other-deposit/bulk-save.do
 * Melihat daftar data Penerimaan, dengan filter yang sesuai
 */
export async function otherDepositBulkSave(data: any) {
  return accurateClient.post('/api/other-deposit/bulk-save.do', data);
}

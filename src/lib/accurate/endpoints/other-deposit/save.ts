import { accurateClient } from '../../client';

/**
 * /api/other-deposit/save.do
 * Membuat data Penerimaan baru atau mengedit data Penerimaan yang sudah ada
 */
export async function otherDepositSave(data: any) {
  return accurateClient.post('/api/other-deposit/save.do', data);
}

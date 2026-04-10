import { accurateClient } from '../../client';

/**
 * /api/bank-transfer/save.do
 * Membuat data Transfer Bank baru atau mengedit data Transfer Bank yang sudah ada
 */
export async function bankTransferSave(data: any) {
  return accurateClient.post('/api/bank-transfer/save.do', data);
}

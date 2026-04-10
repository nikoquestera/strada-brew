import { accurateClient } from '../../client';

/**
 * /api/process-stages/save.do
 * Membuat data Tahapan Proses baru atau mengedit data Tahapan Proses yang sudah ada
 */
export async function processStagesSave(data: any) {
  return accurateClient.post('/api/process-stages/save.do', data);
}

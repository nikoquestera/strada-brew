import { accurateClient } from '../../client';

/**
 * /api/process-stages/delete.do
 * Menghapus data Tahapan Proses berdasarkan id tertentu
 */
export async function processStagesDelete(params: any) {
  return accurateClient.delete('/api/process-stages/delete.do', params);
}

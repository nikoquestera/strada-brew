import { accurateClient } from '../../client';

/**
 * /api/process-stages/list.do
 * Melihat daftar data Tahapan Proses, dengan filter yang sesuai
 */
export async function processStagesList(params: any) {
  return accurateClient.get('/api/process-stages/list.do', { params });
}

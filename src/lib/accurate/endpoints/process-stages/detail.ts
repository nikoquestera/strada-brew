import { accurateClient } from '../../client';

/**
 * /api/process-stages/detail.do
 * Melihat detil data Perintah Kerja berdasarkan id atau identifier tertentu
 */
export async function processStagesDetail(params: any) {
  return accurateClient.get('/api/process-stages/detail.do', { params });
}

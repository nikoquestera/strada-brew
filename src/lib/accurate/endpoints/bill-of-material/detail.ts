import { accurateClient } from '../../client';

/**
 * /api/bill-of-material/detail.do
 * Melihat detil data Formula Produksi berdasarkan id atau identifier tertentu
 */
export async function billOfMaterialDetail(params: any) {
  return accurateClient.get('/api/bill-of-material/detail.do', { params });
}

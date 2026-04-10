import { accurateClient } from '../../client';

/**
 * /api/item-adjustment/detail.do
 * Melihat detil data Penyesuaian Persediaan berdasarkan id atau identifier tertentu
 */
export async function itemAdjustmentDetail(params: any) {
  return accurateClient.get('/api/item-adjustment/detail.do', { params });
}

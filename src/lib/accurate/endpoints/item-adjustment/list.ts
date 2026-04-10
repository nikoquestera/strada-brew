import { accurateClient } from '../../client';

/**
 * /api/item-adjustment/list.do
 * Melihat daftar data Penyesuaian Persediaan, dengan filter yang sesuai
 */
export async function itemAdjustmentList(params: any) {
  return accurateClient.get('/api/item-adjustment/list.do', { params });
}

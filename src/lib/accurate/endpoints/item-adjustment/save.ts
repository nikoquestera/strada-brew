import { accurateClient } from '../../client';

/**
 * /api/item-adjustment/save.do
 * Membuat data Penyesuaian Persediaan baru atau mengedit data Penyesuaian Persediaan yang sudah ada
 */
export async function itemAdjustmentSave(data: any) {
  return accurateClient.post('/api/item-adjustment/save.do', data);
}

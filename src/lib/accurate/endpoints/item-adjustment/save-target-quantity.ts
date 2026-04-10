import { accurateClient } from '../../client';

/**
 * /api/item-adjustment/save-target-quantity.do
 * Membuat data Penyesuaian Persediaan baru atau mengedit data Penyesuaian Persediaan yang sudah ada, dengan kuantitas yang diinput adalah kuantitas akhir yang diinginkan
 */
export async function itemAdjustmentSaveTargetQuantity(data: any) {
  return accurateClient.post('/api/item-adjustment/save-target-quantity.do', data);
}

import { accurateClient } from '../../client';

/**
 * /api/material-adjustment/save.do
 * Membuat data Penambahan Bahan Baku baru atau mengedit data Penambahan Bahan Baku yang sudah ada
 */
export async function materialAdjustmentSave(data: any) {
  return accurateClient.post('/api/material-adjustment/save.do', data);
}

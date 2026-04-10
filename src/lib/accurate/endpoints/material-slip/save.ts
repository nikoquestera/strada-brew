import { accurateClient } from '../../client';

/**
 * /api/material-slip/save.do
 * Membuat data Pengambilan Bahan Baku baru atau mengedit data Pengambilan Bahan Baku yang sudah ada
 */
export async function materialSlipSave(data: any) {
  return accurateClient.post('/api/material-slip/save.do', data);
}

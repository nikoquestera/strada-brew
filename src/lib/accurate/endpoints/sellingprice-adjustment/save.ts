import { accurateClient } from '../../client';

/**
 * /api/sellingprice-adjustment/save.do
 * Membuat data Penyesuaian Harga/Diskon baru atau mengedit data Penyesuaian Harga/Diskon yang sudah ada
 */
export async function sellingpriceAdjustmentSave(data: any) {
  return accurateClient.post('/api/sellingprice-adjustment/save.do', data);
}

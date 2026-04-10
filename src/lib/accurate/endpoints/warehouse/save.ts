import { accurateClient } from '../../client';

/**
 * /api/warehouse/save.do
 * Membuat data Gudang baru atau mengedit data Gudang yang sudah ada
 */
export async function warehouseSave(data: any) {
  return accurateClient.post('/api/warehouse/save.do', data);
}

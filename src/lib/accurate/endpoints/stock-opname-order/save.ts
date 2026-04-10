import { accurateClient } from '../../client';

/**
 * /api/stock-opname-order/save.do
 * Membuat data Perintah Stok Opname baru atau mengedit data Perintah Stok Opname yang sudah ada
 */
export async function stockOpnameOrderSave(data: any) {
  return accurateClient.post('/api/stock-opname-order/save.do', data);
}

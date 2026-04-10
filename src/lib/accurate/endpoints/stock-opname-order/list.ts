import { accurateClient } from '../../client';

/**
 * /api/stock-opname-order/list.do
 * Melihat daftar data Perintah Stok Opname, dengan filter yang sesuai
 */
export async function stockOpnameOrderList(params: any) {
  return accurateClient.get('/api/stock-opname-order/list.do', { params });
}

import { accurateClient } from '../../client';

/**
 * /api/stock-opname-order/delete.do
 * Menghapus data Perintah Stok Opname berdasarkan id tertentu
 */
export async function stockOpnameOrderDelete(params: any) {
  return accurateClient.delete('/api/stock-opname-order/delete.do', params);
}

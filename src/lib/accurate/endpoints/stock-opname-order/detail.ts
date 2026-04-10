import { accurateClient } from '../../client';

/**
 * /api/stock-opname-order/detail.do
 * Melihat detil data Perintah Stok Opname berdasarkan id atau identifier tertentu
 */
export async function stockOpnameOrderDetail(params: any) {
  return accurateClient.get('/api/stock-opname-order/detail.do', { params });
}

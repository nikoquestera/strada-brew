import { accurateClient } from '../../client';

/**
 * /api/shipment/list.do
 * Melihat daftar data Pengiriman, dengan filter yang sesuai
 */
export async function shipmentList(params: any) {
  return accurateClient.get('/api/shipment/list.do', { params });
}

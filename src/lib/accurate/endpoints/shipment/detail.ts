import { accurateClient } from '../../client';

/**
 * /api/shipment/detail.do
 * Melihat detil data Pengiriman berdasarkan id atau identifier tertentu
 */
export async function shipmentDetail(params: any) {
  return accurateClient.get('/api/shipment/detail.do', { params });
}

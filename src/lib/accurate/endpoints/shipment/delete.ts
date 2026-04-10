import { accurateClient } from '../../client';

/**
 * /api/shipment/delete.do
 * Menghapus data Pengiriman berdasarkan id tertentu
 */
export async function shipmentDelete(params: any) {
  return accurateClient.delete('/api/shipment/delete.do', params);
}

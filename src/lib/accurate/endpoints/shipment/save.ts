import { accurateClient } from '../../client';

/**
 * /api/shipment/save.do
 * Membuat data Pengiriman baru atau mengedit data Pengiriman yang sudah ada
 */
export async function shipmentSave(data: any) {
  return accurateClient.post('/api/shipment/save.do', data);
}

import { accurateClient } from '../../client';

/**
 * /api/purchase-requisition/bulk-save.do
 * Membuat mengedit beberapa data Permintaan Barang sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function purchaseRequisitionBulkSave(data: any) {
  return accurateClient.post('/api/purchase-requisition/bulk-save.do', data);
}

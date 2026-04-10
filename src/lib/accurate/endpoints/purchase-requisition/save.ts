import { accurateClient } from '../../client';

/**
 * /api/purchase-requisition/save.do
 * Membuat data Permintaan Barang baru atau mengedit data Permintaan Barang yang sudah ada
 */
export async function purchaseRequisitionSave(data: any) {
  return accurateClient.post('/api/purchase-requisition/save.do', data);
}

import { accurateClient } from '../../client';

/**
 * /api/item/search-by-no-upc.do
 * Mencari data master barang/jasa berdasarkan Kode atau UPC/Barcode
 */
export async function itemSearchByNoUpc(params: any) {
  return accurateClient.get('/api/item/search-by-no-upc.do', { params });
}

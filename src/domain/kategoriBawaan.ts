/**
 * Kategori bawaan, dua tingkat: kelompok → kategori.
 * Kasir memfilter per kategori; laporan bisa diringkas per kelompok.
 * Referensi: GS1 Global Product Classification (tingkat segmen) dan pengelompokan minimarket.
 * Pemilik bisa menambah kategori di Back Office → Pengaturan → Data Induk → Kategori.
 * Kode kategori 3 huruf, unik, dipakai sebagai awalan SKU.
 */

export interface KategoriBawaan {
  kode: string;
  nama: string;
  kelompok: string;
}

export const kelompokBawaan = [
  'Makanan',
  'Minuman',
  'Rokok',
  'Perawatan Diri',
  'Kebersihan & Rumah Tangga',
  'Bayi',
  'Kesehatan',
  'Lainnya',
] as const;

export const kategoriBawaan: KategoriBawaan[] = [
  { kode: 'SMB', nama: 'Sembako', kelompok: 'Makanan' },
  { kode: 'BMB', nama: 'Bumbu Dapur', kelompok: 'Makanan' },
  { kode: 'MIN', nama: 'Mi & Makanan Instan', kelompok: 'Makanan' },
  { kode: 'SNK', nama: 'Makanan Ringan', kelompok: 'Makanan' },
  { kode: 'SSU', nama: 'Susu', kelompok: 'Makanan' },
  { kode: 'MNM', nama: 'Minuman', kelompok: 'Minuman' },
  { kode: 'RKK', nama: 'Rokok', kelompok: 'Rokok' },
  { kode: 'PRD', nama: 'Perawatan Diri', kelompok: 'Perawatan Diri' },
  { kode: 'KBR', nama: 'Kebersihan Rumah', kelompok: 'Kebersihan & Rumah Tangga' },
  { kode: 'RTG', nama: 'Perlengkapan Rumah Tangga', kelompok: 'Kebersihan & Rumah Tangga' },
  { kode: 'GAS', nama: 'Gas & Air Galon', kelompok: 'Kebersihan & Rumah Tangga' },
  { kode: 'BYI', nama: 'Perlengkapan Bayi', kelompok: 'Bayi' },
  { kode: 'OBT', nama: 'Obat & Kesehatan', kelompok: 'Kesehatan' },
  { kode: 'ATK', nama: 'Alat Tulis', kelompok: 'Lainnya' },
  { kode: 'PKN', nama: 'Pakan Hewan', kelompok: 'Lainnya' },
  { kode: 'LLN', nama: 'Lain-lain', kelompok: 'Lainnya' },
];

/**
 * SKU = kode kategori saat barang dibuat + nomor urut 5 digit dalam kategori itu.
 * SKU tidak pernah berubah walau barang dipindah kategori.
 */
export function buatSku(kodeKategori: string, skuYangAda: string[]): string {
  const awalan = kodeKategori.toUpperCase() + '-';
  const terbesar = skuYangAda
    .filter((s) => s.startsWith(awalan))
    .map((s) => Number(s.slice(awalan.length)))
    .filter((n) => Number.isInteger(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return awalan + String(terbesar + 1).padStart(5, '0');
}

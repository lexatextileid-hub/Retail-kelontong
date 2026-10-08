/**
 * DATA CONTOH untuk pratinjau. Harga dan stok hanya ilustrasi.
 * Nanti diganti data dari database (Supabase).
 */
import type { DiskonPelanggan, Pelanggan, Produk } from '../domain/tipe';

export const produkContoh: Produk[] = [
  {
    id: 'gulaku-5', sku: 'SMB-00001', nama: 'Gulaku 5 kg', kategoriId: 'SMB', satuanDasarId: 'bks',
    letak: 'Rak toko', stokMinimum: 8, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'gulaku-5-bks', satuanId: 'bks', label: 'Bungkus', isi: 1, dibeli: false, dijual: true, hargaJual: 92000 },
      { id: 'gulaku-5-ktn', satuanId: 'ktn', label: 'Karton isi 4', isi: 4, dibeli: true, dijual: true, hargaJual: 362000 },
    ],
  },
  {
    id: 'gula-curah', sku: 'SMB-00002', kode: 'GLC', nama: 'Gula Pasir curah', kategoriId: 'SMB', satuanDasarId: 'kg',
    letak: 'Gudang ruko 5', stokMinimum: 100, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'gula-curah-kg', satuanId: 'kg', label: 'kg', isi: 1, dibeli: false, dijual: false },
      { id: 'gula-curah-krg', satuanId: 'krg', label: 'Karung 50 kg', isi: 50, dibeli: true, dijual: true, hargaJual: 815000 },
    ],
  },
  {
    id: 'gula-1kg', sku: 'SMB-00003', kode: 'GL1', nama: 'Gula Pasir 1 kg (bungkus)', kategoriId: 'SMB', satuanDasarId: 'bks',
    letak: 'Rak toko', stokMinimum: 20, metodeHarga: 'bertingkat', aktif: true,
    satuan: [{ id: 'gula-1kg-bks', satuanId: 'bks', label: 'Bungkus 1 kg', isi: 1, dibeli: false, dijual: true }],
    tingkatHarga: [
      { mulaiJumlah: 0, harga: 17500 },
      { mulaiJumlah: 5, harga: 17200 },
      { mulaiJumlah: 10, harga: 17000 },
    ],
  },
  {
    id: 'minyak-1l', sku: 'SMB-00004', nama: 'Minyak Goreng 1 L', kategoriId: 'SMB', satuanDasarId: 'pcs',
    letak: 'Rak toko, Gudang ruko 2', stokMinimum: 24, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'minyak-pcs', satuanId: 'pcs', label: 'Pcs', isi: 1, dibeli: false, dijual: true, hargaJual: 18500 },
      { id: 'minyak-ktn', satuanId: 'ktn', label: 'Karton isi 12', isi: 12, dibeli: true, dijual: true, hargaJual: 216000 },
    ],
  },
  {
    id: 'sarimi', sku: 'MIN-00001', kode: 'SRM', nama: 'Sarimi Goreng', kategoriId: 'MIN', satuanDasarId: 'pcs',
    letak: 'Rak toko, Gudang ruko 3', stokMinimum: 50, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'sarimi-pcs', satuanId: 'pcs', label: 'Pcs', isi: 1, dibeli: false, dijual: true, hargaJual: 3500 },
      { id: 'sarimi-ktn25', satuanId: 'ktn', label: 'Karton isi 25', isi: 25, dibeli: true, dijual: true, hargaJual: 81000 },
      { id: 'sarimi-ktn50', satuanId: 'ktn', label: 'Karton isi 50', isi: 50, dibeli: true, dijual: true, hargaJual: 160000 },
    ],
  },
  {
    id: 'taro', sku: 'SNK-00001', kode: 'TRO', nama: 'Taro', kategoriId: 'SNK', satuanDasarId: 'pcs',
    letak: 'Rak toko', stokMinimum: 30, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'taro-pcs', satuanId: 'pcs', label: 'Pcs', isi: 1, dibeli: false, dijual: true, hargaJual: 2500 },
      { id: 'taro-rtg', satuanId: 'rtg', label: 'Renteng isi 10', isi: 10, dibeli: false, dijual: true, hargaJual: 24000 },
      { id: 'taro-ktn', satuanId: 'ktn', label: 'Karton isi 5 renteng', isi: 50, dibeli: true, dijual: true, hargaJual: 115000 },
    ],
  },
  {
    id: 'amild', sku: 'RKK-00001', kode: 'AML', nama: 'A Mild 16', kategoriId: 'RKK', satuanDasarId: 'bks',
    letak: 'Etalase kasir', stokMinimum: 20, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'amild-bks', satuanId: 'bks', label: 'Bungkus', isi: 1, dibeli: false, dijual: true, hargaJual: 33000 },
      { id: 'amild-slp', satuanId: 'slp', label: 'Slop isi 10', isi: 10, dibeli: true, dijual: true, hargaJual: 325000 },
    ],
  },
  {
    id: 'rokok-hs', sku: 'RKK-00002', nama: 'Rokok HS 12', kategoriId: 'RKK', satuanDasarId: 'bks',
    letak: 'Etalase kasir', stokMinimum: 0, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'hs-bks', satuanId: 'bks', label: 'Bungkus', isi: 1, dibeli: false, dijual: true, hargaJual: 20500 },
      { id: 'hs-slp', satuanId: 'slp', label: 'Slop isi 10', isi: 10, dibeli: true, dijual: true, hargaJual: 200000 },
    ],
  },
  {
    id: 'air-600', sku: 'MNM-00001', nama: 'Air Mineral 600 ml', kategoriId: 'MNM', satuanDasarId: 'pcs',
    letak: 'Rak toko, Gudang ruko 7', stokMinimum: 48, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'air-pcs', satuanId: 'pcs', label: 'Pcs', isi: 1, dibeli: false, dijual: true, hargaJual: 3500 },
      { id: 'air-ktn', satuanId: 'ktn', label: 'Karton isi 24', isi: 24, dibeli: true, dijual: true, hargaJual: 70000 },
    ],
  },
  {
    id: 'skm', sku: 'SSU-00001', nama: 'Susu Kental Manis kaleng', kategoriId: 'SSU', satuanDasarId: 'klg',
    letak: 'Rak toko', stokMinimum: 24, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'skm-klg', satuanId: 'klg', label: 'Kaleng', isi: 1, dibeli: false, dijual: true, hargaJual: 12500 },
      { id: 'skm-ktn', satuanId: 'ktn', label: 'Karton isi 48', isi: 48, dibeli: true, dijual: true, hargaJual: 585000 },
    ],
  },
  {
    id: 'kecap', sku: 'BMB-00001', nama: 'Kecap Manis 520 ml', kategoriId: 'BMB', satuanDasarId: 'btl',
    letak: 'Rak toko', stokMinimum: 12, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'kecap-btl', satuanId: 'btl', label: 'Botol', isi: 1, dibeli: false, dijual: true, hargaJual: 22500 },
      { id: 'kecap-ktn', satuanId: 'ktn', label: 'Karton isi 12', isi: 12, dibeli: true, dijual: true, hargaJual: 264000 },
    ],
  },
  {
    id: 'deterjen', sku: 'KBR-00001', nama: 'Deterjen Bubuk 800 g', kategoriId: 'KBR', satuanDasarId: 'bks',
    letak: 'Rak toko', stokMinimum: 12, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [
      { id: 'det-bks', satuanId: 'bks', label: 'Bungkus', isi: 1, dibeli: false, dijual: true, hargaJual: 21000 },
      { id: 'det-ktn', satuanId: 'ktn', label: 'Karton isi 12', isi: 12, dibeli: true, dijual: true, hargaJual: 246000 },
    ],
  },
  {
    id: 'bawang-merah', sku: 'UMB-00001', kode: 'BWM', nama: 'Bawang Merah', kategoriId: 'UMB', satuanDasarId: 'kg',
    letak: 'Rak depan', stokMinimum: 10, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [{ id: 'bwm-kg', satuanId: 'kg', label: 'kg (timbang)', isi: 1, dibeli: true, dijual: true, hargaJual: 38000 }],
  },
  {
    id: 'bawang-putih', sku: 'UMB-00002', kode: 'BWP', nama: 'Bawang Putih', kategoriId: 'UMB', satuanDasarId: 'kg',
    letak: 'Rak depan', stokMinimum: 10, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [{ id: 'bwp-kg', satuanId: 'kg', label: 'kg (timbang)', isi: 1, dibeli: true, dijual: true, hargaJual: 36000 }],
  },
  {
    id: 'kemiri', sku: 'RMP-00001', nama: 'Kemiri', kategoriId: 'RMP', satuanDasarId: 'kg',
    letak: 'Rak depan', stokMinimum: 2, metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [{ id: 'kemiri-kg', satuanId: 'kg', label: 'kg (timbang)', isi: 1, dibeli: true, dijual: true, hargaJual: 52000 }],
  },
];

/** Stok contoh dalam satuan dasar. */
export const stokContoh: Record<string, number> = {
  'gulaku-5': 22, 'gula-curah': 350, 'gula-1kg': 46, 'minyak-1l': 64, sarimi: 213, taro: 237,
  amild: 47, 'rokok-hs': 18, 'air-600': 130, skm: 70, kecap: 15, deterjen: 0,
  'bawang-merah': 18.5, 'bawang-putih': 12.2, kemiri: 3.4,
};

export interface PelangganContoh extends Pelanggan {
  hp?: string;
  /** Tempo bayar kasbon (hari sejak nota). Diatur pemilik di Back Office. */
  tempoHari: number;
}

/** Tempo bawaan pelanggan baru dari kasir (pemilik bisa mengubah di Back Office). */
export const TEMPO_BAWAAN_HARI = 7;

export const pelangganContoh: PelangganContoh[] = [
  { id: 'umum', nama: 'Umum', jenis: 'umum', batasKasbon: 0, tempoHari: 0 },
  { id: 'antok', nama: 'Antok', jenis: 'terdaftar', batasKasbon: 500000, hp: '0812-xxxx-1101', tempoHari: 14 },
  { id: 'amir', nama: 'Amir', jenis: 'terdaftar', batasKasbon: 300000, hp: '0813-xxxx-2202', tempoHari: 7 },
  { id: 'bu-sri', nama: 'Warung Bu Sri', jenis: 'terdaftar', batasKasbon: 1000000, hp: '0857-xxxx-3303', tempoHari: 30 },
];

/** Nama bank untuk keterangan pembayaran transfer (bisa diketik lain). */
export const bankContoh = ['BCA', 'BRI', 'Mandiri', 'BNI', 'BSI'];

export const diskonContoh: DiskonPelanggan[] = [
  { pelangganId: 'antok', produkId: 'gula-1kg', jenis: 'potongan_rp', nilai: 200 },
  { pelangganId: 'bu-sri', produkId: 'sarimi', jenis: 'potongan_rp', nilai: 50 },
  { pelangganId: 'bu-sri', produkId: 'taro', jenis: 'potongan_rp', nilai: 50 },
];

/** PIN pemilik untuk pratinjau saja. */
export const PIN_PEMILIK_CONTOH = '1234';

/* ---------- Distributor & harga beli (contoh) ---------- */

export interface DistributorContoh {
  id: string;
  nama: string;
  hp: string; // format internasional untuk WhatsApp, mis. 6281200000001
  terminHari: number; // 0 = cash
}

export const distributorContoh: DistributorContoh[] = [
  { id: 'dist-a', nama: 'Distributor A', hp: '6281200000001', terminHari: 14 },
  { id: 'dist-b', nama: 'Distributor B', hp: '6281200000002', terminHari: 0 },
  { id: 'dist-c', nama: 'Distributor C', hp: '6281200000003', terminHari: 7 },
];

export interface HargaBeliTerakhir {
  distributorId: string;
  satuanProdukId: string; // satuan beli
  harga: number; // per satuan beli
}

/** Harga beli terakhir per barang per distributor (contoh). */
export const hargaBeliContoh: Record<string, HargaBeliTerakhir[]> = {
  'gulaku-5': [{ distributorId: 'dist-a', satuanProdukId: 'gulaku-5-ktn', harga: 340000 }],
  'gula-curah': [{ distributorId: 'dist-b', satuanProdukId: 'gula-curah-krg', harga: 780000 }],
  'minyak-1l': [{ distributorId: 'dist-a', satuanProdukId: 'minyak-ktn', harga: 204000 }],
  sarimi: [
    { distributorId: 'dist-a', satuanProdukId: 'sarimi-ktn50', harga: 150000 },
    { distributorId: 'dist-c', satuanProdukId: 'sarimi-ktn25', harga: 76000 },
  ],
  taro: [{ distributorId: 'dist-c', satuanProdukId: 'taro-ktn', harga: 105000 }],
  amild: [{ distributorId: 'dist-a', satuanProdukId: 'amild-slp', harga: 312000 }],
  'rokok-hs': [{ distributorId: 'dist-a', satuanProdukId: 'hs-slp', harga: 195000 }],
  'air-600': [{ distributorId: 'dist-b', satuanProdukId: 'air-ktn', harga: 64000 }],
  skm: [{ distributorId: 'dist-c', satuanProdukId: 'skm-ktn', harga: 552000 }],
  kecap: [{ distributorId: 'dist-c', satuanProdukId: 'kecap-ktn', harga: 246000 }],
  deterjen: [{ distributorId: 'dist-b', satuanProdukId: 'det-ktn', harga: 228000 }],
  'bawang-merah': [{ distributorId: 'dist-b', satuanProdukId: 'bwm-kg', harga: 32000 }],
  'bawang-putih': [{ distributorId: 'dist-b', satuanProdukId: 'bwp-kg', harga: 30000 }],
  kemiri: [{ distributorId: 'dist-b', satuanProdukId: 'kemiri-kg', harga: 44000 }],
};

/** Modal rata-rata stok yang ada saat ini, per satuan dasar (contoh). */
export const modalContoh: Record<string, number> = {
  'gulaku-5': 85000, 'gula-curah': 15600, 'gula-1kg': 16300, 'minyak-1l': 17000, sarimi: 3000, taro: 2100,
  amild: 31200, 'rokok-hs': 19500, 'air-600': 2670, skm: 11500, kecap: 20500, deterjen: 19000,
  'bawang-merah': 32000, 'bawang-putih': 30000, kemiri: 44000,
};

/** Aturan stok untuk saran Surat Pesanan (contoh): stok maksimum (satuan dasar),
 *  jumlah order tetap (dalam satuan beli bawaan), dan rata-rata penjualan per hari (satuan dasar). */
export const aturStokContoh: Record<string, { maks: number; orderTetap: number; rataHarian: number }> = {
  'gulaku-5': { maks: 40, orderTetap: 5, rataHarian: 2 },
  'gula-curah': { maks: 500, orderTetap: 6, rataHarian: 22 },
  'gula-1kg': { maks: 80, orderTetap: 0, rataHarian: 6 },
  'minyak-1l': { maks: 120, orderTetap: 6, rataHarian: 7 },
  sarimi: { maks: 400, orderTetap: 4, rataHarian: 25 },
  taro: { maks: 400, orderTetap: 4, rataHarian: 20 },
  amild: { maks: 120, orderTetap: 5, rataHarian: 6 },
  'rokok-hs': { maks: 20, orderTetap: 1, rataHarian: 0.5 },
  'air-600': { maks: 240, orderTetap: 5, rataHarian: 12 },
  skm: { maks: 96, orderTetap: 1, rataHarian: 3 },
  kecap: { maks: 48, orderTetap: 2, rataHarian: 1.5 },
  deterjen: { maks: 48, orderTetap: 2, rataHarian: 2 },
  'bawang-merah': { maks: 40, orderTetap: 20, rataHarian: 2.5 },
  'bawang-putih': { maks: 30, orderTetap: 15, rataHarian: 1.5 },
  kemiri: { maks: 8, orderTetap: 5, rataHarian: 0.3 },
};

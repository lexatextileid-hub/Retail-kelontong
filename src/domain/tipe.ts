/**
 * Tipe data inti. Aturan bisnis lengkap: docs/keputusan-desain.md
 *
 * Semua jumlah stok dan modal disimpan dalam SATUAN DASAR barang
 * (satuan terkecil yang dijual: pcs untuk mi, bungkus untuk rokok, kg untuk gula).
 * Semua uang dalam rupiah bulat (number).
 */

/** Data induk satuan, dikelola di Pengaturan. Isi kemasan TIDAK di sini, tapi per barang. */
export interface Satuan {
  id: string;
  nama: string; // "Dus"
  singkatan: string; // "dus"
  bolehDesimal: boolean; // kg/liter: ya, dus/pcs: tidak
}

/** Satu baris di tabel satuan sebuah barang. */
export interface SatuanProduk {
  id: string;
  satuanId: string;
  label: string; // ditampilkan di dropdown, mis. "Dus isi 50"
  isi: number; // berapa satuan dasar di dalamnya; satuan dasar = 1
  barcode?: string; // opsional
  dibeli: boolean; // dipakai saat beli dari distributor
  dijual: boolean; // muncul di kasir
  hargaJual?: number; // dipakai jika metode harga = per_satuan
  /** Harga beli perkiraan per satuan ini (satuan beli), dipakai sampai ada faktur untuk satuan ini. */
  hargaBeli?: number;
}

/** Harga per satuan dasar yang berlaku mulai jumlah tertentu (dalam satuan dasar). */
export interface TingkatHarga {
  mulaiJumlah: number;
  harga: number;
}

export type MetodeHarga = 'per_satuan' | 'bertingkat';

export interface Produk {
  id: string;
  sku: string; // otomatis: kode kategori + nomor urut, mis. "SMB-00012"; tidak pernah berubah
  kode?: string; // kode cepat untuk ketik cepat, mis. "SRM"
  letak?: string; // catatan letak, mis. "Rak toko, Gudang ruko 5"
  nama: string;
  kategoriId: string;
  satuanDasarId: string;
  stokMinimum: number; // dalam satuan dasar
  /** Stok maksimum (satuan dasar): dipakai saran Pesanan Toko "sampai maks". */
  stokMaksimum?: number;
  /** Harga beli perkiraan per satuan dasar, dipakai sampai ada faktur pertama. */
  hargaBeliAcuan?: number;
  metodeHarga: MetodeHarga;
  satuan: SatuanProduk[]; // termasuk baris satuan dasar (isi = 1)
  tingkatHarga: TingkatHarga[]; // dipakai jika metode = bertingkat
  aktif: boolean;
  /** Barang musiman (mis. sirup Lebaran): tidak dicap "Berhenti" di luar musimnya. */
  musiman?: boolean;
}

export type JenisPelanggan = 'umum' | 'terdaftar';

export interface Pelanggan {
  id: string;
  nama: string;
  jenis: JenisPelanggan; // "umum" = pembeli tanpa nama, tidak bisa kasbon
  batasKasbon: number; // 0 untuk umum
}

/** Diskon khusus pelanggan untuk satu barang. Potongan Rp dihitung per satuan dasar. */
export interface DiskonPelanggan {
  pelangganId: string;
  produkId: string;
  jenis: 'potongan_rp' | 'potongan_persen';
  nilai: number;
}

export interface Distributor {
  id: string;
  nama: string;
  terminHari: number; // 0 = cash
}

/**
 * Lapisan stok FIFO. Setiap baris faktur (atau saldo awal) menjadi satu lapisan
 * dengan modal per satuan dasarnya sendiri. Penjualan menghabiskan lapisan tertua dulu.
 */
export interface LapisanStok {
  id: string;
  produkId: string;
  sumber: 'saldo_awal' | 'faktur';
  fakturBarisId?: string;
  tanggal: string; // ISO
  jumlahAwal: number; // satuan dasar
  sisa: number; // satuan dasar
  modalPerSatuanDasar: number;
}

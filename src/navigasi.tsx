/**
 * Daftar menu aplikasi, per mode: Kasir, Gudang, Back Office.
 * Menu bisa punya sub-menu (`anak`). Modul yang selesai dibangun mengisi `halaman`.
 * Selama `halaman` kosong, yang tampil adalah ringkasan rencana modul tersebut.
 */
import type { ReactNode } from 'react';
import type { Peran } from './data/toko';
import { BuatPesanan } from './features/pesanan/BuatPesanan';
import { DaftarPesanan } from './features/pesanan/DaftarPesanan';
import { DetailPesanan } from './features/pesanan/DetailPesanan';
import { Penjualan } from './features/penjualan/Penjualan';
import { DaftarKasbon } from './features/kasbon/DaftarKasbon';
import { DetailKasbon } from './features/kasbon/DetailKasbon';
import { KasbonLama } from './features/kasbon/KasbonLama';
import { BuatSPManual } from './features/sp/BuatSPManual';
import { DaftarSP } from './features/sp/DaftarSP';
import { SaranSP } from './features/sp/SaranSP';

export interface SubMenu {
  path: string;
  judul: string;
  halaman?: ReactNode;
  /** Tidak tampil di menu samping (mis. halaman detail). */
  tersembunyi?: boolean;
}

export interface Menu {
  path: string;
  judul: string;
  ikon: string;
  ringkasan: string;
  rencana: string[];
  halaman?: ReactNode;
  anak?: SubMenu[];
  /** Peran yang boleh membuka menu ini; kosong = semua peran yang boleh membuka modenya. */
  izin?: Peran[];
}

export type NamaMode = 'kasir' | 'gudang' | 'admin';

/** Mode yang boleh dibuka tiap peran. */
export const modeUntukPeran: Record<Peran, NamaMode[]> = {
  pemilik: ['kasir', 'gudang', 'admin'],
  admin: ['kasir', 'gudang'],
  kasir: ['kasir'],
};

export const menuKasir: Menu[] = [
  {
    path: 'penjualan', judul: 'Penjualan', ikon: 'keranjang',
    ringkasan: 'Layar kasir untuk retail dan grosir yang datang langsung.', rencana: [],
    halaman: <Penjualan />,
  },
  {
    path: 'pesanan', judul: 'Pesanan Pelanggan', ikon: 'pesanan',
    ringkasan: 'Pelanggan memesan ke toko: dicatat, disiapkan, diserahkan, lalu dibayar.',
    rencana: [
      'Status: Dicatat → Menunggu barang → Barang siap → Disiapkan → Diserahkan → Lunas/Tempo',
      'Pelanggan wajib terdaftar; DP opsional',
      'Harga disesuaikan saat faktur baru masuk; di bawah target untung perlu persetujuan pemilik',
      'Serah terima sebagian boleh; surat jalan otomatis bila diantar',
    ],
    anak: [
      { path: 'daftar', judul: 'Daftar', halaman: <DaftarPesanan /> },
      { path: 'baru', judul: 'Buat', halaman: <BuatPesanan /> },
      { path: 'detail/:id', judul: 'Detail', halaman: <DetailPesanan />, tersembunyi: true },
    ],
  },
  {
    path: 'kasbon', judul: 'Kasbon', ikon: 'kasbon',
    ringkasan: 'Kasbon pelanggan (nota kasir, kasbon lama, pesanan yang sudah diserahkan) dan pembayarannya.',
    rencana: ['Cari pelanggan, lihat sisa kasbon, batas, dan jatuh tempo', 'Bayar sebagian/penuh, tunai/transfer, menutup nota tertua dulu', 'Catat kasbon lama tanpa rincian barang'],
    anak: [
      { path: 'daftar', judul: 'Daftar Kasbon', halaman: <DaftarKasbon /> },
      { path: 'lama', judul: 'Catat Kasbon Lama', halaman: <KasbonLama /> },
      { path: 'detail/:id', judul: 'Detail', halaman: <DetailKasbon />, tersembunyi: true },
    ],
  },
  {
    path: 'retur', judul: 'Retur', ikon: 'retur',
    ringkasan: 'Retur dari pembeli, wajib dengan nota, maksimal 3×24 jam.',
    rencana: ['Ketik nomor nota, atau cari lewat tanggal / nama pelanggan', 'Uang kembali, tukar barang, atau potong kasbon; barang bagus atau rusak', 'Perlu PIN pemilik'],
  },
  {
    path: 'riwayat', judul: 'Riwayat', ikon: 'riwayat',
    ringkasan: 'Semua nota hari ini.',
    rencana: ['Cari dan filter nota', 'Cetak ulang, kirim WhatsApp, retur (PIN pemilik)'],
  },
  {
    path: 'kas-laci', judul: 'Kas Laci', ikon: 'kas',
    ringkasan: 'Buka/tutup kasir harian, pengeluaran, bayar distributor, laporan harian.',
    rencana: [
      'Buka kasir: modal awal (sisa kemarin)',
      'Pengeluaran: kategori, jumlah, keterangan & penerima wajib, bukti kas keluar',
      'Bayar distributor dari laci atau titipan brankas',
      'Tutup kasir: uang fisik, selisih (persetujuan pemilik), dibagi ke sisa laci / brankas / bank / prive',
      'Laporan harian: cetak thermal atau biasa',
    ],
    anak: [
      { path: 'buka-tutup', judul: 'Buka / Tutup Kasir' },
      { path: 'pengeluaran', judul: 'Pengeluaran' },
      { path: 'bayar-distributor', judul: 'Bayar Distributor' },
      { path: 'laporan-harian', judul: 'Laporan Harian' },
    ],
  },
];

export const menuGudang: Menu[] = [
  {
    path: 'stok-barang', judul: 'Stok Barang', ikon: 'stok',
    ringkasan: 'Daftar dan detail barang, tambah barang baru, umur stok.',
    rencana: [
      'Daftar: nama, satuan, stok, harga beli, harga jual kecil/sedang/besar + untung',
      'Detail: satuan, stok per kedatangan (FIFO), riwayat keluar-masuk, harga beli per distributor',
      'Tambah barang baru: pemilik atau PIN pemilik; SKU otomatis',
      'Umur stok: kuning 3 bln, oranye 6 bln (retur), merah 12 bln (kerugian tahunan)',
    ],
    anak: [
      { path: 'daftar', judul: 'Daftar Barang' },
      { path: 'tambah', judul: 'Tambah Barang' },
      { path: 'umur-stok', judul: 'Umur Stok' },
    ],
  },
  {
    path: 'pesanan-toko', judul: 'Pesanan Toko', ikon: 'pembelian', izin: ['pemilik', 'admin'],
    ringkasan: 'Toko memesan ke distributor lewat Surat Pesanan: dari pesanan pelanggan, stok menipis, atau pesanan baru.',
    rencana: [
      'Dari Pesanan Pelanggan: barang pre-order yang belum ada, jumlah sesuai pesanan',
      'Stok Menipis: stok di bawah minimum; jumlah dari 3 cara (sampai maksimum, order tetap, rata-rata penjualan)',
      'Pesanan Baru: barang terdaftar atau permintaan (barang belum terdaftar)',
      'Kirim Surat Pesanan ke distributor lewat WhatsApp, salin, atau cetak',
    ],
    anak: [
      { path: 'dari-pesanan', judul: 'Dari Pesanan Pelanggan', halaman: <SaranSP sumber="pesanan" /> },
      { path: 'stok-menipis', judul: 'Stok Menipis', halaman: <SaranSP sumber="stok" /> },
      { path: 'baru', judul: 'Pesanan Baru', halaman: <BuatSPManual /> },
      { path: 'daftar', judul: 'Daftar Pesanan Toko', halaman: <DaftarSP /> },
    ],
  },
  {
    path: 'barang-masuk', judul: 'Barang Masuk', ikon: 'masuk',
    ringkasan: 'Input faktur distributor atau pembelian tanpa nota.',
    rencana: ['Satuan urut besar → kecil; isi kemasan wajib dicek fisik', 'Tandai baris untuk pesanan atau barang ikutan', 'Cash/tempo; total dicocokkan dengan kertas faktur'],
    anak: [{ path: 'dari-sp', judul: 'Dari Pesanan Toko', halaman: <DaftarSP hanyaTerbuka /> }, { path: 'tanpa-nota', judul: 'Tanpa Nota' }],
  },
  {
    path: 'siapkan-pesanan', judul: 'Siapkan Pesanan', ikon: 'siapkan',
    ringkasan: 'Menyiapkan dan menyerahkan pesanan pelanggan.',
    rencana: ['Daftar pesanan siap beserta letak barang', 'Cetak surat jalan / nota serah terima'],
  },
  {
    path: 'repack', judul: 'Repack', ikon: 'repack',
    ringkasan: 'Bungkus ulang barang curah.',
    rencana: ['Bahan dipakai, hasil jadi, sisa', 'Susut otomatis; lewat 1 kg per 50 kg wajib alasan'],
  },
  {
    path: 'hitung-stok', judul: 'Hitung Stok', ikon: 'hitung',
    ringkasan: 'Opname bergilir per kategori, toko + 11 ruko.',
    rencana: ['Kolom per tingkat satuan, total otomatis', 'Selisih disetujui pemilik'],
  },
  {
    path: 'retur-distributor', judul: 'Retur ke Distributor', ikon: 'returDist',
    ringkasan: 'Kembalikan barang ke distributor.',
    rencana: ['Pilih faktur asal; potong hutang / uang kembali / ganti barang'],
  },
  {
    path: 'barang-rusak', judul: 'Barang Rusak', ikon: 'rusak',
    ringkasan: 'Penampung barang rusak.',
    rencana: ['Dari retur pembeli, hitung stok, atau gudang', 'Diretur ke distributor atau dibuang (kerugian)'],
  },
];

export const menuBackOffice: Menu[] = [
  {
    path: 'dashboard', judul: 'Dashboard', ikon: 'dashboard',
    ringkasan: 'Ringkasan hari ini.',
    rencana: ['Omzet dan laba kotor hari ini', 'Stok tipis & daftar order, stok minus belum terjelaskan', 'Hutang jatuh tempo, kasbon terbesar, pelanggan baru belum diatur'],
  },
  {
    path: 'produk', judul: 'Produk & Harga', ikon: 'produk',
    ringkasan: 'Harga jual, target untung, diskon pelanggan.',
    rencana: ['Ubah harga cepat', 'Target untung per kategori/barang', 'Diskon khusus per pelanggan'],
    anak: [
      { path: 'ubah-harga', judul: 'Ubah Harga Cepat' },
      { path: 'target-untung', judul: 'Target Untung' },
      { path: 'diskon-pelanggan', judul: 'Diskon Pelanggan' },
    ],
  },
  {
    path: 'kontak', judul: 'Kontak', ikon: 'kontak',
    ringkasan: 'Pelanggan dan distributor.',
    rencana: ['Pelanggan: batas kasbon, diskon', 'Distributor: termin tempo, menerima retur'],
    anak: [{ path: 'pelanggan', judul: 'Pelanggan' }, { path: 'distributor', judul: 'Distributor' }],
  },
  {
    path: 'pembelian', judul: 'Pembelian', ikon: 'pembelian',
    ringkasan: 'Semua pesanan toko ke distributor beserta fakturnya, periksa faktur, pantauan per distributor.',
    rencana: ['Pesanan Toko: data yang sama dengan Gudang (dari pesanan pelanggan, stok menipis, pesanan baru) + faktur', 'Periksa faktur & pembelian tanpa nota', 'Barang laku/lambat/berhenti per distributor'],
    anak: [
      { path: 'pesanan-toko', judul: 'Pesanan Toko', halaman: <DaftarSP dariOffice /> },
      { path: 'periksa-faktur', judul: 'Periksa Faktur' },
      { path: 'per-distributor', judul: 'Per Distributor' },
    ],
  },
  {
    path: 'hutang-piutang', judul: 'Hutang & Piutang', ikon: 'hutang',
    ringkasan: 'Hutang ke distributor dan piutang pelanggan.',
    rencana: ['Piutang: data sama dengan Kasir → Kasbon (kasbon kasir, kasbon lama, pesanan tempo)', 'Hutang distributor: faktur tempo + hutang lama tanpa rincian barang', 'Pembayaran bertahap dan campuran', 'Umur piutang/hutang'],
    anak: [
      { path: 'hutang', judul: 'Hutang Distributor' },
      { path: 'piutang', judul: 'Piutang Pelanggan', halaman: <DaftarKasbon dariOffice /> },
      { path: 'lama', judul: 'Catat Kasbon Lama', halaman: <KasbonLama />, tersembunyi: true },
      { path: 'detail/:id', judul: 'Detail Piutang', halaman: <DetailKasbon />, tersembunyi: true },
    ],
  },
  {
    path: 'keuangan', judul: 'Keuangan', ikon: 'keuangan',
    ringkasan: 'Laci, brankas, bank, pengeluaran, prive.',
    rencana: ['Buku brankas', 'Pengeluaran dari brankas/bank (cermin pengeluaran kasir)', 'Prive per sumber', 'Posisi usaha'],
    anak: [
      { path: 'brankas', judul: 'Buku Brankas' },
      { path: 'pengeluaran', judul: 'Pengeluaran' },
      { path: 'prive', judul: 'Prive' },
      { path: 'posisi-usaha', judul: 'Posisi Usaha' },
    ],
  },
  {
    path: 'laporan', judul: 'Laporan', ikon: 'laporan',
    ringkasan: 'Harian, bulanan (kalender), rentang bebas.',
    rencana: ['Laba (pasti vs perkiraan)', 'Susut, potongan, diskon pelanggan', 'Laporan harian per kasir'],
    anak: [
      { path: 'harian', judul: 'Harian' },
      { path: 'bulanan', judul: 'Bulanan' },
      { path: 'susut', judul: 'Susut' },
      { path: 'umur-stok', judul: 'Umur Stok' },
    ],
  },
  {
    path: 'pengaturan', judul: 'Pengaturan', ikon: 'pengaturan',
    ringkasan: 'Toko, pengguna, aturan, data induk.',
    rencana: [
      'Toko: profil, catatan struk, penomoran, stasiun printer',
      'Pengguna, PIN, mode, izin',
      'Aturan: potongan Rp 500 / Rp 10.000, retur 3×24 jam, target untung 5%, susut 2%',
      'Data induk: satuan, kategori, kategori pengeluaran, tempat uang, ruko',
    ],
    anak: [
      { path: 'toko', judul: 'Toko' },
      { path: 'pengguna', judul: 'Pengguna & Akses' },
      { path: 'aturan', judul: 'Aturan' },
      { path: 'data-induk', judul: 'Data Induk' },
    ],
  },
];

export const daftarMode: { kode: NamaMode; judul: string; menu: Menu[] }[] = [
  { kode: 'kasir', judul: 'Kasir', menu: menuKasir },
  { kode: 'gudang', judul: 'Gudang', menu: menuGudang },
  { kode: 'admin', judul: 'Back Office', menu: menuBackOffice },
];

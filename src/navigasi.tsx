/**
 * Daftar menu aplikasi, per mode: Kasir, Gudang, Back Office.
 * Modul yang selesai dibangun cukup mengisi `halaman`.
 * Selama `halaman` kosong, yang tampil adalah ringkasan rencana modul tersebut.
 */
import type { ReactNode } from 'react';
import { Penjualan } from './features/penjualan/Penjualan';

export interface Menu {
  path: string;
  judul: string;
  ringkasan: string;
  rencana: string[];
  halaman?: ReactNode;
}

export const menuKasir: Menu[] = [
  {
    path: 'penjualan',
    judul: 'Penjualan',
    ringkasan: 'Layar kasir untuk retail dan grosir yang datang langsung.',
    rencana: [],
    halaman: <Penjualan />,
  },
  {
    path: 'pesanan',
    judul: 'Pesanan',
    ringkasan: 'Pesanan grosir yang barangnya perlu diorder ke distributor dulu.',
    rencana: [
      'Status: Dicatat → Menunggu barang → Barang siap → Disiapkan → Diserahkan → Lunas/Tempo',
      'Pelanggan wajib terdaftar; DP opsional',
      'Harga disesuaikan saat faktur baru masuk; di bawah target untung perlu persetujuan pemilik',
      'Serah terima sebagian boleh; surat jalan otomatis bila diantar',
    ],
  },
  {
    path: 'kasbon',
    judul: 'Kasbon',
    ringkasan: 'Cek kasbon pelanggan dan terima pembayaran.',
    rencana: ['Cari pelanggan, lihat sisa kasbon dan batasnya', 'Bayar sebagian/penuh, tunai/transfer, menutup nota tertua dulu'],
  },
  {
    path: 'retur',
    judul: 'Retur',
    ringkasan: 'Retur dari pembeli, wajib dengan nota, maksimal 3×24 jam.',
    rencana: [
      'Ketik nomor nota, atau cari lewat tanggal / nama pelanggan',
      'Uang kembali, tukar barang, atau potong kasbon; barang bagus atau rusak',
      'Perlu PIN pemilik',
    ],
  },
  {
    path: 'riwayat',
    judul: 'Riwayat',
    ringkasan: 'Semua nota hari ini.',
    rencana: ['Cari dan filter nota', 'Cetak ulang, kirim WhatsApp, retur (PIN pemilik)'],
  },
  {
    path: 'kas-laci',
    judul: 'Kas Laci',
    ringkasan: 'Buka/tutup kasir harian, pengeluaran, bayar distributor, laporan harian.',
    rencana: [
      'Buka kasir: modal awal (sisa kemarin)',
      'Pengeluaran: kategori, jumlah, keterangan & penerima wajib, bukti kas keluar',
      'Bayar distributor dari laci atau titipan brankas',
      'Tutup kasir: uang fisik, selisih (persetujuan pemilik), dibagi ke sisa laci / brankas / bank / prive',
      'Laporan harian: cetak thermal atau biasa',
    ],
  },
];

export const menuGudang: Menu[] = [
  {
    path: 'stok-barang',
    judul: 'Stok Barang',
    ringkasan: 'Daftar dan detail barang, tambah barang baru.',
    rencana: [
      'Daftar: nama, satuan, stok, harga beli, harga jual kecil/sedang/besar + untung',
      'Detail: satuan, stok per kedatangan (FIFO), riwayat keluar-masuk, harga beli per distributor',
      'Tambah barang baru: pemilik atau PIN pemilik; SKU otomatis',
    ],
  },
  {
    path: 'barang-masuk',
    judul: 'Barang Masuk',
    ringkasan: 'Input faktur distributor atau pembelian tanpa nota.',
    rencana: [
      'Satuan urut besar → kecil; isi kemasan wajib dicek fisik',
      'Tandai baris untuk pesanan atau barang ikutan',
      'Cash/tempo; total dicocokkan dengan kertas faktur',
    ],
  },
  {
    path: 'siapkan-pesanan',
    judul: 'Siapkan Pesanan',
    ringkasan: 'Menyiapkan dan menyerahkan pesanan.',
    rencana: ['Daftar pesanan siap beserta letak barang', 'Cetak surat jalan / nota serah terima'],
  },
  {
    path: 'repack',
    judul: 'Repack',
    ringkasan: 'Bungkus ulang barang curah.',
    rencana: ['Bahan dipakai, hasil jadi, sisa', 'Susut otomatis; lewat 1 kg per 50 kg wajib alasan'],
  },
  {
    path: 'hitung-stok',
    judul: 'Hitung Stok',
    ringkasan: 'Opname bergilir per kategori, toko + 11 ruko.',
    rencana: ['Kolom per tingkat satuan, total otomatis', 'Selisih disetujui pemilik'],
  },
  {
    path: 'retur-distributor',
    judul: 'Retur ke Distributor',
    ringkasan: 'Kembalikan barang ke distributor.',
    rencana: ['Pilih faktur asal; potong hutang / uang kembali / ganti barang'],
  },
  {
    path: 'barang-rusak',
    judul: 'Barang Rusak',
    ringkasan: 'Penampung barang rusak.',
    rencana: ['Dari retur pembeli, hitung stok, atau gudang', 'Diretur ke distributor atau dibuang (kerugian)'],
  },
];

export const menuBackOffice: Menu[] = [
  {
    path: 'dashboard',
    judul: 'Dashboard',
    ringkasan: 'Ringkasan hari ini.',
    rencana: [
      'Omzet dan laba kotor hari ini',
      'Stok tipis & daftar order, stok minus belum terjelaskan',
      'Hutang jatuh tempo, kasbon terbesar, pelanggan baru belum diatur',
    ],
  },
  {
    path: 'produk',
    judul: 'Produk & Harga',
    ringkasan: 'Harga jual, target untung, diskon pelanggan.',
    rencana: ['Ubah harga cepat', 'Target untung per kategori/barang', 'Diskon khusus per pelanggan'],
  },
  {
    path: 'kontak',
    judul: 'Kontak',
    ringkasan: 'Pelanggan dan distributor.',
    rencana: ['Pelanggan: batas kasbon, diskon', 'Distributor: termin tempo, menerima retur'],
  },
  {
    path: 'pembelian',
    judul: 'Pembelian',
    ringkasan: 'Periksa faktur, daftar order, pantauan per distributor.',
    rencana: ['Periksa faktur & pembelian tanpa nota', 'Daftar order', 'Barang laku/lambat/berhenti per distributor'],
  },
  {
    path: 'hutang-piutang',
    judul: 'Hutang & Piutang',
    ringkasan: 'Hutang ke distributor dan piutang pelanggan.',
    rencana: ['Pembayaran bertahap dan campuran', 'Umur piutang'],
  },
  {
    path: 'keuangan',
    judul: 'Keuangan',
    ringkasan: 'Laci, brankas, bank, pengeluaran, prive.',
    rencana: ['Buku brankas', 'Pengeluaran dari brankas/bank (cermin pengeluaran kasir)', 'Prive per sumber', 'Posisi usaha'],
  },
  {
    path: 'laporan',
    judul: 'Laporan',
    ringkasan: 'Harian, bulanan (kalender), rentang bebas.',
    rencana: ['Laba (pasti vs perkiraan)', 'Susut, potongan, diskon pelanggan', 'Laporan harian per kasir'],
  },
  {
    path: 'pengaturan',
    judul: 'Pengaturan',
    ringkasan: 'Toko, pengguna, aturan, data induk.',
    rencana: [
      'Toko: profil, catatan struk, penomoran, stasiun printer',
      'Pengguna, PIN, mode, izin',
      'Aturan: potongan Rp 500 / Rp 10.000, retur 3×24 jam, target untung 5%, susut 2%',
      'Data induk: satuan, kategori, kategori pengeluaran, tempat uang, ruko',
    ],
  },
];

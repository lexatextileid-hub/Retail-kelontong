/**
 * Daftar menu aplikasi.
 * Setiap modul yang selesai dibangun cukup mengganti `halaman` dengan komponennya.
 * Selama `halaman` kosong, yang tampil adalah ringkasan rencana modul tersebut.
 */
import type { ReactNode } from 'react';

export interface Menu {
  path: string;
  judul: string;
  ringkasan: string;
  rencana: string[];
  halaman?: ReactNode;
}

export const menuOperasional: Menu[] = [
  {
    path: 'penjualan',
    judul: 'Penjualan',
    ringkasan: 'Layar kasir: cari barang, pilih satuan, pilih pelanggan, bayar.',
    rencana: [
      'Cari barang dengan mengetik nama atau kode pendek, plus filter kategori',
      'Pilih satuan per baris (pcs, pak, dus, slop, kg)',
      'Harga per satuan atau harga bertingkat dihitung otomatis',
      'Diskon pelanggan terisi otomatis dan boleh diubah kasir (perubahan tercatat)',
      'Bayar tunai, transfer, kasbon, atau campuran; pelanggan Umum tidak bisa kasbon',
      'Simpan sementara (hold), retur/batal dengan PIN pemilik',
    ],
  },
  {
    path: 'kasbon',
    judul: 'Kasbon',
    ringkasan: 'Cek saldo kasbon pelanggan dan terima pembayaran.',
    rencana: [
      'Cari pelanggan, lihat sisa kasbon dan batasnya',
      'Terima pembayaran, otomatis dialokasikan ke nota tertua',
    ],
  },
  {
    path: 'barang-masuk',
    judul: 'Barang Masuk',
    ringkasan: 'Input faktur distributor dengan cepat, seperti di apotek.',
    rencana: [
      'Kepala faktur: distributor, nomor faktur kertas, tanggal, cash/tempo, jatuh tempo',
      'Baris: ketik nama/kode barang, satuan (mis. "Dus isi 50"), qty, harga, diskon',
      'Isi kemasan bisa diubah per baris dan tercatat',
      'Satuan dan harga terakhir dari distributor yang sama terisi otomatis',
      'Total input dicocokkan dengan total yang tertulis di kertas faktur',
    ],
  },
  {
    path: 'hitung-stok',
    judul: 'Hitung Stok',
    ringkasan: 'Input hasil hitung fisik untuk opname bergilir per kategori.',
    rencana: [
      'Pilih kategori atau rak yang dihitung hari ini',
      'Input jumlah fisik; selisih menunggu persetujuan pemilik',
    ],
  },
  {
    path: 'riwayat',
    judul: 'Riwayat',
    ringkasan: 'Transaksi hari ini dan cetak ulang struk.',
    rencana: ['Daftar transaksi hari ini', 'Cetak ulang struk', 'Batal/retur dengan PIN pemilik'],
  },
];

export const menuBackOffice: Menu[] = [
  {
    path: 'dashboard',
    judul: 'Dashboard',
    ringkasan: 'Ringkasan hari ini.',
    rencana: ['Omzet dan laba kotor hari ini', 'Stok tipis', 'Hutang jatuh tempo', 'Kasbon terbesar'],
  },
  {
    path: 'produk',
    judul: 'Produk',
    ringkasan: 'Data barang, satuan, dan harga.',
    rencana: [
      'Satuan dasar = satuan terkecil yang dijual; stok & modal dihitung dalam satuan ini',
      'Tabel satuan per barang: isi, barcode opsional, dibeli/dijual, harga jual',
      'Metode harga: per satuan atau bertingkat per jumlah',
      'Diskon khusus per pelanggan per barang (Rp atau %)',
      'Riwayat harga beli per distributor',
      'Import dari Excel',
    ],
  },
  {
    path: 'kontak',
    judul: 'Kontak',
    ringkasan: 'Pelanggan dan distributor.',
    rencana: ['Pelanggan: batas kasbon; "Umum" bawaan tidak bisa kasbon', 'Distributor: termin tempo default'],
  },
  {
    path: 'pembelian',
    judul: 'Pembelian',
    ringkasan: 'Periksa faktur dan retur ke distributor.',
    rencana: [
      'Periksa dan koreksi faktur dari Barang Masuk',
      'Diskon faktur dibagi ke setiap baris; barang bonus masuk dengan harga 0',
      'Retur pembelian memotong hutang',
    ],
  },
  {
    path: 'inventori',
    judul: 'Inventori',
    ringkasan: 'Kartu stok, opname, dan penyesuaian.',
    rencana: [
      'Kartu stok per barang (setiap perubahan tercatat)',
      'Lapisan stok FIFO per baris faktur, termasuk "Saldo awal"',
      'Setujui opname; penyesuaian rusak/kedaluwarsa/pakai sendiri',
    ],
  },
  {
    path: 'hutang-piutang',
    judul: 'Hutang & Piutang',
    ringkasan: 'Hutang ke distributor dan kasbon pelanggan.',
    rencana: ['Daftar faktur tempo per jatuh tempo, bayar sebagian/penuh', 'Umur kasbon per pelanggan'],
  },
  {
    path: 'keuangan',
    judul: 'Keuangan',
    ringkasan: 'Akun kas, setoran, dan biaya operasional.',
    rencana: ['Akun kas: laci, kas besar, rekening', 'Setoran antar akun', 'Biaya operasional'],
  },
  {
    path: 'laporan',
    judul: 'Laporan',
    ringkasan: 'Penjualan, laba, stok, hutang/piutang.',
    rencana: [
      'Laba dengan tanda: bagian pasti (dari faktur) vs perkiraan (dari saldo awal)',
      'Produk terlaris/lambat, laporan harian per kasir, diskon per pelanggan',
    ],
  },
  {
    path: 'pengaturan',
    judul: 'Pengaturan',
    ringkasan: 'Toko, data induk, pengguna, aturan transaksi.',
    rencana: [
      'Toko: profil, struk & printer, penomoran nota',
      'Data induk: satuan (boleh desimal atau tidak), kategori, metode bayar, akun kas',
      'Pengguna: akun kasir, hak akses, PIN pemilik',
      'Aturan: batas kasbon default, boleh jual saat stok habis, pembulatan',
    ],
  },
];

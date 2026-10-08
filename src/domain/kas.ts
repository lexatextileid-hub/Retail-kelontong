/**
 * Buku kas per tempat uang (laci, brankas, rekening bank).
 *
 * Semua catatan uang (penjualan, kasbon, pengeluaran, pindah dana, dll.) dinormalkan menjadi
 * `MutasiKas`: satu baris = satu perubahan saldo di SATU tempat uang. Pindah dana menghasilkan
 * dua baris (keluar dari asal, masuk ke tujuan) sehingga total toko tidak berubah.
 * Laporan harian = ringkasan mutasi per tempat dalam satu hari; laporan bulanan = jumlah harian.
 */

export type TempatUang = 'laci' | 'brankas' | 'bank';

export const namaTempat: Record<TempatUang, string> = { laci: 'Laci kasir', brankas: 'Brankas', bank: 'Rekening bank' };

/**
 * Kelompok uang (kesepakatan laporan harian):
 * Masuk  — A pendapatan usaha · B terima piutang · modal pemilik · C pindah masuk
 * Keluar — D biaya operasional · E belanja barang · F kembali ke pelanggan · kasbon karyawan · prive · G pindah keluar
 * Lainnya — saldo awal (sekali di awal memakai aplikasi) · selisih hitung fisik / mutasi bank
 */
export type KelompokKas =
  | 'pendapatan' | 'piutang' | 'modal' | 'pindah-masuk'
  | 'biaya' | 'belanja' | 'kembali' | 'kasbon-karyawan' | 'prive' | 'pindah-keluar'
  | 'saldo-awal' | 'selisih';

export const KELOMPOK_MASUK: KelompokKas[] = ['pendapatan', 'piutang', 'modal', 'pindah-masuk'];
export const KELOMPOK_KELUAR: KelompokKas[] = ['biaya', 'belanja', 'kembali', 'kasbon-karyawan', 'prive', 'pindah-keluar'];

export const namaKelompok: Record<KelompokKas, string> = {
  pendapatan: 'A. Pendapatan usaha',
  piutang: 'B. Terima piutang',
  modal: 'Tambahan modal pemilik',
  'pindah-masuk': 'C. Pindah dana masuk',
  biaya: 'D. Biaya operasional',
  belanja: 'E. Belanja barang',
  kembali: 'F. Kembali ke pelanggan',
  'kasbon-karyawan': 'Kasbon karyawan',
  prive: 'Prive (ambil pribadi)',
  'pindah-keluar': 'G. Pindah dana keluar',
  'saldo-awal': 'Saldo awal',
  selisih: 'Selisih hitung',
};

export interface MutasiKas {
  id: string;
  nomor: string;
  waktuIso: string;
  tanggal: string; // yyyy-mm-dd (zona lokal)
  tempat: TempatUang;
  /** Laci: sesi laci yang terbuka. Transfer yang dicatat kasir juga menyimpan sesinya (untuk laporan kasir). */
  sesiId?: string;
  akun: string;
  kelompok: KelompokKas;
  /** Rincian di dalam kelompok, mis. "Penjualan", "Pendapatan lain · Jual kardus bekas", "Kemasan". */
  rincian: string;
  /** + masuk, − keluar */
  jumlah: number;
  keterangan: string;
  /** Untuk pindah dana: tempat lawan. */
  lawan?: TempatUang;
}

export interface RingkasTempat {
  saldoAwal: number;
  masuk: number;
  keluar: number; // positif
  pindahMasuk: number;
  pindahKeluar: number; // positif
  selisih: number;
  saldoAkhir: number;
  /** Per kelompok lalu per rincian (nilai bertanda). */
  perKelompok: Partial<Record<KelompokKas, { total: number; rincian: Record<string, number> }>>;
}

const dalam = (t: string, dari: string, sampai: string) => t >= dari && t <= sampai;

/**
 * Ringkas mutasi satu tempat uang untuk rentang tanggal [dari, sampai].
 * Saldo awal = semua mutasi sebelum `dari` + entri "saldo awal" di dalam rentang.
 */
export function ringkasTempat(mutasi: MutasiKas[], dari: string, sampai: string): RingkasTempat {
  let saldoAwal = 0;
  const perKelompok: RingkasTempat['perKelompok'] = {};
  let masuk = 0, keluar = 0, pindahMasuk = 0, pindahKeluar = 0, selisih = 0;
  for (const m of mutasi) {
    if (m.tanggal < dari || m.kelompok === 'saldo-awal') {
      if (m.tanggal <= sampai) saldoAwal += m.jumlah;
      continue;
    }
    if (!dalam(m.tanggal, dari, sampai)) continue;
    const k = (perKelompok[m.kelompok] ??= { total: 0, rincian: {} });
    k.total += m.jumlah;
    k.rincian[m.rincian] = (k.rincian[m.rincian] ?? 0) + m.jumlah;
    if (m.kelompok === 'pindah-masuk') pindahMasuk += m.jumlah;
    else if (m.kelompok === 'pindah-keluar') pindahKeluar -= m.jumlah;
    else if (m.kelompok === 'selisih') selisih += m.jumlah;
    else if (m.jumlah >= 0) masuk += m.jumlah;
    else keluar -= m.jumlah;
  }
  return {
    saldoAwal, masuk, keluar, pindahMasuk, pindahKeluar, selisih, perKelompok,
    saldoAkhir: saldoAwal + masuk - keluar + pindahMasuk - pindahKeluar + selisih,
  };
}

/** Saldo berjalan (urut waktu) — untuk buku kas. */
export function saldoBerjalan(mutasi: MutasiKas[]): (MutasiKas & { saldo: number })[] {
  let saldo = 0;
  return [...mutasi]
    .sort((a, b) => a.waktuIso.localeCompare(b.waktuIso))
    .map((m) => ({ ...m, saldo: (saldo += m.jumlah) }));
}

/** Saldo pada akhir suatu tanggal. */
export const saldoPada = (mutasi: MutasiKas[], tanggal: string) =>
  mutasi.filter((m) => m.tanggal <= tanggal).reduce((t, m) => t + m.jumlah, 0);

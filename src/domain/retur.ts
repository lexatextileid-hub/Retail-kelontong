/**
 * Aturan retur dari pembeli.
 * Nilai retur = harga SETELAH semua diskon (diskon baris, diskon pelanggan, dan potongan akhir nota
 * dibagi sebanding ke setiap baris). Bukan harga barang saat ini.
 */

export interface BarisNilai {
  id: string;
  netto: number; // setelah diskon baris/pelanggan
  jumlahDasar: number;
}

/**
 * Bagi total akhir nota (setelah potongan akhir) ke setiap baris secara sebanding.
 * Pembulatan: sisa rupiah masuk ke baris terakhir, sehingga jumlah semua baris = total akhir.
 */
export function nilaiAkhirBaris(baris: BarisNilai[], totalAkhir: number): Record<string, number> {
  const jumlahNetto = baris.reduce((t, b) => t + b.netto, 0);
  const hasil: Record<string, number> = {};
  if (jumlahNetto <= 0) {
    baris.forEach((b) => (hasil[b.id] = 0));
    return hasil;
  }
  let terpakai = 0;
  baris.forEach((b, i) => {
    const n = i === baris.length - 1 ? totalAkhir - terpakai : Math.round((b.netto * totalAkhir) / jumlahNetto);
    hasil[b.id] = n;
    terpakai += n;
  });
  return hasil;
}

/** Nilai uang untuk sebagian jumlah dari satu baris. Retur penuh = nilai baris persis. */
export function nilaiRetur(nilaiBaris: number, jumlahDasarBaris: number, jumlahDasarRetur: number): number {
  if (jumlahDasarRetur >= jumlahDasarBaris) return nilaiBaris;
  return Math.round((nilaiBaris * jumlahDasarRetur) / jumlahDasarBaris);
}

export interface AturanRetur {
  /** Batas umur nota, dalam hari × 24 jam. */
  batasHari: number;
  /** Lewat batas waktu tetap bisa diretur dengan PIN pemilik (pengecualian pelanggan tertentu). */
  lewatBatasDenganPin: boolean;
  /** Tanpa nota tetap bisa diretur dengan PIN pemilik; harga memakai harga jual sekarang. */
  tanpaNotaDenganPin: boolean;
}

export const ATURAN_RETUR_BAWAAN: AturanRetur = { batasHari: 3, lewatBatasDenganPin: true, tanpaNotaDenganPin: true };

/** Umur nota dalam jam dan apakah masih dalam batas (batasHari × 24 jam). */
export function cekBatasRetur(waktuNotaIso: string, sekarangIso: string, batasHari: number) {
  const jam = (new Date(sekarangIso).getTime() - new Date(waktuNotaIso).getTime()) / 3_600_000;
  return { umurJam: jam, dalamBatas: jam <= batasHari * 24 };
}

/**
 * Selisih retur dengan tukar barang.
 * Positif → toko mengembalikan uang (atau potong kasbon); negatif → pelanggan menambah bayar.
 */
export const selisihTukar = (nilaiReturTotal: number, nilaiTukarTotal: number) => nilaiReturTotal - nilaiTukarTotal;

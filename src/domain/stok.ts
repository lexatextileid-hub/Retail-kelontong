/**
 * Buku stok: stok = jumlah semua mutasi (tidak diedit langsung). Modal per kedatangan (FIFO),
 * umur stok, dan status gerak barang (FSN: Laku / Lambat / Berhenti / Baru).
 * Semua jumlah dalam SATUAN DASAR.
 */
import { selisihHari, tambahHari } from './kasbon';

export type JenisMutasiStok =
  | 'saldo-awal' | 'faktur' | 'faktur-tunai' | 'retur-jual'
  | 'penjualan' | 'tukar' | 'serah-pesanan' | 'penyesuaian';

export const namaJenisStok: Record<JenisMutasiStok, string> = {
  'saldo-awal': 'Saldo awal', faktur: 'Barang masuk (faktur)', 'faktur-tunai': 'Faktur tunai', 'retur-jual': 'Retur pembeli',
  penjualan: 'Penjualan', tukar: 'Tukar barang (retur)', 'serah-pesanan': 'Serah pesanan', penyesuaian: 'Penyesuaian',
};

export interface MutasiStok {
  id: string;
  waktuIso: string;
  tanggal: string; // yyyy-mm-dd
  produkId: string;
  jenis: JenisMutasiStok;
  nomor: string;
  keterangan: string;
  /** + masuk, − keluar (satuan dasar) */
  jumlah: number;
  /** Untuk barang masuk: modal per satuan dasar. */
  modal?: number;
  distributorId?: string;
  /** Barang masuk: satuan beli dan harga per satuan itu (dari faktur). */
  satuanProdukId?: string;
  hargaSatuan?: number;
  oleh: string;
}

export interface Lapisan { tanggal: string; nomor: string; jenis: JenisMutasiStok; jumlahAwal: number; sisa: number; modal: number }

/**
 * Lapisan FIFO yang masih tersisa: barang masuk membuat lapisan, barang keluar menghabiskan lapisan tertua dulu.
 * Keluar melebihi stok → `minus` (stok minus belum terjelaskan).
 */
export function hitungLapisan(mutasi: MutasiStok[], modalCadangan = 0): { lapisan: Lapisan[]; minus: number } {
  const lapisan: Lapisan[] = [];
  let minus = 0;
  for (const m of [...mutasi].sort((a, b) => a.waktuIso.localeCompare(b.waktuIso))) {
    if (m.jumlah > 0) {
      const modal = m.modal ?? lapisan[lapisan.length - 1]?.modal ?? modalCadangan;
      // Barang masuk menutup minus dulu.
      const tutup = Math.min(minus, m.jumlah);
      minus -= tutup;
      if (m.jumlah - tutup > 0) lapisan.push({ tanggal: m.tanggal, nomor: m.nomor, jenis: m.jenis, jumlahAwal: m.jumlah, sisa: m.jumlah - tutup, modal });
    } else if (m.jumlah < 0) {
      let perlu = -m.jumlah;
      for (const l of lapisan) {
        if (perlu <= 0) break;
        const ambil = Math.min(l.sisa, perlu);
        l.sisa -= ambil;
        perlu -= ambil;
      }
      minus += perlu;
    }
  }
  const bulat = (n: number) => Math.round(n * 1000) / 1000;
  return { lapisan: lapisan.filter((l) => bulat(l.sisa) > 0).map((l) => ({ ...l, sisa: bulat(l.sisa) })), minus: bulat(minus) };
}

/** Modal rata-rata dari lapisan yang tersisa (per satuan dasar). */
export const modalRata = (lapisan: Lapisan[]) => {
  const n = lapisan.reduce((t, l) => t + l.sisa, 0);
  return n > 0 ? lapisan.reduce((t, l) => t + l.sisa * l.modal, 0) / n : undefined;
};

/* ---------- Umur stok ---------- */

export type WarnaUmur = 'normal' | 'kuning' | 'oranye' | 'merah';

/** < 3 bln normal · 3–6 bln kuning · 6–12 bln oranye (saatnya retur) · ≥ 12 bln merah (kerugian tahunan). */
export function warnaUmur(hari: number): WarnaUmur {
  if (hari >= 365) return 'merah';
  if (hari >= 180) return 'oranye';
  if (hari >= 90) return 'kuning';
  return 'normal';
}

/** Umur stok = umur lapisan tertua yang masih tersisa. */
export function umurStok(lapisan: Lapisan[], hariIni: string) {
  if (!lapisan.length) return undefined;
  const tertua = lapisan.reduce((a, b) => (a.tanggal <= b.tanggal ? a : b));
  const hari = selisihHari(tertua.tanggal, hariIni);
  return { hari, warna: warnaUmur(hari), tanggal: tertua.tanggal };
}

/* ---------- Status gerak (FSN) ---------- */

export type StatusGerak = 'laku' | 'lambat' | 'berhenti' | 'baru' | 'musiman';

export const namaStatusGerak: Record<StatusGerak, string> = {
  laku: 'Laku', lambat: 'Lambat', berhenti: 'Berhenti', baru: 'Baru', musiman: 'Musiman',
};

export const ATURAN_GERAK = { minggu: 13, laku: 7, lambat: 2, baruHari: 90 };

/**
 * Status gerak dari jumlah MINGGU yang ada penjualannya dalam 13 minggu terakhir
 * (frekuensi, bukan jumlah barang — supaya satu pembelian grosir tidak membuat barang tampak laku).
 * ≥ 7 minggu Laku · 2–6 Lambat · 0–1 Berhenti. Barang yang pertama masuk < 90 hari = Baru.
 * Barang bertanda musiman yang tergolong Berhenti ditampilkan sebagai Musiman.
 */
export function statusGerak(tanggalTerjual: string[], hariIni: string, tanggalMasukPertama: string | undefined, musiman = false) {
  const awal = tambahHari(hariIni, -ATURAN_GERAK.minggu * 7 + 1);
  const minggu = new Set(
    tanggalTerjual.filter((t) => t >= awal && t <= hariIni).map((t) => Math.floor(selisihHari(t, hariIni) / 7)),
  );
  const mingguTerjual = minggu.size;
  let status: StatusGerak =
    mingguTerjual >= ATURAN_GERAK.laku ? 'laku' : mingguTerjual >= ATURAN_GERAK.lambat ? 'lambat' : 'berhenti';
  if (status !== 'laku' && tanggalMasukPertama && selisihHari(tanggalMasukPertama, hariIni) < ATURAN_GERAK.baruHari) status = 'baru';
  if (status === 'berhenti' && musiman) status = 'musiman';
  return { status, mingguTerjual };
}

/* ---------- Tampilan jumlah ---------- */

/** 158 pcs dengan karton isi 50 & renteng isi 10 → "3 ktn 8 pcs"; barang timbang → "18,5 kg". */
export function stokBertingkat(jumlahDasar: number, satuan: { isi: number; singkatan: string }[]): string {
  const tanda = jumlahDasar < 0 ? '−' : '';
  let sisa = Math.abs(jumlahDasar);
  const urut = [...new Map(satuan.map((s) => [s.isi, s])).values()].sort((a, b) => b.isi - a.isi);
  const bagian: string[] = [];
  for (const s of urut) {
    const n = s.isi === 1 ? Math.round(sisa * 1000) / 1000 : Math.floor(sisa / s.isi + 1e-9);
    if (n > 0) {
      bagian.push(`${n.toLocaleString('id-ID')} ${s.singkatan}`);
      sisa -= n * s.isi;
    }
  }
  return bagian.length ? tanda + bagian.join(' ') : '0';
}

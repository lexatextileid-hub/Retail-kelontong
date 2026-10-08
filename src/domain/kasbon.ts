import type { Pelanggan } from './tipe';

export type HasilCekKasbon =
  | { boleh: true; sisaSetelah: number }
  | { boleh: false; alasan: 'pelanggan_umum' }
  | { boleh: false; alasan: 'lewat_tempo'; perluPinPemilik: true }
  | { boleh: false; alasan: 'melebihi_batas'; sisaBatas: number; perluPinPemilik: true };

/**
 * Pelanggan "umum" tidak pernah bisa kasbon. Pelanggan terdaftar:
 * - punya nota kasbon lewat jatuh tempo → kasbon baru perlu PIN pemilik;
 * - kasbon baru melebihi batas → perlu PIN pemilik.
 */
export function cekKasbon(pelanggan: Pelanggan, saldoKasbon: number, jumlahBaru: number, adaLewatTempo = false): HasilCekKasbon {
  if (pelanggan.jenis === 'umum') return { boleh: false, alasan: 'pelanggan_umum' };
  if (adaLewatTempo && jumlahBaru > 0) return { boleh: false, alasan: 'lewat_tempo', perluPinPemilik: true };
  const sisaBatas = pelanggan.batasKasbon - saldoKasbon;
  if (jumlahBaru > sisaBatas) {
    return { boleh: false, alasan: 'melebihi_batas', sisaBatas, perluPinPemilik: true };
  }
  return { boleh: true, sisaSetelah: sisaBatas - jumlahBaru };
}

/* ---------- Tanggal (yyyy-mm-dd, zona lokal) ---------- */

export const isoHari = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const keTanggal = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function tambahHari(iso: string, hari: number): string {
  const d = keTanggal(iso);
  d.setDate(d.getDate() + hari);
  return isoHari(d);
}

/** Banyak hari dari `dari` sampai `ke` (positif bila `ke` lebih akhir). */
export const selisihHari = (dari: string, ke: string) => Math.round((keTanggal(ke).getTime() - keTanggal(dari).getTime()) / 86_400_000);

/* ---------- Pembayaran kasbon ---------- */

export interface NotaTerbuka {
  id: string;
  tanggal: string; // yyyy-mm-dd
  sisa: number;
}

/**
 * Bagi pembayaran ke nota tertua dulu. Kelebihan bayar tidak dialokasikan
 * (pemanggil memutuskan; layar kasbon membatasi jumlah bayar ≤ saldo).
 */
export function alokasiTertua(nota: NotaTerbuka[], jumlah: number): { notaId: string; jumlah: number }[] {
  const urut = [...nota].filter((n) => n.sisa > 0).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const hasil: { notaId: string; jumlah: number }[] = [];
  let sisa = jumlah;
  for (const n of urut) {
    if (sisa <= 0) break;
    const pakai = Math.min(n.sisa, sisa);
    hasil.push({ notaId: n.id, jumlah: pakai });
    sisa -= pakai;
  }
  return hasil;
}

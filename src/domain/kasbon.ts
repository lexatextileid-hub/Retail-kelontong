import type { Pelanggan } from './tipe';

export type HasilCekKasbon =
  | { boleh: true; sisaSetelah: number }
  | { boleh: false; alasan: 'pelanggan_umum' }
  | { boleh: false; alasan: 'melebihi_batas'; sisaBatas: number; perluPinPemilik: true };

/** Pelanggan "umum" tidak pernah bisa kasbon. Pelanggan terdaftar dicek terhadap batasnya. */
export function cekKasbon(pelanggan: Pelanggan, saldoKasbon: number, jumlahBaru: number): HasilCekKasbon {
  if (pelanggan.jenis === 'umum') return { boleh: false, alasan: 'pelanggan_umum' };
  const sisaBatas = pelanggan.batasKasbon - saldoKasbon;
  if (jumlahBaru > sisaBatas) {
    return { boleh: false, alasan: 'melebihi_batas', sisaBatas, perluPinPemilik: true };
  }
  return { boleh: true, sisaSetelah: sisaBatas - jumlahBaru };
}

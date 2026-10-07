import type { LapisanStok } from './tipe';

export interface PemakaianLapisan {
  lapisanId: string;
  jumlah: number;
  modalPerSatuanDasar: number;
  sumber: LapisanStok['sumber'];
}

export interface HasilFifo {
  pemakaian: PemakaianLapisan[];
  totalModal: number;
  /** Jumlah yang terjual tanpa lapisan stok (barang dijual sebelum fakturnya diinput). */
  kurang: number;
  /** Modal untuk bagian `kurang`, memakai modal sementara; dikoreksi saat faktur masuk. */
  modalSementara: number;
  /** Bagian modal yang berasal dari saldo awal (masih perkiraan). */
  modalDariSaldoAwal: number;
}

/**
 * Ambil stok dari lapisan tertua lebih dulu (FIFO).
 * Fungsi murni: tidak mengubah `lapisan`, hanya menghitung pemakaiannya.
 * @param modalSementaraPerSatuan modal untuk jumlah yang tidak tertutup lapisan (biasanya harga beli terakhir)
 */
export function ambilFifo(
  lapisan: LapisanStok[],
  jumlahDasar: number,
  modalSementaraPerSatuan: number,
): HasilFifo {
  const urut = lapisan
    .filter((l) => l.sisa > 0)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.id.localeCompare(b.id));

  let butuh = jumlahDasar;
  const pemakaian: PemakaianLapisan[] = [];
  for (const l of urut) {
    if (butuh <= 0) break;
    const ambil = Math.min(butuh, l.sisa);
    pemakaian.push({ lapisanId: l.id, jumlah: ambil, modalPerSatuanDasar: l.modalPerSatuanDasar, sumber: l.sumber });
    butuh -= ambil;
  }

  const modalLapisan = pemakaian.reduce((t, p) => t + p.jumlah * p.modalPerSatuanDasar, 0);
  const modalSementara = butuh * modalSementaraPerSatuan;
  const modalDariSaldoAwal = pemakaian
    .filter((p) => p.sumber === 'saldo_awal')
    .reduce((t, p) => t + p.jumlah * p.modalPerSatuanDasar, 0);

  return {
    pemakaian,
    totalModal: Math.round(modalLapisan + modalSementara),
    kurang: butuh,
    modalSementara: Math.round(modalSementara),
    modalDariSaldoAwal: Math.round(modalDariSaldoAwal),
  };
}

/** Modal per satuan dasar dari satu baris faktur: harga baris setelah diskon dibagi jumlah dasar (bonus ikut menurunkan modal). */
export function modalBarisFaktur(nilaiBarisSetelahDiskon: number, jumlahDasarDibayar: number, jumlahDasarBonus = 0): number {
  const total = jumlahDasarDibayar + jumlahDasarBonus;
  if (total <= 0) throw new Error('Jumlah barang masuk harus lebih dari 0');
  return nilaiBarisSetelahDiskon / total;
}

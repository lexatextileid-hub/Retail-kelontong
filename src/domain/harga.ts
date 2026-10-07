import type { DiskonPelanggan, Pelanggan, Produk, TingkatHarga } from './tipe';

export interface HasilHarga {
  jumlahDasar: number; // qty dikonversi ke satuan dasar
  hargaSatuan: number; // harga per satuan yang dipilih, atau per satuan dasar jika bertingkat
  bruto: number;
  tingkat?: TingkatHarga; // tingkat yang sedang berlaku (bertingkat)
  tingkatBerikutnya?: { tingkat: TingkatHarga; kurang: number }; // untuk pengingat di kasir
  diskonSaran: number; // dari daftar diskon pelanggan
  diskon: number; // yang dipakai (bisa diubah kasir)
  diskonDiubah: boolean;
  netto: number;
}

/** Tingkat yang berlaku = tingkat dengan mulaiJumlah terbesar yang sudah tercapai. */
export function cariTingkat(tingkat: TingkatHarga[], jumlahDasar: number): TingkatHarga | undefined {
  return [...tingkat]
    .sort((a, b) => b.mulaiJumlah - a.mulaiJumlah)
    .find((t) => jumlahDasar >= t.mulaiJumlah);
}

export function cariTingkatBerikutnya(tingkat: TingkatHarga[], jumlahDasar: number) {
  const t = [...tingkat]
    .sort((a, b) => a.mulaiJumlah - b.mulaiJumlah)
    .find((x) => x.mulaiJumlah > jumlahDasar);
  return t ? { tingkat: t, kurang: t.mulaiJumlah - jumlahDasar } : undefined;
}

/** Diskon saran untuk satu baris. Pelanggan "umum" tidak pernah mendapat diskon pelanggan. */
export function hitungDiskonSaran(
  pelanggan: Pelanggan,
  produkId: string,
  daftarDiskon: DiskonPelanggan[],
  jumlahDasar: number,
  bruto: number,
): number {
  if (pelanggan.jenis === 'umum') return 0;
  const d = daftarDiskon.find((x) => x.pelangganId === pelanggan.id && x.produkId === produkId);
  if (!d) return 0;
  return d.jenis === 'potongan_rp' ? Math.round(d.nilai * jumlahDasar) : Math.round((bruto * d.nilai) / 100);
}

/**
 * Hitung harga satu baris penjualan.
 * @param satuanProdukId satuan yang dipilih kasir (pcs, pak, dus, slop, kg, ...)
 * @param qty jumlah dalam satuan yang dipilih
 * @param diskonManual diskon total yang diketik kasir; kosong = pakai saran
 */
export function hitungHargaBaris(
  produk: Produk,
  satuanProdukId: string,
  qty: number,
  pelanggan: Pelanggan,
  daftarDiskon: DiskonPelanggan[],
  diskonManual?: number,
): HasilHarga {
  const satuan = produk.satuan.find((s) => s.id === satuanProdukId);
  if (!satuan) throw new Error(`Satuan ${satuanProdukId} tidak ada di ${produk.nama}`);
  if (!satuan.dijual) throw new Error(`Satuan ${satuan.label} tidak dijual`);

  const jumlahDasar = qty * satuan.isi;
  let hargaSatuan: number;
  let bruto: number;
  let tingkat: TingkatHarga | undefined;
  let tingkatBerikutnya: HasilHarga['tingkatBerikutnya'];

  if (produk.metodeHarga === 'bertingkat') {
    tingkat = cariTingkat(produk.tingkatHarga, jumlahDasar);
    if (!tingkat) throw new Error(`${produk.nama} belum punya tingkat harga untuk jumlah ${jumlahDasar}`);
    hargaSatuan = tingkat.harga;
    bruto = Math.round(jumlahDasar * tingkat.harga);
    tingkatBerikutnya = cariTingkatBerikutnya(produk.tingkatHarga, jumlahDasar);
  } else {
    if (satuan.hargaJual === undefined) throw new Error(`Harga ${satuan.label} belum diisi`);
    hargaSatuan = satuan.hargaJual;
    bruto = Math.round(qty * satuan.hargaJual);
  }

  const diskonSaran = hitungDiskonSaran(pelanggan, produk.id, daftarDiskon, jumlahDasar, bruto);
  // Diskon pelanggan (saran) tidak berlaku untuk Umum; diskon yang diketik kasir berlaku untuk siapa pun.
  const diskon = Math.max(0, Math.min(bruto, diskonManual ?? diskonSaran));

  return {
    jumlahDasar,
    hargaSatuan,
    bruto,
    tingkat,
    tingkatBerikutnya,
    diskonSaran,
    diskon,
    diskonDiubah: diskon !== diskonSaran,
    netto: bruto - diskon,
  };
}

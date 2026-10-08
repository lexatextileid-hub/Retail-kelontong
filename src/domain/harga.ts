import type { DiskonPelanggan, Pelanggan, Produk, TingkatHarga } from './tipe';

export interface HasilHarga {
  jumlahDasar: number; // qty dikonversi ke satuan dasar
  hargaSatuan: number; // harga per satuan yang dipilih, atau per satuan dasar jika bertingkat
  hargaNormal: number; // harga bawaan dari data barang
  hargaDiubah: boolean; // kasir mengubah harga (barang timbang)
  bruto: number;
  tingkat?: TingkatHarga; // tingkat yang sedang berlaku (bertingkat)
  tingkatBerikutnya?: { tingkat: TingkatHarga; kurang: number }; // untuk pengingat di kasir
  diskonSaran: number; // dari daftar diskon pelanggan
  diskon: number; // yang dipakai (bisa diubah kasir)
  diskonDiubah: boolean;
  netto: number;
}

/** Persen untung dari modal (markup), dibulatkan 1 desimal. Modal 0 → Infinity. */
export function untungDariModal(hargaJualTotal: number, modalTotal: number): number {
  if (modalTotal <= 0) return Infinity;
  return Math.round(((hargaJualTotal - modalTotal) / modalTotal) * 1000) / 10;
}

/** Pembulatan harga jual hasil hitung: ke atas ke kelipatan ini (Pengaturan). */
export const PEMBULATAN_HARGA = 100;

export const bulatkanHarga = (n: number, kelipatan = PEMBULATAN_HARGA) => Math.ceil(Math.round(n) / kelipatan) * kelipatan;

/**
 * Form harga: isi salah satu dari harga jual, untung % (dari modal), atau untung Rp; dua lainnya terhitung.
 * Harga hasil hitung dibulatkan ke atas; % ditampilkan dari harga setelah dibulatkan.
 */
export const hargaDariPersen = (modalTotal: number, persen: number) => bulatkanHarga(modalTotal * (1 + persen / 100));
export const hargaDariUntungRp = (modalTotal: number, untung: number) => bulatkanHarga(modalTotal + untung);

/** Target untung bawaan (Pengaturan). */
export const TARGET_UNTUNG_PERSEN = 5;

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
 * @param hargaManual harga per satuan yang diketik kasir (barang timbang yang harganya cepat berubah); kosong = harga bawaan
 */
export function hitungHargaBaris(
  produk: Produk,
  satuanProdukId: string,
  qty: number,
  pelanggan: Pelanggan,
  daftarDiskon: DiskonPelanggan[],
  diskonManual?: number,
  hargaManual?: number,
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
    hargaSatuan = hargaManual ?? satuan.hargaJual;
    bruto = Math.round(qty * hargaSatuan);
  }
  const hargaNormal = produk.metodeHarga === 'bertingkat' ? hargaSatuan : (satuan.hargaJual ?? hargaSatuan);

  const diskonSaran = hitungDiskonSaran(pelanggan, produk.id, daftarDiskon, jumlahDasar, bruto);
  // Diskon pelanggan (saran) tidak berlaku untuk Umum; diskon yang diketik kasir berlaku untuk siapa pun.
  const diskon = Math.max(0, Math.min(bruto, diskonManual ?? diskonSaran));

  return {
    jumlahDasar,
    hargaSatuan,
    hargaNormal,
    hargaDiubah: hargaSatuan !== hargaNormal,
    bruto,
    tingkat,
    tingkatBerikutnya,
    diskonSaran,
    diskon,
    diskonDiubah: diskon !== diskonSaran,
    netto: bruto - diskon,
  };
}

/**
 * Pembanding harga antar satuan: harga per satuan dasar harus TURUN (atau sama) untuk satuan yang lebih besar.
 * Mis. per bungkus: karton ≤ slop ≤ bungkus. Satuan besar yang lebih mahal per satuan dasar ditandai `lebihMahal`
 * (dibandingkan satuan lebih kecil termurah sebelumnya), dengan selisih per satuan dasar.
 */
export function cekTurunHarga<T extends { isi: number; harga?: number }>(baris: T[]) {
  const urut = [...baris].filter((b) => b.harga && b.isi > 0).sort((a, b) => a.isi - b.isi);
  let termurah: { perDasar: number; baris: T } | undefined;
  const hasil = new Map<T, { perDasar: number; lebihMahal: boolean; selisih: number; dibanding?: T }>();
  for (const b of urut) {
    const perDasar = b.harga! / b.isi;
    const lebihMahal = !!termurah && perDasar > termurah.perDasar + 0.0001;
    hasil.set(b, { perDasar, lebihMahal, selisih: termurah ? perDasar - termurah.perDasar : 0, dibanding: termurah?.baris });
    if (!termurah || perDasar < termurah.perDasar) termurah = { perDasar, baris: b };
  }
  return hasil;
}

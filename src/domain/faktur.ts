/**
 * Hitung faktur barang masuk: baris per barang dengan beberapa lapis satuan (mis. karton · slop · bungkus),
 * diskon per baris (Rp) dan diskon faktur (dibagi sebanding ke semua baris berbayar).
 * Barang bonus = harga 0 (masuk stok, modal 0 → menurunkan modal rata-rata).
 */

export interface LapisMasuk { kunci: string; qty: number; harga: number; isi: number }
export interface BarangMasukHitung { kunci: string; lapis: LapisMasuk[]; diskonRp: number; bonus?: boolean }

export interface HasilLapis { kunci: string; subtotal: number; netto: number; hargaNetto: number; jumlahDasar: number }
export interface HasilBarang { kunci: string; subtotal: number; diskonBaris: number; bagianDiskonFaktur: number; netto: number; jumlahDasar: number; modalPerDasar: number; lapis: HasilLapis[] }

/** Diskon % → Rp (dibulatkan). */
export const diskonDariPersen = (subtotal: number, persen: number) => Math.round((subtotal * persen) / 100);

export function hitungFakturMasuk(barang: BarangMasukHitung[], diskonFaktur: number) {
  const dasar = barang.map((b) => {
    const subtotal = b.bonus ? 0 : b.lapis.reduce((t, l) => t + l.qty * l.harga, 0);
    const diskonBaris = b.bonus ? 0 : Math.min(b.diskonRp, subtotal);
    return { b, subtotal, diskonBaris, setelahBaris: subtotal - diskonBaris };
  });
  const totalSetelahBaris = dasar.reduce((t, x) => t + x.setelahBaris, 0);
  const potFaktur = Math.min(diskonFaktur, totalSetelahBaris);
  let sisaPot = potFaktur;
  const berbayar = dasar.filter((x) => x.setelahBaris > 0);
  const hasil: HasilBarang[] = dasar.map((x) => {
    // Diskon faktur dibagi sebanding; sisa pembulatan ke baris berbayar terakhir.
    const terakhir = berbayar[berbayar.length - 1] === x;
    const bagian = x.setelahBaris <= 0 ? 0 : terakhir ? sisaPot : Math.round((potFaktur * x.setelahBaris) / totalSetelahBaris);
    if (x.setelahBaris > 0) sisaPot -= bagian;
    const netto = x.setelahBaris - bagian;
    const faktor = x.subtotal > 0 ? netto / x.subtotal : 0;
    const lapis = x.b.lapis.filter((l) => l.qty > 0).map((l) => {
      const sub = x.b.bonus ? 0 : l.qty * l.harga;
      return { kunci: l.kunci, subtotal: sub, netto: sub * faktor, hargaNetto: x.b.bonus ? 0 : l.harga * faktor, jumlahDasar: l.qty * l.isi };
    });
    const jumlahDasar = lapis.reduce((t, l) => t + l.jumlahDasar, 0);
    return { kunci: x.b.kunci, subtotal: x.subtotal, diskonBaris: x.diskonBaris, bagianDiskonFaktur: bagian, netto, jumlahDasar, modalPerDasar: jumlahDasar ? netto / jumlahDasar : 0, lapis };
  });
  const subtotal = dasar.reduce((t, x) => t + x.subtotal, 0);
  const diskonBaris = dasar.reduce((t, x) => t + x.diskonBaris, 0);
  return { barang: hasil, subtotal, diskonBaris, diskonFaktur: potFaktur, total: subtotal - diskonBaris - potFaktur };
}

/** Perubahan harga beli per satuan dibanding faktur terakhir. */
export function perubahanHarga(baru: number, lama?: number) {
  if (!lama || !baru) return undefined;
  const selisih = baru - lama;
  return { selisih, persen: Math.round((selisih / lama) * 1000) / 10, naik: selisih > 0, turun: selisih < 0 };
}

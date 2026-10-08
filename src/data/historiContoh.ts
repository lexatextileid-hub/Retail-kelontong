/**
 * DATA CONTOH riwayat stok sebelum pratinjau dibuka (±3 bulan ke belakang), supaya
 * kartu stok, FIFO, umur stok, dan status gerak (Laku/Lambat/Berhenti/Baru) punya isi.
 * Penjualan diringkas per hari (bukan per nota) agar Riwayat & Kas Laci tidak ikut terisi.
 * Nanti diganti data asli dari Supabase.
 */
import { hargaBeliContoh, modalContoh, produkContoh, stokContoh } from './contoh';
import { isoHari, tambahHari } from '../domain/kasbon';
import type { MutasiStok } from '../domain/stok';

interface Profil { mulai: number; p: number; min: number; maks: number; isiUlangHari?: number; hanyaSampai?: number }

/** p = peluang terjual per hari; min–maks = jumlah per hari (satuan dasar). */
const profil: Record<string, Profil> = {
  'gulaku-5': { mulai: 100, p: 0.55, min: 1, maks: 3, isiUlangHari: 14 },
  'gula-curah': { mulai: 100, p: 0.9, min: 10, maks: 30, isiUlangHari: 10 },
  'gula-1kg': { mulai: 100, p: 0.85, min: 3, maks: 8 },
  'minyak-1l': { mulai: 100, p: 0.85, min: 3, maks: 10, isiUlangHari: 14 },
  sarimi: { mulai: 100, p: 0.95, min: 10, maks: 40, isiUlangHari: 10 },
  taro: { mulai: 100, p: 0.9, min: 10, maks: 30, isiUlangHari: 10 },
  amild: { mulai: 100, p: 0.95, min: 3, maks: 10, isiUlangHari: 10 },
  'air-600': { mulai: 100, p: 0.9, min: 6, maks: 24, isiUlangHari: 14 },
  skm: { mulai: 100, p: 0.6, min: 1, maks: 4, isiUlangHari: 21 },
  kecap: { mulai: 120, p: 0.05, min: 1, maks: 2 },
  'rokok-hs': { mulai: 400, p: 0.04, min: 1, maks: 1 },
  'bawang-putih': { mulai: 100, p: 0.06, min: 0.5, maks: 2 },
  kemiri: { mulai: 200, p: 0.025, min: 0.2, maks: 0.5 },
  deterjen: { mulai: 100, p: 0.6, min: 1, maks: 3, hanyaSampai: 85 },
  'bawang-merah': { mulai: 30, p: 0.8, min: 1, maks: 4, isiUlangHari: 10 },
};

/** Angka acak tetap (sama setiap kali dibuka). */
function acak(benih: number) {
  let x = benih;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
}

const waktu = (tanggal: string, jam: number) => {
  const [y, m, d] = tanggal.split('-').map(Number);
  return new Date(y, m - 1, d, jam, 0, 0).toISOString();
};

export function buatHistoriContoh(hariIni = isoHari(new Date())): MutasiStok[] {
  const hasil: MutasiStok[] = [];
  produkContoh.forEach((pr, i) => {
    const f = profil[pr.id];
    if (!f) return;
    const r = acak(1000 + i * 7919);
    const beli = hargaBeliContoh[pr.id]?.[0];
    const isiBeli = beli ? pr.satuan.find((s) => s.id === beli.satuanProdukId)?.isi ?? 1 : 1;
    const modalBeli = beli ? beli.harga / isiBeli : modalContoh[pr.id] ?? 0;
    const desimal = pr.satuanDasarId === 'kg';
    const jual: MutasiStok[] = [];
    const masuk: MutasiStok[] = [];
    let urut = 1;
    // Penjualan sampai 4 hari lalu (hari-hari terakhir berisi nota contoh asli).
    for (let h = f.mulai - 1; h >= 4; h--) {
      if (f.hanyaSampai !== undefined && h < f.hanyaSampai) break;
      if (r() > f.p) continue;
      const n = desimal ? Math.round((f.min + r() * (f.maks - f.min)) * 10) / 10 : Math.round(f.min + r() * (f.maks - f.min));
      if (n <= 0) continue;
      const t = tambahHari(hariIni, -h);
      jual.push({ id: `hj-${pr.id}-${h}`, waktuIso: waktu(t, 17), tanggal: t, produkId: pr.id, jenis: 'penjualan', nomor: `PJ ${t.slice(5)}`, keterangan: 'Penjualan (ringkasan harian, data contoh)', jumlah: -n, oleh: '[Kasir A]' });
    }
    // Isi ulang dari distributor secara berkala (faktur contoh).
    if (f.isiUlangHari) {
      const totalJual = -jual.reduce((t, m) => t + m.jumlah, 0);
      const kali = Math.floor((f.mulai - 6) / f.isiUlangHari);
      const per = Math.max(isiBeli, Math.round(totalJual / Math.max(1, kali) / isiBeli) * isiBeli);
      for (let k = 1; k <= kali; k++) {
        const h = f.mulai - k * f.isiUlangHari;
        if (h < 5) break;
        const t = tambahHari(hariIni, -h);
        masuk.push({
          id: `hf-${pr.id}-${h}`, waktuIso: waktu(t, 9), tanggal: t, produkId: pr.id, jenis: 'faktur', nomor: `PB-${t.slice(2, 4)}${t.slice(5, 7)}-H${String(urut++).padStart(3, '0')}`,
          keterangan: 'Barang masuk (faktur contoh)', jumlah: per, modal: Math.round(modalBeli * (0.97 + r() * 0.05)), distributorId: beli?.distributorId, oleh: '[Admin A]',
        });
      }
    }
    // Saldo awal dihitung supaya stok sekarang ≈ stok contoh.
    const bersih = masuk.reduce((t, m) => t + m.jumlah, 0) + jual.reduce((t, m) => t + m.jumlah, 0);
    const awal = Math.max(0, Math.round(((stokContoh[pr.id] ?? 0) - bersih) * 1000) / 1000);
    const tAwal = tambahHari(hariIni, -f.mulai);
    hasil.push({
      id: `sa-${pr.id}`, waktuIso: waktu(tAwal, 7), tanggal: tAwal, produkId: pr.id, jenis: 'saldo-awal', nomor: 'SALDO AWAL',
      keterangan: 'Stok saat mulai memakai aplikasi', jumlah: awal, modal: Math.round(modalContoh[pr.id] ?? modalBeli), oleh: '[Pemilik]',
    }, ...masuk, ...jual);
  });
  return hasil;
}

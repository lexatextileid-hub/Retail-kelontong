import { distributorContoh, hargaBeliContoh } from '../../data/contoh';
import { ambilPelanggan } from '../../data/toko';
import type { StatusPesanan, StatusSP, SuratPesanan } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { ambilProduk, ambilSatuan, angka, bolehDesimal, singkatan } from '../penjualan/model';

const warnaStatus: Record<StatusPesanan | StatusSP, 'biru' | 'kuning' | 'merah' | 'hijau' | 'abu'> = {
  'Perlu diorder': 'merah',
  'Perlu persetujuan': 'merah',
  'Menunggu barang': 'kuning',
  'Barang siap': 'biru',
  Disiapkan: 'biru',
  'Diserahkan sebagian': 'kuning',
  Tempo: 'kuning',
  Lunas: 'hijau',
  Dibatalkan: 'abu',
  draf: 'abu',
  dikirim: 'kuning',
  sebagian: 'kuning',
  selesai: 'hijau',
  ditutup: 'abu',
};

const labelSP: Record<StatusSP, string> = {
  draf: 'Draf', dikirim: 'Dikirim', sebagian: 'Datang sebagian', selesai: 'Selesai', ditutup: 'Ditutup',
};

export function ChipStatus({ status }: { status: StatusPesanan | StatusSP }) {
  const teks = status in labelSP ? labelSP[status as StatusSP] : status;
  return <span className={`chip-status chip-status--${warnaStatus[status]}`}>{teks}</span>;
}

export const namaPelanggan = (id: string) => ambilPelanggan(id)?.nama ?? '-';
/** Distributor terdaftar; "lain:<nama>" = pemasok lain (faktur tunai tanpa nota). */
export const ambilDistributor = (id: string) =>
  distributorContoh.find((d) => d.id === id) ?? { id, nama: id.startsWith('lain:') ? id.slice(5) : id, hp: '', terminHari: 0 };

/** Jumlah dalam satuan yang dipilih, mis. "72 Karton isi 5 renteng" atau "0,35 kg". */
export function labelJumlah(produkId: string, satuanProdukId: string, qty: number) {
  const s = ambilSatuan(ambilProduk(produkId), satuanProdukId);
  return bolehDesimal(s.satuanId) ? `${angka(qty)} ${singkatan(s.satuanId)}` : `${angka(qty)} ${s.label}`;
}

/** Jumlah satuan dasar dalam bentuk mudah dibaca, mis. 3600 pcs. */
export const labelDasar = (produkId: string, n: number) => `${angka(n)} ${singkatan(ambilProduk(produkId).satuanDasarId)}`;

/** Satuan beli bawaan: satuan "dibeli" dengan isi terbesar (urutan beli: besar → kecil). */
export function satuanBeliUrut(produkId: string) {
  return ambilProduk(produkId).satuan.filter((s) => s.dibeli).sort((a, b) => b.isi - a.isi);
}

/** Distributor & harga beli terakhir paling murah per satuan dasar. */
export function distributorTermurah(produkId: string) {
  const p = ambilProduk(produkId);
  const daftar = (hargaBeliContoh[produkId] ?? []).map((h) => ({ ...h, perDasar: h.harga / ambilSatuan(p, h.satuanProdukId).isi }));
  daftar.sort((a, b) => a.perDasar - b.perDasar);
  return daftar[0];
}

export function hargaTerakhir(produkId: string, distributorId: string, satuanProdukId: string) {
  return (hargaBeliContoh[produkId] ?? []).find((h) => h.distributorId === distributorId && h.satuanProdukId === satuanProdukId)?.harga;
}

export const hariIni = () => new Date().toISOString().slice(0, 10);
export const besok = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);
export const tanggalPanjang = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** Teks Surat Pesanan siap kirim ke WhatsApp distributor. */
export function teksSP(sp: SuratPesanan): string {
  const d = ambilDistributor(sp.distributorId);
  const baris = sp.baris.map((b, i) => {
    const nama = b.produkId ? ambilProduk(b.produkId).nama : b.permintaan;
    const pengganti = b.penggantiProdukId ? ` (pengganti ${ambilProduk(b.penggantiProdukId).nama})` : '';
    return `${i + 1}. ${nama}${pengganti} — ${angka(b.qty)} ${b.labelSatuan}`;
  });
  return [
    '*SURAT PESANAN*',
    `No: ${sp.nomor}`,
    `Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    `Kepada: ${d.nama}`,
    'Dari: [Nama Toko]',
    '',
    ...baris,
    '',
    ...(sp.catatan ? [`Catatan: ${sp.catatan}`, ''] : []),
    'Mohon konfirmasi ketersediaan & harga. Terima kasih.',
  ].join('\n');
}

export const totalPerkiraanSP = (sp: SuratPesanan) =>
  sp.baris.reduce((t, b) => t + (b.hargaPerkiraan ?? 0) * b.qty, 0);

export const rp = rupiah;

/**
 * Penyimpanan bersama untuk PRATINJAU (di memori, hilang saat halaman ditutup).
 * Nanti diganti Supabase. Bentuk data di sini mengikuti rancangan tabel.
 */
import { useSyncExternalStore } from 'react';
import { diskonContoh, distributorContoh, hargaBeliContoh, modalContoh, pelangganContoh, stokContoh, type PelangganContoh } from './contoh';
import { alokasiTertua, isoHari, selisihHari, tambahHari } from '../domain/kasbon';
import { hitungHargaBaris, TARGET_UNTUNG_PERSEN, untungDariModal } from '../domain/harga';
import { ambilProduk, ambilSatuan, bolehDesimal, singkatan, type Nota } from '../features/penjualan/model';
import { ATURAN_RETUR_BAWAAN, nilaiAkhirBaris, nilaiRetur as hitungNilaiRetur, type AturanRetur } from '../domain/retur';

export type Peran = 'pemilik' | 'admin' | 'kasir';

export const namaPeran: Record<Peran, string> = { pemilik: 'Pemilik', admin: 'Admin', kasir: 'Kasir' };
export const namaAkun: Record<Peran, string> = { pemilik: '[Pemilik]', admin: '[Admin A]', kasir: '[Kasir A]' };

/* ---------- Pesanan pelanggan ---------- */

export interface BarisPesanan {
  id: string;
  produkId: string;
  satuanProdukId: string;
  qty: number;
  diskonManual?: number;
  hargaManual?: number;
  /** Semua jumlah di bawah ini dalam satuan dasar barang. */
  dariStok: number; // dikunci dari stok yang ada saat pesanan dicatat
  perluOrder: number; // sisa yang harus diorder ke distributor
  diterimaOrder: number; // sudah datang dari Surat Pesanan
  modalOrderPerDasar?: number; // dari faktur SP
  diserahkan: number;
  disetujui?: boolean; // pemilik menyetujui harga walau untung di bawah target
}

export interface Pembayaran {
  waktu: string;
  jumlah: number;
  metode: 'tunai' | 'transfer' | 'retur';
  jenis: 'DP' | 'Pelunasan' | 'Cicilan' | 'Retur';
  oleh: string;
}

export interface SerahTerima {
  nomor: string; // SJ-…
  waktu: string;
  tanggal: string; // yyyy-mm-dd
  diantar: boolean;
  oleh: string;
  baris: { barisId: string; jumlahDasar: number }[];
}

export interface Pesanan {
  id: string;
  nomor: string;
  dibuat: string;
  oleh: string;
  pelangganId: string;
  cara: 'ambil' | 'antar';
  alamat?: string;
  tanggalJanji: string; // yyyy-mm-dd
  catatan?: string;
  baris: BarisPesanan[];
  pembayaran: Pembayaran[];
  serah: SerahTerima[];
  jatuhTempo?: string;
  disiapkan: boolean;
  dibatalkan?: { waktu: string; alasan: string; dp: 'kembali' | 'saldo' };
  riwayat: { waktu: string; teks: string }[];
}

/* ---------- Surat Pesanan ke distributor ---------- */

export interface BarisSP {
  id: string;
  produkId?: string; // kosong = baris permintaan (barang belum terdaftar)
  permintaan?: string; // teks bebas, mis. "Minyak goreng 1 L, merek lain"
  penggantiProdukId?: string;
  satuanProdukId?: string; // satuan beli untuk barang terdaftar
  labelSatuan: string; // mis. "Karton isi 50"
  qty: number;
  hargaPerkiraan?: number; // per satuan beli
  untukPesanan: { pesananId: string; barisId: string; jumlahDasar: number }[];
  diterima?: { qty: number; harga: number; produkId?: string; satuanProdukId?: string };
}

export type StatusSP = 'draf' | 'dikirim' | 'sebagian' | 'selesai' | 'ditutup';

/** Sumber pesanan toko: dari pesanan pelanggan, stok menipis, atau pesanan baru (manual). */
export type SumberSP = 'pesanan' | 'stok' | 'baru';
export const namaSumberSP: Record<SumberSP, string> = { pesanan: 'Dari pesanan pelanggan', stok: 'Stok menipis', baru: 'Pesanan baru' };

/** Faktur distributor yang dicatat saat barang datang dari Surat Pesanan (salinan isi kertas faktur). */
export interface FakturSP {
  nomor: string; // PB-… (nomor internal barang masuk)
  nomorDistributor: string; // nomor di kertas faktur
  waktu: string;
  tanggal?: string;
  cara: 'cash' | 'tempo';
  total: number;
  oleh: string;
  baris?: { nama: string; satuan: string; qty: number; harga: number }[];
}

export interface SuratPesanan {
  id: string;
  sumber: SumberSP;
  nomor: string;
  dibuat: string;
  oleh: string;
  distributorId: string;
  baris: BarisSP[];
  status: StatusSP;
  catatan?: string;
  faktur: FakturSP[];
}

/* ---------- Kasbon (piutang pelanggan) ---------- */

/** Nota kasbon yang dicatat langsung: dari penjualan kasir, atau kasbon lama (data sebelum pakai aplikasi). */
export interface NotaKasbon {
  id: string;
  nomor: string; // nomor nota penjualan, atau KL-… untuk kasbon lama
  pelangganId: string;
  tanggal: string; // yyyy-mm-dd
  jumlah: number;
  sumber: 'penjualan' | 'lama';
  keterangan?: string;
  nomorLama?: string; // nomor nota/buku lama bila masih ada
  oleh: string;
}

export interface BayarKasbon {
  id: string;
  nomor: string; // BK-…
  pelangganId: string;
  tanggal: string;
  waktu: string;
  jumlah: number;
  metode: 'tunai' | 'transfer' | 'retur';
  bank?: string; // keterangan saja, mis. BCA
  lewat: 'kasbon' | 'penjualan' | 'retur';
  alokasi: { notaId: string; nomor: string; jumlah: number }[];
  oleh: string;
}

/** Satu baris tagihan pelanggan: nota kasbon, kasbon lama, atau pesanan (setelah barang diserahkan). */
export interface TagihanKasbon {
  id: string; // id NotaKasbon, atau "ps:<id pesanan>"
  nomor: string;
  sumber: 'penjualan' | 'lama' | 'pesanan';
  tanggal: string;
  jatuhTempo: string;
  jumlah: number;
  terbayar: number;
  sisa: number;
  keterangan?: string;
  pesananId?: string;
}

/* ---------- Nota penjualan, retur, barang rusak ---------- */

export interface BarisJual {
  id: string;
  produkId: string;
  satuanProdukId: string;
  qty: number;
  jumlahDasar: number;
  hargaSatuan: number;
  netto: number; // setelah diskon baris/pelanggan
  nilai: number; // setelah potongan akhir dibagi sebanding — dasar uang retur
}

export interface NotaPenjualan {
  id: string;
  nomor: string;
  waktuIso: string;
  tanggal: string;
  pelangganId: string;
  baris: BarisJual[];
  total: number; // setelah potongan akhir
  tunai: number;
  transfer: number;
  kasbonBaru: number;
  bayarKasbon: number;
  struk: Nota;
}

export interface BarisRetur {
  produkId: string;
  satuanProdukId?: string;
  asalBarisId?: string; // baris nota / baris pesanan asal
  jumlahDasar: number;
  nilai: number;
  kondisi: 'bagus' | 'rusak';
}

export interface BarisTukar {
  produkId: string;
  satuanProdukId: string;
  qty: number;
  jumlahDasar: number;
  netto: number;
}

export type CaraSelisih = 'pas' | 'tunai' | 'transfer' | 'kasbon' | 'tagihan-pesanan';

export interface Retur {
  id: string;
  nomor: string; // RT-…
  waktuIso: string;
  waktu: string;
  sumber: 'nota' | 'pesanan' | 'tanpa-nota';
  notaId?: string;
  pesananId?: string;
  nomorAsal?: string;
  pelangganId: string;
  baris: BarisRetur[];
  tukar: BarisTukar[];
  nilaiRetur: number;
  nilaiTukar: number;
  /** Positif: toko mengembalikan. Negatif: pelanggan menambah. */
  selisih: number;
  cara: CaraSelisih;
  bank?: string;
  alasan: string;
  pengecualian?: string; // mis. "lewat batas 3×24 jam, disetujui PIN pemilik"
  oleh: string;
}

export interface BarangRusak {
  id: string;
  produkId: string;
  jumlahDasar: number;
  tanggal: string;
  asal: string; // mis. "Retur RT-2610-0001"
}

/* ---------- Kas laci ---------- */

/** Satu kali buka–tutup laci oleh satu akun. Setelah tutup boleh buka lagi di hari yang sama. */
export interface SesiLaci {
  id: string;
  nomor: string; // LC-…
  akun: string;
  tanggal: string;
  dibukaIso: string;
  dariKemarin: number; // sisa laci sebelumnya
  tambahBrankas: number; // tambahan modal dari brankas (PIN pemilik)
  ditutupIso?: string;
  uangFisik?: number;
  /** uangFisik − seharusnya */
  selisih?: number;
  selisihDitanggung?: 'toko' | 'kasir';
  pembagian?: { sisaLaci: number; brankas: number; bank: number; bankNama?: string; prive: number };
}

export type JenisArus =
  | 'penjualan' | 'kasbon' | 'pesanan' | 'retur' | 'kas-masuk' | 'titipan-brankas'
  | 'pengeluaran' | 'bayar-distributor' | 'setor-bank';

/** Arus uang yang dicatat kasir. tunai/transfer bertanda: + masuk, − keluar. */
export interface ArusKas {
  id: string;
  nomor: string;
  waktuIso: string;
  akun: string;
  sesiId?: string; // laci yang terbuka saat itu
  jenis: JenisArus;
  tunai: number;
  transfer: number;
  /** Sumber dana untuk uang keluar (laci bawaan; brankas/bank dengan PIN pemilik). */
  sumber: 'laci' | 'brankas' | 'bank';
  keterangan: string;
  kategori?: string;
  /** Rincian bukti kas keluar (bisa beberapa baris kategori). */
  rincian?: { kategori: string; keterangan: string; jumlah: number }[];
  penerima?: string;
  bank?: string;
  /** jumlah = uang dibayar; diskon = potongan dari distributor (mengurangi hutang tanpa uang). */
  faktur?: { id: string; nomor: string; jumlah: number; diskon?: number }[];
}

export const KATEGORI_PENGELUARAN = [
  'Bongkar muat & angkut', 'Retribusi & keamanan pasar', 'Kemasan', 'Kebutuhan toko harian', 'Listrik, air, internet',
  'Gaji & uang makan', 'Sewa ruko', 'Perbaikan & perawatan', 'Lain-lain',
];

/** Hutang lama ke distributor (sebelum memakai aplikasi), tanpa rincian barang. */
export interface HutangLama {
  id: string;
  distributorId: string;
  nomor: string; // nomor faktur kertas
  tanggal: string;
  jatuhTempo?: string;
  total: number;
}

interface State {
  peran: Peran;
  sesiLaci: SesiLaci[];
  arus: ArusKas[];
  hutangLama: HutangLama[];
  penjualan: NotaPenjualan[];
  retur: Retur[];
  barangRusak: BarangRusak[];
  aturanRetur: AturanRetur;
  pelanggan: PelangganContoh[];
  notaKasbon: NotaKasbon[];
  bayarKasbon: BayarKasbon[];
  pesanan: Pesanan[];
  sp: SuratPesanan[];
  urut: Record<'PS' | 'SP' | 'SJ' | 'PB' | 'KL' | 'BK' | 'PJ' | 'RT' | 'LC' | 'KK' | 'KM' | 'BD' | 'ST', number>;
  stokTambahan: Record<string, number>; // stok umum yang masuk dari SP (pratinjau)
}

let state: State = {
  peran: 'pemilik',
  sesiLaci: [],
  arus: [],
  hutangLama: [],
  penjualan: [],
  retur: [],
  barangRusak: [],
  aturanRetur: ATURAN_RETUR_BAWAAN,
  pelanggan: pelangganContoh,
  notaKasbon: [],
  bayarKasbon: [],
  pesanan: [],
  sp: [],
  urut: { PS: 1, SP: 1, SJ: 1, PB: 1, KL: 1, BK: 1, PJ: 231, RT: 1, LC: 1, KK: 1, KM: 1, BD: 1, ST: 1 },
  stokTambahan: {},
};
const pendengar = new Set<() => void>();

function ubah(fn: (s: State) => State) {
  state = fn(state);
  pendengar.forEach((p) => p());
}

export function useToko(): State {
  return useSyncExternalStore(
    (cb) => {
      pendengar.add(cb);
      return () => pendengar.delete(cb);
    },
    () => state,
  );
}

export const sekarang = () =>
  new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

let urutId = 0;
const id = (awal: string) => `${awal}${Date.now().toString(36)}${(urutId++).toString(36)}`;
const nomorBaru = (jenis: keyof State['urut']) => {
  const n = state.urut[jenis];
  state = { ...state, urut: { ...state.urut, [jenis]: n + 1 } };
  return `${jenis}-2610-${String(n).padStart(4, '0')}`;
};

/* ---------- Peran ---------- */

export const setPeran = (peran: Peran) => ubah((s) => ({ ...s, peran }));

/* ---------- Hitungan stok ---------- */

/** Stok yang sedang terkunci untuk pesanan (belum diserahkan), satuan dasar. */
export function stokTerkunci(produkId: string, s: State = state, kecualiPesananId?: string): number {
  let n = 0;
  for (const p of s.pesanan) {
    if (p.dibatalkan || p.id === kecualiPesananId) continue;
    for (const b of p.baris) if (b.produkId === produkId) n += Math.max(0, b.dariStok + b.diterimaOrder - b.diserahkan);
  }
  return n;
}

/** Stok umum yang bebas dijual = stok + masuk dari SP − terkunci pesanan. */
export function stokBebas(produkId: string, s: State = state, kecualiPesananId?: string): number {
  return (stokContoh[produkId] ?? 0) + (s.stokTambahan[produkId] ?? 0) - stokTerkunci(produkId, s, kecualiPesananId);
}

/* ---------- Hitungan pesanan ---------- */

export const jumlahDasar = (b: { produkId: string; satuanProdukId: string; qty: number }) =>
  b.qty * ambilSatuan(ambilProduk(b.produkId), b.satuanProdukId).isi;

export function hargaBaris(p: Pesanan, b: BarisPesanan) {
  const plg = ambilPelanggan(p.pelangganId);
  return hitungHargaBaris(ambilProduk(b.produkId), b.satuanProdukId, b.qty, plg, diskonContoh, b.diskonManual, b.hargaManual);
}

/** Perkiraan modal per satuan dasar dari harga beli terakhir (paling murah). */
export function modalPerkiraan(produkId: string): number | undefined {
  const p = ambilProduk(produkId);
  const daftar = hargaBeliContoh[produkId] ?? [];
  const per = daftar.map((h) => h.harga / ambilSatuan(p, h.satuanProdukId).isi);
  return per.length ? Math.min(...per) : modalContoh[produkId];
}

export function hitungBaris(p: Pesanan, b: BarisPesanan) {
  const h = hargaBaris(p, b);
  const total = jumlahDasar(b);
  const siap = Math.min(total, b.dariStok + b.diterimaOrder);
  const masihOrder = Math.max(0, total - siap);
  const diOrderDiSP = state.sp
    .filter((sp) => sp.status !== 'ditutup')
    .flatMap((sp) => sp.baris)
    .filter((x) => !x.diterima)
    .flatMap((x) => x.untukPesanan)
    .filter((u) => u.pesananId === p.id && u.barisId === b.id)
    .reduce((t, u) => t + u.jumlahDasar, 0);
  const modalStok = (modalContoh[b.produkId] ?? 0) * b.dariStok;
  const modalOrderDiketahui = b.modalOrderPerDasar !== undefined;
  const modalOrder = (b.modalOrderPerDasar ?? modalPerkiraan(b.produkId) ?? 0) * Math.max(0, total - b.dariStok);
  const modal = modalStok + modalOrder;
  const untung = untungDariModal(h.netto, modal);
  const modalPasti = b.perluOrder === 0 || (modalOrderDiketahui && b.diterimaOrder >= b.perluOrder);
  const perluSetuju = modalPasti && untung < TARGET_UNTUNG_PERSEN && !b.disetujui;
  return { h, total, siap, masihOrder, diOrderDiSP, modal, untung, modalPasti, perluSetuju, sisaSerah: Math.max(0, total - b.diserahkan) };
}

export function ringkasPesanan(p: Pesanan) {
  const baris = p.baris.map((b) => ({ b, ...hitungBaris(p, b) }));
  const total = baris.reduce((t, x) => t + x.h.netto, 0);
  const dibayar = p.pembayaran.reduce((t, x) => t + x.jumlah, 0);
  const dp = p.pembayaran.filter((x) => x.jenis === 'DP').reduce((t, x) => t + x.jumlah, 0);
  const semuaSiap = baris.every((x) => x.siap >= x.total);
  const adaPerluOrder = baris.some((x) => x.masihOrder > x.diOrderDiSP);
  const adaMenunggu = baris.some((x) => x.masihOrder > 0);
  const semuaDiserahkan = baris.every((x) => x.sisaSerah === 0);
  const adaDiserahkan = baris.some((x) => x.b.diserahkan > 0);
  const perluSetuju = baris.some((x) => x.perluSetuju);
  const sisa = Math.max(0, total - dibayar);
  // Nilai barang yang sudah diserahkan: inilah yang menjadi tagihan (kasbon) pelanggan.
  const nilaiDiserahkan = Math.round(baris.reduce((t, x) => t + (x.total ? (x.h.netto * x.b.diserahkan) / x.total : 0), 0));
  let status: StatusPesanan;
  if (p.dibatalkan) status = 'Dibatalkan';
  else if (semuaDiserahkan && sisa === 0) status = 'Lunas';
  else if (semuaDiserahkan) status = 'Tempo';
  else if (adaDiserahkan) status = 'Diserahkan sebagian';
  else if (perluSetuju) status = 'Perlu persetujuan';
  else if (adaPerluOrder) status = 'Perlu diorder';
  else if (adaMenunggu) status = 'Menunggu barang';
  else if (p.disiapkan) status = 'Disiapkan';
  else status = 'Barang siap';
  return { baris, total, dibayar, dp, sisa, semuaSiap, status, perluSetuju, nilaiDiserahkan };
}

export type StatusPesanan =
  | 'Perlu diorder' | 'Menunggu barang' | 'Perlu persetujuan' | 'Barang siap' | 'Disiapkan'
  | 'Diserahkan sebagian' | 'Tempo' | 'Lunas' | 'Dibatalkan';

/* ---------- Aksi pesanan ---------- */

export interface BarisBaru {
  produkId: string;
  satuanProdukId: string;
  qty: number;
  diskonManual?: number;
  hargaManual?: number;
}

export function buatPesanan(data: {
  pelangganId: string;
  cara: 'ambil' | 'antar';
  alamat?: string;
  tanggalJanji: string;
  catatan?: string;
  baris: BarisBaru[];
  dp?: { jumlah: number; metode: 'tunai' | 'transfer' };
}): string {
  const oleh = namaAkun[state.peran];
  const nomor = nomorBaru('PS');
  const pesananId = id('ps');
  // Stok cukup → dikunci dari stok. Stok tidak cukup → seluruh baris diorder (stok eceran tidak dihabiskan).
  const terpakai: Record<string, number> = {};
  const baris: BarisPesanan[] = data.baris.map((b) => {
    const total = jumlahDasar(b);
    const bebas = Math.max(0, stokBebas(b.produkId) - (terpakai[b.produkId] ?? 0));
    const dariStok = total <= bebas ? total : 0;
    terpakai[b.produkId] = (terpakai[b.produkId] ?? 0) + dariStok;
    return { id: id('bp'), ...b, dariStok, perluOrder: total - dariStok, diterimaOrder: 0, diserahkan: 0 };
  });
  const waktu = sekarang();
  const p: Pesanan = {
    id: pesananId, nomor, dibuat: waktu, oleh,
    pelangganId: data.pelangganId, cara: data.cara, alamat: data.alamat, tanggalJanji: data.tanggalJanji, catatan: data.catatan,
    baris,
    pembayaran: data.dp && data.dp.jumlah > 0 ? [{ waktu, jumlah: data.dp.jumlah, metode: data.dp.metode, jenis: 'DP', oleh }] : [],
    serah: [], disiapkan: false,
    riwayat: [{ waktu, teks: `Pesanan dicatat oleh ${oleh}` }],
  };
  if (p.pembayaran.length) p.riwayat.push({ waktu, teks: `DP ${p.pembayaran[0].jumlah.toLocaleString('id-ID')} (${p.pembayaran[0].metode})` });
  ubah((s) => ({ ...s, pesanan: [p, ...s.pesanan] }));
  if (data.dp && data.dp.jumlah > 0)
    catatArus({ jenis: 'pesanan', nomor, tunai: data.dp.metode === 'tunai' ? data.dp.jumlah : 0, transfer: data.dp.metode === 'transfer' ? data.dp.jumlah : 0, keterangan: `DP pesanan ${nomor}` });
  return pesananId;
}

function ubahPesanan(pesananId: string, fn: (p: Pesanan) => Pesanan, teks?: string) {
  ubah((s) => ({
    ...s,
    pesanan: s.pesanan.map((p) => {
      if (p.id !== pesananId) return p;
      const baru = fn(p);
      return teks ? { ...baru, riwayat: [...baru.riwayat, { waktu: sekarang(), teks: `${teks} · ${namaAkun[s.peran]}` }] } : baru;
    }),
  }));
}

export function ubahBarisPesanan(pesananId: string, barisId: string, patch: Partial<BarisPesanan>, teks: string) {
  ubahPesanan(pesananId, (p) => ({ ...p, baris: p.baris.map((b) => (b.id === barisId ? { ...b, ...patch } : b)) }), teks);
}

/** Baris sudah berjalan (ada di Surat Pesanan, barang sudah datang, atau sudah diserahkan): jumlahnya tidak bisa diubah/dihapus. */
export function barisSudahBerjalan(p: Pesanan, b: BarisPesanan) {
  return b.diserahkan > 0 || b.diterimaOrder > 0 || hitungBaris(p, b).diOrderDiSP > 0;
}

/** Kunci stok untuk satu baris: stok cukup → dikunci; tidak cukup → seluruh baris diorder. */
function aturKunci(produkId: string, totalDasar: number, kunciLama = 0) {
  const bebas = Math.max(0, stokBebas(produkId) + kunciLama);
  const dariStok = totalDasar <= bebas ? totalDasar : 0;
  return { dariStok, perluOrder: totalDasar - dariStok };
}

/** Ubah barang/jumlah/harga satu baris. Mengembalikan pesan bila tidak boleh. */
export function ubahBarisPesananPenuh(pesananId: string, barisId: string, data: BarisBaru): string | null {
  const p = state.pesanan.find((x) => x.id === pesananId)!;
  const b = p.baris.find((x) => x.id === barisId)!;
  const nama = ambilProduk(b.produkId).nama;
  const jumlahBerubah = jumlahDasar(data) !== jumlahDasar(b);
  if (jumlahBerubah && barisSudahBerjalan(p, b))
    return `Jumlah ${nama} tidak bisa diubah karena sudah dipesan ke distributor / sudah datang / sudah diserahkan. Harga dan diskon tetap bisa diubah.`;
  const kunci = jumlahBerubah ? aturKunci(b.produkId, jumlahDasar(data), b.dariStok) : { dariStok: b.dariStok, perluOrder: b.perluOrder };
  ubahBarisPesanan(pesananId, barisId, { ...data, ...kunci, disetujui: false }, `${nama} diubah`);
  return null;
}

export function tambahBarisPesanan(pesananId: string, data: BarisBaru) {
  const kunci = aturKunci(data.produkId, jumlahDasar(data));
  const baru: BarisPesanan = { id: id('bp'), ...data, ...kunci, diterimaOrder: 0, diserahkan: 0 };
  ubahPesanan(pesananId, (p) => ({ ...p, baris: [...p.baris, baru] }), `${ambilProduk(data.produkId).nama} ditambahkan`);
}

export function hapusBarisPesanan(pesananId: string, barisId: string): string | null {
  const p = state.pesanan.find((x) => x.id === pesananId)!;
  const b = p.baris.find((x) => x.id === barisId)!;
  const nama = ambilProduk(b.produkId).nama;
  if (barisSudahBerjalan(p, b)) return `${nama} tidak bisa dihapus karena sudah dipesan ke distributor / sudah datang / sudah diserahkan.`;
  if (p.baris.length === 1) return 'Ini barang terakhir. Untuk membatalkan seluruh pesanan, pakai Batalkan pesanan.';
  ubahPesanan(pesananId, (x) => ({ ...x, baris: x.baris.filter((y) => y.id !== barisId) }), `${nama} dihapus dari pesanan`);
  return null;
}

export function ubahDataPesanan(pesananId: string, data: { tanggalJanji: string; cara: 'ambil' | 'antar'; alamat?: string; catatan?: string }) {
  ubahPesanan(pesananId, (p) => ({ ...p, ...data, alamat: data.cara === 'antar' ? data.alamat : undefined }), 'Data pesanan diubah');
}

/** Hapus total hanya untuk salah catat: belum ada pembayaran, Surat Pesanan, atau serah terima. Selain itu pakai Batalkan. */
export function bisaHapusPesanan(p: Pesanan) {
  const adaSP = state.sp.some((x) => x.baris.some((b) => b.untukPesanan.some((u) => u.pesananId === p.id)));
  return p.pembayaran.length === 0 && p.serah.length === 0 && !adaSP && p.baris.every((b) => b.diterimaOrder === 0);
}
export function hapusPesanan(pesananId: string) {
  ubah((s) => ({ ...s, pesanan: s.pesanan.filter((p) => p.id !== pesananId) }));
}

export const setujuiHarga = (pesananId: string, barisId: string, nama: string) =>
  ubahBarisPesanan(pesananId, barisId, { disetujui: true }, `Harga ${nama} disetujui walau di bawah target untung`);

export const tandaiDisiapkan = (pesananId: string) =>
  ubahPesanan(pesananId, (p) => ({ ...p, disiapkan: true }), 'Barang disiapkan');

export function serahkan(pesananId: string, baris: { barisId: string; jumlahDasar: number }[], diantar: boolean): string {
  const nomor = nomorBaru('SJ');
  const oleh = namaAkun[state.peran];
  ubahPesanan(
    pesananId,
    (p) => ({
      ...p,
      baris: p.baris.map((b) => {
        const x = baris.find((y) => y.barisId === b.id);
        return x ? { ...b, diserahkan: b.diserahkan + x.jumlahDasar } : b;
      }),
      serah: [...p.serah, { nomor, waktu: sekarang(), tanggal: hariIni(), diantar, oleh, baris }],
    }),
    `${diantar ? 'Diantar' : 'Diserahkan'} (${nomor})`,
  );
  return nomor;
}

export function terimaBayar(pesananId: string, jumlah: number, metode: 'tunai' | 'transfer', jenis: Pembayaran['jenis']) {
  ubahPesanan(
    pesananId,
    (p) => ({ ...p, pembayaran: [...p.pembayaran, { waktu: sekarang(), jumlah, metode, jenis, oleh: namaAkun[state.peran] }] }),
    `${jenis} ${jumlah.toLocaleString('id-ID')} (${metode})`,
  );
  const p = state.pesanan.find((x) => x.id === pesananId)!;
  catatArus({ jenis: 'pesanan', nomor: p.nomor, tunai: metode === 'tunai' ? jumlah : 0, transfer: metode === 'transfer' ? jumlah : 0, keterangan: `${jenis} pesanan ${p.nomor}` });
}

export const aturTempo = (pesananId: string, tanggal: string) =>
  ubahPesanan(pesananId, (p) => ({ ...p, jatuhTempo: tanggal }), `Tempo sampai ${tanggal}`);

export const batalkan = (pesananId: string, alasan: string, dp: 'kembali' | 'saldo') =>
  ubahPesanan(
    pesananId,
    (p) => ({ ...p, dibatalkan: { waktu: sekarang(), alasan, dp } }),
    `Dibatalkan: ${alasan}${p0(dp)}`,
  );
const p0 = (dp: 'kembali' | 'saldo') => (dp === 'kembali' ? ' · DP dikembalikan' : ' · DP jadi saldo pelanggan');

/* ---------- Aksi Surat Pesanan ---------- */

export function buatSP(data: { distributorId: string; baris: Omit<BarisSP, 'id'>[]; catatan?: string; sumber?: SumberSP }): string {
  const nomor = nomorBaru('SP');
  const sp: SuratPesanan = {
    id: id('sp'), sumber: data.sumber ?? 'baru', nomor, dibuat: sekarang(), oleh: namaAkun[state.peran],
    distributorId: data.distributorId, baris: data.baris.map((b) => ({ ...b, id: id('bs') })), status: 'draf', catatan: data.catatan, faktur: [],
  };
  ubah((s) => ({ ...s, sp: [sp, ...s.sp] }));
  // Catat di riwayat pesanan terkait
  const terkait = new Set(sp.baris.flatMap((b) => b.untukPesanan.map((u) => u.pesananId)));
  terkait.forEach((pid) => ubahPesanan(pid, (p) => p, `Diorder lewat ${nomor}`));
  return sp.id;
}

export const tandaiSPDikirim = (spId: string) =>
  ubah((s) => ({ ...s, sp: s.sp.map((x) => (x.id === spId && x.status === 'draf' ? { ...x, status: 'dikirim' } : x)) }));

export const tutupSP = (spId: string) =>
  ubah((s) => ({ ...s, sp: s.sp.map((x) => (x.id === spId ? { ...x, status: 'ditutup' } : x)) }));

/**
 * Faktur dari Surat Pesanan: catat barang yang benar-benar diterima.
 * Bagian untuk pesanan langsung terkunci (modal dari faktur ini); kelebihan masuk stok umum.
 */
export function terimaDariSP(
  spId: string,
  data: {
    nomorDistributor: string;
    cara: 'cash' | 'tempo';
    baris: { barisId: string; qty: number; harga: number; produkId?: string; satuanProdukId?: string }[];
    tutupSisa: boolean;
  },
): string {
  const nomor = nomorBaru('PB');
  const sp = state.sp.find((x) => x.id === spId)!;
  const tambahStok: Record<string, number> = {};
  const updatePesanan: { pesananId: string; barisId: string; jumlahDasar: number; modal: number }[] = [];

  const barisBaru = sp.baris.flatMap((b): BarisSP[] => {
    const d = data.baris.find((x) => x.barisId === b.id);
    if (!d || d.qty <= 0 || b.diterima) return [b];
    const produkId = d.produkId ?? b.produkId;
    const satuanProdukId = d.satuanProdukId ?? b.satuanProdukId;
    const sisaAlokasi = b.untukPesanan.map((u) => ({ ...u }));
    if (produkId && satuanProdukId) {
      const isi = ambilSatuan(ambilProduk(produkId), satuanProdukId).isi;
      let sisa = d.qty * isi;
      const modal = d.harga / isi;
      for (const u of sisaAlokasi) {
        const ambil = Math.min(sisa, u.jumlahDasar);
        if (ambil > 0) updatePesanan.push({ pesananId: u.pesananId, barisId: u.barisId, jumlahDasar: ambil, modal });
        u.jumlahDasar -= ambil;
        sisa -= ambil;
      }
      if (sisa > 0) tambahStok[produkId] = (tambahStok[produkId] ?? 0) + sisa;
    }
    const diterima: BarisSP = { ...b, qty: Math.min(d.qty, b.qty), diterima: { qty: d.qty, harga: d.harga, produkId, satuanProdukId } };
    // Kiriman kurang & SP tetap terbuka: sisanya jadi baris yang masih ditunggu.
    if (d.qty < b.qty && !data.tutupSisa) {
      return [diterima, { ...b, id: id('bs'), qty: b.qty - d.qty, untukPesanan: sisaAlokasi.filter((u) => u.jumlahDasar > 0) }];
    }
    return [diterima];
  });
  const semuaDiterima = barisBaru.every((b) => b.diterima);
  const total = data.baris.reduce((t, x) => t + x.qty * x.harga, 0);
  const barisFaktur = data.baris.filter((x) => x.qty > 0).map((x) => {
    const b = sp.baris.find((y) => y.id === x.barisId)!;
    const pid = x.produkId ?? b.produkId;
    const p = pid ? ambilProduk(pid) : undefined;
    const sid = x.satuanProdukId ?? b.satuanProdukId;
    return { nama: p?.nama ?? b.permintaan ?? '-', satuan: p && sid ? ambilSatuan(p, sid).label : b.labelSatuan, qty: x.qty, harga: x.harga };
  });
  const status: StatusSP = semuaDiterima ? 'selesai' : data.tutupSisa ? 'ditutup' : 'sebagian';

  ubah((s) => ({
    ...s,
    stokTambahan: Object.entries(tambahStok).reduce((m, [k, v]) => ({ ...m, [k]: (m[k] ?? 0) + v }), s.stokTambahan),
    sp: s.sp.map((x) =>
      x.id === spId
        ? {
            ...x,
            baris: barisBaru,
            status,
            faktur: [...x.faktur, { nomor, nomorDistributor: data.nomorDistributor, waktu: sekarang(), tanggal: hariIni(), cara: data.cara, total, oleh: namaAkun[s.peran], baris: barisFaktur }],
          }
        : x,
    ),
  }));
  for (const u of updatePesanan) {
    ubahPesanan(
      u.pesananId,
      (p) => ({
        ...p,
        baris: p.baris.map((b) =>
          b.id === u.barisId ? { ...b, diterimaOrder: b.diterimaOrder + u.jumlahDasar, modalOrderPerDasar: u.modal } : b,
        ),
      }),
      `Barang datang dari ${sp.nomor} (${nomor})`,
    );
  }
  return nomor;
}

/* ---------- Pelanggan ---------- */

export const hariIni = () => isoHari(new Date());

export const ambilPelanggan = (id: string, s: State = state) =>
  s.pelanggan.find((p) => p.id === id) ?? s.pelanggan[0];

/**
 * Pelanggan baru dari kasir: nama + HP, batas kasbon Rp 0.
 * Tempo bayar hanya terisi bila disetujui pemilik (PIN); selain itu 0 = belum diatur.
 */
export function tambahPelanggan(nama: string, hp?: string, tempoHari = 0): string {
  const p: PelangganContoh = { id: id('plg'), nama, hp, jenis: 'terdaftar', batasKasbon: 0, tempoHari };
  ubah((s) => ({ ...s, pelanggan: [...s.pelanggan, p] }));
  return p.id;
}

/* ---------- Kasbon ---------- */

/** Semua tagihan pelanggan (kasbon penjualan, kasbon lama, pesanan yang sudah diserahkan), urut tertua dulu. */
export function tagihanPelanggan(pelangganId: string, s: State = state): TagihanKasbon[] {
  const plg = ambilPelanggan(pelangganId, s);
  const terbayarNota = new Map<string, number>();
  for (const b of s.bayarKasbon) for (const a of b.alokasi) terbayarNota.set(a.notaId, (terbayarNota.get(a.notaId) ?? 0) + a.jumlah);

  const dariNota: TagihanKasbon[] = s.notaKasbon
    .filter((n) => n.pelangganId === pelangganId)
    .map((n) => {
      const terbayar = terbayarNota.get(n.id) ?? 0;
      return {
        id: n.id, nomor: n.nomor, sumber: n.sumber, tanggal: n.tanggal, jatuhTempo: tambahHari(n.tanggal, plg.tempoHari),
        jumlah: n.jumlah, terbayar, sisa: Math.max(0, n.jumlah - terbayar),
        keterangan: n.sumber === 'lama' ? [n.keterangan, n.nomorLama && `nota lama ${n.nomorLama}`].filter(Boolean).join(' · ') : undefined,
      };
    });

  // Pesanan: dihitung kasbon setelah barang diterima pelanggan (nota/surat jalan terbit). DP mengurangi.
  const dariPesanan: TagihanKasbon[] = s.pesanan
    .filter((p) => p.pelangganId === pelangganId && !p.dibatalkan && p.serah.length > 0)
    .map((p) => {
      const r = ringkasPesanan(p);
      const tanggal = p.serah[0].tanggal;
      return {
        id: `ps:${p.id}`, nomor: p.nomor, sumber: 'pesanan' as const, tanggal,
        jatuhTempo: p.jatuhTempo ?? tambahHari(tanggal, plg.tempoHari),
        jumlah: r.nilaiDiserahkan, terbayar: Math.min(r.dibayar, r.nilaiDiserahkan), sisa: Math.max(0, r.nilaiDiserahkan - r.dibayar),
        keterangan: r.dp > 0 ? `DP ${r.dp.toLocaleString('id-ID')} sudah dipotong` : undefined, pesananId: p.id,
      };
    })
    .filter((t) => t.jumlah > 0);

  return [...dariNota, ...dariPesanan].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.nomor.localeCompare(b.nomor));
}

export function ringkasKasbon(pelangganId: string, s: State = state) {
  const hari = hariIni();
  const terbuka = tagihanPelanggan(pelangganId, s).filter((t) => t.sisa > 0);
  const saldo = terbuka.reduce((t, x) => t + x.sisa, 0);
  const lewat = terbuka.filter((t) => t.jatuhTempo < hari);
  return {
    saldo,
    banyakNota: terbuka.length,
    tertuaHari: terbuka.length ? selisihHari(terbuka[0].tanggal, hari) : 0,
    lewatTempo: lewat.reduce((t, x) => t + x.sisa, 0),
    banyakLewat: lewat.length,
    jatuhTempoTerdekat: terbuka.map((t) => t.jatuhTempo).sort()[0] as string | undefined,
  };
}

/** Pelanggan + ringkasan kasbonnya (dipakai layar Penjualan). */
export function pelangganDenganKasbon(pelangganId: string, s: State = state) {
  const p = ambilPelanggan(pelangganId, s);
  const r = ringkasKasbon(p.id, s);
  return { ...p, saldoKasbon: r.saldo, notaKasbon: r.banyakNota, notaTertuaHari: r.tertuaHari, lewatTempo: r.lewatTempo };
}
export type PelangganKasbon = ReturnType<typeof pelangganDenganKasbon>;

/** Kasbon baru dari transaksi kasir. */
export function catatKasbonPenjualan(pelangganId: string, nomorNota: string, jumlah: number) {
  const n: NotaKasbon = { id: id('nk'), nomor: nomorNota, pelangganId, tanggal: hariIni(), jumlah, sumber: 'penjualan', oleh: namaAkun[state.peran] };
  ubah((s) => ({ ...s, notaKasbon: [...s.notaKasbon, n] }));
}

/** Kasbon lama (sebelum memakai aplikasi), tanpa rincian barang. Nota boleh sudah hilang. */
export function catatKasbonLama(data: { pelangganId: string; tanggal: string; jumlah: number; keterangan?: string; nomorLama?: string }): string {
  const nomor = nomorBaru('KL');
  const n: NotaKasbon = { id: id('nk'), nomor, sumber: 'lama', oleh: namaAkun[state.peran], ...data };
  ubah((s) => ({ ...s, notaKasbon: [...s.notaKasbon, n] }));
  return nomor;
}

/**
 * Terima pembayaran kasbon. Bawaan: menutup tagihan tertua dulu; `alokasi` mengganti urutan itu.
 * Bagian untuk pesanan dicatat juga sebagai pembayaran pesanan (status pesanan ikut bergerak).
 */
export function bayarKasbon(data: {
  pelangganId: string; jumlah: number; metode: 'tunai' | 'transfer' | 'retur'; bank?: string; lewat?: 'kasbon' | 'penjualan' | 'retur';
  alokasi?: { notaId: string; jumlah: number }[];
}): BayarKasbon {
  const tagihan = tagihanPelanggan(data.pelangganId);
  const alokasi = (data.alokasi ?? alokasiTertua(tagihan, data.jumlah)).filter((a) => a.jumlah > 0);
  const nomor = nomorBaru('BK');
  const oleh = namaAkun[state.peran];
  const b: BayarKasbon = {
    id: id('bk'), nomor, pelangganId: data.pelangganId, tanggal: hariIni(), waktu: sekarang(), jumlah: data.jumlah,
    metode: data.metode, bank: data.metode === 'transfer' ? data.bank : undefined, lewat: data.lewat ?? 'kasbon', oleh,
    alokasi: alokasi.map((a) => ({ ...a, nomor: tagihan.find((t) => t.id === a.notaId)?.nomor ?? '-' })),
  };
  // Bagian untuk pesanan ("ps:…") juga dicatat sebagai pembayaran pesanan — itulah sumber sisa tagihan pesanan.
  ubah((s) => ({ ...s, bayarKasbon: [...s.bayarKasbon, b] }));
  // Bayar kasbon lewat menu Kasbon masuk laci. (Lewat penjualan sudah termasuk di uang nota; lewat retur bukan uang.)
  if (b.lewat === 'kasbon' && b.metode !== 'retur')
    catatArus({ jenis: 'kasbon', nomor, tunai: b.metode === 'tunai' ? b.jumlah : 0, transfer: b.metode === 'transfer' ? b.jumlah : 0, keterangan: `Bayar kasbon ${ambilPelanggan(b.pelangganId).nama}` });
  for (const a of b.alokasi.filter((x) => x.notaId.startsWith('ps:'))) {
    const pid = a.notaId.slice(3);
    const t = tagihan.find((x) => x.id === a.notaId)!;
    const jenis: Pembayaran['jenis'] = a.jumlah >= t.sisa ? 'Pelunasan' : 'Cicilan';
    ubahPesanan(
      pid,
      (p) => ({ ...p, pembayaran: [...p.pembayaran, { waktu: sekarang(), jumlah: a.jumlah, metode: data.metode, jenis, oleh }] }),
      `${jenis} ${a.jumlah.toLocaleString('id-ID')} lewat Kasbon (${nomor})`,
    );
  }
  return b;
}

/** Riwayat pembayaran kasbon pelanggan, termasuk yang masuk ke pesanan. */
export const riwayatBayarKasbon = (pelangganId: string, s: State = state) =>
  s.bayarKasbon.filter((b) => b.pelangganId === pelangganId).slice().reverse();

/* ---------- Penjualan (nota kasir) ---------- */

export const nomorNotaBaru = () => nomorBaru('PJ');

const tambahStok = (s: State, produkId: string, n: number): State => ({
  ...s, stokTambahan: { ...s.stokTambahan, [produkId]: (s.stokTambahan[produkId] ?? 0) + n },
});

/** Susun nota penjualan dari isi keranjang + hasil bayar (dipakai kasir dan data contoh). */
export function susunNotaPenjualan(d: {
  nomor: string; waktuIso: string; pelangganId: string; kasir: string;
  baris: { produkId: string; satuanProdukId: string; qty: number; diskonManual?: number; hargaManual?: number }[];
  potongan: number; jenisPotongan?: Nota['jenisPotongan'];
  tunai: number; transfer: number; kembalian: number; kasbonBaru: number; bayarKasbon: number; sisaKasbon?: number;
}): Omit<NotaPenjualan, 'id'> {
  const plg = ambilPelanggan(d.pelangganId);
  const hitung = d.baris.map((b, i) => {
    const p = ambilProduk(b.produkId);
    const s = ambilSatuan(p, b.satuanProdukId);
    const h = hitungHargaBaris(p, b.satuanProdukId, b.qty, plg, diskonContoh, b.diskonManual, b.hargaManual);
    return { key: `b${i}`, b, p, s, h };
  });
  const subtotal = hitung.reduce((t, x) => t + x.h.bruto, 0);
  const diskon = hitung.reduce((t, x) => t + x.h.diskon, 0);
  const total = subtotal - diskon - d.potongan;
  const nilai = nilaiAkhirBaris(hitung.map((x) => ({ id: x.key, netto: x.h.netto, jumlahDasar: x.h.jumlahDasar })), total);
  const w = new Date(d.waktuIso);
  return {
    nomor: d.nomor, waktuIso: d.waktuIso, tanggal: isoHari(w), pelangganId: d.pelangganId, total,
    tunai: d.tunai, transfer: d.transfer, kasbonBaru: d.kasbonBaru, bayarKasbon: d.bayarKasbon,
    baris: hitung.map((x) => ({
      id: id('bj'), produkId: x.b.produkId, satuanProdukId: x.b.satuanProdukId, qty: x.b.qty, jumlahDasar: x.h.jumlahDasar,
      hargaSatuan: x.h.hargaSatuan, netto: x.h.netto, nilai: nilai[x.key],
    })),
    struk: {
      nomor: d.nomor,
      waktu: `${w.toLocaleDateString('id-ID')} ${w.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      kasir: d.kasir, pelanggan: plg.nama,
      baris: hitung.map((x) => ({
        nama: x.p.nama, label: bolehDesimal(x.s.satuanId) ? singkatan(x.s.satuanId) : x.s.label,
        qty: x.b.qty, hargaSatuan: x.h.hargaSatuan, bruto: x.h.bruto, diskon: x.h.diskon,
      })),
      subtotal, diskonPelanggan: diskon, potongan: d.potongan, jenisPotongan: d.jenisPotongan, total,
      bayarKasbon: d.bayarKasbon, tunai: d.tunai, transfer: d.transfer, kembalian: d.kembalian, kasbonBaru: d.kasbonBaru, sisaKasbon: d.sisaKasbon,
    },
  };
}

/** Simpan nota penjualan (untuk Riwayat & Retur) dan kurangi stok. */
export function catatPenjualan(n: Omit<NotaPenjualan, 'id'>): string {
  const nota: NotaPenjualan = { ...n, id: id('pj') };
  ubah((s) => n.baris.reduce((x, b) => tambahStok(x, b.produkId, -b.jumlahDasar), { ...s, penjualan: [nota, ...s.penjualan] }));
  return nota.id;
}

/* ---------- Retur ---------- */

export const aturAturanRetur = (a: AturanRetur) => ubah((s) => ({ ...s, aturanRetur: a }));

/** Jumlah (satuan dasar) yang sudah diretur dari satu baris asal. */
export function sudahDiretur(asal: { notaId?: string; pesananId?: string }, asalBarisId: string, s: State = state) {
  return s.retur
    .filter((r) => (asal.notaId ? r.notaId === asal.notaId : r.pesananId === asal.pesananId))
    .flatMap((r) => r.baris)
    .filter((b) => b.asalBarisId === asalBarisId)
    .reduce((t, b) => t + b.jumlahDasar, 0);
}

/** Baris pesanan yang bisa diretur: yang sudah diserahkan; nilai = harga setelah diskon per satuan dasar. */
export function barisReturPesanan(p: Pesanan) {
  return ringkasPesanan(p).baris
    .filter((x) => x.b.diserahkan > 0)
    .map((x) => ({
      id: x.b.id, produkId: x.b.produkId, satuanProdukId: x.b.satuanProdukId,
      jumlahDasar: x.b.diserahkan, nilai: hitungNilaiRetur(x.h.netto, x.total, x.b.diserahkan),
    }));
}

export function simpanRetur(data: Omit<Retur, 'id' | 'nomor' | 'waktuIso' | 'waktu' | 'oleh'>): Retur {
  const nomor = nomorBaru('RT');
  const r: Retur = { ...data, id: id('rt'), nomor, waktuIso: new Date().toISOString(), waktu: sekarang(), oleh: namaAkun[state.peran] };
  ubah((s) => {
    let x: State = { ...s, retur: [r, ...s.retur] };
    for (const b of r.baris) {
      if (b.kondisi === 'bagus') x = tambahStok(x, b.produkId, b.jumlahDasar);
      else x = { ...x, barangRusak: [...x.barangRusak, { id: id('br'), produkId: b.produkId, jumlahDasar: b.jumlahDasar, tanggal: hariIni(), asal: `Retur ${nomor}` }] };
    }
    for (const t of r.tukar) x = tambahStok(x, t.produkId, -t.jumlahDasar);
    return x;
  });
  // Selisih uang tunai/transfer lewat laci (positif = toko mengembalikan → uang keluar)
  if (r.cara === 'tunai' || r.cara === 'transfer')
    catatArus({ jenis: 'retur', nomor, tunai: r.cara === 'tunai' ? -r.selisih : 0, transfer: r.cara === 'transfer' ? -r.selisih : 0, keterangan: `Retur ${r.nomorAsal ?? 'tanpa nota'}`, bank: r.bank });
  // Selisih lewat kasbon / tagihan pesanan
  if (r.cara === 'kasbon' && r.selisih > 0) {
    // Toko berutang ke pelanggan → mengurangi kasbon (nota asal dulu bila masih ada sisa).
    const tagihan = tagihanPelanggan(r.pelangganId);
    const asal = tagihan.find((t) => t.nomor === r.nomorAsal && t.sisa > 0);
    let sisa = r.selisih;
    const alokasi: { notaId: string; jumlah: number }[] = [];
    for (const t of [...(asal ? [asal] : []), ...tagihan.filter((t) => t !== asal && t.sisa > 0)]) {
      if (sisa <= 0) break;
      const pakai = Math.min(sisa, t.sisa);
      alokasi.push({ notaId: t.id, jumlah: pakai });
      sisa -= pakai;
    }
    bayarKasbon({ pelangganId: r.pelangganId, jumlah: r.selisih - sisa, metode: 'retur', lewat: 'retur', alokasi });
  }
  if (r.cara === 'kasbon' && r.selisih < 0) catatKasbonPenjualan(r.pelangganId, nomor, -r.selisih);
  if (r.cara === 'tagihan-pesanan' && r.pesananId && r.selisih > 0) {
    ubahPesanan(
      r.pesananId,
      (p) => ({ ...p, pembayaran: [...p.pembayaran, { waktu: sekarang(), jumlah: r.selisih, metode: 'retur', jenis: 'Retur', oleh: r.oleh }] }),
      `Retur ${nomor}: tagihan dipotong ${r.selisih.toLocaleString('id-ID')}`,
    );
  } else if (r.pesananId) {
    ubahPesanan(r.pesananId, (p) => p, `Retur ${nomor} (${r.nilaiRetur.toLocaleString('id-ID')})`);
  }
  return r;
}

/* ---------- Kas laci ---------- */

export const akunAktif = (s: State = state) => namaAkun[s.peran];
export const laciTerbuka = (akun = akunAktif(), s: State = state) => s.sesiLaci.find((x) => x.akun === akun && !x.ditutupIso);
export const laciTerakhirDitutup = (akun = akunAktif(), s: State = state) =>
  [...s.sesiLaci].filter((x) => x.akun === akun && x.ditutupIso).sort((a, b) => b.ditutupIso!.localeCompare(a.ditutupIso!))[0];

/** Catat arus uang kasir; otomatis ke laci yang sedang terbuka milik akun ini. */
export function catatArus(a: Omit<ArusKas, 'id' | 'waktuIso' | 'akun' | 'sesiId' | 'sumber'> & { sumber?: ArusKas['sumber'] }): ArusKas {
  const akun = akunAktif();
  const x: ArusKas = { sumber: 'laci', ...a, id: id('ak'), waktuIso: new Date().toISOString(), akun, sesiId: laciTerbuka(akun)?.id };
  ubah((s) => ({ ...s, arus: [...s.arus, x] }));
  return x;
}

export function bukaLaci(tambahBrankas: number): SesiLaci {
  const akun = akunAktif();
  const lalu = laciTerakhirDitutup(akun);
  const x: SesiLaci = {
    id: id('lc'), nomor: nomorBaru('LC'), akun, tanggal: hariIni(), dibukaIso: new Date().toISOString(),
    dariKemarin: lalu?.pembagian?.sisaLaci ?? 0, tambahBrankas,
  };
  ubah((s) => ({ ...s, sesiLaci: [...s.sesiLaci, x] }));
  return x;
}

/** Ringkasan satu laci: modal, masuk/keluar per jenis (tunai & transfer), seharusnya di laci. */
export function ringkasLaci(sesiId: string, s: State = state) {
  const sesi = s.sesiLaci.find((x) => x.id === sesiId)!;
  const arus = s.arus.filter((a) => a.sesiId === sesiId);
  const per = (j: JenisArus, f: 'tunai' | 'transfer') => arus.filter((a) => a.jenis === j && (f === 'transfer' || a.sumber === 'laci')).reduce((t, a) => t + a[f], 0);
  const jenisSemua: JenisArus[] = ['penjualan', 'kasbon', 'pesanan', 'retur', 'kas-masuk', 'titipan-brankas', 'pengeluaran', 'bayar-distributor', 'setor-bank'];
  const tunai = Object.fromEntries(jenisSemua.map((j) => [j, per(j, 'tunai')])) as Record<JenisArus, number>;
  const transfer = Object.fromEntries(jenisSemua.map((j) => [j, per(j, 'transfer')])) as Record<JenisArus, number>;
  const modal = sesi.dariKemarin + sesi.tambahBrankas;
  const masukTunai = jenisSemua.reduce((t, j) => t + Math.max(0, tunai[j]), 0);
  const keluarTunai = jenisSemua.reduce((t, j) => t + Math.min(0, tunai[j]), 0);
  const seharusnya = modal + masukTunai + keluarTunai;
  const totalTransfer = jenisSemua.reduce((t, j) => t + transfer[j], 0);
  const penjualanNota = s.penjualan.filter((n) => arus.some((a) => a.jenis === 'penjualan' && a.nomor === n.nomor));
  return {
    sesi, arus, modal, tunai, transfer, masukTunai, keluarTunai: Math.abs(keluarTunai), seharusnya, totalTransfer,
    omzet: penjualanNota.reduce((t, n) => t + n.total, 0),
    banyakNota: penjualanNota.length,
    kasbonBaru: penjualanNota.reduce((t, n) => t + n.kasbonBaru, 0),
    potongan: penjualanNota.reduce((t, n) => t + n.struk.potongan, 0),
  };
}

export function tutupLaci(data: {
  uangFisik: number; selisihDitanggung?: 'toko' | 'kasir';
  pembagian: { sisaLaci: number; brankas: number; bank: number; bankNama?: string; prive: number };
}) {
  const sesi = laciTerbuka();
  if (!sesi) return;
  const r = ringkasLaci(sesi.id);
  const selisih = data.uangFisik - r.seharusnya;
  ubah((s) => ({
    ...s,
    sesiLaci: s.sesiLaci.map((x) => (x.id === sesi.id ? {
      ...x, ditutupIso: new Date().toISOString(), uangFisik: data.uangFisik, selisih,
      selisihDitanggung: selisih !== 0 ? data.selisihDitanggung ?? 'toko' : undefined, pembagian: data.pembagian,
    } : x)),
  }));
  return sesi.id;
}

export const nomorArus = (j: 'KK' | 'KM' | 'BD' | 'ST') => nomorBaru(j);

export type StatusFaktur = 'belum' | 'sebagian' | 'lunas';

export interface FakturHutang {
  id: string; // "fk:<nomor PB>" atau "hl:<id>"
  nomor: string; // nomor internal (PB-…) atau nomor faktur lama
  nomorDistributor: string; // nomor di kertas faktur
  distributorId: string;
  tanggal: string; // yyyy-mm-dd
  jatuhTempo: string;
  total: number;
  dibayar: number;
  sisa: number;
  status: StatusFaktur;
  lama: boolean;
  /** Faktur asli (dari barang masuk), bila bukan hutang lama. */
  asli?: FakturSP & { spNomor: string };
  pembayaran: { nomor: string; waktuIso: string; jumlah: number; diskon: number; sumber: ArusKas['sumber']; akun: string }[];
}

/** Semua faktur tempo (dari Surat Pesanan) + hutang lama, dengan pembayaran dan status. */
export function daftarFaktur(s: State = state): FakturHutang[] {
  const termin = (d: string) => distributorContoh.find((x) => x.id === d)?.terminHari ?? 0;
  const bayarnya = (fid: string) =>
    s.arus.flatMap((a) => (a.faktur ?? []).filter((f) => f.id === fid).map((f) => ({ nomor: a.nomor, waktuIso: a.waktuIso, jumlah: f.jumlah, diskon: f.diskon ?? 0, sumber: a.sumber, akun: a.akun })));
  const dasar = [
    ...s.hutangLama.map((h) => ({
      id: `hl:${h.id}`, nomor: h.nomor, nomorDistributor: h.nomor, distributorId: h.distributorId, tanggal: h.tanggal,
      jatuhTempo: h.jatuhTempo ?? tambahHari(h.tanggal, termin(h.distributorId)), total: h.total, lama: true,
    })),
    ...s.sp.flatMap((sp) =>
      sp.faktur.filter((f) => f.cara === 'tempo').map((f) => {
        const tgl = f.tanggal ?? hariIni();
        return {
          id: `fk:${f.nomor}`, nomor: f.nomor, nomorDistributor: f.nomorDistributor, distributorId: sp.distributorId, tanggal: tgl,
          jatuhTempo: tambahHari(tgl, termin(sp.distributorId)), total: f.total, lama: false, asli: { ...f, spNomor: sp.nomor },
        };
      }),
    ),
  ];
  return dasar
    .map((f) => {
      const pembayaran = bayarnya(f.id);
      const dibayar = pembayaran.reduce((t, p) => t + p.jumlah + p.diskon, 0);
      const sisa = Math.max(0, f.total - dibayar);
      return { ...f, pembayaran, dibayar, sisa, status: (sisa === 0 ? 'lunas' : dibayar > 0 ? 'sebagian' : 'belum') as StatusFaktur };
    })
    .sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo));
}

/** Faktur distributor yang belum lunas. */
export const fakturTerbuka = (s: State = state) => daftarFaktur(s).filter((f) => f.sisa > 0);

/* ---------- Contoh awal untuk pratinjau ---------- */
(function isiContoh() {
  const besok = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const lusa = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  buatPesanan({
    pelangganId: 'bu-sri', cara: 'antar', alamat: 'Pasar Blok C no. 12', tanggalJanji: lusa,
    baris: [
      { produkId: 'taro', satuanProdukId: 'taro-ktn', qty: 72 },
      { produkId: 'sarimi', satuanProdukId: 'sarimi-ktn50', qty: 2 },
    ],
    dp: { jumlah: 1000000, metode: 'transfer' },
  });
  buatPesanan({
    pelangganId: 'antok', cara: 'ambil', tanggalJanji: besok,
    baris: [{ produkId: 'gula-1kg', satuanProdukId: 'gula-1kg-bks', qty: 10 }],
  });
  // Kasbon contoh: Antok punya kasbon lama dari buku catatan (sudah lewat tempo 14 hari).
  const lalu = (h: number) => tambahHari(hariIni(), -h);
  catatKasbonLama({ pelangganId: 'antok', tanggal: lalu(40), jumlah: 50000, keterangan: 'Dari buku catatan kasbon' });
  const nota = (pelangganId: string, nomor: string, h: number, jumlah: number) =>
    (state = { ...state, notaKasbon: [...state.notaKasbon, { id: id('nk'), nomor, pelangganId, tanggal: lalu(h), jumlah, sumber: 'penjualan', oleh: '[Kasir A]' }] });
  nota('antok', 'PJ-2609-0201', 12, 60000);
  nota('bu-sri', 'PJ-2610-0184', 6, 300000);

  // Nota penjualan contoh (Riwayat & Retur). Yang kasbon sekaligus jadi nota kasbon.
  const jual = (nomor: string, pelangganId: string, hariLalu: number, jam: number, baris: { produkId: string; satuanProdukId: string; qty: number }[],
    bayar: 'tunai' | 'transfer' | 'kasbon', potongan = 0) => {
    const w = new Date(); w.setDate(w.getDate() - hariLalu); w.setHours(jam, 15, 0, 0);
    const n = susunNotaPenjualan({ nomor, waktuIso: w.toISOString(), pelangganId, kasir: '[Kasir A]', baris, potongan,
      jenisPotongan: potongan ? (potongan <= 500 ? 'Pembulatan' : 'Diskon akhir') : undefined,
      tunai: 0, transfer: 0, kembalian: 0, kasbonBaru: 0, bayarKasbon: 0 });
    const total = n.total;
    const final = { ...n, tunai: bayar === 'tunai' ? total : 0, transfer: bayar === 'transfer' ? total : 0, kasbonBaru: bayar === 'kasbon' ? total : 0,
      struk: { ...n.struk, tunai: bayar === 'tunai' ? total : 0, transfer: bayar === 'transfer' ? total : 0, kasbonBaru: bayar === 'kasbon' ? total : 0 } };
    state = { ...state, penjualan: [{ ...final, id: id('pj') }, ...state.penjualan] };
    if (bayar === 'kasbon')
      state = { ...state, notaKasbon: [...state.notaKasbon, { id: id('nk'), nomor, pelangganId, tanggal: n.tanggal, jumlah: total, sumber: 'penjualan', oleh: '[Kasir A]' }] };
  };
  jual('PJ-2610-0219', 'antok', 3, 9, [{ produkId: 'gula-1kg', satuanProdukId: 'gula-1kg-bks', qty: 2 }], 'kasbon');
  jual('PJ-2610-0221', 'bu-sri', 2, 14, [{ produkId: 'sarimi', satuanProdukId: 'sarimi-ktn25', qty: 1 }, { produkId: 'minyak-1l', satuanProdukId: 'minyak-pcs', qty: 2 }], 'kasbon');
  jual('PJ-2610-0226', 'umum', 1, 16, [{ produkId: 'skm', satuanProdukId: 'skm-klg', qty: 3 }, { produkId: 'kecap', satuanProdukId: 'kecap-btl', qty: 1 }], 'tunai', 300);
  jual('PJ-2610-0229', 'amir', 0, 8, [{ produkId: 'gulaku-5', satuanProdukId: 'gulaku-5-bks', qty: 2 }, { produkId: 'taro', satuanProdukId: 'taro-rtg', qty: 1 }], 'transfer');
  jual('PJ-2610-0230', 'umum', 0, 10, [{ produkId: 'sarimi', satuanProdukId: 'sarimi-pcs', qty: 10 }, { produkId: 'air-600', satuanProdukId: 'air-pcs', qty: 2 }], 'tunai', 500);

  // Hutang lama ke distributor (tanpa rincian barang)
  state = { ...state, hutangLama: [
    { id: 'hl1', distributorId: 'dist-a', nomor: 'INV-0912', tanggal: lalu(26), total: 1250000 },
    { id: 'hl2', distributorId: 'dist-b', nomor: 'F-2209', tanggal: lalu(16), jatuhTempo: tambahHari(hariIni(), 3), total: 2400000 },
    { id: 'hl3', distributorId: 'dist-c', nomor: 'C-1003', tanggal: lalu(5), total: 850000 },
    { id: 'hl4', distributorId: 'dist-b', nomor: 'F-2150', tanggal: lalu(35), jatuhTempo: lalu(5), total: 600000 },
  ] };
  // Pembayaran lama dari kas pemilik (Back Office): F-2150 lunas, INV-0912 sebagian.
  const bayarLama = (nomor: string, h: number, fid: string, nomorF: string, jumlah: number, dist: string) =>
    (state = { ...state, arus: [...state.arus, { id: id('ak'), nomor, waktuIso: (() => { const w = new Date(); w.setDate(w.getDate() - h); w.setHours(15, 0, 0, 0); return w.toISOString(); })(),
      akun: '[Pemilik]', jenis: 'bayar-distributor', sumber: 'brankas', tunai: -jumlah, transfer: 0, penerima: dist, keterangan: `Bayar ${dist}`,
      faktur: [{ id: fid, nomor: nomorF, jumlah }] }] });
  // Faktur tempo asli dari Surat Pesanan (ada rincian barangnya)
  const spId = buatSP({ distributorId: 'dist-a', sumber: 'stok', baris: [
    { produkId: 'minyak-1l', satuanProdukId: 'minyak-ktn', labelSatuan: 'Karton isi 12', qty: 5, hargaPerkiraan: 205000, untukPesanan: [] },
    { produkId: 'kecap', satuanProdukId: 'kecap-ktn', labelSatuan: 'Karton isi 12', qty: 3, hargaPerkiraan: 252000, untukPesanan: [] },
  ] });
  tandaiSPDikirim(spId);
  const spX = state.sp.find((x) => x.id === spId)!;
  terimaDariSP(spId, { nomorDistributor: 'SJ-A-7781', cara: 'tempo', baris: spX.baris.map((b) => ({ barisId: b.id, qty: b.qty, harga: b.hargaPerkiraan ?? 0 })), tutupSisa: true });
  state = { ...state, sp: state.sp.map((x) => (x.id === spId ? { ...x, faktur: x.faktur.map((f) => ({ ...f, tanggal: lalu(4) })) } : x)) };
  bayarLama('BD-2610-0001', 6, 'hl:hl4', 'F-2150', 600000, 'Distributor B');
  bayarLama('BD-2610-0002', 3, 'hl:hl1', 'INV-0912', 250000, 'Distributor A');
  state = { ...state, urut: { ...state.urut, BD: 3 } };

  // Laci contoh: kemarin sudah ditutup; hari ini Kasir A sudah buka, Pemilik belum.
  const jamKe = (h: number, j: number, m = 0) => { const w = new Date(); w.setDate(w.getDate() - h); w.setHours(j, m, 0, 0); return w.toISOString(); };
  const notaDi = (nomor: string) => state.penjualan.find((n) => n.nomor === nomor)!;
  const arusContoh = (sesiId: string, akun: string, waktuIso: string, a: Omit<ArusKas, 'id' | 'waktuIso' | 'akun' | 'sesiId' | 'sumber'> & { sumber?: ArusKas['sumber'] }) =>
    (state = { ...state, arus: [...state.arus, { sumber: 'laci', ...a, id: id('ak'), waktuIso, akun, sesiId }] });
  const n226 = notaDi('PJ-2610-0226');
  state = { ...state, sesiLaci: [
    { id: 'lc-k1', nomor: 'LC-2610-0001', akun: '[Kasir A]', tanggal: lalu(1), dibukaIso: jamKe(1, 7, 30), dariKemarin: 500000, tambahBrankas: 0,
      ditutupIso: jamKe(1, 17, 5), uangFisik: 500000 + n226.total - 25000 - 700, selisih: -700, selisihDitanggung: 'toko',
      pembagian: { sisaLaci: 500000, brankas: n226.total - 25000 - 700, bank: 0, prive: 0 } },
    { id: 'lc-p1', nomor: 'LC-2610-0002', akun: '[Pemilik]', tanggal: lalu(1), dibukaIso: jamKe(1, 7, 0), dariKemarin: 300000, tambahBrankas: 0,
      ditutupIso: jamKe(1, 17, 30), uangFisik: 300000, selisih: 0, pembagian: { sisaLaci: 300000, brankas: 0, bank: 0, prive: 0 } },
    { id: 'lc-k2', nomor: 'LC-2610-0003', akun: '[Kasir A]', tanggal: hariIni(), dibukaIso: jamKe(0, 7, 30), dariKemarin: 500000, tambahBrankas: 0 },
  ], urut: { ...state.urut, LC: 4 } };
  arusContoh('lc-k1', '[Kasir A]', n226.waktuIso, { jenis: 'penjualan', nomor: n226.nomor, tunai: n226.total, transfer: 0, keterangan: 'Penjualan · Umum' });
  arusContoh('lc-k1', '[Kasir A]', jamKe(1, 11), { jenis: 'pengeluaran', nomor: 'KK-2610-0001', tunai: -25000, transfer: 0, kategori: 'Bongkar muat & angkut', penerima: 'Pak Udin (kuli)', keterangan: 'Bongkar 2 colt gula' });
  const n229 = notaDi('PJ-2610-0229');
  const n230 = notaDi('PJ-2610-0230');
  arusContoh('lc-k2', '[Kasir A]', n229.waktuIso, { jenis: 'penjualan', nomor: n229.nomor, tunai: 0, transfer: n229.total, keterangan: 'Penjualan · Amir' });
  arusContoh('lc-k2', '[Kasir A]', n230.waktuIso, { jenis: 'penjualan', nomor: n230.nomor, tunai: n230.total, transfer: 0, keterangan: 'Penjualan · Umum' });
  state = { ...state, urut: { ...state.urut, KK: 2 } };
})();

/** Hanya untuk tes: membaca state saat ini. */
export const __state = () => state;

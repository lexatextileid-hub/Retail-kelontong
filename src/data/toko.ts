/**
 * Penyimpanan bersama untuk PRATINJAU (di memori, hilang saat halaman ditutup).
 * Nanti diganti Supabase. Bentuk data di sini mengikuti rancangan tabel.
 */
import { useSyncExternalStore } from 'react';
import { diskonContoh, hargaBeliContoh, modalContoh, pelangganContoh, stokContoh, type PelangganContoh } from './contoh';
import { alokasiTertua, isoHari, selisihHari, tambahHari } from '../domain/kasbon';
import { hitungHargaBaris, TARGET_UNTUNG_PERSEN, untungDariModal } from '../domain/harga';
import { ambilProduk, ambilSatuan } from '../features/penjualan/model';

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
  metode: 'tunai' | 'transfer';
  jenis: 'DP' | 'Pelunasan' | 'Cicilan';
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
  faktur: { nomor: string; nomorDistributor: string; waktu: string; cara: 'cash' | 'tempo'; total: number; oleh: string }[];
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
  metode: 'tunai' | 'transfer';
  bank?: string; // keterangan saja, mis. BCA
  lewat: 'kasbon' | 'penjualan';
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

interface State {
  peran: Peran;
  pelanggan: PelangganContoh[];
  notaKasbon: NotaKasbon[];
  bayarKasbon: BayarKasbon[];
  pesanan: Pesanan[];
  sp: SuratPesanan[];
  urut: Record<'PS' | 'SP' | 'SJ' | 'PB' | 'KL' | 'BK', number>;
  stokTambahan: Record<string, number>; // stok umum yang masuk dari SP (pratinjau)
}

let state: State = {
  peran: 'pemilik',
  pelanggan: pelangganContoh,
  notaKasbon: [],
  bayarKasbon: [],
  pesanan: [],
  sp: [],
  urut: { PS: 1, SP: 1, SJ: 1, PB: 1, KL: 1, BK: 1 },
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
            faktur: [...x.faktur, { nomor, nomorDistributor: data.nomorDistributor, waktu: sekarang(), cara: data.cara, total, oleh: namaAkun[s.peran] }],
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
  pelangganId: string; jumlah: number; metode: 'tunai' | 'transfer'; bank?: string; lewat?: 'kasbon' | 'penjualan';
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
  nota('antok', 'PJ-2610-0219', 3, 35000);
  nota('bu-sri', 'PJ-2610-0184', 6, 300000);
  nota('bu-sri', 'PJ-2610-0221', 2, 120000);
})();

/** Hanya untuk tes: membaca state saat ini. */
export const __state = () => state;

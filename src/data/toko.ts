/**
 * Penyimpanan bersama untuk PRATINJAU (di memori, hilang saat halaman ditutup).
 * Nanti diganti Supabase. Bentuk data di sini mengikuti rancangan tabel.
 */
import { useSyncExternalStore } from 'react';
import { diskonContoh, hargaBeliContoh, modalContoh, pelangganContoh, stokContoh } from './contoh';
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

interface State {
  peran: Peran;
  pesanan: Pesanan[];
  sp: SuratPesanan[];
  urut: Record<'PS' | 'SP' | 'SJ' | 'PB', number>;
  stokTambahan: Record<string, number>; // stok umum yang masuk dari SP (pratinjau)
}

let state: State = {
  peran: 'pemilik',
  pesanan: [],
  sp: [],
  urut: { PS: 1, SP: 1, SJ: 1, PB: 1 },
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
  const plg = pelangganContoh.find((x) => x.id === p.pelangganId) ?? pelangganContoh[0];
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
  return { baris, total, dibayar, dp, sisa, semuaSiap, status, perluSetuju };
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
      serah: [...p.serah, { nomor, waktu: sekarang(), diantar, oleh, baris }],
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
})();

/** Hanya untuk tes: membaca state saat ini. */
export const __state = () => state;

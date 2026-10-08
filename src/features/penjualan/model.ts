import { produkContoh } from '../../data/contoh';
import { satuanBawaan } from '../../domain/satuanBawaan';
import type { Produk, SatuanProduk } from '../../domain/tipe';

export interface BarisKeranjang {
  id: string;
  produkId: string;
  satuanProdukId: string;
  qty: number;
  diskonManual?: number;
  /** Harga per satuan yang diketik kasir (barang timbang). */
  hargaManual?: number;
}

export interface Keranjang {
  pelangganId: string;
  baris: BarisKeranjang[];
}

export interface Tertahan {
  id: string;
  nama: string;
  waktu: string;
  keranjang: Keranjang;
}

export interface BarisNota {
  nama: string;
  label: string;
  qty: number;
  hargaSatuan: number;
  bruto: number;
  diskon: number;
}

export interface Nota {
  nomor: string;
  waktu: string;
  kasir: string;
  pelanggan: string;
  baris: BarisNota[];
  subtotal: number;
  diskonPelanggan: number;
  potongan: number;
  jenisPotongan?: 'Pembulatan' | 'Diskon akhir';
  total: number;
  bayarKasbon: number;
  tunai: number;
  transfer: number;
  kembalian: number;
  kasbonBaru: number;
  sisaKasbon?: number;
  pakaiSaldo?: number;
}

export const kosong = (): Keranjang => ({ pelangganId: 'umum', baris: [] });

export const produkById = new Map(produkContoh.map((p) => [p.id, p]));
export const ambilProduk = (id: string): Produk => produkById.get(id)!;
export const ambilSatuan = (p: Produk, id: string): SatuanProduk => p.satuan.find((s) => s.id === id)!;

/** Satuan yang dijual, urut kecil → besar (aturan kasir). */
export const satuanJual = (p: Produk) => p.satuan.filter((s) => s.dijual).sort((a, b) => a.isi - b.isi);

const masterSatuan = new Map(satuanBawaan.map((s) => [s.singkatan, s]));
export const bolehDesimal = (satuanId: string) => masterSatuan.get(satuanId)?.bolehDesimal ?? false;
export const singkatan = (satuanId: string) => masterSatuan.get(satuanId)?.singkatan ?? satuanId;

export const jam = () =>
  new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

let urut = 0;
export const idBaru = () => `b${Date.now().toString(36)}${(urut++).toString(36)}`;

/** Jumlah tampil: desimal hanya untuk satuan yang boleh desimal. */
export const angka = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 3 });

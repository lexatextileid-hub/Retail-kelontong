import { kategoriBawaan } from '../../domain/kategoriBawaan';
import { untungDariModal } from '../../domain/harga';
import { namaStatusGerak, stokBertingkat, type StatusGerak, type WarnaUmur } from '../../domain/stok';
import type { Produk } from '../../domain/tipe';
import { singkatan } from '../penjualan/model';
import '../../styles/stok.css';

export const namaKategori = (id: string) => kategoriBawaan.find((k) => k.kode === id)?.nama ?? id;

/** "4 ktn 3 rtg 7 pcs" dari jumlah satuan dasar, memakai rantai satuan barang. */
export const labelStok = (p: Produk, jumlahDasar: number) =>
  stokBertingkat(jumlahDasar, p.satuan.map((s) => ({ isi: s.isi, singkatan: singkatan(s.satuanId) })));

export const labelDasarSaja = (p: Produk, jumlahDasar: number) =>
  `${(Math.round(jumlahDasar * 1000) / 1000).toLocaleString('id-ID')} ${singkatan(p.satuanDasarId)}`;

const warnaGerak: Record<StatusGerak, string> = { laku: 'hijau', lambat: 'kuning', berhenti: 'merah', baru: 'biru', musiman: 'abu' };
export const ChipGerak = ({ status }: { status: StatusGerak }) => (
  <span className={`chip-status chip-status--${warnaGerak[status]}`}>{namaStatusGerak[status]}</span>
);

export const namaUmur: Record<WarnaUmur, string> = { normal: '< 3 bln', kuning: '3–6 bln', oranye: '6–12 bln', merah: '≥ 12 bln' };
export const ChipUmur = ({ warna, hari }: { warna: WarnaUmur; hari?: number }) => (
  <span className={`sb-umur sb-umur--${warna}`}>{hari !== undefined ? `${hari} hari` : namaUmur[warna]}</span>
);

/**
 * Harga jual kecil · sedang · besar (kesepakatan lama): per satuan jual urut kecil → besar,
 * atau tingkat harga untuk barang bertingkat (harga per satuan dasar). Untung dari modal.
 */
export function hargaJualTingkat(p: Produk, modal?: number) {
  const dasar = singkatan(p.satuanDasarId);
  const daftar = p.metodeHarga === 'bertingkat'
    ? [...p.tingkatHarga].sort((a, b) => a.mulaiJumlah - b.mulaiJumlah).map((t) => ({
      judul: t.mulaiJumlah > 0 ? `≥ ${t.mulaiJumlah} ${dasar}` : `per ${dasar}`, harga: t.harga, isi: 1,
    }))
    : p.satuan.filter((s) => s.dijual && s.hargaJual).sort((a, b) => a.isi - b.isi).map((s) => ({ judul: s.label, harga: s.hargaJual!, isi: s.isi }));
  return daftar.map((x) => {
    const modalTotal = modal !== undefined ? modal * x.isi : undefined;
    return { ...x, untungRp: modalTotal !== undefined ? x.harga - modalTotal : undefined, untungPersen: modalTotal ? untungDariModal(x.harga, modalTotal) : undefined };
  });
}

export const teksPersen = (n?: number) => (n === undefined || !Number.isFinite(n) ? '' : `${n > 0 ? '+' : ''}${n.toLocaleString('id-ID')}%`);

/** Satuan beli bawaan (untuk menampilkan harga beli per karton, dll.). */
export const satuanBeli = (p: Produk) => [...p.satuan].filter((s) => s.dibeli).sort((a, b) => b.isi - a.isi)[0] ?? p.satuan[0];

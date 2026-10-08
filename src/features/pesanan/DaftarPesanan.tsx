import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BilahAtas, KartuRingkas, KotakFilter, PilihanChip, Sel, TabelDaftar } from '../../components/Daftar';
import { ringkasPesanan, useToko, type StatusPesanan } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { ChipStatus, namaPelanggan, tanggalPanjang } from './bersama';

type F = 'aktif' | 'tindakan' | 'menunggu' | 'tempo' | 'selesai' | 'semua';
const grup: Record<F, StatusPesanan[]> = {
  aktif: ['Perlu diorder', 'Menunggu barang', 'Perlu persetujuan', 'Barang siap', 'Disiapkan', 'Diserahkan sebagian', 'Tempo'],
  tindakan: ['Perlu diorder', 'Perlu persetujuan', 'Barang siap', 'Disiapkan', 'Diserahkan sebagian'],
  menunggu: ['Menunggu barang'],
  tempo: ['Tempo'],
  selesai: ['Lunas', 'Dibatalkan'],
  semua: [],
};

/** Daftar pesanan pelanggan — format seragam (ringkasan, filter, tabel dengan total). */
export function DaftarPesanan() {
  const { pesanan, pelanggan } = useToko();
  const navigasi = useNavigate();
  const [f, setF] = useState<F>('aktif');
  const [fPlg, setFPlg] = useState('');
  const [cari, setCari] = useState('');
  const data = pesanan.map((p) => ({ p, r: ringkasPesanan(p) }));
  const di = (k: F) => data.filter(({ r }) => !grup[k].length || grup[k].includes(r.status));
  const q = cari.trim().toLowerCase();
  const tampil = di(f)
    .filter(({ p }) => !fPlg || p.pelangganId === fPlg)
    .filter(({ p }) => !q || p.nomor.toLowerCase().includes(q) || namaPelanggan(p.pelangganId).toLowerCase().includes(q))
    .sort((a, b) => a.p.tanggalJanji.localeCompare(b.p.tanggalJanji));
  const jumlah = (xs: typeof data, fn: (x: (typeof data)[number]) => number) => xs.reduce((t, x) => t + fn(x), 0);
  const aktif = di('aktif');

  return (
    <div className="ps-halaman">
      <BilahAtas kanan={<Link to="../baru" className="tombol tombol--utama">+ Buat pesanan</Link>} />
      <KartuRingkas item={[
        { judul: 'Pesanan aktif', nilai: rupiah(jumlah(aktif, (x) => x.r.total)), catatan: `${aktif.length} pesanan`, aktif: f === 'aktif', onKlik: () => setF('aktif') },
        { judul: 'Perlu tindakan', nilai: di('tindakan').length, catatan: 'order, setujui, siapkan, serahkan', aktif: f === 'tindakan', onKlik: () => setF('tindakan') },
        { judul: 'Menunggu barang', nilai: di('menunggu').length, catatan: 'sudah dipesan ke distributor', aktif: f === 'menunggu', onKlik: () => setF('menunggu') },
        { judul: 'Belum dibayar', nilai: rupiah(jumlah(aktif, (x) => x.r.sisa)), catatan: 'sisa tagihan pesanan aktif' },
      ]} />
      <KotakFilter>
        <div className="rt-filter">
          <label className="isian">
            Pelanggan
            <select className="isian__kontrol" value={fPlg} onChange={(e) => setFPlg(e.target.value)}>
              <option value="">Semua pelanggan</option>
              {pelanggan.filter((p) => p.jenis === 'terdaftar').map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </label>
          <label className="isian">
            Cari
            <input className="isian__kontrol" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="no. pesanan atau nama pelanggan" />
          </label>
        </div>
        <PilihanChip label="Status" nilai={f} onUbah={setF} pilihan={[
          { k: 'aktif', judul: 'Aktif', jumlah: aktif.length }, { k: 'tindakan', judul: 'Perlu tindakan', jumlah: di('tindakan').length },
          { k: 'menunggu', judul: 'Menunggu barang', jumlah: di('menunggu').length }, { k: 'tempo', judul: 'Tempo', jumlah: di('tempo').length },
          { k: 'selesai', judul: 'Selesai', jumlah: di('selesai').length }, { k: 'semua', judul: 'Semua', jumlah: data.length },
        ]} />
      </KotakFilter>
      <TabelDaftar
        data={tampil}
        kunci={({ p }) => p.id}
        onKlik={({ p }) => navigasi(`../detail/${p.id}`)}
        kosong={<><h2>Tidak ada pesanan</h2><p className="teks-pudar">Pesanan dipakai untuk pembeli yang memesan dulu. Pesanan kecil yang barangnya ada cukup lewat Penjualan → Tahan.</p></>}
        kolom={[
          { judul: 'No. pesanan', isi: ({ p }) => <Sel utama={<strong>{p.nomor}</strong>} bawah={p.dibuat} /> },
          { judul: 'Pelanggan', isi: ({ p }) => namaPelanggan(p.pelangganId) },
          { judul: 'Ambil / antar', isi: ({ p }) => <Sel utama={tanggalPanjang(p.tanggalJanji)} bawah={p.cara === 'antar' ? 'Diantar' : 'Diambil'} /> },
          { judul: 'Barang', isi: ({ p }) => `${p.baris.length} barang` },
          { judul: 'Total', kanan: true, isi: ({ r }) => rupiah(r.total), total: rupiah(jumlah(tampil, (x) => x.r.total)) },
          { judul: 'Dibayar', kanan: true, isi: ({ r }) => (r.dibayar ? rupiah(r.dibayar) : '-'), total: rupiah(jumlah(tampil, (x) => x.r.dibayar)) },
          { judul: 'Sisa', kanan: true, isi: ({ p, r }) => <strong>{p.dibatalkan ? '-' : rupiah(r.sisa)}</strong>, total: rupiah(jumlah(tampil, (x) => (x.p.dibatalkan ? 0 : x.r.sisa))) },
          { judul: 'Status', isi: ({ r }) => <ChipStatus status={r.status} /> },
        ]}
      />
    </div>
  );
}

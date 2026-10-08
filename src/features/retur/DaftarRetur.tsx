import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PilihPeriode, teksPeriode, periodeDari, type Periode } from '../../components/PilihPeriode';
import { useToko, type Retur } from '../../data/toko';
import { isoHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { namaPelanggan } from '../pesanan/bersama';
import { DialogStrukRetur, teksCara } from './DialogRetur';
import '../../styles/pesanan.css';
import '../../styles/kasbon.css';

type Sumber = 'semua' | Retur['sumber'];

/** Daftar retur: filter periode, pelanggan/nomor, sumber. Tambah retur dari sini. */
export function DaftarRetur() {
  const { retur, pelanggan } = useToko();
  const [periode, setPeriode] = useState<Periode>(() => periodeDari('7-hari', '', { dari: '', sampai: '' }));
  const { dari, sampai } = periode;
  const [cari, setCari] = useState('');
  const [fPelanggan, setFPelanggan] = useState('');
  const [sumber, setSumber] = useState<Sumber>('semua');
  const [buka, setBuka] = useState<Retur | null>(null);

  const q = cari.trim().toLowerCase();
  const diPeriode = retur.filter((r) => {
    const t = isoHari(new Date(r.waktuIso));
    return t >= dari && t <= sampai;
  });
  const tampil = diPeriode
    .filter((r) => sumber === 'semua' || r.sumber === sumber)
    .filter((r) => !fPelanggan || r.pelangganId === fPelanggan)
    .filter((r) => !q || r.nomor.toLowerCase().includes(q) || (r.nomorAsal ?? '').toLowerCase().includes(q));
  const total = tampil.reduce((t, r) => t + r.nilaiRetur, 0);
  const banyak = (s: Sumber) => diPeriode.filter((r) => s === 'semua' || r.sumber === s).length;

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <div className="kartu kb-angka" style={{ minWidth: 220 }}>
          <span className="teks-pudar">Total retur · {teksPeriode(periode)}</span>
          <strong>{rupiah(total)}</strong>
          <span className="teks-pudar">{tampil.length} retur</span>
        </div>
        <Link to="../baru" className="tombol tombol--utama">+ Tambah retur</Link>
      </div>

      <div className="kartu tumpuk">
        <PilihPeriode awal="7-hari" onUbah={setPeriode} />
        <div className="rt-filter">
          <label className="isian">
            Pelanggan
            <select className="isian__kontrol" value={fPelanggan} onChange={(e) => setFPelanggan(e.target.value)}>
              <option value="">Semua pelanggan</option>
              {pelanggan.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </label>
          <label className="isian">
            Nomor
            <input className="isian__kontrol" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="RT-… atau nota asal" />
          </label>
        </div>
        <div className="pj__kategori" role="group" aria-label="Sumber">
          {([['semua', 'Semua'], ['nota', 'Dari nota'], ['pesanan', 'Dari pesanan'], ['tanpa-nota', 'Tanpa nota']] as [Sumber, string][]).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={sumber === k} onClick={() => setSumber(k)}>{t}<span className="ps-hitung">{banyak(k)}</span></button>
          ))}
        </div>
      </div>

      {tampil.length === 0 ? (
        <div className="kartu ps-kosong-besar">
          <h2>Tidak ada retur</h2>
          <p className="teks-pudar">Tidak ada retur untuk filter ini. Tambah retur: pilih nota (cari nomor, tanggal, atau pelanggan), lalu pilih barangnya.</p>
        </div>
      ) : (
        <div className="kartu rw-daftar">
          {tampil.map((r) => (
            <button key={r.id} type="button" className="rw-baris" onClick={() => setBuka(r)}>
              <span className="rw-baris__kiri">
                <span className="rw-baris__nomor">
                  <strong>{r.nomor}</strong>
                  <span className="chip-status chip-status--abu">{r.nomorAsal ?? 'Tanpa nota'}</span>
                  {r.pengecualian && <span className="chip-status chip-status--kuning">Pengecualian</span>}
                  {r.tukar.length > 0 && <span className="chip-status chip-status--biru">Tukar barang</span>}
                </span>
                <span className="teks-pudar">{r.waktu} · {namaPelanggan(r.pelangganId)} · {teksCara(r)} · {r.alasan}</span>
              </span>
              <strong className="rw-baris__nilai">{rupiah(r.nilaiRetur)}</strong>
            </button>
          ))}
        </div>
      )}
      {buka && <DialogStrukRetur retur={buka} onTutup={() => setBuka(null)} />}
    </div>
  );
}

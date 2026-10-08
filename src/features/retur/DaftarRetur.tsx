import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KartuRingkas, KotakFilter, PilihanChip, Sel, TabelDaftar } from '../../components/Daftar';
import { PilihPeriode, periodeDari, teksPeriode, type Periode } from '../../components/PilihPeriode';
import { useToko, type Retur } from '../../data/toko';
import { isoHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { namaPelanggan } from '../pesanan/bersama';
import { DialogStrukRetur, teksCara } from './DialogRetur';

type Sumber = 'semua' | Retur['sumber'];

/** Daftar retur — format seragam: ringkasan, filter periode/pelanggan/nomor/sumber, tabel dengan total. */
export function DaftarRetur() {
  const { retur, pelanggan } = useToko();
  const [periode, setPeriode] = useState<Periode>(() => periodeDari('7-hari', '', { dari: '', sampai: '' }));
  const [cari, setCari] = useState('');
  const [fPelanggan, setFPelanggan] = useState('');
  const [sumber, setSumber] = useState<Sumber>('semua');
  const [buka, setBuka] = useState<Retur | null>(null);

  const q = cari.trim().toLowerCase();
  const diPeriode = retur.filter((r) => { const t = isoHari(new Date(r.waktuIso)); return t >= periode.dari && t <= periode.sampai; });
  const tampil = diPeriode
    .filter((r) => sumber === 'semua' || r.sumber === sumber)
    .filter((r) => !fPelanggan || r.pelangganId === fPelanggan)
    .filter((r) => !q || r.nomor.toLowerCase().includes(q) || (r.nomorAsal ?? '').toLowerCase().includes(q));
  const jumlah = (xs: Retur[], fn: (r: Retur) => number) => xs.reduce((t, r) => t + fn(r), 0);
  const banyak = (s: Sumber) => diPeriode.filter((r) => s === 'semua' || r.sumber === s).length;
  const kembali = diPeriode.filter((r) => r.selisih > 0 && (r.cara === 'tunai' || r.cara === 'transfer'));

  return (
    <div className="ps-halaman">
      <KartuRingkas item={[
        { judul: `Retur · ${teksPeriode(periode)}`, nilai: rupiah(jumlah(diPeriode, (r) => r.nilaiRetur)), catatan: `${diPeriode.length} retur` },
        { judul: 'Uang dikembalikan', nilai: rupiah(jumlah(kembali, (r) => r.selisih)), catatan: 'tunai / transfer' },
        { judul: 'Tukar barang', nilai: diPeriode.filter((r) => r.tukar.length).length, catatan: 'retur dengan barang pengganti' },
        { judul: 'Pengecualian', nilai: diPeriode.filter((r) => r.pengecualian).length, catatan: 'lewat batas / tanpa nota', warna: diPeriode.some((r) => r.pengecualian) ? 'merah' : undefined },
      ]} />
      <KotakFilter cari={{ nilai: cari, onUbah: setCari, placeholder: 'Cari RT-… atau nota asal' }} aksi={<Link to="../baru" className="tombol tombol--utama">+ Tambah retur</Link>} ringkas={[teksPeriode(periode), { semua: 'semua sumber', nota: 'dari nota', pesanan: 'dari pesanan', 'tanpa-nota': 'tanpa nota' }[sumber], fPelanggan ? namaPelanggan(fPelanggan) : 'semua pelanggan', q && `"${cari}"`].filter(Boolean).join(' · ')}>
        <PilihPeriode awal="7-hari" onUbah={setPeriode} />
        <div className="rt-filter">
          <label className="isian">
            Pelanggan
            <select className="isian__kontrol" value={fPelanggan} onChange={(e) => setFPelanggan(e.target.value)}>
              <option value="">Semua pelanggan</option>
              {pelanggan.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </label>
        </div>
        <PilihanChip label="Sumber" nilai={sumber} onUbah={setSumber} pilihan={[
          { k: 'semua', judul: 'Semua', jumlah: banyak('semua') }, { k: 'nota', judul: 'Dari nota', jumlah: banyak('nota') },
          { k: 'pesanan', judul: 'Dari pesanan', jumlah: banyak('pesanan') }, { k: 'tanpa-nota', judul: 'Tanpa nota', jumlah: banyak('tanpa-nota') },
        ]} />
      </KotakFilter>
      <TabelDaftar
        data={tampil}
        kunci={(r) => r.id}
        onKlik={setBuka}
        kosong={<><h2>Tidak ada retur</h2><p className="teks-pudar">Tambah retur: pilih nota (nomor, tanggal, atau pelanggan), lalu pilih barangnya.</p></>}
        kolom={[
          { judul: 'No. retur', isi: (r) => <Sel utama={<strong>{r.nomor}</strong>} bawah={r.waktu} /> },
          { judul: 'Pelanggan', isi: (r) => namaPelanggan(r.pelangganId) },
          { judul: 'Asal', isi: (r) => <Sel utama={r.nomorAsal ?? 'Tanpa nota'} bawah={r.pengecualian ? 'pengecualian' : undefined} /> },
          { judul: 'Jml. barang', isi: (r) => <Sel utama={`${r.baris.length} kembali`} bawah={r.tukar.length ? `${r.tukar.length} pengganti` : undefined} /> },
          { judul: 'Alasan', isi: (r) => r.alasan, bungkus: true },
          { judul: 'Penyelesaian', isi: (r) => teksCara(r) },
          { judul: 'Nilai retur', kanan: true, isi: (r) => <strong>{rupiah(r.nilaiRetur)}</strong>, total: rupiah(jumlah(tampil, (r) => r.nilaiRetur)) },
          { judul: 'Selisih', kanan: true, isi: (r) => (r.selisih === 0 ? '-' : `${r.selisih > 0 ? 'kembali ' : 'tambah '}${rupiah(Math.abs(r.selisih))}`) },
        ]}
      />
      {buka && <DialogStrukRetur retur={buka} onTutup={() => setBuka(null)} />}
    </div>
  );
}

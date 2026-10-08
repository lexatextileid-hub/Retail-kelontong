import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KartuRingkas, KotakFilter, PilihanChip, Sel, TabelDaftar } from '../../components/Daftar';
import { hariIni, ringkasKasbon, useToko } from '../../data/toko';
import { selisihHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { tanggalPendek, teksTempo } from './bersama';

type F = 'ada' | 'lewat' | 'semua';

/** Daftar kasbon per pelanggan — format seragam. `dariOffice`: Back Office → Piutang (data sama). */
export function DaftarKasbon({ dariOffice = false }: { dariOffice?: boolean }) {
  const toko = useToko();
  const navigasi = useNavigate();
  const [cari, setCari] = useState('');
  const [f, setF] = useState<F>('ada');
  const hari = hariIni();

  const semua = toko.pelanggan.filter((p) => p.jenis === 'terdaftar').map((p) => ({ p, r: ringkasKasbon(p.id, toko) }));
  const ada = semua.filter((x) => x.r.saldo > 0);
  const lewat = semua.filter((x) => x.r.lewatTempo > 0);
  const jumlah = (xs: typeof semua, fn: (x: (typeof semua)[number]) => number) => xs.reduce((t, x) => t + fn(x), 0);
  const q = cari.trim().toLowerCase();
  const tampil = (f === 'ada' ? ada : f === 'lewat' ? lewat : semua)
    .filter(({ p }) => !q || p.nama.toLowerCase().includes(q) || (p.hp ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§'))
    .sort((a, b) => b.r.lewatTempo - a.r.lewatTempo || b.r.tertuaHari - a.r.tertuaHari || a.p.nama.localeCompare(b.p.nama));

  return (
    <div className="ps-halaman">
      <KartuRingkas item={[
        { judul: dariOffice ? 'Total piutang pelanggan' : 'Total kasbon', nilai: rupiah(jumlah(ada, (x) => x.r.saldo)), catatan: `${ada.length} pelanggan`, aktif: f === 'ada', onKlik: () => setF('ada') },
        { judul: 'Lewat jatuh tempo', nilai: rupiah(jumlah(lewat, (x) => x.r.lewatTempo)), catatan: `${lewat.length} pelanggan`, warna: lewat.length ? 'merah' : undefined, aktif: f === 'lewat', onKlik: () => setF('lewat') },
        { judul: 'Belum lewat tempo', nilai: rupiah(jumlah(ada, (x) => x.r.saldo - x.r.lewatTempo)), catatan: 'masih berjalan' },
      ]} />
      <KotakFilter cari={{ nilai: cari, onUbah: setCari, placeholder: 'Cari nama atau nomor HP' }} aksi={<Link to="../lama" className="tombol tombol--utama">+ Catat kasbon lama</Link>} ringkas={[{ ada: 'Ada kasbon', lewat: 'Lewat tempo', semua: 'Semua pelanggan' }[f], q && `"${cari}"`].filter(Boolean).join(' · ')}>
        <PilihanChip label="Status" nilai={f} onUbah={setF} pilihan={[
          { k: 'ada', judul: 'Ada kasbon', jumlah: ada.length }, { k: 'lewat', judul: 'Lewat tempo', jumlah: lewat.length }, { k: 'semua', judul: 'Semua pelanggan', jumlah: semua.length },
        ]} />
      </KotakFilter>
      <TabelDaftar
        data={tampil}
        kunci={({ p }) => p.id}
        onKlik={({ p }) => navigasi(`../detail/${p.id}`)}
        kosong={<><h2>{f === 'lewat' ? 'Tidak ada kasbon lewat tempo' : 'Tidak ada data'}</h2><p className="teks-pudar">Kasbon tercatat otomatis dari kasir dan pesanan yang sudah diserahkan. Kasbon dari catatan lama lewat Catat kasbon lama.</p></>}
        kolom={[
          { judul: 'Pelanggan', isi: ({ p }) => <Sel utama={<strong>{p.nama}</strong>} bawah={p.hp ?? 'HP belum ada'} /> },
          { judul: 'Tagihan', isi: ({ r }) => (r.banyakNota ? <Sel utama={`${r.banyakNota} nota`} bawah={`tertua ${r.tertuaHari} hari`} /> : '-') },
          { judul: 'Tempo', isi: ({ p }) => (p.tempoHari ? `${p.tempoHari} hari` : 'belum diatur') },
          { judul: 'Jatuh tempo terdekat', isi: ({ r }) => (r.jatuhTempoTerdekat ? <Sel utama={tanggalPendek(r.jatuhTempoTerdekat)} bawah={teksTempo(selisihHari(hari, r.jatuhTempoTerdekat))} /> : '-') },
          { judul: 'Batas', kanan: true, isi: ({ p }) => (p.batasKasbon ? rupiah(p.batasKasbon) : 'belum diatur') },
          { judul: 'Lewat tempo', kanan: true, isi: ({ r }) => (r.lewatTempo ? <span className="teks-bahaya">{rupiah(r.lewatTempo)}</span> : '-'), total: rupiah(jumlah(tampil, (x) => x.r.lewatTempo)) },
          { judul: 'Kasbon', kanan: true, isi: ({ r }) => <strong>{rupiah(r.saldo)}</strong>, total: rupiah(jumlah(tampil, (x) => x.r.saldo)) },
          { judul: 'Status', isi: ({ r }) => (r.lewatTempo > 0 ? <span className="chip-status chip-status--merah">Lewat tempo</span> : r.saldo > 0 ? <span className="chip-status chip-status--biru">Berjalan</span> : <span className="chip-status chip-status--abu">Lunas</span>) },
        ]}
      />
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KartuRingkas, KotakFilter, PilihanChip, Sel, TabelDaftar } from '../../components/Daftar';
import { PilihPeriode, periodeDari, teksPeriode, type Periode } from '../../components/PilihPeriode';
import { adaSaldoAwal, hariIni, mutasiTempat, pencocokanTerakhir, useToko } from '../../data/toko';
import { namaKelompok, namaTempat, ringkasTempat, saldoBerjalan, type KelompokKas } from '../../domain/kas';
import { isoHari, selisihHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import { atauStrip, bertanda, DialogCocokkan, DialogKasPemilik, jamTanggal, type JenisKasPemilik } from './bersama';

type F = 'semua' | 'masuk' | 'keluar' | 'pindah' | 'selisih';
const cocok = (f: F, k: KelompokKas, n: number) =>
  f === 'semua' || (f === 'pindah' ? k.startsWith('pindah') : f === 'selisih' ? k === 'selisih' : !k.startsWith('pindah') && k !== 'selisih' && (f === 'masuk' ? n > 0 : n < 0));

/** Buku kas brankas / rekening bank (Back Office). Format seragam: ringkasan → bilah alat → tabel dengan saldo berjalan. */
export function BukuKas({ tempat }: { tempat: 'brankas' | 'bank' }) {
  const toko = useToko();
  const [periode, setPeriode] = useState<Periode>(() => periodeDari('bulan-ini', '', { dari: '', sampai: '' }));
  const [f, setF] = useState<F>('semua');
  const [cari, setCari] = useState('');
  const [dialog, setDialog] = useState<null | { jenis: JenisKasPemilik; pilihan: JenisKasPemilik[] }>(null);
  const [cek, setCek] = useState(false);
  const bank = tempat === 'bank';
  const semua = saldoBerjalan(mutasiTempat(tempat, toko));
  const r = ringkasTempat(semua, periode.dari, periode.sampai);
  const q = cari.trim().toLowerCase();
  const diPeriode = semua.filter((m) => m.tanggal >= periode.dari && m.tanggal <= periode.sampai);
  const tampil = diPeriode
    .filter((m) => cocok(f, m.kelompok, m.jumlah))
    .filter((m) => !q || m.nomor.toLowerCase().includes(q) || m.keterangan.toLowerCase().includes(q) || m.rincian.toLowerCase().includes(q))
    .reverse();
  const terakhir = pencocokanTerakhir(tempat, toko);
  const lama = terakhir ? selisihHari(isoHari(new Date(terakhir.waktuIso)), hariIni()) : undefined;
  const jumlahMasuk = tampil.filter((m) => m.jumlah > 0).reduce((t, m) => t + m.jumlah, 0);
  const jumlahKeluar = tampil.filter((m) => m.jumlah < 0).reduce((t, m) => t - m.jumlah, 0);
  const banyak = (k: F) => diPeriode.filter((m) => cocok(k, m.kelompok, m.jumlah)).length;

  return (
    <div className="ps-halaman">
      {!adaSaldoAwal(tempat, toko) && (
        <div className="catatan catatan--peringatan" style={{ margin: 0 }}>
          Saldo awal {namaTempat[tempat].toLowerCase()} belum diisi.{' '}
          <button type="button" className="tautan" onClick={() => setDialog({ jenis: 'saldo-awal', pilihan: ['saldo-awal'] })}>Isi saldo awal</button>
        </div>
      )}
      <KartuRingkas item={[
        { judul: 'Saldo awal', nilai: rupiah(r.saldoAwal), catatan: teksPeriode(periode) },
        { judul: 'Masuk', nilai: rupiah(r.masuk + r.pindahMasuk), catatan: `pindah masuk ${rupiah(r.pindahMasuk)}`, aktif: f === 'masuk', onKlik: () => setF(f === 'masuk' ? 'semua' : 'masuk') },
        { judul: 'Keluar', nilai: rupiah(r.keluar + r.pindahKeluar), catatan: `pindah keluar ${rupiah(r.pindahKeluar)}`, aktif: f === 'keluar', onKlik: () => setF(f === 'keluar' ? 'semua' : 'keluar') },
        {
          judul: 'Saldo akhir (buku)', nilai: rupiah(r.saldoAkhir), warna: lama === undefined || lama > 7 ? 'merah' : undefined,
          catatan: terakhir ? `${bank ? 'dicocokkan' : 'dihitung'} ${tanggalPendek(isoHari(new Date(terakhir.waktuIso)))}${lama! > 7 ? ' · sudah lewat seminggu' : ''}` : `belum pernah ${bank ? 'dicocokkan' : 'dihitung'}`,
        },
      ]} />
      <KotakFilter
        cari={{ nilai: cari, onUbah: setCari, placeholder: 'Cari no. atau keterangan' }}
        ringkas={[teksPeriode(periode), f !== 'semua' && f, q && `"${cari}"`].filter(Boolean).join(' · ')}
        aksi={<div className="baris-tombol">
          <button type="button" className="tombol" onClick={() => setDialog({ jenis: 'pendapatan-lain', pilihan: ['pendapatan-lain', 'modal', 'cicilan-karyawan'] })}>+ Kas masuk</button>
          <button type="button" className="tombol" onClick={() => setDialog({ jenis: 'prive', pilihan: ['prive', 'kasbon-karyawan'] })}>− Kas keluar</button>
          <Link className="tombol" to="../pengeluaran?baru=1">Biaya</Link>
          <button type="button" className="tombol" onClick={() => setDialog({ jenis: 'pindah', pilihan: ['pindah'] })}>⇄ Pindah dana</button>
          <button type="button" className="tombol tombol--utama" onClick={() => setCek(true)}>{bank ? 'Cocokkan mutasi' : 'Hitung brankas'}</button>
        </div>}>
        <PilihPeriode awal="bulan-ini" onUbah={setPeriode} />
        <PilihanChip label="Jenis" nilai={f} onUbah={setF} pilihan={[
          { k: 'semua', judul: 'Semua', jumlah: banyak('semua') }, { k: 'masuk', judul: 'Masuk', jumlah: banyak('masuk') },
          { k: 'keluar', judul: 'Keluar', jumlah: banyak('keluar') }, { k: 'pindah', judul: 'Pindah dana', jumlah: banyak('pindah') },
          { k: 'selisih', judul: 'Selisih', jumlah: banyak('selisih') },
        ]} />
      </KotakFilter>
      <TabelDaftar
        data={tampil}
        kunci={(m) => m.id}
        kosong={<><h2>Belum ada catatan</h2><p className="teks-pudar">Tidak ada uang masuk/keluar {namaTempat[tempat].toLowerCase()} di periode ini.</p></>}
        kolom={[
          { judul: 'Tanggal', isi: (m) => <Sel utama={jamTanggal(m.waktuIso)} bawah={m.akun} /> },
          { judul: 'No.', isi: (m) => <strong>{m.nomor}</strong> },
          { judul: 'Keterangan', bungkus: true, isi: (m) => <Sel utama={m.keterangan} bawah={m.rincian} /> },
          { judul: 'Kelompok', isi: (m) => <span className={`chip-status ${m.kelompok === 'selisih' ? 'chip-status--merah' : m.kelompok.startsWith('pindah') ? 'chip-status--abu' : m.jumlah > 0 ? 'chip-status--hijau' : 'chip-status--kuning'}`}>{namaKelompok[m.kelompok].replace(/^[A-G]\. /, '')}</span> },
          { judul: 'Masuk', kanan: true, isi: (m) => atauStrip(Math.max(0, m.jumlah)), total: rupiah(jumlahMasuk) },
          { judul: 'Keluar', kanan: true, isi: (m) => (m.jumlah < 0 ? <span className="teks-bahaya">{rupiah(-m.jumlah)}</span> : '-'), total: rupiah(jumlahKeluar) },
          { judul: 'Saldo', kanan: true, isi: (m) => <strong>{rupiah(m.saldo)}</strong>, total: f === 'semua' && !q ? rupiah(r.saldoAkhir) : undefined },
        ]}
      />
      {terakhir && (
        <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>
          {bank ? 'Pencocokan' : 'Hitung fisik'} terakhir {terakhir.nomor} · {jamTanggal(terakhir.waktuIso)} · buku {rupiah(terakhir.saldoBuku)} · {bank ? 'mutasi' : 'fisik'} {rupiah(terakhir.fisik)} · selisih {bertanda(terakhir.selisih)}{terakhir.catatan ? ` (${terakhir.catatan})` : ''}
        </p>
      )}
      {dialog && <DialogKasPemilik tempat={tempat} jenisAwal={dialog.jenis} pilihan={dialog.pilihan} onTutup={() => setDialog(null)} />}
      {cek && <DialogCocokkan tempat={tempat} onTutup={() => setCek(false)} />}
    </div>
  );
}

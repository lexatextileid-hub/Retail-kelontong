import { useState } from 'react';
import { Link } from 'react-router-dom';
import { bukaLaci, hariIni, laciTerakhirDitutup, laciTerbuka, ringkasLaci, useToko, type ArusKas } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import {
  DialogBukaKasir, DialogBuktiKasKeluar, DialogKasMasuk, DialogLaporanHarian,
  DialogSetorBank, DialogTutupKasir, namaJenis,
} from './DialogLaci';
import { KepalaKas } from './KepalaKas';
import '../../styles/pesanan.css';
import '../../styles/penjualan.css';
import '../../styles/kasbon.css';

type D = null | 'buka' | 'masuk' | 'setor' | 'tutup' | { bukti: ArusKas } | { laporan: string };

const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

/** Laci hari ini: buka kasir (dengan data kemarin), ringkasan uang, aksi kas, tutup kasir. */
export function LaciHariIni() {
  const toko = useToko();
  const [d, setD] = useState<D>(null);
  const [fJenis, setFJenis] = useState<'semua' | 'masuk' | 'keluar' | 'transfer'>('semua');
  const sesi = laciTerbuka(undefined, toko);
  const lalu = laciTerakhirDitutup(undefined, toko);

  if (!sesi) {
    const rl = lalu ? ringkasLaci(lalu.id, toko) : null;
    const tutupHariIni = lalu && lalu.tanggal === hariIni();
    return (
      <div className="ps-halaman" style={{ maxWidth: 820 }}>
        <div className="kartu tumpuk lc-buka">
          <h2>{tutupHariIni ? 'Laci sudah ditutup' : 'Laci belum dibuka'}</h2>
          <p className="teks-pudar" style={{ margin: 0 }}>
            {tutupHariIni
              ? `Ditutup jam ${jam(lalu!.ditutupIso!)}. Masih ada pembeli? Buka lagi; laporannya terpisah.`
              : 'Buka kasir dulu sebelum berjualan. Modal awal diambil dari sisa laci sebelumnya.'}
          </p>
          <button type="button" className="tombol tombol--utama tombol--besar" style={{ alignSelf: 'flex-start' }} onClick={() => setD('buka')}>
            {tutupHariIni ? 'Buka kasir lagi' : 'Buka kasir'}
          </button>
        </div>

        {lalu && rl && (
          <div className="kartu tumpuk">
            <div className="kb-judul">
              <h2>Laci sebelumnya · {tanggalPendek(lalu.tanggal)}</h2>
              <button type="button" className="tautan" onClick={() => setD({ laporan: lalu.id })}>Lihat laporan</button>
            </div>
            <div className="lc-angka">
              <div><span className="teks-pudar">Penjualan</span><strong>{rupiah(rl.omzet)}</strong><span className="teks-pudar">{rl.banyakNota} nota</span></div>
              <div><span className="teks-pudar">Seharusnya di laci</span><strong>{rupiah(rl.seharusnya)}</strong></div>
              <div><span className="teks-pudar">Uang fisik</span><strong>{rupiah(lalu.uangFisik ?? 0)}</strong>
                <span className={lalu.selisih ? 'teks-bahaya' : 'teks-pudar'}>{lalu.selisih ? `selisih ${rupiah(lalu.selisih)}` : 'tanpa selisih'}</span></div>
              <div><span className="teks-pudar">Transfer masuk</span><strong>{rupiah(rl.totalTransfer)}</strong></div>
            </div>
            {lalu.pembagian && (
              <div className="lc-bagi-lihat">
                <span>Sisa di laci <strong>{rupiah(lalu.pembagian.sisaLaci)}</strong></span>
                <span>Diserahkan ke pemilik <strong>{rupiah(lalu.pembagian.brankas + lalu.pembagian.prive)}</strong></span>
                <span>Setor bank <strong>{rupiah(lalu.pembagian.bank)}</strong></span>
              </div>
            )}
          </div>
        )}
        {!lalu && <p className="teks-pudar">Belum ada data laci sebelumnya untuk akun ini.</p>}

        {d === 'buka' && (
          <DialogBukaKasir dariKemarin={lalu?.pembagian?.sisaLaci ?? 0} onBuka={(t) => { bukaLaci(t); setD(null); }} onTutup={() => setD(null)} />
        )}
        {d && typeof d === 'object' && 'laporan' in d && <DialogLaporanHarian sesiId={d.laporan} onTutup={() => setD(null)} />}
      </div>
    );
  }

  const r = ringkasLaci(sesi.id, toko);
  const t = r.tunai;
  // Buku kas laci: urut waktu, saldo tunai berjalan dari modal awal.
  let saldo = r.modal;
  const buku = [...r.arus].sort((a, b) => a.waktuIso.localeCompare(b.waktuIso)).map((a) => {
    if (a.sumber === 'laci') saldo += a.tunai;
    return { a, saldo };
  });
  const tampil = buku.filter(({ a }) =>
    fJenis === 'semua' ? true : fJenis === 'masuk' ? a.tunai > 0 : fJenis === 'keluar' ? a.tunai < 0 : a.transfer !== 0);
  const bisaBukti = (a: ArusKas) => a.jenis === 'pengeluaran' || a.jenis === 'bayar-distributor' || a.jenis === 'setor-bank';

  return (
    <div className="ps-halaman">
      <KepalaKas />
      <div className="ps-atas">
        <div className="lc-aksi">
          <button type="button" className="tombol" onClick={() => setD('masuk')}>+ Kas masuk</button>
          <Link to="../pengeluaran?baru=1" className="tombol">− Pengeluaran</Link>
          <Link to="../bayar-distributor?baru=1" className="tombol">Bayar distributor</Link>
          <button type="button" className="tombol" onClick={() => setD('setor')}>Setor bank</button>
          <button type="button" className="tombol" onClick={() => setD({ laporan: sesi.id })}>Laporan sementara</button>
        </div>
        <button type="button" className="tombol tombol--utama" onClick={() => setD('tutup')}>Tutup kasir</button>
      </div>

      <div className="kk-ringkas">
        <div className="kartu kb-angka"><span className="teks-pudar">Modal awal</span><strong>{rupiah(r.modal)}</strong>
          <span className="teks-pudar">{sesi.tambahBrankas ? `termasuk ${rupiah(sesi.tambahBrankas)} dari pemilik` : 'sisa laci sebelumnya'}</span></div>
        <div className="kartu kb-angka"><span className="teks-pudar">Masuk tunai</span><strong>+{rupiah(r.masukTunai)}</strong>
          <span className="teks-pudar">penjualan {rupiah(t.penjualan)}</span></div>
        <div className="kartu kb-angka"><span className="teks-pudar">Keluar tunai</span><strong className={r.keluarTunai ? 'teks-bahaya' : ''}>−{rupiah(r.keluarTunai)}</strong>
          <span className="teks-pudar">pengeluaran, distributor, setor</span></div>
        <div className="kartu kb-angka kk-utama"><span className="teks-pudar">Seharusnya di laci</span><strong>{rupiah(r.seharusnya)}</strong>
          <span className="teks-pudar">transfer masuk {rupiah(r.totalTransfer)}</span></div>
      </div>

      <div className="kartu tumpuk">
        <div className="kb-judul">
          <h2>Buku kas laci</h2>
          <div className="pj__kategori" role="group" aria-label="Filter">
            {([['semua', 'Semua'], ['masuk', 'Masuk'], ['keluar', 'Keluar'], ['transfer', 'Transfer']] as const).map(([k, tx]) => (
              <button key={k} type="button" aria-pressed={fJenis === k} onClick={() => setFJenis(k)}>{tx}</button>
            ))}
          </div>
        </div>
        <div className="bd-tabel-kartu" style={{ padding: 0 }}>
          <table className="ps-tabel ps-tabel--hp bd-tabel">
            <thead>
              <tr><th>Jam</th><th>No. bukti</th><th>Jenis</th><th>Keterangan</th><th className="kanan">Masuk</th><th className="kanan">Keluar</th><th className="kanan">Saldo laci</th><th className="kanan">Transfer</th></tr>
            </thead>
            <tbody>
              {fJenis === 'semua' && (
                <tr className="kk-baris-modal">
                  <td data-label="Jam">{jam(sesi.dibukaIso)}</td><td data-label="No. bukti">{sesi.nomor}</td><td data-label="Jenis">Modal awal</td>
                  <td data-label="Keterangan">Buka kasir</td><td data-label="Masuk" className="kanan">{rupiah(r.modal)}</td><td data-label="Keluar" className="kanan">-</td>
                  <td data-label="Saldo laci" className="kanan"><strong>{rupiah(r.modal)}</strong></td><td data-label="Transfer" className="kanan">-</td>
                </tr>
              )}
              {tampil.map(({ a, saldo: sl }) => (
                <tr key={a.id} onClick={() => bisaBukti(a) && setD({ bukti: a })} style={bisaBukti(a) ? undefined : { cursor: 'default' }}>
                  <td data-label="Jam">{jam(a.waktuIso)}</td>
                  <td data-label="No. bukti"><strong>{a.nomor}</strong></td>
                  <td data-label="Jenis"><span className={`chip-status chip-status--${a.tunai < 0 ? 'merah' : 'abu'}`}>{namaJenis[a.jenis]}</span></td>
                  <td data-label="Keterangan">{a.keterangan}{a.penerima ? ` · ${a.penerima}` : ''}</td>
                  <td data-label="Masuk" className="kanan">{a.tunai > 0 ? rupiah(a.tunai) : '-'}</td>
                  <td data-label="Keluar" className={`kanan ${a.tunai < 0 ? 'teks-bahaya' : ''}`}>{a.tunai < 0 ? rupiah(-a.tunai) : '-'}</td>
                  <td data-label="Saldo laci" className="kanan"><strong>{rupiah(sl)}</strong></td>
                  <td data-label="Transfer" className="kanan">{a.transfer ? `${a.transfer < 0 ? '−' : ''}${rupiah(Math.abs(a.transfer))}` : '-'}</td>
                </tr>
              ))}
              {tampil.length === 0 && fJenis !== 'semua' && <tr><td colSpan={8} className="ps-kosong">Tidak ada transaksi untuk filter ini.</td></tr>}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="kanan"><strong>Total</strong></td>
                <td className="kanan"><strong>{rupiah(r.modal + r.masukTunai)}</strong></td>
                <td className="kanan"><strong>{rupiah(r.keluarTunai)}</strong></td>
                <td className="kanan"><strong>{rupiah(r.seharusnya)}</strong></td>
                <td className="kanan"><strong>{rupiah(r.totalTransfer)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {d === 'masuk' && <DialogKasMasuk onSelesai={() => setD(null)} onTutup={() => setD(null)} />}
      {d === 'setor' && <DialogSetorBank maks={r.seharusnya} onSelesai={(a) => setD({ bukti: a })} onTutup={() => setD(null)} />}
      {d === 'tutup' && <DialogTutupKasir sesi={sesi} onSelesai={(id) => setD({ laporan: id })} onTutup={() => setD(null)} />}
      {d && typeof d === 'object' && 'bukti' in d && <DialogBuktiKasKeluar a={d.bukti} onTutup={() => setD(null)} />}
      {d && typeof d === 'object' && 'laporan' in d && <DialogLaporanHarian sesiId={d.laporan} onTutup={() => setD(null)} />}
    </div>
  );
}

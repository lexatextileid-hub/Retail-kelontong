import { useState } from 'react';
import { bukaLaci, hariIni, laciTerakhirDitutup, laciTerbuka, ringkasLaci, useToko, type ArusKas } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import {
  DialogBayarDistributor, DialogBukaKasir, DialogBuktiKasKeluar, DialogKasMasuk, DialogLaporanHarian, DialogPengeluaran,
  DialogSetorBank, DialogTutupKasir, namaJenis,
} from './DialogLaci';
import '../../styles/pesanan.css';
import '../../styles/penjualan.css';
import '../../styles/kasbon.css';

type D = null | 'buka' | 'masuk' | 'keluar' | 'setor' | 'distributor' | 'tutup' | { bukti: ArusKas } | { laporan: string };

const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

/** Laci hari ini: buka kasir (dengan data kemarin), ringkasan uang, aksi kas, tutup kasir. */
export function LaciHariIni() {
  const toko = useToko();
  const [d, setD] = useState<D>(null);
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
  const daftar = [...r.arus].sort((a, b) => b.waktuIso.localeCompare(a.waktuIso));
  const baris = (label: string, v: number) => (v === 0 ? null : (
    <div className="ringkas-total"><span>{label}</span><span className={v < 0 ? 'teks-bahaya' : ''}>{v < 0 ? '−' : '+'}{rupiah(Math.abs(v))}</span></div>
  ));

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <p className="teks-pudar" style={{ margin: 0 }}>
          <strong style={{ color: 'var(--teks)' }}>{sesi.nomor}</strong> · {sesi.akun} · buka sejak {jam(sesi.dibukaIso)}
        </p>
        <button type="button" className="tombol tombol--utama" onClick={() => setD('tutup')}>Tutup kasir</button>
      </div>

      <div className="lc-dua">
        <div className="kartu kb-angka">
          <span className="teks-pudar">Seharusnya tunai di laci</span>
          <strong>{rupiah(r.seharusnya)}</strong>
          <span className="teks-pudar">modal {rupiah(r.modal)} · masuk {rupiah(r.masukTunai)} · keluar {rupiah(r.keluarTunai)}</span>
        </div>
        <div className="kartu kb-angka">
          <span className="teks-pudar">Masuk lewat transfer</span>
          <strong>{rupiah(r.totalTransfer)}</strong>
          <span className="teks-pudar">penjualan {rupiah(r.omzet)} · {r.banyakNota} nota</span>
        </div>
      </div>

      <div className="lc-aksi">
        <button type="button" className="tombol" onClick={() => setD('masuk')}>+ Kas masuk</button>
        <button type="button" className="tombol" onClick={() => setD('keluar')}>− Pengeluaran</button>
        <button type="button" className="tombol" onClick={() => setD('distributor')}>Bayar distributor</button>
        <button type="button" className="tombol" onClick={() => setD('setor')}>Setor bank</button>
        <button type="button" className="tombol" onClick={() => setD({ laporan: sesi.id })}>Laporan sementara</button>
      </div>

      <div className="ps-buat">
        <section className="ps-kolom">
          <div className="kartu tumpuk">
            <h2>Arus uang laci</h2>
            {daftar.length === 0 ? (
              <p className="ps-kosong">Belum ada transaksi sejak laci dibuka.</p>
            ) : (
              <div className="rw-daftar" style={{ padding: 0 }}>
                {daftar.map((a) => {
                  const keluar = a.tunai + a.transfer < 0;
                  const bisaBukti = a.jenis === 'pengeluaran' || a.jenis === 'bayar-distributor' || a.jenis === 'setor-bank';
                  return (
                    <button key={a.id} type="button" className="rw-baris" onClick={() => bisaBukti && setD({ bukti: a })} style={bisaBukti ? undefined : { cursor: 'default' }}>
                      <span className="rw-baris__kiri">
                        <span className="rw-baris__nomor">
                          <strong>{a.nomor}</strong>
                          <span className={`chip-status chip-status--${keluar ? 'merah' : 'abu'}`}>{namaJenis[a.jenis]}</span>
                        </span>
                        <span className="teks-pudar">{jam(a.waktuIso)} · {a.keterangan}{a.penerima ? ` · ${a.penerima}` : ''}</span>
                      </span>
                      <span className="lc-nilai">
                        {a.tunai !== 0 && <strong className={a.tunai < 0 ? 'teks-bahaya' : ''}>{a.tunai < 0 ? '−' : '+'}{rupiah(Math.abs(a.tunai))}</strong>}
                        {a.transfer !== 0 && <span className="teks-pudar">{a.transfer < 0 ? '−' : '+'}{rupiah(Math.abs(a.transfer))} transfer</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        <aside className="ps-ringkas kartu tumpuk">
          <h2>Uang tunai di laci</h2>
          <div className="ringkas-total"><span>Modal awal</span><strong>{rupiah(r.modal)}</strong></div>
          {baris('Penjualan', t.penjualan)}
          {baris('Bayar kasbon', t.kasbon)}
          {baris('Pesanan', t.pesanan)}
          {baris('Kas masuk lain', t['kas-masuk'])}
          {baris('Dari pemilik', t['titipan-brankas'])}
          {baris('Retur', t.retur)}
          {baris('Pengeluaran', t.pengeluaran)}
          {baris('Bayar distributor', t['bayar-distributor'])}
          {baris('Setor bank', t['setor-bank'])}
          <div className="ringkas-total ringkas-total--besar"><span>Seharusnya</span><strong>{rupiah(r.seharusnya)}</strong></div>
        </aside>
      </div>

      {d === 'masuk' && <DialogKasMasuk onSelesai={() => setD(null)} onTutup={() => setD(null)} />}
      {d === 'keluar' && <DialogPengeluaran adaLaci maksLaci={r.seharusnya} onSelesai={(a) => setD({ bukti: a })} onTutup={() => setD(null)} />}
      {d === 'setor' && <DialogSetorBank maks={r.seharusnya} onSelesai={(a) => setD({ bukti: a })} onTutup={() => setD(null)} />}
      {d === 'distributor' && <DialogBayarDistributor adaLaci maksLaci={r.seharusnya} onSelesai={(a) => setD({ bukti: a })} onTutup={() => setD(null)} />}
      {d === 'tutup' && <DialogTutupKasir sesi={sesi} onSelesai={(id) => setD({ laporan: id })} onTutup={() => setD(null)} />}
      {d && typeof d === 'object' && 'bukti' in d && <DialogBuktiKasKeluar a={d.bukti} onTutup={() => setD(null)} />}
      {d && typeof d === 'object' && 'laporan' in d && <DialogLaporanHarian sesiId={d.laporan} onTutup={() => setD(null)} />}
    </div>
  );
}

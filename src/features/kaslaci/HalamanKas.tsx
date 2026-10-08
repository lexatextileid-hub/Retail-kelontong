import { useState } from 'react';
import { PilihPeriode, teksPeriode, type Periode } from '../../components/PilihPeriode';
import { akunAktif, fakturTerbuka, hariIni, laciTerbuka, ringkasLaci, useToko, type ArusKas } from '../../data/toko';
import { isoHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import { ambilDistributor } from '../pesanan/bersama';
import { DialogBayarDistributor, DialogBuktiKasKeluar, DialogLaporanHarian, DialogPengeluaran } from './DialogLaci';
import '../../styles/pesanan.css';
import '../../styles/penjualan.css';
import '../../styles/kasbon.css';

const uangLaci = (toko: ReturnType<typeof useToko>) => { const l = laciTerbuka(undefined, toko); return l ? ringkasLaci(l.id, toko).seharusnya : 0; };
const waktu = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const diPeriode = (iso: string, p: Periode) => { const t = isoHari(new Date(iso)); return t >= p.dari && t <= p.sampai; };

/** Pengeluaran yang dicatat akun ini (pemilik melihat semua). */
export function Pengeluaran() {
  const toko = useToko();
  const [periode, setPeriode] = useState<Periode>({ dari: hariIni(), sampai: hariIni() });
  const [d, setD] = useState<null | 'baru' | ArusKas>(null);
  const semua = toko.peran === 'pemilik';
  const daftar = toko.arus
    .filter((a) => a.jenis === 'pengeluaran' && (semua || a.akun === akunAktif(toko)) && diPeriode(a.waktuIso, periode))
    .sort((a, b) => b.waktuIso.localeCompare(a.waktuIso));
  const total = daftar.reduce((t, a) => t - a.tunai - a.transfer, 0);
  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <div className="kartu kb-angka" style={{ minWidth: 220 }}>
          <span className="teks-pudar">Pengeluaran · {teksPeriode(periode)}</span>
          <strong>{rupiah(total)}</strong>
          <span className="teks-pudar">{daftar.length} catatan{semua ? ' · semua akun' : ''}</span>
        </div>
        <button type="button" className="tombol tombol--utama" onClick={() => setD('baru')}>+ Catat pengeluaran</button>
      </div>
      <PilihPeriode onUbah={setPeriode} />
      {daftar.length === 0 ? (
        <div className="kartu ps-kosong-besar"><h2>Belum ada pengeluaran</h2><p className="teks-pudar">Pengeluaran dari laci, brankas, atau bank untuk periode ini.</p></div>
      ) : (
        <div className="kartu rw-daftar">
          {daftar.map((a) => (
            <button key={a.id} type="button" className="rw-baris" onClick={() => setD(a)}>
              <span className="rw-baris__kiri">
                <span className="rw-baris__nomor"><strong>{a.nomor}</strong><span className="chip-status chip-status--abu">{a.kategori}</span>
                  {a.sumber !== 'laci' && <span className="chip-status chip-status--kuning">{a.sumber}</span>}</span>
                <span className="teks-pudar">{waktu(a.waktuIso)} · {a.keterangan} · penerima {a.penerima}{semua ? ` · ${a.akun}` : ''}</span>
              </span>
              <strong className="rw-baris__nilai teks-bahaya">−{rupiah(Math.abs(a.tunai + a.transfer))}</strong>
            </button>
          ))}
        </div>
      )}
      {d === 'baru' && <DialogPengeluaran adaLaci={!!laciTerbuka(undefined, toko)} maksLaci={uangLaci(toko)} onSelesai={(a) => setD(a)} onTutup={() => setD(null)} />}
      {d && d !== 'baru' && <DialogBuktiKasKeluar a={d} onTutup={() => setD(null)} />}
    </div>
  );
}

/** Faktur tempo yang belum lunas + riwayat pembayaran ke distributor. */
export function BayarDistributor() {
  const toko = useToko();
  const [d, setD] = useState<null | 'baru' | ArusKas>(null);
  const faktur = fakturTerbuka(toko);
  const totalHutang = faktur.reduce((t, f) => t + f.sisa, 0);
  const riwayat = toko.arus.filter((a) => a.jenis === 'bayar-distributor').sort((a, b) => b.waktuIso.localeCompare(a.waktuIso)).slice(0, 20);
  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <div className="kartu kb-angka" style={{ minWidth: 220 }}>
          <span className="teks-pudar">Hutang ke distributor</span>
          <strong>{rupiah(totalHutang)}</strong>
          <span className="teks-pudar">{faktur.length} faktur belum lunas</span>
        </div>
        <button type="button" className="tombol tombol--utama" disabled={!faktur.length} onClick={() => setD('baru')}>Bayar faktur</button>
      </div>
      <div className="kartu rw-daftar">
        {faktur.length === 0 && <p className="ps-kosong">Semua faktur tempo sudah lunas.</p>}
        {faktur.map((f) => (
          <div key={f.id} className="rw-baris" style={{ cursor: 'default' }}>
            <span className="rw-baris__kiri">
              <span className="rw-baris__nomor"><strong>{f.nomorDistributor}</strong>{f.lama && <span className="chip-status chip-status--kuning">Hutang lama</span>}</span>
              <span className="teks-pudar">{ambilDistributor(f.distributorId).nama} · {f.lama ? tanggalPendek(f.tanggal) : f.tanggal}{f.dibayar ? ` · dibayar ${rupiah(f.dibayar)} dari ${rupiah(f.total)}` : ''}</span>
            </span>
            <strong className="rw-baris__nilai">{rupiah(f.sisa)}</strong>
          </div>
        ))}
      </div>
      {riwayat.length > 0 && (
        <div className="kartu tumpuk">
          <h2>Pembayaran terakhir</h2>
          <div className="rw-daftar" style={{ padding: 0 }}>
            {riwayat.map((a) => (
              <button key={a.id} type="button" className="rw-baris" onClick={() => setD(a)}>
                <span className="rw-baris__kiri">
                  <strong>{a.nomor} · {a.penerima}</strong>
                  <span className="teks-pudar">{waktu(a.waktuIso)} · {a.faktur?.map((f) => f.nomor).join(', ')} · dari {a.sumber}{a.bank ? ` ${a.bank}` : ''} · {a.akun}</span>
                </span>
                <strong className="rw-baris__nilai">{rupiah(Math.abs(a.tunai + a.transfer))}</strong>
              </button>
            ))}
          </div>
        </div>
      )}
      {d === 'baru' && <DialogBayarDistributor adaLaci={!!laciTerbuka(undefined, toko)} maksLaci={uangLaci(toko)} onSelesai={(a) => setD(a)} onTutup={() => setD(null)} />}
      {d && d !== 'baru' && <DialogBuktiKasKeluar a={d} onTutup={() => setD(null)} />}
    </div>
  );
}

/** Laporan harian per buka–tutup laci. Kasir melihat lacinya sendiri; pemilik semua. */
export function LaporanHarian() {
  const toko = useToko();
  const [periode, setPeriode] = useState<Periode>(() => ({ dari: isoHari(new Date(Date.now() - 6 * 864e5)), sampai: hariIni() }));
  const [buka, setBuka] = useState<string | null>(null);
  const semua = toko.peran === 'pemilik';
  const daftar = toko.sesiLaci
    .filter((x) => (semua || x.akun === akunAktif(toko)) && x.tanggal >= periode.dari && x.tanggal <= periode.sampai)
    .sort((a, b) => b.dibukaIso.localeCompare(a.dibukaIso));
  return (
    <div className="ps-halaman">
      <PilihPeriode awal="7-hari" onUbah={setPeriode} />
      {daftar.length === 0 ? (
        <div className="kartu ps-kosong-besar"><h2>Tidak ada laporan</h2><p className="teks-pudar">Laporan dibuat setiap tutup kasir.</p></div>
      ) : (
        <div className="kartu rw-daftar">
          {daftar.map((x) => {
            const r = ringkasLaci(x.id, toko);
            return (
              <button key={x.id} type="button" className="rw-baris" onClick={() => setBuka(x.id)}>
                <span className="rw-baris__kiri">
                  <span className="rw-baris__nomor">
                    <strong>{x.nomor}</strong>
                    <span className={`chip-status chip-status--${x.ditutupIso ? 'abu' : 'biru'}`}>{x.ditutupIso ? 'Ditutup' : 'Masih buka'}</span>
                    {!!x.selisih && <span className="chip-status chip-status--merah">Selisih {rupiah(x.selisih)}</span>}
                  </span>
                  <span className="teks-pudar">{tanggalPendek(x.tanggal)} · {x.akun} · {r.banyakNota} nota · seharusnya {rupiah(r.seharusnya)}{x.uangFisik !== undefined ? ` · fisik ${rupiah(x.uangFisik)}` : ''}</span>
                </span>
                <strong className="rw-baris__nilai">{rupiah(r.omzet)}</strong>
              </button>
            );
          })}
        </div>
      )}
      {buka && <DialogLaporanHarian sesiId={buka} onTutup={() => setBuka(null)} />}
    </div>
  );
}

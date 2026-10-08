import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InputRupiah } from '../../components/InputRupiah';
import { PilihPeriode, periodeDari, teksPeriode, type Periode } from '../../components/PilihPeriode';
import { Dialog } from '../../components/Dialog';
import { distributorContoh } from '../../data/contoh';
import { akunAktif, catatArus, daftarFaktur, hariIni, laciTerbuka, nomorArus, ringkasLaci, useToko, type ArusKas, type FakturHutang } from '../../data/toko';
import { isoHari, selisihHari, tambahHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import { ambilDistributor } from '../pesanan/bersama';
import { DialogBuktiKasKeluar, DialogLaporanHarian, DialogPengeluaran } from './DialogLaci';
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
    .filter((a) => a.jenis === 'pengeluaran' && a.sumber === 'laci' && (semua || a.akun === akunAktif(toko)) && diPeriode(a.waktuIso, periode))
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
        <button type="button" className="tombol tombol--utama" disabled={!laciTerbuka(undefined, toko)} title={laciTerbuka(undefined, toko) ? undefined : 'Buka kasir dulu'} onClick={() => setD('baru')}>+ Catat pengeluaran</button>
      </div>
      {!laciTerbuka(undefined, toko) && <p className="catatan catatan--peringatan" style={{ margin: 0 }}>Laci belum dibuka. Pengeluaran dari laci dicatat setelah buka kasir.</p>}
      <PilihPeriode onUbah={setPeriode} />
      {daftar.length === 0 ? (
        <div className="kartu ps-kosong-besar"><h2>Belum ada pengeluaran</h2><p className="teks-pudar">Pengeluaran dari laci untuk periode ini. Pengeluaran dari kas pemilik/bank dicatat di Back Office.</p></div>
      ) : (
        <div className="kartu rw-daftar">
          {daftar.map((a) => (
            <button key={a.id} type="button" className="rw-baris" onClick={() => setD(a)}>
              <span className="rw-baris__kiri">
                <span className="rw-baris__nomor"><strong>{a.nomor}</strong><span className="chip-status chip-status--abu">{a.kategori}</span>
</span>
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

type FilterStatus = 'belum-lunas' | 'lewat' | 'minggu-ini' | 'lunas' | 'semua';

/**
 * Bayar distributor — mode akuntansi seperti "Pembayaran Pembelian" di Accurate:
 * Daftar bukti pembayaran, daftar faktur hutang, dan formulir pembayaran
 * (pemasok, tanggal, no. bukti, dibayar dari; tabel faktur: bayar ✓, no. faktur, tanggal, jatuh tempo, total, terutang, diskon, bayar).
 */
export function BayarDistributor() {
  const toko = useToko();
  const [params, setParams] = useSearchParams();
  const [d, setD] = useState<null | ArusKas | { detail: FakturHutang }>(null);
  const [form, setForm] = useState<null | { distributorId: string; faktur: string[] }>(params.get('baru') ? { distributorId: '', faktur: [] } : null);
  const [tab, setTab] = useState<'pembayaran' | 'faktur'>('faktur');
  const [fDist, setFDist] = useState('');
  const [fStatus, setFStatus] = useState<FilterStatus>('belum-lunas');
  const [cari, setCari] = useState('');
  const [periode, setPeriode] = useState<Periode>(() => periodeDari('bulan-ini', '', { dari: '', sampai: '' }));
  const [pilih, setPilih] = useState<string[]>([]);
  const hari = hariIni();
  const semua = daftarFaktur(toko);
  const terbuka = semua.filter((f) => f.sisa > 0);
  const lewat = terbuka.filter((f) => f.jatuhTempo < hari);
  const minggu = terbuka.filter((f) => f.jatuhTempo >= hari && f.jatuhTempo <= tambahHari(hari, 7));
  const jumlah = (xs: FakturHutang[]) => xs.reduce((t, f) => t + f.sisa, 0);
  const adaLaci = !!laciTerbuka(undefined, toko);

  if (form) {
    return (
      <FormPembayaran
        awal={form}
        onBatal={() => { setForm(null); setParams({}); }}
        onSelesai={(a) => { setForm(null); setParams({}); setPilih([]); setTab('pembayaran'); setD(a); }}
      />
    );
  }

  const q = cari.trim().toLowerCase();
  const cocokStatus = (f: FakturHutang) =>
    fStatus === 'semua' ? true
    : fStatus === 'lunas' ? f.sisa === 0
    : fStatus === 'lewat' ? f.sisa > 0 && f.jatuhTempo < hari
    : fStatus === 'minggu-ini' ? f.sisa > 0 && f.jatuhTempo >= hari && f.jatuhTempo <= tambahHari(hari, 7)
    : f.sisa > 0;
  const tampil = semua
    .filter((f) => !fDist || f.distributorId === fDist)
    .filter(cocokStatus)
    .filter((f) => !q || f.nomorDistributor.toLowerCase().includes(q) || f.nomor.toLowerCase().includes(q));
  const dipilih = tampil.filter((f) => pilih.includes(f.id) && f.sisa > 0);
  const distDipilih = [...new Set(dipilih.map((f) => f.distributorId))];

  const distBukti = (a: ArusKas) => semua.find((x) => x.id === a.faktur?.[0]?.id)?.distributorId;
  const bukti = toko.arus
    .filter((a) => a.jenis === 'bayar-distributor')
    .filter((a) => diPeriode(a.waktuIso, periode))
    .filter((a) => !fDist || distBukti(a) === fDist)
    .filter((a) => !q || a.nomor.toLowerCase().includes(q) || (a.faktur ?? []).some((f) => f.nomor.toLowerCase().includes(q)))
    .sort((a, b) => b.waktuIso.localeCompare(a.waktuIso));
  const totalBukti = bukti.reduce((t, a) => t + (a.faktur ?? []).reduce((x, f) => x + f.jumlah, 0), 0);

  const chip = (f: FakturHutang) => {
    if (f.sisa === 0) return <span className="chip-status chip-status--hijau">Lunas</span>;
    if (f.jatuhTempo < hari) return <span className="chip-status chip-status--merah">Lewat {selisihHari(f.jatuhTempo, hari)} hari</span>;
    if (f.status === 'sebagian') return <span className="chip-status chip-status--kuning">Sebagian</span>;
    return <span className="chip-status chip-status--biru">Belum dibayar</span>;
  };

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <div className="saklar" role="group" aria-label="Tampilan">
          <button type="button" aria-pressed={tab === 'faktur'} onClick={() => setTab('faktur')}>Faktur hutang</button>
          <button type="button" aria-pressed={tab === 'pembayaran'} onClick={() => setTab('pembayaran')}>Bukti pembayaran</button>
        </div>
        <button type="button" className="tombol tombol--utama" disabled={!adaLaci || !terbuka.length} title={adaLaci ? undefined : 'Buka kasir dulu'}
          onClick={() => setForm({ distributorId: fDist, faktur: [] })}>+ Pembayaran baru</button>
      </div>

      {tab === 'faktur' && (
        <div className="bd-ringkas">
          <button type="button" className={`kartu kb-angka ${fStatus === 'belum-lunas' ? 'bd-aktif' : ''}`} onClick={() => setFStatus('belum-lunas')}>
            <span className="teks-pudar">Hutang ke distributor</span><strong>{rupiah(jumlah(terbuka))}</strong><span className="teks-pudar">{terbuka.length} faktur belum lunas</span>
          </button>
          <button type="button" className={`kartu kb-angka ${lewat.length ? 'kb-angka--merah' : ''} ${fStatus === 'lewat' ? 'bd-aktif' : ''}`} onClick={() => setFStatus('lewat')}>
            <span className="teks-pudar">Lewat jatuh tempo</span><strong>{rupiah(jumlah(lewat))}</strong><span className="teks-pudar">{lewat.length} faktur</span>
          </button>
          <button type="button" className={`kartu kb-angka ${fStatus === 'minggu-ini' ? 'bd-aktif' : ''}`} onClick={() => setFStatus('minggu-ini')}>
            <span className="teks-pudar">Jatuh tempo 7 hari ke depan</span><strong>{rupiah(jumlah(minggu))}</strong><span className="teks-pudar">{minggu.length} faktur</span>
          </button>
        </div>
      )}

      <div className="kartu tumpuk">
        {tab === 'pembayaran' && <PilihPeriode awal="bulan-ini" onUbah={setPeriode} />}
        <div className="rt-filter">
          <label className="isian">
            Pemasok / distributor
            <select className="isian__kontrol" value={fDist} onChange={(e) => { setFDist(e.target.value); setPilih([]); }}>
              <option value="">Semua distributor</option>
              {distributorContoh.map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
            </select>
          </label>
          <label className="isian">
            {tab === 'faktur' ? 'No. faktur' : 'No. bukti / faktur'}
            <input className="isian__kontrol" value={cari} onChange={(e) => setCari(e.target.value)} placeholder={tab === 'faktur' ? 'nomor di kertas faktur / PB-…' : 'BD-… atau no. faktur'} />
          </label>
        </div>
        {tab === 'faktur' && (
          <div className="pj__kategori" role="group" aria-label="Status">
            {([['belum-lunas', 'Belum lunas'], ['lewat', 'Lewat jatuh tempo'], ['minggu-ini', 'Jatuh tempo 7 hari'], ['lunas', 'Lunas'], ['semua', 'Semua']] as [FilterStatus, string][]).map(([k, t]) => (
              <button key={k} type="button" aria-pressed={fStatus === k} onClick={() => setFStatus(k)}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {tab === 'faktur' && (
        tampil.length === 0 ? (
          <div className="kartu ps-kosong-besar"><h2>Tidak ada faktur</h2><p className="teks-pudar">Tidak ada faktur untuk filter ini.</p></div>
        ) : (
          <div className="kartu bd-tabel-kartu">
            <table className="ps-tabel ps-tabel--hp bd-tabel">
              <thead>
                <tr>
                  <th style={{ width: 36 }} aria-label="Pilih" />
                  <th>No. faktur</th><th>Distributor</th><th>Tanggal</th><th>Jatuh tempo</th>
                  <th className="kanan">Total</th><th className="kanan">Dibayar</th><th className="kanan">Terutang</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((f) => (
                  <tr key={f.id} className={pilih.includes(f.id) ? 'bd-pilih' : ''} onClick={() => setD({ detail: f })}>
                    <td data-label="Pilih" onClick={(e) => e.stopPropagation()}>
                      {f.sisa > 0 && (
                        <input type="checkbox" className="kb-centang" aria-label={`Pilih ${f.nomorDistributor}`} checked={pilih.includes(f.id)}
                          onChange={(e) => setPilih((xs) => (e.target.checked ? [...xs, f.id] : xs.filter((x) => x !== f.id)))} />
                      )}
                    </td>
                    <td data-label="No. faktur"><strong>{f.nomorDistributor}</strong><div className="teks-pudar" style={{ fontSize: 12 }}>{f.lama ? 'hutang lama' : f.nomor}</div></td>
                    <td data-label="Distributor">{ambilDistributor(f.distributorId).nama}</td>
                    <td data-label="Tanggal">{tanggalPendek(f.tanggal)}</td>
                    <td data-label="Jatuh tempo" className={f.sisa > 0 && f.jatuhTempo < hari ? 'teks-bahaya' : ''}>{tanggalPendek(f.jatuhTempo)}</td>
                    <td data-label="Total" className="kanan">{rupiah(f.total)}</td>
                    <td data-label="Dibayar" className="kanan">{f.dibayar ? rupiah(f.dibayar) : '-'}</td>
                    <td data-label="Terutang" className="kanan"><strong>{rupiah(f.sisa)}</strong></td>
                    <td data-label="Status">{chip(f)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={7} className="kanan"><strong>Total terutang</strong></td><td className="kanan"><strong>{rupiah(jumlah(tampil))}</strong></td><td /></tr>
              </tfoot>
            </table>
          </div>
        )
      )}

      {tab === 'pembayaran' && (
        bukti.length === 0 ? (
          <div className="kartu ps-kosong-besar"><h2>Belum ada pembayaran</h2><p className="teks-pudar">Tidak ada bukti pembayaran untuk periode/filter ini.</p></div>
        ) : (
          <div className="kartu bd-tabel-kartu">
            <table className="ps-tabel ps-tabel--hp bd-tabel">
              <thead>
                <tr><th>No. bukti</th><th>Tanggal</th><th>Distributor</th><th>Faktur dibayar</th><th>Dibayar dari</th><th className="kanan">Diskon</th><th className="kanan">Nilai bayar</th><th>Oleh</th></tr>
              </thead>
              <tbody>
                {bukti.map((a) => {
                  const dis = (a.faktur ?? []).reduce((t, f) => t + (f.diskon ?? 0), 0);
                  const nilai = (a.faktur ?? []).reduce((t, f) => t + f.jumlah, 0);
                  return (
                    <tr key={a.id} onClick={() => setD(a)}>
                      <td data-label="No. bukti"><strong>{a.nomor}</strong></td>
                      <td data-label="Tanggal">{waktu(a.waktuIso)}</td>
                      <td data-label="Distributor">{a.penerima}</td>
                      <td data-label="Faktur dibayar">{a.faktur?.map((f) => f.nomor).join(', ')}</td>
                      <td data-label="Dibayar dari">{a.sumber === 'laci' ? 'Laci kasir' : 'Kas pemilik'}</td>
                      <td data-label="Diskon" className="kanan">{dis ? rupiah(dis) : '-'}</td>
                      <td data-label="Nilai bayar" className="kanan"><strong>{rupiah(nilai)}</strong></td>
                      <td data-label="Oleh">{a.akun}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td colSpan={6} className="kanan"><strong>Total dibayar · {teksPeriode(periode)}</strong></td><td className="kanan"><strong>{rupiah(totalBukti)}</strong></td><td /></tr>
              </tfoot>
            </table>
          </div>
        )
      )}

      {tab === 'faktur' && dipilih.length > 0 && (
        <div className="kb-bilah-pilih">
          <span><strong>{dipilih.length} faktur dipilih</strong> · {rupiah(jumlah(dipilih))}{distDipilih.length > 1 ? ' · pilih dari satu distributor' : ''}</span>
          <div className="baris-tombol">
            <button type="button" className="tombol tombol--hantu" onClick={() => setPilih([])}>Batal</button>
            <button type="button" className="tombol tombol--utama" disabled={distDipilih.length !== 1 || !adaLaci} title={adaLaci ? undefined : 'Buka kasir dulu'}
              onClick={() => setForm({ distributorId: distDipilih[0], faktur: dipilih.map((f) => f.id) })}>Bayar {dipilih.length} faktur</button>
          </div>
        </div>
      )}
      {!adaLaci && <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Pembayaran dari laci bisa dibuat setelah buka kasir.</p>}

      {d && 'detail' in d && <DialogDetailFaktur f={d.detail} onTutup={() => setD(null)} />}
      {d && 'jenis' in d && <DialogBuktiKasKeluar a={d} onTutup={() => setD(null)} />}
    </div>
  );
}

/** Formulir pembayaran pembelian (gaya Accurate). Dari kasir: dibayar tunai dari laci. */
function FormPembayaran({ awal, onBatal, onSelesai }: { awal: { distributorId: string; faktur: string[] }; onBatal: () => void; onSelesai: (a: ArusKas) => void }) {
  const toko = useToko();
  const [dist, setDist] = useState(awal.distributorId);
  const [per, setPer] = useState<Record<string, { bayar: number; diskon: number }>>(() =>
    Object.fromEntries(daftarFaktur(toko).filter((f) => awal.faktur.includes(f.id)).map((f) => [f.id, { bayar: f.sisa, diskon: 0 }])));
  const [ket, setKet] = useState('');
  const laci = laciTerbuka(undefined, toko);
  const uang = uangLaci(toko);
  const faktur = daftarFaktur(toko).filter((f) => f.sisa > 0 && f.distributorId === dist);
  const baris = (id: string) => per[id] ?? { bayar: 0, diskon: 0 };
  const totalBayar = faktur.reduce((t, f) => t + baris(f.id).bayar, 0);
  const totalDiskon = faktur.reduce((t, f) => t + baris(f.id).diskon, 0);
  const dipilih = faktur.filter((f) => baris(f.id).bayar + baris(f.id).diskon > 0);
  const lebih = totalBayar > uang;
  const siap = !!laci && !!dist && dipilih.length > 0 && !lebih;
  const ubah = (f: FakturHutang, patch: Partial<{ bayar: number; diskon: number }>) =>
    setPer((m) => {
      const x = { ...baris(f.id), ...patch };
      x.diskon = Math.min(x.diskon, f.sisa);
      x.bayar = Math.min(x.bayar, f.sisa - x.diskon);
      return { ...m, [f.id]: x };
    });
  const simpan = () => {
    if (!siap) return;
    const nama = ambilDistributor(dist).nama;
    onSelesai(catatArus({
      jenis: 'bayar-distributor', nomor: nomorArus('BD'), tunai: -totalBayar, transfer: 0, penerima: nama,
      keterangan: ket.trim() || `Bayar ${nama}`,
      faktur: dipilih.map((f) => ({ id: f.id, nomor: f.nomorDistributor, jumlah: baris(f.id).bayar, diskon: baris(f.id).diskon || undefined })),
    }));
  };

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <h2 style={{ margin: 0 }}>Pembayaran ke distributor</h2>
        <button type="button" className="tautan" onClick={onBatal}>← Kembali ke daftar</button>
      </div>
      <div className="kartu bd-kepala">
        <label className="isian">
          Distributor (pemasok)
          <select className="isian__kontrol" value={dist} onChange={(e) => { setDist(e.target.value); setPer({}); }} style={!dist ? { color: 'var(--teks-3)' } : undefined}>
            <option value="" disabled>Pilih distributor…</option>
            {distributorContoh.map((x) => {
              const n = daftarFaktur(toko).filter((f) => f.sisa > 0 && f.distributorId === x.id);
              return <option key={x.id} value={x.id} disabled={!n.length}>{x.nama}{n.length ? ` · ${n.length} faktur` : ' · tidak ada hutang'}</option>;
            })}
          </select>
        </label>
        <label className="isian">Tanggal<input className="isian__kontrol" value={tanggalPendek(hariIni())} readOnly /></label>
        <label className="isian">No. bukti<input className="isian__kontrol" value="BD-… (otomatis)" readOnly /></label>
        <label className="isian">Dibayar dari<input className="isian__kontrol" value={laci ? `Laci ${laci.akun} · ${rupiah(uang)}` : 'Laci belum dibuka'} readOnly /></label>
        <label className="isian bd-kepala__lebar">
          Keterangan
          <input className="isian__kontrol" value={ket} onChange={(e) => setKet(e.target.value)} placeholder="opsional, mis. dibayar ke sales Pak Andi" />
        </label>
      </div>

      <div className="kartu bd-tabel-kartu">
        {!dist ? <p className="ps-kosong">Pilih distributor dulu untuk menampilkan fakturnya.</p> : (
          <table className="ps-tabel ps-tabel--hp bd-tabel bd-form">
            <thead>
              <tr>
                <th style={{ width: 44 }}>Bayar</th><th>No. faktur</th><th>Tanggal</th><th>Jatuh tempo</th>
                <th className="kanan">Total</th><th className="kanan">Terutang</th><th className="kanan">Diskon</th><th className="kanan">Bayar</th>
              </tr>
            </thead>
            <tbody>
              {faktur.map((f) => {
                const b = baris(f.id);
                const aktif = b.bayar + b.diskon > 0;
                return (
                  <tr key={f.id} className={aktif ? 'bd-pilih' : ''}>
                    <td data-label="Bayar">
                      <input type="checkbox" className="kb-centang" aria-label={`Bayar ${f.nomorDistributor}`} checked={aktif}
                        onChange={(e) => ubah(f, e.target.checked ? { bayar: f.sisa, diskon: 0 } : { bayar: 0, diskon: 0 })} />
                    </td>
                    <td data-label="No. faktur"><strong>{f.nomorDistributor}</strong><div className="teks-pudar" style={{ fontSize: 12 }}>{f.lama ? 'hutang lama' : f.nomor}</div></td>
                    <td data-label="Tanggal">{tanggalPendek(f.tanggal)}</td>
                    <td data-label="Jatuh tempo" className={f.jatuhTempo < hariIni() ? 'teks-bahaya' : ''}>{tanggalPendek(f.jatuhTempo)}</td>
                    <td data-label="Total" className="kanan">{rupiah(f.total)}</td>
                    <td data-label="Terutang" className="kanan"><strong>{rupiah(f.sisa)}</strong></td>
                    <td data-label="Diskon" className="kanan"><InputRupiah id={`dis-${f.id}`} nilai={b.diskon} label={`Diskon ${f.nomorDistributor}`} onUbah={(n) => ubah(f, { diskon: n })} /></td>
                    <td data-label="Bayar" className="kanan"><InputRupiah id={`byr-${f.id}`} nilai={b.bayar} label={`Bayar ${f.nomorDistributor}`} onUbah={(n) => ubah(f, { bayar: n })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="kartu bd-kaki">
        <div className="bd-kaki__angka">
          <div className="ringkas-total"><span>Faktur dibayar</span><strong>{dipilih.length}</strong></div>
          <div className="ringkas-total"><span>Total diskon</span><strong>{rupiah(totalDiskon)}</strong></div>
          <div className="ringkas-total"><span>Hutang berkurang</span><strong>{rupiah(totalBayar + totalDiskon)}</strong></div>
          <div className="ringkas-total ringkas-total--besar"><span>Nilai pembayaran (tunai dari laci)</span><strong>{rupiah(totalBayar)}</strong></div>
          {lebih && <p className="catatan catatan--peringatan" style={{ margin: 0 }}>Uang di laci hanya {rupiah(uang)}. Bayar sebagian atau minta titipan dari pemilik lewat Kas masuk.</p>}
        </div>
        <div className="baris-tombol" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="tombol" onClick={onBatal}>Batal</button>
          <button type="button" className="tombol tombol--utama" disabled={!siap} onClick={simpan}>Simpan & cetak bukti</button>
        </div>
      </div>
    </div>
  );
}

function DialogDetailFaktur({ f, onTutup }: { f: FakturHutang; onTutup: () => void }) {
  return (
    <Dialog judul={`Faktur ${f.nomorDistributor}`} onTutup={onTutup} lebar={480}>
      <div className="ringkas-total"><span>Distributor</span><strong>{ambilDistributor(f.distributorId).nama}</strong></div>
      <div className="ringkas-total"><span>{f.lama ? 'Hutang lama (tanpa rincian barang)' : `Barang masuk ${f.nomor}`}</span><span /></div>
      <div className="ringkas-total"><span>Tanggal faktur</span><span>{tanggalPendek(f.tanggal)}</span></div>
      <div className="ringkas-total"><span>Jatuh tempo</span><span>{tanggalPendek(f.jatuhTempo)}</span></div>
      <div className="ringkas-total"><span>Total</span><strong>{rupiah(f.total)}</strong></div>
      <div className="ringkas-total"><span>Dibayar</span><span>{rupiah(f.dibayar)}</span></div>
      <div className="ringkas-total ringkas-total--besar"><span>Sisa</span><strong>{rupiah(f.sisa)}</strong></div>
      <h3 style={{ margin: '6px 0 0' }}>Pembayaran</h3>
      {f.pembayaran.length === 0 ? <p className="teks-pudar" style={{ margin: 0 }}>Belum ada pembayaran.</p> : (
        <ul className="kb-riwayat">
          {f.pembayaran.map((p) => (
            <li key={p.nomor}>
              <div className="kb-riwayat__atas"><span><strong>{p.nomor}</strong> · {waktu(p.waktuIso)}</span><strong>{rupiah(p.jumlah)}{p.diskon ? ` + diskon ${rupiah(p.diskon)}` : ''}</strong></div>
              <span className="teks-pudar">{p.sumber === 'laci' ? `laci ${p.akun}` : 'kas pemilik'}</span>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
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
